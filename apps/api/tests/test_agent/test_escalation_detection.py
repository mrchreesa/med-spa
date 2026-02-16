"""Tests for escalation detection logic (regex patterns + LLM classification)."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.agent.nodes import (
    _COMPLAINT_PATTERNS,
    _EMERGENCY_PATTERNS,
    _HUMAN_REQUEST_PATTERNS,
    _MEDICAL_ADVICE_PATTERNS,
    check_escalation_node,
)


# ---------------------------------------------------------------------------
# Regex pattern tests (Layer 1 — deterministic, no LLM)
# ---------------------------------------------------------------------------
class TestEmergencyPatterns:
    @pytest.mark.parametrize(
        "msg",
        [
            "I'm having an allergic reaction after the filler",
            "I can't breathe properly since the treatment",
            "experiencing severe swelling, should I call 911?",
            "I think I'm having a seizure",
            "there's severe bleeding from the injection site",
        ],
    )
    def test_matches_emergency(self, msg: str):
        assert _EMERGENCY_PATTERNS.search(msg) is not None

    @pytest.mark.parametrize(
        "msg",
        [
            "How much does Botox cost?",
            "I'd like to book an appointment",
            "What treatments do you offer?",
        ],
    )
    def test_no_false_positives(self, msg: str):
        assert _EMERGENCY_PATTERNS.search(msg) is None


class TestMedicalAdvicePatterns:
    @pytest.mark.parametrize(
        "msg",
        [
            "Is it safe to get Botox while pregnant?",
            "Should I get filler if I'm on blood thinners?",
            "What are the side effects of Dysport?",
            "Am I a good candidate for laser treatment?",
            "I have a lump after the injection",
            "My eyelid is drooping after Botox",
        ],
    )
    def test_matches_medical(self, msg: str):
        assert _MEDICAL_ADVICE_PATTERNS.search(msg) is not None


class TestHumanRequestPatterns:
    @pytest.mark.parametrize(
        "msg",
        [
            "Can I speak to a real person?",
            "I want to talk to someone on staff",
            "Please transfer me to a human",
            "Can I call you? What's your phone number?",
            "connect me with the doctor",
        ],
    )
    def test_matches_human_request(self, msg: str):
        assert _HUMAN_REQUEST_PATTERNS.search(msg) is not None


class TestComplaintPatterns:
    @pytest.mark.parametrize(
        "msg",
        [
            "I had a terrible experience at your spa",
            "This is the worst service, I'm never coming back",
            "I'm going to file a complaint",
            "Your staff botched my treatment",
            "I'm considering talking to a lawyer about this",
        ],
    )
    def test_matches_complaint(self, msg: str):
        assert _COMPLAINT_PATTERNS.search(msg) is not None


# ---------------------------------------------------------------------------
# check_escalation_node integration tests
# ---------------------------------------------------------------------------
class TestCheckEscalationNode:
    @pytest.mark.asyncio
    async def test_empty_messages_no_escalation(self):
        state = {"messages": []}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is False

    @pytest.mark.asyncio
    async def test_no_user_messages_no_escalation(self):
        state = {"messages": [{"role": "assistant", "content": "Hello!"}]}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is False

    @pytest.mark.asyncio
    async def test_emergency_triggers_escalation(self):
        state = {"messages": [{"role": "user", "content": "I'm having an allergic reaction!"}]}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is True
        assert result["escalation_reason"] == "emergency"

    @pytest.mark.asyncio
    async def test_complaint_triggers_escalation(self):
        state = {"messages": [{"role": "user", "content": "Terrible experience, talking to my lawyer"}]}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is True
        assert result["escalation_reason"] == "complaint"

    @pytest.mark.asyncio
    async def test_human_request_triggers_escalation(self):
        state = {"messages": [{"role": "user", "content": "Can I speak to a real person please?"}]}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is True
        assert result["escalation_reason"] == "patient_request"

    @pytest.mark.asyncio
    async def test_medical_question_triggers_escalation(self):
        state = {"messages": [{"role": "user", "content": "Is it safe to get Botox while pregnant?"}]}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is True
        assert result["escalation_reason"] == "medical_question"

    @pytest.mark.asyncio
    @patch("app.agent.nodes._get_llm")
    async def test_safe_message_no_escalation(self, mock_get_llm):
        mock_llm = AsyncMock()
        mock_response = MagicMock()
        mock_response.content = "SAFE"
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        mock_get_llm.return_value = mock_llm

        state = {"messages": [{"role": "user", "content": "How much does Botox cost per unit?"}]}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is False

    @pytest.mark.asyncio
    @patch("app.agent.nodes._get_llm")
    async def test_llm_classifies_medical(self, mock_get_llm):
        mock_llm = AsyncMock()
        mock_response = MagicMock()
        mock_response.content = "MEDICAL"
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        mock_get_llm.return_value = mock_llm

        state = {"messages": [{"role": "user", "content": "My face feels numb two weeks after the procedure"}]}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is True
        assert result["escalation_reason"] == "medical_question"

    @pytest.mark.asyncio
    @patch("app.agent.nodes._get_llm")
    async def test_llm_failure_defaults_safe(self, mock_get_llm):
        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(side_effect=Exception("LLM down"))
        mock_get_llm.return_value = mock_llm

        state = {"messages": [{"role": "user", "content": "Tell me about lip filler options"}]}
        result = await check_escalation_node(state)
        assert result["should_escalate"] is False
