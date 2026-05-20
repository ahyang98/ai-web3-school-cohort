from pathlib import Path
from typing import Optional
import yaml
import os

from pydantic import BaseModel, Field


class HermesConfig(BaseModel):
    cli_path: str = "hermes"
    model: str = "deepseek-v4-flash"
    provider: str = "deepseek"
    timeout: int = 30


class AgentConfig(BaseModel):
    mode: str = "mock"
    llm_model: str = "gpt-4o-mini"
    hermes: HermesConfig = Field(default_factory=HermesConfig)
    rpc_url: str = "http://127.0.0.1:8545"
    chain_id: int = 31337
    contract_address: str = ""
    contract_abi: list = Field(default_factory=lambda: [
        {"constant": True, "inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
        {"constant": False, "inputs": [{"name": "to", "type": "address"}, {"name": "value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
        {"inputs": [], "name": "faucet", "outputs": [], "type": "function"},
        {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
        {"constant": True, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "type": "function"},
        {"constant": True, "inputs": [], "name": "totalSupply", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
    ])
    max_steps: int = 10


class Settings(BaseModel):
    agent: AgentConfig = Field(default_factory=AgentConfig)


def load_config(path: Optional[str] = None) -> Settings:
    config_path = path or os.getenv("CONFIG_PATH", "")
    if not config_path:
        config_path = str(Path(__file__).parent.parent / "config.yaml")
    if os.path.exists(config_path):
        with open(config_path) as f:
            data = yaml.safe_load(f)
        return Settings(**data)
    return Settings()
