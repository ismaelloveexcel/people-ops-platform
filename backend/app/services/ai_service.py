"""
People Support AI — Service layer.

Blueprint v3 rules enforced here:
  1. Guidance only — never approve, never decide, never give final answers.
  2. Confidence indicator on EVERY response (based_on_policy / confirm_with_manager / speak_to_md).
  3. Escalation keyword detection → immediate redirect to grievance form, no further input collected.
  4. Disclaimer displayed on every session start.
  5. Knowledge base: company policies only. No personal data about other employees.
  6. Mauritius Workers' Rights Act context — leave minimums, disciplinary process.
"""

import re
import logging
from typing import Optional
import anthropic

from app.config import get_settings
from app.models.ai_agent import AIConfidence, ChatMessage, ChatResponse

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Escalation keyword detection ─────────────────────────────────────────────
# Any of these keywords in a user message triggers immediate MD redirect.
# The AI stops collecting input and shows the grievance form link.

ESCALATION_PATTERNS = [
    r"\bharass(ed|ment|ing)?\b",
    r"\bthreatened?\b",
    r"\bunsafe\b",
    r"\bunfair(ly)?\b",
    r"\bdiscriminat(ed|ion|ing)?\b",
    r"\bbias(ed)?\b",
    r"\bsalary\s+wrong\b",
    r"\bnot\s+paid\b",
    r"\bmissing\s+(pay|salary|wage)\b",
    r"\bfired\b",
    r"\bdismissed?\b",
    r"\btermination\b",
    r"\bcomplaint\s+(about|against)\s+my?\s+manager\b",
    r"\bmanager\s+is\s+bullying\b",
    r"\babusive?\b",
    r"\bretaliation\b",
    r"\bwhistleblow(er|ing)?\b",
]

_ESCALATION_REGEX = re.compile(
    "|".join(ESCALATION_PATTERNS),
    re.IGNORECASE
)

ESCALATION_RESPONSE = (
    "I can hear that you're dealing with something serious, and I want to make sure "
    "you get the right support.\n\n"
    "🔴 This is a matter that must go directly to the Managing Director — "
    "I'm not able to assist further with this topic.\n\n"
    "**Please use the Raise a Concern form** — it goes directly to the MD, "
    "bypasses all managers, and is handled in confidence.\n\n"
    "Your concerns will be taken seriously."
)

# ─── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are People Support AI — the HR assistant for a Mauritius SME.

## YOUR ROLE
You provide guidance and information to employees about HR policies and processes.
You help employees understand how to submit requests, check leave entitlements, and navigate HR procedures.

## HARD RULES — NEVER BREAK THESE
1. You NEVER approve or reject any request. You NEVER make decisions of any kind.
2. You NEVER handle grievance content. If anyone raises a sensitive concern, redirect immediately to the Raise a Concern form.
3. You NEVER access or discuss another employee's data. You only discuss the employee you are speaking with.
4. You NEVER interpret the Mauritius Employment Rights Act independently — you state the minimums and advise confirming with the MD.
5. You NEVER make assumptions beyond the knowledge base below.
6. You NEVER route sensitive cases to a manager — ALL sensitive matters go to the MD only.
7. You NEVER give a final decision. Every response ends with a confidence indicator.

## CONFIDENCE INDICATOR — REQUIRED ON EVERY RESPONSE
End every response with exactly one of these indicators on its own line:

✅ **Based on policy** — when your answer comes directly from the policies below. No interpretation needed.
⚠️ **Confirm with manager** — when the answer applies generally but the employee's specific situation may differ.
🔴 **Speak to MD** — when the matter is sensitive, complex, involves salary errors, disciplinary concerns, or anything requiring a final decision.

## WHAT YOU CAN DO
- Answer questions about leave types, balances, and entitlements
- Explain how to submit leave requests, document requests, reimbursement requests, bank change requests
- Guide employees on the request submission process (step-by-step)
- Explain what happens after a request is submitted (who reviews it, typical timeframes)
- Explain the grievance process (you can explain it exists but cannot handle intake)
- Explain the disciplinary process at a high level
- Tell employees how to check their request status
- Explain company policies in plain language

## WHAT YOU CANNOT DO
- Approve, reject, or comment on specific pending requests
- Handle any grievance — redirect to the form immediately
- Discuss salary, payroll specifics, or payslip details
- Make any HR decision or recommendation about a specific person
- Confirm whether a specific request will be approved

## MAURITIUS LEAVE POLICY (Workers' Rights Act minimums)
- Annual leave: minimum 20 days per year
- Sick leave: 15 days per year (medical certificate required after 3 consecutive days)
- Maternity leave: 14 weeks paid
- Paternity leave: 5 days paid
- Public holidays: per official Mauritius calendar (varies each year)

## REQUEST TYPES AVAILABLE
1. **Leave Request** — annual, sick, maternity, paternity, other
2. **Document Request** — employment letter, payslip copy, reference letter
3. **Reimbursement Request** — attach receipt, state business purpose
4. **Bank Change Request** — update salary payment details
5. **General Request** — anything else

## HOW REQUESTS WORK
1. Employee submits via the platform
2. Request is automatically routed to their line manager
3. Manager reviews with a Decision Guide and approves or rejects (with mandatory reason)
4. Employee is notified of the decision
5. Disputed decisions can be escalated to the MD

## SESSION DISCLAIMER (include at the start of new conversations)
"People Support AI provides guidance only. All decisions are made by your line manager. For sensitive issues, use the Raise a Concern form — it goes directly to the Managing Director."

## TONE
Be warm, clear, and professional. Use plain language — avoid HR jargon.
Keep responses concise. Use bullet points for steps.
If you don't know something, say so clearly and suggest who to ask.
"""

# ─── Confidence level detection ───────────────────────────────────────────────

def _extract_confidence(text: str) -> AIConfidence:
    """
    Parse the confidence indicator the AI appended to its response.
    Falls back to 'confirm_with_manager' if the model forgot to include one.
    """
    if "✅" in text or "Based on policy" in text:
        return AIConfidence.based_on_policy
    if "🔴" in text or "Speak to MD" in text:
        return AIConfidence.speak_to_md
    if "⚠️" in text or "Confirm with manager" in text:
        return AIConfidence.confirm_with_manager
    # Default — safe fallback
    return AIConfidence.confirm_with_manager


def _is_new_session(history: list) -> bool:
    return len(history) == 0


# ─── Main chat function ────────────────────────────────────────────────────────

def chat(
    message: str,
    conversation_history: list[ChatMessage],
    employee_name: Optional[str] = None,
    grievance_form_url: str = "/raise-concern",
) -> ChatResponse:
    """
    Process a chat message from an employee.

    1. Check for escalation keywords first — if found, short-circuit immediately.
    2. Build conversation context for Claude.
    3. Call Claude API with system prompt.
    4. Extract confidence indicator from response.
    5. Return ChatResponse.
    """

    # ── Step 1: Escalation check ──────────────────────────────────────────────
    if _ESCALATION_REGEX.search(message):
        logger.info(f"Escalation keyword detected in message from {employee_name or 'unknown'}")
        return ChatResponse(
            message=ESCALATION_RESPONSE,
            confidence=AIConfidence.speak_to_md,
            escalated=True,
            escalation_url=grievance_form_url,
        )

    # ── Step 2: Build messages for Claude ────────────────────────────────────
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    messages = []

    # Add session disclaimer as first assistant message for new sessions
    if _is_new_session(conversation_history):
        messages.append({
            "role": "assistant",
            "content": (
                "👋 Welcome to People Support AI.\n\n"
                "_People Support AI provides guidance only. All decisions are made by your line manager. "
                "For sensitive issues, use the Raise a Concern form — it goes directly to the Managing Director._\n\n"
                "How can I help you today?"
            ),
        })

    # Add conversation history
    for msg in conversation_history:
        messages.append({"role": msg.role, "content": msg.content})

    # Add current user message (personalise if we have their name)
    user_content = message
    if employee_name and _is_new_session(conversation_history):
        user_content = f"[Employee: {employee_name}]\n{message}"

    messages.append({"role": "user", "content": user_content})

    # ── Step 3: Call Claude API ───────────────────────────────────────────────
    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        ai_text = response.content[0].text
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        return ChatResponse(
            message=(
                "I'm having trouble connecting right now. "
                "Please try again in a moment, or contact your line manager directly."
            ),
            confidence=AIConfidence.confirm_with_manager,
        )

    # ── Step 4: Extract confidence + check for escalation in AI response ──────
    confidence = _extract_confidence(ai_text)

    # Secondary escalation check — in case AI response itself suggests escalation
    # (e.g. user was indirect, AI detected the sensitivity)
    escalated = confidence == AIConfidence.speak_to_md
    escalation_url = grievance_form_url if escalated else None

    return ChatResponse(
        message=ai_text,
        confidence=confidence,
        escalated=escalated,
        escalation_url=escalation_url,
    )
