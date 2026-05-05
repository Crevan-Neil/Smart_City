# ─────────────────────────────────────────────
#  ai_service/llm_client.py
#  Unified LLM abstraction — swap Gemini ↔ OpenAI
#  by changing LLM_PROVIDER in .env
# ─────────────────────────────────────────────

from typing import AsyncGenerator
from config import settings


async def stream_llm(
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str, None]:
    """
    Streams tokens from the configured LLM provider.
    Yields one token (string) at a time.
    """
    if settings.LLM_PROVIDER == "gemini":
        async for token in _stream_gemini(system_prompt, user_message):
            yield token
    elif settings.LLM_PROVIDER == "openai":
        async for token in _stream_openai(system_prompt, user_message):
            yield token
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")


async def complete_llm(system_prompt: str, user_message: str) -> str:
    """
    Non-streaming completion — returns full response string.
    Used for anomaly narration and command parsing.
    """
    tokens = []
    async for token in stream_llm(system_prompt, user_message):
        tokens.append(token)
    return "".join(tokens)


# ── Gemini provider ───────────────────────────
async def _stream_gemini(
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str, None]:
    import google.generativeai as genai

    genai.configure(api_key=settings.LLM_API_KEY)

    try:
        model = genai.GenerativeModel(
            model_name=settings.LLM_MODEL,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=settings.LLM_MAX_TOKENS,
                temperature=settings.LLM_TEMPERATURE,
            ),
        )

        response = await model.generate_content_async(
            user_message,
            stream=True,
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        print(f"[llm_client] Gemini Error with model {settings.LLM_MODEL}: {e}")
        # Re-raise to be caught by the route handler
        raise e


# ── OpenAI provider ───────────────────────────
async def _stream_openai(
    system_prompt: str,
    user_message: str,
) -> AsyncGenerator[str, None]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.LLM_API_KEY)

    stream = await client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        max_tokens=settings.LLM_MAX_TOKENS,
        temperature=settings.LLM_TEMPERATURE,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content