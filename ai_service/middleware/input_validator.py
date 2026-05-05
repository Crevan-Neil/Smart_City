# ─────────────────────────────────────────────
#  ai_service/middleware/input_validator.py
#  Input validation + prompt injection defence
#
#  The AI chat endpoint is particularly sensitive —
#  users could attempt prompt injection attacks to
#  override the system prompt. This middleware
#  detects and blocks the most common patterns.
# ─────────────────────────────────────────────

import re
from fastapi import HTTPException


# ── Max lengths ───────────────────────────────
MAX_MESSAGE_LENGTH = 500       # characters in a chat message
MAX_COMMAND_LENGTH = 300       # characters in a sim command
MAX_CONTEXT_SIZE_KB = 50       # KB of JSON context payload


# ── Prompt injection patterns ─────────────────
# These are common attempts to override the system prompt
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"forget\s+(everything|all|your)\s+(above|instructions|context)",
    r"you\s+are\s+now\s+(a\s+)?(?:different|new|another)",
    r"system\s*prompt",
    r"act\s+as\s+(if\s+you\s+(are|were)|a)",
    r"do\s+anything\s+now",
    r"jailbreak",
    r"<\|system\|>",
    r"\[system\]",
    r"###\s*instruction",
]

INJECTION_REGEX = re.compile(
    "|".join(INJECTION_PATTERNS),
    re.IGNORECASE,
)


def validate_chat_message(message: str) -> str:
    """
    Validate and sanitise a chat message.

    Raises HTTPException 400 if the message is invalid.
    Returns the sanitised message string.
    """
    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message too long — maximum {MAX_MESSAGE_LENGTH} characters",
        )

    # Check for prompt injection attempts
    if INJECTION_REGEX.search(message):
        raise HTTPException(
            status_code=400,
            detail="Message contains disallowed patterns",
        )

    # Strip leading/trailing whitespace
    return message.strip()


def validate_command(command: str) -> str:
    """
    Validate a natural language simulation command.
    """
    if not command or not command.strip():
        raise HTTPException(status_code=400, detail="Command cannot be empty")

    if len(command) > MAX_COMMAND_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Command too long — maximum {MAX_COMMAND_LENGTH} characters",
        )

    if INJECTION_REGEX.search(command):
        raise HTTPException(
            status_code=400,
            detail="Command contains disallowed patterns",
        )

    return command.strip()


def validate_context(context: dict | None) -> dict | None:
    """
    Validate the context payload passed from the frontend.
    Rejects context that is excessively large.
    """
    if context is None:
        return None

    import json
    context_str = json.dumps(context)
    size_kb = len(context_str.encode("utf-8")) / 1024

    if size_kb > MAX_CONTEXT_SIZE_KB:
        raise HTTPException(
            status_code=400,
            detail=f"Context payload too large ({size_kb:.1f} KB) — max {MAX_CONTEXT_SIZE_KB} KB",
        )

    return context