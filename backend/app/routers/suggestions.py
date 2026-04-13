"""
Suggestions router.

Blueprint rules (v3 FIX 05):
  - Employees submit suggestions.
  - MD reviews monthly and updates status.
  - MD adds notes for the "Top 3" monthly comms.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_supabase
from app.middleware.auth import get_current_user, require_md, CurrentUser
from app.models.suggestion import SuggestionCreate, SuggestionUpdate, SuggestionOut

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])


@router.post("/", response_model=SuggestionOut, status_code=status.HTTP_201_CREATED)
async def submit_suggestion(
    payload: SuggestionCreate,
    user: CurrentUser = Depends(get_current_user),
):
    """Any employee can submit a suggestion."""
    db = get_supabase()

    data = {
        "employee_id": str(user.employee_id),
        "title": payload.title,
        "description": payload.description,
        "status": "submitted",
    }

    result = db.table("suggestions").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to submit suggestion.")
    return result.data[0]


@router.get("/", response_model=List[SuggestionOut])
async def list_suggestions(
    sugg_status: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    """MD sees all. Employees see only their own."""
    db = get_supabase()
    query = db.table("suggestions").select("*").order("submitted_at", desc=True)

    if not user.is_md_level:
        query = query.eq("employee_id", str(user.employee_id))

    if sugg_status:
        query = query.eq("status", sugg_status)

    result = query.execute()
    return result.data


@router.get("/monthly-review", response_model=List[SuggestionOut])
async def monthly_review(
    year: Optional[int] = None,
    month: Optional[int] = None,
    user: CurrentUser = Depends(require_md),
):
    """
    MD monthly review view — all suggestions from a given month.
    Defaults to current month if year/month not specified.
    """
    db = get_supabase()
    now = datetime.utcnow()
    y = year or now.year
    m = month or now.month

    start = f"{y}-{m:02d}-01"
    if m == 12:
        end = f"{y + 1}-01-01"
    else:
        end = f"{y}-{m + 1:02d}-01"

    result = (
        db.table("suggestions")
        .select("*")
        .gte("submitted_at", start)
        .lt("submitted_at", end)
        .order("submitted_at")
        .execute()
    )
    return result.data


@router.get("/{suggestion_id}", response_model=SuggestionOut)
async def get_suggestion(
    suggestion_id: UUID,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_supabase()
    result = db.table("suggestions").select("*").eq("id", str(suggestion_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Suggestion not found.")

    s = result.data
    if not user.is_md_level and s["employee_id"] != str(user.employee_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return s


@router.patch("/{suggestion_id}", response_model=SuggestionOut)
async def update_suggestion(
    suggestion_id: UUID,
    payload: SuggestionUpdate,
    user: CurrentUser = Depends(require_md),
):
    """MD only — update status and add monthly review notes."""
    db = get_supabase()

    update_data = payload.model_dump(exclude_none=True)
    if "status" in update_data and hasattr(update_data["status"], "value"):
        update_data["status"] = update_data["status"].value
    if update_data and "reviewed_at" not in update_data:
        update_data["reviewed_at"] = datetime.utcnow().isoformat()

    result = (
        db.table("suggestions")
        .update(update_data)
        .eq("id", str(suggestion_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Suggestion not found.")
    return result.data[0]
