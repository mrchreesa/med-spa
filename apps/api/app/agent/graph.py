"""LangGraph agent definition for Med Spa AI Concierge."""

from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.agent.nodes import (
    check_escalation_node,
    create_lead_node,
    escalate_node,
    generate_response_node,
    search_knowledge_node,
)


class ConciergeState(TypedDict):
    messages: list[dict]  # [{role: "user"|"assistant", content: str}]
    tenant_id: str
    spa_name: str
    lead_id: str | None
    conversation_id: str | None
    should_escalate: bool
    escalation_reason: str | None
    intent: str | None
    context: str
    response: str  # The generated response text


def _route_after_escalation_check(state: ConciergeState) -> str:
    """Route based on whether escalation was triggered."""
    if state.get("should_escalate"):
        return "escalate"
    return "create_lead"


def build_concierge_graph() -> StateGraph:
    """Build the concierge agent graph."""
    graph = StateGraph(ConciergeState)

    # Add nodes
    graph.add_node("search_knowledge", search_knowledge_node)
    graph.add_node("generate_response", generate_response_node)
    graph.add_node("check_escalation", check_escalation_node)
    graph.add_node("escalate", escalate_node)
    graph.add_node("create_lead", create_lead_node)

    # Define edges
    graph.set_entry_point("search_knowledge")
    graph.add_edge("search_knowledge", "generate_response")
    graph.add_edge("generate_response", "check_escalation")
    graph.add_conditional_edges(
        "check_escalation",
        _route_after_escalation_check,
        {"escalate": "escalate", "create_lead": "create_lead"},
    )
    graph.add_edge("escalate", END)
    graph.add_edge("create_lead", END)

    return graph.compile()
