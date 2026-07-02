import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Database,
  Loader2,
  Trash2
} from 'lucide-react';
import { importTradesCSV } from '../actions/trades';
import { Trade, TradeStatus } from '../types';

interface CSVImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number, newTrades: any[]) => void;
}

export default function CSVImporter({ isOpen, onClose, onImportSuccess }: CSVImporterProps) {
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTrades, setPreviewTrades] = useState<any[]>([]);
  const [originalRowsCount, setOriginalRowsCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Custom function to download the template
  const handleDownloadTemplate = () => {
    const headers = 'data_hora,exchange,moeda,preco_compra,quantidade,taxa_corretora_usd,stop_loss,alvo_1,alvo_2,alvo_3,alvo_4,alvo_5,alvo_6,status,pnl_realizado,tipo_operacao,estrategia,notas,moeda_taxa,quantidade_taxa';
    const exampleValue = '2026-06-14T12:00:00Z,Binance,BTC,67500.00,0.5,15.50,64000.00,69000.00,71000.00,,,,Aberto,0,Long,Price Action,Entrada em suporte,USDT,15.5';
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + exampleValue;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kryp_terminal_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe split values for csv parsing
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let inQuotes = false;
    let currentField = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    result.push(currentField.trim());
    return result;
  };

  // Parsing & mapping function supporting both Custom and Binance layouts
  const parseAndMapCSV = (text: string) => {
    try {
      const rawLines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (rawLines.length <= 1) {
        throw new Error('O arquivo CSV está vazio ou contém apenas os cabeçalhos.');
      }

      const headers = parseCSVLine(rawLines[0]).map(h => h.toLowerCase().replace(/["']/g, '').trim());
      const parsedList: any[] = [];

      // Check if it's Binance formatted CSV or our standard format
      const isBinance = headers.includes('market') && headers.includes('fee') && (headers.includes('type') || headers.includes('direction'));

      for (let i = 1; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line).map(v => v.replace(/["']/g, '').trim());
        if (values.length < 3) continue;

        // safe extract index helpers
        const getVal = (colNames: string[]) => {
          for (const name of colNames) {
            const idx = headers.indexOf(name.toLowerCase());
            if (idx !== -1 && idx < values.length) {
              return values[idx];
            }
          }
          return null;
        };

        let dataHora = getVal(['data_hora', 'date(utc)', 'date', 'time', 'timestamp']) || new Date().toISOString();
        let exchange = getVal(['exchange', 'source', 'broker']) || 'Binance';
        let rawMarket = getVal(['moeda', 'market', 'pair', 'asset', 'symbol']) || 'BTC';
        
        // Clean Binance pair ticker (e.g. BTCUSDT -> BTC)
        let moeda = rawMarket.toUpperCase();
        if (isBinance && moeda.endsWith('USDT')) {
          moeda = moeda.substring(0, moeda.length - 4);
        } else if (isBinance && moeda.endsWith('BUSD')) {
          moeda = moeda.substring(0, moeda.length - 4);
        }

        const precoCompra = parseFloat(getVal(['preco_compra', 'price', 'entry_price', 'preco']) || '0');
        const quantidade = parseFloat(getVal(['quantidade', 'amount', 'executed', 'qty', 'volume']) || '0');
        const taxaCorretoraUsd = parseFloat(getVal(['taxa_corretora_usd', 'fee', 'taxa', 'commission']) || '0');
        
        const stopLossVal = getVal(['stop_loss', 'stop', 'sl']);
        const stopLoss = stopLossVal ? parseFloat(stopLossVal) : null;

        const parseAlvo = (alvoHeaders: string[]) => {
          const val = getVal(alvoHeaders);
          return val ? parseFloat(val) : null;
        };

        const statusRaw = getVal(['status', 'state']) || 'Aberto';
        let status: TradeStatus = 'Aberto';
        if (statusRaw.toLowerCase().includes('gain') || statusRaw.toLowerCase() === 'fechado_gain') {
          status = 'Fechado_Gain';
        } else if (statusRaw.toLowerCase().includes('loss') || statusRaw.toLowerCase() === 'fechado_loss') {
          status = 'Fechado_Loss';
        }

        const pnlRaw = getVal(['pnl_realizado', 'pnl', 'realised_pnl', 'profit']);
        const pnlRealizado = pnlRaw ? parseFloat(pnlRaw) : 0;

        let tipoOperacao: 'Long' | 'Short' = 'Long';
        const typeRaw = getVal(['tipo_operacao', 'type', 'side', 'direction']);
        if (typeRaw) {
          const lowerType = typeRaw.toLowerCase();
          if (lowerType.includes('sell') || lowerType.includes('short') || lowerType.includes('venda')) {
            tipoOperacao = 'Short';
          }
        }

        const estrategia = getVal(['estrategia', 'strategy', 'setup']) || 'Price Action';
        const notas = getVal(['notas', 'notes', 'comment']) || '';
        const moedaTaxa = getVal(['moeda_taxa', 'fee_coin', 'feecoin']) || 'USDT';
        const quantidadeTaxa = parseFloat(getVal(['quantidade_taxa', 'fee', 'fee_amount']) || '0');

        parsedList.push({
          data_hora: dataHora,
          exchange,
          moeda,
          preco_compra: isNaN(precoCompra) ? 0 : precoCompra,
          quantidade: isNaN(quantidade) ? 0 : quantidade,
          taxa_corretora_usd: isNaN(taxaCorretoraUsd) ? 0 : taxaCorretoraUsd,
          stop_loss: isNaN(Number(stopLoss)) ? null : stopLoss,
          alvo_1: parseAlvo(['alvo_1', 'target_1', 'tp1']),
          alvo_2: parseAlvo(['alvo_2', 'target_2', 'tp2']),
          alvo_3: parseAlvo(['alvo_3', 'target_3', 'tp3']),
          alvo_4: parseAlvo(['alvo_4', 'target_4', 'tp4']),
          alvo_5: parseAlvo(['alvo_5', 'target_5', 'tp5']),
          alvo_6: parseAlvo(['alvo_6', 'target_6', 'tp6']),
          status,
          pnl_realizado: isNaN(pnlRealizado) ? 0 : pnlRealizado,
          tipo_operacao: tipoOperacao,
          estrategia,
          notas,
          moeda_taxa: moedaTaxa,
          quantidade_taxa: isNaN(quantidadeTaxa) ? 0 : quantidadeTaxa
        });
      }

      setOriginalRowsCount(rawLines.length - 1);
      setPreviewTrades(parsedList);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar as colunas do CSV.');
    }
  };

  // Handle uploaded file triggering
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  const processCSVFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Formato inválido. Selecione apenas arquivos de planilha .CSV.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseAndMapCSV(text);
      }
    };
    reader.onerror = () => {
      setError('Falha ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  // Drag states helper handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  };

  // Clear current upload preview
  const handleClearPreview = () => {
    setPreviewTrades([]);
    setOriginalRowsCount(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Call Server Action to import items in bulk
  const handleConfirmImport = async () => {
    if (previewTrades.length === 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await importTradesCSV(previewTrades);

      if (res.error) {
        setError(res.error);
      } else {
        onImportSuccess(res.count, previewTrades);
        handleClearPreview();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão ao salvar operações no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      
      {/* Modal Container */}
      <div 
        className="w-full max-w-2xl bg-[#0c0c0e] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-mono text-zinc-300"
        id="csv-importer-modal"
      >
        
        {/* Header bar */}
        <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-850">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-green-500" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-100">
              Importação Massiva de Trades
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main body/container */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          
          {error && (
            <div className="bg-red-950/20 border border-red-900/35 p-3 rounded flex gap-2.5 text-red-400 text-[11px] leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <div>
                <strong className="block mb-0.5">Falha no Processamento:</strong>
                {error}
              </div>
            </div>
          )}

          {previewTrades.length === 0 ? (
            /* Drag anddrop zone */
            <div className="space-y-4">
              <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider">
                Utilize este utilitário para importar seu histórico do robô ou da corretora. O terminal aceita o cabeçalhos da Binance ou de nosso template customizado.
              </p>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragActive 
                    ? 'border-green-500 bg-green-500/5' 
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/25 hover:bg-zinc-950/45'
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400">
                  <Upload className="w-5 h-5 text-green-500" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-zinc-200">
                    Arraste seu arquivo .CSV aqui ou clique para buscar
                  </p>
                  <p className="text-[9px] text-zinc-550">
                    Limite recomendado de até 1.000 linhas por lote de inserção.
                  </p>
                </div>
              </div>

              {/* Utility template info panel */}
              <div className="bg-[#0f0f12] border border-zinc-900 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-zinc-500" />
                    Template Base do Terminal
                  </h4>
                  <p className="text-[9px] text-zinc-500">
                    Baixe nossa tabela base com todos os campos estruturados de alvos e paradas padrão.
                  </p>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold border border-zinc-800 hover:border-zinc-700 hover:text-white bg-zinc-950/50 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-green-500" />
                  BAIXAR TEMPLATE
                </button>
              </div>
            </div>
          ) : (
            /* Upload preview state */
            <div className="space-y-4">
              
              {/* Summary panel */}
              <div className="bg-zinc-950/55 p-3 rounded border border-zinc-850 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[9px] uppercase font-bold text-zinc-550">Resumo de Registros</div>
                  <div className="text-zinc-200 text-[11px] font-bold">
                    Encontramos <span className="text-green-400 font-extrabold">{previewTrades.length}</span> operações válidas.
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleClearPreview}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 border border-red-950 bg-red-950/10 hover:bg-red-950/20 text-red-400 font-bold rounded text-[9px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    DESCARTAR
                  </button>
                </div>
              </div>

              {/* Preview table (Top 5 items high density render) */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  Visualização das Primeiras Margens Importadas (Máx. 5)
                </h4>

                <div className="border border-zinc-900 rounded overflow-hidden divide-y divide-zinc-900 max-h-[220px] overflow-y-auto">
                  {previewTrades.slice(0, 5).map((t, idx) => {
                    const isLong = t.tipo_operacao === 'Long';
                    const hasGain = t.status === 'Fechado_Gain' || t.pnl_realizado > 0;
                    return (
                      <div key={idx} className="p-2.5 bg-[#0a0a0c] flex items-center justify-between gap-4 text-[10px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-bold">{idx + 1}.</span>
                            <span className={`px-1 rounded-sm text-[8px] font-extrabold ${
                              isLong ? 'bg-green-950/30 text-green-400 border border-green-900/40' : 'bg-red-950/30 text-red-400 border border-red-900/40'
                            }`}>
                              {t.tipo_operacao}
                            </span>
                            <strong className="text-zinc-200">{t.moeda}</strong>
                            <span className="text-zinc-650 text-[9px]">{t.exchange}</span>
                          </div>
                          
                          <div className="text-[9px] text-zinc-500 font-mono">
                            Preço: <strong className="text-zinc-300">${t.preco_compra.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> | Qtd: <strong className="text-zinc-300">{t.quantidade}</strong>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <span className={`px-1.5 py-0.2 rounded-sm text-[8px] font-bold ${
                            t.status === 'Aberto' 
                              ? 'bg-zinc-805 text-zinc-400 bg-zinc-900 border border-zinc-800'
                              : hasGain ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-200'
                          }`}>
                            {t.status}
                          </span>
                          
                          <div className={`text-[10px] font-extrabold font-mono ${
                            t.pnl_realizado > 0 ? 'text-emerald-400' : t.pnl_realizado < 0 ? 'text-red-400' : 'text-zinc-550'
                          }`}>
                            {t.pnl_realizado > 0 ? '+' : ''}${t.pnl_realizado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Action footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-850 flex items-center justify-between shrink-0">
          <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-mono">
            KRYP TERMINAL CSV Engine 1.0
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 border border-zinc-800 hover:border-zinc-700 font-bold rounded text-[10px] transition-colors cursor-pointer"
            >
              FECHAR
            </button>

            {previewTrades.length > 0 && (
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-100 text-black hover:bg-zinc-200 font-black rounded text-[10px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    IMPORTANDO...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 font-bold" />
                    ESTABELECER {previewTrades.length} REGISTROS
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
