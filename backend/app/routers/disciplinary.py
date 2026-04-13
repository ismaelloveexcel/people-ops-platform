"""
Disciplinary cases router.

Blueprint rules:
  - Manager creates a case.
  - MD reviews, schedules hearing, can delegate investigation, records outcome, closes.
  - Only MD (or Acting MD) can update or close.
  - Outcome is required before closure (DB CHECK + server validation).
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_supabase
from app.middleware.auth import get_current_user, require_manager, require_md, CurrentUser
from app.models.disciplinary import DisciplinaryCaseCreate, DisciplinaryCaseUpdate, DisciplinaryCaseOut

router = APIRouter(prefix="/disciplinary", tags=["Disciplinary"])


@router.post("/", response_model=DisciplinaryCaseOut, status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: DisciplinaryCaseCreate,
    user: CurrentUser = Depends(require_manager),
):
    """Manager initiates a disciplinary case. MD is notified (owns closure)."""
    db = get_supabase()

    # Verify the subject employee exists
    emp = db.table("employees").select("id, status").eq("id", str(payload.employee_id)).single().execute()
    if not emp.data:
        raise HTTPException(status_code=404, detail="Employee not found.")

    data = {
        "ref_id": "",    # Trigger auto-generates DISC-YYYY-NNN
        "employee_id": str(payload.employee_id),
        "reported_by": str(user.employee_id),
        "issue_type": payload.issue_type.value,
        "description": payload.description,
        "status": "open",
    }

    result = db.table("disciplinary_cases").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create disciplinary case.")
    return result.data[0]


@router.get("/", response_model=List[DisciplinaryCaseOut])
async def list_cases(
    case_status: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    """
    MD sees all cases.
    Manager sees cases they reported.
    Employee sees cases involving them.
    Delegated investigator sees cases assigned to them.
    """
    db = get_supabase()
    query = db.table("disciplinary_cases").select("*").order("created_at", desc=True)

    if not user.is_md_level:
        query = query.or_(
            f"reported_by.eq.{user.employee_id},"
            f"employee_id.eq.{user.employee_id},"
            f"handled_by.eq.{user.employee_id}"
        )

    if case_status:
        query = query.eq("status", case_status)

    result = query.execute()
    return result.data


@router.get("/{case_id}", response_model=DisciplinaryCaseOut)
async def get_case(
    case_id: UUID,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_supabase()
    result = db.table("disciplinary_cases").select("*").eq("id", str(case_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Case not found.")

    c = result.data
    if not user.is_md_level:
        allowed = {c["reported_by"], c["employee_id"], c.get("handled_by")}
        if str(user.employee_id) not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return c


@router.patch("/{case_id}", response_model=DisciplinaryCaseOut)
async def update_case(
    case_id: UUID,
    payload: DisciplinaryCaseUpdate,
    user: CurrentUser = Depends(require_md),
):
    """
    MD only: schedule hearing, delegate investigation, record outcome, close.
    Closing requires outcome — enforced here and by DB CHECK.
    """
    db = get_supabase()

    if payload.status and payload.status.value == "closed":
        if not payload.outcome:
            existing = db.table("disciplinary_cases").select("outcome").eq("id", str(case_id)).single().execute()
            if not existing.data or not existing.data.get("outcome"):
                raise HTTPException(
                    status_code=400,
                    detail="Outcome must be recorded before closing a disciplinary case.",
                )

    update_data = payload.model_dump(exclude_none=True)
    for field in ("status", "outcome"):
        if field in update_data and hasattr(update_data[field], "value"):
            update_data[field] = update_data[field].value
    if "handled_by" in update_data and update_data["handled_by"]:
        update_data["handled_by"] = str(update_data["handled_by"])
    if "hearing_date" in update_data and update_data["hearing_date"]:
        update_data["hearing_date"] = update_data["hearing_date"].isoformat()

    if payload.status and payload.status.value == "closed":
        update_data["closed_at"] = datetime.utcnow().isoformat()

    result = (
        db.table("disciplinary_cases")
        .update(update_data)
        .eq("id", str(case_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Case not found.")
    return result.data[0]
