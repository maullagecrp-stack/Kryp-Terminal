import React, { useEffect } from 'react';
import { 
  Sliders, 
  RefreshCw, 
  SlidersHorizontal,
  TrendingUp, 
  TrendingDown, 
  Gauge
} from 'lucide-react';
import { Trade } from '../types';

interface MarketSimulatorProps {
  activeTrades: Trade[];
  onSimulationChange?: (simulatedPnL: number, simulatedPrices: Record<string, number>) => void;
  variations: Record<string, number>;
  setVariations: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onlySliders?: boolean;
  onlyImpact?: boolean;
}

export default function MarketSimulator({ 
  activeTrades, 
  onSimulationChange,
  variations,
  setVariations,
  onlySliders = false,
  onlyImpact = false
}: MarketSimulatorProps) {
  // Extract unique active tickers
  const uniqueTickers = Array.from(new Set(activeTrades.map(t => t.moeda.toUpperCase()))).sort();

  // Handle single slider adjustment
  const handleSliderChange = (ticker: string, value: number) => {
    setVariations(prev => ({
      ...prev,
      [ticker]: value
    }));
  };

  // Reset all simulated variations back to 0.0%
  const handleResetAll = () => {
    const cleared = uniqueTickers.reduce((acc, ticker) => {
      acc[ticker] = 0;
      return acc;
    }, {} as Record<string, number>);
    setVariations(cleared);
  };

  // Run calculation mappings
  const simulatedTrades = activeTrades.map(t => {
    const ticker = t.moeda.toUpperCase();
    const variationPct = variations[ticker] !== undefined ? variations[ticker] : 0;
    
    // Preço Simulado = Preço de Entrada * (1 + (Variação / 100))
    const precoSimulado = t.preco_compra * (1 + variationPct / 100);
    
    // PNL Simulado calculation based on direction
    const isShort = t.tipo_operacao === 'Short';
    const precoCompra = t.preco_compra;
    const qty = t.quantidade;
    const taxaUsd = t.taxa_corretora_usd || 0;
    
    let simulatedPnL = 0;
    if (isShort) {
      simulatedPnL = (precoCompra - precoSimulado) * qty - taxaUsd;
    } else {
      simulatedPnL = (precoSimulado - precoCompra) * qty - taxaUsd;
    }

    // Verify Trailing Stop / Auto-Breakeven Levels
    let effectiveStopLoss = t.stop_loss;
    let stopLossLabel = '';

    if (!isShort) {
      if (t.alvo_5 !== null && precoSimulado >= t.alvo_5) {
        effectiveStopLoss = t.alvo_3;
        stopLossLabel = ' (Trailing: Alvo 3)';
      } else if (t.alvo_4 !== null && precoSimulado >= t.alvo_4) {
        effectiveStopLoss = t.alvo_2;
        stopLossLabel = ' (Trailing: Alvo 2)';
      } else if (t.alvo_3 !== null && precoSimulado >= t.alvo_3) {
        effectiveStopLoss = t.alvo_1;
        stopLossLabel = ' (Trailing: Alvo 1)';
      } else if (t.alvo_2 !== null && precoSimulado >= t.alvo_2) {
        effectiveStopLoss = t.preco_compra;
        stopLossLabel = ' (Breakeven)';
      }
    } else {
      if (t.alvo_5 !== null && precoSimulado <= t.alvo_5) {
        effectiveStopLoss = t.alvo_3;
        stopLossLabel = ' (Trailing: Alvo 3)';
      } else if (t.alvo_4 !== null && precoSimulado <= t.alvo_4) {
        effectiveStopLoss = t.alvo_2;
        stopLossLabel = ' (Trailing: Alvo 2)';
      } else if (t.alvo_3 !== null && precoSimulado <= t.alvo_3) {
        effectiveStopLoss = t.alvo_1;
        stopLossLabel = ' (Trailing: Alvo 1)';
      } else if (t.alvo_2 !== null && precoSimulado <= t.alvo_2) {
        effectiveStopLoss = t.preco_compra;
        stopLossLabel = ' (Breakeven)';
      }
    }

    // Verify Triggers (Stop Loss and Take Profit levels) using effective trailing Stop Loss
    let hitTrigger: string | null = null;
    let triggerColor = 'text-zinc-500 bg-zinc-950/20';

    if (!isShort) {
      // LONG Trades
      if (effectiveStopLoss !== null && precoSimulado <= effectiveStopLoss) {
        hitTrigger = `🔴 STOP HIT${stopLossLabel}`;
        triggerColor = 'bg-red-500/10 border border-red-500/30 text-red-400 font-bold';
      } else if (t.alvo_6 !== null && precoSimulado >= t.alvo_6) {
        hitTrigger = '🟢 ALVO 6 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_5 !== null && precoSimulado >= t.alvo_5) {
        hitTrigger = '🟢 ALVO 5 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_4 !== null && precoSimulado >= t.alvo_4) {
        hitTrigger = '🟢 ALVO 4 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_3 !== null && precoSimulado >= t.alvo_3) {
        hitTrigger = '🟢 ALVO 3 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_2 !== null && precoSimulado >= t.alvo_2) {
        hitTrigger = '🟢 ALVO 2 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_1 !== null && precoSimulado >= t.alvo_1) {
        hitTrigger = '🟢 ALVO 1 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      }
    } else {
      // SHORT Trades
      if (effectiveStopLoss !== null && precoSimulado >= effectiveStopLoss) {
        hitTrigger = `🔴 STOP HIT${stopLossLabel}`;
        triggerColor = 'bg-red-500/10 border border-red-500/30 text-red-400 font-bold';
      } else if (t.alvo_6 !== null && precoSimulado <= t.alvo_6) {
        hitTrigger = '🟢 ALVO 6 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_5 !== null && precoSimulado <= t.alvo_5) {
        hitTrigger = '🟢 ALVO 5 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_4 !== null && precoSimulado <= t.alvo_4) {
        hitTrigger = '🟢 ALVO 4 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_3 !== null && precoSimulado <= t.alvo_3) {
        hitTrigger = '🟢 ALVO 3 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_2 !== null && precoSimulado <= t.alvo_2) {
        hitTrigger = '🟢 ALVO 2 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      } else if (t.alvo_1 !== null && precoSimulado <= t.alvo_1) {
        hitTrigger = '🟢 ALVO 1 HIT';
        triggerColor = 'bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold';
      }
    }

    return {
      ...t,
      precoSimulado,
      simulatedPnL,
      effectiveStopLoss,
      hitTrigger,
      triggerColor,
      variationPct
    };
  });

  // Calculate simulated PNL metrics
  const totalOriginalVolume = activeTrades.reduce((acc, t) => acc + (t.preco_compra * t.quantidade), 0);
  const totalSimulatedPnL = simulatedTrades.reduce((acc, t) => acc + t.simulatedPnL, 0);
  const totalSimulatedVolume = simulatedTrades.reduce((acc, t) => acc + (t.precoSimulado * t.quantidade), 0);

  // Serialize complex objects into a stable primitive string key to prevent infinite r-renders
  const simDependencyKey = JSON.stringify(uniqueTickers.map(ticker => {
    const matchingTrade = activeTrades.find(t => t.moeda.toUpperCase() === ticker);
    const variation = variations[ticker] || 0;
    return {
      ticker,
      variation,
      preco_compra: matchingTrade ? matchingTrade.preco_compra : 0
    };
  })) + `_${totalSimulatedPnL}`;

  // Notify parent component if callback provided
  useEffect(() => {
    if (onSimulationChange) {
      const simulatedPrices: Record<string, number> = {};
      uniqueTickers.forEach(ticker => {
        const matchingTrade = activeTrades.find(t => t.moeda.toUpperCase() === ticker);
        if (matchingTrade) {
          const variationPct = variations[ticker] || 0;
          simulatedPrices[ticker] = matchingTrade.preco_compra * (1 + variationPct / 100);
        }
      });
      onSimulationChange(totalSimulatedPnL, simulatedPrices);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simDependencyKey]);

  const renderSlidersOnly = () => {
    return (
      <div className="bg-[#0c0c0e]/85 border border-[#1e1e24] rounded-lg p-5 font-mono text-xs select-none space-y-4 h-full">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-green-500" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-100">
              Controles do Simulador
            </h4>
          </div>
          
          {uniqueTickers.length > 0 && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold border border-zinc-850 hover:border-[#10b981]/40 bg-zinc-950/40 text-zinc-400 hover:text-[#10b981] rounded transition-all cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              RESETAR CONTROLES
            </button>
          )}
        </div>

        {uniqueTickers.length === 0 ? (
          <div className="text-zinc-550 text-[10px] py-6 text-center leading-relaxed">
            Nenhuma operação ativa ("Aberto") registrada no diário para simulação. Cadastre novos trades para habilitar os controles deslizantes.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-zinc-500 text-[9px] leading-relaxed uppercase tracking-wide">
              Ajuste a variação do ativo (-5.0% a +5.0%) para recalcular a marcação a mercado:
            </p>

            <div className="space-y-3">
              {uniqueTickers.map(ticker => {
                const variation = variations[ticker] !== undefined ? variations[ticker] : 0;

                return (
                  <div 
                    key={ticker} 
                    className="bg-zinc-950/30 rounded border border-zinc-900/60 p-2.5 space-y-2 transition-all hover:bg-zinc-950/50"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-extrabold text-zinc-200 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3" />
                        {ticker}
                        <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-850 text-[8px] text-zinc-500 rounded">
                          {activeTrades.filter(t => t.moeda.toUpperCase() === ticker).length} POS
                        </span>
                      </span>

                      <span className={`font-bold font-mono tracking-wider px-1.5 py-0.5 rounded text-[10px] ${
                        variation > 0 ? 'text-emerald-400 bg-emerald-950/20' : variation < 0 ? 'text-red-400 bg-red-950/20' : 'text-zinc-500 bg-zinc-900/40'
                      }`}>
                        {variation > 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-650 font-bold">-5%</span>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.1"
                        value={variation}
                        onChange={(e) => handleSliderChange(ticker, parseFloat(e.target.value))}
                        className="flex-1 accent-green-500 bg-zinc-900/80 h-1 rounded cursor-ew-resize focus:outline-none"
                      />
                      <span className="text-[9px] text-zinc-650 font-bold">+5%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderImpactOnly = () => {
    return (
      <div className="bg-[#0c0c0e]/85 border border-[#1e1e24] rounded-lg p-5 font-mono text-xs select-none space-y-4 h-full">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-green-500" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-100">
              Impacto no Portfólio Simulado
            </h4>
          </div>
        </div>

        {uniqueTickers.length === 0 ? (
          <div className="text-zinc-550 text-[10px] py-6 text-center leading-relaxed">
            Sem dados de impacto coletados para as posições abertas.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="bg-zinc-950/20 border border-zinc-900 rounded p-2.5 flex flex-col justify-between">
                <span className="block text-zinc-500 text-[8px] uppercase font-bold mb-1">Volume de Exposição Simulado</span>
                <span className="font-extrabold text-xs text-zinc-300">
                  $ {totalSimulatedVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className={`border rounded p-2.5 flex flex-col justify-between ${
                totalSimulatedPnL >= 0 
                  ? 'bg-emerald-950/10 border-emerald-990 border-emerald-900/20' 
                  : 'bg-red-950/10 border-red-990 border-red-900/20'
              }`}>
                <span className="block text-zinc-500 text-[8px] uppercase font-bold mb-1">PNL Simulado do Ajuste</span>
                <span className={`font-extrabold text-xs flex items-center gap-1 ${
                  totalSimulatedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {totalSimulatedPnL >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  $ {totalSimulatedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-[#a1a1aa] font-bold text-[8px] uppercase tracking-wide mb-1">Gatilhos Atingidos e Status por Posição</span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {simulatedTrades.map(t => {
                  const isGain = t.simulatedPnL >= 0;
                  return (
                    <div 
                      key={t.id} 
                      className="bg-zinc-950/40 border border-zinc-900/70 hover:border-zinc-800 rounded p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-1.5 transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={`px-1 rounded-sm text-[8px] font-extrabold border ${
                            t.tipo_operacao === 'Short' ? 'bg-red-950 text-red-450 border-red-900/35' : 'bg-green-950 text-green-450 border-green-900/35'
                          }`}>
                            {t.tipo_operacao || 'Long'}
                          </span>
                          <span className="font-extrabold text-zinc-100">
                            {t.quantidade} {t.moeda}
                          </span>
                          <span className="text-zinc-500 text-[9px]">
                            @ ${t.preco_compra.toLocaleString('en-US')}
                          </span>
                        </div>
                        
                        <div className="text-[9px] text-zinc-400 font-mono">
                          <div>Preço Simulado: <strong className="text-zinc-200">${t.precoSimulado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</strong></div>
                          {t.effectiveStopLoss !== t.stop_loss && (
                            <div className="text-amber-450 font-black text-[8px] mt-0.5 animate-pulse flex items-center gap-1 uppercase">
                              <span className="w-1 h-1 rounded-full bg-amber-450"></span>
                              🛡️ Stop subiu para: ${t.effectiveStopLoss?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                        {t.hitTrigger ? (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider ${t.triggerColor}`}>
                            {t.hitTrigger}
                          </span>
                        ) : (
                          <span className="px-1 text-zinc-650 text-[8px] border border-zinc-900/80 rounded bg-zinc-900/10">
                            In-Range
                          </span>
                        )}

                        <span className={`font-black text-[10px] ${
                          isGain ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isGain ? '+' : ''}${t.simulatedPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Default rendering back to backwards compatible single component structure if neither is specified
  if (!onlySliders && !onlyImpact) {
    return (
      <div className="bg-[#0c0c0e]/85 border border-[#1e1e24] rounded-lg p-4 font-mono text-xs select-none space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSlidersOnly()}
          {renderImpactOnly()}
        </div>
      </div>
    );
  }

  return onlySliders ? renderSlidersOnly() : renderImpactOnly();
}
