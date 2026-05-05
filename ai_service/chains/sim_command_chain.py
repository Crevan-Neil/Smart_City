# ─────────────────────────────────────────────
#  ai_service/chains/sim_command_chain.py
#  Natural language → BullMQ simulation job params
#
#  Translates commands like:
#    "simulate a traffic surge at junction 1 for 30 seconds"
#  Into structured JSON:
#    { type, entityId, duration, intensity }
#
#  Returns None if the command cannot be parsed.
# ─────────────────────────────────────────────

from __future__ import annotations
import json
import re

from rag.context_builder import build_city_context
from llm_client import complete_llm


COMMAND_SYSTEM_PROMPT = """You are a simulation command parser for a Smart City Digital Twin.
Your ONLY job is to convert natural language commands into structured JSON.

Valid simulation types:
- "traffic_surge"      — spike vehicle count at a junction
- "power_spike"        — overload energy consumption in a building
- "air_quality_drop"   — simulate a pollution event
- "custom"             — any other simulation

Valid entity IDs from this campus:
{entity_list}

Rules:
- Respond ONLY with valid JSON — no explanation, no markdown, no backticks
- Duration in seconds (default: 30, max: 120)
- Intensity is a multiplier (default: 2.0, range: 0.5–5.0)
- If you cannot confidently determine the entityId, set it to null
- If the command is not a simulation request, return: {{"error": "not_a_command"}}

Response format (exactly):
{{"type": "...", "entityId": "...", "duration": 30, "intensity": 2.0}}
"""

COMMAND_USER_TEMPLATE = """Parse this simulation command:
"{command}"
"""


async def run_sim_command_chain(
    command: str,
) -> dict | None:
    """
    Parses a natural language simulation command into structured params.

    Returns a dict with { type, entityId, duration, intensity }
    or None if the command could not be parsed.
    """
    from database import get_db

    # ── Fetch entity list for grounding ───────
    try:
        db = get_db()
        buildings = await db["buildings"].find(
            {}, {"entityId": 1, "name": 1, "_id": 0}
        ).to_list(20)
        junctions = await db["junctions"].find(
            {}, {"entityId": 1, "name": 1, "_id": 0}
        ).to_list(10)
    except Exception:
        buildings, junctions = [], []

    entity_lines = [
        f"  - {e['entityId']}: {e['name']}"
        for e in buildings + junctions
    ]
    entity_list = "\n".join(entity_lines) or "  - (no entities loaded)"

    system_prompt = COMMAND_SYSTEM_PROMPT.format(entity_list=entity_list)
    user_message = COMMAND_USER_TEMPLATE.format(command=command)

    # ── Call LLM ──────────────────────────────
    raw = await complete_llm(system_prompt, user_message)
    raw = raw.strip()

    # ── Parse JSON response ───────────────────
    try:
        # Strip any accidental markdown fences
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[sim_command_chain] JSON parse error: {e} — raw: {raw!r}")
        return None

    # Unrecognised command
    if "error" in parsed:
        print(f"[sim_command_chain] LLM flagged non-command: {parsed['error']}")
        return None

    # Validate required fields
    required = {"type", "entityId", "duration", "intensity"}
    if not required.issubset(parsed.keys()):
        print(f"[sim_command_chain] incomplete response: {parsed}")
        return None

    if parsed.get("entityId") is None:
        print("[sim_command_chain] entityId could not be resolved")
        return None

    # Clamp numeric ranges safely handling 'None' from JSON null
    dur = parsed.get("duration")
    dur_val = int(dur) if dur is not None else 30
    parsed["duration"] = max(5, min(dur_val, 120))

    int_val = parsed.get("intensity")
    intensity_val = float(int_val) if int_val is not None else 2.0
    parsed["intensity"] = max(0.5, min(intensity_val, 5.0))

    return parsed