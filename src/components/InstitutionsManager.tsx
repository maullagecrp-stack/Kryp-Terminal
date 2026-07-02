import React, { useState } from 'react';
import { 
  Building2, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  X, 
  HelpCircle,
  TrendingUp,
  Wallet,
  Globe,
  DollarSign
} from 'lucide-react';
import { Instituicao, InstituicaoTipo } from '../types';

interface InstitutionsManagerProps {
  institutions: Instituicao[];
  onAddInstitution: (inst: { nome: string; tipo: InstituicaoTipo; cor_hex: string; native_coin?: string }) => void;
  onUpdateInstitution: (id: string, inst: { nome: string; tipo: InstituicaoTipo; cor_hex: string; native_coin?: string }) => void;
  onDeleteInstitution: (id: string) => void;
}

export default function InstitutionsManager({
  institutions,
  onAddInstitution,
  onUpdateInstitution,
  onDeleteInstitution,
}: InstitutionsManagerProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<InstituicaoTipo>('CEX');
  const [corHex, setCorHex] = useState('#22c55e');
  const [nativeCoin, setNativeCoin] = useState('');
  
  // Edit mode tracking
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    if (editingId) {
      onUpdateInstitution(editingId, { 
        nome: nome.trim(), 
        tipo, 
        cor_hex: corHex, 
        native_coin: nativeCoin.trim().toUpperCase() 
      });
      setEditingId(null);
    } else {
      onAddInstitution({ 
        nome: nome.trim(), 
        tipo, 
        cor_hex: corHex, 
        native_coin: nativeCoin.trim().toUpperCase() 
      });
    }

    // Reset Form
    setNome('');
    setTipo('CEX');
    setCorHex('#22c55e');
    setNativeCoin('');
  };

  const handleEditClick = (inst: Instituicao) => {
    setEditingId(inst.id);
    setNome(inst.nome);
    setTipo(inst.tipo);
    setCorHex(inst.cor_hex);
    setNativeCoin(inst.native_coin || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNome('');
    setTipo('CEX');
    setCorHex('#22c55e');
    setNativeCoin('');
  };

  // Helper icons for Institution Types
  const getTipoIcon = (t: InstituicaoTipo) => {
    switch (t) {
      case 'CEX':
        return <Globe className="w-3.5 h-3.5 text-blue-400" />;
      case 'DEX':
        return <TrendingUp className="w-3.5 h-3.5 text-amber-500" />;
      case 'Wallet':
        return <Wallet className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Bank':
        return <DollarSign className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  // Human descriptive text for Type Tags
  const getTipoLabel = (t: InstituicaoTipo) => {
    switch (t) {
      case 'CEX': return 'Centralizada (CEX)';
      case 'DEX': return 'Descentralizada (DEX)';
      case 'Wallet': return 'Carteira (Wallet)';
      case 'Bank': return 'Banco (Bank)';
      default: return t;
    }
  };

  return (
    <div id="institutions-manager-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* PARTE A: FORMULÁRIO DE CADASTRO (4 colunas) */}
      <div className="lg:col-span-5 bg-[#0c0c0e]/80 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-c00 border-zinc-800/80 pb-3">
          <Building2 className="w-5 h-5 text-green-500" />
          <div>
            <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
              {editingId ? 'Editar Instituição' : 'Nova Instituição'}
            </h3>
            <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-widest mt-0.5">
              {editingId ? 'Atualizar registro selecionado' : 'Adicionar carteiras, corretoras ou bancos'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1.5 font-bold">
              Nome da Instituição *
            </label>
            <input
              type="text"
              placeholder="ex: Binance, MetaMask, Nubank, Bybit"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 focus:outline-none focus:border-green-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1.5 font-bold">
              Tipo de Instituição *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as InstituicaoTipo)}
              className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 focus:outline-none focus:border-green-500 transition-colors cursor-pointer"
            >
              <option value="CEX">Corretora Centralizada (CEX)</option>
              <option value="DEX">Protocolo Descentralizado (DEX)</option>
              <option value="Wallet">Carteira Fria/Quente (Wallet)</option>
              <option value="Bank">Instituição Bancária (Bank)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1.5 font-bold">
              Moeda Nativa (Opcional - Ex: BNB, MX, MNT)
            </label>
            <input
              type="text"
              placeholder="ex: BNB, MX, MNT"
              value={nativeCoin}
              onChange={(e) => setNativeCoin(e.target.value)}
              className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 uppercase focus:outline-none focus:border-green-500 transition-colors placeholder-zinc-700 font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1.5 font-bold">
              Cor de Destaque / Identidade Visual *
            </label>
            <div className="flex items-center gap-3 bg-[#050507] border border-zinc-800 rounded p-2 text-zinc-100">
              <input
                type="color"
                value={corHex}
                onChange={(e) => setCorHex(e.target.value)}
                className="w-9 h-9 border border-zinc-700 bg-transparent rounded cursor-pointer shrink-0"
              />
              <div className="flex-1">
                <input
                  type="text"
                  maxLength={7}
                  value={corHex.toUpperCase()}
                  onChange={(e) => setCorHex(e.target.value)}
                  placeholder="#FFFFFF"
                  className="bg-transparent border-0 w-full text-zinc-300 font-bold uppercase tracking-widest text-xs focus:outline-none focus:ring-0"
                />
                <p className="text-[9px] text-zinc-500 mt-0.5">Será usada nos gráficos e tags do diário</p>
              </div>
              <div 
                className="w-4 h-4 rounded-full border border-zinc-800/80 mr-1"
                style={{ backgroundColor: corHex }}
              ></div>
            </div>
          </div>

          {/* Quick presets colors */}
          <div className="pt-1">
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-1.5">Sugestões Rápidas:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { hex: '#F3BA2F', title: 'Binance Gold' },
                { hex: '#E17614', title: 'MetaMask Orange' },
                { hex: '#111111', title: 'Bybit Dark' },
                { hex: '#820AD1', title: 'Nubank Purple' },
                { hex: '#3b82f6', title: 'Blue' },
                { hex: '#10b981', title: 'Green' },
                { hex: '#ef4444', title: 'Red' },
              ].map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setCorHex(preset.hex)}
                  title={preset.title}
                  className="w-5 h-5 rounded-full border border-zinc-900 transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: preset.hex }}
                ></button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase tracking-tight rounded border border-zinc-800 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-black font-extrabold uppercase tracking-tight rounded cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              id="btn-save-institution"
            >
              {editingId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-black" />
                  Salvar Instituição
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* PARTE B: LISTA DE CADASTROS (7 colunas) */}
      <div className="lg:col-span-7 bg-[#0c0c0e]/80 border border-zinc-800 rounded-lg p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Instituições Ativas
            </h3>
            <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-widest mt-0.5">
              Locais de Custódia Integrados ({institutions.length})
            </p>
          </div>
        </div>

        {institutions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-zinc-800 rounded bg-zinc-950/20">
            <Building2 className="w-8 h-8 text-zinc-650 text-zinc-600 mb-2.5" />
            <p className="text-zinc-400 font-mono text-xs">Nenhuma instituição cadastrada.</p>
            <p className="text-zinc-600 font-mono text-[10px] mt-1">Crie-as usando o formulário à esquerda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[9px] uppercase">
                  <th className="py-2.5 px-3">Identidade / Nome</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Cor Visual</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr 
                    key={inst.id} 
                    className={`border-b border-zinc-800/50 hover:bg-zinc-900/10 transition-colors ${
                      editingId === inst.id ? 'bg-green-950/10' : ''
                    }`}
                  >
                    {/* Nome & Indicador */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-1.5 h-6 rounded-sm shrink-0" 
                          style={{ backgroundColor: inst.cor_hex }}
                        ></div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-100">{inst.nome}</span>
                            {inst.native_coin && (
                              <span className="inline-block text-[8px] bg-yellow-500/10 border border-yellow-500/35 text-yellow-500 font-extrabold px-1.5 py-0.5 rounded font-mono uppercase shrink-0">
                                {inst.native_coin}
                              </span>
                            )}
                          </div>
                          <span className="block text-[8px] text-zinc-500 uppercase mt-0.5">ID: {inst.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>

                    {/* Tag Tipo */}
                    <td className="py-3 px-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950 text-zinc-300 text-[10px]">
                        {getTipoIcon(inst.tipo)}
                        {getTipoLabel(inst.tipo)}
                      </div>
                    </td>

                    {/* Cor Visual */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3.5 h-3.5 rounded-full border border-zinc-800" 
                          style={{ backgroundColor: inst.cor_hex }}
                        ></div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">{inst.cor_hex}</span>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(inst)}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                          title="Editar registro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteInstitution(inst.id)}
                          className="p-1.5 hover:bg-red-950/40 text-zinc-450 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Excluir de forma lógica"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
