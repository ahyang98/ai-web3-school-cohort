import re
from typing import Optional

from app.agent.tools import Web3Tools
from app.agent.llm import create_llm_client, LLMClient
from app.models.schemas import AgentResponse, TraceStep, TxPreview
from app.config import AgentConfig


SYSTEM_PROMPT_TEMPLATE = """你是一个 AI×Web3 Agent。你的任务是根据用户的指令，决定是否需要查询链上余额以及是否执行代币转账。

当前链上上下文：
- 合约: {symbol} ({name}) 地址 {contract_address}
- 链 ID: {chain_id}
- RPC: {rpc_url}

可用操作：
1. check_balance — 查询用户地址的 {symbol} 余额
2. transfer — 转账 {symbol} 给指定地址

输出格式要求：
THOUGHT: <你的推理过程>
DECISION: <check_balance | transfer | unclear | error>
TO: <接收地址 (仅 transfer 时需要)>
AMOUNT: <转账数量（小数，如 50） (仅 transfer 时需要)>
THRESHOLD: <条件阈值 (可选，如 "余额 > X 时才转账")>

请只输出上述格式，不要输出其他内容。"""


class AgentCore:
    """ReAct 工作循环 — Thought → Action → Observation → Done"""

    def __init__(self, config: AgentConfig):
        self.config = config
        self._tools: Optional[Web3Tools] = None
        self.llm: LLMClient = create_llm_client(config.mode, config.hermes)

    @property
    def tools(self) -> Web3Tools:
        if self._tools is None:
            self._tools = Web3Tools(self.config)
        return self._tools

    def run(self, prompt: str, user_address: str) -> AgentResponse:
        steps: list[TraceStep] = []
        tx_preview: Optional[TxPreview] = None

        # 构建系统上下文
        try:
            symbol = self.tools.read_symbol()
        except Exception:
            symbol = "T3T"

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            symbol=symbol,
            name="Task3 Token",
            contract_address=self.config.contract_address,
            chain_id=self.config.chain_id,
            rpc_url=self.config.rpc_url,
        )

        # Step 1: Thought — 分析意图
        steps.append(TraceStep(
            type="thought",
            content=f"正在分析指令: 「{prompt}」\n系统上下文: {self.config.contract_address} 上的 {symbol} 代币",
            details={"prompt": prompt},
        ))

        llm_output = self.llm.infer(system_prompt, prompt)

        steps.append(TraceStep(
            type="thought",
            content=f"LLM 推理完成:\n{llm_output}",
            details={"raw_llm_output": llm_output},
        ))

        # 解析 LLM 输出
        decision = self._parse_decision(llm_output)
        to_address = self._parse_field(llm_output, "TO")
        amount_str = self._parse_field(llm_output, "AMOUNT")

        if decision == "check_balance":
            return self._handle_balance_check(steps, user_address)

        elif decision == "transfer":
            if not to_address:
                return AgentResponse(
                    success=False,
                    trace=steps + [TraceStep(type="observation", content="❌ 无法解析接收地址")],
                    error="missing recipient address",
                )

            try:
                decimals = self.tools.read_decimals()
                amount_wei = int(float(amount_str) * (10 ** decimals)) if amount_str else 50 * 10 ** 18
            except (ValueError, TypeError, Exception):
                amount_wei = 50 * 10 ** 18

            return self._handle_transfer(steps, user_address, to_address, amount_wei, amount_str or "50", llm_output)

        else:
            steps.append(TraceStep(
                type="done",
                content="❌ 无法理解指令，请重新描述。例如：「看看我的 T3T 余额」或「转 50 T3T 给 0x...」",
            ))
            return AgentResponse(success=False, trace=steps, error="unclear intent")

    def _handle_balance_check(self, steps: list, user_address: str) -> AgentResponse:
        steps.append(TraceStep(
            type="action",
            content=f"调用 balanceOf(\"{user_address}\")",
            details={"tool": "balanceOf", "args": user_address},
        ))

        try:
            balance = self.tools.read_balance(user_address)
            decimals = self.tools.read_decimals()
            balance_human = balance / (10 ** decimals)

            steps.append(TraceStep(
                type="observation",
                content=f"余额: {balance_human} T3T (原始值: {balance} wei)",
                details={"balance_wei": str(balance), "balance_human": balance_human},
            ))

            steps.append(TraceStep(
                type="done",
                content=f"✅ 查询完成。地址 {user_address} 持有 {balance_human} T3T",
            ))
            return AgentResponse(success=True, trace=steps)

        except Exception as e:
            return AgentResponse(
                success=False,
                trace=steps + [TraceStep(type="observation", content=f"❌ RPC 调用失败: {e}")],
                error=str(e),
            )

    def _handle_transfer(
        self, steps: list, user_address: str, to_address: str,
        amount_wei: int, amount_str: str, llm_output: str
    ) -> AgentResponse:
        # Action: 读余额
        steps.append(TraceStep(
            type="action",
            content=f"检查余额: balanceOf(\"{user_address}\")",
            details={"tool": "balanceOf", "args": user_address},
        ))

        try:
            balance = self.tools.read_balance(user_address)
            decimals = self.tools.read_decimals()
            balance_human = balance / (10 ** decimals)

            steps.append(TraceStep(
                type="observation",
                content=f"余额: {balance_human} T3T",
                details={"balance_wei": str(balance)},
            ))

            # 阈值检查
            threshold_str = self._parse_field(llm_output, "THRESHOLD")
            if threshold_str:
                try:
                    threshold = float(threshold_str)
                    if balance_human < threshold:
                        steps.append(TraceStep(
                            type="done",
                            content=f"❌ 余额 {balance_human} T3T < 阈值 {threshold} T3T，不满足转账条件",
                        ))
                        return AgentResponse(success=True, trace=steps)
                except ValueError:
                    pass

            # 构造交易
            steps.append(TraceStep(
                type="action",
                content=f"构造 transfer 交易: 转 {amount_str} T3T → {to_address}",
                details={"tool": "encode_transfer", "to": to_address, "amount_wei": str(amount_wei)},
            ))

            calldata = self.tools.encode_transfer(to_address, amount_wei)

            try:
                gas_estimate = self.tools.estimate_gas(user_address, self.config.contract_address, calldata)
            except Exception:
                gas_estimate = None

            tx_preview = TxPreview(
                to=self.config.contract_address,
                data=calldata,
                value="0x0",
                to_address=to_address,
                amount=amount_str,
                estimated_gas=str(gas_estimate) if gas_estimate else None,
            )

            steps.append(TraceStep(
                type="done",
                content=(
                    f"✅ 交易已准备就绪。\n"
                    f"  发送: {amount_str} T3T → {to_address}\n"
                    f"  合约: {self.config.contract_address}\n"
                    f"  Gas 预估: {gas_estimate or '未知'}\n"
                    f"  请在下方确认后签名发送。"
                ),
                details={"tx_preview": tx_preview.model_dump()},
            ))

            return AgentResponse(success=True, trace=steps, tx_preview=tx_preview)

        except Exception as e:
            return AgentResponse(
                success=False,
                trace=steps + [TraceStep(type="observation", content=f"❌ 链上操作失败: {e}")],
                error=str(e),
            )

    def _parse_decision(self, output: str) -> str:
        m = re.search(r"DECISION:\s*(\S+)", output)
        if m:
            return m.group(1).lower().strip()
        return "unclear"

    def _parse_field(self, output: str, field: str) -> Optional[str]:
        m = re.search(rf"{field}:\s*(.+)", output)
        if m:
            return m.group(1).strip()
        return None
