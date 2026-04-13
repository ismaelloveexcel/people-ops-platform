"""
Grievances router.

Blueprint rules:
  - Employee submits directly — bypasses AI and all managers.
  - assigned_to is ALWAYS the MD (auto-set on submission).
  - Managers cannot see or touch grievances (except delegated investigator).
  - Only MD (or Acting MD) can update, assign handler, or close.
  - Resolution text is required before closure (DB CHECK enforces this too).
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_supabase
from app.middleware.auth import get_current_user, require_md, CurrentUser
from app.models.grievance import GrievanceCreate, GrievanceUpdate, GrievanceOut

router = APIRouter(prefix="/grievances", tags=["Grievances"])


def _get_md_employee_id(db) -> Optional[str]:
    """Find the primary MD employee ID."""
    result = db.table("employees").select("id").eq("role", "md").eq("status", "active").limit(1).execute()
    return result.data[0]["id"] if result.data else None


@router.post("/", response_model=GrievanceOut, status_code=status.HTTP_201_CREATED)
async def submit_grievance(
    payload: GrievanceCreate,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Employee submits grievance. Goes DIRECTLY to MD — no AI, no manager involved.
    assigned_to is auto-set to the MD's employee ID.
    """
    db = get_supabase()

    md_id = _get_md_employee_id(db)
    if not md_id:
        raise HTTPException(
            status_code=500,
            detail="No active MD found in the system. Contact your administrator.",
        )

    data = {
        "ref_id": "",    # Trigger auto-generates GRV-YYYY-NNN
        "employee_id": str(user.employee_id),
        "category": payload.category.value,
        "description": payload.description,
        "status": "open",
        "assigned_to": md_id,
    }

    result = db.table("grievances").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to submit grievance.")
    return result.data[0]


@router.get("/", response_model=List[GrievanceOut])
async def list_grievances(
    grv_status: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    """
    MD sees all grievances.
    Employee sees only their own.
    Delegated investigator (handled_by) sees cases assigned to them.
    Managers see NOTHING unless they are the delegated investigator.
    """
    db = get_supabase()
    query = db.table("grievances").select("*").order("created_at", desc=True)

    if user.is_md_level:
        pass  # MD sees all
    else:
        # Employee sees own + any they're investigating
        from postgrest import APIError
        query = query.or_(
            f"employee_id.eq.{user.employee_id},handled_by.eq.{user.employee_id}"
        )

    if grv_status:
        query = query.eq("status", grv_status)

    result = query.execute()
    return result.data


@router.get("/{grievance_id}", response_model=GrievanceOut)
async def get_grievance(
    grievance_id: UUID,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_supabase()
    result = db.table("grievances").select("*").eq("id", str(grievance_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Grievance not found.")

    g = result.data
    if not user.is_md_level:
        is_owner = g["employee_id"] == str(user.employee_id)
        is_investigator = g.get("handled_by") == str(user.employee_id)
        if not is_owner and not is_investigator:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return g


@router.patch("/{grievance_id}", response_model=GrievanceOut)
async def update_grievance(
    grievance_id: UUID,
    payload: GrievanceUpdate,
    user: CurrentUser = Depends(require_md),
):
    """
    MD only. Update status, assign investigator, add resolution.
    Closing requires resolution text — enforced here AND by DB CHECK constraint.
    """
    db = get_supabase()

    # Validate: resolution required before closing
    if payload.status and payload.status.value == "closed":
        if not payload.resolution:
            # Check existing resolution
            existing = db.table("grievances").select("resolution").eq("id", str(grievance_id)).single().execute()
            if not existing.data or not existing.data.get("resolution"):
                raise HTTPException(
                    status_code=400,
                    detail="Resolution is required before closing a grievance.",
                )

    update_data = payload.model_dump(exclude_none=True)
    if "status" in update_data:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], "value") else update_data["status"]
    if "handled_by" in update_data and update_data["handled_by"]:
        update_data["handled_by"] = str(update_data["handled_by"])

    if payload.status and payload.status.value == "closed":
        update_data["closed_at"] = datetime.utcnow().isoformat()

    result = (
        db.table("grievances")
        .update(update_data)
        .eq("id", str(grievance_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Grievance not found.")
    return result.data[0]
