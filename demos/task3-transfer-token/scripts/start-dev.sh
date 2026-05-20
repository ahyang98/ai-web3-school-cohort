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

# 2. 部署合约
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
