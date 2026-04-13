"""
Auth middleware — Supabase JWT verification + employee role injection.

Every protected route receives a `CurrentUser` object containing:
  - auth_user_id  (from Supabase Auth JWT)
  - employee_id   (from employees table)
  - role          (employee | manager | md | acting_md)
  - is_md_level   (True if role=md OR active acting_md assignment)
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import date
from typing import Optional
from uuid import UUID
import logging

from app.config import get_settings
from app.database import get_supabase
from app.models.employee import UserRole

logger = logging.getLogger(__name__)
settings = get_settings()
bearer_scheme = HTTPBearer()


class CurrentUser:
    def __init__(
        self,
        auth_user_id: UUID,
        employee_id: UUID,
        role: UserRole,
        name: str,
        is_md_level: bool,
    ):
        self.auth_user_id = auth_user_id
        self.employee_id = employee_id
        self.role = role
        self.name = name
        self.is_md_level = is_md_level    # MD or active Acting MD

    @property
    def is_manager_or_above(self) -> bool:
        return self.role in (UserRole.manager, UserRole.md, UserRole.acting_md) or self.is_md_level


def _verify_jwt(token: str) -> dict:
    """Verify and decode a Supabase-issued JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _check_acting_md(employee_id: UUID, db) -> bool:
    """Check if the employee has an active Acting MD assignment today."""
    try:
        today = date.today().isoformat()
        result = (
            db.table("acting_md")
            .select("id")
            .eq("assigned_to", str(employee_id))
            .eq("status", "active")
            .lte("start_date", today)
            .gte("end_date", today)
            .limit(1)
            .execute()
        )
        return len(result.data) > 0
    except Exception:
        return False


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    """
    FastAPI dependency — decode JWT, look up employee record, check Acting MD status.
    Inject CurrentUser into every protected route.
    """
    token = credentials.credentials
    payload = _verify_jwt(token)

    auth_user_id_str: Optional[str] = payload.get("sub")
    if not auth_user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject.")

    db = get_supabase()

    # Look up employee by auth_user_id
    result = (
        db.table("employees")
        .select("id, name, role, status")
        .eq("auth_user_id", auth_user_id_str)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No employee record found for this user. Contact your administrator.",
        )

    emp = result.data

    if emp["status"] == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive. Contact HR.",
        )

    employee_id = UUID(emp["id"])
    role = UserRole(emp["role"])

    # Check if this employee has an active Acting MD assignment
    is_acting = _check_acting_md(employee_id, db)
    is_md_level = (role == UserRole.md) or is_acting

    return CurrentUser(
        auth_user_id=UUID(auth_user_id_str),
        employee_id=employee_id,
        role=role,
        name=emp["name"],
        is_md_level=is_md_level,
    )


# ── Role-gating dependencies ───────────────────────────────

async def require_manager(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Manager, MD, or Acting MD only."""
    if not user.is_manager_or_above:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required.")
    return user


async def require_md(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """MD or active Acting MD only."""
    if not user.is_md_level:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MD access required.")
    return user


async def require_real_md(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Real MD ONLY — Acting MD cannot perform this action (e.g. assign Acting MD)."""
    if user.role != UserRole.md:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires the Managing Director. Acting MD cannot perform it.",
        )
    return user
