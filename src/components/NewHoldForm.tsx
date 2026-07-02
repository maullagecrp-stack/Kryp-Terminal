import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  FileText,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { Instituicao } from '../types';

interface NewHoldFormProps {
  institutions: Instituicao[];
  onSubmitHold: (newHoldData: {
    data_hora: string;
    exchange: string;
    moeda: string;
    tipo: 'Compra' | 'Venda';
    preco_compra: number;
    quantidade: number;
    valor_investido: number;
    alvo_1: number | null;
    alvo_2: number | null;
    alvo_3: number | null;
    notas: string;
  }) => void;
  onCancel: () => void;
}

export default function NewHoldForm({
  institutions,
  onSubmitHold,
  onCancel
}: NewHoldFormProps) {
  const getCurrentDateTime = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
  };

  // State handles
  const [dataHora, setDataHora] = useState(getCurrentDateTime());
  const [exchange, setExchange] = useState(institutions[0]?.nome || 'Binance');
  const [moeda, setMoeda] = useState('');
  const [tipo, setTipo] = useState<'Compra' | 'Venda'>('Compra');
  
  const [precoCompra, setPrecoCompra] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorInvestido, setValorInvestido] = useState('');
  
  const [alvo1, setAlvo1] = useState('');
  const [alvo2, setAlvo2] = useState('');
  const [alvo3, setAlvo3] = useState('');
  const [notas, setNotas] = useState('');
  
  const [validationError, setValidationError] = useState<string | null>(null);

  // Helper parser
  const parseToFloat = (val: string): number => {
    const clean = val.replace(',', '.').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // 3-way binding logic
  const handlePrecoCompraChange = (rawVal: string) => {
    const val = rawVal.replace(/[^0-9.,]/g, '');
    setPrecoCompra(val);

    const p = parseToFloat(val);
    const q = parseToFloat(quantidade);
    const v = parseToFloat(valorInvestido);

    if (p > 0 && q > 0) {
      setValorInvestido(String(Number((p * q).toFixed(8))));
    } else if (p > 0 && v > 0) {
      setQuantidade(String(Number((v / p).toFixed(8))));
    }
  };

  const handleQuantidadeChange = (rawVal: string) => {
    const val = rawVal.replace(/[^0-9.,]/g, '');
    setQuantidade(val);

    const q = parseToFloat(val);
    const p = parseToFloat(precoCompra);
    const v = parseToFloat(valorInvestido);

    if (p > 0 && q > 0) {
      setValorInvestido(String(Number((p * q).toFixed(8))));
    } else if (q > 0 && v > 0) {
      setPrecoCompra(String(Number((v / q).toFixed(8))));
    }
  };

  const handleValorInvestidoChange = (rawVal: string) => {
    const val = rawVal.replace(/[^0-9.,]/g, '');
    setValorInvestido(val);

    const v = parseToFloat(val);
    const p = parseToFloat(precoCompra);
    const q = parseToFloat(quantidade);

    if (p > 0 && v > 0) {
      setQuantidade(String(Number((v / p).toFixed(8))));
    } else if (q > 0 && v > 0) {
      setPrecoCompra(String(Number((v / q).toFixed(8))));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!moeda.trim()) {
      setValidationError('Por favor, informe o ativo (ex: BTC, ETH).');
      return;
    }

    const priceNum = parseToFloat(precoCompra);
    if (priceNum <= 0) {
      setValidationError('A cotação de entrada/saída deve ser um valor válido maior que zero.');
      return;
    }

    const qtyNum = parseToFloat(quantidade);
    if (qtyNum <= 0) {
      setValidationError('A quantidade total deve ser maior que zero.');
      return;
    }

    const valueNum = parseToFloat(valorInvestido);
    if (valueNum <= 0) {
      setValidationError('O valor investido final deve ser maior que zero.');
      return;
    }

    const parseOptionalAlvo = (val: string): number | null => {
      if (!val.trim()) return null;
      const num = parseToFloat(val);
      return num > 0 ? num : null;
    };

    onSubmitHold({
      data_hora: dataHora,
      exchange,
      moeda: moeda.toUpperCase().trim(),
      tipo,
      preco_compra: priceNum,
      quantidade: qtyNum,
      valor_investido: valueNum,
      alvo_1: parseOptionalAlvo(alvo1),
      alvo_2: parseOptionalAlvo(alvo2),
      alvo_3: parseOptionalAlvo(alvo3),
      notas: notas.trim()
    });
  };

  return (
    <div id="new-hold-form-container" className="bg-[#0b0b0e] border border-zinc-850 rounded-lg max-w-4xl mx-auto shadow-2xl overflow-hidden transition-all duration-300">
      
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-zinc-900 bg-[#09090b] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/25">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-zinc-100 font-bold text-sm tracking-tight uppercase">Novo Lançamento - Hold Desk</h2>
            <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest leading-none">Gestão de Carteiras & Acumulação Spot</p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 hover:bg-zinc-900 rounded cursor-pointer"
          title="Cancelar"
          id="btn-close-hold-form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6">
        
        {/* Banner informativo de Hold */}
        <div className="bg-amber-950/10 border border-amber-600/15 rounded p-3 flex gap-3 text-xs text-amber-300 leading-relaxed font-mono">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Acumulação Automatizada:</strong> O HOLD foca no longo prazo sem margem técnica ou stop loss obrigatório. Os alvos de preço aqui servem de referência para realizações de lucro parciais planejados na sua tese de investimento.
          </span>
        </div>

        {validationError && (
          <div className="bg-red-950/20 border border-red-500/30 rounded p-3 text-xs text-red-400 flex items-center gap-2.5 font-mono">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Bloco A: Ativo & Operação */}
        <div className="space-y-3.5 bg-zinc-950/40 p-4 border border-zinc-900 rounded">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <h3 className="font-bold uppercase tracking-wider text-zinc-200 text-[11px]">Dados Gerais</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                DATA/HORA DO REGISTRO
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-2 top-2 text-zinc-650" />
                <input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 pl-7.5 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Exchange / Carteira
              </label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs font-mono"
                required
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.nome}>{inst.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Ativo (Ticker)
              </label>
              <input
                type="text"
                placeholder="Ex: BTC, ETH"
                value={moeda}
                onChange={(e) => setMoeda(e.target.value.toUpperCase())}
                className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 text-white placeholder-zinc-700 uppercase font-bold focus:outline-none focus:border-amber-500 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Tipo de Movimento
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[#050507] border border-zinc-850 p-1 rounded">
                <button
                  type="button"
                  onClick={() => setTipo('Compra')}
                  className={`py-1 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    tipo === 'Compra'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-extrabold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  APORTE
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('Venda')}
                  className={`py-1 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    tipo === 'Venda'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 font-extrabold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <TrendingDown className="w-3 h-3" />
                  REALIZAR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco B: Valuation & 3-Way Calculadora */}
        <div className="space-y-3.5 bg-zinc-950/40 p-4 border border-zinc-900 rounded">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <h3 className="font-bold uppercase tracking-wider text-zinc-200 text-[11px]">Valuation & Inteligência Financeira (3-Way)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                {tipo === 'Compra' ? 'Cotação na Compra' : 'Cotação na Venda'}
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-zinc-650 font-bold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={precoCompra}
                  onChange={(e) => handlePrecoCompraChange(e.target.value)}
                  className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 pl-5.5 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Quantidade de Moedas
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={quantidade}
                onChange={(e) => handleQuantidadeChange(e.target.value)}
                className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Valor Total (USD)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-zinc-650 font-bold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={valorInvestido}
                  onChange={(e) => handleValorInvestidoChange(e.target.value)}
                  className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 pl-5.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500 text-xs font-mono"
                  required
                />
              </div>
            </div>
          </div>
          
          {quantidade && precoCompra && (
            <div className="mt-2.5 pt-2 border-t border-zinc-900 bg-black/20 p-2 rounded text-[10px] text-zinc-400 flex items-center justify-between font-mono">
              <span>Status Estimado da Transação:</span>
              <span>
                Volume Real: <strong className="text-zinc-200">${(parseToFloat(quantidade) * parseToFloat(precoCompra)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
              </span>
            </div>
          )}
        </div>

        {/* Bloco C: Alvos long term */}
        <div className="space-y-3.5 bg-zinc-950/40 p-4 border border-zinc-900 rounded">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3.5 h-3.5 text-zinc-500" />
            <h3 className="font-bold uppercase tracking-wider text-zinc-200 text-[11px]">Realizações Planejadas (Alvos Remotos)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-500 text-[8px] uppercase font-bold text-center mb-1">Alvo de Saída 1 (Opcional)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-zinc-650 text-xs">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={alvo1}
                  onChange={(e) => setAlvo1(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 pl-5 text-center text-zinc-300 focus:outline-none focus:border-amber-500 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 text-[8px] uppercase font-bold text-center mb-1">Alvo de Saída 2 (Opcional)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-zinc-650 text-xs">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={alvo2}
                  onChange={(e) => setAlvo2(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 pl-5 text-center text-zinc-300 focus:outline-none focus:border-amber-500 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 text-[8px] uppercase font-bold text-center mb-1">Alvo de Saída 3 (Opcional)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-zinc-650 text-xs">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={alvo3}
                  onChange={(e) => setAlvo3(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full bg-[#050507] border border-zinc-850 rounded p-1.5 pl-5 text-center text-zinc-300 focus:outline-none focus:border-amber-500 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bloco D: Tese de Investimento */}
        <div className="space-y-3.5 bg-zinc-950/40 p-4 border border-zinc-900 rounded">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <h3 className="font-bold uppercase tracking-wider text-zinc-200 text-[11px]">Tese de Investimento & Fundamentalista</h3>
          </div>
          <div>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Descreva aqui por que você considera este ativo viável de carregar a longo prazo. Liste os fundamentos que apoiam este aporte (Halving, tokenomics, parcerias, utilidade, etc)..."
              rows={4}
              className="w-full bg-[#050507] border border-zinc-850 p-2.5 rounded text-zinc-300 placeholder-zinc-800 text-xs focus:outline-none focus:border-amber-500 leading-relaxed font-mono resize-none"
            />
          </div>
        </div>

        {/* Buttons footer */}
        <div className="pt-2 flex justify-end gap-3 border-t border-zinc-900">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200 rounded text-xs font-mono font-bold transition-colors cursor-pointer"
            id="btn-cancel-hold-form-submit"
          >
            CANCELAR
          </button>
          
          <button
            type="submit"
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs font-mono font-extrabold transition-colors cursor-pointer shadow-md"
            id="btn-confirm-hold-form-submit"
          >
            CONFIRMAR LANÇAMENTO
          </button>
        </div>

      </form>
    </div>
  );
}
