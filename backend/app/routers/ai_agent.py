"""
AI Agent router — chat endpoint.

Single endpoint: POST /ai/chat
Employees only — managers and MD don't use the AI chat for decisions.
"""

from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_user, CurrentUser
from app.models.ai_agent import ChatRequest, ChatResponse
from app.services.ai_service import chat
from app.database import get_supabase

router = APIRouter(prefix="/ai", tags=["AI Agent"])


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    payload: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Employee sends a message to People Support AI.

    - Escalation keywords trigger immediate redirect (no Claude call).
    - Conversation history is passed for context-aware replies.
    - Confidence indicator is always included in the response.
    - Disclaimer is included on new sessions (empty history).
    """
    # Fetch employee name for personalisation
    db = get_supabase()
    emp = db.table("employees").select("name").eq("id", str(user.employee_id)).single().execute()
    employee_name = emp.data.get("name") if emp.data else None

    return chat(
        message=payload.message,
        conversation_history=payload.conversation_history or [],
        employee_name=employee_name,
    )
