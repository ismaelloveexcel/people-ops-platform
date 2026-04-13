from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from enum import Enum


class UserRole(str, Enum):
    employee = "employee"
    manager = "manager"
    md = "md"
    acting_md = "acting_md"


class EmploymentType(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"


class EmployeeStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    on_notice = "on_notice"


# ── Request / Response models ──────────────────────────────

class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    department: str
    reports_to: Optional[UUID] = None
    date_joined: date
    employment_type: EmploymentType = EmploymentType.full_time
    status: EmployeeStatus = EmployeeStatus.active
    nid: Optional[str] = None
    role: UserRole = UserRole.employee
    phone: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    reports_to: Optional[UUID] = None
    employment_type: Optional[EmploymentType] = None
    status: Optional[EmployeeStatus] = None
    nid: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None


class EmployeeOut(BaseModel):
    id: UUID
    auth_user_id: Optional[UUID] = None
    name: str
    email: str
    department: str
    reports_to: Optional[UUID] = None
    date_joined: date
    employment_type: EmploymentType
    status: EmployeeStatus
    nid: Optional[str] = None
    role: UserRole
    phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmployeeMinimal(BaseModel):
    """Lightweight employee reference used in nested responses."""
    id: UUID
    name: str
    department: str
    role: UserRole
