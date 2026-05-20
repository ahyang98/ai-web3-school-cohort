# Task 3: Agent 辅助代币转账 · 需求与设计文档

> **项目**: task3-transfer-token
> **状态**: 设计阶段
> **日期**: 2026-05-20

---

## 1. 项目概述

### 1.1 背景

基于 Agent ReAct 工作流（Thought → Action → Observation → ... → Done）构建一个最小可用的 **AI 辅助代币转账 dApp**。用户只需用自然语言描述转账意图，Agent（Hermes 后端服务）自动完成意图理解、余额检查、条件判断、交易构造；用户通过自己的钱包确认签名，最终上链。

### 1.2 核心价值

| 角色 | 价值 |
|------|------|
| 用户 | 无需关心合约调用细节，用自然语言操控链上资产 |
| 开发者 | 看到完整的 ReAct 流程 + 合约交互拆解，理解 AI×Web3 桥接模式 |
| 学习者 | 串联 Week 1 四大概念：Chain-aware Context + Web3 Tool Use + Agent Workflow + Agent Wallet |

### 1.3 使用流程（端到端）

```
① 用户连钱包 → ② 输入自然语言指令
  → ③ Agent 展示 ReAct 推理过程（Thought → Action → Observation）
  → ④ Agent 返回交易预览（预估 Gas、接收地址、金额）
  → ⑤ 用户确认 → WAGMI 签名 → 发送交易
  → ⑥ 上链确认 → 展示完整工作流回放
```

---

## 2. 功能需求

### 2.1 MVP 范围

| 模块 | 功能 | 优先级 |
|------|------|--------|
| 合约 | 部署一个可铸造（mint）的 ERC20 代币（T3T） | P0 |
| 合约 | Hardhat 工程，网络/部署账户可配置 | P0 |
| 后端 | 接受自然语言指令，运行 ReAct 代理循环 | P0 |
| 后端 | 调用 RPC 读取链上余额（eth_call / balanceOf） | P0 |
| 后端 | 构造 ERC20 transfer 交易数据（编码 calldata） | P0 |
| 后端 | 返回完整 ReAct 推理 Trace（前端展示用） | P0 |
| 后端 | Agent 配置（RPC URL、合约地址、LLM 模型等）外部化 | P0 |
| 前端 | 钱包连接（WAGMI + RainbowKit 或 ConnectButton） | P0 |
| 前端 | 自然语言输入框 → 发送指令 | P0 |
| 前端 | ReAct 流程可视化（逐步展开的卡片） | P0 |
| 前端 | 交易预览面板（接收方、金额、Gas 预估） | P0 |
| 前端 | 用户确认 → 签名发送 → 展示 tx hash | P0 |
| 后端 | mint 功能（给当前用户铸造测试代币） | P1 |
| 前端 | 历史交易记录列表 | P2 |

### 2.2 场景示例

```
用户输入：
  "看看我的 T3T 余额，如果大于 100 就给 0xAlice... 转 50 个"

Agent 输出 Trace：
  [Thought]  用户想查询 T3T 余额，条件是 > 100 则转账
  [Action]   调用 balanceOf(user_address)
  [Observation] 余额 = 1,000 T3T，条件满足，构造 transfer 交易
  [Action]   编码 transfer(0xAlice..., 50 * 10^18)
  [Done]     交易预览已生成，等待用户确认

用户确认 → WAGMI 签名 → 交易哈希: 0x7a9e...
```

---

## 3. 架构设计

### 3.1 系统架构图

```
┌──────────────┐     自然语言指令     ┌──────────────────────┐
│   Browser     │  ─────────────────→  │   FastAPI Backend     │
│  (Vite+React) │                      │                      │
│               │  ←── ReAct Trace ──  │   ┌──────────────┐   │
│  WAGMI/VIEM   │                      │   │   Agent Core  │   │
│  (用户钱包)   │                      │   │  (ReAct Loop) │   │
│               │                      │   └──────┬───────┘   │
│  Shadcn UI    │                      └──────────┼────────────┘
└──────┬────────┘                                  │
       │                                           │  JSON-RPC
       │  签名并发送交易                            │
       │                                           ▼
       │                                   ┌──────────────┐
       └─────────────────────────────→     │   Ethereum   │
                                          │   Network     │
                                          │  (Anvil/HH)  │
                                          └──────────────┘
```

### 3.2 组件职责

| 组件 | 职责 | 关键依赖 |
|------|------|---------|
| **Frontend** | UI 展示 + 钱包交互 + 签名发送 | React, WAGMI, Viem, Tailwind, Shadcn |
| **Backend** | ReAct Agent 运行 + RPC 读链 + 交易构造 | FastAPI, Viem(Python版), Pydantic |
| **Contract** | ERC20 代币 + Hardhat 部署 | Solidity, OpenZeppelin, Hardhat |
| **Network** | 本地 Anvil / 测试网 / 自定义 RPC | Anvil (Foundry) 或 Hardhat Node |

### 3.3 数据流（详细）

```
Step 1: 用户连接钱包 → 前端获取 address
Step 2: 用户输入指令 → POST /api/agent/run { prompt, user_address }
Step 3: 后端 Agent 执行 ReAct 循环：
        - Thought: LLM 解析意图 → 产生计划 ["check_balance", "maybe_transfer"]
        - Action: 调用 read_contract(balanceOf) → RPC
        - Observation: 余额 > threshold → 决定 transfer
        - Action: 编码 transfer calldata
        - Done: 返回 { trace: [...steps], tx_preview: { to, data, value } }
Step 4: 前端渲染 ReAct 流程 + 交易预览面板
Step 5: 用户点击「确认发送」→ WAGMI 的 wallet_sendTransaction
Step 6: 交易上链 → 展示 tx hash + 收据
```

---

## 4. 技术设计

### 4.1 智能合约

#### 4.1.1 合约选型

使用 OpenZeppelin 的 `ERC20` 标准合约，自定义代币名称为 **Task3 Token (T3T)**。

#### 4.1.2 合约功能

```solidity
contract Task3Token is ERC20 {
    // 初始 mint 一次性给 deployer
    constructor() ERC20("Task3 Token", "T3T") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    // 测试用：任何人都可以 mint 100 T3T（简化测试流程）
    function faucet() external {
        _mint(msg.sender, 100 * 10**18);
    }
}
```

#### 4.1.3 Hardhat 配置

```typescript
// hardhat.config.ts — 网络和账户可配置
const config: HardhatUserConfig = {
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: { url: process.env.SEPOLIA_RPC_URL },
    // 支持任何自定义 RPC
  }
};
```

部署账户通过 `.env` 文件配置：`DEPLOYER_PRIVATE_KEY`、`TARGET_NETWORK`。

### 4.2 后端 (FastAPI)

#### 4.2.1 技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| 框架 | FastAPI | Python 异步、自动 OpenAPI、Pydantic 验证 |
| Agent 引擎 | 多模式：mock / openai / anthropic / **hermes** | mock=离线规则, hermes=对接本机 Hermes Agent CLI |
| LLM 客户端 | 可拔插接口：MockLLM, OpenAIClient, HermesCLIClient | hermes 模式 shell 调用 `hermes` 命令 |
| 链交互 | `web3.py` | 调用 RPC、ABI 编解码 |

#### 4.2.2 Agent 架构

```
AgentConfig
  ├── mode: "mock" | "openai" | "anthropic" | "hermes"   ← 可切换
  ├── llm_model: str (仅 openai/anthropic 时生效)
  ├── hermes:                          ← hermes 模式专属配置
  │     ├── cli_path: "hermes"         (hermes 可执行路径)
  │     ├── model: "deepseek-v4-flash" (传给 hermes 的模型)
  │     └── provider: "deepseek"       (传给 hermes 的 provider)
  ├── rpc_url: str                     (链节点 URL)
  ├── chain_id: int
  ├── contract_address: str            (T3T 合约地址)
  ├── contract_abi: dict               (ERC20 ABI 子集)
  └── max_steps: int = 10

LLM Client (可拔插接口)
  ├── MockLLM          → 关键词规则匹配，零依赖
  ├── OpenAIClient     → 调 OpenAI / Anthropic API
  └── HermesCLIClient  → 调本机 `hermes` CLI ← 新增

AgentCore
  ├── run(prompt, user_address) → AgentResult
  │     ReAct Loop:
  │       while steps < max_steps and not done:
  │         thought = llm.infer(context + prompt)
  │         action = parse_action(thought)
  │         observation = execute_tool(action)
  │         context += observation
  │         steps++
  │       return { trace, tx_preview }
  │
  ├── Tools:
  │     ├── read_balance(address) → uint256
  │     ├── encode_transfer(to, amount) → hex calldata
  │     └── estimate_gas(tx) → uint256
  └── HermesCLIClient (对接 Hermes 的实现细节)
        └── 构造系统提示 + 链上上下文 → 调用 `hermes` CLI
        └── 解析结构化输出 → 提取 Thought/DECISION
        └── 示例 CLI 调用:
              echo "分析指令: 查余额>100就转50给0xAlice" | hermes --model deepseek-v4-flash
```

**Hermes 模式下的 ReAct 流程：**

```
后端收到用户指令
  ↓
① 后端先调用 RPC 获取链上上下文（余额、小数位、当前 Gas）
  ↓
② 组装 Hermes Prompt（系统角色 + 链上数据 + 用户指令）
  ↓
③ 后端 → `hermes` CLI → Hermes 返回推理结果
    重点提示 Hermes："请只输出推理结果，不要实际执行链上操作"
  ↓
④ 后端解析 Hermes 输出为 Thought / Decision
  ↓
⑤ 后端执行 Tools（编码 transfer calldata、预估 Gas）
  ↓
⑥ 组装完整 ReAct Trace → 返回前端
```

> **设计要点**：Hermes 模式中，Hermes Agent 负责 **推理层（Reasoning）**，后端负责 **执行层（Execution + Tools）**。这样既利用了 Hermes 的 LLM 能力做意图理解，又保持了 Trace 结构的可控性。

#### 4.2.3 API 端点

| 方法 | 路径 | 请求体 | 返回 |
|------|------|--------|------|
| POST | `/api/agent/run` | `{ prompt, user_address }` | `{ trace, tx_preview }` |
| POST | `/api/agent/mint` | `{ user_address }` | `{ tx_hash }` (服务端直接发送，用于 faucet) |
| GET  | `/api/config` | — | 当前 Agent 配置（只读） |
| GET  | `/api/contract/info` | — | 合约名、符号、总供应量 |
| POST | `/api/tx/status` | `{ tx_hash }` | 交易收据 |

#### 4.2.4 配置方式

通过 `backend/config.yaml` 或环境变量：

```yaml
# config.yaml
agent:
  mode: "hermes"                # mock | openai | anthropic | hermes
  # mock 模式：无需额外配置，关键词规则匹配
  # openai / anthropic 模式：
  llm_model: "gpt-4o-mini"
  # hermes 模式：
  hermes:
    cli_path: "hermes"          # 或 /path/to/hermes
    model: "deepseek-v4-flash"
    provider: "deepseek"
    timeout: 30                 # Hermes 推理超时（秒）

  rpc_url: "http://127.0.0.1:8545"
  chain_id: 31337
  contract_address: "0x..."
  max_steps: 10
```

### 4.3 前端

#### 4.3.1 技术栈

| 组件 | 选型 |
|------|------|
| 构建工具 | Vite 6 |
| 框架 | React 19 + TypeScript |
| 样式 | Tailwind CSS 4 |
| UI 组件 | Shadcn/ui (Radix Primitives) |
| 钱包 | WAGMI 2 + Viem 2 |
| 状态 | React Hooks (无外部状态库) |

#### 4.3.2 页面结构

```
┌─────────────────────────────────────────┐
│  Header: Task3 Transfer Agent           │
│  [钱包连接按钮]                          │
├─────────────────────────────────────────┤
│  Input: "看看余额，大于 100 就转给..."  │
│  [▶ 发送]                               │
├─────────────────────────────────────────┤
│  ReAct Trace 面板                        │
│  ┌─── Step 1: Thought ───────────────┐  │
│  │ 用户想查询余额并判断是否转账...    │  │
│  └────────────────────────────────────┘  │
│  ┌─── Step 2: Action (Read) ─────────┐  │
│  │ balanceOf("0x...") = 1,000 T3T   │  │
│  └────────────────────────────────────┘  │
│  ┌─── Step 3: Observation ───────────┐  │
│  │ 条件满足，准备转账...              │  │
│  └────────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  交易预览面板                            │
│  ┌─────────────────────────────────────┐ │
│  │ 发送: 50 T3T → 0xAlice...          │ │
│  │ 预估 Gas: 52,341                    │ │
│  │ [✅ 确认发送]                       │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  结果面板                                │
│  ✅ 交易成功! tx: 0x7a9e...            │
└─────────────────────────────────────────┘
```

#### 4.3.3 关键组件

| 组件 | 说明 |
|------|------|
| `WalletConnect` | WAGMI ConnectButton |
| `PromptInput` | 文本输入 + 发送按钮 |
| `ReactTrace` | 逐步展开的 ReAct 流程卡 |
| `TxPreview` | 交易预览 + 确认按钮 |
| `TxResult` | 交易结果展示 |

#### 4.3.4 WAGMI 配置

```typescript
// 配置支持的网络：Anvil (chainId: 31337) + 可选测试网
const config = createConfig({
  chains: [anvil, sepolia],
  connectors: [injected(), walletConnect({ projectId })]
});
```

---

## 5. 目录结构

```
task3-transfer-token/
├── DESIGN.md                    ← 本文档
├── README.md                    # 使用说明
│
├── contract/                    # Hardhat 工程
│   ├── contracts/
│   │   └── Task3Token.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   └── Task3Token.test.ts
│   ├── hardhat.config.ts
│   ├── .env.example
│   └── package.json
│
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI 入口
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py      # Pydantic 模型
│   │   ├── agent/
│   │   │   ├── __init__.py
│   │   │   ├── core.py         # ReAct Loop (AgentCore)
│   │   │   ├── tools.py        # 链上工具 (Web3Tools)
│   │   │   └── llm.py          # LLM 客户端：MockLLM / OpenAIClient / HermesCLIClient
│   │   └── config.py           # 配置加载 (config.yaml + 环境变量)
│   ├── tests/                   # ← 新增
│   │   ├── conftest.py         # pytest fixtures (mock config, web3 mock)
│   │   ├── test_agent_core.py  # AgentCore 各模式测试
│   │   ├── test_tools.py       # Web3Tools 单元测试
│   │   ├── test_api.py         # API 端点测试 (TestClient)
│   │   └── test_integration.py # 集成测试 (需要 Anvil)
│   ├── config.yaml             # Agent 配置 (mode/rpc/contract)
│   ├── .env.example
│   ├── requirements.txt
│   └── requirements-dev.txt    # pytest, pytest-cov, etc.
│
├── frontend/                    # Vite + React 前端
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── config/
│   │   │   └── wagmi.ts        # WAGMI 配置
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── PromptInput.tsx
│   │   │   ├── ReactTrace.tsx
│   │   │   ├── TxPreview.tsx
│   │   │   └── TxResult.tsx
│   │   ├── hooks/
│   │   │   └── useAgent.ts     # API 调用 + 交易发送
│   │   ├── lib/
│   │   │   └── utils.ts        # Shadcn 工具函数
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── components.json         # Shadcn 配置
│   ├── package.json
│   └── .env.example
│
├── .github/                     # CI 工作流
│   └── workflows/
│       ├── contract.yml        # Hardhat compile + test
│       ├── backend.yml         # pytest (mock 模式)
│       └── frontend.yml        # npm build
│
└── scripts/                     # 工具脚本
    └── start-dev.sh            # 一键启动本地开发环境
```

---

## 6. 关键设计决策

### 6.1 为什么 Agent 只构造交易、不签名？

> **原则：用户的私钥永不离浏览器。**

Agent 负责「意图理解 → 读链 → 构造交易」，用户通过 WAGMI 在浏览器中签名发送。这模拟了现实中的 Agent Wallet 模式：Agent 持有 Session Key（有限权限），但大额操作仍需用户批准。

### 6.2 Agent LLM 可配置的意义

`config.yaml` 中 `llm_provider` 支持 `openai` / `anthropic` / `mock`。`mock` 模式下 Agent 使用规则匹配（关键词解析），不依赖外部 API，便于离线开发和演示。

### 6.3 为什么要 faucet 功能

测试时用户需要持有 T3T 才能转账。`faucet` 端点让任意地址免费 mint 100 T3T，降低测试摩擦。

### 6.4 Hermes 模式的设计原则：推理与执行分离

| 层面 | 谁负责 | 技术细节 |
|------|--------|---------|
| **推理层 (Reasoning)** | `hermes` CLI (LLM) | 接受结构化 Prompt → 输出 Thought/Decision |
| **执行层 (Execution)** | FastAPI Backend | 调用 RPC、编码 calldata、预估 Gas |
| **签名层 (Signing)** | 浏览器 (WAGMI) | 用户私钥签名，永不离开浏览器 |

这样设计的理由：

1. **Trace 可控**：如果让 Hermes 直接调 RPC，输出是自由文本，解析 ReAct 步骤不稳定。后端做执行保证 Trace 结构干净。
2. **安全边界**：Hermes 只需要纯文本输入输出，不需要 RPC URL、私钥等敏感信息。
3. **脱机演示**：Hermes 模式不可用时（无 `hermes` CLI），切到 `mock` 模式，全套 demo 仍可运行。
4. **Chain-aware Context 演示**：后端在调用 Hermes 之前先抓取链上数据（余额、Gas 价格），注入到 Prompt 中——这正是「链上数据进入 Agent 上下文」的实战演示。

### 6.5 合约部署的 Faucet 模式

Faucet 交易由后端签名发送（后端持有部署账户私钥），用户无需为测试代币支付 Gas。这个模式模拟了「应用代付 Gas」的场景，也是 Agent Wallet 的一种简化形式。

---

## 7. 测试策略

### 7.1 测试金字塔

```
            ╱  E2E   ╲          ← 前端 + 后端 + 合约 全链路
           ╱──────────╲
          ╱  Integration ╲      ← 后端 + Anvil + Hermes CLI
         ╱────────────────╲
        ╱    Unit Tests     ╲   ← 合约 test、Agent 单元、API 端点
       ╱──────────────────────╲
```

### 7.2 合约测试 (Hardhat + Mocha/Chai)

| 测试项 | 说明 | 工具 |
|--------|------|------|
| 部署测试 | 合约部署后总供应量 = 1M T3T | Hardhat Test |
| 转账测试 | 正常 transfer、超余额 transfer 回滚 | `expect.to.be.revertedWith` |
| 授权测试 | approve + transferFrom 场景 | ERC20 标准测试 |
| Faucet 测试 | 用户调用 faucet 后余额增加 100 T3T | Chai Assertion |
| Gas 测试 | 记录转账 Gas 消耗 | `tx.gasUsed` |

运行方式：

```bash
cd contract
npx hardhat test                     # 全部测试
npx hardhat test --grep "transfer"   # 筛选测试
npx hardhat coverage                 # 覆盖率报告
```

### 7.3 后端测试 (pytest)

| 层级 | 测试内容 | 方法 |
|------|---------|------|
| **单元测试** | AgentCore 各模式 (mock/hermes) | Mock Web3Provider、Mock Hermes CLI |
| **单元测试** | Tools: read_balance、encode_transfer、estimate_gas | Mock RPC 响应 |
| **单元测试** | Schemas 验证 | Pydantic 模型测试 |
| **集成测试** | API 端点 (FastAPI TestClient) | 配合 Anvil 本地节点 |
| **集成测试** | 全 ReAct 流程 (mock → trace 格式正确) | TestClient + Web3Mock |

关键测试场景：

```python
# test_agent_core.py — 核心逻辑
def test_mock_mode_balance_check():
    agent = AgentCore(config=mock_config)
    result = agent.run("查看余额", user_address="0x...")
    assert result.trace[0].type == "thought"
    assert result.tx_preview is None  # 纯查询，无需交易

def test_mock_mode_transfer():
    agent = AgentCore(config=mock_config)
    result = agent.run("转 50 T3T 给 0xAlice", user_address="0x...")
    assert result.tx_preview.to == "0xAlice"
    assert result.tx_preview.amount == 50 * 10**18

def test_hermes_mode():
    """Hermes 模式需要本机安装 hermes CLI"""
    agent = AgentCore(config=hermes_config)
    result = agent.run("余额大于100就转50给0xAlice", user_address="0x...")
    assert len(result.trace) >= 2  # 至少包含 Thought + Done
    # trace 结构验证
    for step in result.trace:
        assert step.type in ("thought", "action", "observation", "done")
        assert isinstance(step.content, str) and len(step.content) > 0

def test_tools():
    tools = Web3Tools(rpc_url="http://127.0.0.1:8545", contract="0x...")
    balance = tools.read_balance("0xDeployer...")
    assert balance > 0  # deployer 有初始 mint
    calldata = tools.encode_transfer("0xAlice", 50 * 10**18)
    assert calldata.startswith("0xa9059cbb")  # transfer 函数选择器
```

```bash
cd backend
pytest -v                          # 全部测试
pytest -v -k "mock"                # 只跑 mock 相关
pytest -v -k "hermes" --setup-show # Hermes 模式（需安装 hermes）
pytest --cov=app tests/            # 覆盖率
```

### 7.4 集成测试 (后端 + Anvil)

集成测试流程：

```
① 终端 1: anvil &
② 部署 T3T 合约 → 记录合约地址
③ 写入 backend/config.yaml 的 contract_address
④ 终端 2: uvicorn app.main:app --reload --port 8000 &
⑤ 运行 pytest integration tests
    └─ POST /api/agent/run → 验证 trace 结构
    └─ POST /api/agent/mint → 验证 faucet 交易
⑥ 停 Anvil + 后端
```

### 7.5 E2E 测试 (Playwright + Anvil + MetaMask)

```
可选方案：
① Backend + Anvil 启动
② MetaMask 导入 Anvil 测试私钥
③ Playwright 打开前端页面
④ 连接钱包 → 输入指令 → 确认交易 → 验证结果
```

> 注意：E2E 涉及浏览器钱包交互（MetaMask），适合 CI 环境中使用 `@playwright/test` + `synpress` 或 `@agoric/synpress` 方案。MVP 阶段可先手动测试。

---

## 8. 部署方案

### 8.1 部署架构

```
                        ┌──────────────┐
                        │  Vite Dev     │  ← 本机: npm run dev
                        │ (Frontend)    │     http://localhost:5173
                        └──────┬───────┘
                               │ HTTP (localhost)
                        ┌──────┴───────┐
                        │  uvicorn     │  ← 本机: uvicorn app.main:app
                        │ (Backend)    │     http://localhost:8000
                        └──────┬───────┘
                               │ JSON-RPC (localhost)
                        ┌──────┴───────┐
                        │  Anvil       │  ← 本机: anvil --host 0.0.0.0
                        │ (Local Chain)│     http://127.0.0.1:8545
                        └──────────────┘
```

> 所有组件都在**本机运行**，无需 Docker、无需云服务。前端请求后端、后端连接 Anvil 本地链，全部走 localhost。

### 8.2 合约部署

| 环境 | 网络 | 命令 |
|------|------|------|
| 本地开发 | Anvil (推荐) | `anvil` + `npx hardhat run scripts/deploy.ts --network localhost` |
| 本地开发 | Hardhat Node | `npx hardhat node` + 同上 |
| 测试网 | Sepolia | `npx hardhat run scripts/deploy.ts --network sepolia` |
| 测试网 | Base Sepolia | 同上，改 network |
| 主网 | Ethereum / Base | 同上 + 主网 RPC |

**配置：**

```bash
# contract/.env
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
TARGET_NETWORK=localhost
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/...
```

**部署输出：**

```
✓ 合约 Task3Token 部署成功
  地址: 0x1234...
  交易哈希: 0xabcd...
  Deployer: 0xDeployer...
  初始供应量: 1,000,000 T3T
  ⚠️ 请将合约地址更新到 backend/config.yaml
```

### 8.3 后端启动

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 8.4 前端启动

```bash
cd frontend
cp .env.example .env
# 编辑 VITE_API_URL=http://localhost:8000
npm install
npm run dev
# → http://localhost:5173
```

### 8.5 配置同步流程

```
① 部署合约 → 得到合约地址 0x...
② 写入 backend/config.yaml: contract_address: 0x...
③ 重启后端
④ 前端通过 /api/config 自动获取合约地址
```

后端提供 `/api/config` 端点，前端启动时自动拉取合约地址等信息，无需硬编码。

### 8.6 快速启动（一键四步）

```bash
# 终端 1: 启动本地链
anvil

# 终端 2: 部署合约 + 启动后端
cd contract && npx hardhat run scripts/deploy.ts --network localhost
# → 复制合约地址到 backend/config.yaml
cd ../backend && uvicorn app.main:app --reload --port 8000

# 终端 3: 启动前端
cd frontend && npm run dev
```

---

## 9. 风险与注意事项

| 风险 | 缓解措施 |
|------|---------|
| LLM API 费用 | 提供 mock 模式，规则匹配代替 LLM 调用 |
| 签名/私钥安全 | Agent 永不接触私钥，签名完全在浏览器 |
| RPC 不可用 | 支持自定义 RPC URL 配置 |
| 同地址并发请求 | Agent 无状态，天然支持；前端需防重复提交 |
| Hermes CLI 未安装 | mock 模式作为回退，`hermes` 模式下启动时校验 CLI 可用性 |
| Anvil / Hardhat Node 未启动 | 后端添加健康检查端点，前端显示网络连接状态 |

---

## 10. 后续可能的扩展

- 支持更多 ERC20（用户自定义合约地址）
- Agent 支持多步条件逻辑（if-else 嵌套）
- Session Key / Delegated Wallet 集成
- 交易历史存储 + 查询
- 多链支持（Ethereum, Polygon, Base）
- ReAct Trace 导出/分享
- Agent 模式可视化切换（前端 UI 直接选 mock / hermes）
- Hermes 模式下支持 `tools.use` 让 Hermes 直接调 RPC（experimental）
- CI/CD Pipeline：合约测试 → 部署 → 后端测试 → E2E
- 集成 Hardhat Ignition 声明式部署

---

*本文档对应 WCB AI×Web3 School Week 1 动手实践部分。*
