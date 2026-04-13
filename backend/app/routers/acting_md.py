"""
Acting MD router.

Blueprint rules:
  - Only the REAL MD can assign or modify Acting MD (not an Acting MD themselves).
  - Assignment requires start_date + end_date.
  - Auto-expires on end_date (cron handles this; also checked on every auth).
  - Acting MD cannot extend their own role.
  - All assignments are logged.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from uuid import UUID
from datetime import date

from app.database import get_supabase
from app.middleware.auth import require_real_md, get_current_user, CurrentUser
from app.models.acting_md import ActingMDCreate, ActingMDExpire, ActingMDOut

router = APIRouter(prefix="/acting-md", tags=["Acting MD"])


@router.post("/", response_model=ActingMDOut, status_code=status.HTTP_201_CREATED)
async def assign_acting_md(
    payload: ActingMDCreate,
    user: CurrentUser = Depends(require_real_md),    # Only real MD — NOT Acting MD
):
    """
    Assign an Acting MD. Only the real MD can do this.
    Validates date range, checks for conflicts, sets status to active.
    """
    db = get_supabase()

    # Verify the assignee is an active employee
    assignee = (
        db.table("employees")
        .select("id, name, role, status")
        .eq("id", str(payload.assigned_to))
        .single()
        .execute()
    )
    if not assignee.data:
        raise HTTPException(status_code=404, detail="Assignee employee not found.")
    if assignee.data["status"] != "active":
        raise HTTPException(status_code=400, detail="Cannot assign Acting MD to an inactive employee.")
    if assignee.data["role"] == "employee":
        raise HTTPException(
            status_code=400,
            detail="Acting MD must be assigned to a manager — not a regular employee.",
        )

    # Check for overlapping active assignment for this person
    today = date.today().isoformat()
    overlap = (
        db.table("acting_md")
        .select("id, start_date, end_date")
        .eq("assigned_to", str(payload.assigned_to))
        .eq("status", "active")
        .execute()
    )
    if overlap.data:
        raise HTTPException(
            status_code=400,
            detail="This employee already has an active Acting MD assignment. Expire it first.",
        )

    data = {
        "assigned_to": str(payload.assigned_to),
        "assigned_by": str(user.employee_id),
        "start_date": payload.start_date.isoformat(),
        "end_date": payload.end_date.isoformat(),
        "status": "active",
        "notes": payload.notes,
    }

    result = db.table("acting_md").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create Acting MD assignment.")
    return result.data[0]


@router.get("/", response_model=List[ActingMDOut])
async def list_acting_md(
    user: CurrentUser = Depends(get_current_user),
):
    """
    MD sees all assignments (history).
    Others see only their own assignment.
    """
    db = get_supabase()
    query = db.table("acting_md").select("*").order("start_date", desc=True)

    if not user.is_md_level:
        query = query.eq("assigned_to", str(user.employee_id))

    result = query.execute()
    return result.data


@router.get("/active", response_model=List[ActingMDOut])
async def get_active_acting_md(user: CurrentUser = Depends(get_current_user)):
    """Return currently active Acting MD assignments (for the system status banner)."""
    db = get_supabase()
    today = date.today().isoformat()
    result = (
        db.table("acting_md")
        .select("*")
        .eq("status", "active")
        .lte("start_date", today)
        .gte("end_date", today)
        .execute()
    )
    return result.data


@router.post("/{assignment_id}/expire", response_model=ActingMDOut)
async def expire_acting_md(
    assignment_id: UUID,
    payload: ActingMDExpire,
    user: CurrentUser = Depends(require_real_md),    # Only real MD can force-expire
):
    """Force-expire an Acting MD assignment before its natural end_date."""
    db = get_supabase()

    existing = db.table("acting_md").select("*").eq("id", str(assignment_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    if existing.data["status"] == "expired":
        raise HTTPException(status_code=400, detail="Assignment is already expired.")

    update = {"status": "expired"}
    if payload.notes:
        existing_notes = existing.data.get("notes") or ""
        update["notes"] = f"{existing_notes}\n[Force-expired by MD: {payload.notes}]".strip()

    result = (
        db.table("acting_md")
        .update(update)
        .eq("id", str(assignment_id))
        .execute()
    )
    return result.data[0]


@router.post("/expire-all-past", status_code=status.HTTP_204_NO_CONTENT)
async def trigger_expiry(user: CurrentUser = Depends(require_real_md)):
    """
    Manually trigger the Acting MD auto-expiry function.
    Normally run daily via Supabase cron — this endpoint allows manual triggering.
    """
    db = get_supabase()
    db.rpc("expire_acting_md").execute()
