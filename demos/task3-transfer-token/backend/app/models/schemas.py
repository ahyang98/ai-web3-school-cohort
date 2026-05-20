from pydantic import BaseModel, Field
from typing import Optional


class TraceStep(BaseModel):
    type: str = Field(..., description="thought | action | observation | done")
    content: str = Field(..., description="步骤内容描述")
    details: Optional[dict] = None


class TxPreview(BaseModel):
    to: str = Field(..., description="目标合约地址")
    data: str = Field(..., description="编码后的 calldata (0x...)")
    value: str = Field(default="0x0", description="发送的 ETH 数量 (hex)")
    to_address: Optional[str] = Field(None, description="接收 T3T 的地址（human readable）")
    amount: Optional[str] = Field(None, description="T3T 数量（human readable）")
    estimated_gas: Optional[str] = Field(None, description="预估 Gas")


class AgentResponse(BaseModel):
    success: bool = True
    trace: list[TraceStep] = Field(default_factory=list)
    tx_preview: Optional[TxPreview] = None
    error: Optional[str] = None


class AgentRunRequest(BaseModel):
    prompt: str = Field(..., description="用户自然语言指令", min_length=1)
    user_address: str = Field(..., description="用户钱包地址 (0x...)")


class FaucetRequest(BaseModel):
    user_address: str = Field(..., description="接收 faucet 的地址")


class TxStatusRequest(BaseModel):
    tx_hash: str = Field(..., description="交易哈希")


class ContractInfo(BaseModel):
    address: str
    symbol: str
    name: str
    total_supply: str
    chain_id: int
