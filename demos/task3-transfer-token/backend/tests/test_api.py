from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestAPI:
    def test_health_endpoint(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["agent_mode"] == "mock"

    def test_agent_run_no_contract(self):
        resp = client.post("/api/agent/run", json={
            "prompt": "查余额",
            "user_address": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        })
        assert resp.status_code == 400
        assert "合约地址未配置" in resp.json()["detail"]

    def test_agent_run_invalid_address(self):
        resp = client.post("/api/agent/run", json={
            "prompt": "查余额",
            "user_address": "not-an-address",
        })
        assert resp.status_code == 400

    def test_get_config(self):
        resp = client.get("/api/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "mode" in data
        assert "contract_address" in data

    def test_contract_info_no_rpc(self):
        """Without RPC, contract/info should return 503"""
        resp = client.get("/api/contract/info")
        assert resp.status_code == 503

    def test_tx_status_pending_on_invalid_hash(self):
        """Invalid tx hash should return pending status"""
        resp = client.post("/api/tx/status", json={
            "tx_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "pending"

    def test_faucet_no_key(self):
        """Without deployer key, faucet should return 500"""
        resp = client.post("/api/agent/mint", json={
            "user_address": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        })
        assert resp.status_code == 500
