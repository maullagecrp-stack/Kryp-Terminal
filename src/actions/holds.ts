"use server";

import { supabase } from '../lib/supabase';
import { Hold } from '../types';

export interface CreateHoldInput {
  data_hora: string;
  exchange: string;
  moeda: string;
  tipo: 'Compra' | 'Venda';
  preco_compra: number;
  quantidade: number;
  valor_investido: number;
  alvo_1?: number | null;
  alvo_2?: number | null;
  alvo_3?: number | null;
  notas?: string;
}

/**
 * Cria ou insere um novo aporte/venda de longo prazo (Hold position) no Supabase.
 */
export async function createHold(input: CreateHoldInput): Promise<{ data: Hold | null; error: string | null }> {
  try {
    // Validando campos obrigatórios
    if (!input.moeda.trim()) {
      return { data: null, error: 'Ticker/Ativo do aporte é obrigatório.' };
    }
    if (input.preco_compra <= 0) {
      return { data: null, error: 'A cotação de compra deve ser maior que zero.' };
    }
    if (input.quantidade <= 0) {
      return { data: null, error: 'A quantidade deve ser maior que zero.' };
    }

    // Busca usuário ativo no Auth do Supabase
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    const insertPayload: any = {
      user_id: userId,
      data_hora: input.data_hora,
      exchange: input.exchange,
      moeda: input.moeda.toUpperCase().trim(),
      tipo: input.tipo,
      preco_compra: Number(input.preco_compra),
      quantidade: Number(input.quantidade),
      valor_investido: Number(input.valor_investido),
      alvo_1: input.alvo_1 ? Number(input.alvo_1) : null,
      alvo_2: input.alvo_2 ? Number(input.alvo_2) : null,
      alvo_3: input.alvo_3 ? Number(input.alvo_3) : null,
      notas: input.notas || ''
    };

    const { data, error } = await supabase
      .from('holds')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: data as Hold, error: null };
  } catch (err: any) {
    console.error('Erro ao salvar hold no Supabase:', err);
    return { data: null, error: err.message || 'Erro inesperado ao salvar aporte hold.' };
  }
}

/**
 * Busca a lista total de operações de Hold no Supabase.
 */
export async function getHolds(): Promise<{ data: Hold[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('holds')
      .select('*')
      .order('data_hora', { ascending: false });

    if (error) {
      throw error;
    }

    return { data: data as Hold[], error: null };
  } catch (err: any) {
    console.error('Erro ao buscar holds:', err);
    return { data: null, error: err.message || 'Erro inesperante ao buscar dados de hold.' };
  }
}
