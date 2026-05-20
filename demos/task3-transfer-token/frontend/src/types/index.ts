export interface TraceStep {
  type: 'thought' | 'action' | 'observation' | 'done';
  content: string;
  details?: Record<string, unknown>;
}

export interface TxPreview {
  to: string;
  data: string;
  value: string;
  to_address?: string;
  amount?: string;
  estimated_gas?: string;
}

export interface AgentResponse {
  success: boolean;
  trace: TraceStep[];
  tx_preview?: TxPreview;
  error?: string;
}

export interface ContractInfo {
  address: string;
  symbol: string;
  name: string;
  total_supply: string;
  chain_id: number;
}

export interface AgentConfig {
  mode: string;
  contract_address: string;
  chain_id: number;
  rpc_url: string;
}
