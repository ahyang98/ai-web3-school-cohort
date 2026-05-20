import pytest
from app.agent.core import AgentCore
from app.models.schemas import TraceStep


class TestAgentCore:
    def test_mock_mode_balance_check_trace_structure(self, agent, sample_address):
        """balance check should produce valid trace with thought steps"""
        result = agent.run("看看我的 T3T 余额", sample_address)
        for step in result.trace:
            assert step.type in ("thought", "action", "observation", "done")
            assert isinstance(step.content, str)
            assert len(step.content) > 0

    def test_mock_mode_transfer_trace_structure(self, agent, sample_address):
        """transfer intent should produce valid trace"""
        result = agent.run(
            "转 50 T3T 给 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            sample_address,
        )
        for step in result.trace:
            assert step.type in ("thought", "action", "observation", "done")
            assert isinstance(step.content, str)

    def test_trace_begins_with_thought(self, agent, sample_address):
        """ReAct trace should always start with a thought step"""
        result = agent.run("查余额", sample_address)
        assert result.trace[0].type == "thought"

    def test_unclear_intent(self, agent, sample_address):
        """garbage input should not crash and be handled gracefully"""
        result = agent.run("!@#$%^", sample_address)
        assert result.trace[-1].type == "done"
