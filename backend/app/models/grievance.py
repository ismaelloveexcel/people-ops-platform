from pydantic import BaseModel, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class GrievanceCategory(str, Enum):
    harassment = "harassment"
    discrimination = "discrimination"
    salary = "salary"
    workload = "workload"
    manager_conduct = "manager_conduct"
    other = "other"


class GrievanceStatus(str, Enum):
    open = "open"
    under_review = "under_review"
    resolved = "resolved"
    closed = "closed"


# ── Request / Response models ──────────────────────────────

class GrievanceCreate(BaseModel):
    """
    Employee submits this directly — bypasses AI and managers entirely.
    Auto-assigned to MD.
    """
    category: GrievanceCategory
    description: str

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Description is required.")
        return v.strip()


class GrievanceUpdate(BaseModel):
    """MD-only — update status, assign investigator, add resolution."""
    status: Optional[GrievanceStatus] = None
    handled_by: Optional[UUID] = None      # Delegate investigation (not final decision)
    resolution: Optional[str] = None       # Required before closing


class GrievanceOut(BaseModel):
    id: UUID
    ref_id: str
    employee_id: UUID
    category: GrievanceCategory
    description: str
    status: GrievanceStatus
    assigned_to: UUID
    handled_by: Optional[UUID] = None
    resolution: Optional[str] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
