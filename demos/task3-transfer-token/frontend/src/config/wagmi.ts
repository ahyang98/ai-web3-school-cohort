import { createConfig, http } from 'wagmi';
import { anvil, sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '';

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
