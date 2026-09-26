import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Plus, 
  Trash2, 
  Search, 
  Upload, 
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Pencil,
  Link2
} from 'lucide-react';
import { Trade, CoinPrice, TradeStatus, Instituicao, BrokerAccount } from '../types';

const calcTargetPnlPercent = (entryPrice: number, targetVal: number, tipo?: 'Long' | 'Short') => {
  if (!entryPrice || !targetVal) return '';
  const isShort = tipo === 'Short';
  const pct = ((targetVal - entryPrice) / entryPrice) * 100;
  const truePct = isShort ? -pct : pct;
  return `${truePct >= 0 ? '+' : ''}${truePct.toFixed(1)}%`;
};

// COR DO BADGE DE STATUS
const getStatusColor = (status: string) => {
  switch (status) {
    case 'ABERTO': return 'bg-orange-600/20 text-orange-400 border-orange-600/40';
    case 'WIN': return 'bg-green-800/30 text-green-300 border-green-700/50';
    case 'LOSS': return 'bg-red-800/30 text-red-300 border-red-700/50';
    default: return 'bg-zinc-600/20 text-zinc-400 border-zinc-600/40'; // FECHADO
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'ABERTO': return 'OPEN';
    case 'WIN': return 'WIN';
    case 'LOSS': return 'LOSS';
    default: return 'CLOSE';
  }
};

const calcularNiveisStop = (entryPrice: number, stopLoss: number) => {
  const distancia = entryPrice - stopLoss;
  return [
    entryPrice - distancia * 0.2,  // 20%
    entryPrice - distancia * 0.4,  // 40%
    entryPrice - distancia * 0.6,  // 60%
    entryPrice - distancia * 0.8,  // 80%
    stopLoss                        // 100% (STOP)
  ];
};

const calcularNivelStop = (entryPrice: number, stopPrice: number, percentual: number) => {
  const diferenca = entryPrice - stopPrice;
  return entryPrice - (diferenca * percentual);
};

// COR DO PNL
const getPnlColor = (pnl: number) => {
  if (pnl > 0) return 'text-green-400';
  if (pnl < 0) return 'text-red-400';
  return 'text-zinc-400'; // zero a zero
};

const renderStatusArrow = (trade: { status: string; direcao: 'LONG' | 'SHORT' }) => {
  // Definir cor baseada no status
  let cor;
  switch (trade.status) {
    case 'OPEN':
    case 'ABERTO':   cor = '#3b82f6'; break;  // blue-500
    case 'WIN':    cor = '#22c55e'; break;  // green-500
    case 'LOSS':   cor = '#ef4444'; break;  // red-500
    case 'CLOSE':
    case 'FECHADO':  cor = '#71717a'; break;  // zinc-500
    default:       cor = '#71717a';
  }

  // Triângulo: ▲ = LONG, ▼ = SHORT
  const triangulo = trade.direcao === 'LONG' ? '▲' : '▼';

  return (
    <span
      className="status-triangle"
      style={{ color: cor }}
      title={`${trade.status} • ${trade.direcao}`}
    >
      {triangulo}
    </span>
  );
};

const calcularValorTotal = (trade: { buyPrice: number; quantity: number }) => {
  return trade.buyPrice * trade.quantity;
};

/**
 * Formata valores numéricos com casas decimais adaptativas.
 * Usa poucas casas para números grandes, muitas casas para números pequenos.
 * Sempre preserva a precisão real via toFixed().
 */
const formatSmart = (value: number | string | null | undefined, decimals = 9) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return '-';
  if (num === 0) return '0';
  
  const abs = Math.abs(num);
  let casas;
  
  if (abs >= 1000) casas = 0;
  else if (abs >= 1) casas = 2;
  else if (abs >= 0.01) casas = 4;
  else if (abs >= 0.0001) casas = 6;
  else if (abs >= 0.000001) casas = 8;
  else casas = decimals;
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
};

/**
 * Retorna o valor com precisão TOTAL para usar no tooltip (title).
 */
const formatPreciso = (value: number | string | null | undefined, decimals = 9) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return '-';
  return num.toFixed(decimals);
};

const classificarTempoTrade = (dataEntrada: string, dataSaida: string) => {
  const entrada = new Date(dataEntrada).getTime();
  const saida = new Date(dataSaida).getTime();
  const diffEmHoras = Math.abs(saida - entrada) / 36e5; // 36e5 = milissegundos em 1 hora

  if (diffEmHoras <= 4) return 'SCALPING';
  if (diffEmHoras <= 48) return 'DAY_TRADE';
  if (diffEmHoras <= 720) return 'SWING_TRADE'; // 30 dias * 24h
  return 'POSITION';
};

function getLogoUrl(ticker: string): string {
  const mapaLogos: Record<string, string> = {
    'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    'XRP': 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    'AVAX': 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
    'LINK': 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
    'DOGE': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    'ADA': 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    'MATIC': 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png',
    'XVS': 'https://assets.coingecko.com/coins/images/11867/large/Venus-logo.png',
    'ICP': 'https://assets.coingecko.com/coins/images/14495/large/Infinity.png',
    'BNB': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
  };
  return mapaLogos[ticker] || `https://cryptoicons.org/api/icon/${ticker.toLowerCase()}/32`;
}

interface PositionTrackItem {
  label: string;
  preco: number;
  tipo: 'stop' | 'entrada' | 'alvo';
}

function calcularPosicoesTrack(trade: any): { posicoes: PositionTrackItem[]; posicaoTriangulo: number } {
  const compra = Number(trade.compra) || 0;
  const stopLoss = Number(trade.stopLoss) || 0;
  const cotacao = Number(trade.cotacao) || compra;
  const alvo1 = Number(trade.alvo1) || 0;
  const alvo2 = Number(trade.alvo2) || 0;
  const alvo3 = Number(trade.alvo3) || 0;
  const direcao = trade.direcao || 'LONG';

  const distanciaStop = Math.abs(compra - stopLoss);

  let s1, s2, s3;
  if (direcao === 'LONG') {
    s1 = compra - (distanciaStop * 0.30);
    s2 = compra - (distanciaStop * 0.70);
    s3 = stopLoss;
  } else {
    s1 = compra + (distanciaStop * 0.30);
    s2 = compra + (distanciaStop * 0.70);
    s3 = stopLoss;
  }

  let posicoes: PositionTrackItem[];
  if (direcao === 'LONG') {
    posicoes = [
      { label: 'S3', preco: s3, tipo: 'stop' },
      { label: 'S2', preco: s2, tipo: 'stop' },
      { label: 'S1', preco: s1, tipo: 'stop' },
      { label: 'E', preco: compra, tipo: 'entrada' },
      { label: 'A1', preco: alvo1, tipo: 'alvo' },
      { label: 'A2', preco: alvo2, tipo: 'alvo' },
      { label: 'A3', preco: alvo3, tipo: 'alvo' },
    ];
  } else {
    posicoes = [
      { label: 'A3', preco: alvo3, tipo: 'alvo' },
      { label: 'A2', preco: alvo2, tipo: 'alvo' },
      { label: 'A1', preco: alvo1, tipo: 'alvo' },
      { label: 'E', preco: compra, tipo: 'entrada' },
      { label: 'S1', preco: s1, tipo: 'stop' },
      { label: 'S2', preco: s2, tipo: 'stop' },
      { label: 'S3', preco: s3, tipo: 'stop' },
    ];
  }

  let posicaoTriangulo = 3;
  let menorDistancia = Infinity;

  posicoes.forEach((pos, index) => {
    if (pos.preco > 0) {
      const dist = Math.abs(cotacao - pos.preco);
      if (dist < menorDistancia) {
        menorDistancia = dist;
        posicaoTriangulo = index;
      }
    }
  });

  if (trade.status !== 'OPEN' && trade.trackPosicao !== undefined) {
    posicaoTriangulo = trade.trackPosicao;
  }

  return { posicoes, posicaoTriangulo };
}

function corTriangulo(posicaoTriangulo: number, status: string, direcao: 'LONG' | 'SHORT'): string {
  if (status === 'WIN') return 'text-green-400';
  if (status === 'LOSS') return 'text-red-400';
  if (status === 'CLOSE') return 'text-zinc-500';

  if (direcao === 'LONG') {
    if (posicaoTriangulo <= 1) return 'text-red-400';
    if (posicaoTriangulo === 2) return 'text-yellow-400';
    if (posicaoTriangulo === 3) return 'text-blue-400';
    return 'text-green-400';
  } else {
    if (posicaoTriangulo <= 2) return 'text-green-400';
    if (posicaoTriangulo === 3) return 'text-blue-400';
    if (posicaoTriangulo === 4) return 'text-yellow-400';
    return 'text-red-400';
  }
}

interface TradeDeskViewProps {
  trades: Trade[];
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  coinPrices: CoinPrice[];
  setCoinPrices: React.Dispatch<React.SetStateAction<CoinPrice[]>>;
  institutions: Instituicao[];
  onDeleteTrade: (id: string) => void;
  onRegisterDetailedTrade: (newTradeData: any) => void;
  onEditTrade: (trade: Trade) => void;
  showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
  setIsCsvImportOpen: (isOpen: boolean) => void;
  isSimulating: boolean;
  setIsSimulating: React.Dispatch<React.SetStateAction<boolean>>;
  simulatedActivePnL: number;
  setSimulatedActivePnL: React.Dispatch<React.SetStateAction<number>>;
  downloadCsvTemplate: () => void;
  onLaunchTradeClick: () => void;
  saldoBanca: number;
  setSaldoBanca: React.Dispatch<React.SetStateAction<number>>;
  brokerAccounts?: BrokerAccount[];
  onNavigateToBrokerConnections?: () => void;
  onResetAllData?: () => void;
}

export default function TradeDeskView({
  trades,
  setTrades,
  coinPrices,
  setCoinPrices,
  institutions,
  onDeleteTrade,
  onRegisterDetailedTrade,
  onEditTrade,
  showNotification,
  setIsCsvImportOpen,
  isSimulating,
  setIsSimulating,
  simulatedActivePnL,
  setSimulatedActivePnL,
  downloadCsvTemplate,
  onLaunchTradeClick,
  saldoBanca,
  setSaldoBanca,
  brokerAccounts = [],
  onNavigateToBrokerConnections,
  onResetAllData,
}: TradeDeskViewProps) {
  
  // Filtra apenas os trades que já foram encerrados (Fechado_Gain ou Fechado_Loss)
  const tradesFechados = trades.filter(t => t.status === 'Fechado_Gain' || t.status === 'Fechado_Loss');

  // 1. Win Rate
  const totalFechados = tradesFechados.length;
  const totalWins = tradesFechados.filter(t => t.status === 'Fechado_Gain').length;
  const winRate = totalFechados > 0 ? (totalWins / totalFechados) * 100 : 0;

  // 2. PNL Total e Fator de Lucro (Profit Factor)
  let grossProfit = 0;
  let grossLoss = 0;

  // Agrupamento para descobrir o melhor ativo
  const pnlPorAtivo: Record<string, number> = {};

  tradesFechados.forEach(t => {
    const pnl = t.pnl_realizado;
    const ativo = t.moeda;

    // Soma PNL
    if (pnl > 0) grossProfit += pnl;
    else grossLoss += Math.abs(pnl);

    // Agrupa por ativo
    if (ativo) {
      const uppercaseAtivo = ativo.toUpperCase();
      if (!pnlPorAtivo[uppercaseAtivo]) pnlPorAtivo[uppercaseAtivo] = 0;
      pnlPorAtivo[uppercaseAtivo] += pnl;
    }
  });

  const pnlTotal = grossProfit - grossLoss;
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99.99 : 0);

  // 3. Melhor Ativo (o que tem o maior PNL acumulado)
  const melhorAtivo = Object.keys(pnlPorAtivo).length > 0 
    ? Object.keys(pnlPorAtivo).reduce((a, b) => pnlPorAtivo[a] > pnlPorAtivo[b] ? a : b) 
    : '—';

  // ─── PREPARAÇÃO DOS DADOS DO GRÁFICO (V2 - COM FILTROS) ───

  // Filter states
  const [filtroGrafico, setFiltroGrafico] = useState('TODOS');

  // 1. Extrair lista de ativos únicos para os botões de filtro
  const ativosUnicos = ['TODOS', ...new Set(tradesFechados.map(t => t.moeda?.toUpperCase()).filter(Boolean))];

  // 2. Filtrar os trades de acordo com a seleção
  const tradesParaGrafico = filtroGrafico === 'TODOS' 
    ? [...tradesFechados].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    : [...tradesFechados].filter(t => t.moeda?.toUpperCase() === filtroGrafico).sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

  // 3. Descobrir o Melhor e Pior Trade deste filtro
  let melhorTrade: any = null;
  let piorTrade: any = null;

  if (tradesParaGrafico.length > 0) {
    melhorTrade = tradesParaGrafico.reduce((max, t) => t.pnl_realizado > max.pnl_realizado ? t : max, tradesParaGrafico[0]);
    piorTrade = tradesParaGrafico.reduce((min, t) => t.pnl_realizado < min.pnl_realizado ? t : min, tradesParaGrafico[0]);
  }

  // 4. Montar os dados para o Recharts
  const bancaInicial = saldoBanca - pnlTotal; 
  // Se for TODOS, mostra a banca real. Se for um ativo, começa do 0 para ver o PNL isolado.
  let saldoAcumulado = filtroGrafico === 'TODOS' ? bancaInicial : 0; 

  const dadosGrafico = [{
    nome: 'Início',
    pnlDesteTrade: 0,
    ativo: '',
    equity: saldoAcumulado
  }];

  tradesParaGrafico.forEach((t, index) => {
    saldoAcumulado += t.pnl_realizado;
    dadosGrafico.push({
      nome: `Trade ${index + 1}`,
      ativo: t.moeda,
      pnlDesteTrade: t.pnl_realizado,
      equity: saldoAcumulado
    });
  });

  // Filter states
  const [tickerFilter, setTickerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'Todos'>('Todos');
  const [filtroConta, setFiltroConta] = useState<string>('Todas');
  const [showAddForm, setShowAddForm] = useState(false);

  // Modal Encerramento State
  const [modalEncerramento, setModalEncerramento] = useState<{
    isOpen: boolean;
    trade: any;
    cotacaoSaida: string;
    dataSaida: string;
    tipoSaida: 'TOTAL' | 'PARCIAL';
    quantidadeSaida: string | number;
  }>({
    isOpen: false,
    trade: null, // Objeto do trade sendo encerrado
    cotacaoSaida: '',
    dataSaida: new Date().toISOString().slice(0, 16), // Formato YYYY-MM-DDTHH:mm
    tipoSaida: 'TOTAL', // 'TOTAL' ou 'PARCIAL'
    quantidadeSaida: '', // Quantidade que está sendo vendida/comprada agora
  });

  // Modal Detalhes (Raio-X) State
  const [modalDetalhes, setModalDetalhes] = useState<{
    isOpen: boolean;
    trade: any;
    abaAtiva: 'RESUMO' | 'DIARIO' | 'EXECUCAO';
  }>({
    isOpen: false,
    trade: null,
    abaAtiva: 'RESUMO'
  });

  // Form states matching original manual entry
  const [formData, setFormData] = useState({
    exchange: 'Binance',
    moeda: 'BTC',
    preco_compra: '',
    quantidade: '',
    taxa_corretora_usd: '2.55',
    stop_loss: '',
    alvo_1: '',
    alvo_2: '',
    alvo_3: '',
    alvo_4: '',
    alvo_5: '',
    alvo_6: '',
  });

  // Share and lift simulator states
  const [ativoSimulador, setAtivoSimulador] = useState<string | null>(null);

  // Extrair apenas os ativos únicos que possuem trades com status 'Aberto'
  const ativosAbertosSimulador = [...new Set(trades.filter(t => t.status === 'Aberto').map(t => t.moeda?.toUpperCase()).filter(Boolean))];

  const activeTrades = trades.filter(t => t.status === 'Aberto');
  const uniqueTickers = Array.from(new Set(activeTrades.map(t => t.moeda.toUpperCase()))).sort();

  const handleSelectAtivo = (ativo: string | null) => {
    setAtivoSimulador(ativo);
  };

  // Calcula o PNL em tempo real no modal
  let pnlPreview = 0;
  let isWin = false;

  if (modalEncerramento.trade && modalEncerramento.cotacaoSaida && modalEncerramento.quantidadeSaida) {
    const entrada = parseFloat(modalEncerramento.trade.cotacaoCompra) || 0;
    const saida = parseFloat(modalEncerramento.cotacaoSaida) || 0;
    const qtdSaindo = parseFloat(modalEncerramento.quantidadeSaida.toString()) || 0;
    
    if (modalEncerramento.trade.direcao === 'LONG') {
      pnlPreview = (saida - entrada) * qtdSaindo;
    } else { // SHORT
      pnlPreview = (entrada - saida) * qtdSaindo;
    }
    
    isWin = pnlPreview > 0;
  }

  // Handle adding new trade from inline compact form
  const handleAddNewTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const { moeda, preco_compra, quantidade, taxa_corretora_usd } = formData;

    if (!moeda || !preco_compra || !quantidade) {
      showNotification('Preencha os campos obrigatórios (Moeda, Preço de Compra, Quantidade).', 'error');
      return;
    }

    const parsePrice = (val: string): number | null => {
      if (!val) return null;
      const clean = val.replace(',', '.').trim();
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? null : parsed;
    };

    const priceN = parsePrice(preco_compra);
    const qtyN = parsePrice(quantidade);
    const feeN = parsePrice(taxa_corretora_usd) || 0;

    if (priceN === null || priceN <= 0) {
      showNotification('Preço de Entrada deve ser um valor numérico maior que zero.', 'error');
      return;
    }
    if (qtyN === null || qtyN <= 0) {
      showNotification('A quantidade da posição deve ser maior que zero.', 'error');
      return;
    }

    const stopN = parsePrice(formData.stop_loss);
    const a1 = parsePrice(formData.alvo_1);
    const a2 = parsePrice(formData.alvo_2);
    const a3 = parsePrice(formData.alvo_3);
    const a4 = parsePrice(formData.alvo_4);
    const a5 = parsePrice(formData.alvo_5);
    const a6 = parsePrice(formData.alvo_6);

    if (a1 === null || isNaN(a1)) {
      showNotification('Take Profit - Alvo 1 é compulsório.', 'error');
      return;
    }

    // Call submit handler
    onRegisterDetailedTrade({
      data_hora: new Date().toISOString(),
      exchange: formData.exchange,
      moeda: moeda.toUpperCase().trim(),
      preco_compra: priceN,
      quantidade: qtyN,
      taxa_corretora_usd: feeN,
      stop_loss: stopN,
      alvo_1: a1,
      alvo_2: a2,
      alvo_3: a3,
      alvo_4: a4,
      alvo_5: a5,
      alvo_6: a6,
      tipo_operacao: 'Long',
      estrategia: 'Price Action',
      notas: 'Lançamento expresso via Trade Desk',
      moeda_taxa: 'USDT',
      quantidade_taxa: feeN
    });

    // Reset fields
    setFormData(prev => ({
      ...prev,
      moeda: 'BTC',
      preco_compra: '',
      quantidade: '',
      stop_loss: '',
      alvo_1: '',
      alvo_2: '',
      alvo_3: '',
      alvo_4: '',
      alvo_5: '',
      alvo_6: '',
    }));
    setShowAddForm(false);
  };

  // Filtered trades list output
  const filteredTrades = trades.filter(t => {
    const matchesTicker = t.moeda.toLowerCase().includes(tickerFilter.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' ? true : t.status === statusFilter;
    const matchesConta = filtroConta === 'Todas'
      ? true
      : (t.conta_corretora_nome === filtroConta || t.exchange === filtroConta);
    return matchesTicker && matchesStatus && matchesConta;
  });

  // Efeito para manter a simulação desativada por padrão ou quando não há simulação baseada em sliders
  useEffect(() => {
    setSimulatedActivePnL(0);
    setIsSimulating(false);
  }, [setSimulatedActivePnL, setIsSimulating]);

  // Export current filtered trades to CSV
  const handleExportCSV = () => {
    if (filteredTrades.length === 0) {
      showNotification('Não há dados filtrados para exportar.', 'error');
      return;
    }

    const headers = [
      'Data/Hora',
      'Moeda/Ativo',
      'Custódia/Exchange',
      'Tipo de Operação',
      'Preço de Entrada',
      'Quantidade',
      'Taxa Corretora (USD)',
      'Stop Loss',
      'Alvo 1',
      'Alvo 2',
      'Alvo 3',
      'Alvo 4',
      'Alvo 5',
      'Alvo 6',
      'Status',
      'PnL Realizado (USD)',
      'Notas'
    ];

    const rows = filteredTrades.map(trade => {
      const coinPriceObj = coinPrices.find(c => c.moeda.toUpperCase() === trade.moeda.toUpperCase());
      const livePrice = coinPriceObj ? coinPriceObj.current_price : trade.preco_compra;
      const currentPrice = livePrice;

      const isAberto = trade.status === 'Aberto';
      let pnlValue = 0;
      if (isAberto) {
        const originalCost = (trade.preco_compra * trade.quantidade) + trade.taxa_corretora_usd;
        const currentVal = currentPrice * trade.quantidade;
        pnlValue = currentVal - originalCost;
      } else {
        pnlValue = trade.pnl_realizado;
      }

      const escapeCSV = (val: string | null | undefined) => {
        if (val === null || val === undefined) return '';
        const s = String(val).replace(/"/g, '""');
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
          return `"${s}"`;
        }
        return s;
      };

      return [
        escapeCSV(trade.data_hora),
        escapeCSV(trade.moeda),
        escapeCSV(trade.exchange),
        escapeCSV(trade.tipo_operacao || 'Long'),
        trade.preco_compra,
        trade.quantidade,
        trade.taxa_corretora_usd,
        trade.stop_loss || '',
        trade.alvo_1 || '',
        trade.alvo_2 || '',
        trade.alvo_3 || '',
        trade.alvo_4 || '',
        trade.alvo_5 || '',
        trade.alvo_6 || '',
        escapeCSV(trade.status),
        Number(pnlValue.toFixed(4)),
        escapeCSV(trade.notas || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trade_desk_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification(`Exportação de ${filteredTrades.length} registros concluída com sucesso!`, 'success');
  };

  return (
    <div className="space-y-6 font-mono text-zinc-300 select-none">
      
      {/* Upper header action desk bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded bg-green-500 animate-pulse"></span>
            Mesa de Operações (Trade Desk)
          </h2>
          <p className="text-[10px] text-zinc-550 uppercase mt-0.5 font-semibold">Terminais de monitoramento em tempo real e ordem expressa</p>
        </div>

        {/* Action Panel and CSV Uploaders */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onLaunchTradeClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black font-extrabold rounded text-[10px] transition-all cursor-pointer shadow"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3px]" />
            LANÇAR TRADE
          </button>

          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 text-green-400 font-bold rounded text-[10px] transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            IMPORTAR CSV
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-750 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold rounded text-[10px] transition-all cursor-pointer shadow"
            title="Exportar dados filtrados da mesa de operações para arquivo CSV"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            EXPORTAR CSV
          </button>

          <button
            onClick={downloadCsvTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-white rounded text-[10px] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            OBTER TEMPLATE
          </button>

          {onNavigateToBrokerConnections && (
            <button
              onClick={onNavigateToBrokerConnections}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-bold rounded text-[10px] transition-all cursor-pointer shadow"
              title="Gerenciar conexões de API com corretoras"
            >
              <Link2 className="w-3.5 h-3.5 text-green-400" />
              CONEXÕES API ({brokerAccounts.length})
            </button>
          )}
        </div>
      </div>

      {/* Display do Saldo da Banca */}
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏦</span>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider leading-none">
              Saldo da Conta (Bankroll Global)
            </span>
            <span className="text-[9px] text-zinc-500 uppercase mt-0.5 font-semibold">Impacto cumulativo de suas operações finalizadas</span>
          </div>
        </div>
        <span className="text-lg font-mono font-bold text-zinc-100">
          $ {saldoBanca.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* ─── DASHBOARD DE ESTATÍSTICAS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Win Rate */}
        <div className="bg-[#0c0c0e]/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Win Rate</span>
            <span className="text-lg">🎯</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-mono font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {winRate.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              ({totalWins}/{totalFechados})
            </span>
          </div>
        </div>

        {/* Card 2: PNL Total */}
        <div className="bg-[#0c0c0e]/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">PNL Total</span>
            <span className="text-lg">💰</span>
          </div>
          <span className={`text-2xl font-mono font-bold ${pnlTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnlTotal >= 0 ? '+' : '-'}$ {Math.abs(pnlTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Card 3: Profit Factor */}
        <div className="bg-[#0c0c0e]/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow-sm relative group cursor-help">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Profit Factor</span>
            <span className="text-lg">⚖️</span>
          </div>
          <span className={`text-2xl font-mono font-bold ${profitFactor >= 1.5 ? 'text-green-400' : profitFactor >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
            {profitFactor.toFixed(2)}x
          </span>
          
          {/* Tooltip explicativo (aparece no hover) */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
            Média de Ganhos dividida pela Média de Perdas. Acima de 1.5x é excelente.
          </div>
        </div>

        {/* Card 4: Melhor Ativo */}
        <div className="bg-[#0c0c0e]/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Melhor Ativo</span>
            <span className="text-lg">🏆</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-violet-400">
              {melhorAtivo}
            </span>
            {melhorAtivo !== '—' && (
              <span className="text-xs text-green-400 font-mono">
                +$ {pnlPorAtivo[melhorAtivo]?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

      </div>



      {/* 1. Tabela "Ativos e Metas" (100% de largura) */}
      <div className="w-full bg-[#0c0c0e]/80 border border-zinc-800 rounded-lg p-5">
        
        {/* Table Header Filter tools */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-900">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Ativos e Metas</h3>
            <p className="text-[9px] text-zinc-500">Monitorando {filteredTrades.length} ativos</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
              <input
                type="text"
                placeholder="Ativo (ex BTC)"
                value={tickerFilter}
                onChange={(e) => setTickerFilter(e.target.value)}
                className="pl-8 pr-2.5 py-1 w-[125px] bg-zinc-950 border border-zinc-850 text-[10px] font-mono rounded text-zinc-200 focus:outline-none focus:border-green-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#09090b] border border-zinc-850 text-[10px] font-mono rounded p-1 text-zinc-300 focus:outline-none focus:border-green-500 cursor-pointer"
            >
              <option value="Todos">Filtro: Todos</option>
              <option value="Aberto">Posição: Aberto</option>
              <option value="Fechado_Gain">Sucesso: Gain</option>
              <option value="Fechado_Loss">Fracasso: Loss</option>
            </select>

            {brokerAccounts && brokerAccounts.length > 0 && (
              <select
                value={filtroConta}
                onChange={(e) => setFiltroConta(e.target.value)}
                className="bg-[#09090b] border border-zinc-850 text-[10px] font-mono rounded p-1 text-zinc-300 focus:outline-none focus:border-green-500 cursor-pointer max-w-[140px] truncate"
                title="Filtrar por conta específica da corretora"
              >
                <option value="Todas">Conta: Todas</option>
                {brokerAccounts.map((acc) => (
                  <option key={acc.id} value={acc.nome_conta}>
                    {acc.broker}: {acc.nome_conta}
                  </option>
                ))}
              </select>
            )}

            <button 
              onClick={() => {
                if (onResetAllData) {
                  onResetAllData();
                } else {
                  setTrades([]);
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('@kryp-terminal:trades');
                  }
                  showNotification('Trades zerados com sucesso!', 'info');
                }
              }}
              className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/20 transition-colors ml-2 cursor-pointer font-bold"
              title="Apaga os dados e zera o terminal para iniciar lançamentos reais"
            >
              Zerar Dados
            </button>
          </div>
        </div>

        {/* Legend of Colors */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1">
            <span className="status-triangle" style={{ color: '#71717a' }}>▲</span>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase">LONG</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="status-triangle" style={{ color: '#71717a' }}>▼</span>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase">SHORT</span>
          </div>
          <div className="w-px h-3 bg-zinc-800 mx-1" />
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase">OPEN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase">WIN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase">LOSS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#71717a]"></span>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase">CLOSE</span>
          </div>
        </div>

        {/* Scrollable table container with maximum height [60vh] and vertical internal scroll */}
        <div className="overflow-auto border border-zinc-900/65 rounded bg-[#09090b]/55" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <table className="w-full text-left font-mono text-[11px] border-collapse relative">
            <thead className="sticky top-0 z-10 bg-[#0a0a0a]">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left col-data bg-[#0a0a0a]">DATA</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left col-ticker bg-[#0a0a0a]">TICKER</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left col-compra bg-[#0a0a0a]">COMPRA</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left col-qtd bg-[#0a0a0a]">VALOR TOTAL</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left col-pnl bg-[#0a0a0a]">PNL</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left bg-[#0a0a0a]">STOP LOSS</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left min-w-[280px] col-track bg-[#0a0a0a]">TRACK</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left bg-[#0a0a0a]">ALVO FINAL</th>
                <th className="px-2 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left bg-[#0a0a0a]">INSTITUIÇÃO</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left col-opcoes bg-[#0a0a0a]">OPÇÕES</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredTrades.length > 0 ? (
                  filteredTrades.map((originalTrade, index) => {
                    const coinPriceObj = coinPrices.find(c => c.moeda.toUpperCase() === originalTrade.moeda.toUpperCase());
                    const livePrice = coinPriceObj ? coinPriceObj.current_price : originalTrade.preco_compra;
                    
                    const currentPrice = livePrice;

                    const isAberto = originalTrade.status === 'Aberto';
                    
                    // Live yield indicators
                    let estimatedPnlValue = 0;

                    if (isAberto) {
                      const originalCost = (originalTrade.preco_compra * originalTrade.quantidade) + originalTrade.taxa_corretora_usd;
                      const currentVal = currentPrice * originalTrade.quantidade;
                      estimatedPnlValue = currentVal - originalCost;
                    } else {
                      estimatedPnlValue = originalTrade.pnl_realizado;
                    }

                    // Map originalTrade properties to the user's expected mockTrade property names
                    const trade = {
                      id: originalTrade.id,
                      ticker: originalTrade.moeda,
                      ativo: originalTrade.moeda,
                      dataEntrada: originalTrade.data_hora,
                      cotacaoCompra: originalTrade.preco_compra,
                      compra: originalTrade.preco_compra,
                      quantidade: originalTrade.quantidade,
                      date: originalTrade.data_hora.includes('T')
                        ? new Date(originalTrade.data_hora).toLocaleDateString('pt-BR')
                        : originalTrade.data_hora,
                      institution: originalTrade.exchange,
                      instituicao: originalTrade.exchange,
                      buyPrice: originalTrade.preco_compra,
                      quantity: originalTrade.quantidade,
                      stopLoss: originalTrade.stop_loss || 0,
                      targets: [
                        originalTrade.alvo_1,
                        originalTrade.alvo_2,
                        originalTrade.alvo_3,
                        originalTrade.alvo_4,
                        originalTrade.alvo_5,
                        originalTrade.alvo_6
                      ],
                      alvo1: originalTrade.alvo_1 || 0,
                      alvo2: originalTrade.alvo_2 || 0,
                      alvo3: originalTrade.alvo_3 || 0,
                      trackPosicao: originalTrade.trackPosicao,
                      status: originalTrade.status === 'Aberto' 
                        ? 'ABERTO' 
                        : originalTrade.status === 'Fechado_Gain' 
                          ? 'WIN' 
                          : originalTrade.status === 'Fechado_Loss' 
                            ? 'LOSS' 
                            : 'FECHADO',
                      pnl: originalTrade.status === 'Aberto' ? estimatedPnlValue : originalTrade.pnl_realizado,
                      direcao: (originalTrade.tipo_operacao?.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG') as 'LONG' | 'SHORT',
                      quantidadeRestante: originalTrade.quantidade_restante !== undefined ? originalTrade.quantidade_restante : originalTrade.quantidade,
                      cotacao: currentPrice,
                      taxa: originalTrade.taxa_corretora_usd || 0
                    };

                    return (
                      <tr 
                        key={`${originalTrade.id || 'trade'}-${index}`} 
                        className={`border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/40 ${
                          index % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'
                        }`}
                      >
                        {/* DATA */}
                        <td className="w-[95px] py-3 pl-2 pr-1 text-[10px] font-mono text-zinc-500 whitespace-nowrap text-left">
                          {trade.date}
                        </td>

                        {/* TICKER */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={getLogoUrl(trade.ticker)}
                              alt={trade.ticker}
                              className="w-5 h-5 rounded-full"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span className="text-white font-bold text-sm">{trade.ticker}</span>
                          </div>
                        </td>

                        {/* COMPRA */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-right">
                            <span className="text-white font-mono text-sm">${trade.compra?.toFixed(4)}</span>
                            <span className="text-zinc-500 font-mono text-xs">${trade.cotacao?.toFixed(4) || '—'}</span>
                          </div>
                        </td>

                        {/* VALOR TOTAL */}
                        <td className="py-3 w-[120px] px-2 text-right font-mono text-sm text-white whitespace-nowrap">
                          $ {calcularValorTotal(trade).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* PNL */}
                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                          {(() => {
                            let valorPnl = Number(trade.pnl) || 0;

                            // Se a operação estiver ABERTA, calcula o PNL Flutuante (Unrealized PNL)
                            if (trade.status === 'OPEN' || trade.status === 'ABERTO') {
                              const cotacao = Number(trade.cotacao) || Number(trade.compra);
                              const compra = Number(trade.compra) || 0;
                              const qtd = Number(trade.quantidade) || 0;
                              const taxa = Number(trade.taxa) || 0;

                              if (trade.direcao === 'LONG') {
                                valorPnl = ((cotacao - compra) * qtd) - taxa;
                              } else if (trade.direcao === 'SHORT') {
                                valorPnl = ((compra - cotacao) * qtd) - taxa;
                              }
                            }

                            const isGain = valorPnl >= 0;

                            return (
                              <span className={`font-bold font-mono tracking-tight ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isGain ? '+' : '-'}$ {Math.abs(valorPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            );
                          })()}
                        </td>

                        {/* STOP LOSS */}
                        <td className="px-4 py-3">
                          {(() => {
                            const isStopGain = trade.direcao === 'LONG' ? trade.stopLoss > trade.compra : trade.stopLoss < trade.compra;
                            return (
                              <span className={`font-mono text-sm font-bold ${isStopGain ? 'text-green-400' : 'text-red-400'}`}>
                                ${trade.stopLoss?.toFixed(4)}
                              </span>
                            );
                          })()}
                        </td>

                        {/* TRACK — nova barra visual horizontal */}
                        <td className="px-4 py-3 min-w-[280px]">
                          {(() => {
                            const { posicoes, posicaoTriangulo } = calcularPosicoesTrack(trade);
                            const cor = corTriangulo(posicaoTriangulo, trade.status, trade.direcao);
                            const simboloTriangulo = trade.direcao === 'LONG' ? '▲' : '▼';

                            return (
                              <div className="flex items-center gap-2 w-full">
                                <span className={`text-lg font-bold ${cor} flex-shrink-0`}>
                                  {simboloTriangulo}
                                </span>
                                <div className="flex flex-col gap-1 flex-1">
                                  <div className="flex justify-between w-full">
                                    {posicoes.map((pos, index) => (
                                      <div key={index} className="flex flex-col items-center" style={{ width: '14.28%' }}>
                                        {posicaoTriangulo === index ? (
                                          <span className={`text-sm font-bold leading-none ${cor}`}>
                                            {simboloTriangulo}
                                          </span>
                                        ) : (
                                          <span className="text-transparent text-sm leading-none">▲</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex justify-between w-full">
                                    {posicoes.map((pos, index) => {
                                      const isAtivo = posicaoTriangulo === index;
                                      const corLabel = pos.tipo === 'stop'
                                        ? (isAtivo ? 'text-red-400' : 'text-zinc-600')
                                        : pos.tipo === 'alvo'
                                          ? (isAtivo ? 'text-green-400' : 'text-zinc-600')
                                          : (isAtivo ? 'text-blue-400' : 'text-zinc-500');
                                      return (
                                        <div key={index} className="flex flex-col items-center" style={{ width: '14.28%' }}>
                                          <div className={`text-[9px] font-bold ${corLabel}`}>
                                            {pos.label}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        posicaoTriangulo <= 2
                                          ? 'bg-gradient-to-r from-red-500 to-yellow-500'
                                          : posicaoTriangulo === 3
                                            ? 'bg-blue-500'
                                            : 'bg-gradient-to-r from-green-500 to-emerald-400'
                                      }`}
                                      style={{ width: `${(posicaoTriangulo / 6) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* ALVO FINAL — valor do último alvo */}
                        <td className="py-3 w-[120px] px-2 text-left whitespace-nowrap">
                          {(() => {
                            // Pega o último alvo com valor > 0, do A5 para trás
                            const ultimoAlvoValido = trade.targets
                              ?.slice(0, 5)   // considera apenas A1 a A5
                              .reverse()      // começa do A5 backwards
                              .find(t => t && t > 0); // primeiro maior que zero

                            return (
                              <span 
                                className="text-xs font-mono text-green-500 font-bold"
                                title={ultimoAlvoValido ? `$ ${formatPreciso(ultimoAlvoValido)}` : '-'}
                              >
                                {ultimoAlvoValido
                                  ? `$${formatSmart(ultimoAlvoValido)}`
                                  : '-'}
                              </span>
                            );
                          })()}
                        </td>

                        {/* INSTITUIÇÃO */}
                        <td className="px-2 py-3 text-left">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-zinc-300 text-xs font-semibold">{trade.instituicao}</span>
                            {originalTrade.conta_corretora_nome && (
                              <span className="text-[9px] bg-zinc-900 border border-zinc-750 text-green-400 font-mono px-1.5 py-0.5 rounded truncate max-w-[130px] flex items-center gap-1" title={originalTrade.conta_corretora_nome}>
                                <span className="w-1 h-1 rounded-full bg-green-500 shrink-0"></span>
                                {originalTrade.conta_corretora_nome}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* OPÇÕES */}
                        <td className="py-3 px-2 text-center col-opcoes">
                          <div className="flex items-center justify-center gap-2">
                            {trade.status === 'ABERTO' || trade.status === 'OPEN' ? (
                              <button 
                                onClick={() => setModalEncerramento({
                                  isOpen: true,
                                  trade: trade,
                                  cotacaoSaida: '',
                                  dataSaida: new Date().toISOString().slice(0, 16),
                                  tipoSaida: 'TOTAL',
                                  quantidadeSaida: trade.quantidadeRestante || trade.quantidade // Puxa o saldo atual
                                })}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded border border-zinc-600 transition-colors cursor-pointer"
                              >
                                Saída
                              </button>
                            ) : (
                              <button 
                                onClick={() => setModalDetalhes({ 
                                  isOpen: true, 
                                  trade: { ...trade, originalTrade }, 
                                  abaAtiva: 'RESUMO' 
                                })}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded border border-zinc-600 transition-colors cursor-pointer"
                              >
                                Detalhes
                              </button>
                            )}
                            <button 
                              onClick={() => onEditTrade(originalTrade)}
                              className="text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer" 
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => onDeleteTrade(originalTrade.id)}
                              className="text-zinc-550 hover:text-red-500 transition-colors cursor-pointer" 
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-zinc-550 uppercase">
                      Nenhuma posição filtrada nesta sessão da mesa de operações.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>

        {/* High Density Ledgers Summary Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-zinc-550 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Listando {filteredTrades.length} registros • Total geral: {trades.length} trades</span>
          <span>Total Custos Corretora: $ {trades.reduce((acc, t) => acc + t.taxa_corretora_usd, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* ─── SIMULADOR INTERATIVO (Passo 114) ─── */}
      <div className="bg-[#0c0c0e]/80 border border-zinc-800 p-6 rounded-xl shadow-sm mb-6 flex flex-col">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
              Projetor de Risco / Retorno
            </span>
          </div>
          {ativoSimulador && (
            <button
              onClick={() => handleSelectAtivo(null)}
              className="text-[9px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest font-bold border border-zinc-800 px-2.5 py-1 rounded transition-all cursor-pointer"
            >
              Limpar Seleção
            </button>
          )}
        </div>

        {/* Linha de Seleção de Ativos */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ativosAbertosSimulador.map((ativo, index) => {
            const isSelected = ativoSimulador === ativo;
            return (
              <button
                key={`${ativo}-${index}`}
                onClick={() => handleSelectAtivo(isSelected ? null : ativo)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-violet-600/20 border-violet-500/50 text-white ring-2 ring-violet-500/30 shadow-md shadow-violet-950/20' 
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <img 
                  src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/svg/color/${ativo.toLowerCase()}.svg`} 
                  alt={ativo}
                  className="w-4 h-4 rounded-full shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
                <span>{ativo}</span>
              </button>
            );
          })}
          {ativosAbertosSimulador.length === 0 && (
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">
              Não há posições abertas para análise de risco.
            </span>
          )}
        </div>

        {/* Renderização Condicional do Conteúdo */}
        {!ativoSimulador ? (
          <div className="text-center py-12 bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              Selecione um ativo em aberto acima para projetar cenários de risco/retorno.
            </p>
          </div>
        ) : (() => {
          const tradesDoAtivo = activeTrades.filter(t => t.moeda.toUpperCase() === ativoSimulador.toUpperCase());
          const originalTrade = tradesDoAtivo[0];
          if (!originalTrade) return null;

          const trade = {
            id: originalTrade.id,
            ticker: originalTrade.moeda,
            ativo: originalTrade.moeda,
            compra: originalTrade.preco_compra,
            quantidade: originalTrade.quantidade,
            stopLoss: originalTrade.stop_loss || 0,
            targets: [
              originalTrade.alvo_1,
              originalTrade.alvo_2,
              originalTrade.alvo_3,
              originalTrade.alvo_4,
              originalTrade.alvo_5,
              originalTrade.alvo_6
            ].filter(Boolean) as number[],
            direcao: (originalTrade.tipo_operacao?.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG') as 'LONG' | 'SHORT',
          };

          const stopLossVal = trade.stopLoss || (trade.direcao === 'SHORT' ? trade.compra * 1.1 : trade.compra * 0.9);
          const alvoFinal = trade.targets[trade.targets.length - 1] || (trade.direcao === 'LONG' ? trade.compra * 1.1 : trade.compra * 0.9);

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {/* Pior Cenário (Stop Loss) */}
              {(() => {
                const isStopGain = trade.direcao === 'LONG' ? trade.stopLoss > trade.compra : trade.stopLoss < trade.compra;
                const stopPnl = trade.direcao === 'LONG' ? (trade.stopLoss - trade.compra) * trade.quantidade : (trade.compra - trade.stopLoss) * trade.quantidade;
                
                return (
                  <div className={`${isStopGain ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} border p-5 rounded-xl flex flex-col items-center justify-center text-center transition-colors`}>
                    <span className={`${isStopGain ? 'text-green-400' : 'text-red-400'} text-xs font-bold uppercase tracking-wider mb-1`}>
                      Pior Cenário ({isStopGain ? 'Gain' : 'Stop'})
                    </span>
                    <span className="text-white font-mono text-xl mb-2">${trade.stopLoss?.toFixed(4) || '0.0000'}</span>
                    <div className={`${isStopGain ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} px-3 py-1 rounded font-mono text-sm font-bold`}>
                      {stopPnl >= 0 ? '+' : '-'}$ {Math.abs(stopPnl).toFixed(2)}
                    </div>
                  </div>
                );
              })()}

              {/* Cenário Atual (Breakeven/Mercado) */}
              <div className="bg-zinc-900 border border-zinc-700 p-5 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Preço de Entrada</span>
                <span className="text-white font-mono text-xl mb-2">${trade.compra.toFixed(4)}</span>
                <div className="bg-zinc-800 px-3 py-1 rounded text-zinc-300 font-mono text-sm font-bold">
                  Risco em Jogo
                </div>
              </div>

              {/* Melhor Cenário (Alvo Final) */}
              <div className="bg-green-500/10 border border-green-500/30 p-5 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">Melhor Cenário (Alvo)</span>
                <span className="text-white font-mono text-xl mb-2">${alvoFinal.toFixed(4)}</span>
                <div className="bg-green-500/20 px-3 py-1 rounded text-green-400 font-mono text-sm font-bold">
                  {trade.direcao === 'LONG' 
                    ? `+$ ${Math.abs((alvoFinal - trade.compra) * trade.quantidade).toFixed(2)}` 
                    : `+$ ${Math.abs((trade.compra - alvoFinal) * trade.quantidade).toFixed(2)}`}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Curva de Capital (agora abaixo do Projetor de Risco) */}
        {tradesFechados.length > 0 && (
          <div className="bg-[#0c0c0e]/80 border border-zinc-800 p-5 rounded-xl mt-6 shadow-sm flex flex-col">
            
            {/* Header do Gráfico: Título e Filtros */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📈</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    Curva de Capital
                  </span>
                </div>
                
                {/* Botões de Filtro por Ativo */}
                <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {ativosUnicos.map((ativo, index) => (
                    <button
                      key={`${ativo}-${index}`}
                      onClick={() => setFiltroGrafico(ativo)}
                      className={`px-3 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                        filtroGrafico === ativo 
                          ? 'bg-violet-600 text-white shadow' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {ativo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mini-Métricas: Melhor e Pior Trade */}
              {melhorTrade && piorTrade && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase text-zinc-500 font-bold">Melhor Trade</span>
                    <span className="text-xs font-mono text-green-400 font-bold">
                      +{melhorTrade.pnl_realizado.toFixed(2)} <span className="text-zinc-600">({melhorTrade.moeda})</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end border-l border-zinc-800 pl-4">
                    <span className="text-[9px] uppercase text-zinc-500 font-bold">Pior Trade</span>
                    <span className="text-xs font-mono text-red-400 font-bold">
                      {piorTrade.pnl_realizado.toFixed(2)} <span className="text-zinc-600">({piorTrade.moeda})</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Área do Gráfico */}
            <div className="w-full h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGrafico} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={filtroGrafico === 'TODOS' ? '#8b5cf6' : '#3b82f6'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={filtroGrafico === 'TODOS' ? '#8b5cf6' : '#3b82f6'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="nome" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ color: filtroGrafico === 'TODOS' ? '#a78bfa' : '#60a5fa', fontWeight: 'bold', fontFamily: 'monospace' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                    formatter={(value) => [
                      `$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
                      filtroGrafico === 'TODOS' ? 'Saldo' : 'Lucro Acumulado'
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        if (data.nome === 'Início') return filtroGrafico === 'TODOS' ? 'Saldo Inicial' : 'Início das Operações';
                        return `${data.nome} (${data.ativo}) | PNL: ${data.pnlDesteTrade > 0 ? '+' : ''}$${data.pnlDesteTrade.toFixed(2)}`;
                      }
                      return label;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="equity" 
                    stroke={filtroGrafico === 'TODOS' ? '#8b5cf6' : '#3b82f6'} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorEquity)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL DE ENCERRAMENTO DE OPERAÇÃO ─── */}
      {modalEncerramento.isOpen && modalEncerramento.trade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏁</span>
                <span className="text-sm uppercase tracking-wider text-zinc-100 font-bold">
                  Registrar Saída
                </span>
              </div>
              <button 
                onClick={() => setModalEncerramento({ ...modalEncerramento, isOpen: false })}
                className="text-zinc-555 hover:text-white cursor-pointer"
              >✕</button>
            </div>

            {/* Resumo do Trade */}
            <div className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg border border-zinc-700 mb-4">
              <div>
                <p className="text-[10px] uppercase text-zinc-500 font-semibold">Ativo</p>
                <p className="text-sm font-bold text-white">{modalEncerramento.trade.ativo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-500 font-semibold">Direção</p>
                <p className={`text-sm font-bold ${modalEncerramento.trade.direcao === 'SHORT' ? 'text-red-400' : 'text-green-400'}`}>
                  {modalEncerramento.trade.direcao}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-500 font-semibold">Entrada</p>
                <p className="text-sm font-mono text-zinc-300">$ {modalEncerramento.trade.cotacaoCompra}</p>
              </div>
            </div>

            {/* Tipo de Saída (Total vs Parcial) */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mb-4">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  modalEncerramento.tipoSaida === 'TOTAL' 
                    ? 'bg-zinc-800 text-white shadow' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                onClick={() => setModalEncerramento({ 
                  ...modalEncerramento, 
                  tipoSaida: 'TOTAL',
                  quantidadeSaida: modalEncerramento.trade.quantidadeRestante || modalEncerramento.trade.quantidade
                })}
              >
                ENCERRAMENTO TOTAL
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  modalEncerramento.tipoSaida === 'PARCIAL' 
                    ? 'bg-violet-600 text-white shadow' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                onClick={() => setModalEncerramento({ ...modalEncerramento, tipoSaida: 'PARCIAL' })}
              >
                SAÍDA PARCIAL
              </button>
            </div>

            {/* Campo de Quantidade (Aparece apenas se for PARCIAL) */}
            {modalEncerramento.tipoSaida === 'PARCIAL' && (
              <div className="flex flex-col mb-4 p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold">
                    Quantidade a Realizar
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    Disponível: {modalEncerramento.trade.quantidadeRestante || modalEncerramento.trade.quantidade}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    step="0.01"
                    className="input-padrao border-violet-500/50 focus:border-violet-400 text-sm py-1.5"
                    value={modalEncerramento.quantidadeSaida}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const max = parseFloat(modalEncerramento.trade.quantidadeRestante || modalEncerramento.trade.quantidade);
                      // Impede que o usuário digite mais do que ele tem
                      if (val > max) {
                        setModalEncerramento({...modalEncerramento, quantidadeSaida: max});
                      } else {
                        setModalEncerramento({...modalEncerramento, quantidadeSaida: e.target.value});
                      }
                    }}
                  />
                  {/* Botões rápidos de % */}
                  <div className="flex gap-1">
                    {[25, 50, 75].map(pct => (
                      <button 
                        key={pct}
                        type="button"
                        className="px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded border border-zinc-700 cursor-pointer"
                        onClick={() => {
                          const max = parseFloat(modalEncerramento.trade.quantidadeRestante || modalEncerramento.trade.quantidade);
                          setModalEncerramento({...modalEncerramento, quantidadeSaida: Number((max * (pct/100)).toFixed(4))});
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Campos de Saída */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                  Data e Hora de Saída
                </label>
                <input 
                  type="datetime-local" 
                  className="input-padrao"
                  value={modalEncerramento.dataSaida}
                  onChange={(e) => setModalEncerramento({...modalEncerramento, dataSaida: e.target.value})}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                  Cotação de Saída (USD)
                </label>
                <input 
                  type="number" 
                  step="0.000001"
                  className="input-padrao text-lg font-mono"
                  placeholder="Ex: 65000.00"
                  value={modalEncerramento.cotacaoSaida}
                  onChange={(e) => setModalEncerramento({...modalEncerramento, cotacaoSaida: e.target.value})}
                  autoFocus
                />
              </div>
            </div>

            {/* Preview de Resultado (PNL) */}
            <div className={`p-4 rounded-lg border mb-6 flex flex-col items-center justify-center transition-colors ${
              !modalEncerramento.cotacaoSaida ? 'bg-zinc-950 border-zinc-800' :
              isWin ? 'bg-green-500/10 border-green-500/50' : 
              'bg-red-500/10 border-red-500/50'
            }`}>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                Resultado Estimado (PNL)
              </span>
              <span className={`text-2xl font-mono font-bold ${
                !modalEncerramento.cotacaoSaida ? 'text-zinc-650' :
                isWin ? 'text-green-400' : 'text-red-400'
              }`}>
                {pnlPreview > 0 ? '+' : ''}$ {Math.abs(pnlPreview).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <button 
                className={`flex-1 h-10 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  !modalEncerramento.cotacaoSaida || !modalEncerramento.quantidadeSaida
                    ? 'bg-zinc-700 cursor-not-allowed opacity-50' 
                    : isWin ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                }`}
                disabled={!modalEncerramento.cotacaoSaida || !modalEncerramento.quantidadeSaida}
                onClick={() => {
                  const isTotal = modalEncerramento.tipoSaida === 'TOTAL';
                  const classificacaoReal = classificarTempoTrade(modalEncerramento.trade.dataEntrada, modalEncerramento.dataSaida);
                  
                  console.log(`Registrando Saída ${isTotal ? 'TOTAL' : 'PARCIAL'}!`, {
                    quantidade: modalEncerramento.quantidadeSaida,
                    cotacaoSaida: modalEncerramento.cotacaoSaida,
                    pnlDestaSaida: pnlPreview,
                    statusFinal: isTotal ? (isWin ? 'WIN' : 'LOSS') : 'OPEN (Parcial)',
                    novoSaldoBanca: saldoBanca + pnlPreview
                  });

                  setSaldoBanca(prev => prev + pnlPreview);

                  const finalizedStatus = isWin ? 'Fechado_Gain' : 'Fechado_Loss';
                  
                  setTrades(prev => prev.map(t => {
                    if (t.id === modalEncerramento.trade.id) {
                      const operacao = {
                        ...t,
                        compra: t.preco_compra,
                        stopLoss: t.stop_loss || 0,
                        cotacao: parseFloat(modalEncerramento.cotacaoSaida),
                        alvo1: t.alvo_1 || 0,
                        alvo2: t.alvo_2 || 0,
                        alvo3: t.alvo_3 || 0,
                        direcao: t.tipo_operacao?.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG',
                        status: isTotal ? (isWin ? 'WIN' : 'LOSS') : 'ABERTO',
                        trackPosicao: undefined as number | undefined
                      };
                      const { posicaoTriangulo } = calcularPosicoesTrack(operacao);
                      operacao.trackPosicao = posicaoTriangulo;

                      if (isTotal) {
                        return { 
                          ...t, 
                          status: finalizedStatus, 
                          quantidade_restante: 0,
                          pnl_realizado: Number((t.pnl_realizado + pnlPreview).toFixed(4)),
                          trackPosicao: operacao.trackPosicao
                        };
                      } else {
                        const currentRemaining = t.quantidade_restante !== undefined ? t.quantidade_restante : t.quantidade;
                        const newRemaining = Math.max(0, currentRemaining - parseFloat(modalEncerramento.quantidadeSaida.toString()));
                        return {
                          ...t,
                          quantidade_restante: newRemaining,
                          pnl_realizado: Number((t.pnl_realizado + pnlPreview).toFixed(4)),
                          status: newRemaining <= 0 ? finalizedStatus : t.status,
                          trackPosicao: newRemaining <= 0 ? operacao.trackPosicao : t.trackPosicao
                        };
                      }
                    }
                    return t;
                  }));

                  showNotification(
                    isTotal 
                      ? `Operação encerrada! PNL Realizado: $ ${pnlPreview.toFixed(2)} (${classificacaoReal})`
                      : `Saída parcial registrada! PNL Realizado nesta parcial: $ ${pnlPreview.toFixed(2)}`, 
                    isWin ? 'success' : 'error'
                  );

                  setModalEncerramento({ isOpen: false, trade: null, cotacaoSaida: '', dataSaida: '', tipoSaida: 'TOTAL', quantidadeSaida: '' });
                }}
              >
                {modalEncerramento.tipoSaida === 'TOTAL' ? 'CONFIRMAR ENCERRAMENTO' : 'REGISTRAR PARCIAL'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL DE DETALHES (RAIO-X) ─── */}
      {(() => {
        if (!modalDetalhes.isOpen || !modalDetalhes.trade) return null;

        const parsedDiary = (() => {
          try {
            const notasStr = modalDetalhes.trade.originalTrade?.notas;
            if (notasStr && typeof notasStr === 'string' && (notasStr.startsWith('{') || notasStr.startsWith('['))) {
              return JSON.parse(notasStr);
            }
          } catch (e) {}
          return {};
        })();

        const tradeParaExibir = {
          ...modalDetalhes.trade,
          intencaoTrade: parsedDiary.intencaoTrade || 'Não definida',
          classificacaoTempo: parsedDiary.classificacaoTempo || (modalDetalhes.trade.originalTrade?.data_hora && modalDetalhes.trade.originalTrade?.data_saida 
            ? classificarTempoTrade(modalDetalhes.trade.originalTrade.data_hora, modalDetalhes.trade.originalTrade.data_saida) 
            : 'DAY_TRADE'),
          nota: parsedDiary.notaTrade || 0,
          seguiuPlano: parsedDiary.seguiuPlano === true || parsedDiary.seguiuPlano === 'Sim' || parsedDiary.seguiuPlano === 'yes' || parsedDiary.seguiuPlano === 'SIM',
          cometeuErro: parsedDiary.erroOperacional === true || parsedDiary.erroOperacional === 'Sim' || parsedDiary.erroOperacional === 'yes' || parsedDiary.erroOperacional === 'SIM',
          licoes: parsedDiary.licaoAprendida || 'Nenhuma anotação registrada para este trade.',
          alvo1: modalDetalhes.trade.targets ? modalDetalhes.trade.targets[0] : 0,
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* Header Fixo */}
              <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      tradeParaExibir.status === 'WIN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tradeParaExibir.status}
                    </span>
                    <h2 className="text-xl font-bold text-white">{tradeParaExibir.ativo}</h2>
                    <span className={`text-sm font-bold ${tradeParaExibir.direcao === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                      {tradeParaExibir.direcao}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">{tradeParaExibir.dataEntrada}</p>
                </div>
                <button 
                  onClick={() => setModalDetalhes({ isOpen: false, trade: null, abaAtiva: 'RESUMO' })}
                  className="text-zinc-500 hover:text-white p-1 cursor-pointer"
                >✕</button>
              </div>

              {/* Navegação de Abas */}
              <div className="flex px-6 pt-4 border-b border-zinc-800 gap-6">
                {[
                  { id: 'RESUMO', label: '📊 Resumo Financeiro' },
                  { id: 'DIARIO', label: '📓 Diário do Trade' },
                  { id: 'EXECUCAO', label: '⚙️ Execução' }
                ].map(aba => (
                  <button
                    key={aba.id}
                    onClick={() => setModalDetalhes({ ...modalDetalhes, abaAtiva: aba.id as 'RESUMO' | 'DIARIO' | 'EXECUCAO' })}
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                      modalDetalhes.abaAtiva === aba.id 
                        ? 'border-violet-500 text-violet-400' 
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {aba.label}
                  </button>
                ))}
              </div>

              {/* Conteúdo Rolável */}
              <div className="p-6 overflow-y-auto flex-1 text-[#e4e4e7]">
                
                {/* ABA: RESUMO */}
                {modalDetalhes.abaAtiva === 'RESUMO' && (
                  <div className="space-y-6">
                    {/* PNL e Tempo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                        <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Resultado Final (PNL)</p>
                        <p className={`text-2xl font-mono font-bold ${tradeParaExibir.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tradeParaExibir.pnl > 0 ? '+' : ''}$ {Math.abs(tradeParaExibir.pnl || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                        <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Expectativa vs Realidade</p>
                        <div className="flex flex-col gap-1 mt-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-400">Intenção:</span>
                            <span className="text-white font-semibold">{tradeParaExibir.intencaoTrade}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-400">Realidade:</span>
                            <span className="text-violet-400 font-semibold">{tradeParaExibir.classificacaoTempo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA: DIÁRIO */}
                {modalDetalhes.abaAtiva === 'DIARIO' && (
                  <div className="space-y-6">
                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                      <p className="text-[10px] uppercase text-zinc-500 font-bold mb-3">Avaliação da Execução</p>
                      <div className="flex gap-1 mb-4">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={`text-xl ${star <= (tradeParaExibir.nota || 0) ? 'text-amber-400' : 'text-zinc-700'}`}>
                            ★
                          </span>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">Seguiu o Plano?</span>
                          <span className="text-white font-bold">{tradeParaExibir.seguiuPlano ? '✅ Sim' : '❌ Não'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">Cometeu Erro?</span>
                          <span className="text-white font-bold">{tradeParaExibir.cometeuErro ? '⚠️ Sim' : '✨ Não'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                      <p className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Lições Aprendidas</p>
                      <p className="text-sm text-zinc-300 italic">
                        "{tradeParaExibir.licoes}"
                      </p>
                    </div>
                  </div>
                )}

                {/* ABA: EXECUÇÃO */}
                {modalDetalhes.abaAtiva === 'EXECUCAO' && (
                  <div className="space-y-4 text-[#e4e4e7]">
                    <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                      <span className="text-xs text-zinc-400 uppercase font-bold">Preço de Entrada</span>
                      <span className="text-sm font-mono text-white">$ {tradeParaExibir.cotacaoCompra}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                      <span className="text-xs text-red-400 uppercase font-bold">Stop Loss</span>
                      <span className="text-sm font-mono text-red-400">$ {tradeParaExibir.stopLoss || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                      <span className="text-xs text-green-400 uppercase font-bold">Alvo Principal</span>
                      <span className="text-sm font-mono text-green-400">$ {tradeParaExibir.alvo1 || '—'}</span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
