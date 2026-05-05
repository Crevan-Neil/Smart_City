# ─────────────────────────────────────────────
#  ai_service/routes/alert.py
#  POST /alert — anomaly narration endpoint
#
#  Called by the Node.js backend when a threshold
#  breach is detected. Returns plain-English
#  narration for display on the AnomalyBanner.
# ─────────────────────────────────────────────

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from chains.anomaly_chain import run_anomaly_chain

router = APIRouter()


class AlertRequest(BaseModel):
    entityId:   str
    entityName: str = ""
    metric:     str
    value:      float
    threshold:  float
    unit:       str = ""


class AlertResponse(BaseModel):
    success:   bool
    entityId:  str
    metric:    str
    value:     float
    threshold: float
    narration: str


@router.post("", response_model=AlertResponse)
async def narrate_alert(request: AlertRequest):
    """
    POST /alert
    Accepts a threshold breach event and returns
    an AI-generated plain-English narration.

    The narration is also persisted to MongoDB
    for future RAG retrieval.
    """
    if not request.entityId or not request.metric:
        raise HTTPException(status_code=400, detail="entityId and metric are required")

    # Use entityId as fallback name if name not provided
    entity_name = request.entityName or request.entityId

    try:
        narration = await run_anomaly_chain(
            entity_id=request.entityId,
            entity_name=entity_name,
            metric=request.metric,
            value=request.value,
            threshold=request.threshold,
            unit=request.unit,
        )

        return AlertResponse(
            success=True,
            entityId=request.entityId,
            metric=request.metric,
            value=request.value,
            threshold=request.threshold,
            narration=narration,
        )

    except Exception as e:
        print(f"[alert] narration error: {e}")
        # Return a fallback narration rather than a 500
        fallback = (
            f"{entity_name}: {request.metric} reading of {request.value} "
            f"{request.unit} has exceeded the threshold of {request.threshold}. "
            f"Please investigate immediately."
        )
        return AlertResponse(
            success=False,
            entityId=request.entityId,
            metric=request.metric,
            value=request.value,
            threshold=request.threshold,
            narration=fallback,
        )