import { useCallback } from 'react';
import { useSendTransaction, useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Send, ArrowRight, Fuel, AlertTriangle } from 'lucide-react';
import type { TxPreview as TxPreviewType } from '../types';

interface Props {
  preview: TxPreviewType;
  onTxSent: (hash: string) => void;
  onError: (err: string) => void;
}

export function TxPreview({ preview, onTxSent, onError }: Props) {
  const { address } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const handleSend = useCallback(async () => {
    if (!address) { onError('请先连接钱包'); return; }
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
              <div className="text-zinc-500 flex items-center gap-1"><Fuel className="h-3 w-3" /> Gas</div>
              <div className="text-zinc-200">{preview.estimated_gas}</div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 rounded p-2">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>合约交互需要支付 ETH Gas 费，确认后钱包将弹出签名请求</span>
        </div>
        <Button onClick={handleSend} disabled={isPending || !address} className="w-full bg-violet-600 hover:bg-violet-500">
          {isPending ? <>发送中...</> : <><Send className="h-4 w-4 mr-2" /> 确认发送</>}
        </Button>
        {!address && <p className="text-xs text-zinc-500 text-center">请先连接钱包以发送交易</p>}
      </CardContent>
    </Card>
  );
}
