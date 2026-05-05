# ─────────────────────────────────────────────
#  ai_service/rag/embeddings.py
#  Optional: vector similarity search
#  Finds similar past anomalies to enrich context
#
#  Uses simple cosine similarity on stored anomaly
#  vectors — no external vector DB needed for MVP.
#  Upgrade path: swap with Pinecone / Qdrant later.
# ─────────────────────────────────────────────

from __future__ import annotations
import math
from typing import Any

from database import get_db


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x ** 2 for x in a))
    mag_b = math.sqrt(sum(x ** 2 for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def simple_embed(text: str) -> list[float]:
    """
    Lightweight keyword-based pseudo-embedding.
    Produces a fixed-length vector based on keyword presence.

    This is intentionally simple — it avoids an embedding API call
    for MVP. Replace with a real embedding model when scaling.

    Dimensions:
      0: energy mention
      1: temperature mention
      2: traffic mention
      3: air quality mention
      4: alert/anomaly mention
      5: building A
      6: building B
      7: building C
      8: building D
      9: building E
    """
    text_lower = text.lower()

    keywords = [
        ["energy", "power", "electricity", "kw"],
        ["temperature", "temp", "heat", "hot", "cold"],
        ["traffic", "vehicle", "car", "junction"],
        ["air", "aqi", "pollution", "quality"],
        ["alert", "anomaly", "spike", "breach", "exceeded"],
        ["blda", "building a", "engineering"],
        ["bldb", "building b", "admin"],
        ["bldc", "building c", "library"],
        ["bldd", "building d", "hostel"],
        ["blde", "building e", "utility"],
    ]

    vector = []
    for group in keywords:
        score = sum(1.0 for kw in group if kw in text_lower)
        vector.append(min(score, 1.0))

    return vector


async def find_similar_anomalies(
    query: str,
    top_k: int = 3,
    min_similarity: float = 0.3,
) -> list[dict]:
    """
    Search stored anomaly logs for similar past events.
    Returns top_k most similar anomaly records.

    Falls back gracefully if no anomalies are stored yet.
    """
    try:
        db = get_db()
        query_vec = simple_embed(query)

        # Fetch recent anomaly logs (last 200)
        cursor = db["anomaly_logs"].find(
            {},
            {"_id": 0, "message": 1, "metric": 1, "entityId": 1,
             "value": 1, "timestamp": 1, "narration": 1}
        ).sort("timestamp", -1).limit(200)

        docs = await cursor.to_list(length=200)

        # Score each by similarity to query
        scored = []
        for doc in docs:
            text = f"{doc.get('message', '')} {doc.get('narration', '')}"
            doc_vec = simple_embed(text)
            score = cosine_similarity(query_vec, doc_vec)
            if score >= min_similarity:
                scored.append({**doc, "_score": round(score, 3)})

        # Return top_k sorted by score
        scored.sort(key=lambda x: x["_score"], reverse=True)
        return scored[:top_k]

    except Exception as e:
        print(f"[embeddings] similarity search error: {e}")
        return []


async def store_anomaly_log(anomaly: dict, narration: str) -> None:
    """
    Persist an anomaly event + its AI narration for future RAG retrieval.
    """
    try:
        db = get_db()
        await db["anomaly_logs"].insert_one({
            **anomaly,
            "narration": narration,
        })
    except Exception as e:
        print(f"[embeddings] store anomaly error: {e}")