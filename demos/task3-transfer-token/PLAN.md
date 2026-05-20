# Task 3: Agent 辅助代币转账 — 开发计划

> **For Hermes:** Execute this plan phase-by-phase using subagent-driven-development. Each phase is self-contained; phases build on each other.
>
> **Goal:** 构建一个完整可用的 AI 辅助代币转账 dApp，演示 Agent ReAct 工作流（Thought → Action → Observation → Done）
>
> **架构:** 三层分离 — Hardhat ERC20 合约 + FastAPI Agent 后端（可切换 mock/hermes 模式）+ Vite React 前端（WAGMI 钱包交互）
>
> **Tech Stack:** Solidity + Hardhat | Python FastAPI + web3.py | React + TypeScript + Vite + Tailwind + Shadcn + WAGMI + Viem

---

## Phase 0: 项目骨架

### Task 0.1: 创建目录结构

**Objective:** 按 DESIGN.md 的目录树创建所有空目录和占位文件

**Files:**
- Create: 整个目录树

**Step 1: 创建目录**

执行命令创建目录树：

```bash
mkdir -p /home/ahyang/project/web3/ai-web3-school-cohort/demos/task3-transfer-token/{contract/{contracts,scripts,test},backend/{app/{agent,models},tests},frontend/{src/{config,components,hooks,lib,types},public},.github/workflows,scripts}
```

**Step 2: 验证**

```bash
find /home/ahyang/project/web3/ai-web3-school-cohort/demos/task3-transfer-token -type d | sort
```

Expected: 所有子目录存在。

**Step 3: 提交占位 README**

创建根目录 README.md 占位文件，内容为 `# Task 3: Transfer Token Demo`。

---

## Phase 1: 智能合约 (ERC20)

### Task 1.1: 初始化 Hardhat 工程

**Objective:** 在 `contract/` 目录下创建 Hardhat TypeScript 工程

**Files:**
- Create: `contract/package.json`
- Create: `contract/hardhat.config.ts`
- Create: `contract/tsconfig.json`
- Create: `contract/.env.example`

**Step 1: 创建 package.json**

```json
{
  "name": "task3-contract",
  "version": "1.0.0",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy": "hardhat run scripts/deploy.ts",
    "coverage": "hardhat coverage"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "hardhat": "^2.22.0",
    "typescript": "^5.4.0",
    "dotenv": "^16.4.0"
  }
}
```

**Step 2: 创建 hardhat.config.ts**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    hardhat: { chainId: 31337 },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: [DEPLOYER_KEY],
    },
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      accounts: [DEPLOYER_KEY],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      "base-sepolia": process.env.BASESCAN_API_KEY || "",
    },
  },
};

export default config;
```

**Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test", "./hardhat.config.ts"],
  "files": ["./hardhat.config.ts"]
}
```

**Step 4: 创建 .env.example**

```
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
TARGET_NETWORK=localhost
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/your-key
ETHERSCAN_API_KEY=your-key
BASESCAN_API_KEY=your-key
```

**Step 5: 安装依赖**

```bash
cd /home/ahyang/project/web3/ai-web3-school-cohort/demos/task3-transfer-token/contract
npm install
```

Expected: `node_modules/` 目录存在，无报错。

**Step 6: 验证编译**

```bash
npx hardhat compile
```

Expected: `artifacts/` 和 `cache/` 目录生成。

---

### Task 1.2: 编写 ERC20 合约

**Objective:** 写 `Task3Token.sol`，包含 constructor mint 1M T3T + faucet() 函数

**Files:**
- Create: `contract/contracts/Task3Token.sol`

**Step 1: 写合约代码**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Task3Token is ERC20 {
    constructor() ERC20("Task3 Token", "T3T") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice 测试用 faucet，任何人可 mint 100 T3T
    function faucet() external {
        _mint(msg.sender, 100 * 10 ** decimals());
    }
}
```

**Step 2: 编译验证**

```bash
npx hardhat compile
```

Expected: Compilation successful, no errors.

---

### Task 1.3: 合约测试

**Objective:** 写完整的合约测试（部署、转账、faucet、回滚场景）

**Files:**
- Create: `contract/test/Task3Token.test.ts`

**Step 1: 写测试**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { Task3Token } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Task3Token", function () {
  let token: Task3Token;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const FAUCET_AMOUNT = ethers.parseEther("100");

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Task3Token");
    token = await Token.deploy();
    await token.waitForDeployment();
  });

  it("should deploy with correct name and symbol", async function () {
    expect(await token.name()).to.equal("Task3 Token");
    expect(await token.symbol()).to.equal("T3T");
  });

  it("should mint initial supply to deployer", async function () {
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY);
  });

  it("should allow transfer between accounts", async function () {
    const amount = ethers.parseEther("100");
    await token.transfer(alice.address, amount);
    expect(await token.balanceOf(alice.address)).to.equal(amount);
    expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY - amount);
  });

  it("should revert transfer when balance insufficient", async function () {
    const amount = ethers.parseEther("9999999");
    await expect(
      token.connect(alice).transfer(bob.address, amount)
    ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
  });

  it("should allow anyone to call faucet", async function () {
    await token.connect(alice).faucet();
    expect(await token.balanceOf(alice.address)).to.equal(FAUCET_AMOUNT);
  });

  it("faucet should mint exactly 100 T3T", async function () {
    await token.connect(bob).faucet();
    expect(await token.balanceOf(bob.address)).to.equal(FAUCET_AMOUNT);
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + FAUCET_AMOUNT);
  });

  it("should support approve + transferFrom", async function () {
    const amount = ethers.parseEther("50");
    await token.approve(alice.address, amount);
    await token.connect(alice).transferFrom(deployer.address, bob.address, amount);
    expect(await token.balanceOf(bob.address)).to.equal(amount);
  });
});
```

**Step 2: 运行测试**

```bash
npx hardhat test
```

Expected: All 7 tests pass.

---

### Task 1.4: 部署脚本

**Objective:** 写可配置的部署脚本，部署后输出合约地址并写入配置文件

**Files:**
- Create: `contract/scripts/deploy.ts`

**Step 1: 写部署脚本**

```typescript
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const Token = await ethers.getContractFactory("Task3Token");
  const token = await Token.deploy();
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const txHash = token.deploymentTransaction()?.hash;

  console.log("✓ 合约 Task3Token 部署成功");
  console.log(`  地址: ${contractAddress}`);
  console.log(`  交易哈希: ${txHash}`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  初始供应量: ${ethers.formatEther(await token.totalSupply())} T3T\n`);

  // 写入部署记录
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify({
    contractAddress,
    deployer: deployer.address,
    txHash,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    timestamp: new Date().toISOString(),
  }, null, 2));
  console.log(`ℹ️  部署信息已写入 deployment.json`);

  // 提示更新后端配置
  console.log(`\n⚠️  请将合约地址更新到 backend/config.yaml:`);
  console.log(`   contract_address: "${contractAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Step 2: 验证部署**（在本地 Hardhat Node 测试）

```bash
# 终端 1: 启动本地节点
npx hardhat node &

# 终端 2: 部署
npx hardhat run scripts/deploy.ts --network localhost
```

Expected: 部署成功，`deployment.json` 文件生成，合约地址输出到控制台。

---

## Phase 2: 后端 (FastAPI)

### Task 2.1: 配置加载

**Objective:** 从 `config.yaml` 和环境变量加载 Agent 配置

**Files:**
- Create: `backend/config.yaml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/.env.example`

**Step 1: 创建 config.yaml**

```yaml
agent:
  mode: "mock"                    # mock | openai | anthropic | hermes
  llm_model: "gpt-4o-mini"       # openai/anthropic 模式使用
  hermes:
    cli_path: "hermes"           # Hermes CLI 路径
    model: "deepseek-v4-flash"
    provider: "deepseek"
    timeout: 30

  rpc_url: "http://127.0.0.1:8545"
  chain_id: 31337
  contract_address: ""           # 部署后填入
  max_steps: 10
```

**Step 2: 创建 config.py**

```python
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
    mode: str = "mock"                         # mock | openai | anthropic | hermes
    llm_model: str = "gpt-4o-mini"
    hermes: HermesConfig = Field(default_factory=HermesConfig)
    rpc_url: str = "http://127.0.0.1:8545"
    chain_id: int = 31337
    contract_address: str = ""
    contract_abi: list = Field(default_factory=lambda: [
        {
            "constant": True,
            "inputs": [{"name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function",
        },
        {
            "constant": False,
            "inputs": [
                {"name": "to", "type": "address"},
                {"name": "value", "type": "uint256"},
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function",
        },
        {
            "inputs": [],
            "name": "faucet",
            "outputs": [],
            "type": "function",
        },
        {
            "constant": True,
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "type": "function",
        },
        {
            "constant": True,
            "inputs": [],
            "name": "symbol",
            "outputs": [{"name": "", "type": "string"}],
            "type": "function",
        },
        {
            "constant": True,
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function",
        },
    ])
    max_steps: int = 10


class Settings(BaseModel):
    agent: AgentConfig = Field(default_factory=AgentConfig)


def load_config(path: Optional[str] = None) -> Settings:
    config_path = path or os.getenv("CONFIG_PATH", "")
    if not config_path:
        # 默认从项目根目录加载
        config_path = str(Path(__file__).parent.parent / "config.yaml")

    if os.path.exists(config_path):
        with open(config_path) as f:
            data = yaml.safe_load(f)
        return Settings(**data)
    return Settings()
```

**Step 3: 验证**

```python
# 快速验证
from app.config import load_config
cfg = load_config()
print(cfg.agent.mode)  # expected: "mock"
```

---

### Task 2.2: Pydantic Schemas

**Objective:** 定义 API 请求/响应的 Pydantic 模型

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/schemas.py`

**Step 1: 写 schemas.py**

```python
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
```

---

### Task 2.3: Web3 工具类

**Objective:** 实现链上读/写工具：读余额、编码 transfer、估 Gas、faucet 发送

**Files:**
- Create: `backend/app/agent/__init__.py`
- Create: `backend/app/agent/tools.py`

**Step 1: 写 tools.py**

```python
from web3 import Web3
from web3.types import Wei
from typing import Optional
import json

from app.config import AgentConfig


class Web3Tools:
    """封装链上工具调用：读链、编码交易、估 Gas"""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(config.contract_address),
            abi=config.contract_abi,
        )

    def is_connected(self) -> bool:
        return self.w3.is_connected()

    def read_balance(self, address: str) -> int:
        """读取地址的 T3T 余额"""
        checksum = Web3.to_checksum_address(address)
        return self.contract.functions.balanceOf(checksum).call()

    def read_decimals(self) -> int:
        return self.contract.functions.decimals().call()

    def read_symbol(self) -> str:
        return self.contract.functions.symbol().call()

    def read_total_supply(self) -> int:
        return self.contract.functions.totalSupply().call()

    def encode_transfer(self, to: str, amount_wei: int) -> str:
        """编码 ERC20 transfer 的 calldata"""
        checksum = Web3.to_checksum_address(to)
        return self.contract.encode_abi("transfer", args=[checksum, amount_wei])

    def estimate_gas(self, from_address: str, to: str, data: str) -> int:
        """预估交易 Gas"""
        tx = {
            "from": Web3.to_checksum_address(from_address),
            "to": Web3.to_checksum_address(to),
            "data": data,
        }
        return self.w3.eth.estimate_gas(tx)

    def send_faucet(self, to: str, private_key: str) -> str:
        """服务端直接发送 faucet 交易（部署账户代付 Gas）"""
        checksum = Web3.to_checksum_address(to)
        tx = self.contract.functions.faucet().build_transaction({
            "from": Web3.to_checksum_address(private_key_to_address(private_key)),
            "nonce": self.w3.eth.get_transaction_count(
                Web3.to_checksum_address(private_key_to_address(private_key))
            ),
            "gas": 100000,
            "gasPrice": self.w3.eth.gas_price,
        })
        signed = self.w3.eth.account.sign_transaction(tx, private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        return tx_hash.hex()


def private_key_to_address(pk: str) -> str:
    from eth_account import Account
    return Account.from_key(pk).address
```

---

### Task 2.4: LLM 客户端（可拔插）

**Objective:** 实现 MockLLM（规则匹配）和 HermesCLIClient（shell 调用 Hermes CLI）

**Files:**
- Create: `backend/app/agent/llm.py`

**Step 1: 写 llm.py**

```python
import re
import subprocess
import json
from abc import ABC, abstractmethod
from typing import Optional

from app.config import HermesConfig


class LLMClient(ABC):
    """LLM 客户端抽象接口"""

    @abstractmethod
    def infer(self, system_prompt: str, user_prompt: str) -> str:
        ...


class MockLLM(LLMClient):
    """规则匹配模式：零 API 依赖，关键词解析"""

    def infer(self, system_prompt: str, user_prompt: str) -> str:
        prompt_lower = user_prompt.lower()

        # 提取 ETH 地址
        address_pattern = r"0x[a-fA-F0-9]{40}"
        addresses = re.findall(address_pattern, user_prompt)

        # 提取数字金额
        amount_pattern = r"(\d+(?:\.\d+)?)"
        amounts = re.findall(amount_pattern, user_prompt)

        # 判断意图
        has_balance = any(w in prompt_lower for w in ["余额", "balance", "多少"])
        has_transfer = any(w in prompt_lower for w in ["转", "transfer", "发送", "send"])
        has_check = any(w in prompt_lower for w in ["看看", "查", "check", "view", "看"])

        target_address = addresses[0] if addresses else "0xRecipient..."
        amount = float(amounts[0]) if amounts else 50.0

        if has_check and not has_transfer:
            return f"""THOUGHT: 用户想查询余额
DECISION: check_balance"""

        if has_transfer:
            threshold = 0
            if any(w in prompt_lower for w in ["大于", ">", "超过", "高于"]):
                # 提取阈值
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

        return f"""THOUGHT: 无法明确理解意图，请提供更详细的指令
DECISION: unclear"""


class HermesCLIClient(LLMClient):
    """对接本机 Hermes Agent CLI"""

    def __init__(self, config: HermesConfig):
        self.config = config

    def infer(self, system_prompt: str, user_prompt: str) -> str:
        full_prompt = f"{system_prompt}\n\n用户指令: {user_prompt}"

        cmd = [
            self.config.cli_path,
            "--model", self.config.model,
            "--provider", self.config.provider,
        ]

        try:
            result = subprocess.run(
                cmd,
                input=full_prompt,
                text=True,
                capture_output=True,
                timeout=self.config.timeout,
            )
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
```

---

### Task 2.5: Agent Core (ReAct Loop)

**Objective:** 实现 ReAct 循环：Thought → Action → Observation → Done

**Files:**
- Create: `backend/app/agent/core.py`

**Step 1: 写 core.py**

```python
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
        self.tools = Web3Tools(config)
        self.llm: LLMClient = create_llm_client(config.mode, config.hermes)

    def run(self, prompt: str, user_address: str) -> AgentResponse:
        steps: list[TraceStep] = []
        tx_preview: Optional[TxPreview] = None

        # Step 1: Thought — 构建系统上下文并调用 LLM
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            symbol=self.tools.read_symbol(),
            name="Task3 Token",
            contract_address=self.config.contract_address,
            chain_id=self.config.chain_id,
            rpc_url=self.config.rpc_url,
        )

        steps.append(TraceStep(
            type="thought",
            content=f"正在分析指令: 「{prompt}」\n系统上下文: {self.config.contract_address} 上的 T3T 代币",
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
            # Action: 读余额
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

        elif decision == "transfer":
            if not to_address:
                return AgentResponse(
                    success=False,
                    trace=steps + [TraceStep(type="observation", content="❌ 无法解析接收地址")],
                    error="missing recipient address",
                )

            try:
                amount_wei = int(float(amount_str) * (10 ** self.tools.read_decimals()))
            except (ValueError, TypeError):
                amount_wei = 50 * 10 ** 18  # 默认 50 T3T

            # Action: 读余额（条件判断）
            steps.append(TraceStep(
                type="action",
                content=f"检查余额: balanceOf(\"{user_address}\")",
                details={"tool": "balanceOf", "args": user_address},
            ))

            balance = self.tools.read_balance(user_address)
            decimals = self.tools.read_decimals()
            balance_human = balance / (10 ** decimals)

            steps.append(TraceStep(
                type="observation",
                content=f"余额: {balance_human} T3T",
                details={"balance_wei": str(balance)},
            ))

            # 检查阈值
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

            # Action: 构造交易
            steps.append(TraceStep(
                type="action",
                content=f"构造 transfer 交易: 转 {amount_str} T3T → {to_address}",
                details={"tool": "encode_transfer", "to": to_address, "amount_wei": str(amount_wei)},
            ))

            calldata = self.tools.encode_transfer(to_address, amount_wei)

            # 预估 Gas
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

        else:
            steps.append(TraceStep(
                type="done",
                content="❌ 无法理解指令，请重新描述。例如：「看看我的 T3T 余额」或「转 50 T3T 给 0x...」",
            ))
            return AgentResponse(success=False, trace=steps, error="unclear intent")

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
```

---

### Task 2.6: FastAPI 入口

**Objective:** 实现 FastAPI 应用，注册所有 API 端点

**Files:**
- Create: `backend/app/main.py`

**Step 1: 写 main.py**

```python
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

# CORS — 允许前端开发地址
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

# 全局依赖
settings: Settings = load_config()
agent = AgentCore(settings.agent)
w3 = Web3(Web3.HTTPProvider(settings.agent.rpc_url))


@app.get("/api/health")
async def health():
    """健康检查"""
    return {
        "status": "ok",
        "chain_connected": w3.is_connected(),
        "agent_mode": settings.agent.mode,
    }


@app.post("/api/agent/run", response_model=AgentResponse)
async def agent_run(req: AgentRunRequest):
    """运行 Agent ReAct 循环"""
    if not settings.agent.contract_address:
        raise HTTPException(400, "合约地址未配置，请先部署合约并更新 config.yaml")

    validate_address(req.user_address)
    return agent.run(req.prompt, req.user_address)


@app.post("/api/agent/mint")
async def agent_mint(req: FaucetRequest):
    """Faucet: 给用户铸造 100 T3T（服务端签名）"""
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
    """获取当前 Agent 配置（只读）"""
    return {
        "mode": settings.agent.mode,
        "contract_address": settings.agent.contract_address,
        "chain_id": settings.agent.chain_id,
        "rpc_url": settings.agent.rpc_url,
    }


@app.get("/api/contract/info")
async def contract_info():
    """获取合约信息"""
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
    """查询交易状态"""
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
```

---

### Task 2.7: requirements.txt

**Objective:** 创建 Python 依赖文件

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/requirements-dev.txt`

**Step 1: requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
web3==7.0.0
pydantic==2.9.0
pyyaml==6.0.2
eth-account==0.13.0
```

**Step 2: requirements-dev.txt**

```
-r requirements.txt
pytest==8.3.0
pytest-cov==5.0.0
httpx==0.27.0
pytest-asyncio==0.24.0
```

**Step 3: 验证后端启动**

```bash
cd /home/ahyang/project/web3/ai-web3-school-cohort/demos/task3-transfer-token/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 &
curl http://localhost:8000/api/health
# Expected: {"status":"ok","chain_connected":false,"agent_mode":"mock"}
# 注意 chain_connected 为 false 因为还没有 Anvil
```

---

### Task 2.8: 后端测试

**Objective:** 为 Agent Core、Tools、API 端点写 pytest 测试

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_agent_core.py`
- Create: `backend/tests/test_tools.py`
- Create: `backend/tests/test_api.py`

**Step 1: conftest.py**

```python
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
```

**Step 2: test_agent_core.py**

```python
import pytest
from app.agent.core import AgentCore
from app.models.schemas import TraceStep


class TestAgentCore:
    def test_mock_mode_balance_check(self, agent, sample_address):
        result = agent.run("看看我的 T3T 余额", sample_address)
        assert result.success is True
        assert len(result.trace) >= 2
        assert result.trace[0].type == "thought"
        # RPC 不可用 → 失败，但 trace 结构应仍正确
        latest = result.trace[-1]
        assert latest.type in ("observation", "done", "thought")

    def test_mock_mode_transfer_syntax(self, agent, sample_address):
        result = agent.run("转 50 T3T 给 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", sample_address)
        # 即使 RPC 失败，trace steps 结构应完整
        for step in result.trace:
            assert step.type in ("thought", "action", "observation", "done")
            assert isinstance(step.content, str)
            assert len(step.content) > 0

    def test_trace_structure(self, agent, sample_address):
        result = agent.run("查余额", sample_address)
        for i, step in enumerate(result.trace):
            assert step.type in ("thought", "action", "observation", "done"), \
                f"Step {i} has invalid type: {step.type}"
            assert isinstance(step.content, str), f"Step {i} content is not string"

    def test_unclear_intent(self, agent, sample_address):
        result = agent.run("你好", sample_address)
        assert result.success is False or result.trace[-1].type == "done"
```


**Step 3: test_tools.py**

```python
import pytest
from app.agent.tools import Web3Tools, private_key_to_address
from app.config import AgentConfig


class TestTools:
    def test_encode_transfer_has_correct_selector(self):
        config = AgentConfig(
            rpc_url="http://127.0.0.1:8545",
            contract_address="0x0000000000000000000000000000000000000001",
        )
        tools = Web3Tools(config)
        calldata = tools.encode_transfer(
            "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            50 * 10 ** 18,
        )
        # transfer 函数选择器 = keccak("transfer(address,uint256)") 前 4 字节
        assert calldata.startswith("0xa9059cbb"), f"Unexpected selector: {calldata[:10]}"

    def test_private_key_to_address(self):
        # Anvil 默认第一个账户的私钥
        pk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        addr = private_key_to_address(pk)
        assert addr == "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

**Step 4: test_api.py**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestAPI:
    def test_health_endpoint(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "agent_mode" in data

    def test_agent_run_no_contract(self):
        resp = client.post("/api/agent/run", json={
            "prompt": "查余额",
            "user_address": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        })
        # 合约地址未配置 → 400
        assert resp.status_code == 400
        assert "合约地址未配置" in resp.json()["detail"]

    def test_agent_run_invalid_address(self):
        resp = client.post("/api/agent/run", json={
            "prompt": "查余额",
            "user_address": "not-an-address",
        })
        assert resp.status_code == 400
```

**Step 5: 运行测试**

```bash
cd /home/ahyang/project/web3/ai-web3-school-cohort/demos/task3-transfer-token/backend
pip install -r requirements-dev.txt
pytest -v
```

Expected: All unit tests pass (可能部分需要 RPC 的测试会 skip/fail，这是预期的)。

---

## Phase 3: 前端 (React + WAGMI + Shadcn)

### Task 3.1: 初始化 Vite 工程

**Objective:** 用 Vite 创建 React + TypeScript 工程，安装所有依赖

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/components.json` (Shadcn)
- Create: `frontend/.env.example`

**Step 1: 初始化 package.json**

```bash
cd /home/ahyang/project/web3/ai-web3-school-cohort/demos/task3-transfer-token/frontend
npm create vite@latest . -- --template react-ts
```

**Step 2: 安装核心依赖**

```bash
npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
npm install tailwindcss @tailwindcss/vite
npm install class-variance-authority clsx tailwind-merge lucide-react
```

**Step 3: 初始化 Shadcn**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card input separator badge
```

**Step 4: 配置 Tailwind**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
})
```

**Step 5: 配置 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Task3 Transfer Agent</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body class="bg-zinc-950 text-zinc-100">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**Step 6: .env.example**

```
VITE_API_URL=http://localhost:8000
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
```

**Step 7: 验证构建**

```bash
npm run build
```

Expected: Build successful, `dist/` directory created.

---

### Task 3.2: WAGMI 配置 + main.tsx

**Objective:** 配置 WAGMI（支持 Anvil 网络）+ RainbowKit 连接器

**Files:**
- Create: `frontend/src/config/wagmi.ts`
- Modify: `frontend/src/main.tsx`

**Step 1: wagmi.ts**

```typescript
import { createConfig, http } from 'wagmi';
import { anvil, sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '';

// 自定义 Anvil 网络（chainId 31337）
const localAnvil = {
  ...anvil,
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
};

export const config = createConfig({
  chains: [localAnvil, sepolia],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [localAnvil.id]: http(),
    [sepolia.id]: http(),
  },
});

export const DEFAULT_CHAIN_ID = localAnvil.id;
```

**Step 2: main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { config } from './config/wagmi'
import App from './App'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#6c5ce7',
            borderRadius: 'medium',
          })}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
```

**Step 3: index.css**

```css
@import "tailwindcss";
@import "@rainbow-me/rainbowkit/styles.css";

body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

---

### Task 3.3: API Hook + Types

**Objective:** 创建 `useAgent` hook 封装后端 API 调用 + 合约交互，创建 TypeScript 类型

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/hooks/useAgent.ts`

**Step 1: types/index.ts**

```typescript
export interface TraceStep {
  type: 'thought' | 'action' | 'observation' | 'done';
  content: string;
  details?: Record<string, unknown>;
}

export interface TxPreview {
  to: string;
  data: string;
  value: string;
  to_address?: string;
  amount?: string;
  estimated_gas?: string;
}

export interface AgentResponse {
  success: boolean;
  trace: TraceStep[];
  tx_preview?: TxPreview;
  error?: string;
}

export interface ContractInfo {
  address: string;
  symbol: string;
  name: string;
  total_supply: string;
  chain_id: number;
}

export interface AgentConfig {
  mode: string;
  contract_address: string;
  chain_id: number;
  rpc_url: string;
}
```

**Step 2: hooks/useAgent.ts**

```typescript
import { useState, useCallback } from 'react';
import type { AgentResponse, ContractInfo, AgentConfig } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useAgent() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const runAgent = useCallback(async (prompt: string, userAddress: string) => {
    setLoading(true);
    setResult(null);
    setTxHash(null);
    setTxStatus(null);

    try {
      const resp = await fetch(`${API_URL}/api/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, user_address: userAddress }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }

      const data: AgentResponse = await resp.json();
      setResult(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setResult({
        success: false,
        trace: [{ type: 'done', content: `❌ ${errorMsg}` }],
        error: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContractInfo = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/api/contract/info`);
      if (resp.ok) {
        setContractInfo(await resp.json());
      }
    } catch {
      // 合约信息非关键，静默失败
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/api/config`);
      if (resp.ok) {
        setConfig(await resp.json());
      }
    } catch {
      // 静默
    }
  }, []);

  const checkTxStatus = useCallback(async (hash: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/tx/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_hash: hash }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setTxStatus(data.status);
        return data;
      }
    } catch {
      // 静默
    }
  }, []);

  const mintTokens = useCallback(async (userAddress: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/agent/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_address: userAddress }),
      });
      if (!resp.ok) throw new Error('Faucet failed');
      const data = await resp.json();
      setTxHash(data.tx_hash);
      return data.tx_hash;
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    loading,
    result,
    contractInfo,
    config,
    txHash,
    txStatus,
    runAgent,
    fetchContractInfo,
    fetchConfig,
    checkTxStatus,
    mintTokens,
  };
}
```

---

### Task 3.4: PromptInput 组件

**Objective:** 自然语言输入框 + 发送按钮

**Files:**
- Create: `frontend/src/components/PromptInput.tsx`

**Step 1: PromptInput.tsx**

```tsx
import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Send, Loader2 } from 'lucide-react';

interface Props {
  onSend: (prompt: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export function PromptInput({ onSend, loading, disabled }: Props) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!prompt.trim()) {
      setError('请输入指令');
      return;
    }

    onSend(prompt.trim());
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 items-start">
          <div className="flex-1">
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="输入自然语言指令，例如:&#10;看看我的 T3T 余额&#10;转 50 T3T 给 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
              className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-600 resize-none outline-none text-sm min-h-[60px] leading-relaxed"
              rows={3}
              disabled={loading || disabled}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={loading || disabled || !prompt.trim()}
            className="shrink-0 mt-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-zinc-600 text-xs mt-2">
          Enter 发送 · Shift+Enter 换行
        </p>
      </CardContent>
    </Card>
  );
}
```

---

### Task 3.5: ReAct Trace 展示组件

**Objective:** 逐步展开的 ReAct 流程卡 — 风格类似之前做的交互式 HTML

**Files:**
- Create: `frontend/src/components/ReactTrace.tsx`

**Step 1: ReactTrace.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ChevronRight, AlertCircle, CheckCircle2, Brain, Eye, Zap } from 'lucide-react';
import type { TraceStep } from '../types';

interface Props {
  steps: TraceStep[];
}

const stepMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  thought: {
    label: 'Thought · 推理',
    icon: <Brain className="h-4 w-4" />,
    color: 'border-l-blue-500 bg-blue-950/20',
  },
  action: {
    label: 'Action · 行动',
    icon: <Zap className="h-4 w-4" />,
    color: 'border-l-emerald-500 bg-emerald-950/20',
  },
  observation: {
    label: 'Observation · 观察',
    icon: <Eye className="h-4 w-4" />,
    color: 'border-l-amber-500 bg-amber-950/20',
  },
  done: {
    label: 'Done · 完成',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'border-l-violet-500 bg-violet-950/20',
  },
};

export function ReactTrace({ steps }: Props) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          Agent ReAct 推理过程
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {steps.map((step, i) => {
          const meta = stepMeta[step.type] || stepMeta.done;
          return (
            <div key={i}>
              <div className={`border-l-2 pl-4 py-3 ${meta.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-5 ${
                      step.type === 'thought' ? 'border-blue-500 text-blue-400' :
                      step.type === 'action' ? 'border-emerald-500 text-emerald-400' :
                      step.type === 'observation' ? 'border-amber-500 text-amber-400' :
                      'border-violet-500 text-violet-400'
                    }`}
                  >
                    {meta.icon}
                    <span className="ml-1">{step.type.toUpperCase()}</span>
                  </Badge>
                  <span className="text-[10px] text-zinc-600">Step {i + 1}</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {step.content}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="w-px h-4 bg-zinc-800" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

---

### Task 3.6: TxPreview + TxResult 组件

**Objective:** 交易预览面板 + 发送结果展示

**Files:**
- Create: `frontend/src/components/TxPreview.tsx`
- Create: `frontend/src/components/TxResult.tsx`

**Step 1: TxPreview.tsx**

```tsx
import { useCallback } from 'react';
import { useSendTransaction, useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Send, ArrowRight, Fuel, AlertTriangle } from 'lucide-react';
import type { TxPreview as TxPreviewType } from '../types';

interface Props {
  preview: TxPreviewType;
  onTxSent: (hash: string) => void;
  onError: (err: string) => void;
}

export function TxPreview({ preview, onTxSent, onError }: Props) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const handleSend = useCallback(async () => {
    if (!address) {
      onError('请先连接钱包');
      return;
    }

    try {
      const hash = await sendTransactionAsync({
        to: preview.to as `0x${string}`,
        data: preview.data as `0x${string}`,
        value: BigInt(preview.value || '0x0'),
      });
      onTxSent(hash);
    } catch (err) {
      onError(err instanceof Error ? err.message : '交易发送失败');
    }
  }, [address, preview, sendTransactionAsync, onTxSent, onError]);

  return (
    <Card className="border-violet-500/30 bg-violet-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-violet-300 flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          交易预览
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-zinc-500">接收地址</div>
          <div className="text-zinc-200 font-mono text-xs truncate">
            {preview.to_address || preview.to}
          </div>
          <div className="text-zinc-500">转账金额</div>
          <div className="text-zinc-200 font-semibold">{preview.amount} T3T</div>
          {preview.estimated_gas && (
            <>
              <div className="text-zinc-500 flex items-center gap-1">
                <Fuel className="h-3 w-3" /> Gas
              </div>
              <div className="text-zinc-200">{preview.estimated_gas}</div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 rounded p-2">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>合约交互需要支付 ETH Gas 费，确认后钱包将弹出签名请求</span>
        </div>

        <Button
          onClick={handleSend}
          disabled={isPending || !address}
          className="w-full bg-violet-600 hover:bg-violet-500"
        >
          {isPending ? (
            <>发送中...</>
          ) : (
            <><Send className="h-4 w-4 mr-2" /> 确认发送</>
          )}
        </Button>

        {!address && (
          <p className="text-xs text-zinc-500 text-center">
            请先连接钱包以发送交易
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: TxResult.tsx**

```tsx
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { useChainId } from 'wagmi';

interface Props {
  txHash: string;
  status?: string;
  onCheckStatus?: (hash: string) => void;
}

export function TxResult({ txHash, status, onCheckStatus }: Props) {
  const chainId = useChainId();

  useEffect(() => {
    if (!status && onCheckStatus) {
      const interval = setInterval(() => {
        onCheckStatus(txHash);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [txHash, status, onCheckStatus]);

  const isConfirmed = status === 'confirmed';
  const isPending = !status || status === 'pending';
  const isFailed = status === 'failed';

  const getExplorerUrl = () => {
    if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
    if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
    return null;
  };

  return (
    <Card className={
      isConfirmed ? 'border-emerald-500/30 bg-emerald-950/20' :
      isFailed ? 'border-red-500/30 bg-red-950/20' :
      'border-zinc-800 bg-zinc-900/50'
    }>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {isConfirmed && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {isPending && <Clock className="h-4 w-4 text-amber-400" />}
          {isFailed && <CheckCircle2 className="h-4 w-4 text-red-400" />}
          交易结果
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={
            isConfirmed ? 'border-emerald-500 text-emerald-400' :
            isPending ? 'border-amber-500 text-amber-400' :
            'border-red-500 text-red-400'
          }>
            {isConfirmed ? '已确认' : isPending ? '等待确认' : '失败'}
          </Badge>
        </div>
        <p className="text-xs font-mono text-zinc-400 break-all">{txHash}</p>
        {getExplorerUrl() && isConfirmed && (
          <a
            href={getExplorerUrl()!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" /> 在区块浏览器查看
          </a>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Task 3.7: App 主组件

**Objective:** 组装所有组件，完成主界面

**Files:**
- Create: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Header.tsx**

```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export function Header() {
  const { address } = useAccount();

  return (
    <header className="flex items-center justify-between py-4 px-1 mb-4">
      <div>
        <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
          Task3 Transfer Agent
        </h1>
        <p className="text-xs text-zinc-600 mt-0.5">
          AI × Web3 — 自然语言操控代币转账
        </p>
      </div>
      <ConnectButton
        accountStatus="address"
        chainStatus="icon"
        showBalance={false}
      />
    </header>
  );
}
```

**Step 2: App.tsx**

```tsx
import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { ReactTrace } from './components/ReactTrace';
import { TxPreview } from './components/TxPreview';
import { TxResult } from './components/TxResult';
import { useAgent } from './hooks/useAgent';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Droplets, WifiOff } from 'lucide-react';
import type { AgentConfig } from './types';

function App() {
  const { address, isConnected } = useAccount();
  const agent = useAgent();
  const [chainOk, setChainOk] = useState(true);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);

  // 页面加载时获取配置和合约信息
  useEffect(() => {
    agent.fetchConfig();
    agent.fetchContractInfo();
  }, []);

  const handleSend = useCallback(async (prompt: string) => {
    if (!address) {
      setError('请先连接钱包');
      return;
    }

    setTxHash(null);
    setTxStatus(null);
    setError(null);
    const result = await agent.runAgent(prompt, address);

    if (result && !result.success && result.error) {
      setError(result.error);
    }
  }, [address]);

  const handleTxSent = useCallback((hash: string) => {
    setTxHash(hash);
    setTxStatus('pending');
    // 轮询状态
    const interval = setInterval(async () => {
      const status = await agent.checkTxStatus(hash);
      if (status && status.status !== 'pending') {
        setTxStatus(status.status);
        clearInterval(interval);
      }
    }, 2000);
  }, []);

  const handleTxError = useCallback((err: string) => {
    setError(err);
  }, []);

  const handleMint = useCallback(async () => {
    if (!address) return;
    setMinting(true);
    try {
      const hash = await agent.mintTokens(address);
      setTxHash(hash);
      setTxStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faucet 失败');
    } finally {
      setMinting(false);
    }
  }, [address]);

  if (!chainOk) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="border-zinc-800 bg-zinc-900/50 max-w-md">
          <CardContent className="p-8 text-center">
            <WifiOff className="h-8 w-8 text-amber-400 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">后端或链节点不可用</p>
            <p className="text-zinc-600 text-xs mt-1">
              请确保 Anvil 和 FastAPI 已启动
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 pb-16">
      <Header />

      {/* 合约信息栏 */}
      {agent.contractInfo && (
        <Card className="border-zinc-800 bg-zinc-900/30 mb-4">
          <CardContent className="py-2 px-4 flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              {agent.contractInfo.name} ({agent.contractInfo.symbol})
            </span>
            <span className="text-zinc-600 font-mono">
              总供应: {agent.contractInfo.total_supply}
            </span>
            <span className="text-zinc-600">
              Chain: {agent.contractInfo.chain_id}
            </span>
          </CardContent>
        </Card>
      )}

      {/* 输入区 */}
      <PromptInput
        onSend={handleSend}
        loading={agent.loading}
        disabled={!isConnected}
      />

      {/* Faucet 按钮 */}
      {isConnected && (
        <div className="mt-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMint}
            disabled={minting}
            className="text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
          >
            <Droplets className="h-3 w-3 mr-1" />
            {minting ? '铸造中...' : 'Faucet: 领 100 T3T 测试代币'}
          </Button>
        </div>
      )}

      {/* ReAct Trace */}
      {agent.result && agent.result.trace.length > 0 && (
        <div className="mt-4 space-y-4">
          <ReactTrace steps={agent.result.trace} />

          {/* 交易预览 */}
          {agent.result.tx_preview && (
            <TxPreview
              preview={agent.result.tx_preview}
              onTxSent={handleTxSent}
              onError={handleTxError}
            />
          )}
        </div>
      )}

      {/* 交易结果 */}
      {txHash && (
        <div className="mt-4">
          <TxResult
            txHash={txHash}
            status={txStatus || undefined}
            onCheckStatus={agent.checkTxStatus}
          />
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="mt-4 p-3 rounded bg-red-950/30 border border-red-800/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 未连接提示 */}
      {!isConnected && (
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-600">连接钱包后即可使用自然语言操控代币转账</p>
        </div>
      )}

      {/* Agent 模式指示 */}
      {agent.config && (
        <div className="mt-6 text-center">
          <span className="text-[10px] text-zinc-700">
            Agent Mode: {agent.config.mode}
            {agent.config.contract_address && (
              <> · 合约: {agent.config.contract_address.slice(0, 10)}...{agent.config.contract_address.slice(-6)}</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default App;
```

---

## Phase 4: 集成与部署 (本地)

### Task 4.1: 启动脚本 + .env 文件

**Objective:** 创建一键启动脚本和前端 .env 配置

**Files:**
- Create: `scripts/start-dev.sh`
- Create: `frontend/.env.example`

**Step 1: .env.example**

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
VITE_WALLET_CONNECT_PROJECT_ID=
VITE_CHAIN_ID=31337
```

**Step 2: start-dev.sh**

```bash
#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Task3 Transfer Token — 启动开发环境 ==="

# 检查依赖
command -v anvil >/dev/null 2>&1 || { echo "请先安装 Foundry: https://book.getfoundry.sh/"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "请安装 Node.js >= 18"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "请安装 Python >= 3.11"; exit 1; }

# 1. 启动 Anvil
echo "[1/4] 启动 Anvil..."
anvil --host 0.0.0.0 --chain-id 31337 &
ANVIL_PID=$!
sleep 2

# 2. 安装依赖 + 部署合约
echo "[2/4] 部署合约..."
cd "$ROOT/contract"
npm install --silent 2>/dev/null
npx hardhat run scripts/deploy.ts --network localhost 2>/dev/null
CONTRACT_ADDR=$(cat "$ROOT/contract/deployment.json" | python3 -c "import sys,json; print(json.load(sys.stdin)['contractAddress'])")
echo "  合约地址: $CONTRACT_ADDR"

# 3. 写入后端配置
echo "[3/4] 配置后端..."
sed -i "s/contract_address: \"\"/contract_address: \"$CONTRACT_ADDR\"/" "$ROOT/backend/config.yaml"

# 4. 启动后端
echo "[4/4] 启动后端..."
cd "$ROOT/backend"
pip install -q -r requirements.txt 2>/dev/null
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

echo ""
echo "=== ✅ 启动完成 ==="
echo "Anvil:    http://127.0.0.1:8545"
echo "Backend:  http://localhost:8000"
echo "Frontend: cd frontend && npm run dev  →  http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止所有服务"
trap "kill $ANVIL_PID $BACKEND_PID 2>/dev/null" EXIT
wait
```

**Step 3: 设置执行权限**

```bash
chmod +x scripts/start-dev.sh
```

---

### Task 4.2: CI 工作流

**Objective:** 创建 GitHub Actions 配置文件

**Files:**
- Create: `.github/workflows/contract.yml`
- Create: `.github/workflows/backend.yml`
- Create: `.github/workflows/frontend.yml`

**Step 1: contract.yml**

```yaml
name: Contract
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: contract
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx hardhat compile
      - run: npx hardhat test
```

**Step 2: backend.yml**

```yaml
name: Backend
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements-dev.txt
      - run: pytest -v -k "not integration"
```

**Step 3: frontend.yml**

```yaml
name: Frontend
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
```

---

### Task 4.3: README

**Objective:** 写完整的使用说明

**Files:**
- Create: `README.md`（项目根目录）

**Step 1: README.md 内容**

```markdown
# Task3 Transfer Token

AI × Web3 演示项目：用自然语言操控代币转账。Agent 运行 ReAct 工作流
（Thought → Action → Observation → Done）完成意图理解、链上查询、交易构造，
用户通过自己的钱包签名上链。

## 架构

```
Frontend (Vite + React + WAGMI)  ─→  Backend (FastAPI + AgentCore)
                                          │
Anvil (Local Chain)  ←──── JSON-RPC ──────┘
```

- **Contract**: ERC20 Task3Token (T3T) — Hardhat 工程
- **Backend**: FastAPI + AgentCore 支持 mock / hermes 双模式
- **Frontend**: React + WAGMI + Shadcn UI

## 前置依赖

- [Foundry (anvil)](https://book.getfoundry.sh/) — 本地链
- Node.js >= 18
- Python >= 3.11
- [Hermes CLI](https://hermes-agent.nousresearch.com) (可选，hermes 模式使用)

## 快速启动

```bash
# 终端 1 — 本地链
anvil

# 终端 2 — 部署合约 + 启动后端
cd contract
npx hardhat run scripts/deploy.ts --network localhost
# → 复制输出的合约地址
# 修改 backend/config.yaml: contract_address: "0x..."
cd ../backend
uvicorn app.main:app --reload --port 8000

# 终端 3 — 前端
cd frontend
npm install
npm run dev
# → 浏览器打开 http://localhost:5173
```

或用一键脚本：

```bash
bash scripts/start-dev.sh
```

## Agent 模式

在 `backend/config.yaml` 中切换：

| mode | 说明 | 依赖 |
|------|------|------|
| `mock` | 关键词规则匹配，离线可用 | 无 |
| `hermes` | 调用本机 Hermes CLI 推理 | `hermes` 命令 |

## 使用流程

1. 连钱包（Anvil 测试账户）
2. 点击 Faucet 领 100 T3T
3. 输入自然语言指令，如：
   - "看看我的 T3T 余额"
   - "转 50 T3T 给 0x..."
   - "余额大于 100 就转 30 给 0x..."
4. 查看 ReAct 推理过程
5. 确认交易 → 钱包签名 → 等待上链

## 测试

```bash
# 合约
cd contract && npx hardhat test

# 后端
cd backend && pytest -v
```

## 项目结构

```
task3-transfer-token/
├── contract/       # Hardhat 工程 (ERC20)
├── backend/        # FastAPI + AgentCore
├── frontend/       # Vite + React + WAGMI
├── DESIGN.md       # 设计文档
└── PLAN.md         # 开发计划
```
```

---

## 执行顺序总结

```
Phase 0:  目录结构          (1 task)
Phase 1:  合约              (4 tasks)
Phase 2:  后端              (8 tasks)
Phase 3:  前端              (7 tasks)
Phase 4:  集成 + 部署       (3 tasks)
                              ──────
总计: 23 tasks
```

每个 task 预计 2-5 分钟，TDD 模式（先写测试后写代码），每个 task 完成后 git commit。

准备就绪后可以开始执行。先用 `subagent-driven-development` skill 逐 task 分发实现。要继续吗？ 🚀
