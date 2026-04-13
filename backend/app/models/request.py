from pydantic import BaseModel, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class RequestType(str, Enum):
    leave = "leave"
    document = "document"
    reimbursement = "reimbursement"
    bank_change = "bank_change"
    general = "general"


class RequestStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


# ── Request / Response models ──────────────────────────────

class RequestCreate(BaseModel):
    type: RequestType
    description: Optional[str] = None
    attachment_url: Optional[str] = None


class RequestSubmit(BaseModel):
    """Transition a draft to submitted."""
    pass


class RequestApprove(BaseModel):
    reason: Optional[str] = None    # Optional on approval, good practice to include


class RequestReject(BaseModel):
    rejection_reason: str           # Mandatory — enforced here and at DB level

    @field_validator("rejection_reason")
    @classmethod
    def reason_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Rejection reason cannot be empty.")
        return v.strip()


class RequestOut(BaseModel):
    id: UUID
    ref_id: str
    employee_id: UUID
    type: RequestType
    status: RequestStatus
    manager_id: Optional[UUID] = None
    description: Optional[str] = None
    submitted_at: Optional[datetime] = None
    decided_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    attachment_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
