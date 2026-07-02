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
  tipo_operacao?: 'Long' | 'Short';
  estrategia?: string;
  notas?: string;
  moeda_taxa?: string;
  quantidade_taxa?: number;
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
}
