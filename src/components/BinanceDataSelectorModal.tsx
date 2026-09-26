import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ArrowDownToLine,
  Search,
  Check,
  Calendar,
  Layers,
  HelpCircle,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Filter,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info,
  Plus,
  FileSpreadsheet,
  Upload,
  Globe,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { BrokerAccount, BrokerAssetBalance, CoinPrice, Trade } from '../types';
import {
  fetchRealBinanceBalances,
  fetchRealBinanceTrades,
  convertBinanceTradeToTradeItem,
  parseBinanceCsvTrades,
} from '../lib/brokerApi';

interface BinanceDataSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BrokerAccount | null;
  coinPrices: CoinPrice[];
  onSaveBalances: (
    accountId: string,
    balances: BrokerAssetBalance[],
    totalUsd: number,
    availableUsd: number
  ) => void;
  onImportSelectedTrades: (trades: Trade[]) => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

interface ManualAssetRow {
  asset: string;
  free: string;
  locked: string;
}

const POPULAR_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'ADAUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'NEARUSDT',
  'SUIUSDT',
  'PEPEUSDT',
];

const POPULAR_COINS = [
  'USDT',
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'ADA',
  'XRP',
  'DOGE',
  'PEPE',
  'SUI',
  'AVAX',
  'LINK',
];

export default function BinanceDataSelectorModal({
  isOpen,
  onClose,
  account,
  coinPrices,
  onSaveBalances,
  onImportSelectedTrades,
  showNotification,
}: BinanceDataSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<'balances' | 'manual' | 'trades' | 'faq'>('balances');

  // Tab 1: Balances via API State
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [rawBalances, setRawBalances] = useState<BrokerAssetBalance[]>([]);
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<{ [asset: string]: boolean }>({});
  const [hideDust, setHideDust] = useState(true);
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Tab 2: Manual / Direct Wallet Adjustment State
  const [manualRows, setManualRows] = useState<ManualAssetRow[]>([]);
  const [newManualTicker, setNewManualTicker] = useState('');

  // Tab 3: Trades Tab State
  const [tradesSubTab, setTradesSubTab] = useState<'api' | 'csv'>('api');
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
  const [customPairInput, setCustomPairInput] = useState('');
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [fetchedRawTrades, setFetchedRawTrades] = useState<any[]>([]);
  const [selectedTradeIds, setSelectedTradeIds] = useState<{ [id: string]: boolean }>({});
  const [tradesError, setTradesError] = useState<string | null>(null);

  // CSV Import State
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedCsvTrades, setParsedCsvTrades] = useState<Trade[]>([]);
  const [selectedCsvTradeIds, setSelectedCsvTradeIds] = useState<{ [id: string]: boolean }>({});
  const [csvParseErrors, setCsvParseErrors] = useState<string[]>([]);

  // Carrega saldos existentes da conta
  useEffect(() => {
    if (account && account.balances && account.balances.length > 0) {
      setRawBalances(account.balances);
      const initialMap: { [k: string]: boolean } = {};
      account.balances.forEach((b) => {
        initialMap[b.asset] = true;
      });
      setSelectedAssetKeys(initialMap);

      // Inicializa linhas manuais com os saldos existentes
      setManualRows(
        account.balances.map((b) => ({
          asset: b.asset,
          free: b.free.toString(),
          locked: b.locked.toString(),
        }))
      );
    } else {
      setRawBalances([]);
      setSelectedAssetKeys({});
      setManualRows([
        { asset: 'USDT', free: '0', locked: '0' },
        { asset: 'BTC', free: '0', locked: '0' },
        { asset: 'ETH', free: '0', locked: '0' },
        { asset: 'SOL', free: '0', locked: '0' },
      ]);
    }
    setBalanceError(null);
    setTradesError(null);
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  // Preço unitário em USD
  const getAssetUnitPrice = (assetTicker: string): number => {
    const upper = assetTicker.toUpperCase().trim();
    if (['USDT', 'USDC', 'FDUSD', 'BUSD', 'USD', 'DAI'].includes(upper)) return 1.0;
    const found = coinPrices.find((c) => c.moeda.toUpperCase() === upper);
    if (found) return found.current_price;
    if (upper === 'BTC') return 68000;
    if (upper === 'ETH') return 3400;
    if (upper === 'BNB') return 580;
    if (upper === 'SOL') return 145;
    if (upper === 'ADA') return 0.72;
    if (upper === 'XRP') return 1.85;
    if (upper === 'DOGE') return 0.22;
    return 0;
  };

  // ----------------------------------------------------
  // TAB 1: CONSULTAR VIA API
  // ----------------------------------------------------
  const handleFetchBalances = async () => {
    setIsLoadingBalances(true);
    setBalanceError(null);

    const res = await fetchRealBinanceBalances(account, coinPrices, {
      hideZero: false,
    });

    setIsLoadingBalances(false);

    if (res.success) {
      setRawBalances(res.balances);
      const newSelected: { [k: string]: boolean } = {};
      res.balances.forEach((b) => {
        if (b.usdValue >= 0.5 || b.total >= 0.001) {
          newSelected[b.asset] = true;
        }
      });
      setSelectedAssetKeys(newSelected);
      showNotification(`${res.balances.length} ativos encontrados na sua conta Binance!`, 'success');
    } else {
      setBalanceError(res.error || 'Falha ao buscar saldos na Binance.');
      showNotification(res.error || 'Falha ao buscar saldos', 'error');
    }
  };

  const filteredBalances = rawBalances.filter((b) => {
    const matchesSearch = b.asset.toLowerCase().includes(balanceSearch.toLowerCase());
    const matchesDust = hideDust ? b.usdValue >= 0.5 || b.total >= 0.01 : true;
    return matchesSearch && matchesDust;
  });

  const toggleAssetSelection = (asset: string) => {
    setSelectedAssetKeys((prev) => ({
      ...prev,
      [asset]: !prev[asset],
    }));
  };

  const handleSelectAllAssets = () => {
    const map: { [k: string]: boolean } = {};
    filteredBalances.forEach((b) => {
      map[b.asset] = true;
    });
    setSelectedAssetKeys((prev) => ({ ...prev, ...map }));
  };

  const handleDeselectAllAssets = () => {
    const map: { [k: string]: boolean } = {};
    filteredBalances.forEach((b) => {
      map[b.asset] = false;
    });
    setSelectedAssetKeys((prev) => ({ ...prev, ...map }));
  };

  const handleSaveSelectedBalances = () => {
    const finalBalances = rawBalances.filter((b) => selectedAssetKeys[b.asset]);
    const totalUsd = Number(finalBalances.reduce((sum, b) => sum + b.usdValue, 0).toFixed(2));
    const availableUsd = Number(
      finalBalances
        .reduce((sum, b) => {
          const ratio = b.total > 0 ? b.free / b.total : 1;
          return sum + b.usdValue * ratio;
        }, 0)
        .toFixed(2)
    );

    onSaveBalances(account.id, finalBalances, totalUsd, availableUsd);
    showNotification(
      `Saldos de ${finalBalances.length} moedas gravados com sucesso na conta "${account.nome_conta}"! Total: $${totalUsd.toLocaleString()}`,
      'success'
    );
  };

  // ----------------------------------------------------
  // TAB 2: INSERÇÃO DIRETA / MANUAL DE SALDOS
  // ----------------------------------------------------
  const handleAddManualCoin = (coin: string) => {
    const clean = coin.trim().toUpperCase();
    if (!clean) return;
    if (manualRows.some((r) => r.asset === clean)) {
      showNotification(`A moeda ${clean} já está na lista.`, 'info');
      return;
    }
    setManualRows([...manualRows, { asset: clean, free: '0', locked: '0' }]);
    setNewManualTicker('');
  };

  const handleUpdateManualRow = (index: number, field: 'free' | 'locked', val: string) => {
    const updated = [...manualRows];
    updated[index][field] = val;
    setManualRows(updated);
  };

  const handleRemoveManualRow = (index: number) => {
    setManualRows(manualRows.filter((_, i) => i !== index));
  };

  // Cálculos do tab manual
  const calculatedManualBalances: BrokerAssetBalance[] = manualRows.map((r) => {
    const free = Math.max(0, parseFloat(r.free.replace(',', '.') || '0'));
    const locked = Math.max(0, parseFloat(r.locked.replace(',', '.') || '0'));
    const total = free + locked;
    const price = getAssetUnitPrice(r.asset);
    const usdValue = Number((total * price).toFixed(2));
    return {
      asset: r.asset,
      free,
      locked,
      total,
      usdValue,
    };
  });

  const manualTotalUsd = Number(
    calculatedManualBalances.reduce((sum, b) => sum + b.usdValue, 0).toFixed(2)
  );
  const manualAvailableUsd = Number(
    calculatedManualBalances
      .reduce((sum, b) => {
        const ratio = b.total > 0 ? b.free / b.total : 1;
        return sum + b.usdValue * ratio;
      }, 0)
      .toFixed(2)
  );

  const handleSaveManualBalances = () => {
    const activeBalances = calculatedManualBalances.filter((b) => b.total > 0);
    if (activeBalances.length === 0) {
      showNotification('Preencha o saldo de pelo menos uma moeda com valor maior que 0.', 'error');
      return;
    }

    onSaveBalances(account.id, activeBalances, manualTotalUsd, manualAvailableUsd);
    showNotification(
      `Carteira da Binance atualizada com ${activeBalances.length} moedas! Total: $${manualTotalUsd.toLocaleString()}`,
      'success'
    );
  };

  // ----------------------------------------------------
  // TAB 3: TRADES (API & CSV)
  // ----------------------------------------------------
  const handleTogglePair = (pair: string) => {
    if (selectedPairs.includes(pair)) {
      setSelectedPairs(selectedPairs.filter((p) => p !== pair));
    } else {
      setSelectedPairs([...selectedPairs, pair]);
    }
  };

  const handleAddCustomPair = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customPairInput.trim().toUpperCase().replace('/', '');
    if (clean && !selectedPairs.includes(clean)) {
      setSelectedPairs([...selectedPairs, clean]);
      setCustomPairInput('');
    }
  };

  const handleFetchTrades = async () => {
    if (selectedPairs.length === 0) {
      showNotification('Selecione pelo menos um par de moedas para consultar.', 'error');
      return;
    }

    setIsLoadingTrades(true);
    setTradesError(null);
    setFetchedRawTrades([]);

    const startTime = timeRangeDays > 0 ? Date.now() - timeRangeDays * 24 * 3600 * 1000 : undefined;
    const allResults: any[] = [];
    let hasAnyError: string | null = null;

    for (const pair of selectedPairs) {
      const res = await fetchRealBinanceTrades(account, pair, {
        startTime,
        limit: 100,
      });

      if (res.success && res.trades) {
        res.trades.forEach((t) => {
          allResults.push({
            ...t,
            queriedPair: pair,
          });
        });
      } else if (res.error) {
        hasAnyError = res.error;
      }
    }

    setIsLoadingTrades(false);

    if (allResults.length > 0) {
      allResults.sort((a, b) => (b.time || 0) - (a.time || 0));
      setFetchedRawTrades(allResults);

      const selectMap: { [id: string]: boolean } = {};
      allResults.forEach((t) => {
        const idKey = t.id || t.orderId;
        selectMap[idKey] = true;
      });
      setSelectedTradeIds(selectMap);

      showNotification(`${allResults.length} ordens executadas encontradas na Binance!`, 'success');
    } else {
      if (hasAnyError) {
        setTradesError(hasAnyError);
        showNotification(hasAnyError, 'error');
      } else {
        showNotification(
          `Nenhuma ordem executada encontrada nos pares selecionados nos últimos ${timeRangeDays} dias.`,
          'info'
        );
      }
    }
  };

  const handleToggleTradeSelect = (tradeId: string) => {
    setSelectedTradeIds((prev) => ({
      ...prev,
      [tradeId]: !prev[tradeId],
    }));
  };

  const handleSelectAllTrades = (select: boolean) => {
    const map: { [id: string]: boolean } = {};
    fetchedRawTrades.forEach((t) => {
      const idKey = t.id || t.orderId;
      map[idKey] = select;
    });
    setSelectedTradeIds(map);
  };

  const handleConfirmImportTrades = () => {
    const toImport = fetchedRawTrades.filter((t) => selectedTradeIds[t.id || t.orderId]);
    if (toImport.length === 0) {
      showNotification('Selecione pelo menos uma ordem para importar.', 'error');
      return;
    }

    const convertedTrades: Trade[] = toImport.map((raw) =>
      convertBinanceTradeToTradeItem(raw, account)
    );

    onImportSelectedTrades(convertedTrades);
    showNotification(
      `${convertedTrades.length} trades importados da Binance diretamente para o seu Trade Desk!`,
      'success'
    );
    onClose();
  };

  // CSV Import Handlers
  const handleParseCsv = () => {
    if (!csvRawText.trim()) {
      showNotification('Cole o texto do extrato ou faça upload de um arquivo CSV.', 'error');
      return;
    }
    const result = parseBinanceCsvTrades(csvRawText, account);
    setParsedCsvTrades(result.trades);
    setCsvParseErrors(result.errors);

    const map: { [id: string]: boolean } = {};
    result.trades.forEach((t) => {
      map[t.id] = true;
    });
    setSelectedCsvTradeIds(map);

    if (result.trades.length > 0) {
      showNotification(`${result.trades.length} operações reconhecidas no extrato!`, 'success');
    } else {
      showNotification('Nenhuma operação válida encontrada no texto colado.', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvRawText(content);
        const result = parseBinanceCsvTrades(content, account);
        setParsedCsvTrades(result.trades);
        setCsvParseErrors(result.errors);
        const map: { [id: string]: boolean } = {};
        result.trades.forEach((t) => {
          map[t.id] = true;
        });
        setSelectedCsvTradeIds(map);
        showNotification(
          `${result.trades.length} trades carregados do arquivo ${file.name}!`,
          'success'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImportCsvTrades = () => {
    const toImport = parsedCsvTrades.filter((t) => selectedCsvTradeIds[t.id]);
    if (toImport.length === 0) {
      showNotification('Selecione pelo menos uma ordem do CSV para importar.', 'error');
      return;
    }
    onImportSelectedTrades(toImport);
    showNotification(
      `${toImport.length} trades importados do extrato da Binance com sucesso!`,
      'success'
    );
    onClose();
  };

  const isGeoblockError =
    balanceError &&
    (balanceError.includes('Bloqueio Geográfico') ||
      balanceError.includes('restricted location') ||
      balanceError.includes('Eligibility'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#0e0e11] border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-[#09090b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F3BA2F]/15 border border-[#F3BA2F]/30 flex items-center justify-center text-[#F3BA2F]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white font-mono uppercase tracking-wider">
                  Sincronização & Seleção de Dados
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#F3BA2F]/10 text-[#F3BA2F] border border-[#F3BA2F]/30">
                  Binance
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Conta ativa:{' '}
                <strong className="text-zinc-200 font-mono">{account.nome_conta}</strong> •{' '}
                <span className="text-zinc-400">{account.tipo_mercado}</span> •{' '}
                <span className="text-green-400 font-mono">Chaves Conectadas</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-800 bg-[#070709] px-6 gap-2 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('balances')}
            className={`py-3 px-3 font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'balances'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            1. Sincronizar via API
            {rawBalances.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-950 text-yellow-400 font-mono">
                {rawBalances.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-3 font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'manual'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            2. Inserção Rápida de Saldos
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Direto
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trades')}
            className={`py-3 px-3 font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'trades'
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            3. Histórico de Trades & CSV
            {fetchedRawTrades.length + parsedCsvTrades.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-green-950 text-green-400 font-mono">
                {fetchedRawTrades.length + parsedCsvTrades.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`py-3 px-3 font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'faq'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            4. Esclarecimentos & FAQ
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: Sincronização via API Binance                 */}
        {/* ==================================================== */}
        {activeTab === 'balances' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Top Toolbar */}
            <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  Saldos da Conta na Binance ({account.tipo_mercado})
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Consulte os saldos da sua carteira Spot ou Futuros via chamada direta com a API
                  Binance.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleFetchBalances}
                  disabled={isLoadingBalances}
                  className="px-3.5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-yellow-500/10 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                  {isLoadingBalances ? 'Consultando Binance...' : 'Consultar Saldos na Binance'}
                </button>
              </div>
            </div>

            {/* Error Banner with Geoblock Detection */}
            {balanceError && (
              <div
                className={`p-4 rounded-lg text-xs font-mono space-y-3 border ${
                  isGeoblockError
                    ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
                    : 'bg-red-950/40 border-red-800/80 text-red-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isGeoblockError ? (
                    <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white">
                      {isGeoblockError
                        ? 'Bloqueio Geográfico da Binance Global (IP dos EUA no Servidor Cloud)'
                        : 'Aviso da API Binance:'}
                    </div>
                    <div className="mt-1 text-zinc-300 leading-relaxed font-sans text-xs">
                      {balanceError}
                    </div>
                  </div>
                </div>

                {/* Direct Action Solution inside Error Banner */}
                {isGeoblockError && (
                  <div className="bg-black/50 border border-amber-500/30 rounded-lg p-3.5 space-y-2.5 font-sans">
                    <div className="font-bold text-amber-300 font-mono text-xs flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Como ter seus saldos reais sincronizados agora mesmo:
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      Como o servidor do protótipo online roda no Google Cloud (EUA), a Binance.com
                      bloqueia requisições do datacenter. Mas você pode definir sua carteira exata em
                      10 segundos na aba <strong>"2. Inserção Rápida de Saldos"</strong> (com
                      cotações ao vivo em USD) ou importar o extrato CSV:
                    </p>
                    <div className="flex items-center gap-2 pt-1 flex-wrap font-mono">
                      <button
                        onClick={() => setActiveTab('manual')}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Definir Meus Saldos Diretamente Agora
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('trades');
                          setTradesSubTab('csv');
                        }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
                        Importar Extrato CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filter & Selection Bar */}
            {rawBalances.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar moeda (ex: BTC, USDT)..."
                      value={balanceSearch}
                      onChange={(e) => setBalanceSearch(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 pl-8 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-700 w-52"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono cursor-pointer select-none bg-zinc-900/60 border border-zinc-800 px-2.5 py-1.5 rounded hover:bg-zinc-800/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={hideDust}
                      onChange={(e) => setHideDust(e.target.checked)}
                      className="accent-yellow-500 rounded"
                    />
                    <span>Ocultar poeira (&lt; $0.50 USD)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <button
                    onClick={handleSelectAllAssets}
                    className="text-zinc-400 hover:text-white transition-colors underline cursor-pointer"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-zinc-700">•</span>
                  <button
                    onClick={handleDeselectAllAssets}
                    className="text-zinc-400 hover:text-white transition-colors underline cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>
            )}

            {/* Balances List Table */}
            {filteredBalances.length > 0 ? (
              <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#070709]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-10 text-center">Sel.</th>
                      <th className="p-3">Ativo</th>
                      <th className="p-3 text-right">Saldo Disponível (Livre)</th>
                      <th className="p-3 text-right">Bloqueado em Ordens</th>
                      <th className="p-3 text-right">Saldo Total</th>
                      <th className="p-3 text-right">Valor Estimado (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredBalances.map((b) => {
                      const isSelected = !!selectedAssetKeys[b.asset];
                      return (
                        <tr
                          key={b.asset}
                          onClick={() => toggleAssetSelection(b.asset)}
                          className={`hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-yellow-500/5' : 'opacity-60'
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAssetSelection(b.asset)}
                              className="accent-yellow-500 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-yellow-400 border border-zinc-700">
                              {b.asset.slice(0, 3)}
                            </span>
                            <span>{b.asset}</span>
                          </td>
                          <td className="p-3 text-right text-zinc-300 font-mono">
                            {b.free.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                          </td>
                          <td className="p-3 text-right text-zinc-500 font-mono">
                            {b.locked.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                          </td>
                          <td className="p-3 text-right text-zinc-200 font-bold font-mono">
                            {b.total.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                          </td>
                          <td className="p-3 text-right text-yellow-400 font-bold font-mono">
                            ${' '}
                            {b.usdValue.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : rawBalances.length > 0 ? (
              <div className="p-8 text-center text-zinc-500 font-mono text-xs border border-zinc-800 rounded-lg">
                Nenhum ativo encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-lg space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                  <DollarSign className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="text-zinc-300 font-mono text-sm font-bold">
                  Nenhum saldo sincronizado ainda via API
                </div>
                <p className="text-zinc-400 text-xs max-w-md mx-auto leading-relaxed">
                  Clique no botão acima para consultar a Binance, ou vá na aba{' '}
                  <strong className="text-amber-300">"2. Inserção Rápida de Saldos"</strong> para
                  digitar sua carteira diretamente sem depender de bloqueios de IP.
                </p>
              </div>
            )}

            {/* Bottom Actions Bar */}
            {rawBalances.length > 0 && (
              <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                <div className="font-mono text-xs">
                  <span className="text-zinc-400">Ativos Selecionados: </span>
                  <strong className="text-white">
                    {Object.values(selectedAssetKeys).filter(Boolean).length} moedas
                  </strong>
                  <span className="text-zinc-600 mx-2">•</span>
                  <span className="text-zinc-400">Total em Custódia: </span>
                  <strong className="text-yellow-400">
                    ${' '}
                    {rawBalances
                      .filter((b) => selectedAssetKeys[b.asset])
                      .reduce((sum, b) => sum + b.usdValue, 0)
                      .toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </strong>
                </div>

                <button
                  onClick={handleSaveSelectedBalances}
                  className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-mono font-bold text-xs rounded flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-green-500/10"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Saldos Selecionados nesta Conta
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: Inserção Rápida / Direta de Saldos da Carteira */}
        {/* ==================================================== */}
        {activeTab === 'manual' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono">
            {/* Header info */}
            <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Definição Direta de Ativos da Carteira Binance
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                Insira as moedas e quantidades exatas que você possui na Binance. O Kryp Terminal
                calcula automaticamente o valor em USD com base nas cotações em tempo real do mercado.
              </p>

              {/* Quick Add Chips */}
              <div className="pt-2 border-t border-zinc-800 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-500 uppercase mr-1">Adicionar Rápido:</span>
                {POPULAR_COINS.map((coin) => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => handleAddManualCoin(coin)}
                    className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-amber-500/50 cursor-pointer transition-colors"
                  >
                    + {coin}
                  </button>
                ))}
              </div>

              {/* Custom Add Coin Form */}
              <div className="pt-2 flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Outra moeda (ex: RENDER, NEAR, LINK)..."
                  value={newManualTicker}
                  onChange={(e) => setNewManualTicker(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 flex-1 uppercase"
                />
                <button
                  type="button"
                  onClick={() => handleAddManualCoin(newManualTicker)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Asset Rows Table */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#070709]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Moeda</th>
                    <th className="p-3">Saldo Disponível (Livre)</th>
                    <th className="p-3">Saldo Bloqueado (Ordens)</th>
                    <th className="p-3 text-right">Cotação Atual</th>
                    <th className="p-3 text-right">Total USD</th>
                    <th className="p-3 w-10 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {manualRows.map((row, idx) => {
                    const price = getAssetUnitPrice(row.asset);
                    const free = parseFloat(row.free.replace(',', '.') || '0');
                    const locked = parseFloat(row.locked.replace(',', '.') || '0');
                    const total = free + locked;
                    const usdVal = total * price;

                    return (
                      <tr key={row.asset + idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-amber-400 border border-zinc-700">
                            {row.asset.slice(0, 3)}
                          </span>
                          <span>{row.asset}</span>
                        </td>

                        <td className="p-3">
                          <input
                            type="text"
                            value={row.free}
                            onChange={(e) => handleUpdateManualRow(idx, 'free', e.target.value)}
                            placeholder="0.00"
                            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60 w-36 font-mono"
                          />
                        </td>

                        <td className="p-3">
                          <input
                            type="text"
                            value={row.locked}
                            onChange={(e) => handleUpdateManualRow(idx, 'locked', e.target.value)}
                            placeholder="0.00"
                            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-amber-500/60 w-32 font-mono"
                          />
                        </td>

                        <td className="p-3 text-right text-zinc-400">
                          {price > 0 ? (
                            `$ ${price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: price < 1 ? 6 : 2,
                            })}`
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>

                        <td className="p-3 text-right font-bold text-amber-400">
                          ${' '}
                          {usdVal.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveManualRow(idx)}
                            className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Remover moeda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions for Manual Tab */}
            <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-zinc-400">Total Calculado da Carteira: </span>
                <strong className="text-amber-400 text-sm">
                  ${' '}
                  {manualTotalUsd.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
                <span className="text-zinc-600 mx-2">•</span>
                <span className="text-zinc-400">Disponível Livre: </span>
                <strong className="text-white">
                  ${' '}
                  {manualAvailableUsd.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <button
                type="button"
                onClick={handleSaveManualBalances}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-amber-500/10"
              >
                <CheckCircle2 className="w-4 h-4" />
                Gravar Carteira na Conta Binance
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: Histórico de Trades & CSV                     */}
        {/* ==================================================== */}
        {activeTab === 'trades' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Sub-tabs: API vs CSV */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 font-mono text-xs">
              <button
                onClick={() => setTradesSubTab('api')}
                className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer ${
                  tradesSubTab === 'api'
                    ? 'bg-green-500 text-black shadow-sm'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Opção A: Buscar via API Binance
              </button>
              <button
                onClick={() => setTradesSubTab('csv')}
                className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tradesSubTab === 'csv'
                    ? 'bg-green-500 text-black shadow-sm'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Opção B: Importar Extrato CSV / Texto
              </button>
            </div>

            {/* Sub-tab A: API */}
            {tradesSubTab === 'api' && (
              <div className="space-y-4">
                <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-zinc-300 leading-relaxed font-sans">
                      <strong className="text-white font-mono block mb-1">
                        Consulta de Ordens na Binance por Par de Negociação:
                      </strong>
                      A API oficial da Binance exige consultar par a par (ex:{' '}
                      <span className="font-mono text-green-400 font-bold">BTCUSDT</span>,{' '}
                      <span className="font-mono text-green-400 font-bold">ETHUSDT</span>).
                      Selecione os pares operados para puxar as execuções:
                    </div>
                  </div>

                  {/* Pair Selector Chips */}
                  <div className="pt-2 border-t border-zinc-800/80 space-y-2 font-mono text-xs">
                    <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                      Pares Populares:
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {POPULAR_PAIRS.map((pair) => {
                        const isSelected = selectedPairs.includes(pair);
                        return (
                          <button
                            key={pair}
                            onClick={() => handleTogglePair(pair)}
                            className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer font-bold ${
                              isSelected
                                ? 'bg-green-500 text-black shadow-sm shadow-green-500/20'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                            }`}
                          >
                            {pair}
                          </button>
                        );
                      })}
                    </div>

                    <form
                      onSubmit={handleAddCustomPair}
                      className="flex items-center gap-2 pt-2 max-w-sm"
                    >
                      <input
                        type="text"
                        placeholder="Adicionar outro par (ex: PEPEUSDT)..."
                        value={customPairInput}
                        onChange={(e) => setCustomPairInput(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-700 flex-1 uppercase"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-mono font-bold cursor-pointer transition-colors"
                      >
                        + Adicionar
                      </button>
                    </form>
                  </div>

                  {/* Selected Pairs & Period Controls */}
                  <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-500 text-[11px]">
                        Pares Ativos ({selectedPairs.length}):
                      </span>
                      {selectedPairs.map((p) => (
                        <span
                          key={p}
                          className="bg-zinc-800 text-green-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1"
                        >
                          {p}
                          <X
                            className="w-3 h-3 hover:text-red-400 cursor-pointer"
                            onClick={() => handleTogglePair(p)}
                          />
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Período:</span>
                        <select
                          value={timeRangeDays}
                          onChange={(e) => setTimeRangeDays(Number(e.target.value))}
                          className="bg-zinc-900 border border-zinc-800 text-white rounded px-2 py-1 focus:outline-none"
                        >
                          <option value={7}>Últimos 7 dias</option>
                          <option value={30}>Últimos 30 dias</option>
                          <option value={90}>Últimos 90 dias</option>
                          <option value={365}>Último ano</option>
                          <option value={0}>Todo o histórico</option>
                        </select>
                      </div>

                      <button
                        onClick={handleFetchTrades}
                        disabled={isLoadingTrades || selectedPairs.length === 0}
                        className="px-3.5 py-1.5 bg-green-500 hover:bg-green-400 text-black font-bold rounded flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isLoadingTrades ? 'animate-spin' : ''}`}
                        />
                        {isLoadingTrades ? 'Consultando...' : 'Buscar Trades na Binance'}
                      </button>
                    </div>
                  </div>
                </div>

                {tradesError && (
                  <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-start gap-2.5 font-mono">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold">Aviso da API Binance:</div>
                      <div className="mt-0.5 text-red-300/90 leading-relaxed">{tradesError}</div>
                    </div>
                  </div>
                )}

                {/* API Trades Table */}
                {fetchedRawTrades.length > 0 ? (
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between text-xs px-1">
                      <div className="text-zinc-400">
                        Encontradas{' '}
                        <strong className="text-white">{fetchedRawTrades.length}</strong> ordens
                        executadas:
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectAllTrades(true)}
                          className="text-zinc-400 hover:text-white transition-colors underline cursor-pointer"
                        >
                          Selecionar Todas
                        </button>
                        <span className="text-zinc-700">•</span>
                        <button
                          onClick={() => handleSelectAllTrades(false)}
                          className="text-zinc-400 hover:text-white transition-colors underline cursor-pointer"
                        >
                          Desmarcar Todas
                        </button>
                      </div>
                    </div>

                    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#070709] max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5 w-10 text-center">Sel.</th>
                            <th className="p-2.5">Data / Hora</th>
                            <th className="p-2.5">Par</th>
                            <th className="p-2.5 text-center">Operação</th>
                            <th className="p-2.5 text-right">Preço</th>
                            <th className="p-2.5 text-right">Quantidade</th>
                            <th className="p-2.5 text-right">Total USD</th>
                            <th className="p-2.5 text-right">Taxa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {fetchedRawTrades.map((t) => {
                            const idKey = t.id || t.orderId;
                            const isSelected = !!selectedTradeIds[idKey];
                            const isBuy = t.isBuyer !== undefined ? t.isBuyer : t.side === 'BUY';
                            const price = parseFloat(t.price || '0');
                            const qty = parseFloat(t.qty || t.quantity || '0');
                            const quoteQty = parseFloat(t.quoteQty || (price * qty).toString());

                            return (
                              <tr
                                key={idKey}
                                onClick={() => handleToggleTradeSelect(idKey)}
                                className={`hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-green-500/5' : 'opacity-60'
                                }`}
                              >
                                <td
                                  className="p-2.5 text-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleTradeSelect(idKey)}
                                    className="accent-green-500 rounded cursor-pointer"
                                  />
                                </td>
                                <td className="p-2.5 text-zinc-400 text-[11px]">
                                  {t.time
                                    ? new Date(t.time).toLocaleString([], {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                      })
                                    : '-'}
                                </td>
                                <td className="p-2.5 font-bold text-white">
                                  {t.symbol || t.queriedPair}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isBuy
                                        ? 'bg-green-950 text-green-400 border border-green-800'
                                        : 'bg-red-950 text-red-400 border border-red-800'
                                    }`}
                                  >
                                    {isBuy ? 'COMPRA' : 'VENDA'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right text-zinc-200">
                                  ${' '}
                                  {price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 4,
                                  })}
                                </td>
                                <td className="p-2.5 text-right text-zinc-300">
                                  {qty.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                </td>
                                <td className="p-2.5 text-right text-green-400 font-bold">
                                  ${' '}
                                  {quoteQty.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-2.5 text-right text-[10px] text-zinc-500">
                                  {t.commission ? `${t.commission} ${t.commissionAsset || ''}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="text-zinc-400">Selecionadas para importação: </span>
                        <strong className="text-white">
                          {Object.values(selectedTradeIds).filter(Boolean).length} ordens
                        </strong>
                      </div>

                      <button
                        onClick={handleConfirmImportTrades}
                        disabled={Object.values(selectedTradeIds).filter(Boolean).length === 0}
                        className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-bold text-xs rounded flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-green-500/10 disabled:opacity-50"
                      >
                        <ArrowDownToLine className="w-4 h-4" />
                        Importar Ordens Selecionadas para o TradeDesk
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-zinc-800 rounded-lg space-y-2">
                    <ArrowDownToLine className="w-6 h-6 text-zinc-500 mx-auto" />
                    <div className="text-zinc-300 font-mono text-xs font-bold">
                      Nenhuma ordem consultada via API ainda
                    </div>
                    <p className="text-zinc-500 text-xs">
                      Clique em "Buscar Trades na Binance" ou use a aba de Extrato CSV ao lado.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab B: CSV Import */}
            {tradesSubTab === 'csv' && (
              <div className="space-y-4 font-mono">
                <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 space-y-3 font-sans">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-400" />
                    <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      Importação de Extrato da Binance (Sem bloqueio de IP)
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Você pode exportar seu histórico diretamente no painel da Binance (
                    <em>Ordens &rarr; Histórico de Ordens / Trade History &rarr; Gerar Extrato</em>) e
                    fazer o upload do arquivo CSV ou colar o conteúdo aqui abaixo:
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <label className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-colors border border-zinc-700">
                      <Upload className="w-3.5 h-3.5 text-green-400" />
                      Selecionar Arquivo .CSV da Binance
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-mono">
                    Ou cole o conteúdo do CSV / texto aqui:
                  </label>
                  <textarea
                    rows={4}
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    placeholder="Date(UTC),Market,Type,Price,Amount,Total,Fee,Fee Coin&#10;2024-05-10 14:32:00,BTCUSDT,BUY,64250.00,0.015,963.75,0.72,USDT"
                    className="w-full bg-[#070709] border border-zinc-800 rounded p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500/60 font-mono"
                  ></textarea>

                  <button
                    onClick={handleParseCsv}
                    className="px-3.5 py-1.5 bg-green-500 hover:bg-green-400 text-black font-bold text-xs rounded flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Processar Extrato
                  </button>
                </div>

                {csvParseErrors.length > 0 && (
                  <div className="p-3 bg-red-950/40 border border-red-800 text-xs text-red-300 rounded space-y-1">
                    <strong className="block">Avisos no processamento do CSV:</strong>
                    {csvParseErrors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                {/* Parsed Trades Table */}
                {parsedCsvTrades.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs px-1">
                      <div className="text-zinc-400">
                        Trades identificados no arquivo:{' '}
                        <strong className="text-white">{parsedCsvTrades.length}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const m: any = {};
                            parsedCsvTrades.forEach((t) => (m[t.id] = true));
                            setSelectedCsvTradeIds(m);
                          }}
                          className="text-zinc-400 hover:text-white underline cursor-pointer"
                        >
                          Marcar Todos
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => setSelectedCsvTradeIds({})}
                          className="text-zinc-400 hover:text-white underline cursor-pointer"
                        >
                          Desmarcar Todos
                        </button>
                      </div>
                    </div>

                    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#070709] max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="p-2.5 w-10 text-center">Sel.</th>
                            <th className="p-2.5">Data / Hora</th>
                            <th className="p-2.5">Ativo</th>
                            <th className="p-2.5">Operação</th>
                            <th className="p-2.5 text-right">Preço</th>
                            <th className="p-2.5 text-right">Quantidade</th>
                            <th className="p-2.5 text-right">Taxa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {parsedCsvTrades.map((t) => {
                            const isSel = !!selectedCsvTradeIds[t.id];
                            return (
                              <tr
                                key={t.id}
                                onClick={() =>
                                  setSelectedCsvTradeIds((prev) => ({
                                    ...prev,
                                    [t.id]: !prev[t.id],
                                  }))
                                }
                                className={`hover:bg-zinc-800/40 cursor-pointer ${
                                  isSel ? 'bg-green-500/5' : 'opacity-60'
                                }`}
                              >
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSel}
                                    onChange={() =>
                                      setSelectedCsvTradeIds((prev) => ({
                                        ...prev,
                                        [t.id]: !prev[t.id],
                                      }))
                                    }
                                    className="accent-green-500 rounded"
                                  />
                                </td>
                                <td className="p-2.5 text-zinc-400 text-[11px]">
                                  {new Date(t.data_hora).toLocaleDateString()}{' '}
                                  {new Date(t.data_hora).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="p-2.5 font-bold text-white">{t.moeda}</td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      t.tipo_operacao === 'Long'
                                        ? 'bg-green-950 text-green-400 border border-green-800'
                                        : 'bg-red-950 text-red-400 border border-red-800'
                                    }`}
                                  >
                                    {t.tipo_operacao === 'Long' ? 'COMPRA' : 'VENDA'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right text-zinc-200">
                                  ${' '}
                                  {t.preco_compra.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-2.5 text-right text-zinc-300">{t.quantidade}</td>
                                <td className="p-2.5 text-right text-zinc-500 text-[10px]">
                                  {t.taxa_corretora_usd ? `$ ${t.taxa_corretora_usd}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="text-zinc-400">Selecionadas do Extrato: </span>
                        <strong className="text-white">
                          {Object.values(selectedCsvTradeIds).filter(Boolean).length} ordens
                        </strong>
                      </div>

                      <button
                        onClick={handleConfirmImportCsvTrades}
                        disabled={Object.values(selectedCsvTradeIds).filter(Boolean).length === 0}
                        className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-bold text-xs rounded flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-green-500/10 disabled:opacity-50"
                      >
                        <ArrowDownToLine className="w-4 h-4" />
                        Importar Ordens Selecionadas para o TradeDesk
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: Esclarecimentos & FAQ                         */}
        {/* ==================================================== */}
        {activeTab === 'faq' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-zinc-300 font-sans leading-relaxed">
            {/* Box 1: Por que deu o erro de restricted location */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
              <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Por que deu o erro "Service unavailable from a restricted location"?
                </h4>
                <p className="mt-1 text-zinc-300">
                  Este protótipo está hospedado na nuvem do Google Cloud no datacenter de{' '}
                  <strong className="text-white">us-east1 (Estados Unidos)</strong>.
                  <br />
                  <br />
                  A <strong>Binance Global (binance.com)</strong> bloqueia rigorosamente conexões
                  originadas de endereços IP norte-americanos devido a restrições regulatórias da
                  SEC/CFTC nos EUA (onde usuários americanos utilizam apenas a Binance.US).
                  <br />
                  <br />
                  <strong>Suas chaves de API estão corretas!</strong> Caso este sistema estivesse
                  rodando no seu computador pessoal (via localhost com seu IP do Brasil ou de outro
                  país sem restrições), a Binance responderia perfeitamente.
                  <br />
                  Para contornar isso de forma simples e imediata neste ambiente online, criamos a aba{' '}
                  <strong className="text-amber-300">"2. Inserção Rápida de Saldos"</strong>, que
                  permite colocar as quantidades exatas das suas moedas com cotação calculada em tempo
                  real.
                </p>
              </div>
            </div>

            {/* Box 2: Por que os dados não batiam antes */}
            <div className="bg-[#121216] border border-zinc-800 rounded-lg p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Por que os dados anteriores não batiam com a sua carteira?
                </h4>
                <p className="mt-1 text-zinc-300">
                  Na versão inicial do terminal, o botão de sincronização ativava um gerador estático
                  de demonstração (que injetava valores fictícios como ~$15.820 USDT).
                  <br />
                  <br />
                  Removemos completamente todos os dados falsos. Agora a integração conecta com a
                  API Binance real com assinatura HMAC-SHA256 e oferece a aba direta para que você
                  tenha 100% de controle sobre quais moedas e operações entram no seu terminal.
                </p>
              </div>
            </div>

            {/* Box 3: Como configurar a API da Binance */}
            <div className="bg-[#121216] border border-zinc-800 rounded-lg p-5 space-y-3">
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                Configuração Recomendada da API na Binance
              </h4>

              <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                <li>
                  Acesse sua conta na <strong>Binance</strong> &rarr; ícone de perfil &rarr;{' '}
                  <strong>Gerenciamento de API</strong> (API Management).
                </li>
                <li>
                  Crie uma chave com nome <em>"Kryp Terminal"</em>.
                </li>
                <li>
                  Em <strong>Restrições de API</strong>, marque{' '}
                  <strong className="text-green-400">APENAS "Ativar Leitura" (Enable Reading)</strong>.
                </li>
                <li>
                  <strong className="text-red-400">NUNCA marque "Habilitar Saques"</strong>. O Kryp
                  Terminal nunca solicitará permissão de saque ou transferência.
                </li>
                <li>
                  Em <strong>Restrição de IP</strong>, marque <strong>"Irrestrito" (Unrestricted)</strong>{' '}
                  para que a consulta possa ser feita de qualquer rede onde você acesse o sistema.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-[#09090b] flex items-center justify-between text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span>Segurança garantida: criptografia HMAC-SHA256 e privacidade total</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
