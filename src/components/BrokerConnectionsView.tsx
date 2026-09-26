import React, { useState } from 'react';
import {
  Link2,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  ShieldCheck,
  Building2,
  Trash2,
  Edit3,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  ArrowDownToLine,
  Zap,
  Globe,
  SlidersHorizontal,
  Search,
  Clock,
  DollarSign,
  Info
} from 'lucide-react';
import { BrokerAccount, BrokerAssetBalance, CoinPrice, Trade, Instituicao } from '../types';
import { SUPPORTED_BROKERS, testBrokerConnection, syncBrokerBalances, generateTradesFromBrokerAccount } from '../lib/brokerApi';
import BinanceDataSelectorModal from './BinanceDataSelectorModal';

interface BrokerConnectionsViewProps {
  accounts: BrokerAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<BrokerAccount[]>>;
  coinPrices: CoinPrice[];
  institutions: Instituicao[];
  onAddInstitution: (inst: { nome: string; tipo: any; cor_hex: string; native_coin?: string }) => void;
  onImportTrades: (trades: Trade[]) => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function BrokerConnectionsView({
  accounts,
  setAccounts,
  coinPrices,
  institutions,
  onAddInstitution,
  onImportTrades,
  showNotification,
}: BrokerConnectionsViewProps) {
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isTestingModalKey, setIsTestingModalKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});

  // Binance Data Selector Modal State
  const [isBinanceSelectorOpen, setIsBinanceSelectorOpen] = useState<boolean>(false);
  const [selectedBinanceAccountForSync, setSelectedBinanceAccountForSync] = useState<BrokerAccount | null>(null);

  // Form State
  const [formBroker, setFormBroker] = useState<string>('Binance');
  const [formNomeConta, setFormNomeConta] = useState<string>('');
  const [formTipoMercado, setFormTipoMercado] = useState<'Spot' | 'Futuros' | 'Ambos'>('Spot');
  const [formAmbiente, setFormAmbiente] = useState<'Mainnet' | 'Testnet'>('Mainnet');
  const [formApiKey, setFormApiKey] = useState<string>('');
  const [formApiSecret, setFormApiSecret] = useState<string>('');
  const [formPassphrase, setFormPassphrase] = useState<string>('');
  const [formCorHex, setFormCorHex] = useState<string>('#F3BA2F');
  const [showSecretInModal, setShowSecretInModal] = useState<boolean>(false);

  // Group accounts by broker
  const brokerAccountsSummary = accounts.reduce((acc, curr) => {
    acc[curr.broker] = (acc[curr.broker] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // Totals
  const totalBalanceUsd = accounts.reduce((acc, curr) => acc + (curr.saldo_total_usd || 0), 0);
  const availableBalanceUsd = accounts.reduce((acc, curr) => acc + (curr.saldo_disponivel_usd || 0), 0);

  // Filtered accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesBroker = selectedBrokerFilter === 'all' || acc.broker.toLowerCase() === selectedBrokerFilter.toLowerCase();
    const matchesSearch =
      acc.nome_conta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.broker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.balances && acc.balances.some((b) => b.asset.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesBroker && matchesSearch;
  });

  const handleOpenAddModal = (brokerName?: string) => {
    const targetBroker = brokerName || 'Binance';
    const brokerMeta = SUPPORTED_BROKERS.find((b) => b.name.toLowerCase() === targetBroker.toLowerCase());
    const count = (brokerAccountsSummary[targetBroker] || 0) + 1;

    setEditingAccountId(null);
    setFormBroker(targetBroker);
    setFormNomeConta(`${targetBroker} • Conta ${count < 10 ? '0' + count : count}`);
    setFormTipoMercado(brokerMeta?.marketTypes[0] || 'Spot');
    setFormAmbiente('Mainnet');
    setFormApiKey('');
    setFormApiSecret('');
    setFormPassphrase('');
    setFormCorHex(brokerMeta?.color || '#22c55e');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc: BrokerAccount) => {
    setEditingAccountId(acc.id);
    setFormBroker(acc.broker);
    setFormNomeConta(acc.nome_conta);
    setFormTipoMercado(acc.tipo_mercado);
    setFormAmbiente(acc.ambiente);
    setFormApiKey(acc.api_key);
    setFormApiSecret(acc.api_secret);
    setFormPassphrase(acc.passphrase || '');
    setFormCorHex(acc.cor_hex);
    setIsModalOpen(true);
  };

  const handleBrokerChange = (newBroker: string) => {
    setFormBroker(newBroker);
    const brokerMeta = SUPPORTED_BROKERS.find((b) => b.name.toLowerCase() === newBroker.toLowerCase());
    if (brokerMeta) {
      setFormCorHex(brokerMeta.color);
      const count = (brokerAccountsSummary[newBroker] || 0) + (editingAccountId ? 0 : 1);
      if (!editingAccountId) {
        setFormNomeConta(`${newBroker} • Conta ${count < 10 ? '0' + count : count}`);
      }
    }
  };

  const handleTestModalConnection = async () => {
    if (!formApiKey.trim() || !formApiSecret.trim()) {
      showNotification('Preencha a API Key e o API Secret para testar a conexão.', 'error');
      return;
    }
    setIsTestingModalKey(true);
    const res = await testBrokerConnection({
      broker: formBroker,
      nome_conta: formNomeConta,
      ambiente: formAmbiente,
      api_key: formApiKey,
      api_secret: formApiSecret,
      passphrase: formPassphrase,
    });
    setIsTestingModalKey(false);
    if (res.success) {
      showNotification(res.message, 'success');
    } else {
      showNotification(res.message, 'error');
    }
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNomeConta.trim()) {
      showNotification('Dê um nome para identificar esta conta da corretora.', 'error');
      return;
    }

    if (!formApiKey.trim() || !formApiSecret.trim()) {
      showNotification('API Key e API Secret são obrigatórios.', 'error');
      return;
    }

    // Auto-create corresponding Institution if it does not exist yet
    const instExists = institutions.some((i) => i.nome.toLowerCase() === formBroker.toLowerCase());
    if (!instExists) {
      const brokerMeta = SUPPORTED_BROKERS.find((b) => b.name.toLowerCase() === formBroker.toLowerCase());
      onAddInstitution({
        nome: formBroker,
        tipo: 'CEX',
        cor_hex: formCorHex,
        native_coin: brokerMeta?.nativeCoin,
      });
    }

    if (editingAccountId) {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === editingAccountId
            ? {
                ...acc,
                broker: formBroker,
                nome_conta: formNomeConta.trim(),
                tipo_mercado: formTipoMercado,
                ambiente: formAmbiente,
                api_key: formApiKey.trim(),
                api_secret: formApiSecret.trim(),
                passphrase: formPassphrase.trim() || undefined,
                cor_hex: formCorHex,
                status: 'Conectado',
                status_mensagem: 'Configurações atualizadas',
              }
            : acc
        )
      );
      showNotification(`Conta "${formNomeConta}" atualizada com sucesso!`, 'success');
    } else {
      const newAcc: BrokerAccount = {
        id: 'broker-' + crypto.randomUUID().substring(0, 8),
        broker: formBroker,
        nome_conta: formNomeConta.trim(),
        tipo_mercado: formTipoMercado,
        ambiente: formAmbiente,
        api_key: formApiKey.trim(),
        api_secret: formApiSecret.trim(),
        passphrase: formPassphrase.trim() || undefined,
        status: 'Conectado',
        status_mensagem: 'Chaves vinculadas. Clique em "Selecionar Dados" para sincronizar.',
        ultimo_sync: new Date().toISOString(),
        saldo_total_usd: 0,
        saldo_disponivel_usd: 0,
        balances: [],
        cor_hex: formCorHex,
        ativo: true,
        created_at: new Date().toISOString(),
      };

      setAccounts((prev) => [newAcc, ...prev]);
      showNotification(`Nova conta "${newAcc.nome_conta}" conectada via API com sucesso!`, 'success');

      // Se for Binance, já abre o seletor para o usuário escolher o que puxar
      if (newAcc.broker.toLowerCase() === 'binance') {
        setSelectedBinanceAccountForSync(newAcc);
        setIsBinanceSelectorOpen(true);
      }
    }

    setIsModalOpen(false);
  };

  const handleTestConnection = async (acc: BrokerAccount) => {
    setTestingId(acc.id);
    const res = await testBrokerConnection(acc);
    setTestingId(null);

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === acc.id
          ? {
              ...a,
              status: res.success ? 'Conectado' : 'Erro',
              status_mensagem: res.message,
              ultimo_sync: new Date().toISOString(),
            }
          : a
      )
    );

    showNotification(res.message, res.success ? 'success' : 'error');
  };

  const handleSaveBinanceBalances = (
    accountId: string,
    balances: BrokerAssetBalance[],
    totalUsd: number,
    availableUsd: number
  ) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? {
              ...a,
              balances,
              saldo_total_usd: totalUsd,
              saldo_disponivel_usd: availableUsd,
              status: 'Conectado',
              status_mensagem: `Saldos reais sincronizados (${balances.length} ativos)`,
              ultimo_sync: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const handleSyncAccount = (acc: BrokerAccount) => {
    if (acc.broker.toLowerCase() === 'binance') {
      setSelectedBinanceAccountForSync(acc);
      setIsBinanceSelectorOpen(true);
      return;
    }

    setSyncingId(acc.id);
    setTimeout(() => {
      const updated = syncBrokerBalances(acc, coinPrices);
      setAccounts((prev) => prev.map((a) => (a.id === acc.id ? updated : a)));
      setSyncingId(null);
      showNotification(`Saldos e posições de "${acc.nome_conta}" sincronizados com a API!`, 'success');
    }, 600);
  };

  const handleSyncAllAccounts = () => {
    accounts.forEach((acc) => {
      if (acc.broker.toLowerCase() === 'binance') {
        // Para Binance, mantém os saldos que o usuário já escolheu e recalcula com preços
        const updated = syncBrokerBalances(acc, coinPrices);
        setAccounts((prev) => prev.map((a) => (a.id === acc.id ? updated : a)));
      } else {
        const updated = syncBrokerBalances(acc, coinPrices);
        setAccounts((prev) => prev.map((a) => (a.id === acc.id ? updated : a)));
      }
    });
    showNotification(`Todas as ${accounts.length} contas de corretoras foram recalculadas com cotações atuais!`, 'success');
  };

  const handleImportTrades = (acc: BrokerAccount) => {
    if (acc.broker.toLowerCase() === 'binance') {
      setSelectedBinanceAccountForSync(acc);
      setIsBinanceSelectorOpen(true);
      return;
    }
    const imported = generateTradesFromBrokerAccount(acc, coinPrices);
    onImportTrades(imported);
    showNotification(`${imported.length} operações abertas da conta "${acc.nome_conta}" foram importadas para o Trade Desk!`, 'success');
  };

  const handleDeleteAccount = (acc: BrokerAccount) => {
    if (confirm(`Tem certeza que deseja desconectar a conta "${acc.nome_conta}"? As chaves de API serão removidas.`)) {
      setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
      showNotification(`Conta "${acc.nome_conta}" desconectada.`, 'info');
    }
  };

  const handleCopyKey = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const formatCurrency = (val: number) => {
    return '$ ' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Info */}
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  Conexões com Corretoras via API
                  <span className="text-[10px] bg-green-950/80 text-green-400 border border-green-800/80 px-2 py-0.5 rounded font-normal">
                    Multi-Contas Ativo
                  </span>
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Conecte múltiplas contas em cada corretora (ex: Binance Spot Principal + Binance Subconta Futuros + Bybit Scalp).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSyncAllAccounts}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              Sincronizar Todas
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded text-xs font-mono font-extrabold uppercase tracking-tight flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-green-500/10"
              id="btn-add-broker-account"
            >
              <Plus className="w-4 h-4 text-black" />
              Conectar Nova Conta
            </button>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-zinc-800/80 font-mono">
          <div className="bg-[#070709] border border-zinc-800/90 rounded p-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Saldo Total em APIs</span>
            <span className="text-lg font-bold text-white mt-1 block">{formatCurrency(totalBalanceUsd)}</span>
            <span className="text-[9px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Consolidado em todas as corretoras
            </span>
          </div>

          <div className="bg-[#070709] border border-zinc-800/90 rounded p-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Saldo Disponível (Livre)</span>
            <span className="text-lg font-bold text-green-400 mt-1 block">{formatCurrency(availableBalanceUsd)}</span>
            <span className="text-[9px] text-zinc-500 mt-0.5 block">Pronto para novas ordens</span>
          </div>

          <div className="bg-[#070709] border border-zinc-800/90 rounded p-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Contas Conectadas</span>
            <span className="text-lg font-bold text-white mt-1 block">{accounts.length} contas ativas</span>
            <span className="text-[9px] text-zinc-400 mt-0.5 block">
              Distribuídas em {Object.keys(brokerAccountsSummary).length} corretoras
            </span>
          </div>

          <div className="bg-[#070709] border border-zinc-800/90 rounded p-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Segurança das Chaves</span>
            <span className="text-xs font-bold text-emerald-300 mt-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Leitura Local Isolada
            </span>
            <span className="text-[9px] text-zinc-500 mt-0.5 block">Sem permissão de saques</span>
          </div>
        </div>
      </div>

      {/* Broker Accounts Overview Bar & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0c0c0e] border border-zinc-800 rounded-lg p-3">
        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none font-mono text-xs">
          <button
            onClick={() => setSelectedBrokerFilter('all')}
            className={`px-3 py-1.5 rounded transition-all whitespace-nowrap cursor-pointer text-xs ${
              selectedBrokerFilter === 'all'
                ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            Todas as Contas ({accounts.length})
          </button>

          {Object.entries(brokerAccountsSummary).map(([broker, count]) => {
            const meta = SUPPORTED_BROKERS.find((b) => b.name.toLowerCase() === broker.toLowerCase());
            return (
              <button
                key={broker}
                onClick={() => setSelectedBrokerFilter(broker)}
                className={`px-3 py-1.5 rounded transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs ${
                  selectedBrokerFilter.toLowerCase() === broker.toLowerCase()
                    ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: meta?.color || '#22c55e' }}
                ></span>
                {broker}
                <span className="bg-zinc-950 text-zinc-400 border border-zinc-800 px-1.5 py-0.2 rounded text-[10px]">
                  {count} {count === 1 ? 'conta' : 'contas'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por conta, moeda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050507] border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500 font-mono"
          />
        </div>
      </div>

      {/* Accounts Cards Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-[#0c0c0e] border border-dashed border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center justify-center font-mono">
          <Key className="w-10 h-10 text-zinc-600 mb-3" />
          <h3 className="text-zinc-300 font-bold text-sm">Nenhuma conta de corretora encontrada</h3>
          <p className="text-zinc-500 text-xs mt-1 max-w-md">
            Você pode conectar múltiplas contas por corretora via API para sincronizar saldos e operações automaticamente.
          </p>
          <button
            onClick={() => handleOpenAddModal()}
            className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-400 text-black text-xs font-bold uppercase rounded cursor-pointer transition-colors"
          >
            Conectar Primeira Conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAccounts.map((acc) => {
            const isTesting = testingId === acc.id;
            const isSyncing = syncingId === acc.id;
            const showKeySecret = showSecrets[acc.id];
            const meta = SUPPORTED_BROKERS.find((b) => b.name.toLowerCase() === acc.broker.toLowerCase());

            return (
              <div
                key={acc.id}
                className="bg-[#0c0c0e] border border-zinc-800 hover:border-zinc-700/80 rounded-lg flex flex-col justify-between transition-all duration-200 overflow-hidden shadow-lg relative group"
              >
                {/* Visual Accent Top Bar */}
                <div className="h-1 w-full" style={{ backgroundColor: acc.cor_hex || meta?.color || '#22c55e' }}></div>

                <div className="p-4 space-y-4 flex-1">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-xs font-extrabold uppercase font-mono border"
                        style={{
                          backgroundColor: `${acc.cor_hex || meta?.color || '#22c55e'}15`,
                          borderColor: `${acc.cor_hex || meta?.color || '#22c55e'}40`,
                          color: acc.cor_hex || meta?.color || '#22c55e',
                        }}
                      >
                        {acc.broker.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-mono text-xs font-bold text-white tracking-tight">{acc.nome_conta}</h4>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                          Corretora: <strong className="text-zinc-200">{acc.broker}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          acc.status === 'Conectado'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                            : acc.status === 'Erro'
                            ? 'bg-red-950/60 text-red-400 border-red-800/80'
                            : 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            acc.status === 'Conectado'
                              ? 'bg-emerald-400 animate-pulse'
                              : acc.status === 'Erro'
                              ? 'bg-red-400'
                              : 'bg-amber-400'
                          }`}
                        ></span>
                        {acc.status}
                      </span>
                      {acc.ambiente === 'Testnet' && (
                        <span className="text-[9px] font-mono text-amber-400 mt-1 uppercase font-bold">
                          [Testnet / Demo]
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Market & Environment Badges */}
                  <div className="flex items-center gap-1.5 font-mono text-[10px] flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      Mercado: <strong className="text-white">{acc.tipo_mercado}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {acc.ambiente}
                    </span>
                    {acc.passphrase && (
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-blue-400">
                        Passphrase OK
                      </span>
                    )}
                  </div>

                  {/* Saldo Section */}
                  <div className="bg-[#050507] border border-zinc-800/90 rounded p-3 font-mono">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                      <span>Saldo em Custódia</span>
                      <span>Disponível</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-extrabold text-white">
                        {formatCurrency(acc.saldo_total_usd || 0)}
                      </span>
                      <span className="text-xs font-bold text-green-400">
                        {formatCurrency(acc.saldo_disponivel_usd || 0)}
                      </span>
                    </div>

                    {/* Asset Breakdown Chips */}
                    {acc.balances && acc.balances.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
                        {acc.balances.map((b) => (
                          <div
                            key={b.asset}
                            className="bg-zinc-900/90 border border-zinc-800 px-2 py-1 rounded text-[10px] flex items-center gap-1.5 shrink-0"
                          >
                            <span className="font-bold text-zinc-200">{b.asset}:</span>
                            <span className="text-zinc-400">{b.total.toLocaleString()}</span>
                            <span className="text-zinc-500 text-[9px]">({formatCurrency(b.usdValue)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* API Key Box */}
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>API KEY:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setShowSecrets((prev) => ({ ...prev, [acc.id]: !prev[acc.id] }))
                          }
                          className="hover:text-zinc-200 transition-colors cursor-pointer"
                          title={showKeySecret ? 'Ocultar' : 'Exibir chave'}
                        >
                          {showKeySecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleCopyKey(acc.id, acc.api_key)}
                          className="hover:text-green-400 transition-colors cursor-pointer flex items-center gap-1 text-[9px]"
                        >
                          {copiedKeyId === acc.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          {copiedKeyId === acc.id ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#050507] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-400 text-[10px] truncate select-all">
                      {showKeySecret ? acc.api_key : `${acc.api_key.substring(0, 6)}••••••••••••${acc.api_key.substring(acc.api_key.length - 4)}`}
                    </div>
                  </div>

                  {/* Status message / Last sync */}
                  <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between pt-1">
                    <span className="truncate max-w-[200px]" title={acc.status_mensagem}>
                      {acc.status_mensagem || 'Pronto'}
                    </span>
                    {acc.ultimo_sync && (
                      <span className="shrink-0 flex items-center gap-1 text-zinc-600">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(acc.ultimo_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="bg-[#08080a] border-t border-zinc-800/90 p-2.5 flex items-center justify-between gap-1.5 font-mono text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTestConnection(acc)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      title="Testar ping e autenticação com servidor da corretora"
                    >
                      <Zap className={`w-3 h-3 ${isTesting ? 'animate-bounce text-amber-400' : 'text-zinc-400'}`} />
                      {isTesting ? 'Testando...' : 'Testar'}
                    </button>

                    {acc.broker.toLowerCase() === 'binance' ? (
                      <button
                        onClick={() => {
                          setSelectedBinanceAccountForSync(acc);
                          setIsBinanceSelectorOpen(true);
                        }}
                        className="px-3 py-1.5 bg-[#F3BA2F]/15 hover:bg-[#F3BA2F]/25 border border-[#F3BA2F]/40 text-[#F3BA2F] rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        title="Selecionar moedas e ordens para sincronizar da Binance via API Real"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-[#F3BA2F]" />
                        Selecionar Dados (API)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSyncAccount(acc)}
                        disabled={isSyncing}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        title="Sincronizar saldo de moedas via API"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-green-400' : 'text-zinc-400'}`} />
                        {isSyncing ? 'Atualizando...' : 'Sincronizar'}
                      </button>
                    )}

                    <button
                      onClick={() => handleImportTrades(acc)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-green-400 hover:text-green-300 rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Puxar ordens e posições abertas para a mesa de operações (Trade Desk)"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                      Puxar Trades
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(acc)}
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                      title="Editar configurações da conta"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteAccount(acc)}
                      className="p-1.5 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                      title="Desconectar esta conta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NOVA CONEXÃO / EDITAR CONEXÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-zinc-800 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#08080a]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {editingAccountId ? 'Editar Conta de Corretora' : 'Conectar Conta de Corretora'}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Você pode conectar múltiplas contas na mesma corretora.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveAccount} className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Corretora Selection */}
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                  1. Selecione a Corretora (Exchange) *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {SUPPORTED_BROKERS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBrokerChange(b.name)}
                      className={`p-2 rounded border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        formBroker.toLowerCase() === b.name.toLowerCase()
                          ? 'bg-zinc-800 border-green-500 text-white font-bold'
                          : 'bg-[#050507] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: b.color }}
                      ></span>
                      <span className="text-[11px] truncate w-full">{b.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome / Identificador da Conta */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                    2. Nome / Identificador Desta Conta *
                  </label>
                  <span className="text-[9px] text-green-400">Suporta 2+ contas por corretora</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="ex: Binance Conta Principal, Binance Subconta Futuros, Bybit Scalp"
                  value={formNomeConta}
                  onChange={(e) => setFormNomeConta(e.target.value)}
                  className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-green-500 transition-colors"
                />
                <p className="text-[9px] text-zinc-500 mt-1">
                  Dica: Dê um nome claro para diferenciar entre contas Spot, Futuros, Robôs ou Subcontas.
                </p>
              </div>

              {/* Mercado & Ambiente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                    Tipo de Mercado *
                  </label>
                  <select
                    value={formTipoMercado}
                    onChange={(e) => setFormTipoMercado(e.target.value as any)}
                    className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 focus:outline-none focus:border-green-500 cursor-pointer"
                  >
                    <option value="Spot">Spot (À Vista)</option>
                    <option value="Futuros">Futuros / Derivativos</option>
                    <option value="Ambos">Ambos (Unified Account)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                    Ambiente *
                  </label>
                  <select
                    value={formAmbiente}
                    onChange={(e) => setFormAmbiente(e.target.value as any)}
                    className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 focus:outline-none focus:border-green-500 cursor-pointer"
                  >
                    <option value="Mainnet">Mainnet (Produção Real)</option>
                    <option value="Testnet">Testnet / Sandbox (Simulado)</option>
                  </select>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                  API Key *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cole sua API Key da corretora"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-green-500 transition-colors font-mono"
                />
              </div>

              {/* API Secret */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                    API Secret *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecretInModal(!showSecretInModal)}
                    className="text-[9px] text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center gap-1"
                  >
                    {showSecretInModal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSecretInModal ? 'Ocultar' : 'Exibir'}
                  </button>
                </div>
                <input
                  type={showSecretInModal ? 'text' : 'password'}
                  required
                  placeholder="Cole seu API Secret da corretora"
                  value={formApiSecret}
                  onChange={(e) => setFormApiSecret(e.target.value)}
                  className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-green-500 transition-colors font-mono"
                />
              </div>

              {/* Passphrase (se aplicável ou opcional) */}
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                  Passphrase {['okx', 'kucoin', 'bitget'].includes(formBroker.toLowerCase()) ? '(Obrigatória para esta corretora)' : '(Opcional)'}
                </label>
                <input
                  type="password"
                  placeholder="Frase de acesso / Passphrase criada na API"
                  value={formPassphrase}
                  onChange={(e) => setFormPassphrase(e.target.value)}
                  className="w-full bg-[#050507] border border-zinc-800 rounded p-2.5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-green-500 transition-colors font-mono"
                />
              </div>

              {/* Cor Visual da Conta */}
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                  Cor da Conta (Para Identificação Visual no Diário)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formCorHex}
                    onChange={(e) => setFormCorHex(e.target.value)}
                    className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formCorHex.toUpperCase()}
                    onChange={(e) => setFormCorHex(e.target.value)}
                    className="bg-[#050507] border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 font-bold uppercase w-24"
                  />
                </div>
              </div>

              {/* Security Warning Box */}
              <div className="bg-amber-950/20 border border-amber-900/40 rounded p-3 text-[10px] text-amber-300 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-200">Recomendação de Segurança Kryp Terminal:</strong>
                  Crie sua API Key na corretora com permissão exclusiva de <strong>LEITURA (Read-Only)</strong> e visualização de saldos/ordens. 
                  <span className="text-red-300 font-bold"> NUNCA habilite permissão de Saques (Withdrawals).</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestModalConnection}
                  disabled={isTestingModalKey}
                  className="px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-200 rounded font-bold text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${isTestingModalKey ? 'text-amber-400 animate-bounce' : 'text-zinc-400'}`} />
                  {isTestingModalKey ? 'Testando Ping...' : 'Testar Conexão'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded font-bold text-xs cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-400 text-black font-extrabold uppercase rounded text-xs cursor-pointer transition-all shadow-lg shadow-green-500/10 flex items-center gap-1.5"
                    id="btn-save-broker-modal"
                  >
                    <Check className="w-4 h-4 text-black" />
                    {editingAccountId ? 'Salvar Alterações' : 'Conectar Conta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Seleção e Sincronização de Dados da Binance */}
      <BinanceDataSelectorModal
        isOpen={isBinanceSelectorOpen}
        onClose={() => setIsBinanceSelectorOpen(false)}
        account={selectedBinanceAccountForSync}
        coinPrices={coinPrices}
        onSaveBalances={handleSaveBinanceBalances}
        onImportSelectedTrades={onImportTrades}
        showNotification={showNotification}
      />
    </div>
  );
}
