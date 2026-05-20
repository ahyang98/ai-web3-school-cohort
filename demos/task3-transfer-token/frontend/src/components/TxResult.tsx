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
      const interval = setInterval(() => onCheckStatus(txHash), 3000);
      return () => clearInterval(interval);
    }
  }, [txHash, status, onCheckStatus]);

  const isConfirmed = status === 'confirmed';
  const isPending = !status || status === 'pending';
  const isFailed = status === 'failed';

  const explorerUrl =
    chainId === 11155111 ? `https://sepolia.etherscan.io/tx/${txHash}` :
    chainId === 84532 ? `https://sepolia.basescan.org/tx/${txHash}` :
    null;

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
        {explorerUrl && isConfirmed && (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
             className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> 在区块浏览器查看
          </a>
        )}
      </CardContent>
    </Card>
  );
}
