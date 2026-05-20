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

function App() {
  const { address, isConnected } = useAccount();
  const agent = useAgent();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);

  useEffect(() => { agent.fetchConfig(); agent.fetchContractInfo(); }, []);

  const handleSend = useCallback(async (prompt: string) => {
    if (!address) { setError('请先连接钱包'); return; }
    setTxHash(null); setTxStatus(null); setError(null);
    const result = await agent.runAgent(prompt, address);
    if (result && !result.success && result.error) setError(result.error);
  }, [address]);

  const handleTxSent = useCallback((hash: string) => {
    setTxHash(hash);
    setTxStatus('pending');
    const interval = setInterval(async () => {
      const status = await agent.checkTxStatus(hash);
      if (status && status.status !== 'pending') {
        setTxStatus(status.status);
        clearInterval(interval);
      }
    }, 2000);
  }, []);

  const handleTxError = useCallback((err: string) => setError(err), []);
  const handleMint = useCallback(async () => {
    if (!address) return;
    setMinting(true);
    try {
      const hash = await agent.mintTokens(address);
      setTxHash(hash);
      setTxStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faucet 失败');
    } finally { setMinting(false); }
  }, [address]);

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 pb-16">
      <Header />
      {agent.contractInfo && (
        <Card className="border-zinc-800 bg-zinc-900/30 mb-4">
          <CardContent className="py-2 px-4 flex items-center justify-between text-xs">
            <span className="text-zinc-500">{agent.contractInfo.name} ({agent.contractInfo.symbol})</span>
            <span className="text-zinc-600 font-mono">总供应: {agent.contractInfo.total_supply}</span>
            <span className="text-zinc-600">Chain: {agent.contractInfo.chain_id}</span>
          </CardContent>
        </Card>
      )}
      <PromptInput onSend={handleSend} loading={agent.loading} disabled={!isConnected} />
      {isConnected && (
        <div className="mt-2 mb-4">
          <Button variant="outline" size="sm" onClick={handleMint} disabled={minting}
            className="text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200">
            <Droplets className="h-3 w-3 mr-1" />
            {minting ? '铸造中...' : 'Faucet: 领 100 T3T 测试代币'}
          </Button>
        </div>
      )}
      {agent.result && agent.result.trace.length > 0 && (
        <div className="mt-4 space-y-4">
          <ReactTrace steps={agent.result.trace} />
          {agent.result.tx_preview && (
            <TxPreview preview={agent.result.tx_preview} onTxSent={handleTxSent} onError={handleTxError} />
          )}
        </div>
      )}
      {txHash && (
        <div className="mt-4">
          <TxResult txHash={txHash} status={txStatus || undefined} onCheckStatus={agent.checkTxStatus} />
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 rounded bg-red-950/30 border border-red-800/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {!isConnected && (
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-600">连接钱包后即可使用自然语言操控代币转账</p>
        </div>
      )}
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
