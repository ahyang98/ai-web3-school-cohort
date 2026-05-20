from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from web3 import Web3
import os

from app.config import load_config, Settings
from app.models.schemas import (
    AgentRunRequest, AgentResponse, FaucetRequest,
    TxStatusRequest, ContractInfo,
)
from app.agent.core import AgentCore

app = FastAPI(title="Task3 Transfer Agent", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings: Settings = load_config()
agent = AgentCore(settings.agent)
w3 = Web3(Web3.HTTPProvider(settings.agent.rpc_url))


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "chain_connected": w3.is_connected(),
        "agent_mode": settings.agent.mode,
    }


@app.post("/api/agent/run", response_model=AgentResponse)
async def agent_run(req: AgentRunRequest):
    if not settings.agent.contract_address:
        raise HTTPException(400, "合约地址未配置，请先部署合约并更新 config.yaml")
    validate_address(req.user_address)
    return agent.run(req.prompt, req.user_address)


@app.post("/api/agent/mint")
async def agent_mint(req: FaucetRequest):
    validate_address(req.user_address)
    pk = os.getenv("DEPLOYER_PRIVATE_KEY")
    if not pk:
        raise HTTPException(500, "服务端未配置 DEPLOYER_PRIVATE_KEY")
    try:
        tx_hash = agent.tools.send_faucet(req.user_address, pk)
        return {"success": True, "tx_hash": tx_hash}
    except Exception as e:
        raise HTTPException(500, f"Faucet 失败: {e}")


@app.get("/api/config")
async def get_config():
    return {
        "mode": settings.agent.mode,
        "contract_address": settings.agent.contract_address,
        "chain_id": settings.agent.chain_id,
        "rpc_url": settings.agent.rpc_url,
    }


@app.get("/api/contract/info")
async def contract_info():
    if not settings.agent.contract_address or not w3.is_connected():
        raise HTTPException(503, "合约或 RPC 不可用")
    try:
        tools = agent.tools
        return ContractInfo(
            address=settings.agent.contract_address,
            symbol=tools.read_symbol(),
            name="Task3 Token",
            total_supply=str(tools.read_total_supply()),
            chain_id=settings.agent.chain_id,
        )
    except Exception as e:
        raise HTTPException(503, f"读取合约信息失败: {e}")


@app.post("/api/tx/status")
async def tx_status(req: TxStatusRequest):
    try:
        receipt = w3.eth.get_transaction_receipt(Web3.to_checksum_address(req.tx_hash))
        if receipt is None:
            return {"status": "pending", "tx_hash": req.tx_hash}
        return {
            "status": "confirmed" if receipt["status"] == 1 else "failed",
            "block_number": receipt["blockNumber"],
            "gas_used": receipt["gasUsed"],
            "tx_hash": req.tx_hash,
        }
    except Exception:
        return {"status": "pending", "tx_hash": req.tx_hash}


def validate_address(address: str):
    if not Web3.is_address(address):
        raise HTTPException(400, f"无效的地址格式: {address}")
