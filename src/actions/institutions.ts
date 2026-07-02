"use server";

import { supabase } from '../lib/supabase';
import { Instituicao, InstituicaoTipo } from '../types';

export interface CreateInstitutionInput {
  nome: string;
  tipo: InstituicaoTipo;
  cor_hex: string;
}

/**
 * Busca todas as instituições cadastradas na tabela 'instituicoes'
 * @returns Array de Instituicao
 */
export async function getInstitutions(): Promise<{ data: Instituicao[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('instituicoes')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      throw error;
    }

    return { data: data as Instituicao[], error: null };
  } catch (err: any) {
    console.error('Erro ao buscar instituições do Supabase:', err);
    return { data: null, error: err.message || 'Erro deconhecido ao buscar instituições.' };
  }
}

/**
 * Cria/Insere uma nova instituição produtora no Supabase
 * @param input Dados da instituição
 */
export async function createInstitution(input: CreateInstitutionInput): Promise<{ data: Instituicao | null; error: string | null }> {
  try {
    if (!input.nome.trim()) {
      return { data: null, error: 'O nome da instituição é obrigatório.' };
    }

    const { data, error } = await supabase
      .from('instituicoes')
      .insert([
        {
          nome: input.nome.trim(),
          tipo: input.tipo,
          cor_hex: input.cor_hex || '#3b82f6',
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: data as Instituicao, error: null };
  } catch (err: any) {
    console.error('Erro ao criar instituição no Supabase:', err);
    return { data: null, error: err.message || 'Erro inesperado ao salvar instituição.' };
  }
}
