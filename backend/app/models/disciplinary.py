from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from enum import Enum


class DisciplinaryIssueType(str, Enum):
    misconduct = "misconduct"
    absence = "absence"
    performance = "performance"
    policy_breach = "policy_breach"
    other = "other"


class DisciplinaryOutcome(str, Enum):
    warning = "warning"
    final_warning = "final_warning"
    suspension = "suspension"
    termination = "termination"
    no_action = "no_action"


class DisciplinaryStatus(str, Enum):
    open = "open"
    closed = "closed"


# ── Request / Response models ──────────────────────────────

class DisciplinaryCaseCreate(BaseModel):
    """Manager initiates — only MD can close."""
    employee_id: UUID
    issue_type: DisciplinaryIssueType
    description: str


class DisciplinaryCaseUpdate(BaseModel):
    """MD-only — schedule hearing, delegate investigation, record outcome, close."""
    handled_by: Optional[UUID] = None          # Delegate investigation
    hearing_date: Optional[date] = None
    outcome: Optional[DisciplinaryOutcome] = None
    status: Optional[DisciplinaryStatus] = None


class DisciplinaryCaseOut(BaseModel):
    id: UUID
    ref_id: str
    employee_id: UUID
    reported_by: UUID
    issue_type: DisciplinaryIssueType
    description: str
    handled_by: Optional[UUID] = None
    hearing_date: Optional[date] = None
    outcome: Optional[DisciplinaryOutcome] = None
    status: DisciplinaryStatus
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
