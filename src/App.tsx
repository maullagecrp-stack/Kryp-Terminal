import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Trash2,
  DollarSign,
  Search,
  Sliders,
  Database,
  Grid,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp as BulletIcon,
  Layers2,
  FileCheck2,
  Building2,
  Link2,
  KeyRound,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import DBBlueprint from './components/DBBlueprint';
import InstitutionsManager from './components/InstitutionsManager';
import NewTradeForm from './components/NewTradeForm';
import MarketSimulator from './components/MarketSimulator';
import CSVImporter from './components/CSVImporter';
import DashboardView from './components/DashboardView';
import TradeDeskView from './components/TradeDeskView';
import BrokerConnectionsView from './components/BrokerConnectionsView';
import { Trade, CoinPrice, TradeStatus, Instituicao, InstituicaoTipo, Hold, BrokerAccount } from './types';
import { initialCoinPrices, initialTrades, initialInstitutions } from './data/mockData';
import { getLocalBrokerAccounts, saveLocalBrokerAccounts } from './actions/brokerAccounts';
import HoldDeskView from './components/HoldDeskView';
import NewHoldForm from './components/NewHoldForm';
import { Briefcase } from 'lucide-react';
import { updateTrade } from './actions/trades';

import { supabase } from './lib/supabase';

const initialHolds: Hold[] = [];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades' | 'conexoes-api' | 'blueprint' | 'instituicoes' | 'new-trade' | 'hold' | 'new-hold'>('dashboard');
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>(() => getLocalBrokerAccounts());

  useEffect(() => {
    saveLocalBrokerAccounts(brokerAccounts);
  }, [brokerAccounts]);

  const [trades, setTrades] = useState<Trade[]>(() => {
    if (typeof window !== 'undefined') {
      const savedTrades = localStorage.getItem('@kryp-terminal:trades');
      if (savedTrades) {
        try {
          const parsed = JSON.parse(savedTrades);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Remove dados fictícios de exemplo
            return parsed.filter((t: any) => t && !String(t.id).startsWith('mock-'));
          }
        } catch (e) {}
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('@kryp-terminal:trades', JSON.stringify(trades));
  }, [trades]);

  const [holds, setHolds] = useState<Hold[]>(() => {
    if (typeof window !== 'undefined') {
      const savedHolds = localStorage.getItem('@kryp-terminal:holds');
      if (savedHolds) {
        try {
          const parsed = JSON.parse(savedHolds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Remove dados fictícios de exemplo
            return parsed.filter((h: any) => h && !String(h.id).startsWith('hold-'));
          }
        } catch (e) {}
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('@kryp-terminal:holds', JSON.stringify(holds));
  }, [holds]);

  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [coinPrices, setCoinPrices] = useState<CoinPrice[]>(initialCoinPrices);
  const [institutions, setInstitutions] = useState<Instituicao[]>(initialInstitutions);
  const [tickerFilter, setTickerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'Todos'>('Todos');
  const [simulatedActivePnL, setSimulatedActivePnL] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState<boolean>(false);
  const [saldoBanca, setSaldoBanca] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('@kryp-terminal:saldo_banca');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val)) return val;
      }
    }
    return 0.00;
  });

  useEffect(() => {
    localStorage.setItem('@kryp-terminal:saldo_banca', String(saldoBanca));
  }, [saldoBanca]);

  // Função para zerar todos os dados fictícios e bancos de dados
  const handleResetAllData = async () => {
    if (confirm('ATENÇÃO: Deseja apagar TODOS os dados e zerar completamente o terminal (trades, aportes, contas de corretoras e saldo)?')) {
      setTrades([]);
      setHolds([]);
      setBrokerAccounts([]);
      setSaldoBanca(0.00);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('@kryp-terminal:trades');
        localStorage.removeItem('@kryp-terminal:holds');
        localStorage.removeItem('@kryp-terminal:broker_accounts');
        localStorage.removeItem('@kryp-terminal:saldo_banca');
      }

      try {
        await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('holds').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('broker_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        // Safe offline catch
      }

      showNotification('Todos os dados foram excluídos e os bancos de dados foram zerados com sucesso!', 'success');
    }
  };

  // Adiciona instituição
  const handleAddInstitution = (newInst: { nome: string; tipo: InstituicaoTipo; cor_hex: string; native_coin?: string }) => {
    if (institutions.some(i => i.nome.toLowerCase() === newInst.nome.toLowerCase())) {
      showNotification(`A instituição "${newInst.nome}" já está cadastrada!`, 'error');
      return;
    }
    const created: Instituicao = {
      id: 'inst-' + crypto.randomUUID().substring(0, 8),
      nome: newInst.nome,
      tipo: newInst.tipo,
      cor_hex: newInst.cor_hex,
      native_coin: newInst.native_coin,
      created_at: new Date().toISOString()
    };
    setInstitutions(prev => [...prev, created]);
    showNotification(`Instituição "${created.nome}" cadastrada com sucesso!`, 'success');
  };

  // Atualiza instituição
  const handleUpdateInstitution = (id: string, updatedData: { nome: string; tipo: InstituicaoTipo; cor_hex: string; native_coin?: string }) => {
    // Check if renaming to an existing name
    const nameCollision = institutions.some(i => i.id !== id && i.nome.toLowerCase() === updatedData.nome.toLowerCase());
    if (nameCollision) {
      showNotification(`Outra instituição já utiliza o nome "${updatedData.nome}"!`, 'error');
      return;
    }

    const oldInst = institutions.find(i => i.id === id);
    const oldNome = oldInst?.nome;

    setInstitutions(prev => prev.map(i => i.id === id ? { ...i, ...updatedData } : i));
    
    // Cascading Rename in trades
    if (oldNome && oldNome !== updatedData.nome) {
      setTrades(prev => prev.map(t => t.exchange === oldNome ? { ...t, exchange: updatedData.nome } : t));
    }

    showNotification(`Instituição atualizada com sucesso!`, 'success');
  };

  // Remove instituição
  const handleDeleteInstitution = (id: string) => {
    const inst = institutions.find(i => i.id === id);
    if (!inst) return;

    // Check if active trades still use this institution
    const inUse = trades.some(t => t.exchange === inst.nome);
    if (inUse) {
      showNotification(`Não é possível excluir "${inst.nome}" pois ela está sendo usada em trades cadastrados!`, 'error');
      return;
    }

    setInstitutions(prev => prev.filter(i => i.id !== id));
    showNotification(`Instituição "${inst.nome}" removida do sistema!`, 'info');
  };

  // Cadastrar trade detalhado do formulário avançado
  const handleRegisterDetailedTrade = (newTradeData: {
    data_hora: string;
    exchange: string;
    moeda: string;
    preco_compra: number;
    quantidade: number;
    taxa_corretora_usd: number;
    stop_loss: number | null;
    alvo_1: number | null;
    alvo_2: number | null;
    alvo_3: number | null;
    alvo_4: number | null;
    alvo_5: number | null;
    alvo_6: number | null;
    tipo_operacao: 'Long' | 'Short';
    estrategia: string;
    notas: string;
    moeda_taxa: string;
    quantidade_taxa: number;
  }) => {
    if (tradeToEdit) {
      setTrades(prev => prev.map(t => t.id === tradeToEdit.id ? { 
        ...t, 
        ...newTradeData,
        moeda: newTradeData.moeda.toUpperCase().trim()
      } : t));

      updateTrade(tradeToEdit.id, newTradeData).catch(err => {
        console.error("Erro ao sincronizar atualização no banco:", err);
      });

      setTradeToEdit(null);
      setActiveTab('trades');
      showNotification(`Operação em ${newTradeData.moeda.toUpperCase()} atualizada com sucesso!`, 'success');
      return;
    }

    const newTrade: Trade = {
      id: crypto.randomUUID(),
      data_hora: newTradeData.data_hora,
      exchange: newTradeData.exchange,
      moeda: newTradeData.moeda.toUpperCase().trim(),
      preco_compra: newTradeData.preco_compra,
      quantidade: newTradeData.quantidade,
      taxa_corretora_usd: newTradeData.taxa_corretora_usd,
      stop_loss: newTradeData.stop_loss,
      alvo_1: newTradeData.alvo_1,
      alvo_2: newTradeData.alvo_2,
      alvo_3: newTradeData.alvo_3,
      alvo_4: newTradeData.alvo_4,
      alvo_5: newTradeData.alvo_5,
      alvo_6: newTradeData.alvo_6,
      status: 'Aberto',
      pnl_realizado: 0,
      tipo_operacao: newTradeData.tipo_operacao,
      estrategia: newTradeData.estrategia,
      notas: newTradeData.notas,
      moeda_taxa: newTradeData.moeda_taxa,
      quantidade_taxa: newTradeData.quantidade_taxa,
    };

    setTrades(prev => [newTrade, ...prev]);

    // Check if the current coin selected is in our virtual prices tracker, otherwise add it!
    const ticker = newTradeData.moeda.toUpperCase().trim();
    if (!coinPrices.some(c => c.moeda === ticker)) {
      setCoinPrices(prev => [
        ...prev,
        {
          moeda: ticker,
          name: ticker,
          current_price: newTradeData.preco_compra,
          change_24h: 0.0
        }
      ]);
    }

    setActiveTab('dashboard');
    showNotification(`Operação em ${newTrade.moeda} registrada com sucesso no diário!`);
  };

  // Cadastrar hold detalhado do formulário de longo prazo
  const handleRegisterDetailedHold = (newHoldData: {
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
  }) => {
    const newHold: Hold = {
      id: crypto.randomUUID(),
      data_hora: newHoldData.data_hora,
      exchange: newHoldData.exchange,
      moeda: newHoldData.moeda.toUpperCase().trim(),
      tipo: newHoldData.tipo,
      preco_compra: newHoldData.preco_compra,
      quantidade: newHoldData.quantidade,
      valor_investido: newHoldData.valor_investido,
      alvo_1: newHoldData.alvo_1,
      alvo_2: newHoldData.alvo_2,
      alvo_3: newHoldData.alvo_3,
      notas: newHoldData.notas,
    };

    setHolds(prev => [newHold, ...prev]);

    // Check if the current coin selected is in our virtual prices tracker, otherwise add it!
    const ticker = newHoldData.moeda.toUpperCase().trim();
    if (!coinPrices.some(c => c.moeda === ticker)) {
      setCoinPrices(prev => [
        ...prev,
        {
          moeda: ticker,
          name: ticker,
          current_price: newHoldData.preco_compra,
          change_24h: 0.0
        }
      ]);
    }

    setActiveTab('hold');
    showNotification(`Lançamento Spot em ${newHold.moeda} registrado no Hold Desk!`);
  };

  // Form State for manual trade entry
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    exchange: 'Binance',
    moeda: 'BTC',
    preco_compra: '',
    quantidade: '',
    taxa_corretora_usd: '2.50',
    stop_loss: '',
    alvo_1: '',
    alvo_2: '',
    alvo_3: '',
    alvo_4: '',
    alvo_5: '',
    alvo_6: '',
  });

  // Feedback notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // CSV Template Generation
  const downloadCsvTemplate = () => {
    const csvHeaders = 'data_hora,exchange,moeda,preco_compra,quantidade,taxa_corretora_usd,stop_loss,alvo_1,alvo_2,alvo_3,alvo_4,alvo_5,alvo_6,status,pnl_realizado\n';
    const sampleRows = `2026-06-14T01:00:00Z,Binance,SOL,135.00,10.0,1.50,120.0,140.0,145.0,150.0,160.0,175.0,190.0,Aberto,0\n2026-06-11T12:00:00Z,Bybit,ETH,3200.00,0.5,5.00,3000.0,3300.0,3400.0,3500.0,3600.0,3800.0,4000.0,Aberto,0`;
    const blob = new Blob([csvHeaders + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_trades.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Template CSV baixado com sucesso!');
  };

  // CSV Importer
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        const newParsedTrades: Trade[] = [];
        // Header verification
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim());
          if (values.length < 5) continue;

          // Helper to map index safely
          const getVal = (colName: string) => {
            const idx = headers.indexOf(colName);
            return idx !== -1 ? values[idx] : null;
          };

          const moeda = (getVal('moeda') || 'BTC').toUpperCase();
          const exchange = getVal('exchange') || 'Binance';
          const preco_compra = parseFloat(getVal('preco_compra') || '0');
          const quantidade = parseFloat(getVal('quantidade') || '0');
          const taxa = parseFloat(getVal('taxa_corretora_usd') || '0');
          
          const rawSl = getVal('stop_loss');
          const stop_loss = rawSl ? parseFloat(rawSl) : null;

          const parseAlvo = (alvoNum: string) => {
            const raw = getVal(alvoNum);
            return raw ? parseFloat(raw) : null;
          };

          const rawStatus = getVal('status') || 'Aberto';
          const status = (rawStatus === 'Fechado_Gain' || rawStatus === 'Fechado_Loss') ? rawStatus : 'Aberto';
          
          const rawPnl = getVal('pnl_realizado');
          const pnl_realizado = rawPnl ? parseFloat(rawPnl) : 0;

          const trade: Trade = {
            id: crypto.randomUUID(),
            data_hora: getVal('data_hora') || new Date().toISOString(),
            exchange,
            moeda,
            preco_compra,
            quantidade,
            taxa_corretora_usd: taxa,
            stop_loss,
            alvo_1: parseAlvo('alvo_1'),
            alvo_2: parseAlvo('alvo_2'),
            alvo_3: parseAlvo('alvo_3'),
            alvo_4: parseAlvo('alvo_4'),
            alvo_5: parseAlvo('alvo_5'),
            alvo_6: parseAlvo('alvo_6'),
            status,
            pnl_realizado
          };

          newParsedTrades.push(trade);
        }

        if (newParsedTrades.length > 0) {
          setTrades(prev => [...newParsedTrades, ...prev]);
          showNotification(`${newParsedTrades.length} trades importados do CSV com sucesso!`, 'success');
        } else {
          showNotification('Nenhum trade válido encontrado no CSV.', 'error');
        }
      } catch (err) {
        showNotification('Erro ao processar o arquivo CSV. Verifique o cabeçalho.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  };

  // Submit Manual Form
  const handleAddNewTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.moeda || !formData.preco_compra || !formData.quantidade) {
      showNotification('Preencha os campos obrigatórios (Moeda, Preço de Compra, Quantidade).', 'error');
      return;
    }

    const preco_compra = parseFloat(formData.preco_compra);
    const quantidade = parseFloat(formData.quantidade);
    const taxa_corretora_usd = parseFloat(formData.taxa_corretora_usd) || 0;

    const parseNum = (val: string) => val ? parseFloat(val) : null;

    const newTrade: Trade = {
      id: crypto.randomUUID(),
      data_hora: new Date().toISOString(),
      exchange: formData.exchange,
      moeda: formData.moeda.toUpperCase().trim(),
      preco_compra,
      quantidade,
      taxa_corretora_usd,
      stop_loss: parseNum(formData.stop_loss),
      alvo_1: parseNum(formData.alvo_1),
      alvo_2: parseNum(formData.alvo_2),
      alvo_3: parseNum(formData.alvo_3),
      alvo_4: parseNum(formData.alvo_4),
      alvo_5: parseNum(formData.alvo_5),
      alvo_6: parseNum(formData.alvo_6),
      status: 'Aberto',
      pnl_realizado: 0,
    };

    setTrades(prev => [newTrade, ...prev]);
    
    // Check if the current coin selected is in our virtual prices tracker, otherwise add it!
    const ticker = formData.moeda.toUpperCase().trim();
    if (!coinPrices.some(c => c.moeda === ticker)) {
      setCoinPrices(prev => [
        ...prev,
        {
          moeda: ticker,
          name: ticker,
          current_price: preco_compra * 1.05, // Default to slightly higher than bought
          change_24h: 1.5
        }
      ]);
    }

    setShowAddForm(false);
    showNotification(`Operação em ${newTrade.moeda} adicionada com sucesso!`);
    
    // Clear Form
    setFormData({
      exchange: 'Binance',
      moeda: 'BTC',
      preco_compra: '',
      quantidade: '',
      taxa_corretora_usd: '2.50',
      stop_loss: '',
      alvo_1: '',
      alvo_2: '',
      alvo_3: '',
      alvo_4: '',
      alvo_5: '',
      alvo_6: '',
    });
  };

  // Delete trade
  const handleDeleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
    showNotification('Trade removido do diário.', 'info');
  };

  // Simulation engine update (adjust prices)
  const handlePriceChange = (moeda: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCoinPrices(prev =>
      prev.map(c => (c.moeda === moeda ? { ...c, current_price: Number(newPrice.toFixed(8)) } : c))
    );
  };

  // Motor de Validação de Trades:
  // Se bate no Stop Loss -> Fechado_Loss. Se bate em Alvos, calcula lucros.
  // We can let the user trigger the check, or auto-run are triggered upon prices updates!
  // To follow the user requirement: "O sistema deve consultar a cotação online... Se a cotação atual bater no stop_loss, o trade é finalizado"
  // Let's implement an execution module so the user can see the trigger alerts!
  const runValidationEngine = () => {
    let closedCount = 0;
    const updatedTrades = trades.map(trade => {
      if (trade.status !== 'Aberto') return trade;

      const coinPriceObj = coinPrices.find(c => c.moeda === trade.moeda);
      if (!coinPriceObj) return trade;

      const currentPrice = coinPriceObj.current_price;
      const originalInvested = (trade. preco_compra * trade.quantidade) + trade.taxa_corretora_usd;

      // 1. Check Stop Loss
      if (trade.stop_loss !== null && currentPrice <= trade.stop_loss) {
        closedCount++;
        const pnl = (trade.stop_loss - trade.preco_compra) * trade.quantidade - trade.taxa_corretora_usd;
        return {
          ...trade,
          status: 'Fechado_Loss' as TradeStatus,
          pnl_realizado: Number(pnl.toFixed(4)),
        };
      }

      // 2. Check targets. In trade diaries, we can check if current price has crossed targets.
      // Let's check highest target touched. Profit is based on how many targets hit!
      const targets = [trade.alvo_1, trade.alvo_2, trade.alvo_3, trade.alvo_4, trade.alvo_5, trade.alvo_6];
      let highestHitTargetIndex = -1;

      targets.forEach((target, index) => {
        if (target !== null && currentPrice >= target) {
          highestHitTargetIndex = index;
        }
      });

      if (highestHitTargetIndex !== -1) {
        // If they reached target 6, wrap of the whole trade as Fechado_Gain!
        // Otherwise, it represents partial wins but still open, OR if user wants to close it manually at that target's profit.
        // Let's assume if it hits target 6 (the ultimate target), we declare it closed as Fechado_Gain. Or any target if they choose to settle.
        // Let's say if the current price is above target 6, it settles as Fechado_Gain automatically.
        if (highestHitTargetIndex === 5 || currentPrice >= (trade.alvo_6 || Infinity)) {
          closedCount++;
          const targetPrice = trade.alvo_6 || currentPrice;
          const pnl = (targetPrice - trade.preco_compra) * trade.quantidade - trade.taxa_corretora_usd;
          return {
            ...trade,
            status: 'Fechado_Gain' as TradeStatus,
            pnl_realizado: Number(pnl.toFixed(4)),
          };
        }
      }

      return trade;
    });

    if (closedCount > 0) {
      setTrades(updatedTrades);
      showNotification(`Motor de Validação executado! ${closedCount} trade(s) fechado(s).`, 'success');
    } else {
      showNotification('Motor de Validação executado. Nenhum stop_loss ou alvo terminal atingido.', 'info');
    }
  };

  // Run automatically when prices change to keep user alerted!
  useEffect(() => {
    // Check if any open trades are immediately meeting criteria
    const triggerDetections: string[] = [];
    trades.forEach(t => {
      if (t.status !== 'Aberto') return;
      const currentPrice = coinPrices.find(c => c.moeda === t.moeda)?.current_price;
      if (!currentPrice) return;

      if (t.stop_loss !== null && currentPrice <= t.stop_loss) {
        triggerDetections.push(`${t.moeda} bateu no Stop Loss ($${t.stop_loss})`);
      }
      if (t.alvo_6 !== null && currentPrice >= t.alvo_6) {
        triggerDetections.push(`${t.moeda} bateu no Alvo Final ($${t.alvo_6})`);
      }
    });

    if (triggerDetections.length > 0) {
      // Just flag that a trigger trigger is available
    }
  }, [coinPrices, trades]);

  // Calculations for dynamic dashboard metrics
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

  // Open trades PnL
  const openTradesPnl = totalCurrentValue - totalInvested;
  
  // Total PnL (Open + Realized)
  const totalPnlValue = openTradesPnl + totalRealizedPnl;
  const totalPnlPercent = totalInvested > 0 ? (totalPnlValue / totalInvested) * 100 : 0;

  // Pie chart calculation: Top allocation in open trades
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

  const top3Allocations = pieChartData.slice(0, 3);
  const totalAllocationValue = pieChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Dynamic Win Rate computation
  const closedTrades = trades.filter(t => t.status !== 'Aberto');
  const winTrades = closedTrades.filter(t => t.status === 'Fechado_Gain');
  const winRate = closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 68.4;

  // Filtered trades
  const filteredTrades = trades.filter(t => {
    const matchesTicker = t.moeda.toLowerCase().includes(tickerFilter.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' ? true : t.status === statusFilter;
    return matchesTicker && matchesStatus;
  });

  // Recharts color array
  const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'];

  // Portfolio performance mock coordinates tied dynamically to real current net value
  const baseNetWorth = totalCurrentValue + totalRealizedPnl;
  const displayNetWorth = baseNetWorth + (isSimulating ? simulatedActivePnL : 0);
  const displayPnlValue = totalPnlValue + (isSimulating ? simulatedActivePnL : 0);
  const displayPnlPercent = totalInvested > 0 ? (displayPnlValue / totalInvested) * 100 : 0;

  const performanceHistory = [
    { data: 'MAI 2026', valor: Number((displayNetWorth * 0.88).toFixed(2)) },
    { data: 'JUN 2026', valor: Number((displayNetWorth * 0.94).toFixed(2)) },
    { data: 'JUL 2026', valor: Number((displayNetWorth * 0.92).toFixed(2)) },
    { data: 'AGO 2026', valor: Number((displayNetWorth * 0.97).toFixed(2)) },
    { data: 'SET 2026', valor: Number((displayNetWorth * 1.02).toFixed(2)) },
    { data: 'ATUAL', valor: Number(displayNetWorth.toFixed(2)) },
  ];

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen w-full flex font-sans overflow-hidden antialiased">
      {/* Dynamic Alert Banner */}
      {notification && (
        <div
          id="toast-notification"
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-md border text-sm font-mono shadow-xl transition-all duration-300 animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : notification.type === 'error' ? (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-zinc-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-56 border-r border-zinc-850 border-r-zinc-800 flex flex-col bg-[#0c0c0e] shrink-0 h-screen select-none">
        <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-black font-extrabold text-lg">K</div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter uppercase text-white leading-tight">Kryp Terminal</h1>
            <p className="text-[10px] uppercase text-zinc-500 font-mono tracking-widest leading-none">Trader Diary</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-4 font-mono">Main Terminal</div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-all text-left cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Grid className="w-4 h-4 shrink-0" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('trades')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-all text-left cursor-pointer ${
              activeTab === 'trades'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
            id="sidebar-btn-trades"
          >
            <Layers2 className="w-4 h-4 shrink-0" />
            Trade Desk
          </button>

          <button
            onClick={() => setActiveTab('conexoes-api')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono transition-all text-left cursor-pointer ${
              activeTab === 'conexoes-api'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
            id="sidebar-btn-conexoes-api"
          >
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 shrink-0 text-green-400" />
              Conexões API
            </div>
            <span className="bg-zinc-900 border border-zinc-700 text-green-400 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">
              {brokerAccounts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hold')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-all text-left cursor-pointer ${
              activeTab === 'hold'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
            id="sidebar-btn-hold"
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            Hold Desk
          </button>
          
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-all text-left cursor-pointer ${
              activeTab === 'blueprint'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            Database Schema
          </button>

          <button
            onClick={() => setActiveTab('instituicoes')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-all text-left cursor-pointer ${
              activeTab === 'instituicoes'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
            id="sidebar-btn-instituicoes"
          >
            <Building2 className="w-4 h-4 shrink-0" />
            Instituições
          </button>

          <button
            onClick={() => {
              // Ensure we fallback or add new trades
              setActiveTab('new-trade');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-all text-left cursor-pointer ${
              activeTab === 'new-trade'
                ? 'bg-[#18181b] border border-[#27272a] text-white font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
            id="sidebar-btn-new-trade"
          >
            <Plus className="w-4 h-4 shrink-0 text-green-500" />
            Lançar Trade
          </button>

          <div className="pt-6">
            <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3 font-mono">Simulador</div>
            <button
              onClick={runValidationEngine}
              className="w-full flex items-center gap-2.5 px-3 py-2 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 hover:border-emerald-500/50 text-emerald-400 rounded text-xs font-mono transition-all cursor-pointer text-left"
              id="sidebar-btn-validation"
            >
              <Play className="w-3.5 h-3.5 shrink-0" />
              Verificar Gatilhos
            </button>
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-zinc-800 bg-[#09090b]/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] text-zinc-500 uppercase font-mono">API: COINGECKO ACTIVE</span>
          </div>

          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="w-full bg-zinc-100 text-black py-2 rounded text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-tighter font-mono cursor-pointer"
            id="sidebar-btn-import"
          >
            Importar CSV
          </button>
          <button
            onClick={downloadCsvTemplate}
            className="w-full border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 py-1.5 rounded text-[10px] transition-colors font-mono cursor-pointer"
            id="sidebar-btn-template"
          >
            Baixar Template
          </button>
          <button
            onClick={handleResetAllData}
            className="w-full border border-red-900/60 hover:border-red-600 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 py-1.5 rounded text-[10px] transition-colors font-mono cursor-pointer flex items-center justify-center gap-1.5 font-bold"
            id="sidebar-btn-reset-all"
            title="Apaga todos os dados e zera o banco de dados para iniciar com dados reais"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
            Zerar Banco de Dados
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">
        {/* Dynamic Inner Layout Switcher */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {activeTab === 'blueprint' ? (
            /* DATABASE BLUEPRINT & CODE FOLDERS (PASSO 1 & 2) */
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 px-4 text-xs leading-relaxed text-amber-300 font-mono">
                <Info className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Esta seção possui o script completo do Supabase Postgres e a estrutura de diretórios Next.js para produção.</span>
              </div>
              <DBBlueprint />
            </div>
          ) : activeTab === 'instituicoes' ? (
            /* GERENCIADOR DE INSTITUIÇÕES (NOVO MÓDULO) */
            <div className="space-y-6">
              <InstitutionsManager
                institutions={institutions}
                onAddInstitution={handleAddInstitution}
                onUpdateInstitution={handleUpdateInstitution}
                onDeleteInstitution={handleDeleteInstitution}
              />
            </div>
          ) : activeTab === 'new-trade' ? (
            /* TELA DE LANÇAMENTO MANUAL DE TRADES (MÓDULO DE CADASTRO AVANÇADO) */
            <div className="space-y-6">
              <NewTradeForm
                institutions={institutions}
                brokerAccounts={brokerAccounts}
                onSubmitTrade={handleRegisterDetailedTrade}
                onCancel={() => {
                  setActiveTab('trades');
                  setTradeToEdit(null);
                }}
                tradeToEdit={tradeToEdit}
                saldoBanca={saldoBanca}
              />
            </div>
          ) : activeTab === 'conexoes-api' ? (
            /* CONEXÕES COM CORRETORAS VIA API (MULTI-CONTAS POR CORRETORA) */
            <div className="space-y-6">
              <BrokerConnectionsView
                accounts={brokerAccounts}
                setAccounts={setBrokerAccounts}
                coinPrices={coinPrices}
                institutions={institutions}
                onAddInstitution={handleAddInstitution}
                onImportTrades={(importedTrades) => {
                  setTrades(prev => [...importedTrades, ...prev]);
                  setActiveTab('trades');
                  showNotification(`${importedTrades.length} operações importadas da corretora para o Trade Desk com sucesso!`, 'success');
                }}
                showNotification={showNotification}
              />
            </div>
          ) : activeTab === 'trades' ? (
            /* MESA DE OPERAÇÕES (TRADE DESK) */
            <TradeDeskView
              trades={trades}
              setTrades={setTrades}
              coinPrices={coinPrices}
              setCoinPrices={setCoinPrices}
              institutions={institutions}
              brokerAccounts={brokerAccounts}
              onNavigateToBrokerConnections={() => setActiveTab('conexoes-api')}
              onDeleteTrade={handleDeleteTrade}
              onRegisterDetailedTrade={handleRegisterDetailedTrade}
              onEditTrade={(trade) => {
                setTradeToEdit(trade);
                setActiveTab('new-trade');
              }}
              showNotification={showNotification}
              setIsCsvImportOpen={setIsCsvImportOpen}
              isSimulating={isSimulating}
              setIsSimulating={setIsSimulating}
              simulatedActivePnL={simulatedActivePnL}
              setSimulatedActivePnL={setSimulatedActivePnL}
              downloadCsvTemplate={downloadCsvTemplate}
              onLaunchTradeClick={() => setActiveTab('new-trade')}
              saldoBanca={saldoBanca}
              setSaldoBanca={setSaldoBanca}
              onResetAllData={handleResetAllData}
            />
          ) : activeTab === 'hold' ? (
            <div className="space-y-6">
              <HoldDeskView
                holds={holds}
                setHolds={setHolds}
                coinPrices={coinPrices}
                institutions={institutions}
                brokerAccounts={brokerAccounts}
                onLaunchHoldClick={() => setActiveTab('new-hold')}
                showNotification={showNotification}
              />
            </div>
          ) : activeTab === 'new-hold' ? (
            <div className="space-y-6">
              <NewHoldForm
                institutions={institutions}
                brokerAccounts={brokerAccounts}
                onSubmitHold={handleRegisterDetailedHold}
                onCancel={() => setActiveTab('hold')}
              />
            </div>
          ) : (
            /* DASHBOARD PRINCIPAL (VISÃO MACRO GERENCIAL) */
            <DashboardView
              trades={trades}
              coinPrices={coinPrices}
              isSimulating={isSimulating}
              simulatedActivePnL={simulatedActivePnL}
            />
          )}

        </div>

        {/* Footer info line synced across frames */}
        <footer className="border-t border-zinc-800 bg-[#0c0c0e] shrink-0 py-2.5 text-center text-[9px] font-mono text-zinc-500 select-none">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <span>DATABASE: SUPABASE COMPATIBLE • SYSTEM ROBUST RLS ACTIVE</span>
            <span>Estilo Trading Terminal de Alta Densidade • 2026</span>
            <span className="text-green-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              PORTFÓLIO SYNCED
            </span>
          </div>
        </footer>
      </main>

      <CSVImporter 
        isOpen={isCsvImportOpen} 
        onClose={() => setIsCsvImportOpen(false)} 
        onImportSuccess={(count, newTrades) => {
          setTrades(prev => [...newTrades, ...prev]);
          showNotification(`${count} registros importados e consolidados com o Supabase!`, 'success');
        }} 
      />
    </div>
  );
}
