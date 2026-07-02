import React, { useState, useEffect } from 'react';
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
  Pencil
} from 'lucide-react';
import { Trade, CoinPrice, TradeStatus, Instituicao } from '../types';
import MarketSimulator from './MarketSimulator';

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
  onLaunchTradeClick
}: TradeDeskViewProps) {
  
  // Filter states
  const [tickerFilter, setTickerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'Todos'>('Todos');
  const [showAddForm, setShowAddForm] = useState(false);

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
  const [variations, setVariations] = useState<Record<string, number>>({});
  const [simulatedPrices, setSimulatedPrices] = useState<Record<string, number>>({});

  const activeTrades = trades.filter(t => t.status === 'Aberto');
  const uniqueTickers = Array.from(new Set(activeTrades.map(t => t.moeda.toUpperCase()))).sort();

  // Keep variations state clean and matched to active positions
  useEffect(() => {
    setVariations(prev => {
      const nextVariations = { ...prev };
      let updated = false;
      uniqueTickers.forEach(ticker => {
        if (nextVariations[ticker] === undefined) {
          nextVariations[ticker] = 0;
          updated = true;
        }
      });
      Object.keys(nextVariations).forEach(ticker => {
        if (!uniqueTickers.includes(ticker)) {
          delete nextVariations[ticker];
          updated = true;
        }
      });
      return updated ? nextVariations : prev;
    });
  }, [trades]);

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
    return matchesTicker && matchesStatus;
  });

  // Handle simulation updates
  const handleSimulationChange = (simPnL: number, simPrices: Record<string, number>) => {
    setSimulatedActivePnL(simPnL);
    setSimulatedPrices(simPrices);
    const activeOpenTrades = trades.filter(t => t.status === 'Aberto');
    const hasActiveSimulation = Object.keys(simPrices).some(ticker => {
      const matchingTrade = activeOpenTrades.find(t => t.moeda.toUpperCase() === ticker);
      return matchingTrade && simPrices[ticker] !== matchingTrade.preco_compra;
    });
    setIsSimulating(hasActiveSimulation);
  };

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
      const currentPrice = (isSimulating && simulatedPrices[trade.moeda.toUpperCase()] !== undefined)
        ? simulatedPrices[trade.moeda.toUpperCase()]
        : livePrice;

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
        <div className="max-h-[60vh] overflow-y-auto border border-zinc-900/65 rounded bg-[#09090b]/55">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] border-collapse relative">
              <thead className="sticky top-0 bg-[#070709] z-10 border-b border-zinc-900 text-zinc-500 text-[9px] uppercase">
                <tr>
                  <th className="w-[95px] py-4 pl-2 pr-1 text-[10px] bg-[#070709] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center col-data">
                    DATA
                  </th>
                  <th key="status" className="w-[36px] py-4 px-0 bg-[#070709] text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center col-st">
                    ST
                  </th>
                  <th className="w-[90px] py-4 pl-1 pr-2 text-[10px] bg-[#070709] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center col-ticker">
                    TICKER
                  </th>
                  <th className="w-[130px] py-4 px-2 bg-[#070709] text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center col-inst">
                    INSTITUIÇÃO
                  </th>
                  <th className="w-[130px] py-4 px-2 bg-[#070709] text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center col-compra">
                    COMPRA
                  </th>
                  <th className="w-[120px] py-4 px-2 bg-[#070709] text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center col-qtd">
                    VALOR TOTAL
                  </th>
                  <th className="w-[130px] py-4 px-3 bg-[#070709] text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center col-pnl">
                    PNL
                  </th>
                  <th className="w-[130px] py-4 px-2 bg-[#070709] text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center">
                    STOP LOSS
                  </th>
                  <th key="track" className="py-4 px-1 bg-[#070709] text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center col-track">
                    TRACK
                  </th>
                  <th className="w-[120px] py-4 px-2 text-[10px] bg-[#070709] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center">
                    ALVO FINAL
                  </th>
                  <th key="opcoes" className="w-[110px] py-4 px-2 bg-[#070709] text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center col-opcoes">
                    OPÇÕES
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredTrades.length > 0 ? (
                  filteredTrades.map((originalTrade, index) => {
                    const coinPriceObj = coinPrices.find(c => c.moeda.toUpperCase() === originalTrade.moeda.toUpperCase());
                    const livePrice = coinPriceObj ? coinPriceObj.current_price : originalTrade.preco_compra;
                    
                    // Use simulated price of this asset if active and available
                    const currentPrice = (isSimulating && simulatedPrices[originalTrade.moeda.toUpperCase()] !== undefined)
                      ? simulatedPrices[originalTrade.moeda.toUpperCase()]
                      : livePrice;

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
                      date: originalTrade.data_hora.includes('T')
                        ? new Date(originalTrade.data_hora).toLocaleDateString('pt-BR')
                        : originalTrade.data_hora,
                      institution: originalTrade.exchange,
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
                      status: originalTrade.status === 'Aberto' 
                        ? 'ABERTO' 
                        : originalTrade.status === 'Fechado_Gain' 
                          ? 'WIN' 
                          : originalTrade.status === 'Fechado_Loss' 
                            ? 'LOSS' 
                            : 'FECHADO',
                      pnl: originalTrade.status === 'Aberto' ? estimatedPnlValue : originalTrade.pnl_realizado,
                       direcao: (originalTrade.tipo_operacao?.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG') as 'LONG' | 'SHORT'
                    };

                    return (
                      <tr 
                        key={originalTrade.id} 
                        className={`border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/40 ${
                          index % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'
                        }`}
                      >
                        {/* DATA */}
                        <td className="w-[95px] py-3 pl-2 pr-1 text-[10px] font-mono text-zinc-500 whitespace-nowrap text-left">
                          {trade.date}
                        </td>

                        {/* STATUS */}
                        <td className="py-3 w-[36px] text-center">
                          {renderStatusArrow(trade)}
                        </td>

                        {/* TICKER */}
                        <td className="w-[90px] py-3 pl-1 pr-2 text-sm font-bold text-white text-left">
                          {trade.ticker}
                        </td>

                        {/* INSTITUIÇÃO */}
                        <td className="w-[130px] py-3 px-2 text-xs font-semibold text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap text-left" title={trade.institution}>
                          {trade.institution}
                        </td>

                        {/* COMPRA */}
                        <td className="py-3 w-[130px] px-2 text-xs font-mono text-zinc-300 whitespace-nowrap text-right">
                          <span
                            className="text-xs font-mono text-zinc-300"
                            title={`$ ${formatPreciso(trade.buyPrice)}`}
                          >
                            $ {formatSmart(trade.buyPrice)}
                          </span>
                        </td>

                        {/* VALOR TOTAL */}
                        <td className="py-3 w-[120px] px-2 text-right font-mono text-sm text-white whitespace-nowrap">
                          $ {calcularValorTotal(trade).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* PNL */}
                        <td className="w-[130px] py-3 px-3 text-right whitespace-nowrap">
                          <span 
                            className={`text-sm font-bold font-mono whitespace-nowrap ${getPnlColor(trade.pnl)}`}
                            title={`$ ${formatPreciso(trade.pnl)}`}
                          >
                            {trade.pnl > 0 ? '+' : ''}{trade.pnl === 0 ? '' : '$ '}{formatSmart(trade.pnl)}
                          </span>
                        </td>

                        {/* STOP LOSS */}
                        <td className="py-3 w-[130px] px-2 text-right whitespace-nowrap">
                          <span 
                            className="text-xs font-mono text-red-500 font-bold"
                            title={`$ ${formatPreciso(trade.stopLoss)}`}
                          >
                            ${formatSmart(trade.stopLoss)}
                          </span>
                        </td>

                        {/* TRACK — quadrados com rótulos + tooltip no hover */}
                        <td className="py-3 px-1 whitespace-nowrap text-center w-auto">
                          <div className="flex items-center justify-center gap-2">
                            {/* 5 quadrados de STOP (S1 a S5) */}
                            <div className="flex items-center gap-0.5">
                              {[
                                { label: 'S1', nivel: calcularNivelStop(trade.buyPrice, trade.stopLoss, 0.2) },
                                { label: 'S2', nivel: calcularNivelStop(trade.buyPrice, trade.stopLoss, 0.4) },
                                { label: 'S3', nivel: calcularNivelStop(trade.buyPrice, trade.stopLoss, 0.6) },
                                { label: 'S4', nivel: calcularNivelStop(trade.buyPrice, trade.stopLoss, 0.8) },
                                { label: 'S5', nivel: calcularNivelStop(trade.buyPrice, trade.stopLoss, 1.0) }
                              ].map((item, i) => {
                                const atingiu =
                                  trade.status === 'LOSS' && i === 4
                                    ? true
                                    : trade.status === 'ABERTO' && trade.pnl < 0 && i < Math.ceil(Math.abs(trade.pnl) / ((trade.buyPrice - trade.stopLoss) / 5));

                                return (
                                  <span
                                    key={`s-${i}`}
                                    title={`Stop ${item.label}: $ ${formatPreciso(item.nivel)}`}
                                    className={`w-5 h-5 flex items-center justify-center text-[9px] font-mono font-bold rounded cursor-default transition-colors ${
                                      atingiu
                                        ? 'bg-red-500 text-white border border-red-400'
                                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Bolinha de ENTRADA (laranja) — MAIOR que os quadrados */}
                            <span
                              title={`Entrada: $ ${formatPreciso(trade.buyPrice)}`}
                              className={`w-3 h-3 rounded-full bg-orange-500 border border-orange-400 shadow-[0_0_5px_rgba(249,115,22,0.5)] cursor-default ${
                                trade.status === 'WIN' || trade.status === 'LOSS' ? 'opacity-30' : ''
                              }`}
                            />

                            {/* 5 quadrados de TARGET (A1 a A5) */}
                            <div className="flex items-center gap-0.5">
                              {trade.targets.filter(Boolean).slice(0, 5).map((alvo, i) => {
                                const atingiu =
                                  trade.status === 'WIN' ||
                                  (trade.status === 'ABERTO' && trade.pnl > 0 && i < Math.ceil(trade.pnl / (alvo / 2)));

                                return (
                                  <span
                                    key={`a-${i}`}
                                    title={`Alvo A${i + 1}: $ ${formatPreciso(alvo)}`}
                                    className={`w-5 h-5 flex items-center justify-center text-[9px] font-mono font-bold rounded cursor-default transition-colors ${
                                      atingiu
                                        ? 'bg-green-500 text-white border border-green-400'
                                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                    }`}
                                  >
                                    {`A${i + 1}`}
                                  </span>
                                );
                              })}
                              {/* Preencher alvos faltantes com quadrados vazios */}
                              {Array.from({ length: Math.max(0, 5 - (trade.targets.filter(Boolean).length)) }).map((_, i) => (
                                <span
                                  key={`empty-${i}`}
                                  className="w-5 h-5 flex items-center justify-center text-[9px] font-mono text-zinc-800 bg-zinc-900/50 border border-zinc-800/50 rounded"
                                >
                                  -
                                </span>
                              ))}
                            </div>
                          </div>
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

                        {/* OPÇÕES */}
                        <td className="py-3 w-[110px] px-2 text-center">
                          <div className="flex items-center justify-center gap-3">
                            {isAberto && (
                              <button
                                onClick={() => {
                                  const pnl = (currentPrice - originalTrade.preco_compra) * originalTrade.quantidade - originalTrade.taxa_corretora_usd;
                                  const finalizedStatus = pnl >= 0 ? 'Fechado_Gain' : 'Fechado_Loss';
                                  setTrades(prev => prev.map(t => t.id === originalTrade.id ? { ...t, status: finalizedStatus, pnl_realizado: Number(pnl.toFixed(4)) } : t));
                                  showNotification(`Ordem liquidada via Trade Desk! Lucro Líquido: $ ${pnl.toFixed(2)}`, pnl >= 0 ? 'success' : 'error');
                                }}
                                className="text-zinc-550 hover:text-red-400 transition-colors cursor-pointer"
                                title="Liquidar"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                  <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" strokeLinecap="round" />
                                </svg>
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
                    <td colSpan={11} className="text-center py-8 text-zinc-550 uppercase">
                      Nenhuma posição filtrada nesta sessão da mesa de operações.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Density Ledgers Summary Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-zinc-550 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Listando {filteredTrades.length} registros • Total geral: {trades.length} trades</span>
          <span>Total Custos Corretora: $ {trades.reduce((acc, t) => acc + t.taxa_corretora_usd, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* 2. Área Inferior (Dividida 50% / 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Coluna da Esquerda (50%): Simulador sliders + Registrar Ordem Expressa compact block */}
        <div className="space-y-6">
          <MarketSimulator 
            activeTrades={trades.filter(t => t.status === 'Aberto')} 
            variations={variations}
            setVariations={setVariations}
            onlySliders={true}
            onSimulationChange={handleSimulationChange} 
          />

          {/* Rapid Ordem Express Manual Form */}
          <div className="bg-[#0c0c0e]/80 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-400" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Registrar Ordem Expressa</h4>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                {showAddForm ? 'Fechar' : 'Abrir'}
              </button>
            </div>

            {showAddForm ? (
              <form onSubmit={handleAddNewTrade} className="space-y-3.5 text-[11px]">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-550 text-[9px] uppercase tracking-wider mb-1 font-bold">Custódia</label>
                    <select
                      value={formData.exchange}
                      onChange={(e) => setFormData(prev => ({ ...prev, exchange: e.target.value }))}
                      className="w-full bg-[#050507] border border-zinc-850 p-1.5 rounded text-zinc-300 focus:outline-none focus:border-green-500 cursor-pointer text-xs"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.nome}>
                          {inst.nome} ({inst.tipo})
                        </option>
                      ))}
                      {institutions.length === 0 && (
                        <>
                          <option value="Binance">Binance</option>
                          <option value="Bybit">Bybit</option>
                          <option value="MetaMask">MetaMask</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-zinc-550 text-[9px] uppercase tracking-wider mb-1 font-bold">Ticker Moeda *</label>
                    <input
                      type="text"
                      required
                      placeholder="SOL"
                      value={formData.moeda}
                      onChange={(e) => setFormData(prev => ({ ...prev, moeda: e.target.value }))}
                      className="w-full bg-[#050507] border border-zinc-850 p-1.5 rounded text-white focus:outline-none focus:border-green-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-550 text-[9px] uppercase tracking-wider mb-1 font-bold">Entrada *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="135.00"
                      value={formData.preco_compra}
                      onChange={(e) => setFormData(prev => ({ ...prev, preco_compra: e.target.value.replace(/[^0-9.,]/g, '') }))}
                      className="w-full bg-[#050507] border border-zinc-850 p-1.5 rounded text-zinc-200 focus:outline-none focus:border-green-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-550 text-[9px] uppercase tracking-wider mb-1 font-bold">Quantidade *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="10.0"
                      value={formData.quantidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value.replace(/[^0-9.,]/g, '') }))}
                      className="w-full bg-[#050507] border border-zinc-850 p-1.5 rounded text-zinc-200 focus:outline-none focus:border-green-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-550 text-[9px] uppercase tracking-wider mb-1 font-bold">Taxa (USD)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.taxa_corretora_usd}
                      onChange={(e) => setFormData(prev => ({ ...prev, taxa_corretora_usd: e.target.value.replace(/[^0-9.,]/g, '') }))}
                      className="w-full bg-[#050507] border border-zinc-850 p-1.5 rounded text-zinc-300 focus:outline-none focus:border-green-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-550 text-[9px] uppercase tracking-wider mb-1 font-bold">Stop Loss</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="120"
                      value={formData.stop_loss}
                      onChange={(e) => setFormData(prev => ({ ...prev, stop_loss: e.target.value.replace(/[^0-9.,]/g, '') }))}
                      className="w-full bg-[#050507] border border-zinc-850 p-1.5 rounded text-red-400 focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>
                </div>

                {/* Targets setup */}
                <div className="pt-2 border-t border-zinc-900 space-y-1.5">
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Take Profit Targets (USD)</div>
                  
                  <div className="grid grid-cols-3 gap-1 px-1">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <div key={num}>
                        <label className="block text-zinc-500 text-[8px] text-center">Alvo {num}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={(formData as any)[`alvo_${num}`] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`alvo_${num}`]: e.target.value.replace(/[^0-9.,]/g, '') }))}
                          className="w-full bg-[#050507] border border-zinc-850 p-1 text-[10px] text-zinc-300 text-center rounded focus:outline-none focus:border-green-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full p-2.5 bg-green-500 text-black uppercase font-black text-xs rounded hover:bg-green-400 transition-all cursor-pointer font-bold select-none text-center block"
                >
                  Confirmar e Lançar Ordem
                </button>
              </form>
            ) : (
              <div className="text-center py-5 bg-zinc-950/20 border border-dashed border-zinc-850 rounded">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-[10px] font-bold rounded border border-zinc-800 transition-all cursor-pointer"
                >
                  + preencher manual express
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita (50%): Impacto no Portfólio Simulado */}
        <div>
          <MarketSimulator 
            activeTrades={trades.filter(t => t.status === 'Aberto')} 
            variations={variations}
            setVariations={setVariations}
            onlyImpact={true}
            onSimulationChange={handleSimulationChange} 
          />
        </div>

      </div>

    </div>
  );
}
