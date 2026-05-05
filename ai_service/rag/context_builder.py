# ─────────────────────────────────────────────
#  ai_service/rag/context_builder.py
#  Builds grounded context for LLM prompts
#
#  Pulls from two sources:
#    1. MongoDB — static city config (buildings, specs)
#    2. Redis   — live hot-state sensor readings
#
#  Without this, the LLM answers about a generic
#  smart city instead of YOUR campus.
# ─────────────────────────────────────────────

from __future__ import annotations
import json
from typing import Any

from database import get_db, get_redis


async def build_city_context(
    selected_entity_id: str | None = None,
    sensor_data: dict | None = None,
) -> str:
    """
    Returns a formatted string injected into the LLM system prompt.
    Combines MongoDB city config + Redis live readings.

    Args:
        selected_entity_id: the entity currently selected in the 3D scene
        sensor_data: live sensor dict from the frontend (passed in request body)
    """

    # ── 1. Fetch city config from MongoDB ────
    buildings = await _fetch_buildings()
    sensor_specs = await _fetch_sensor_specs()

    # ── 2. Enrich with live readings ──────────
    live_readings = {}

    if sensor_data:
        # Frontend passed live data directly — use it (fastest path)
        live_readings = sensor_data
    else:
        # Fallback: pull from Redis hot-state cache
        live_readings = await _fetch_redis_readings(buildings)

    # ── 3. Build context string ───────────────
    context_parts = [
        "## Campus Configuration",
        f"You are monitoring a smart college campus with {len(buildings)} buildings.",
        "",
        "### Buildings",
    ]

    for b in buildings:
        eid = b.get("entityId", "")
        readings = live_readings.get(eid, {})
        reading_str = ", ".join(
            f"{k}: {v:.1f}" for k, v in readings.items()
            if k not in ("lastUpdated",) and isinstance(v, (int, float))
        ) or "no live data"

        context_parts.append(
            f"- **{b.get('name')}** (ID: {eid})"
            f"\n  Type: {b.get('type', 'unknown')}, Floors: {b.get('floorCount', '?')}"
            f"\n  Max capacity: {b.get('maxCapacity', '?')} kW"
            f"\n  Sensors: {', '.join(b.get('sensors', []))}"
            f"\n  Live readings: {reading_str}"
        )

    context_parts += [
        "",
        "### Sensor Thresholds (alert above these values)",
    ]
    for spec in sensor_specs:
        context_parts.append(
            f"- {spec.get('metric')}: alert at {spec.get('alertThreshold')} "
            f"{spec.get('unit')} (normal range: "
            f"{spec.get('minNormal')}–{spec.get('maxNormal')})"
        )

    # ── 4. Highlight selected entity ──────────
    if selected_entity_id:
        selected = next(
            (b for b in buildings if b.get("entityId") == selected_entity_id), None
        )
        if selected:
            readings = live_readings.get(selected_entity_id, {})
            context_parts += [
                "",
                f"### Currently Selected: {selected.get('name')} ({selected_entity_id})",
                f"Live data: {json.dumps(readings, indent=2)}",
            ]

    return "\n".join(context_parts)


# ── Private helpers ───────────────────────────

async def _fetch_buildings() -> list[dict]:
    """Fetch all building documents from MongoDB."""
    try:
        db = get_db()
        cursor = db["buildings"].find(
            {"isActive": {"$ne": False}},
            {"_id": 0}
        )
        return await cursor.to_list(length=50)
    except Exception as e:
        print(f"[context_builder] MongoDB buildings fetch error: {e}")
        return []


async def _fetch_sensor_specs() -> list[dict]:
    """Fetch all sensor spec documents from MongoDB."""
    try:
        db = get_db()
        cursor = db["sensorspecs"].find({}, {"_id": 0})
        return await cursor.to_list(length=20)
    except Exception as e:
        print(f"[context_builder] MongoDB sensor specs fetch error: {e}")
        return []


async def _fetch_redis_readings(buildings: list[dict]) -> dict:
    """
    For each building, fetch its latest sensor readings
    from the Redis hot-state cache (city:state:<entityId>:<metric>)
    """
    redis = get_redis()
    metrics = ["energy", "temperature", "air_quality", "traffic"]
    result = {}

    for building in buildings:
        eid = building.get("entityId", "")
        if not eid:
            continue

        entity_readings = {}
        for metric in metrics:
            key = f"city:state:{eid}:{metric}"
            try:
                val = await redis.get(key)
                if val is not None:
                    entity_readings[metric] = float(val)
            except Exception:
                pass

        if entity_readings:
            result[eid] = entity_readings

    return result