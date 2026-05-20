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
    } catch { /* ignore */ }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/api/config`);
      if (resp.ok) {
        setConfig(await resp.json());
      }
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
  }, []);

  const mintTokens = useCallback(async (userAddress: string) => {
    const resp = await fetch(`${API_URL}/api/agent/mint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_address: userAddress }),
    });
    if (!resp.ok) throw new Error('Faucet failed');
    const data = await resp.json();
    setTxHash(data.tx_hash);
    return data.tx_hash;
  }, []);

  return {
    loading, result, contractInfo, config, txHash, txStatus,
    runAgent, fetchContractInfo, fetchConfig, checkTxStatus, mintTokens,
  };
}
