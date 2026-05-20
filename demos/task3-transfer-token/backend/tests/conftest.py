import pytest
from app.config import AgentConfig
from app.agent.core import AgentCore


@pytest.fixture
def mock_config():
    return AgentConfig(
        mode="mock",
        rpc_url="http://127.0.0.1:8545",
        contract_address="0x0000000000000000000000000000000000000001",
    )


@pytest.fixture
def agent(mock_config):
    return AgentCore(mock_config)


@pytest.fixture
def sample_address():
    return "0x1234567890123456789012345678901234567890"
