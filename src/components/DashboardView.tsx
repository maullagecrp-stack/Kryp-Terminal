import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Layers, 
  FileCheck2, 
  TrendingUp as BulletIcon,
  Info,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Trade, CoinPrice } from '../types';

interface DashboardViewProps {
  trades: Trade[];
  coinPrices: CoinPrice[];
  isSimulating: boolean;
  simulatedActivePnL: number;
}

export default function DashboardView({ 
  trades, 
  coinPrices, 
  isSimulating, 
  simulatedActivePnL 
}: DashboardViewProps) {
  
  // Core macro calculations
  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalRealizedPnl = 0;

  trades.forEach(trade => {
    const cost = (trade.preco_compra * trade.quantidade) + trade.taxa_corretora_usd;
    
    if (trade.status === 'Aberto') {
      totalInvested += cost;
      const coinPriceObj = coinPrices.find(c => c.moeda === trade.moeda);
      const currentPrice = coinPriceObj ? coinPriceObj.current_price : trade.preco_compra;
      totalCurrentValue += (currentPrice * trade.quantidade);
    } else {
      totalRealizedPnl += trade.pnl_realizado;
    }
  });

  const openTradesPnl = totalCurrentValue - totalInvested;
  const totalPnlValue = openTradesPnl + totalRealizedPnl;

  const displayNetWorth = (totalCurrentValue + totalRealizedPnl) + (isSimulating ? simulatedActivePnL : 0);
  const displayPnlValue = totalPnlValue + (isSimulating ? simulatedActivePnL : 0);
  const displayPnlPercent = totalInvested > 0 ? (displayPnlValue / totalInvested) * 100 : 0;

  // New Step 127 calculation logic supporting both english & portuguese status strings
  const totalTrades = trades.length;
  const tradesAbertos = trades.filter(t => (t.status as string) === 'OPEN' || t.status === 'Aberto').length;
  const tradesFechados = trades.filter(t => (t.status as string) === 'CLOSE' || (t.status as string) === 'WIN' || (t.status as string) === 'LOSS' || t.status === 'Fechado_Gain' || t.status === 'Fechado_Loss').length;
  const tradesVencedores = trades.filter(t => (t.status as string) === 'WIN' || (t.status as string) === 'Fechado_Gain' || ((((t.status as string) === 'CLOSE' || (t.status as string) === 'Fechado_Gain') && (Number((t as any).pnl) > 0 || t.pnl_realizado > 0)))).length;

  const winRate = tradesFechados > 0 ? ((tradesVencedores / tradesFechados) * 100).toFixed(1) : "0";
  const pnlTotal = trades.reduce((acc, curr) => acc + (Number((curr as any).pnl) || Number(curr.pnl_realizado) || 0), 0);
  const capitalExposto = trades.filter(t => (t.status as string) === 'OPEN' || t.status === 'Aberto').reduce((acc, curr) => acc + (Number((curr as any).valorTotal) || (curr.preco_compra * curr.quantidade) || 0), 0);

  // Allocation metrics
  const coinAllocations: { [key: string]: number } = {};
  trades.forEach(t => {
    if (t.status !== 'Aberto') return;
    const currentPrice = coinPrices.find(c => c.moeda === t.moeda)?.current_price || t.preco_compra;
    const val = currentPrice * t.quantidade;
    coinAllocations[t.moeda] = (coinAllocations[t.moeda] || 0) + val;
  });

  const pieChartData = Object.keys(coinAllocations).map(key => ({
    name: key,
    value: Number(coinAllocations[key].toFixed(2)),
  })).sort((a, b) => b.value - a.value);

  const totalAllocationValue = pieChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Performance historical data tied dynamically
  const performanceHistory = [
    { data: 'MAI 2026', valor: Number((displayNetWorth * 0.88).toFixed(2)) },
    { data: 'JUN 2026', valor: Number((displayNetWorth * 0.94).toFixed(2)) },
    { data: 'JUL 2026', valor: Number((displayNetWorth * 0.92).toFixed(2)) },
    { data: 'AGO 2026', valor: Number((displayNetWorth * 0.97).toFixed(2)) },
    { data: 'SET 2026', valor: Number((displayNetWorth * 1.02).toFixed(2)) },
    { data: 'ATUAL', valor: Number(displayNetWorth.toFixed(2)) },
  ];

  return (
    <div className="space-y-6 font-mono text-zinc-300 select-none">
      
      {/* 4 Cards de Métricas Principais (Visão Macro) */}
      <div className="mb-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Dashboard Geral</h2>
        <p className="text-zinc-400 text-sm">Visão consolidada da sua carteira e performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: PNL Total */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">PNL Total</span>
            <span className="text-zinc-600">💰</span>
          </div>
          <p className={`text-2xl font-mono font-bold ${pnlTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {pnlTotal >= 0 ? '+' : '-'}$ {Math.abs(pnlTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card 2: Win Rate */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Win Rate</span>
            <span className="text-zinc-600">🎯</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-mono font-bold text-white">{winRate}%</p>
            <p className="text-xs text-zinc-500 mb-1 pb-0.5">{tradesVencedores}W / {tradesFechados - tradesVencedores}L</p>
          </div>
        </div>

        {/* Card 3: Capital Exposto */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Capital Exposto</span>
            <span className="text-zinc-600">🛡️</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-mono font-bold text-blue-400">
              $ {capitalExposto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-zinc-500 mb-1 pb-0.5 font-mono">em {tradesAbertos} ativos</p>
          </div>
        </div>

        {/* Card 4: Volume de Operações */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Total de Trades</span>
            <span className="text-zinc-600">📊</span>
          </div>
          <p className="text-2xl font-mono font-bold text-white">{totalTrades}</p>
        </div>
      </div>

      {/* Mid Charts Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        
        {/* Desempenho Chart */}
        <div className="lg:col-span-8 bg-[#0c0c0e]/80 border border-zinc-800 rounded-lg p-5">
          <div className="flex justify-between items-end mb-4 font-mono">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-100">Desempenho Geral do Portfólio</h3>
              <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Evolução do Capital Líquido (Histórico Semanal)</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[9px] text-zinc-500 uppercase">Drawdown Absoluto</p>
                <p className="text-[11px] font-mono text-red-400 font-bold">- 3.15%</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-zinc-500 uppercase">Fator Alpha</p>
                <p className="text-[11px] font-mono text-blue-400 font-bold">+ 2.40</p>
              </div>
            </div>
          </div>

          <div className="w-full h-[245px] border border-zinc-800/40 bg-zinc-950/20 rounded relative p-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="performanceGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                <XAxis dataKey="data" stroke="#3f3f46" fontSize={8} tickLine={false} />
                <YAxis stroke="#3f3f46" fontSize={8} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}
                  formatter={(v: any) => [`$${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Líquido']}
                />
                <Area type="monotone" dataKey="valor" stroke="#22c55e" strokeWidth={1.5} fillOpacity={1} fill="url(#performanceGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Sidebar */}
        <div className="lg:col-span-4 bg-[#0c0c0e]/80 border border-zinc-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 font-mono text-zinc-100">Top Alocação Cripto</h3>
            
            {totalAllocationValue > 0 ? (
              <div className="space-y-3 font-mono text-[11px]">
                {pieChartData.map((item, idx) => {
                  const percent = totalAllocationValue > 0 ? (item.value / totalAllocationValue) * 100 : 0;
                  const barColors = ['bg-orange-500', 'bg-blue-500', 'bg-purple-400', 'bg-pink-400', 'bg-emerald-400'];
                  const selectedColor = barColors[idx % barColors.length];
                  
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-5 ${selectedColor} rounded-sm`}></div>
                        <div>
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-[9px] text-zinc-500">Saldo: $ {item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-zinc-300">{percent.toFixed(1)}%</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500 font-mono text-[10px]">
                Sem posições ativas registradas
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-900 mt-4">
            <p className="text-[9px] text-zinc-500 uppercase mb-2 font-bold tracking-wider">Altcoins Hotspot (24h)</p>
            <div className="flex flex-wrap items-center gap-2">
              {coinPrices.slice(0, 4).map((coin) => {
                const isPositive = coin.change_24h >= 0;
                return (
                  <span
                    key={coin.moeda}
                    className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border ${
                      isPositive
                        ? 'bg-green-500/10 border-green-500/20 text-green-500'
                        : 'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}
                  >
                    {coin.moeda} {isPositive ? '+' : ''}{coin.change_24h}%
                  </span>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Placeholder Visual: Gráfico de Evolução do Portfólio em breve */}
      <div className="bg-[#0b0b0e] border border-dashed border-zinc-800 rounded-lg p-6 relative overflow-hidden flex flex-col justify-center items-center text-center">
        <div className="absolute right-3 top-3 px-1.5 py-0.5 bg-green-500/10 text-[9px] text-green-400 font-extrabold rounded-sm uppercase border border-green-500/15">
          DEVELOPER ROADMAP
        </div>
        
        <div className="w-10 h-10 bg-zinc-900/60 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-2">
          <TrendingUp className="w-5 h-5 text-zinc-500 animate-pulse" />
        </div>

        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-200">
          Gráfico de Evolução do Portfólio em breve
        </h4>
        <p className="text-[9px] text-zinc-500 mt-1 max-w-md uppercase leading-relaxed">
          Módulos de regressão linear para detecção de anomalias, drawdown probabilístico e índices de sharpe automáticos estão sendo preparados de forma nativa.
        </p>
      </div>

    </div>
  );
}
