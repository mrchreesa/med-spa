"""Tests for LangGraph agent graph structure and routing."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.agent.graph import ConciergeState, _route_after_escalation_check, build_concierge_graph


class TestGraphRouting:
    def test_route_escalation_when_flagged(self):
        state: ConciergeState = {
            "messages": [],
            "tenant_id": "t1",
            "spa_name": "Test Spa",
            "lead_id": None,
            "conversation_id": None,
            "should_escalate": True,
            "escalation_reason": "emergency",
            "intent": None,
            "context": "",
            "response": "",
        }
        assert _route_after_escalation_check(state) == "escalate"

    def test_route_create_lead_when_safe(self):
        state: ConciergeState = {
            "messages": [],
            "tenant_id": "t1",
            "spa_name": "Test Spa",
            "lead_id": None,
            "conversation_id": None,
            "should_escalate": False,
            "escalation_reason": None,
            "intent": None,
            "context": "",
            "response": "",
        }
        assert _route_after_escalation_check(state) == "create_lead"

    def test_graph_compiles(self):
        graph = build_concierge_graph()
        assert graph is not None

    @pytest.mark.asyncio
    @patch("app.agent.nodes._get_llm")
    @patch("app.agent.nodes.search_knowledge_node")
    async def test_graph_runs_with_mocks(self, mock_search, mock_get_llm):
        """Ensure the graph runs end-to-end with mocked nodes."""
        mock_search.return_value = {"context": "Botox costs $12/unit."}

        mock_llm = AsyncMock()
        mock_response = MagicMock()
        mock_response.content = "SAFE"
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        mock_get_llm.return_value = mock_llm

        # We need to also mock the response generation
        with patch("app.agent.nodes.generate_response_node") as mock_gen, \
             patch("app.agent.nodes.create_lead_node") as mock_lead:
            mock_gen.return_value = {"response": "Botox is $12/unit."}
            mock_lead.return_value = {}

            graph = build_concierge_graph()
            initial_state: ConciergeState = {
                "messages": [{"role": "user", "content": "How much is Botox?"}],
                "tenant_id": "test_tenant",
                "spa_name": "Test Med Spa",
                "lead_id": None,
                "conversation_id": "conv123",
                "should_escalate": False,
                "escalation_reason": None,
                "intent": None,
                "context": "",
                "response": "",
            }

            result = await graph.ainvoke(initial_state)
            assert "response" in result
