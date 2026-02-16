"""Quick test to debug the chat agent."""

import asyncio
import traceback

from app.agent.graph import build_concierge_graph


async def test():
    graph = build_concierge_graph()
    result = await graph.ainvoke({
        "messages": [{"role": "user", "content": "Hello"}],
        "tenant_id": "test-org-001",
        "spa_name": "Glow Med Spa",
        "lead_id": None,
        "conversation_id": None,
        "should_escalate": False,
        "escalation_reason": None,
        "intent": None,
        "context": "",
        "response": "",
    })
    print("Response:", result.get("response", "NO RESPONSE"))


if __name__ == "__main__":
    try:
        asyncio.run(test())
    except Exception:
        traceback.print_exc()
