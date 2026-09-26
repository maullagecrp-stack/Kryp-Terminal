import React, { useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Search, 
  Briefcase, 
  Target, 
  Calendar, 
  Coins, 
  Info,
  DollarSign,
  Upload
} from 'lucide-react';
import { Hold, CoinPrice, Instituicao, BrokerAccount } from '../types';

interface HoldDeskViewProps {
  holds: Hold[];
  setHolds: React.Dispatch<React.SetStateAction<Hold[]>>;
  coinPrices: CoinPrice[];
  institutions: Instituicao[];
  brokerAccounts?: BrokerAccount[];
  onLaunchHoldClick: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function HoldDeskView({
  holds,
  setHolds,
  coinPrices,
  institutions,
  brokerAccounts = [],
  onLaunchHoldClick,
  showNotification
}: HoldDeskViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('Todos');
  const [isCsvHoldOpen, setIsCsvHoldOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Excluir Aporte
  const handleDeleteHold = (id: string) => {
    if (confirm('Tem certeza de que deseja remover esta movimentação de Hold? Isso recalculará o preço médio.')) {
      setHolds(prev => prev.filter(h => h.id !== id));
      showNotification('Registro de Hold removido com sucesso!', 'info');
    }
  };

  // Preços de mercado em tempo real
  const currentPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    coinPrices.forEach((c) => {
      map.set(c.moeda.toUpperCase(), c.current_price);
    });
    return map;
  }, [coinPrices]);

  // Agrupar transações de Hold para calcular a carteira de Posições Ativas
  const portfolioPositions = useMemo(() => {
    // Filtrar holds pela exchange selecionada se aplicável
    let filteredHolds = [...holds];
    if (exchangeFilter !== 'Todos') {
      filteredHolds = filteredHolds.filter(h => h.exchange.toLowerCase() === exchangeFilter.toLowerCase());
    }

    // Agrupar por ativo/moeda
    const grouped: { [key: string]: Hold[] } = {};
    filteredHolds.forEach(h => {
      const parentAsset = h.moeda.toUpperCase().trim();
      if (!grouped[parentAsset]) {
        grouped[parentAsset] = [];
      }
      grouped[parentAsset].push(h);
    });

    const positionsList: Array<{
      moeda: string;
      precoMedio: number;
      quantidadeTotal: number;
      valorInvestido: number;
      valorAtual: number;
      pnlUsd: number;
      pnlPercent: number;
      lastExchange: string;
      alvo_1?: number | null;
      alvo_2?: number | null;
      alvo_3?: number | null;
      notas?: string;
    }> = [];

    Object.keys(grouped).forEach(ticker => {
      // Ordena transações cronologicamente de forma ascendente para calcular preço médio móvel
      const txs = [...grouped[ticker]].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
      
      let runningQty = 0;
      let runningAvgPrice = 0;
      let lastExchangeUsed = '';

      txs.forEach(tx => {
        lastExchangeUsed = tx.exchange;
        const q = tx.quantidade;
        const p = tx.preco_compra; // cotação da transação

        if (tx.tipo === 'Compra') {
          // Weighted moving average price on accumulation buy
          const newQty = runningQty + q;
          if (newQty > 0) {
            runningAvgPrice = ((runningAvgPrice * runningQty) + (p * q)) / newQty;
          }
          runningQty = newQty;
        } else {
          // Redução da quantidade do hold
          runningQty = Math.max(0, runningQty - q);
          // O preço médio permanece o mesmo na venda (apenas reduz estoque)
        }
      });

      // Pega cotação atual do Coins Tracker
      const livePrice = currentPriceMap.get(ticker) || runningAvgPrice;
      const totalInv = runningAvgPrice * runningQty;
      const totalCurStr = livePrice * runningQty;
      const pnlUs = totalCurStr - totalInv;
      const pnlPct = totalInv > 0 ? (pnlUs / totalInv) * 100 : 0;

      // Pegar as notas e alvos do último aporte
      const lastTx = txs[txs.length - 1];

      if (runningQty > 0) {
        positionsList.push({
          moeda: ticker,
          precoMedio: Number(runningAvgPrice.toFixed(4)),
          quantidadeTotal: Number(runningQty.toFixed(8)),
          valorInvestido: Number(totalInv.toFixed(2)),
          valorAtual: Number(totalCurStr.toFixed(2)),
          pnlUsd: Number(pnlUs.toFixed(2)),
          pnlPercent: Number(pnlPct.toFixed(2)),
          lastExchange: lastExchangeUsed,
          alvo_1: lastTx?.alvo_1,
          alvo_2: lastTx?.alvo_2,
          alvo_3: lastTx?.alvo_3,
          notas: lastTx?.notas
        });
      }
    });

    // Filtro de busca de moeda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return positionsList.filter(p => p.moeda.toLowerCase().includes(q));
    }

    return positionsList;
  }, [holds, exchangeFilter, searchQuery, currentPriceMap]);

  // Indicadores Consolidados
  const summaryMetrics = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;

    portfolioPositions.forEach(p => {
      totalInvested += p.valorInvestido;
      totalCurrent += p.valorAtual;
    });

    const netPnLValue = totalCurrent - totalInvested;
    const netPnLPct = totalInvested > 0 ? (netPnLValue / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrent,
      netPnLValue,
      netPnLPct
    };
  }, [portfolioPositions]);

  // CSV Importer específico de Hold Desk
  const handleHoldCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n');
        if (lines.length <= 1) {
          showNotification('O CSV está vazio ou inválido.', 'error');
          return;
        }

        const newParsedHolds: Hold[] = [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const getColIdx = (name: string) => headers.indexOf(name);

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim());
          const getVal = (colName: string) => {
            const idx = getColIdx(colName);
            return idx !== -1 ? values[idx] : null;
          };

          const moeda = (getVal('moeda') || getVal('ativo') || 'BTC').toUpperCase();
          const exchangeValue = getVal('exchange') || getVal('carteira') || 'Binance';
          const tipoCsv = (getVal('tipo') || 'Compra') as 'Compra' | 'Venda';
          
          const rawPrice = getVal('preco_compra') || getVal('cotacao') || '0';
          const preco_compra = parseFloat(rawPrice.replace(',', '.'));
          
          const rawQty = getVal('quantidade') || '0';
          const quantidade = parseFloat(rawQty.replace(',', '.'));
          
          const rawValInvestido = getVal('valor_investido') || '0';
          const valor_investido = rawValInvestido ? parseFloat(rawValInvestido.replace(',', '.')) : (preco_compra * quantidade);

          if (preco_compra <= 0 || quantidade <= 0) continue;

          newParsedHolds.push({
            id: crypto.randomUUID(),
            data_hora: getVal('data_hora') || new Date().toISOString(),
            exchange: exchangeValue,
            moeda,
            tipo: tipoCsv === 'Venda' ? 'Venda' : 'Compra',
            preco_compra,
            quantidade,
            valor_investido,
            alvo_1: getVal('alvo_1') ? parseFloat(getVal('alvo_1') || '0') : null,
            alvo_2: getVal('alvo_2') ? parseFloat(getVal('alvo_2') || '0') : null,
            alvo_3: getVal('alvo_3') ? parseFloat(getVal('alvo_3') || '0') : null,
            notas: getVal('notas') || ''
          });
        }

        if (newParsedHolds.length > 0) {
          setHolds(prev => [...newParsedHolds, ...prev]);
          showNotification(`${newParsedHolds.length} transações de Hold importadas com sucesso!`, 'success');
        } else {
          showNotification('Nenhum registro de hold válido encontrado no CSV.', 'error');
        }
      } catch (err) {
        showNotification('Erro ao processar o CSV. Formato esperado: data_hora,exchange,moeda,tipo,preco_compra,quantidade,valor_investido', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsCsvHoldOpen(false);
  };

  // Gerar CSV Template específico de Hold
  const downloadHoldCsvTemplate = () => {
    const csvHeaders = 'data_hora,exchange,moeda,tipo,preco_compra,quantidade,valor_investido,alvo_1,alvo_2,alvo_3,notas\n';
    const sampleRows = `2026-06-14T10:00:00Z,Binance,BTC,Compra,64500.00,0.05,3225.00,85000.0,100000.0,,Acumulação pré-halving\n2026-06-14T11:30:00Z,MetaMask,ETH,Compra,3400.00,0.5,1700.00,5000.0,7500.0,9000.0,Fundamento de Smart Contracts`;
    const blob = new Blob([csvHeaders + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_hold.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Template de Hold CSV baixado!', 'success');
  };

  return (
    <div id="hold-desk-view-container" className="space-y-6">
      
      {/* 1. Header (Ação de alinhador superior do Usuário) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0c] border border-zinc-900 p-4 rounded-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-amber-500" />
            <h1 className="text-lg font-extrabold uppercase text-white tracking-tight">Mesa de Investimentos (Hold Desk)</h1>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mt-1">Acúmulo de Longo Prazo, PM (Preço Médio) e Alvos Definidos</p>
        </div>

        {/* Action Buttons Alinhados à direita do cabeçalho como solicitado */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            onClick={onLaunchHoldClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded text-[10px] transition-all cursor-pointer shadow-md uppercase"
            id="btn-launch-hold"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3px]" />
            + Novo Aporte/Venda
          </button>

          <button
            onClick={() => setIsCsvHoldOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold rounded text-[10px] transition-all cursor-pointer uppercase"
            id="btn-import-hold-csv"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar CSV
          </button>
        </div>
      </div>

      {/* Modal/Dropdown informativo para CSV */}
      {isCsvHoldOpen && (
        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-200 font-bold uppercase tracking-wider">Mecanismo de Importação de Hold</span>
            <button onClick={() => setIsCsvHoldOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
          </div>
          <p className="text-zinc-400 leading-normal text-[11px]">
            Seu CSV precisa conter o cabeçalho exato: <code className="text-amber-400">data_hora,exchange,moeda,tipo,preco_compra,quantidade,valor_investido</code>.
          </p>
          <div className="flex gap-3">
            <button
              onClick={downloadHoldCsvTemplate}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white rounded text-[10px]"
            >
              Baixar Modelo CSV
            </button>
            <label className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-[10px] font-bold cursor-pointer transition-all">
              Selecionar Arquivo CSV
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".csv" 
                onChange={handleHoldCsvUpload} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      )}

      {/* 2. Portfólio KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-terminal-panel border border-terminal-border p-4 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Total Alocado (Preço Médio)</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xs text-zinc-500 font-bold">$</span>
            <span className="text-xl font-bold font-mono text-zinc-100">
              {summaryMetrics.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[8px] text-zinc-650 uppercase font-mono mt-2">Custo real de aquisição spot</span>
        </div>

        {/* KPI 2 */}
        <div className="bg-terminal-panel border border-terminal-border p-4 rounded-lg flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Patrimônio Atual Mercado</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xs text-zinc-500 font-bold">$</span>
            <span className="text-xl font-bold font-mono text-zinc-100">
              {summaryMetrics.totalCurrent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[8px] text-zinc-650 uppercase font-mono mt-2">Valoração em tempo real</span>
        </div>

        {/* KPI 3: Ganho/Perda */}
        <div className={`bg-terminal-panel border p-4 rounded-lg flex flex-col justify-between ${
          summaryMetrics.netPnLValue >= 0 ? 'border-emerald-900/40 bg-emerald-950/2' : 'border-red-900/40 bg-red-950/2'
        }`}>
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Retorno Líquido do Portfólio (PnL)</span>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-bold text-zinc-500">$</span>
              <span className={`text-xl font-bold font-mono ${summaryMetrics.netPnLValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {summaryMetrics.netPnLValue >= 0 ? '+' : ''}
                {summaryMetrics.netPnLValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className={`text-[10px] font-bold font-mono mt-1 ${summaryMetrics.netPnLValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {summaryMetrics.netPnLValue >= 0 ? '▲' : '▼'} {summaryMetrics.netPnLPct.toFixed(2)}%
            </div>
          </div>
          <span className="text-[8px] text-zinc-650 uppercase font-mono mt-1">Lucro/Prejuízo flutuante acumulado</span>
        </div>
      </div>

      {/* 3. Search & Quick filters bar */}
      <div className="bg-[#0b0b0d] border border-zinc-900 p-3 rounded-lg flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar por ativo (ex: BTC, ETH)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050507] border border-zinc-850 p-1.5 pl-9 rounded text-zinc-300 placeholder-zinc-700 text-xs focus:outline-none focus:border-amber-500 font-mono text-center sm:text-left"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold shrink-0">Filtrar Exchange:</span>
          <select
            value={exchangeFilter}
            onChange={(e) => setExchangeFilter(e.target.value)}
            className="bg-[#050507] border border-zinc-850 py-1.5 px-3 rounded text-zinc-300 text-xs focus:outline-none focus:border-amber-500 font-mono"
          >
            <option value="Todos">Todos os Locais</option>
            {institutions.map(inst => (
              <option key={inst.id} value={inst.nome}>{inst.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Tabela Principal: Visão Geral do Portfólio */}
      <div className="bg-[#08080a] border border-zinc-850 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-zinc-850 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <h2 className="text-[11px] uppercase tracking-wider font-extrabold text-zinc-200">Visão Geral do Portfólio de Longo Prazo</h2>
          </div>
          <span className="text-[9px] text-zinc-500 font-mono lowercase">Posições Consolidadas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-850 bg-zinc-950/50 text-zinc-500 text-[10px] uppercase font-bold">
                <th className="p-3">Ativo</th>
                <th className="p-3">Preço de Custo (PM)</th>
                <th className="p-3">Quantidade Acumulada</th>
                <th className="p-3">Total Alocado</th>
                <th className="p-3">Valor Atual</th>
                <th className="p-3">Lucro / Retorno (PnL)</th>
                <th className="p-3">Alvos Remotos (Estratégia)</th>
                <th className="p-3 text-right">Tese / Notas</th>
              </tr>
            </thead>
            <tbody>
              {portfolioPositions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 text-xs">
                    Nenhuma posição de longo prazo (HOLD) ativa encontrada. Clique em "+ Novo Aporte/Venda" para carregar.
                  </td>
                </tr>
              ) : (
                portfolioPositions.map(pos => {
                  const hasGain = pos.pnlUsd >= 0;
                  return (
                    <tr key={pos.moeda} className="border-b border-zinc-900 bg-black/10 hover:bg-zinc-900/20 transition-all text-[11px]">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 font-extrabold rounded text-[10px] uppercase">
                            {pos.moeda}
                          </span>
                          <span className="text-[9px] text-zinc-600 block uppercase">{pos.lastExchange}</span>
                        </div>
                      </td>
                      <td className="p-3 text-zinc-300">${pos.precoMedio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                      <td className="p-3 text-zinc-300 font-semibold">{pos.quantidadeTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                      <td className="p-3 text-zinc-400">${pos.valorInvestido.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-zinc-200 font-bold">${pos.valorAtual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3">
                        <span className={`font-bold ${hasGain ? 'text-emerald-400' : 'text-red-400'}`}>
                          {hasGain ? '+' : ''}${pos.pnlUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`block text-[9px] ${hasGain ? 'text-emerald-500' : 'text-red-500'}`}>
                          {hasGain ? '▲' : '▼'} {pos.pnlPercent}%
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 text-[9px]">
                          {pos.alvo_1 && <span className="bg-emerald-950/30 text-emerald-400 px-1 border border-emerald-900/30 rounded">A1: ${pos.alvo_1}</span>}
                          {pos.alvo_2 && <span className="bg-emerald-950/30 text-emerald-400 px-1 border border-emerald-900/30 rounded">A2: ${pos.alvo_2}</span>}
                          {pos.alvo_3 && <span className="bg-emerald-950/30 text-emerald-400 px-1 border border-emerald-900/30 rounded">A3: ${pos.alvo_3}</span>}
                          {!pos.alvo_1 && !pos.alvo_2 && !pos.alvo_3 && <span className="text-zinc-650">-</span>}
                        </div>
                      </td>
                      <td className="p-3 text-right max-w-[200px] truncate text-zinc-400" title={pos.notas || 'Sem tese cadastrada'}>
                        {pos.notas || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Tabela de Histórico de Transações de Longo Prazo */}
      <div className="bg-[#08080a] border border-zinc-850 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-zinc-850 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h2 className="text-[11px] uppercase tracking-wider font-extrabold text-zinc-200">Histórico de Aportes & Vendas Realizadas</h2>
          </div>
          <span className="text-[9px] text-zinc-500 font-mono">Movimentações Individuais ({holds.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-850 bg-zinc-950/50 text-zinc-500 text-[10px] uppercase font-bold">
                <th className="p-3">Data/Hora</th>
                <th className="p-3">Exchange/Carteira</th>
                <th className="p-3">Ativo</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3">Cotação</th>
                <th className="p-3">Quantidade</th>
                <th className="p-3">Total Investido</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {holds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 text-xs">
                    Nenhuma operação spot registrada no diário.
                  </td>
                </tr>
              ) : (
                holds.map(h => {
                  const isBuy = h.tipo === 'Compra';
                  return (
                    <tr key={h.id} className="border-b border-zinc-900 bg-black/5 hover:bg-zinc-900/10 transition-all text-[11px]">
                      <td className="p-3 text-zinc-400">{new Date(h.data_hora).toLocaleString('pt-BR')}</td>
                      <td className="p-3 text-zinc-300 font-semibold">
                        <div>{h.exchange}</div>
                        {h.conta_corretora_nome && (
                          <div className="text-[9px] text-green-400 font-mono tracking-tight flex items-center gap-1 mt-0.5" title={h.conta_corretora_nome}>
                            <span className="w-1 h-1 rounded-full bg-green-500 shrink-0"></span>
                            {h.conta_corretora_nome}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-white font-bold">{h.moeda}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                          isBuy 
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                            : 'bg-orange-950/40 text-orange-400 border-orange-900/30'
                        }`}>
                          {isBuy ? 'COMPRA' : 'VENDA'}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-300">${h.preco_compra.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                      <td className="p-3 text-zinc-300">{h.quantidade.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                      <td className="p-3 text-amber-400 font-bold">${h.valor_investido.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteHold(h.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/10 rounded transition-all cursor-pointer"
                          title="Remover movimentação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
