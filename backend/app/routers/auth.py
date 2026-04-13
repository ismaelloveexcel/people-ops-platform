"""
Auth router — login, logout, session, password reset.
Delegates to Supabase Auth; backend just proxies + returns employee context.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from app.database import get_supabase
from app.config import get_settings
from app.middleware.auth import get_current_user, CurrentUser
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee_id: str
    name: str
    role: str
    is_md_level: bool


class PasswordResetRequest(BaseModel):
    email: EmailStr


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """Authenticate via Supabase Auth and return JWT + employee context."""
    db = get_supabase()
    try:
        response = db.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )

    auth_user_id = response.user.id
    access_token = response.session.access_token

    # Fetch employee record
    emp_result = (
        db.table("employees")
        .select("id, name, role, status")
        .eq("auth_user_id", auth_user_id)
        .single()
        .execute()
    )

    if not emp_result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No employee record linked to this account.",
        )

    emp = emp_result.data

    if emp["status"] == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive.",
        )

    # Check Acting MD
    from datetime import date
    today = date.today().isoformat()
    acting = (
        db.table("acting_md")
        .select("id")
        .eq("assigned_to", emp["id"])
        .eq("status", "active")
        .lte("start_date", today)
        .gte("end_date", today)
        .limit(1)
        .execute()
    )
    is_md_level = emp["role"] == "md" or len(acting.data) > 0

    return LoginResponse(
        access_token=access_token,
        employee_id=emp["id"],
        name=emp["name"],
        role=emp["role"],
        is_md_level=is_md_level,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user: CurrentUser = Depends(get_current_user)):
    """Invalidate the current session via Supabase Auth."""
    db = get_supabase()
    try:
        db.auth.sign_out()
    except Exception:
        pass  # Best-effort logout


@router.get("/me", response_model=LoginResponse)
async def get_me(user: CurrentUser = Depends(get_current_user)):
    """Return current user context — useful on frontend page load."""
    return LoginResponse(
        access_token="",     # Not re-issued here; frontend holds the token
        employee_id=str(user.employee_id),
        name=user.name,
        role=user.role.value,
        is_md_level=user.is_md_level,
    )


@router.post("/password-reset", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(payload: PasswordResetRequest):
    """Send a password reset email via Supabase Auth."""
    db = get_supabase()
    try:
        db.auth.reset_password_email(payload.email)
    except Exception as e:
        logger.warning(f"Password reset request failed: {e}")
    # Always return 204 — don't leak whether the email exists
