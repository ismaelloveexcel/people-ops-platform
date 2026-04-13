from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class AIConfidence(str, Enum):
    based_on_policy = "based_on_policy"          # ✅ Green  — direct policy answer
    confirm_with_manager = "confirm_with_manager" # ⚠️ Amber — situation may vary
    speak_to_md = "speak_to_md"                   # 🔴 Red   — sensitive, escalate


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    message: str
    confidence: AIConfidence
    escalated: bool = False             # True when grievance keywords detected
    escalation_url: Optional[str] = None  # Link to grievance form if escalated
    disclaimer: str = (
        "People Support AI provides guidance only. "
        "All decisions are made by your line manager. "
        "For sensitive issues, use the Raise a Concern form — "
        "it goes directly to the Managing Director."
    )
