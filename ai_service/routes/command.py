# ─────────────────────────────────────────────
#  ai_service/routes/command.py
#  POST /command — NL → sim job params
#
#  Parses a natural language command from the
#  AI chat panel and returns structured params
#  that the frontend then POSTs to /api/sim/trigger.
# ─────────────────────────────────────────────

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from chains.sim_command_chain import run_sim_command_chain
from middleware.input_validator import validate_command

router = APIRouter()


class CommandRequest(BaseModel):
    command: str


class CommandResponse(BaseModel):
    success:   bool
    parsed:    dict | None = None
    raw:       str         = ""
    error:     str | None  = None


@router.post("", response_model=CommandResponse)
async def parse_command(request: CommandRequest):
    """
    POST /command
    Accepts a natural language simulation command
    and returns structured BullMQ job parameters.

    The frontend is responsible for POSTing the
    returned params to /api/sim/trigger.

    Example input:
      "simulate a power spike in the library for 45 seconds"

    Example output:
      { type: "power_spike", entityId: "bldC", duration: 45, intensity: 2.0 }
    """
    command = validate_command(request.command)

    try:
        result = await run_sim_command_chain(command)

        if result is None:
            return CommandResponse(
                success=False,
                error="Could not parse command — try being more specific. "
                      "Example: 'trigger a traffic surge at junction 1 for 30 seconds'",
            )

        return CommandResponse(
            success=True,
            parsed=result,
            raw=command,
        )

    except Exception as e:
        print(f"[command] parse error: {e}")
        return CommandResponse(
            success=False,
            error=f"Command parsing failed: {str(e)}",
        )