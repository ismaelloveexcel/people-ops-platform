"""
Employees router — CRUD.
- MD can create, update, deactivate any employee.
- Manager can read their direct reports.
- Employee can read and update their own profile (limited fields).
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from uuid import UUID

from app.database import get_supabase
from app.middleware.auth import get_current_user, require_md, CurrentUser
from app.models.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("/", response_model=List[EmployeeOut])
async def list_employees(
    department: Optional[str] = None,
    status: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    """
    MD sees all employees.
    Manager sees their direct reports only.
    Employee sees only themselves.
    """
    db = get_supabase()
    query = db.table("employees").select("*")

    if user.is_md_level:
        # MD sees everyone
        if department:
            query = query.eq("department", department)
        if status:
            query = query.eq("status", status)
    elif user.role.value == "manager":
        # Manager sees direct reports only
        query = query.eq("reports_to", str(user.employee_id))
    else:
        # Employee sees only themselves
        query = query.eq("id", str(user.employee_id))

    result = query.execute()
    return result.data


@router.get("/me", response_model=EmployeeOut)
async def get_my_profile(user: CurrentUser = Depends(get_current_user)):
    """Return the authenticated employee's own profile."""
    db = get_supabase()
    result = (
        db.table("employees")
        .select("*")
        .eq("id", str(user.employee_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return result.data


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: UUID,
    user: CurrentUser = Depends(get_current_user),
):
    """Get a single employee. Access rules enforced server-side."""
    db = get_supabase()

    # Permission check
    if not user.is_md_level:
        if user.role.value != "manager":
            # Employee can only see themselves
            if employee_id != user.employee_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        else:
            # Manager: verify this employee reports to them
            check = (
                db.table("employees")
                .select("id")
                .eq("id", str(employee_id))
                .eq("reports_to", str(user.employee_id))
                .execute()
            )
            if not check.data and employee_id != user.employee_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    result = (
        db.table("employees")
        .select("*")
        .eq("id", str(employee_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return result.data


@router.post("/", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    user: CurrentUser = Depends(require_md),
):
    """Create a new employee record. MD only."""
    db = get_supabase()

    # Check for duplicate email
    existing = db.table("employees").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="An employee with this email already exists.")

    data = payload.model_dump()
    # Convert UUID fields to strings for Supabase
    if data.get("reports_to"):
        data["reports_to"] = str(data["reports_to"])

    result = db.table("employees").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create employee.")
    return result.data[0]


@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    user: CurrentUser = Depends(get_current_user),
):
    """
    MD can update any employee.
    Employees can update their own phone only.
    """
    db = get_supabase()

    if not user.is_md_level:
        if employee_id != user.employee_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        # Employees can only update their own phone
        allowed = {"phone"}
        update_data = {k: v for k, v in payload.model_dump(exclude_none=True).items() if k in allowed}
    else:
        update_data = payload.model_dump(exclude_none=True)
        if "reports_to" in update_data and update_data["reports_to"]:
            update_data["reports_to"] = str(update_data["reports_to"])

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    result = (
        db.table("employees")
        .update(update_data)
        .eq("id", str(employee_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return result.data[0]


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_employee(
    employee_id: UUID,
    user: CurrentUser = Depends(require_md),
):
    """Soft-delete: set status to inactive. MD only."""
    db = get_supabase()
    result = (
        db.table("employees")
        .update({"status": "inactive"})
        .eq("id", str(employee_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Employee not found.")
