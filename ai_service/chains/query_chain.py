# ─────────────────────────────────────────────
#  ai_service/chains/query_chain.py
#  User question → grounded LLM answer
#
#  Pipeline:
#    1. Build city context (MongoDB + Redis)
#    2. Find similar past anomalies (RAG)
#    3. Compose system prompt with grounding
#    4. Stream response tokens
# ─────────────────────────────────────────────

from __future__ import annotations
from typing import AsyncGenerator

from rag.context_builder import build_city_context
from rag.embeddings import find_similar_anomalies
from llm_client import stream_llm


SYSTEM_PROMPT_TEMPLATE = """You are the AI assistant for a Smart City Digital Twin monitoring a college campus.
You have real-time access to sensor data and can answer questions about energy usage,
temperature, air quality, and traffic conditions.

Your personality:
- Precise and data-driven — always cite specific values when available
- Concise — answer in 2–4 sentences unless a longer explanation is needed
- Proactive — if you notice something anomalous in the data, mention it
- Professional but friendly

Rules:
- Only answer questions about the campus data provided below
- If data is missing or unavailable, say so clearly
- Never fabricate sensor values
- Recommend action when values exceed thresholds

{city_context}

{similar_anomalies_section}

Current timestamp: {timestamp}
"""


async def run_query_chain(
    message: str,
    selected_entity_id: str | None = None,
    sensor_data: dict | None = None,
) -> AsyncGenerator[str, None]:
    """
    Full RAG + LLM pipeline for user chat queries.
    Yields tokens as they stream from the LLM.
    """
    from datetime import datetime, timezone

    # ── Step 1: Build grounded context ────────
    city_context = await build_city_context(
        selected_entity_id=selected_entity_id,
        sensor_data=sensor_data,
    )

    # ── Step 2: Find similar past anomalies ───
    similar = await find_similar_anomalies(message, top_k=2)
    if similar:
        similar_section = "### Similar Past Events\n" + "\n".join(
            f"- [{s.get('timestamp', 'unknown time')}] "
            f"{s.get('message', '')} → {s.get('narration', '')}"
            for s in similar
        )
    else:
        similar_section = ""

    # ── Step 3: Compose system prompt ─────────
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        city_context=city_context,
        similar_anomalies_section=similar_section,
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    )

    # ── Step 4: Stream response ────────────────
    async for token in stream_llm(system_prompt, message):
        yield token