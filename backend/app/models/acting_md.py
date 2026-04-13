from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from enum import Enum


class ActingMDStatus(str, Enum):
    active = "active"
    expired = "expired"


# ── Request / Response models ──────────────────────────────

class ActingMDCreate(BaseModel):
    """Only the real MD can create this — not Acting MD."""
    assigned_to: UUID
    start_date: date
    end_date: date
    notes: Optional[str] = None

    @model_validator(mode="after")
    def end_after_start(self) -> "ActingMDCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date.")
        return self


class ActingMDExpire(BaseModel):
    """Force-expire an Acting MD assignment before its end_date."""
    notes: Optional[str] = None


class ActingMDOut(BaseModel):
    id: UUID
    assigned_to: UUID
    assigned_by: UUID
    start_date: date
    end_date: date
    status: ActingMDStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
