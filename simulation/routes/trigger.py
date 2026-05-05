# ─────────────────────────────────────────────
#  simulation/routes/trigger.py
#  POST /trigger — inject a simulation event
#
#  Called by the Node.js BullMQ worker when a
#  sim command is dispatched from the dashboard.
#
#  Maps event type to the affected sensor(s)
#  and injects a boost via the RandomWalkGenerator.
# ─────────────────────────────────────────────

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from generator.random_walk import get_generator
from generator.city_config import ENTITY_MAP
from config import settings

router = APIRouter()


# ── Which metrics each event type affects ─────
EVENT_METRIC_MAP: dict[str, list[str]] = {
    "traffic_surge":    ["traffic"],
    "power_spike":      ["energy"],
    "air_quality_drop": ["air_quality"],
    "custom":           [],   # affects all sensors on the entity
}


class TriggerRequest(BaseModel):
    type:      str  = Field(default="custom",  description="Event type")
    entityId:  str  = Field(...,               description="Target entity ID")
    duration:  int  = Field(default=30,        ge=5, le=120,
                            description="Duration in seconds")
    intensity: float = Field(default=2.0,      ge=0.5, le=5.0,
                            description="Multiplier on sensor value")


class TriggerResponse(BaseModel):
    success:         bool
    entityId:        str
    type:            str
    metrics_boosted: list[str]
    duration_ticks:  int
    intensity:       float
    message:         str


@router.post("/trigger", response_model=TriggerResponse)
async def trigger_event(req: TriggerRequest):
    """
    POST /trigger
    Injects a temporary boost into one or more sensors
    on the specified entity. The boost lasts for
    `duration_ticks` simulation ticks.

    duration_ticks = ceil(duration_seconds / SIM_INTERVAL_SEC)
    """

    # ── Validate entity ───────────────────────
    entity = ENTITY_MAP.get(req.entityId)
    if entity is None:
        raise HTTPException(
            status_code=404,
            detail=f"Entity '{req.entityId}' not found. "
                   f"Valid IDs: {list(ENTITY_MAP.keys())}",
        )

    # ── Resolve which metrics to boost ────────
    affected_metrics = EVENT_METRIC_MAP.get(req.type, [])

    if req.type == "custom" or not affected_metrics:
        # Custom: boost all sensors on this entity
        affected_metrics = [s.metric for s in entity.sensors]

    # Filter to only metrics this entity actually has
    entity_metrics = {s.metric for s in entity.sensors}
    metrics_to_boost = [m for m in affected_metrics if m in entity_metrics]

    if not metrics_to_boost:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Entity '{req.entityId}' does not have any of the "
                f"metrics affected by event '{req.type}'. "
                f"Available metrics: {list(entity_metrics)}"
            ),
        )

    # ── Calculate duration in ticks ───────────
    duration_ticks = max(
        1,
        round(req.duration / settings.SIM_INTERVAL_SEC)
    )

    # ── Inject boost into generator ───────────
    generator = get_generator()
    for metric in metrics_to_boost:
        generator.inject_event(
            entity_id=req.entityId,
            metric=metric,
            intensity=req.intensity,
            duration_ticks=duration_ticks,
        )

    message = (
        f"{req.type.replace('_', ' ').title()} triggered on "
        f"{entity.name} — {req.intensity}× intensity for "
        f"~{req.duration}s ({duration_ticks} ticks)"
    )
    print(f"[trigger] {message}")

    return TriggerResponse(
        success=True,
        entityId=req.entityId,
        type=req.type,
        metrics_boosted=metrics_to_boost,
        duration_ticks=duration_ticks,
        intensity=req.intensity,
        message=message,
    )