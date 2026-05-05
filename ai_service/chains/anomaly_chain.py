# ─────────────────────────────────────────────
#  ai_service/chains/anomaly_chain.py
#  Threshold breach → plain English narration
#
#  Called by backend when sensor value exceeds
#  its defined threshold. Returns a short,
#  actionable alert message for the dashboard.
# ─────────────────────────────────────────────

from __future__ import annotations
from datetime import datetime, timezone

from rag.context_builder import build_city_context
from rag.embeddings import store_anomaly_log
from llm_client import complete_llm


ANOMALY_SYSTEM_PROMPT = """You are an intelligent alert system for a Smart City Digital Twin 
monitoring a college campus. A sensor threshold has been breached.

Your job is to:
1. Explain what happened in plain English (1 sentence)
2. State the likely cause (1 sentence)
3. Recommend an immediate action (1 sentence)

Be specific, use the actual numbers provided, and keep the total response under 60 words.
Do NOT use bullet points — write as flowing sentences.

{city_context}
"""

ANOMALY_USER_TEMPLATE = """
ALERT: {entity_name} ({entity_id})
Metric: {metric} ({unit})
Current value: {value}
Alert threshold: {threshold}
Excess: {excess:.1f} above threshold
Time: {timestamp}

Generate a clear, actionable alert narration.
"""


async def run_anomaly_chain(
    entity_id: str,
    entity_name: str,
    metric: str,
    value: float,
    threshold: float,
    unit: str = "",
) -> str:
    """
    Generates a plain-English narration for a sensor anomaly.
    Also persists the anomaly + narration for future RAG retrieval.

    Returns the narration string.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # ── Build grounded context ─────────────────
    city_context = await build_city_context(selected_entity_id=entity_id)

    system_prompt = ANOMALY_SYSTEM_PROMPT.format(city_context=city_context)

    user_message = ANOMALY_USER_TEMPLATE.format(
        entity_name=entity_name,
        entity_id=entity_id,
        metric=metric,
        unit=unit,
        value=value,
        threshold=threshold,
        excess=value - threshold,
        timestamp=timestamp,
    )

    # ── Get narration from LLM ─────────────────
    narration = await complete_llm(system_prompt, user_message)
    narration = narration.strip()

    # ── Persist for future RAG retrieval ──────
    anomaly_record = {
        "entityId":   entity_id,
        "entityName": entity_name,
        "metric":     metric,
        "value":      value,
        "threshold":  threshold,
        "unit":       unit,
        "message":    f"{entity_name}: {metric} is {value} {unit} — exceeds threshold of {threshold}",
        "timestamp":  timestamp,
    }
    await store_anomaly_log(anomaly_record, narration)

    return narration