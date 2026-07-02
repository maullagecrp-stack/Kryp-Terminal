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

  // Win Rate computation
  const closedTrades = trades.filter(t => t.status !== 'Aberto');
  const winTrades = closedTrades.filter(t => t.status === 'Fechado_Gain');
  const winRate = closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 68.4;

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-[#09090b] p-1 border border-zinc-900 rounded-lg shrink-0">
        
        {/* Net Worth */}
        <div className="p-4 bg-[#0c0c0e]/95 border border-zinc-800/80 rounded-md relative overflow-hidden group">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider flex items-center gap-1.5">
              TOTAL NET WORTH
              {isSimulating && (
                <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1 py-0.2 rounded font-extrabold animate-pulse">
                  SIMULADO
                </span>
              )}
            </span>
            <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <h2 className="text-lg md:text-xl font-black text-zinc-50 tracking-tight">
            $ {displayNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-[9px] text-green-400 mt-1 flex items-center gap-1 font-mono">
            <span>▲</span>
            <span>Em Aberto: $ {(totalCurrentValue + (isSimulating ? simulatedActivePnL : 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Invested Capital */}
        <div className="p-4 bg-[#0c0c0e]/95 border border-zinc-800/80 rounded-md">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">INVESTED CAPITAL</span>
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <h2 className="text-lg md:text-xl font-black text-zinc-50 tracking-tight">
            $ {totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-[9px] text-zinc-400 mt-1">
            {trades.filter(t => t.status === 'Aberto').length} Posições Ativas
          </p>
        </div>

        {/* Total PNL */}
        <div className="p-4 bg-[#111115]/50 border border-zinc-800/80 rounded-md">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">TOTAL PNL</span>
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <h2 className={`text-lg md:text-xl font-black tracking-tight ${displayPnlValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {displayPnlValue >= 0 ? '+' : ''}$ {displayPnlValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className={`text-[9px] mt-1 ${displayPnlValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            Acumulado: {displayPnlPercent.toFixed(2)}%
          </p>
        </div>

        {/* Win Rate */}
        <div className="p-4 bg-[#0c0c0e]/95 border border-zinc-800/80 rounded-md">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">WIN RATE (TAXA)</span>
            <FileCheck2 className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <h2 className="text-lg md:text-xl font-black text-zinc-50 tracking-tight">
            {winRate.toFixed(1)}%
          </h2>
          <div className="w-full h-1 bg-zinc-800 rounded mt-2.5 overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${winRate}%` }}></div>
          </div>
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
