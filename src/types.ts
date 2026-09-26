export type TradeStatus = 'Aberto' | 'Fechado_Gain' | 'Fechado_Loss';

export type InstituicaoTipo = 'CEX' | 'DEX' | 'Wallet' | 'Bank';

export interface Instituicao {
  id: string;
  nome: string;
  tipo: InstituicaoTipo;
  cor_hex: string;
  created_at: string;
  native_coin?: string;
}

export type BrokerName = 
  | 'Binance' 
  | 'Bybit' 
  | 'OKX' 
  | 'Mexc' 
  | 'Bitget' 
  | 'Gate.io' 
  | 'Kraken' 
  | 'KuCoin' 
  | 'Coinbase'
  | 'Outra';

export interface BrokerAssetBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
}

export interface BrokerAccount {
  id: string;
  broker: string; // Ex: Binance, Bybit, OKX, etc.
  nome_conta: string; // Ex: "Binance - Conta Principal", "Binance - Futuros", "Subconta 02"
  tipo_mercado: 'Spot' | 'Futuros' | 'Ambos';
  ambiente: 'Mainnet' | 'Testnet';
  api_key: string;
  api_secret: string;
  passphrase?: string; // Para corretoras como OKX, KuCoin, Bitget
  status: 'Conectado' | 'Erro' | 'Pendente' | 'Desconectado';
  status_mensagem?: string;
  ultimo_sync?: string;
  saldo_total_usd: number;
  saldo_disponivel_usd: number;
  balances?: BrokerAssetBalance[];
  cor_hex: string;
  ativo: boolean;
  created_at: string;
}

export interface Trade {
  id: string;
  data_hora: string;
  exchange: string;
  moeda: string; // Ticker (ex: BTC, ETH)
  preco_compra: number;
  quantidade: number;
  taxa_corretora_usd: number;
  stop_loss: number | null;
  alvo_1: number | null;
  alvo_2: number | null;
  alvo_3: number | null;
  alvo_4: number | null;
  alvo_5: number | null;
  alvo_6: number | null;
  status: TradeStatus;
  pnl_realizado: number;
  quantidade_restante?: number;
  tipo_operacao?: 'Long' | 'Short';
  estrategia?: string;
  notas?: string;
  moeda_taxa?: string;
  quantidade_taxa?: number;
  trackPosicao?: number;
  conta_corretora_id?: string;
  conta_corretora_nome?: string;
}

export interface CoinPrice {
  moeda: string;
  name: string;
  current_price: number;
  change_24h: number;
}

export interface Hold {
  id: string;
  data_hora: string;
  exchange: string;
  moeda: string; // Ticker (ex: BTC, ETH)
  tipo: 'Compra' | 'Venda';
  preco_compra: number; // Cotação na Compra
  quantidade: number;
  valor_investido: number; // total USD
  alvo_1?: number | null;
  alvo_2?: number | null;
  alvo_3?: number | null;
  notas?: string;
  created_at?: string;
  conta_corretora_id?: string;
  conta_corretora_nome?: string;
}
