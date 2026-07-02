"use server";

import { supabase } from '../lib/supabase';
import { Trade, TradeStatus } from '../types';

export interface CreateTradeInput {
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
}

export interface DashboardMetrics {
  totalInvestido: number;
  pnlRealizado: number;
  winRate: number;
  tradesAtivosCount: number;
  totalTradesCount: number;
  totalNetWorth: number;
}

/**
 * Cria ou insere uma nova operação de trade no Supabase.
 * Trata os alvos vazios como null e grava o custo calculado da taxa.
 */
export async function createTrade(input: CreateTradeInput): Promise<{ data: Trade | null; error: string | null }> {
  try {
    // 1. Validando campos obrigatórios
    if (!input.moeda.trim()) {
      return { data: null, error: 'Ticker/Ativo da operação é obrigatório.' };
    }
    if (input.preco_compra <= 0) {
      return { data: null, error: 'O preço de compra deve ser maior que zero.' };
    }
    if (input.quantidade <= 0) {
      return { data: null, error: 'A quantidade deve ser maior que zero.' };
    }
    // 2. Tenta pegar o ID do usuário conectado para respeitar a política de RLS se estiver ativo
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    // 3. Monta o payload exato mapeando os nulos
    const insertPayload: any = {
      user_id: userId, // Vincula com Supabase Auth
      data_hora: input.data_hora,
      exchange: input.exchange,
      moeda: input.moeda.toUpperCase().trim(),
      preco_compra: Number(input.preco_compra),
      quantidade: Number(input.quantidade),
      taxa_corretora_usd: Number(input.taxa_corretora_usd || 0),
      stop_loss: input.stop_loss ? Number(input.stop_loss) : null,
      alvo_1: input.alvo_1 !== null ? Number(input.alvo_1) : null,
      alvo_2: input.alvo_2 ? Number(input.alvo_2) : null,
      alvo_3: input.alvo_3 ? Number(input.alvo_3) : null,
      alvo_4: input.alvo_4 ? Number(input.alvo_4) : null,
      alvo_5: input.alvo_5 ? Number(input.alvo_5) : null,
      alvo_6: input.alvo_6 ? Number(input.alvo_6) : null,
      status: 'Aberto' as TradeStatus,
      pnl_realizado: 0,
      tipo_operacao: input.tipo_operacao || 'Long',
      estrategia: input.estrategia,
      notas: input.notas || '',
      moeda_taxa: input.moeda_taxa || 'USDT',
      quantidade_taxa: Number(input.quantidade_taxa || 0)
    };

    const { data, error } = await supabase
      .from('trades')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: data as Trade, error: null };
  } catch (err: any) {
    console.error('Erro ao registrar trade no Supabase:', err);
    return { data: null, error: err.message || 'Erro inesperante ao salvar operação.' };
  }
}

/**
 * Busca os trades e faz as agregações de performance para os Cards do Painel principal
 */
export async function getDashboardMetrics(): Promise<{ data: DashboardMetrics | null; error: string | null }> {
  try {
    const { data: tradesList, error } = await supabase
      .from('trades')
      .select('status, preco_compra, quantidade, pnl_realizado, taxa_corretora_usd');

    if (error) {
      throw error;
    }

    const trades = (tradesList || []) as any[];

    let totalInvestido = 0;
    let pnlRealizado = 0;
    let closedTradesWithGain = 0;
    let totalClosedTrades = 0;
    let tradesAtivosCount = 0;

    trades.forEach((trade) => {
      const precoCompra = Number(trade.preco_compra || 0);
      const quantidade = Number(trade.quantidade || 0);
      const pnlRealizadoValue = Number(trade.pnl_realizado || 0);
      const taxaUsd = Number(trade.taxa_corretora_usd || 0);

      if (trade.status === 'Aberto') {
        tradesAtivosCount++;
        totalInvestido += (precoCompra * quantidade);
      } else {
        totalClosedTrades++;
        // PNL Realized: descontar o taxa_corretora_usd do lucro líquido
        const netPnl = pnlRealizadoValue - taxaUsd;
        pnlRealizado += netPnl;

        if (trade.status === 'Fechado_Gain' || netPnl > 0) {
          closedTradesWithGain++;
        }
      }
    });

    const winRate = totalClosedTrades > 0 
      ? Number(((closedTradesWithGain / totalClosedTrades) * 100).toFixed(1)) 
      : 0;

    const totalNetWorth = totalInvestido + pnlRealizado;

    return {
      data: {
        totalInvestido: Number(totalInvestido.toFixed(4)),
        pnlRealizado: Number(pnlRealizado.toFixed(4)),
        winRate,
        tradesAtivosCount,
        totalTradesCount: trades.length,
        totalNetWorth: Number(totalNetWorth.toFixed(4))
      },
      error: null
    };
  } catch (err: any) {
    console.error('Erro ao carregar métricas consolidadas:', err);
    return { data: null, error: err.message || 'Erro inesperado ao consolidar métricas.' };
  }
}

/**
 * Realiza a inserção em escala (Bulk Insert / Importar CSV) na tabela de trades
 * @param tradesArray Lista de objetos parseados do CSV
 */
export async function importTradesCSV(tradesArray: any[]): Promise<{ count: number; error: string | null }> {
  try {
    if (!tradesArray || tradesArray.length === 0) {
      return { count: 0, error: 'A lista de trades fornecida está vazia.' };
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    // Mapeia o array bruto de objetos para garantir conformidade
    const mappedTrades = tradesArray.map((row) => ({
      user_id: userId,
      data_hora: row.data_hora || new Date().toISOString(),
      exchange: row.exchange || 'Binance',
      moeda: String(row.moeda || 'BTC').toUpperCase().trim(),
      preco_compra: Number(row.preco_compra || 0),
      quantidade: Number(row.quantidade || 0),
      taxa_corretora_usd: Number(row.taxa_corretora_usd || 0),
      stop_loss: row.stop_loss ? Number(row.stop_loss) : null,
      alvo_1: row.alvo_1 ? Number(row.alvo_1) : null,
      alvo_2: row.alvo_2 ? Number(row.alvo_2) : null,
      alvo_3: row.alvo_3 ? Number(row.alvo_3) : null,
      alvo_4: row.alvo_4 ? Number(row.alvo_4) : null,
      alvo_5: row.alvo_5 ? Number(row.alvo_5) : null,
      alvo_6: row.alvo_6 ? Number(row.alvo_6) : null,
      status: (row.status || 'Aberto') as TradeStatus,
      pnl_realizado: Number(row.pnl_realizado || 0),
      tipo_operacao: row.tipo_operacao || 'Long',
      estrategia: row.estrategia || 'Price Action',
      notas: row.notas || '',
      moeda_taxa: row.moeda_taxa || 'USDT',
      quantidade_taxa: Number(row.quantidade_taxa || 0)
    }));

    const { data, error } = await supabase
      .from('trades')
      .insert(mappedTrades)
      .select();

    if (error) {
      throw error;
    }

    return { count: data ? data.length : mappedTrades.length, error: null };
  } catch (err: any) {
    console.error('Erro ao realizar o bulk insert de trades:', err);
    return { count: 0, error: err.message || 'Erro ao importar dados em massa.' };
  }
}

/**
 * Atualiza os dados de um trade existente no Supabase.
 */
export async function updateTrade(id: string, input: CreateTradeInput): Promise<{ data: Trade | null; error: string | null }> {
  try {
    if (!id) {
      return { data: null, error: 'O ID do trade é obrigatório para atualização.' };
    }
    if (!input.moeda.trim()) {
      return { data: null, error: 'Ticker/Ativo da operação é obrigatório.' };
    }
    if (input.preco_compra <= 0) {
      return { data: null, error: 'O preço de compra deve ser maior que zero.' };
    }
    if (input.quantidade <= 0) {
      return { data: null, error: 'A quantidade deve ser maior que zero.' };
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const updatePayload: any = {
      user_id: userId,
      data_hora: input.data_hora,
      exchange: input.exchange,
      moeda: input.moeda.toUpperCase().trim(),
      preco_compra: Number(input.preco_compra),
      quantidade: Number(input.quantidade),
      taxa_corretora_usd: Number(input.taxa_corretora_usd || 0),
      stop_loss: input.stop_loss ? Number(input.stop_loss) : null,
      alvo_1: input.alvo_1 !== null ? Number(input.alvo_1) : null,
      alvo_2: input.alvo_2 ? Number(input.alvo_2) : null,
      alvo_3: input.alvo_3 ? Number(input.alvo_3) : null,
      alvo_4: input.alvo_4 ? Number(input.alvo_4) : null,
      alvo_5: input.alvo_5 ? Number(input.alvo_5) : null,
      alvo_6: input.alvo_6 ? Number(input.alvo_6) : null,
      tipo_operacao: input.tipo_operacao || 'Long',
      estrategia: input.estrategia,
      notas: input.notas || '',
      moeda_taxa: input.moeda_taxa || 'USDT',
      quantidade_taxa: Number(input.quantidade_taxa || 0)
    };

    const { data, error } = await supabase
      .from('trades')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: data as Trade, error: null };
  } catch (err: any) {
    console.error('Erro ao atualizar trade no Supabase:', err);
    return { data: null, error: err.message || 'Erro inesperado ao atualizar a operação.' };
  }
}

