"""
Requests router — submit, list, approve, reject.

Key blueprint rules enforced here:
  - Rejection reason is MANDATORY — Pydantic + DB constraint both block empty reasons.
  - manager_id is auto-set from employee.reports_to on submission.
  - Audit log entry created on every status transition.
  - MD can see and action all requests.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_supabase
from app.middleware.auth import get_current_user, require_manager, require_md, CurrentUser
from app.models.request import RequestCreate, RequestReject, RequestApprove, RequestOut

router = APIRouter(prefix="/requests", tags=["Requests"])


def _log_action(db, request_id: str, action: str, actor_id: str, reason: Optional[str] = None):
    """Write an entry to the approval_logs audit table."""
    db.table("approval_logs").insert({
        "request_id": request_id,
        "action": action,
        "actor_id": actor_id,
        "reason": reason,
    }).execute()


@router.post("/", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: RequestCreate,
    user: CurrentUser = Depends(get_current_user),
):
    """Employee submits a new request. Saved as draft initially."""
    db = get_supabase()

    # Auto-resolve manager from employee.reports_to
    emp = db.table("employees").select("reports_to").eq("id", str(user.employee_id)).single().execute()
    manager_id = emp.data.get("reports_to") if emp.data else None

    data = {
        "ref_id": "",          # Trigger will auto-set this
        "employee_id": str(user.employee_id),
        "type": payload.type.value,
        "status": "draft",
        "manager_id": manager_id,
        "description": payload.description,
        "attachment_url": payload.attachment_url,
    }

    result = db.table("requests").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create request.")

    req = result.data[0]
    _log_action(db, req["id"], "submitted", str(user.employee_id))
    return req


@router.post("/{request_id}/submit", response_model=RequestOut)
async def submit_request(
    request_id: UUID,
    user: CurrentUser = Depends(get_current_user),
):
    """Transition request from draft → submitted (routes to manager)."""
    db = get_supabase()

    req = db.table("requests").select("*").eq("id", str(request_id)).single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.data["employee_id"] != str(user.employee_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your request.")
    if req.data["status"] != "draft":
        raise HTTPException(status_code=400, detail=f"Request is already '{req.data['status']}' — cannot re-submit.")

    result = (
        db.table("requests")
        .update({"status": "submitted", "submitted_at": datetime.utcnow().isoformat()})
        .eq("id", str(request_id))
        .execute()
    )
    _log_action(db, str(request_id), "submitted", str(user.employee_id))
    return result.data[0]


@router.get("/", response_model=List[RequestOut])
async def list_requests(
    req_status: Optional[str] = Query(None, alias="status"),
    req_type: Optional[str] = Query(None, alias="type"),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Employee sees own requests.
    Manager sees requests assigned to them.
    MD sees all.
    """
    db = get_supabase()
    query = db.table("requests").select("*").order("created_at", desc=True)

    if user.is_md_level:
        pass  # No filter — sees everything
    elif user.role.value == "manager":
        query = query.eq("manager_id", str(user.employee_id))
    else:
        query = query.eq("employee_id", str(user.employee_id))

    if req_status:
        query = query.eq("status", req_status)
    if req_type:
        query = query.eq("type", req_type)

    result = query.execute()
    return result.data


@router.get("/{request_id}", response_model=RequestOut)
async def get_request(
    request_id: UUID,
    user: CurrentUser = Depends(get_current_user),
):
    """Get a single request with access check."""
    db = get_supabase()
    req = db.table("requests").select("*").eq("id", str(request_id)).single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")

    r = req.data
    if not user.is_md_level:
        is_owner = r["employee_id"] == str(user.employee_id)
        is_manager = r["manager_id"] == str(user.employee_id)
        if not is_owner and not is_manager:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return r


@router.post("/{request_id}/approve", response_model=RequestOut)
async def approve_request(
    request_id: UUID,
    payload: RequestApprove,
    user: CurrentUser = Depends(require_manager),
):
    """
    Approve a request.
    Manager can approve their own team's requests.
    MD can approve any.
    Logs the decision to approval_logs.
    """
    db = get_supabase()
    req = db.table("requests").select("*").eq("id", str(request_id)).single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")

    r = req.data
    if not user.is_md_level and r.get("manager_id") != str(user.employee_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This request is not assigned to you.")
    if r["status"] not in ("submitted", "pending"):
        raise HTTPException(status_code=400, detail=f"Cannot approve a request with status '{r['status']}'.")

    result = (
        db.table("requests")
        .update({"status": "approved", "decided_at": datetime.utcnow().isoformat()})
        .eq("id", str(request_id))
        .execute()
    )
    _log_action(db, str(request_id), "approved", str(user.employee_id), payload.reason)
    return result.data[0]


@router.post("/{request_id}/reject", response_model=RequestOut)
async def reject_request(
    request_id: UUID,
    payload: RequestReject,
    user: CurrentUser = Depends(require_manager),
):
    """
    Reject a request. Rejection reason is MANDATORY.
    Pydantic validates non-empty. DB CHECK constraint is the second guard.
    """
    db = get_supabase()
    req = db.table("requests").select("*").eq("id", str(request_id)).single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")

    r = req.data
    if not user.is_md_level and r.get("manager_id") != str(user.employee_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This request is not assigned to you.")
    if r["status"] not in ("submitted", "pending"):
        raise HTTPException(status_code=400, detail=f"Cannot reject a request with status '{r['status']}'.")

    result = (
        db.table("requests")
        .update({
            "status": "rejected",
            "rejection_reason": payload.rejection_reason,
            "decided_at": datetime.utcnow().isoformat(),
        })
        .eq("id", str(request_id))
        .execute()
    )
    _log_action(db, str(request_id), "rejected", str(user.employee_id), payload.rejection_reason)
    return result.data[0]


@router.get("/{request_id}/logs")
async def get_request_logs(
    request_id: UUID,
    user: CurrentUser = Depends(get_current_user),
):
    """Return the full audit trail for a request."""
    db = get_supabase()
    req = db.table("requests").select("employee_id, manager_id").eq("id", str(request_id)).single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")

    r = req.data
    if not user.is_md_level:
        if r["employee_id"] != str(user.employee_id) and r.get("manager_id") != str(user.employee_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    logs = (
        db.table("approval_logs")
        .select("*")
        .eq("request_id", str(request_id))
        .order("created_at")
        .execute()
    )
    return logs.data
