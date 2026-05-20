import re
import subprocess
from abc import ABC, abstractmethod
from typing import Optional

from app.config import HermesConfig


class LLMClient(ABC):
    @abstractmethod
    def infer(self, system_prompt: str, user_prompt: str) -> str:
        ...


class MockLLM(LLMClient):
    def infer(self, system_prompt: str, user_prompt: str) -> str:
        prompt_lower = user_prompt.lower()
        address_pattern = r"0x[a-fA-F0-9]{40}"
        addresses = re.findall(address_pattern, user_prompt)
        amount_pattern = r"(\d+(?:\.\d+)?)"
        amounts = re.findall(amount_pattern, user_prompt)

        has_balance = any(w in prompt_lower for w in ["余额", "balance", "多少"])
        has_transfer = any(w in prompt_lower for w in ["转", "transfer", "发送", "send"])
        has_check = any(w in prompt_lower for w in ["看看", "查", "check", "view", "看"])

        target_address = addresses[0] if addresses else "0xRecipient..."
        amount = float(amounts[0]) if amounts else 50.0

        if has_check and not has_transfer:
            return """THOUGHT: 用户想查询余额
DECISION: check_balance"""

        if has_transfer:
            threshold = 0
            for i, word in enumerate(prompt_lower.split()):
                if word in ["大于", ">", "超过", "高于"] and i + 1 < len(prompt_lower.split()):
                    try:
                        threshold = float(re.findall(amount_pattern, prompt_lower.split()[i + 1])[0])
                    except (IndexError, ValueError):
                        threshold = 0
                    break

            return f"""THOUGHT: 用户想转账 {amount} T3T 给 {target_address}
THRESHOLD: {threshold}
TO: {target_address}
AMOUNT: {amount}
DECISION: transfer"""

        return """THOUGHT: 无法明确理解意图，请提供更详细的指令
DECISION: unclear"""


class HermesCLIClient(LLMClient):
    def __init__(self, config: HermesConfig):
        self.config = config

    def infer(self, system_prompt: str, user_prompt: str) -> str:
        full_prompt = f"{system_prompt}\n\n用户指令: {user_prompt}"
        cmd = [self.config.cli_path, "--model", self.config.model, "--provider", self.config.provider]
        try:
            result = subprocess.run(cmd, input=full_prompt, text=True, capture_output=True, timeout=self.config.timeout)
            if result.returncode != 0:
                return f"THOUGHT: Hermes CLI error: {result.stderr}\nDECISION: error"
            return result.stdout.strip()
        except FileNotFoundError:
            return "THOUGHT: Hermes CLI not found, falling back to mock\nDECISION: fallback_mock"
        except subprocess.TimeoutExpired:
            return "THOUGHT: Hermes CLI timed out\nDECISION: error"
        except Exception as e:
            return f"THOUGHT: Hermes invocation failed: {e}\nDECISION: error"


def create_llm_client(mode: str, hermes_config: Optional[HermesConfig] = None) -> LLMClient:
    if mode == "hermes":
        if hermes_config is None:
            raise ValueError("hermes config required for hermes mode")
        return HermesCLIClient(hermes_config)
    return MockLLM()
