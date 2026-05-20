# Task3 Transfer Token

AI × Web3 演示项目 — 用自然语言操控代币转账。

Agent 运行 **ReAct 工作流**（Thought → Action → Observation → Done）完成意图理解、链上余额查询、条件判断、交易构造，用户通过自己的钱包签名上链。

## 架构

```
Frontend (Vite + React + WAGMI)  ─→  Backend (FastAPI + AgentCore)
                                          │
Anvil (Local Chain)  ←──── JSON-RPC ──────┘
```

| 层 | 技术 | 端口 |
|---|---|---|
| **Contract** | Solidity ERC20 + Hardhat | `:8545` (Anvil) |
| **Backend** | FastAPI + AgentCore (mock / hermes 模式) | `:8000` |
| **Frontend** | React + WAGMI + Viem + Shadcn UI | `:5173` |

## 前置依赖

| 工具 | 用途 | 安装 |
|------|------|------|
| [Foundry](https://book.getfoundry.sh/) | 本地链 (anvil) | `curl -L https://foundry.paradigm.xyz | bash && foundryup` |
| Node.js >= 18 | 前端 + 合约编译 | [nodejs.org](https://nodejs.org/) |
| Python >= 3.11 | 后端 | [python.org](https://python.org/) |
| Hermes CLI | Agent 推理引擎 (可选) | [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/) |

## 快速启动

### 一键脚本

```bash
bash scripts/start-dev.sh
```

### 手动分步

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

## Agent 模式切换

编辑 `backend/config.yaml`：

| mode | 说明 | 依赖 |
|------|------|------|
| `mock` | 关键词规则匹配，零依赖 | 无 |
| `hermes` | 调用本机 Hermes CLI 做 LLM 推理 | 需安装 `hermes` 命令 |

## 使用流程

1. **连接钱包** — 点击右上角 Connect Wallet，选 Anvil 测试网
2. **领测试代币** — 点「Faucet: 领 100 T3T」按钮
3. **输入自然语言指令**，例如：
   - `看看我的 T3T 余额`
   - `转 50 T3T 给 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`
   - `余额大于 100 就转 30 给 0x...`
4. **查看 ReAct 推理过程** — Agent 展示 Thought → Action → Observation → Done
5. **确认交易** — 检查交易预览 → 点确认 → 钱包签名 → 等待上链

## 测试

```bash
# 合约（7 个用例）
cd contract && npx hardhat test

# 后端（11 个用例）
cd backend && pytest -v
```

## 项目结构

```
task3-transfer-token/
├── contract/           # Hardhat 工程 (ERC20 + deploy 脚本)
├── backend/            # FastAPI + AgentCore + Web3Tools
├── frontend/           # Vite + React + WAGMI + Shadcn
├── .github/workflows/  # CI (合约/后端/前端)
├── scripts/            # 本地开发启动脚本
├── DESIGN.md           # 需求与设计文档
└── PLAN.md             # 开发计划
```

## 设计文档

详细设计见 [DESIGN.md](./DESIGN.md)，包含架构设计、数据流、API 规范、测试策略、部署方案等。
