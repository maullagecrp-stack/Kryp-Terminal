import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  ShieldAlert, 
  FileText, 
  Percent,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Instituicao, Trade } from '../types';

/**
 * Formata valores numéricos com casas decimais adaptativas.
 * Usa poucas casas para números grandes, muitas casas para números pequenos.
 * Sempre preserva a precisão real via toFixed().
 */
const formatSmart = (value: number | string | null | undefined, _decimals = 9) => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(String(value).replace(',', '.'));
  if (isNaN(num)) return '—';
  if (num === 0) return '0.00';
  
  const abs = Math.abs(num);
  let casas;
  
  if (abs >= 1000)       casas = 2;
  else if (abs >= 1)     casas = 4;
  else if (abs >= 0.01)  casas = 6;
  else if (abs >= 0.000001) casas = 8;
  else                   casas = 9;
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
};

const formatUSD = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '' || isNaN(Number(String(value).replace(',', '.')))) return '$ 0.00';
  return '$ ' + Number(String(value).replace(',', '.')).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Retorna o valor com precisão TOTAL para usar no tooltip (title).
 */
const formatPreciso = (value: number | string | null | undefined, decimals = 9) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(String(value).replace(',', '.'));
  if (isNaN(num)) return '-';
  return num.toFixed(decimals);
};

const emocaoEmoji = (emocao: string | null) => {
  const mapa: Record<string, string> = {
    'CALMO': '😌', 'ANSIOSO': '😤', 'MEDO': '😰',
    'GANANCIA': '🤑', 'DUVIDA': '🤔', 'NEUTRO': '😐'
  };
  return mapa[emocao || ''] || '😐';
};

const formatNumberInput = (value: string, maxBeforeDecimal = 6, maxAfterDecimal = 9) => {
  if (!value || value === '') return '';
  
  // Remove qualquer caractere que não seja dígito, ponto, vírgula ou sinal de menos
  let cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
  
  // Tratar sinal negativo (só permite no início)
  const isNegative = cleaned.startsWith('-') && cleaned.length > 1;
  if (cleaned.startsWith('-') && cleaned.length === 1) return '-';
  cleaned = cleaned.replace(/-/g, '');
  
  // Separar parte inteira e decimal
  const dotIndex = cleaned.indexOf('.');
  let intPart = dotIndex >= 0 ? cleaned.substring(0, dotIndex) : cleaned;
  let decPart = dotIndex >= 0 ? cleaned.substring(dotIndex + 1) : '';
  
  // Limitar tamanhos
  intPart = intPart.slice(0, maxBeforeDecimal);
  decPart = decPart.slice(0, maxAfterDecimal);
  
  // Remover zeros à esquerda na parte inteira (mantém pelo menos um zero)
  intPart = intPart.replace(/^0+/, '');
  if (intPart === '') intPart = '0';
  
  // Montar resultado
  let result = intPart;
  if (decPart.length > 0 || cleaned.includes('.')) {
    result += '.' + decPart;
  }
  
  return (isNegative ? '-' : '') + result;
};

const EXCHANGES = [
  { nome: 'Binance', moedaTaxa: 'BNB' },
  { nome: 'Bybit', moedaTaxa: null },
  { nome: 'BitGet', moedaTaxa: 'BGB' },
  { nome: 'Mexc', moedaTaxa: 'MX' },
  { nome: 'Kraken', moedaTaxa: null },
  { nome: 'OKX', moedaTaxa: 'OKB' },
  { nome: 'Crypto.com', moedaTaxa: 'CRO' },
  { nome: 'Gate.io', moedaTaxa: 'GT' },
];

const fetchWithProxy = async (url: string): Promise<any> => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn(`Failed fetching directly from ${url}, trying corsproxy...`, error);
  }

  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn(`Failed fetching from corsproxy for ${url}, trying allorigins...`, error);
  }

  try {
    const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(allOriginsUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.contents) {
        return JSON.parse(data.contents);
      }
    }
  } catch (error) {
    console.warn(`Failed fetching from allorigins for ${url}`, error);
  }

  return null;
};

const buscarCotacaoPorExchange = async (exchange: string, ativo: string, par: string): Promise<number | null> => {
  const parFormatado = `${ativo}${par}`.toUpperCase();
  
  try {
    let url;
    
    switch (exchange) {
      case 'Binance':
        url = `https://api.binance.com/api/v3/ticker/price?symbol=${parFormatado}`;
        break;
      case 'Bybit':
        url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${parFormatado}`;
        break;
      case 'BitGet':
        url = `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${parFormatado}`;
        break;
      case 'Mexc':
        url = `https://api.mexc.com/api/v3/ticker/price?symbol=${parFormatado}`;
        break;
      case 'Kraken': {
        // Kraken: BTC vira XBT
        const parKraken = par === 'BTC' ? `${ativo}XBT` : par === 'ETH' ? `${ativo}ETH` : parFormatado;
        url = `https://api.kraken.com/0/public/Ticker?pair=${parKraken}`;
        break;
      }
      case 'OKX':
        url = `https://www.okx.com/api/v5/market/ticker?instId=${ativo}-${par}`;
        break;
      case 'Crypto.com': {
        const parCrypto = `${ativo}_${par}`.toUpperCase();
        const mainUrl = `https://api.crypto.com/v2/public/get-ticker?instrument_name=${parCrypto}`;
        
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(mainUrl)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const json = await res.json();
            const ticketList = json.result?.data;
            if (Array.isArray(ticketList) && ticketList.length > 0) {
              const val = parseFloat(ticketList[0].a);
              if (!isNaN(val)) return val;
            } else if (json.result?.data?.a) {
              const val = parseFloat(json.result.data.a);
              if (!isNaN(val)) return val;
            }
          }
        } catch (e) {
          console.warn("Failed fetching Crypto.com via corsproxy.io, trying AllOrigins", e);
        }

        try {
          const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(mainUrl)}`;
          const res = await fetch(allOriginsUrl);
          if (res.ok) {
            const rawData = await res.json();
            const json = JSON.parse(rawData.contents);
            const ticketList = json.result?.data;
            if (Array.isArray(ticketList) && ticketList.length > 0) {
              const val = parseFloat(ticketList[0].a);
              if (!isNaN(val)) return val;
            } else if (json.result?.data?.a) {
              const val = parseFloat(json.result.data.a);
              if (!isNaN(val)) return val;
            }
          }
        } catch (e) {
          console.warn("AllOrigins fallback failed for Crypto.com", e);
        }

        const altUrl = `https://api.crypto.com/v2/public/get-ticker?instrument_name=${parFormatado}`;
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(altUrl)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const json = await res.json();
            const ticketList = json.result?.data;
            if (Array.isArray(ticketList) && ticketList.length > 0) {
              const val = parseFloat(ticketList[0].a);
              if (!isNaN(val)) return val;
            } else if (json.result?.data?.a) {
              const val = parseFloat(json.result.data.a);
              if (!isNaN(val)) return val;
            }
          }
        } catch {
          // ignore
        }

        url = altUrl;
        break;
      }
      case 'Gate.io':
        url = `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${ativo}_${par}`;
        break;
      default:
        return null;
    }
    
    const data = await fetchWithProxy(url);
    if (!data) return null;
    
    switch (exchange) {
      case 'Binance':
      case 'Mexc':
        return data.price ? parseFloat(data.price) : null;
      case 'Bybit':
        return data.result?.list?.[0]?.lastPrice ? parseFloat(data.result.list[0].lastPrice) : null;
      case 'BitGet':
        return data.data?.[0]?.lastPr ? parseFloat(data.data[0].lastPr) : null;
      case 'Kraken': {
        const pairs = Object.values(data.result || {});
        return pairs.length > 0 ? parseFloat((pairs[0] as any).c?.[0]) : null;
      }
      case 'OKX':
        return data.data?.[0]?.last ? parseFloat(data.data[0].last) : null;
      case 'Crypto.com':
        return data.result?.data ? parseFloat(data.result.data.a || (data.result.data as any)[0]?.a) : null;
      case 'Gate.io':
        return Array.isArray(data) && data.length > 0 ? parseFloat(data[0].last) : null;
      default:
        return null;
    }
  } catch (error) {
    console.warn(`Erro ao buscar cotação na ${exchange}:`, error);
    return null;
  }
};

const STABLE_USD = ['USD', 'USDT', 'USDC', 'DAI'];

const getQuoteType = (quote: string) => {
  const q = (quote || '').toUpperCase().trim();
  if (STABLE_USD.includes(q)) return 'stable_usd';
  // Criptomoedas conhecidas
  const cryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'BNB', 'XRP', 'DOGE', 'LINK', 'AVAX', 'MATIC', 'DOT', 'UNI', 'ATOM', 'LTC', 'BCH', 'TRX', 'SHIB', 'PEPE', 'NEAR', 'APT', 'ARB', 'OP'];
  if (cryptos.includes(q)) return 'crypto';
  // Qualquer outra coisa trata como fiduciária (EUR, GBP, BRL, JPY, etc.)
  return 'fiat';
};

const buscarCotacaoCoinGecko = async (par: string): Promise<number> => {
  try {
    // Normalizar o par: ex "BTC/usd" → "bitcoin"
    const map: Record<string, string> = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'sol': 'solana',
      'ada': 'cardano',
      'bnb': 'binancecoin',
      'xrp': 'ripple',
      'doge': 'dogecoin',
      'link': 'chainlink',
      'avax': 'avalanche-2',
      'matic': 'matic-network',
      'dot': 'polkadot',
      'uni': 'uniswap',
      'atom': 'cosmos',
      'ltc': 'litecoin',
      'bch': 'bitcoin-cash',
      'trx': 'tron',
      'shib': 'shiba-inu',
      'pepe': 'pepe',
      'near': 'near',
      'apt': 'aptos',
      'arb': 'arbitrum',
      'op': 'optimism',
    };
    
    const moeda = par.split('/')[0].toLowerCase();
    const id = map[moeda] || moeda;
    
    const data = await fetchWithProxy(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    );
    return data && data[id] ? data[id].usd || 0 : 0;
  } catch (error) {
    console.warn('Erro ao buscar cotação CoinGecko:', error);
    return 0;
  }
};

const buscarCotacaoForex = async (moeda: string): Promise<number> => {
  try {
    const data = await fetchWithProxy(
      `https://api.exchangerate-api.com/v4/latest/${moeda}`
    );
    return data && data.rates ? data.rates.USD || 0 : 0;
  } catch (error) {
    console.warn('Erro ao buscar taxa forex:', error);
    return 0;
  }
};

const calcularOperacao = async (quantidade: number, cotacaoCompraUSD: number, quote: string, multiplicador: number, quoteUsdtPrice: number = 1) => {
  const tipo = getQuoteType(quote);
  
  // Convert purchase price to quote scale if it's not stable_usd
  const cotacaoCompra = tipo === 'stable_usd' ? cotacaoCompraUSD : (cotacaoCompraUSD / (quoteUsdtPrice || 1));

  // Passo 1: Valor investido na moeda quote
  const investidoQuote = quantidade * cotacaoCompra;

  // Passo 2: USD equivalent
  const investidoUSD = tipo === 'stable_usd' ? investidoQuote : (quantidade * cotacaoCompraUSD);

  // Passo 3: Aplicar alavancagem
  const totalAlavancadoUSD = investidoUSD * multiplicador;

  return {
    investidoQuote,       // valor na moeda do par (ex: 1,010548 BTC)
    quote,                // moeda (ex: BTC)
    investidoUSD,         // valor convertido para USD
    totalAlavancadoUSD,   // valor alavancado em USD
    tipo,                 // stable_usd | crypto | fiat
    cotacaoCompraNaQuote: cotacaoCompra,
    cotacaoCompraUSD,
    tipoQuote: tipo,
  };
};

interface NewTradeFormProps {
  institutions: Instituicao[];
  onSubmitTrade: (newTradeData: {
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
  }) => void;
  onCancel: () => void;
  tradeToEdit?: Trade | null;
}

export default function NewTradeForm({
  institutions,
  onSubmitTrade,
  onCancel,
  tradeToEdit
}: NewTradeFormProps) {
  // Current date in YYYY-MM-DD format for input value default
  const getCurrentDate = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
  };

  // Bloco A States
  const [dataHora, setDataHora] = useState(getCurrentDate());
  const [exchange, setExchange] = useState(institutions[0]?.nome || 'Binance');
  const [ativoBase, setAtivoBase] = useState('');
  const [ativoCotacao, setAtivoCotacao] = useState('USDT');
  const [cotacaoAtual, setCotacaoAtual] = useState('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [moeda, setMoeda] = useState('');
  const [tipoOperacao, setTipoOperacao] = useState<'Long' | 'Short' | null>(null);
  const [tema, setTema] = useState<'NEUTRO' | 'LONG' | 'SHORT'>('NEUTRO');

  // Sync tema when tipoOperacao changes
  useEffect(() => {
    if (tipoOperacao === 'Long') {
      setTema('LONG');
    } else if (tipoOperacao === 'Short') {
      setTema('SHORT');
    } else {
      setTema('NEUTRO');
    }
  }, [tipoOperacao]);

  const handleDirecao = (direcao: 'Long' | 'Short' | null) => {
    setTipoOperacao(direcao);
    setTema(direcao ? (direcao.toUpperCase() as 'LONG' | 'SHORT') : 'NEUTRO');
  };

  const [usdRates, setUsdRates] = useState<Record<string, number>>({
    USD: 1,
    USDT: 1,
    USDC: 1,
    BRL: 5.40,
    EUR: 0.92,
    GBP: 0.79,
  });

  const [quoteUsdtPrice, setQuoteUsdtPrice] = useState<number>(1);

  // Fetch real-time price in USDT for the quote currency if it's a crypto currency
  useEffect(() => {
    const quote = (ativoCotacao || '').trim().toUpperCase();
    if (!quote || quote === 'USDT' || quote === 'USDC' || quote === 'USD') {
      setQuoteUsdtPrice(1);
      return;
    }

    // If it's a fiat currency (other than USDT/USDC/USD), we don't treat as crypto
    if (usdRates[quote] && quote !== 'BRL' && quote !== 'EUR' && quote !== 'GBP') {
      setQuoteUsdtPrice(1);
      return;
    }

    let isMounted = true;
    const fetchQuotePrice = async () => {
      try {
        const symbol = `${quote}USDT`;
        const data = await fetchWithProxy(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        if (data && data.price && isMounted) {
          const price = parseFloat(data.price);
          if (!isNaN(price) && price > 0) {
            setQuoteUsdtPrice(price);
          }
        }
      } catch (err) {
        if (isMounted) setQuoteUsdtPrice(1);
      }
    };

    fetchQuotePrice();
    return () => {
      isMounted = false;
    };
  }, [ativoCotacao, usdRates]);

  // Fetch USD exchange rates once on mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const data = await fetchWithProxy('https://open.er-api.com/v6/latest/USD');
        if (data && data.rates) {
          setUsdRates(prev => ({
            ...prev,
            ...data.rates,
            USDT: 1,
            USDC: 1,
          }));
        }
      } catch (err) {
        // Fallback to defaults
      }
    };
    fetchRates();
  }, []);

  // Bloco B States
  const [isLeveraged, setIsLeveraged] = useState(false);
  const [leverageMultiplier, setLeverageMultiplier] = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [isPrecoCompraFocused, setIsPrecoCompraFocused] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [valorInvestido, setValorInvestido] = useState('');
  const [moedaTaxa, setMoedaTaxa] = useState('USDT');
  const [quantidadeTaxa, setQuantidadeTaxa] = useState('');
  const [taxaCorretoraUsd, setTaxaCorretoraUsd] = useState(0);

  const [resultados, setResultados] = useState({
    investidoQuote: 0,
    quote: 'USDT',
    investidoUSD: 0,
    totalAlavancadoUSD: 0,
    tipo: 'stable_usd',
    cotacaoCompraNaQuote: 0,
    cotacaoCompraUSD: 0,
    tipoQuote: 'stable_usd'
  });

  const [nativeCoinRates, setNativeCoinRates] = useState<Record<string, number>>({
    'BNB': 600.0,
    'MNT': 0.70,
    'MX': 2.20
  });

  const getMoedaTaxaOptions = () => {
    const options = [{ value: 'USDT', label: 'USDT' }];
    
    const baseUpper = (ativoBase || '').trim().toUpperCase();
    if (baseUpper && baseUpper !== 'USDT' && baseUpper !== 'USDC' && baseUpper !== 'USD') {
      options.push({ value: baseUpper, label: baseUpper });
    }

    const selectedInst = institutions.find(i => i.nome === exchange);
    const selectedInstNativeCoin = selectedInst?.native_coin?.trim().toUpperCase();
    if (selectedInstNativeCoin && selectedInstNativeCoin !== 'USDT' && selectedInstNativeCoin !== 'USDC' && selectedInstNativeCoin !== 'USD' && selectedInstNativeCoin !== baseUpper) {
      options.push({ value: selectedInstNativeCoin, label: selectedInstNativeCoin });
    }

    const currentUpper = (moedaTaxa || '').trim().toUpperCase();
    if (currentUpper && !options.some(o => o.value === currentUpper)) {
      options.push({ value: currentUpper, label: currentUpper });
    }

    return options;
  };

  // Keep moedaTaxa valid when options shift
  useEffect(() => {
    const opts = getMoedaTaxaOptions();
    if (moedaTaxa && !opts.some(o => o.value === moedaTaxa)) {
      setMoedaTaxa('USDT');
    }
  }, [ativoBase, exchange, institutions]);

  // Fetch exchange rate from Binance for the selected native coin
  useEffect(() => {
    const selectedInst = institutions.find(i => i.nome === exchange);
    const nativeCoin = selectedInst?.native_coin?.trim().toUpperCase();
    if (!nativeCoin || nativeCoin === 'USDT' || nativeCoin === 'USDC' || nativeCoin === 'USD') return;

    let isMounted = true;
    const fetchNativeCoinPrice = async () => {
      try {
        const data = await fetchWithProxy(`https://api.binance.com/api/v3/ticker/price?symbol=${nativeCoin}USDT`);
        if (data && data.price) {
          const price = parseFloat(data.price);
          if (!isNaN(price) && price > 0 && isMounted) {
            setNativeCoinRates(prev => ({
              ...prev,
              [nativeCoin]: price
            }));
          }
        }
      } catch (err) {
        // Silent recovery
      }
    };

    fetchNativeCoinPrice();
    return () => {
      isMounted = false;
    };
  }, [exchange, institutions]);

  // 3-way dynamic binding helper calculations
  const parseToFloat = (val: string): number => {
    const clean = val.replace(',', '.').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatSmartPreciso = (value: number | string | null | undefined, tipoQuote: string) => {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(String(value).replace(',', '.'));
    if (isNaN(num)) return '';
    const converted = tipoQuote === 'stable_usd' ? num : (num / (quoteUsdtPrice || 1));
    return formatSmart(converted);
  };

  const handleAtivoBaseChange = (val: string) => {
    setAtivoBase(val);
    setMoeda(val.trim().toUpperCase());
  };

  const handleChangeAtivoOuPar = (campo: 'ativo' | 'par', valor: string) => {
    const ativoMudou = campo === 'ativo';
    const parMudou = campo === 'par';

    if (ativoMudou) {
      setAtivoBase(valor);
      setMoeda(valor.trim().toUpperCase());
    } else if (parMudou) {
      setAtivoCotacao(valor);
    }

    if (ativoMudou || parMudou) {
      setPrecoCompra('');
      setCotacaoAtual('');
      setQuantidade('');
      setValorInvestido('');
      setIsLeveraged(false);
      setLeverageMultiplier('');
      setStopLoss('0');
      setRiscoMaximo('');
      setAlvo1('0');
      setAlvo2('0');
      setAlvo3('0');
      setAlvo4('0');
      setAlvo5('0');
      setQuantidadeTaxa('');
      setTaxaCorretoraUsd(0);

      setResultados({
        investidoQuote: 0,
        quote: parMudou ? valor.toUpperCase() : (ativoCotacao || '').toUpperCase(),
        investidoUSD: 0,
        totalAlavancadoUSD: 0,
        tipo: getQuoteType(parMudou ? valor : ativoCotacao),
        cotacaoCompraNaQuote: 0,
        cotacaoCompraUSD: 0,
        tipoQuote: getQuoteType(parMudou ? valor : ativoCotacao)
      });
    }
  };

  // Recalcular sempre que os inputs relevantes mudarem
  useEffect(() => {
    const qty = parseToFloat(quantidade);
    const preco = parseToFloat(precoCompra);
    const q = (ativoCotacao || '').trim().toUpperCase();
    const mult = isLeveraged ? (parseFloat(leverageMultiplier) || 1) : 1;

    let isMounted = true;
    if (qty > 0 && preco > 0 && q) {
      calcularOperacao(
        qty,
        preco,
        q,
        mult,
        quoteUsdtPrice
      ).then((res) => {
        if (isMounted) {
          setResultados(res);
        }
      });
    } else {
      setResultados({
        investidoQuote: 0,
        quote: q,
        investidoUSD: 0,
        totalAlavancadoUSD: 0,
        tipo: getQuoteType(q),
        cotacaoCompraNaQuote: 0,
        cotacaoCompraUSD: 0,
        tipoQuote: getQuoteType(q)
      });
    }
    return () => {
      isMounted = false;
    };
  }, [quantidade, precoCompra, ativoCotacao, leverageMultiplier, isLeveraged, quoteUsdtPrice]);

  // Fetch real-time price when exchange, base/quote are entered
  useEffect(() => {
    if (!ativoBase.trim() || !ativoCotacao.trim() || !exchange) return;

    let isMounted = true;
    const fetchPrice = async () => {
      setIsFetchingPrice(true);
      try {
        const base = ativoBase.trim().toUpperCase();
        const quote = ativoCotacao.trim().toUpperCase();
        
        const preco = await buscarCotacaoPorExchange(exchange, base, quote);
        
        if (preco && preco > 0 && isMounted) {
          setCotacaoAtual(String(preco));
          
          const quoteType = getQuoteType(quote);
          const precoUSD = quoteType === 'stable_usd' ? preco : (preco * (quoteUsdtPrice || 1));
          
          setPrecoCompra(curr => {
            const val = parseFloat(curr);
            return (isNaN(val) || val <= 0) ? String(precoUSD) : curr;
          });
          
          // Recalculate other depending values if any are specified in terms of USD price
          const q = parseToFloat(quantidade);
          const v = parseToFloat(valorInvestido);
          if (q > 0) {
            setValorInvestido(String(Number((precoUSD * q).toFixed(8))));
          } else if (v > 0) {
            setQuantidade(String(Number((v / precoUSD).toFixed(8))));
          }
        }
      } catch (err) {
        // Silent catch
      } finally {
        if (isMounted) {
          setIsFetchingPrice(false);
        }
      }
    };

    const delay = setTimeout(() => {
      fetchPrice();
    }, 600);

    return () => {
      isMounted = false;
      clearTimeout(delay);
    };
  }, [exchange, ativoBase, ativoCotacao, quoteUsdtPrice]);

  const handleChangeExchange = (selectedExchange: string) => {
    setExchange(selectedExchange);
    const exchangeData = EXCHANGES.find(e => e.nome === selectedExchange);
    if (exchangeData) {
      setMoedaTaxa(exchangeData.moedaTaxa || '');
    }
  };

  const getQuotePriceInUSD = (): number => {
    const quote = (ativoCotacao || 'USDT').toUpperCase();
    if (quote === 'USD' || quote === 'USDT' || quote === 'USDC') {
      return 1;
    }
    
    // Check if it is a crypto currency with a fetched Binance price
    if (quoteUsdtPrice && quoteUsdtPrice !== 1) {
      return quoteUsdtPrice;
    }
    
    // Otherwise check fiat usdRates
    if (usdRates[quote]) {
      return 1 / usdRates[quote];
    }
    
    return 1;
  };

  const getValorInvestidoInUSD = () => {
    const v = parseToFloat(valorInvestido);
    if (!v) return 0;
    return v * getQuotePriceInUSD();
  };

  // Proportion cascaded quantities for risk management
  const getCascadeQuantities = (totalQty: number) => {
    const q1 = totalQty * 0.5;
    const r1 = totalQty - q1;

    const q2 = r1 * 0.4;
    const r2 = r1 - q2;

    const q3 = r2 * 0.5;
    const r3 = r2 - q3;

    const q4 = r3 * 0.2;
    const r4 = r3 - q4;

    const q5 = r4 * 1.0;

    return { q1, q2, q3, q4, q5 };
  };

  const getTargetQuantity = (num: number): number => {
    const totalQty = parseToFloat(quantidade);
    if (totalQty <= 0) return 0;

    const cascades = getCascadeQuantities(totalQty);
    switch (num) {
      case 1: return cascades.q1;
      case 2: return cascades.q2;
      case 3: return cascades.q3;
      case 4: return cascades.q4;
      case 5: return cascades.q5;
      default: return 0;
    }
  };

  const getPercentageDistance = (targetValStr: string, isStop: boolean = false) => {
    const entry = parseToFloat(precoCompra);
    const target = parseToFloat(targetValStr);
    if (entry <= 0 || target <= 0) return '';

    const pct = ((target - entry) / entry) * 100;
    
    // For Short, actual PnL direction is opposite
    const actualPct = tipoOperacao === 'Short' ? -pct : pct;
    const sign = actualPct >= 0 ? '+' : '';
    return `${sign}${actualPct.toFixed(1)}%`;
  };

  const handlePrecoCompraChange = (rawVal: string) => {
    const val = formatNumberInput(rawVal);
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
    const val = formatNumberInput(rawVal);
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

  // Bloco C States
  const [stopLoss, setStopLoss] = useState('0');
  const [alvo1, setAlvo1] = useState('0');
  const [alvo2, setAlvo2] = useState('0');
  const [alvo3, setAlvo3] = useState('0');
  const [alvo4, setAlvo4] = useState('0');
  const [alvo5, setAlvo5] = useState('0');
  const [riscoMaximo, setRiscoMaximo] = useState('');
  const [showModalRisco, setShowModalRisco] = useState(false);
  const [showModalDiario, setShowModalDiario] = useState(false);
  const [rrSelecionado, setRrSelecionado] = useState<number | null>(null);
  const [rrPersonalizado, setRrPersonalizado] = useState({ risco: 1, recompensa: 2 });

  const [errors, setErrors] = useState({
    stopLoss: '',
    alvo1: '',
    alvo2: '',
    alvo3: '',
    alvo4: '',
    alvo5: '',
  });

  const validarGestaoRisco = (
    campo: string,
    valor: string,
    direcao: 'Long' | 'Short' | string,
    cotacaoCompraStr: string
  ): { valido: boolean; mensagem: string } => {
    const cotacaoCompra = parseToFloat(cotacaoCompraStr);
    if (!direcao || cotacaoCompra <= 0) return { valido: true, mensagem: '' };

    const num = parseToFloat(valor);
    if (num <= 0) return { valido: true, mensagem: '' };

    const sl_val = parseToFloat(stopLoss);
    const a1_val = parseToFloat(alvo1);
    const a2_val = parseToFloat(alvo2);
    const a3_val = parseToFloat(alvo3);
    const a4_val = parseToFloat(alvo4);
    const a5_val = parseToFloat(alvo5);

    const dirUpper = direcao.toUpperCase();

    if (dirUpper === 'LONG') {
      switch (campo) {
        case 'stopLoss':
          if (num >= cotacaoCompra) {
            return { valido: false, mensagem: `Stop Loss (${num}) deve ser MENOR que a entrada (${cotacaoCompra}) em LONG` };
          }
          break;
        case 'alvo1':
          if (num <= cotacaoCompra) {
            return { valido: false, mensagem: `Alvo 1 (${num}) deve ser MAIOR que a entrada (${cotacaoCompra}) em LONG` };
          }
          break;
        case 'alvo2':
          if (a1_val > 0 && num <= a1_val) {
            return { valido: false, mensagem: `Alvo 2 (${num}) deve ser MAIOR que Alvo 1 (${a1_val})` };
          }
          break;
        case 'alvo3':
          if (a2_val > 0 && num <= a2_val) {
            return { valido: false, mensagem: `Alvo 3 (${num}) deve ser MAIOR que Alvo 2 (${a2_val})` };
          }
          break;
        case 'alvo4':
          if (a3_val > 0 && num <= a3_val) {
            return { valido: false, mensagem: `Alvo 4 (${num}) deve ser MAIOR que Alvo 3 (${a3_val})` };
          }
          break;
        case 'alvo5':
          if (a4_val > 0 && num <= a4_val) {
            return { valido: false, mensagem: `Alvo 5 (${num}) deve ser MAIOR que Alvo 4 (${a4_val})` };
          }
          break;
      }
    } else if (dirUpper === 'SHORT') {
      switch (campo) {
        case 'stopLoss':
          if (num <= cotacaoCompra) {
            return { valido: false, mensagem: `Stop Loss (${num}) deve ser MAIOR que a entrada (${cotacaoCompra}) em SHORT` };
          }
          break;
        case 'alvo1':
          if (num >= cotacaoCompra) {
            return { valido: false, mensagem: `Alvo 1 (${num}) deve ser MENOR que a entrada (${cotacaoCompra}) em SHORT` };
          }
          break;
        case 'alvo2':
          if (a1_val > 0 && num >= a1_val) {
            return { valido: false, mensagem: `Alvo 2 (${num}) deve ser MENOR que Alvo 1 (${a1_val})` };
          }
          break;
        case 'alvo3':
          if (a2_val > 0 && num >= a2_val) {
            return { valido: false, mensagem: `Alvo 3 (${num}) deve ser MENOR que Alvo 2 (${a2_val})` };
          }
          break;
        case 'alvo4':
          if (a3_val > 0 && num >= a3_val) {
            return { valido: false, mensagem: `Alvo 4 (${num}) deve ser MENOR que Alvo 3 (${a3_val})` };
          }
          break;
        case 'alvo5':
          if (a4_val > 0 && num >= a4_val) {
            return { valido: false, mensagem: `Alvo 5 (${num}) deve ser MENOR que Alvo 4 (${a4_val})` };
          }
          break;
      }
    }

    return { valido: true, mensagem: '' };
  };

  useEffect(() => {
    const campos = ['stopLoss', 'alvo1', 'alvo2', 'alvo3', 'alvo4', 'alvo5'];
    const newErrors: Record<string, string> = {};
    const vals: Record<string, string> = { stopLoss, alvo1, alvo2, alvo3, alvo4, alvo5 };

    for (const campo of campos) {
      const result = validarGestaoRisco(campo, vals[campo], tipoOperacao, precoCompra);
      if (!result.valido) {
        newErrors[campo] = result.mensagem;
      }
    }
    setErrors(newErrors);
  }, [tipoOperacao, precoCompra, stopLoss, alvo1, alvo2, alvo3, alvo4, alvo5]);

  // Bloco D States
  const [strategies, setStrategies] = useState<{ id: string | number; name: string }[]>([]);
  const [estrategia, setEstrategia] = useState('Price Action clássico');
  const [notas, setNotas] = useState('');

  // NOVOS CAMPOS DO DIÁRIO DE BORDO ELETRÔNICO
  const [gatilhoEntrada, setGatilhoEntrada] = useState('');
  const [analiseContexto, setAnaliseContexto] = useState('');
  const [acertouSetup, setAcertouSetup] = useState<'SIM' | 'NÃO' | 'PARCIAL' | null>(null);
  const [seguiuPlano, setSeguiuPlano] = useState<'SIM' | 'NÃO' | 'PARCIAL' | null>(null);
  const [erroOperacional, setErroOperacional] = useState<boolean | null>(null);
  const [notaTrade, setNotaTrade] = useState<number>(0);
  const [emocaoTrade, setEmocaoTrade] = useState<'CALMO' | 'ANSIOSO' | 'MEDO' | 'GANANCIA' | 'DUVIDA' | 'NEUTRO' | null>(null);
  const [disciplinaTrade, setDisciplinaTrade] = useState<'SEGUIU' | 'DESVIOU' | 'IGNOROU' | null>(null);
  const [licaoAprendida, setLicaoAprendida] = useState('');

  // Local validation error message
  const [validationError, setValidationError] = useState<string | null>(null);

  const calcularStopEAlvosPorRR = (rr: number, precoEntrada: number, direcao: string | null) => {
    if (!precoEntrada || !rr || !direcao) return { stopSugerido: null, alvosSugeridos: [] };

    // RR é a relação recompensa:risco (ex: 1:2 = recompensa 2x o risco)
    // Para calcular, precisamos de uma porcentagem base de risco
    const riscoBase = 0.005; // 0.5% como padrão (configurável)

    const valorRisco = precoEntrada * riscoBase;
    const valorRecompensa = valorRisco * rr;

    let stopSugerido = 0;
    let alvosSugeridos: number[] = [];

    if (direcao.toLowerCase() === 'long') {
      stopSugerido = precoEntrada - valorRisco;
      alvosSugeridos = [
        precoEntrada + valorRecompensa,      // Alvo 1: 1R
        precoEntrada + valorRecompensa * 2,  // Alvo 2: 2R
        precoEntrada + valorRecompensa * 3,  // Alvo 3: 3R
        precoEntrada + valorRecompensa * 4,  // Alvo 4: 4R
        precoEntrada + valorRecompensa * 5,  // Alvo 5: 5R
      ];
    } else { // 'Short'
      stopSugerido = precoEntrada + valorRisco;
      alvosSugeridos = [
        precoEntrada - valorRecompensa,
        precoEntrada - valorRecompensa * 2,
        precoEntrada - valorRecompensa * 3,
        precoEntrada - valorRecompensa * 4,
        precoEntrada - valorRecompensa * 5,
      ];
    }

    return { stopSugerido, alvosSugeridos };
  };

  const calcularPositionSize = () => {
    const precoEntrada = parseToFloat(precoCompra);
    const stopLossVal = parseToFloat(stopLoss);
    const riscoMax = parseToFloat(riscoMaximo);

    if (!precoEntrada || !stopLossVal || !riscoMax) {
      return { quantidadeSugerida: null, valorSugerido: null };
    }

    const isShort = tipoOperacao === 'Short';
    const diferenca = isShort ? (stopLossVal - precoEntrada) : (precoEntrada - stopLossVal);

    if (diferenca <= 0) {
      return { quantidadeSugerida: null, valorSugerido: null };
    }

    const qty = riscoMax / diferenca;
    const valorTotal = qty * precoEntrada;

    return {
      quantidadeSugerida: qty,
      valorSugerido: valorTotal,
    };
  };

  const { quantidadeSugerida, valorSugerido } = calcularPositionSize();

  // Load strategies from LocalStorage (key @kryp:strategies), fallback to default list
  useEffect(() => {
    const stored = localStorage.getItem('@kryp:strategies');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStrategies(parsed);
          if (tradeToEdit) {
            setEstrategia(tradeToEdit.estrategia || parsed[0].name);
          } else {
            setEstrategia(parsed[0].name);
          }
          return;
        }
      } catch (err) {
        console.error('Erro ao ler estratégias do localStorage:', err);
      }
    }
    
    // Default list
    const defaults = [
      { id: '1', name: 'Price Action clássico' },
      { id: '2', name: 'SMC / ICT' },
      { id: '3', name: 'Suporte e Resistência' },
      { id: '4', name: 'Elliott Wave' },
      { id: '5', name: 'Tape Reading' },
      { id: '6', name: 'Momentum' },
      { id: '7', name: 'Outro' }
    ];
    setStrategies(defaults);
    if (tradeToEdit) {
      setEstrategia(tradeToEdit.estrategia || 'Price Action clássico');
    } else {
      setEstrategia('Price Action clássico');
    }
  }, [tradeToEdit]);

  const handleAddStrategy = () => {
    const name = window.prompt('Digite o nome da nova estratégia:');
    if (!name || !name.trim()) return;
    
    const trimmedName = name.trim();
    const newStrategy = { id: Date.now().toString(), name: trimmedName };
    
    setStrategies(prev => {
      const updated = [...prev, newStrategy].sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem('@kryp:strategies', JSON.stringify(updated));
      return updated;
    });
    setEstrategia(trimmedName);
  };

  // Dynamic fee calculation (useEffect)
  useEffect(() => {
    const amt = parseFloat(quantidadeTaxa.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) {
      setTaxaCorretoraUsd(0);
      return;
    }

    const baseUpper = (ativoBase || '').trim().toUpperCase();
    const selectedInst = institutions.find(i => i.nome === exchange);
    const selectedInstNativeCoin = selectedInst?.native_coin?.trim().toUpperCase();

    let multiplier = 1.0;

    if (moedaTaxa === 'USDT' || moedaTaxa === 'USDC' || moedaTaxa === 'USD') {
      multiplier = 1.0;
    } else if (baseUpper && moedaTaxa === baseUpper) {
      const entryPrice = parseFloat(precoCompra.replace(',', '.'));
      multiplier = isNaN(entryPrice) ? 1.0 : entryPrice;
    } else if (selectedInstNativeCoin && moedaTaxa === selectedInstNativeCoin) {
      multiplier = nativeCoinRates[selectedInstNativeCoin] || 1.0;
    } else {
      // Fallback in case it's one of the standard mockData coins
      switch (moedaTaxa) {
        case 'BTC':
          multiplier = 68420.50;
          break;
        case 'ETH':
          multiplier = 3500.00;
          break;
        case 'BNB':
          multiplier = 600.00;
          break;
        default:
          multiplier = 1.0;
      }
    }

    setTaxaCorretoraUsd(Number((amt * multiplier).toFixed(4)));
  }, [moedaTaxa, quantidadeTaxa, precoCompra, ativoBase, exchange, institutions, nativeCoinRates]);

  // Handle default exchange update or pre-fill if tradeToEdit is provided
  useEffect(() => {
    if (tradeToEdit) {
      setDataHora(tradeToEdit.data_hora ? tradeToEdit.data_hora.slice(0, 10) : getCurrentDate());
      setExchange(tradeToEdit.exchange);
      setMoeda(tradeToEdit.moeda);
      setAtivoBase(tradeToEdit.moeda);
      setAtivoCotacao('USDT'); // default standard
      setTipoOperacao(tradeToEdit.tipo_operacao || 'Long');
      setPrecoCompra(String(tradeToEdit.preco_compra));
      setQuantidade(String(tradeToEdit.quantidade));
      setValorInvestido(String(Number((tradeToEdit.preco_compra * tradeToEdit.quantidade).toFixed(8))));
      setStopLoss(tradeToEdit.stop_loss !== null && tradeToEdit.stop_loss !== undefined ? String(tradeToEdit.stop_loss) : '0');
      setAlvo1(tradeToEdit.alvo_1 !== null && tradeToEdit.alvo_1 !== undefined ? String(tradeToEdit.alvo_1) : '0');
      setAlvo2(tradeToEdit.alvo_2 !== null && tradeToEdit.alvo_2 !== undefined ? String(tradeToEdit.alvo_2) : '0');
      setAlvo3(tradeToEdit.alvo_3 !== null && tradeToEdit.alvo_3 !== undefined ? String(tradeToEdit.alvo_3) : '0');
      setAlvo4(tradeToEdit.alvo_4 !== null && tradeToEdit.alvo_4 !== undefined ? String(tradeToEdit.alvo_4) : '0');
      setAlvo5(tradeToEdit.alvo_5 !== null && tradeToEdit.alvo_5 !== undefined ? String(tradeToEdit.alvo_5) : '0');
      setEstrategia(tradeToEdit.estrategia || 'Price Action');
      const loadedNotas = tradeToEdit.notas || '';
      try {
        if (loadedNotas.trim().startsWith('{')) {
          const diary = JSON.parse(loadedNotas);
          setGatilhoEntrada(diary.gatilhoEntrada || '');
          setAnaliseContexto(diary.analiseContexto || '');
          setAcertouSetup(diary.acertouSetup || null);
          setSeguiuPlano(diary.seguiuPlano || null);
          setErroOperacional(diary.erroOperacional !== undefined ? diary.erroOperacional : null);
          setNotaTrade(diary.notaTrade || 0);
          setEmocaoTrade(diary.emocaoTrade || null);
          setDisciplinaTrade(diary.disciplinaTrade || null);
          setLicaoAprendida(diary.licaoAprendida || '');
          setNotas(loadedNotas);
        } else {
          setGatilhoEntrada('');
          setAnaliseContexto(loadedNotas);
          setAcertouSetup(null);
          setSeguiuPlano(null);
          setErroOperacional(null);
          setNotaTrade(0);
          setEmocaoTrade(null);
          setDisciplinaTrade(null);
          setLicaoAprendida('');
          setNotas(loadedNotas);
        }
      } catch (e) {
        setGatilhoEntrada('');
        setAnaliseContexto(loadedNotas);
        setAcertouSetup(null);
        setSeguiuPlano(null);
        setErroOperacional(null);
        setNotaTrade(0);
        setEmocaoTrade(null);
        setDisciplinaTrade(null);
        setLicaoAprendida('');
        setNotas(loadedNotas);
      }
      setMoedaTaxa(tradeToEdit.moeda_taxa || 'USDT');
      setQuantidadeTaxa(tradeToEdit.quantidade_taxa ? String(tradeToEdit.quantidade_taxa) : '');
    } else {
      if (institutions.length > 0 && !institutions.some(i => i.nome === exchange)) {
        setExchange(institutions[0].nome);
      }
    }
  }, [tradeToEdit, institutions]);

  const handleClearForm = () => {
    setDataHora(getCurrentDate());
    if (institutions.length > 0) {
      setExchange(institutions[0].nome);
    } else {
      setExchange('Binance');
    }
    setMoeda('');
    setAtivoBase('');
    setAtivoCotacao('USDT');
    setCotacaoAtual('');
    setTipoOperacao(null);
    setPrecoCompra('');
    setQuantidade('');
    setValorInvestido('');
    setIsLeveraged(false);
    setLeverageMultiplier('');
    setMoedaTaxa('USDT');
    setQuantidadeTaxa('');
    setTaxaCorretoraUsd(0);
    setStopLoss('0');
    setRiscoMaximo('');
    setAlvo1('0');
    setAlvo2('0');
    setAlvo3('0');
    setAlvo4('0');
    setAlvo5('0');
    if (strategies.length > 0) {
      setEstrategia(strategies[0].name);
    } else {
      setEstrategia('Price Action clássico');
    }
    setNotas('');
    setGatilhoEntrada('');
    setAnaliseContexto('');
    setAcertouSetup(null);
    setSeguiuPlano(null);
    setErroOperacional(null);
    setNotaTrade(0);
    setEmocaoTrade(null);
    setDisciplinaTrade(null);
    setLicaoAprendida('');
    setValidationError(null);
    setResultados({
      investidoQuote: 0,
      quote: 'USDT',
      investidoUSD: 0,
      totalAlavancadoUSD: 0,
      tipo: 'stable_usd',
      cotacaoCompraNaQuote: 0,
      cotacaoCompraUSD: 0,
      tipoQuote: 'stable_usd'
    });
  };

  const parsedQuantidadeTaxa = parseToFloat(quantidadeTaxa);
  const parsedQuantidade = parseToFloat(quantidade);

  // Decide how to calculate the fee in USD (valorTaxaUSD) - Correção A
  let valorTaxaUSD = 0;
  if (parsedQuantidadeTaxa > 0) {
    const baseUpper = (ativoBase || '').trim().toUpperCase();
    if (moedaTaxa === 'USDT' || moedaTaxa === 'USDC' || moedaTaxa === 'USD') {
      valorTaxaUSD = parsedQuantidadeTaxa;
    } else if (baseUpper && moedaTaxa === baseUpper) {
      valorTaxaUSD = resultados.investidoQuote > 0 && parsedQuantidade > 0
        ? (parsedQuantidadeTaxa / parsedQuantidade) * resultados.investidoUSD
        : parsedQuantidadeTaxa * parseToFloat(precoCompra);
    } else {
      valorTaxaUSD = taxaCorretoraUsd;
    }
  }

  const valorTaxaQuote = moedaTaxa === resultados.quote 
    ? parsedQuantidadeTaxa 
    : (resultados.investidoQuote > 0 ? (valorTaxaUSD / (resultados.investidoUSD / resultados.investidoQuote)) : 0);

  const resultadosLiquido = {
    investidoUSD: Math.max(0, resultados.investidoUSD - valorTaxaUSD),
    investidoQuote: resultados.tipoQuote === 'stable_usd'
      ? Math.max(0, resultados.investidoQuote - valorTaxaUSD)
      : Math.max(0, resultados.investidoQuote - valorTaxaQuote),
    quote: resultados.quote,
    tipoQuote: resultados.tipoQuote,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Guard validations
    if (!moeda.trim()) {
      setValidationError('Por favor, informe a moeda/ticker da operação (ex: BTC, ETH).');
      return;
    }

    const quote = (ativoCotacao || 'USDT').toUpperCase();
    const quotePriceInUsd = getQuotePriceInUSD();

    const parsePrice = (val: string): number | null => {
      if (!val) return null;
      const clean = val.replace(',', '.').trim();
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? null : parsed;
    };

    const pCompraRaw = parsePrice(precoCompra);
    if (pCompraRaw === null || pCompraRaw <= 0) {
      setValidationError('O Preço de Entrada deve ser um valor numérico maior que zero.');
      return;
    }

    // Convert values to standardized USD prior to submission
    const pCompra = pCompraRaw * quotePriceInUsd;
    const qty = parseFloat(quantidade.replace(',', '.')) || 0;
    if (isNaN(qty) || qty <= 0) {
      setValidationError('A quantidade da posição deve ser maior que zero.');
      return;
    }

    // Validar todos os campos de gestão de risco
    const camposRisco = [
      { key: 'stopLoss', value: stopLoss, label: 'Stop Loss' },
      { key: 'alvo1', value: alvo1, label: 'Alvo 1' },
      { key: 'alvo2', value: alvo2, label: 'Alvo 2' },
      { key: 'alvo3', value: alvo3, label: 'Alvo 3' },
      { key: 'alvo4', value: alvo4, label: 'Alvo 4' },
      { key: 'alvo5', value: alvo5, label: 'Alvo 5' },
    ];
    
    let hasRiskError = false;
    const newRiskErrors: Record<string, string> = {};
    
    for (const campo of camposRisco) {
      const result = validarGestaoRisco(
        campo.key,
        campo.value,
        tipoOperacao,
        precoCompra
      );
      if (!result.valido) {
        newRiskErrors[campo.key] = result.mensagem;
        hasRiskError = true;
      }
    }
    
    if (hasRiskError) {
      setErrors(newRiskErrors);
      alert('Corrija os campos de Gestão de Risco antes de registrar.');
      return;
    }

    const a1Raw = parsePrice(alvo1);
    const a1 = (a1Raw !== null && a1Raw !== 0) ? a1Raw * quotePriceInUsd : null;

    const slRaw = parsePrice(stopLoss);
    const sl = (slRaw !== null && slRaw !== 0) ? slRaw * quotePriceInUsd : null;

    if (sl !== null && sl !== 0) {
      if (tipoOperacao === 'Long' && sl >= pCompra) {
        setValidationError('No Long, o Stop Loss deve ser menor que o preço de entrada.');
        return;
      }
      if (tipoOperacao === 'Short' && sl <= pCompra) {
        setValidationError('No Short, o Stop Loss deve ser maior que o preço de entrada.');
        return;
      }
    }

    if (a1 !== null && a1 !== 0) {
      if (tipoOperacao === 'Long' && a1 <= pCompra) {
        setValidationError('No Long, o Alvo 1 deve ser maior que o preço de entrada.');
        return;
      }
      if (tipoOperacao === 'Short' && a1 >= pCompra) {
        setValidationError('No Short, o Alvo 1 deve ser menor que o preço de entrada.');
        return;
      }
    }

    const a2Raw = parsePrice(alvo2);
    const a3Raw = parsePrice(alvo3);
    const a4Raw = parsePrice(alvo4);
    const a5Raw = parsePrice(alvo5);

    const diaryData = {
      gatilhoEntrada,
      analiseContexto,
      acertouSetup,
      seguiuPlano,
      erroOperacional,
      notaTrade,
      emocaoTrade,
      disciplinaTrade,
      licaoAprendida,
      exchangeMeta: (quote !== 'USD' && quote !== 'USDT' ? `[Moeda Original: ${quote}, Taxa de Câmbio: ${quotePriceInUsd.toFixed(4)}]` : '')
    };

    // Submit valid data, fully standardized to USD
    onSubmitTrade({
      data_hora: dataHora,
      exchange,
      moeda: moeda.trim().toUpperCase(),
      preco_compra: pCompra,
      quantidade: qty,
      taxa_corretora_usd: valorTaxaUSD,
      stop_loss: sl,
      alvo_1: a1,
      alvo_2: (a2Raw !== null && a2Raw !== 0) ? a2Raw * quotePriceInUsd : null,
      alvo_3: (a3Raw !== null && a3Raw !== 0) ? a3Raw * quotePriceInUsd : null,
      alvo_4: (a4Raw !== null && a4Raw !== 0) ? a4Raw * quotePriceInUsd : null,
      alvo_5: (a5Raw !== null && a5Raw !== 0) ? a5Raw * quotePriceInUsd : null,
      alvo_6: null,
      tipo_operacao: tipoOperacao,
      estrategia,
      notas: JSON.stringify(diaryData),
      moeda_taxa: moedaTaxa,
      quantidade_taxa: parseFloat(quantidadeTaxa.replace(',', '.')) || 0,
    });
  };

  const direction = tipoOperacao === 'Long' ? 'LONG' : tipoOperacao === 'Short' ? 'SHORT' : 'DEFAULT';
  const isLong = direction === 'LONG';
  const isShort = direction === 'SHORT';

  const focusColor = direction === 'LONG' 
    ? 'focus:border-green-500' 
    : direction === 'SHORT' 
    ? 'focus:border-red-500' 
    : 'focus:border-zinc-500';

  const classeCard = `bg-[#0c0c0e]/85 border rounded-lg p-4 transition-colors duration-300 ${
    tema === 'LONG' ? 'border-green-500 card-long' :
    tema === 'SHORT' ? 'border-red-500 card-short' :
    'border-zinc-700 card-neutro'
  }`;

  const classeIcone = `w-3.5 h-3.5 transition-colors duration-300 ${
    tema === 'LONG' ? 'text-green-500 icone-card-long' :
    tema === 'SHORT' ? 'text-red-500 icone-card-short' :
    'text-zinc-400 icone-card-neutro'
  }`;

  const classeBotaoSalvar = `px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 shadow transition-colors duration-300 ${
    tipoOperacao === 'Long' || tipoOperacao === 'Short' ? 'cursor-pointer' : 'cursor-not-allowed text-zinc-400 bg-zinc-800'
  } ${
    tema === 'LONG' ? 'bg-green-500 hover:bg-green-400 text-white' :
    tema === 'SHORT' ? 'bg-red-500 hover:bg-red-400 text-white' :
    'bg-zinc-700 text-zinc-300'
  }`;

  return (
    <div id="new-trade-form-container" className="max-w-4xl mx-auto space-y-4 select-none">
      
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm transition-colors duration-300 ${
              tipoOperacao === 'Long'
                ? 'bg-green-500'
                : tipoOperacao === 'Short'
                ? 'bg-red-500'
                : (tradeToEdit ? 'bg-amber-500' : 'bg-zinc-500')
            }`}></span>
            <h2 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-wide">
              {tradeToEdit ? 'Editar Operação' : 'Nova Operação'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="new-trade-form"
              className={classeBotaoSalvar}
              id="btn-register-trade-form-submit"
              disabled={tipoOperacao !== 'Long' && tipoOperacao !== 'Short'}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {tradeToEdit ? 'SALVAR ALTERAÇÕES' : (tema === 'SHORT' ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR OPERAÇÃO')}
            </button>
            <button
              type="button"
              onClick={handleClearForm}
              className="px-3 py-1.5 border border-zinc-850 hover:border-zinc-800 bg-transparent text-zinc-450 hover:text-zinc-200 font-bold uppercase tracking-tight rounded cursor-pointer transition-colors text-[10px]"
            >
              Limpar Campos
            </button>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-zinc-850 hover:border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-white rounded text-[10px] font-mono transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
          VOLTAR
        </button>
      </div>

      {validationError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-400 font-mono">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        </div>
      )}

      {/* Main Grid Form */}
      <form id="new-trade-form" onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
        
        {/* BLOCO A: Dados Gerais */}
        <div className={classeCard}>
          <div className="flex items-center gap-2 mb-3 border-b border-zinc-900 pb-2">
            <Calendar className={classeIcone} />
            <h3 className="font-bold uppercase tracking-wider text-zinc-200 text-[11px]">Dados Gerais</h3>
          </div>
          
          <div className="flex flex-row w-full gap-4">
            <div className="w-48 shrink-0">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Direção
              </label>
              <div className="flex items-center gap-1.5 w-full h-[29px]">
                <button
                  type="button"
                  onClick={() => handleDirecao('Long')}
                  className={
                    tema === 'LONG' ? 'btn-long-ativo flex-1 h-full font-bold text-center text-[10px]' :
                    tema === 'NEUTRO' ? 'btn-long-neutro flex-1 h-full font-bold text-center text-[10px]' :
                    'btn-inativo flex-1 h-full font-bold text-center text-[10px]'
                  }
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => handleDirecao('Short')}
                  className={
                    tema === 'SHORT' ? 'btn-short-ativo flex-1 h-full font-bold text-center text-[10px]' :
                    tema === 'NEUTRO' ? 'btn-short-neutro flex-1 h-full font-bold text-center text-[10px]' :
                    'btn-inativo flex-1 h-full font-bold text-center text-[10px]'
                  }
                >
                  SHORT
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-5 gap-4">
              <div className="col-span-1">
                <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                  Data
                </label>
                <input
                  type="date"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  className="input-padrao focus:outline-none"
                  required
                />
              </div>

              <div className="col-span-1">
                <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                  Instituição
                </label>
                <select
                  value={exchange}
                  onChange={(e) => handleChangeExchange(e.target.value)}
                  className="select-padrao cursor-pointer focus:outline-none"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.nome}>
                      {inst.nome}
                    </option>
                  ))}
                  {institutions.length === 0 && (
                    <>
                      <option value="Binance">Binance</option>
                      <option value="Bybit">Bybit</option>
                      <option value="BitGet">BitGet</option>
                      <option value="Mexc">Mexc</option>
                      <option value="Kraken">Kraken</option>
                      <option value="OKX">OKX</option>
                      <option value="Crypto.com">Crypto.com</option>
                      <option value="Gate.io">Gate.io</option>
                      <option value="MetaMask">MetaMask</option>
                      <option value="Nubank">Nubank</option>
                    </>
                  )}
                </select>
              </div>

              <div className="col-span-1">
                <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                  Ativo
                </label>
                <input
                  type="text"
                  placeholder="—"
                  value={ativoBase}
                  onChange={(e) => handleChangeAtivoOuPar('ativo', e.target.value)}
                  className="input-padrao uppercase font-bold focus:outline-none placeholder:text-zinc-600"
                  required
                />
              </div>

              <div className="col-span-1">
                <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                  Par
                </label>
                <input
                  type="text"
                  placeholder="—"
                  value={ativoCotacao}
                  onChange={(e) => handleChangeAtivoOuPar('par', e.target.value)}
                  className="input-padrao uppercase font-bold focus:outline-none placeholder:text-zinc-600"
                  required
                />
              </div>

              <div className="col-span-1">
                <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold flex items-center justify-between">
                  <span>Cotação {ativoBase && ativoCotacao ? `- ${ativoBase.toUpperCase()}/${ativoCotacao.toUpperCase()}` : ''}</span>
                  {isFetchingPrice && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                  )}
                </label>
                <div className="relative flex items-center h-[29px]">
                  <input
                    type="text"
                    className="input-padrao-readonly"
                    value={cotacaoAtual && parseToFloat(cotacaoAtual) > 0
                      ? formatSmart(parseToFloat(cotacaoAtual))
                      : '—'}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BLOCO B: Execução e Lógica de Taxas */}
        <div className={classeCard}>
          <div className="flex items-center gap-2 mb-3 border-b border-zinc-900 pb-2">
            <Percent className={classeIcone} />
            <h3 className="font-bold uppercase tracking-wider text-zinc-200 text-[11px]">Execução</h3>
          </div>
          
          <div className="grid grid-cols-6 gap-3 w-full mb-4 items-start">
            {/* Cotação Compra */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Cotação Compra
              </label>
              <div className="relative flex items-center h-[29px]">
                <input
                  className="input-padrao h-full"
                  type="text"
                  inputMode="decimal"
                  value={precoCompra}
                  placeholder="—"
                  onChange={(e) => {
                    handlePrecoCompraChange(e.target.value);
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 mt-1">
                {resultados.tipoQuote !== 'stable_usd' && precoCompra !== '' && parseToFloat(precoCompra) > 0
                  ? `≈ ${formatSmartPreciso(precoCompra, resultados.tipoQuote)} ${resultados.quote}`
                  : ''}
              </span>
            </div>

            {/* Quantidade */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Quantidade
              </label>
              <div className="relative flex items-center h-[29px]">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={quantidade}
                  onChange={(e) => handleQuantidadeChange(e.target.value)}
                  className="input-padrao h-full"
                  required
                />
              </div>
              {quantidade && quantidade !== '0' && quantidade !== '0,00' && quantidade !== '0.00' && (
                <div className="text-[9px] text-zinc-500 mt-1 font-mono leading-tight">
                  <span className="font-semibold text-zinc-300" title={`Preciso: ${formatPreciso(quantidade)}`}>
                    {formatSmart(quantidade)}
                  </span>
                </div>
              )}
            </div>

            {/* Valor Investido */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Valor Investido
              </label>
              <div className="relative flex items-center h-[29px]">
                <input
                  type="text"
                  readOnly
                  value={resultados.investidoUSD > 0 ? `$ ${formatSmart(resultados.investidoUSD)}` : '—'}
                  className="input-padrao h-full cursor-not-allowed"
                />
              </div>
              <div className="flex flex-col mt-1">
                <span
                  className="text-[10px] font-mono text-zinc-500"
                  title={resultados.tipo !== 'stable_usd' ? `${formatPreciso(resultados.investidoQuote)} ${resultados.quote}` : ''}
                >
                  {resultados.tipo !== 'stable_usd' && resultados.investidoQuote > 0
                    ? `≈ ${formatSmart(resultados.investidoQuote)} ${resultados.quote}`
                    : ''}
                </span>
              </div>
            </div>

            {/* Moeda Taxa */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Moeda Taxa
              </label>
              <div className="relative flex items-center h-[29px]">
                <select
                  value={moedaTaxa}
                  onChange={(e) => setMoedaTaxa(e.target.value)}
                  className="select-padrao h-full cursor-pointer"
                >
                  {getMoedaTaxaOptions().map((opt) => (
                     <option key={opt.value} value={opt.value}>
                       {opt.label}
                     </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Valor Taxa */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Valor Taxa
              </label>
              <div className="relative flex items-center h-[29px]">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={quantidadeTaxa}
                  onChange={(e) => setQuantidadeTaxa(formatNumberInput(e.target.value))}
                  className="input-padrao h-full"
                />
              </div>
            </div>

            {/* Taxa USD */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Taxa USD
              </label>
              <div className="relative flex items-center h-[29px]">
                <input
                  type="text"
                  value={valorTaxaUSD > 0 ? `$ ${formatSmart(valorTaxaUSD)}` : '—'}
                  className="input-padrao h-full cursor-not-allowed select-none font-bold"
                  readOnly
                  disabled
                />
              </div>
            </div>
          </div>

          <div className={`grid gap-3 w-full items-start ${isLeveraged ? 'grid-cols-6' : 'grid-cols-4'}`}>
            {/* Alavancado */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                Alavancado
              </label>
              <div className="flex items-center gap-1 h-[29px] w-full">
                <button
                  type="button"
                  onClick={() => setIsLeveraged(true)}
                  className={`px-2 h-full text-[11px] font-semibold rounded border transition-colors duration-200 flex-1 ${
                    isLeveraged
                      ? tema === 'LONG'
                        ? 'bg-green-500 text-white border-green-500 hover:bg-green-400'
                        : tema === 'SHORT'
                        ? 'bg-red-500 text-white border-red-500 hover:bg-red-400'
                        : 'bg-zinc-500 text-white border-zinc-500 hover:bg-zinc-400'
                      : 'bg-[#050507] text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  SIM
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLeveraged(false); setLeverageMultiplier(''); }}
                  className={`px-2 h-full text-[11px] font-semibold rounded border transition-colors duration-200 flex-1 ${
                    !isLeveraged
                      ? tema === 'LONG'
                        ? 'bg-green-500 text-white border-green-500 hover:bg-green-400'
                        : tema === 'SHORT'
                        ? 'bg-red-500 text-white border-red-500 hover:bg-red-400'
                        : 'bg-zinc-500 text-white border-zinc-500 hover:bg-zinc-400'
                      : 'bg-[#050507] text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  NÃO
                </button>
              </div>
            </div>

            {isLeveraged && (
              <>
                {/* Multiplicador */}
                <div className="flex flex-col">
                  <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                    Multiplicador
                  </label>
                  <div className="relative flex items-center h-[29px]">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="—"
                      disabled={!isLeveraged}
                      value={isLeveraged ? leverageMultiplier : ''}
                      onChange={(e) => setLeverageMultiplier(formatNumberInput(e.target.value))}
                      className="input-padrao h-full"
                    />
                  </div>
                </div>

                {/* Total Alavancado */}
                <div className="flex flex-col">
                  <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                    Total Alavancado
                  </label>
                  <div className="relative flex items-center h-[29px]">
                    <input
                      type="text"
                      readOnly
                      disabled={!isLeveraged}
                      value={isLeveraged && resultados.totalAlavancadoUSD > 0 ? `$ ${formatSmart(resultados.totalAlavancadoUSD)} USD` : '—'}
                      className="input-padrao h-full cursor-not-allowed select-none text-orange-400 font-bold"
                    />
                  </div>
                </div>
              </>
            )}

            {/* VOLUME ESTIMADO */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                VOLUME ESTIMADO
              </label>
              <div className="relative flex items-center h-[29px]">
                <input
                  type="text"
                  readOnly
                  value={resultados.investidoUSD > 0 ? `$ ${formatSmart(resultados.investidoUSD)}` : '—'}
                  className="input-padrao h-full cursor-not-allowed font-bold"
                />
              </div>
              <span
                className="text-[10px] font-mono text-zinc-500 mt-1"
                title={resultados.tipoQuote !== 'stable_usd' ? formatPreciso(resultados.investidoQuote) + ' ' + resultados.quote : ''}
              >
                {resultados.tipoQuote !== 'stable_usd' && resultados.investidoQuote > 0
                  ? `≈ ${formatSmart(resultados.investidoQuote)} ${resultados.quote}`
                  : ''}
              </span>
            </div>

            {/* VOLUME LÍQUIDO */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[9px] uppercase tracking-wider mb-1 font-bold">
                VOLUME LÍQUIDO
              </label>
              <div className="relative flex items-center h-[29px]">
                <input
                  type="text"
                  readOnly
                  value={resultadosLiquido.investidoUSD > 0 ? `$ ${formatSmart(resultadosLiquido.investidoUSD)}` : '—'}
                  className="input-padrao h-full cursor-not-allowed font-bold"
                />
              </div>
              <span
                className="text-[10px] font-mono text-zinc-500 mt-1"
                title={resultadosLiquido.tipoQuote !== 'stable_usd' ? `${formatPreciso(resultadosLiquido.investidoQuote)} ${resultadosLiquido.quote}` : ''}
              >
                {resultadosLiquido.tipoQuote !== 'stable_usd' && resultadosLiquido.investidoQuote > 0
                  ? `≈ ${formatSmart(resultadosLiquido.investidoQuote)} ${resultadosLiquido.quote}`
                  : ''}
              </span>
            </div>

            {/* Coluna extra vazia de preenchimento para manter a Linha 2 simétrica con 6 colunas */}
            {isLeveraged && <div className="flex flex-col" />}
          </div>
        </div>

        {/* BLOCO C: Gestão de Risco */}
        <div className={classeCard}>
          <div className="flex items-center gap-2 mb-3 border-b border-zinc-900 pb-2">
            <ShieldAlert className={classeIcone} />
            <h3 className="font-bold uppercase tracking-wider text-zinc-200 text-[11px]">Gestão de Risco</h3>
          </div>

          {/* Grid de três colunas (B.2) */}
          <div className="grid grid-cols-3 gap-6 pb-2">

            {/* Coluna Esquerda (2/3) — STOP LOSS + ALVOS */}
            <div className="col-span-2 flex flex-col gap-3">
              
              {/* STOP LOSS - linha única ocupando toda a largura */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                  STOP LOSS
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={stopLoss || ''}
                  onChange={(e) => {
                    const formatted = formatNumberInput(e.target.value);
                    setStopLoss(formatted);
                  }}
                  className={`input-padrao ${errors.stopLoss ? 'input-erro' : ''}`}
                />
                {errors.stopLoss && (
                  <span className="text-[9px] text-red-500 font-mono mt-1 leading-tight">
                    {errors.stopLoss}
                  </span>
                )}
              </div>

              {/* ALVOS - duas linhas */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  ALVOS
                </label>
                {/* Primeira linha: ALVO 1, 2, 3 */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Alvo 1', value: alvo1, setter: setAlvo1, errorKey: 'alvo1' },
                    { label: 'Alvo 2', value: alvo2, setter: setAlvo2, errorKey: 'alvo2' },
                    { label: 'Alvo 3', value: alvo3, setter: setAlvo3, errorKey: 'alvo3' },
                  ].map((item, index) => {
                    const hasError = !!errors[item.errorKey as keyof typeof errors];
                    const errorMessage = errors[item.errorKey as keyof typeof errors];
                    return (
                      <div key={index} className="flex flex-col relative group">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={item.label}
                          value={item.value || ''}
                          onChange={(e) => {
                            const formatted = formatNumberInput(e.target.value);
                            item.setter(formatted);
                          }}
                          className={`input-padrao h-8 text-xs ${hasError ? 'input-erro' : ''}`}
                          title={`${item.label}${hasError ? ': ' + errorMessage : ''}`}
                        />
                        {hasError && (
                          <span className="text-[8px] text-red-500 font-mono mt-0.5 leading-tight truncate" title={errorMessage}>
                            {errorMessage}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Segunda linha: ALVO 4, 5 */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Alvo 4', value: alvo4, setter: setAlvo4, errorKey: 'alvo4' },
                    { label: 'Alvo 5', value: alvo5, setter: setAlvo5, errorKey: 'alvo5' },
                  ].map((item, index) => {
                    const hasError = !!errors[item.errorKey as keyof typeof errors];
                    const errorMessage = errors[item.errorKey as keyof typeof errors];
                    return (
                      <div key={index} className="flex flex-col relative group">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={item.label}
                          value={item.value || ''}
                          onChange={(e) => {
                            const formatted = formatNumberInput(e.target.value);
                            item.setter(formatted);
                          }}
                          className={`input-padrao h-8 text-xs ${hasError ? 'input-erro' : ''}`}
                          title={`${item.label}${hasError ? ': ' + errorMessage : ''}`}
                        />
                        {hasError && (
                          <span className="text-[8px] text-red-500 font-mono mt-0.5 leading-tight truncate" title={errorMessage}>
                            {errorMessage}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── Coluna Direita (1/3) — Botões Cálculo + Diário (Mudança 3) ─── */}
            <div className="col-span-1 flex flex-col gap-2 justify-end pb-1">
              
              {/* Botão Cálculo de Risco */}
              <button
                type="button"
                onClick={() => setShowModalRisco(true)}
                className="h-10 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🧮</span>
                <span>Cálculo de Risco</span>
              </button>

              {/* Botão Diário do Trade */}
              <button
                type="button"
                onClick={() => setShowModalDiario(true)}
                className="h-10 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📓</span>
                <span>Diário do Trade</span>
              </button>

            </div>
          </div>
        </div>

        {/* Modal/Popup da Calculadora (B.4 & C.3) */}
        {showModalRisco && (
          <div className="modal-overlay">
            <div className="modal-content">

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                  <span>🧮</span> Calculadora de Posição & Risco
                </span>
                <button
                  type="button"
                  onClick={() => setShowModalRisco(false)}
                  className="text-zinc-500 hover:text-white text-lg font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Corpo */}
              <div className="flex flex-col gap-4">

                {/* Risco Máximo */}
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                    Risco Máx (USD)
                  </label>
                  <input
                    type="text"
                    placeholder="$ 0,00"
                    value={riscoMaximo}
                    onChange={(e) => setRiscoMaximo(formatNumberInput(e.target.value))}
                    className="input-padrao"
                    autoFocus
                  />
                </div>

                {/* Parâmetros atuais (só leitura) */}
                <div className="grid grid-cols-2 gap-3 bg-zinc-950/65 border border-zinc-900 rounded-lg p-3 font-mono">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Entrada</span>
                    <p className="text-white text-xs font-semibold mt-0.5">
                      $ {precoCompra || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Stop Loss</span>
                    <p className="text-red-400 text-xs font-semibold mt-0.5">
                      $ {stopLoss || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Diferença</span>
                    <p className="text-zinc-300 text-xs font-semibold mt-0.5">
                      {precoCompra && stopLoss
                        ? `$ ${Math.abs(parseToFloat(precoCompra) - parseToFloat(stopLoss)).toFixed(
                            (precoCompra.includes(',') ? precoCompra.split(',')[1]?.length : precoCompra.split('.')[1]?.length) || 4
                          )}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Direção</span>
                    <p className={`text-xs font-semibold mt-0.5 ${(tipoOperacao || '').toUpperCase() === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                      {tipoOperacao || '—'}
                    </p>
                  </div>
                </div>

                {/* Seletor de RR (C.3) */}
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                    Relação Risco:Recompensa
                  </label>
                  <div className="flex gap-1">
                    {[
                      { label: '1:1', valor: 1 },
                      { label: '1:2', valor: 2 },
                      { label: '1:3', valor: 3 },
                      { label: '1:5', valor: 5 },
                    ].map((rr) => (
                      <button
                        key={rr.label}
                        type="button"
                        className={`flex-1 h-8 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          rrSelecionado === rr.valor
                            ? 'bg-violet-600 text-white border border-violet-500'
                            : 'bg-zinc-850 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-100'
                        }`}
                        onClick={() => {
                          setRrSelecionado(rr.valor);
                          const { stopSugerido, alvosSugeridos } = calcularStopEAlvosPorRR(
                            rr.valor,
                            parseToFloat(precoCompra),
                            tipoOperacao
                          );
                          if (stopSugerido) {
                            const pStr = precoCompra || '0';
                            const splitChar = pStr.includes(',') ? ',' : '.';
                            const decimalPlaces = pStr.includes(splitChar)
                              ? pStr.split(splitChar)[1]?.length || 4
                              : 4;

                            setStopLoss(stopSugerido.toFixed(decimalPlaces).replace('.', splitChar));
                            setAlvo1(alvosSugeridos[0]?.toFixed(decimalPlaces).replace('.', splitChar) || '0');
                            setAlvo2(alvosSugeridos[1]?.toFixed(decimalPlaces).replace('.', splitChar) || '0');
                            setAlvo3(alvosSugeridos[2]?.toFixed(decimalPlaces).replace('.', splitChar) || '0');
                            setAlvo4(alvosSugeridos[3]?.toFixed(decimalPlaces).replace('.', splitChar) || '0');
                            setAlvo5(alvosSugeridos[4]?.toFixed(decimalPlaces).replace('.', splitChar) || '0');
                          }
                        }}
                      >
                        {rr.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resultados */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                      Sugestão
                    </label>
                    <div className="h-10 flex items-center px-3 bg-zinc-850 border border-zinc-700 rounded-lg">
                      {quantidadeSugerida ? (
                        <span className="text-green-400 font-mono text-xs font-semibold truncate" title={`${quantidadeSugerida} ${ativoBase}`}>
                          {quantidadeSugerida.toFixed(quantidadeSugerida < 1 ? 4 : 2)} {ativoBase.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-mono text-sm">—</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                      Valor Pos.
                    </label>
                    <div className="h-10 flex items-center px-3 bg-zinc-850 border border-zinc-700 rounded-lg">
                      {valorSugerido ? (
                        <span className="text-green-400 font-mono text-xs font-semibold truncate">
                          $ {valorSugerido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-mono text-sm">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex gap-2 mt-2">
                  {quantidadeSugerida ? (
                    <button
                      type="button"
                      className="flex-1 h-10 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        const valueToSet = quantidadeSugerida.toFixed(quantidadeSugerida < 1 ? 6 : 2);
                        handleQuantidadeChange(valueToSet);
                        setShowModalRisco(false);
                      }}
                    >
                      APLICAR QUANTIDADE
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="flex-1 h-10 bg-zinc-700 hover:bg-zinc-650 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    onClick={() => setShowModalRisco(false)}
                  >
                    CANCELAR
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* BLOCO D: Diário do Trade (Compacto Card e Modal) */}
        <div className={`rounded-lg border p-4 ${
          tema === 'LONG' ? 'border-green-500' :
          tema === 'SHORT' ? 'border-red-500' :
          'border-zinc-700'
        } bg-zinc-950/20`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${classeIcone}`} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-200 font-bold">
                DIÁRIO DO TRADE
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowModalDiario(true)}
              className="h-9 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-650 text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>📓</span>
              <span>Registrar Análise</span>
            </button>
          </div>

          {/* Mini preview - mostra se tem dados preenchidos */}
          <div className="mt-3 flex flex-wrap gap-2">
            {gatilhoEntrada && (
              <span className="text-[10px] text-zinc-400 bg-[#050507] px-2 py-1 rounded border border-zinc-850 font-mono">
                🎯 {gatilhoEntrada}
              </span>
            )}
            {notaTrade > 0 && (
              <span className="text-[10px] text-amber-400 bg-[#050507] px-2 py-1 rounded border border-zinc-850">
                {'★'.repeat(notaTrade)}{'☆'.repeat(5 - notaTrade)}
              </span>
            )}
            {emocaoTrade && (
              <span className="text-[10px] text-zinc-400 bg-[#050507] px-2 py-1 rounded border border-zinc-850">
                {emocaoEmoji(emocaoTrade)}
              </span>
            )}
            {!gatilhoEntrada && notaTrade === 0 && !emocaoTrade && (
              <span className="text-[10px] text-zinc-600 italic">
                Nenhuma análise registrada ainda
              </span>
            )}
          </div>
        </div>

        {/* Modal do Diário do Trade */}
        {showModalDiario && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                <span className="text-xs uppercase tracking-wider text-zinc-200 font-bold flex items-center gap-1.5">
                  <span>📓</span> Diário do Trade
                </span>
                <button
                  type="button"
                  onClick={() => setShowModalDiario(false)}
                  className="text-zinc-500 hover:text-white text-lg font-bold cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-4">

                {/* ESTRATÉGIA */}
                <div className="flex items-end gap-2">
                  <div className="flex flex-col flex-1">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                      ESTRATÉGIA
                    </label>
                    <select
                      value={estrategia}
                      onChange={(e) => setEstrategia(e.target.value)}
                      className={`w-full h-10 bg-[#050507] border border-zinc-850 rounded px-3 cursor-pointer text-xs font-mono focus:outline-none text-zinc-200 transition-colors ${focusColor}`}
                    >
                      {strategies.map((strat) => (
                        <option key={strat.id} value={strat.name}>
                          {strat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStrategy}
                    className={`h-10 px-4 flex items-center justify-center rounded-lg font-bold text-sm cursor-pointer transition-colors border ${
                      tema === 'LONG'
                        ? 'bg-green-500 text-white border-green-500 hover:bg-green-400'
                        : tema === 'SHORT'
                        ? 'bg-red-500 text-white border-red-500 hover:bg-red-400'
                        : 'bg-zinc-700 text-zinc-350 border-zinc-650 hover:bg-zinc-650'
                    }`}
                    title="Nova Estratégia"
                  >
                    +
                  </button>
                </div>

                {/* Grid 2 colunas: Análise Pré-Trade + Pós-Trade */}
                <div className="grid grid-cols-2 gap-4">

                  {/* ─── Análise Pré-Trade ─── */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                      Análise Pré-Trade
                    </span>
                    <div className="flex flex-col gap-2">
                      <select
                        className={`h-10 bg-[#050507] border border-zinc-850 rounded px-3 cursor-pointer text-xs font-mono focus:outline-none text-zinc-200 transition-colors ${focusColor}`}
                        value={gatilhoEntrada}
                        onChange={(e) => setGatilhoEntrada(e.target.value)}
                      >
                        <option value="">Gatilho de Entrada...</option>
                        <option value="FVG">FVG — Fair Value Gap</option>
                        <option value="OB">Order Block</option>
                        <option value="BOS">BOS — Break of Structure</option>
                        <option value="CHOCH">CHoCH — Change of Character</option>
                        <option value="LIQUIDEZ">Liquidity Grab</option>
                        <option value="RETESTE">Reteste S/R</option>
                        <option value="DIVERGENCIA">Divergência RSI/MACD</option>
                        <option value="PADRAO_CANDLE">Padrão de Candle</option>
                        <option value="NOTICIA">Notícia / Evento</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                      <textarea
                        rows={4}
                        placeholder="Contexto do mercado no momento da entrada..."
                        value={analiseContexto}
                        onChange={(e) => setAnaliseContexto(e.target.value)}
                        className={`w-full bg-[#050507] border border-zinc-850 rounded p-3 resize-none text-xs font-mono placeholder:text-zinc-600 focus:outline-none text-white transition-colors ${focusColor}`}
                      />
                    </div>
                  </div>

                  {/* ─── Análise Pós-Trade ─── */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                      Análise Pós-Trade
                    </span>
                    <div className="flex flex-col gap-2 bg-zinc-800/60 rounded-lg p-3 border border-zinc-800 space-y-1">
                      
                      {/* Acertou o setup */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-300">✅ Acertou o setup?</span>
                        <div className="toggle-tres-estados">
                          <button
                            type="button"
                            className={acertouSetup === 'SIM' ? 'ativo-sim' : ''}
                            onClick={() => setAcertouSetup(acertouSetup === 'SIM' ? null : 'SIM')}
                          >
                            SIM
                          </button>
                          <button
                            type="button"
                            className={acertouSetup === 'NÃO' ? 'ativo-nao' : ''}
                            onClick={() => setAcertouSetup(acertouSetup === 'NÃO' ? null : 'NÃO')}
                          >
                            NÃO
                          </button>
                          <button
                            type="button"
                            className={acertouSetup === 'PARCIAL' ? 'ativo-parcial' : ''}
                            onClick={() => setAcertouSetup(acertouSetup === 'PARCIAL' ? null : 'PARCIAL')}
                          >
                            PARC
                          </button>
                        </div>
                      </div>

                      {/* Seguiu o plano */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-300">✅ Seguiu o plano?</span>
                        <div className="toggle-tres-estados">
                          <button
                            type="button"
                            className={seguiuPlano === 'SIM' ? 'ativo-sim' : ''}
                            onClick={() => setSeguiuPlano(seguiuPlano === 'SIM' ? null : 'SIM')}
                          >
                            SIM
                          </button>
                          <button
                            type="button"
                            className={seguiuPlano === 'NÃO' ? 'ativo-nao' : ''}
                            onClick={() => setSeguiuPlano(seguiuPlano === 'NÃO' ? null : 'NÃO')}
                          >
                            NÃO
                          </button>
                          <button
                            type="button"
                            className={seguiuPlano === 'PARCIAL' ? 'ativo-parcial' : ''}
                            onClick={() => setSeguiuPlano(seguiuPlano === 'PARCIAL' ? null : 'PARCIAL')}
                          >
                            PARC
                          </button>
                        </div>
                      </div>

                      {/* Erro operacional */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-300">❌ Erro operacional?</span>
                        <div className="toggle-tres-estados">
                          <button
                            type="button"
                            className={erroOperacional === true ? 'ativo-nao' : ''}
                            onClick={() => setErroOperacional(erroOperacional === true ? null : true)}
                          >
                            SIM
                          </button>
                          <button
                            type="button"
                            className={erroOperacional === false ? 'ativo-sim' : ''}
                            onClick={() => setErroOperacional(erroOperacional === false ? null : false)}
                          >
                            NÃO
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* ─── Avaliação do Trade ─── */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                    Avaliação do Trade
                  </span>
                  <div className="grid grid-cols-3 gap-3 bg-zinc-800/60 rounded-lg p-3 border border-zinc-800">
                    
                    {/* Estrelas */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1 block">
                        Nota
                      </label>
                      <div className="estrelas-container">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={`estrela ${n <= notaTrade ? 'ativa' : ''}`}
                            onClick={() => setNotaTrade(n === notaTrade ? 0 : n)}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Emoção */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1 block">
                        Sentimento
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { emoji: '😌', code: 'CALMO' as const, label: 'Calmo' },
                          { emoji: '😤', code: 'ANSIOSO' as const, label: 'Ansioso' },
                          { emoji: '😰', code: 'MEDO' as const, label: 'Medo' },
                          { emoji: '🤑', code: 'GANANCIA' as const, label: 'Ganância' },
                          { emoji: '🤔', code: 'DUVIDA' as const, label: 'Dúvida' },
                          { emoji: '😐', code: 'NEUTRO' as const, label: 'Neutro' },
                        ].map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            className={`btn-emocao flex-1 text-center py-1 font-mono hover:bg-zinc-850/40 cursor-pointer ${
                              emocaoTrade === item.code ? 'ativo' : ''
                            }`}
                            onClick={() => setEmocaoTrade(emocaoTrade === item.code ? null : item.code)}
                            title={item.label}
                          >
                            {item.emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Disciplina */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1 block">
                        Disciplina
                      </label>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className={`btn-disciplina w-full py-1 text-xs font-semibold cursor-pointer ${
                            disciplinaTrade === 'SEGUIU' ? 'ativo-seguiu bg-green-500/10 text-green-500' : 'text-zinc-500'
                          }`}
                          onClick={() => setDisciplinaTrade(disciplinaTrade === 'SEGUIU' ? null : 'SEGUIU')}
                        >
                          ✅ SEGUIU
                        </button>
                        <button
                          type="button"
                          className={`btn-disciplina w-full py-1 text-xs font-semibold cursor-pointer ${
                            disciplinaTrade === 'DESVIOU' ? 'ativo-desviou bg-amber-500/10 text-amber-500' : 'text-zinc-500'
                          }`}
                          onClick={() => setDisciplinaTrade(disciplinaTrade === 'DESVIOU' ? null : 'DESVIOU')}
                        >
                          ⚠️ DESVIOU
                        </button>
                        <button
                          type="button"
                          className={`btn-disciplina w-full py-1 text-xs font-semibold cursor-pointer ${
                            disciplinaTrade === 'IGNOROU' ? 'ativo-ignorou bg-red-500/10 text-red-500' : 'text-zinc-500'
                          }`}
                          onClick={() => setDisciplinaTrade(disciplinaTrade === 'IGNOROU' ? null : 'IGNOROU')}
                        >
                          ❌ IGNOROU
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ─── Lição Aprendida ─── */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                    Lição Aprendida
                  </span>
                  <textarea
                    rows={3}
                    className={`w-full bg-[#050507] border border-zinc-850 rounded p-3 resize-none text-xs font-mono placeholder:text-zinc-650 focus:outline-none text-white transition-colors ${focusColor}`}
                    placeholder="O que você aprenderia se pudesse refazer este trade?"
                    value={licaoAprendida}
                    onChange={(e) => setLicaoAprendida(e.target.value)}
                  />
                </div>

                {/* Botões do modal */}
                <div className="flex gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    className="flex-1 h-10 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    onClick={() => setShowModalDiario(false)}
                  >
                    SALVAR ANÁLISE
                  </button>
                  <button
                    type="button"
                    className="flex-1 h-10 bg-zinc-700 hover:bg-zinc-650 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    onClick={() => setShowModalDiario(false)}
                  >
                    CANCELAR
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}



      </form>
    </div>
  );
}
