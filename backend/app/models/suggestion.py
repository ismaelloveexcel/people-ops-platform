from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class SuggestionStatus(str, Enum):
    submitted = "submitted"
    under_review = "under_review"
    implemented = "implemented"
    in_progress = "in_progress"
    noted = "noted"
    declined = "declined"


# ── Request / Response models ──────────────────────────────

class SuggestionCreate(BaseModel):
    title: str
    description: str


class SuggestionUpdate(BaseModel):
    """MD-only — update status and add notes after monthly review."""
    status: Optional[SuggestionStatus] = None
    md_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class SuggestionOut(BaseModel):
    id: UUID
    employee_id: UUID
    title: str
    description: str
    status: SuggestionStatus
    md_notes: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
