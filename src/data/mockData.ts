import { Trade, CoinPrice, Instituicao } from '../types';

export const initialCoinPrices: CoinPrice[] = [
  { moeda: 'BTC', name: 'Bitcoin', current_price: 68420.50, change_24h: 3.42 },
  { moeda: 'ETH', name: 'Ethereum', current_price: 3450.25, change_24h: 1.85 },
  { moeda: 'SOL', name: 'Solana', current_price: 148.80, change_24h: 7.15 },
  { moeda: 'LINK', name: 'Chainlink', current_price: 15.45, change_24h: -1.20 },
  { moeda: 'AVAX', name: 'Avalanche', current_price: 32.10, change_24h: -2.45 },
  { moeda: 'DOGE', name: 'Dogecoin', current_price: 0.16, change_24h: 4.20 },
  { moeda: 'ADA', name: 'Cardano', current_price: 0.44, change_24h: -2.10 },
  { moeda: 'MATIC', name: 'Polygon', current_price: 15.50, change_24h: 5.30 },
];

export const initialTrades: Trade[] = [];

export const initialInstitutions: Instituicao[] = [
  {
    id: 'inst-binance',
    nome: 'Binance',
    tipo: 'CEX',
    cor_hex: '#F3BA2F',
    created_at: '2026-06-14T10:00:00Z',
    native_coin: 'BNB',
  },
  {
    id: 'inst-metamask',
    nome: 'MetaMask',
    tipo: 'Wallet',
    cor_hex: '#E17614',
    created_at: '2026-06-14T10:05:00Z',
  },
  {
    id: 'inst-bybit',
    nome: 'Bybit',
    tipo: 'CEX',
    cor_hex: '#111111',
    created_at: '2026-06-14T10:10:00Z',
    native_coin: 'MNT',
  },
  {
    id: 'inst-bitget',
    nome: 'BitGet',
    tipo: 'CEX',
    cor_hex: '#00F0FF',
    created_at: '2026-06-14T10:12:00Z',
    native_coin: 'BGB',
  },
  {
    id: 'inst-mexc',
    nome: 'Mexc',
    tipo: 'CEX',
    cor_hex: '#0F54D7',
    created_at: '2026-06-14T10:13:00Z',
  },
  {
    id: 'inst-kraken',
    nome: 'Kraken',
    tipo: 'CEX',
    cor_hex: '#5741D9',
    created_at: '2026-06-14T10:14:00Z',
  },
  {
    id: 'inst-okx',
    nome: 'OKX',
    tipo: 'CEX',
    cor_hex: '#111111',
    created_at: '2026-06-14T10:15:00Z',
    native_coin: 'OKB',
  },
  {
    id: 'inst-cryptocom',
    nome: 'Crypto.com',
    tipo: 'CEX',
    cor_hex: '#0A2540',
    created_at: '2026-06-14T10:16:00Z',
    native_coin: 'CRO',
  },
  {
    id: 'inst-gateio',
    nome: 'Gate.io',
    tipo: 'CEX',
    cor_hex: '#E01E5A',
    created_at: '2026-06-14T10:17:00Z',
    native_coin: 'GT',
  },
  {
    id: 'inst-nubank',
    nome: 'Nubank',
    tipo: 'Bank',
    cor_hex: '#820AD1',
    created_at: '2026-06-14T10:15:00Z',
  },
];

