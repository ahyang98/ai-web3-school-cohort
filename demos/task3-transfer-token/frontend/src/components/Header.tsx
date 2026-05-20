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
