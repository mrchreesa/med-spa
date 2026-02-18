"""Instrumented LLM wrapper that captures timing, tokens, and cost."""

import logging
import time
from decimal import Decimal

from langchain_core.messages import BaseMessage

from app.services.metrics_collector import get_collector

logger = logging.getLogger(__name__)

# Per-million-token pricing (OpenAI, as of 2025)
MODEL_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
}


def _compute_cost(model: str, prompt_tokens: int, completion_tokens: int) -> Decimal:
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        return Decimal("0")
    input_cost = Decimal(str(pricing["input"])) * prompt_tokens / 1_000_000
    output_cost = Decimal(str(pricing["output"])) * completion_tokens / 1_000_000
    return input_cost + output_cost


async def instrumented_ainvoke(
    llm,
    messages: list[BaseMessage],
    node_name: str,
) -> BaseMessage:
    """Invoke LLM and record metrics to the current collector."""
    collector = get_collector()
    start = time.perf_counter()

    try:
        response = await llm.ainvoke(messages)
        latency_ms = int((time.perf_counter() - start) * 1000)

        # Extract token usage from OpenAI response metadata
        usage = getattr(response, "response_metadata", {}).get("token_usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", 0)

        model = getattr(llm, "model_name", "") or getattr(llm, "model", "unknown")
        cost = _compute_cost(model, prompt_tokens, completion_tokens)

        if collector:
            collector.record_llm_call(
                node_name=node_name,
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                cost_usd=cost,
                latency_ms=latency_ms,
                success=True,
            )

        return response

    except Exception as exc:
        latency_ms = int((time.perf_counter() - start) * 1000)
        model = getattr(llm, "model_name", "") or getattr(llm, "model", "unknown")

        if collector:
            collector.record_llm_call(
                node_name=node_name,
                model=model,
                latency_ms=latency_ms,
                success=False,
                error_type=type(exc).__name__,
                error_message=str(exc)[:500],
            )

        raise
