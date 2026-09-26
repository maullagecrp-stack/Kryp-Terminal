import { BrokerAccount } from '../types';
import { supabase } from '../lib/supabase';

export const initialBrokerAccounts: BrokerAccount[] = [];

const STORAGE_KEY = '@kryp-terminal:broker_accounts';

export function getLocalBrokerAccounts(): BrokerAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filtra e remove contas de exemplo antigas com prefixos mock
      const clean = parsed.filter(a => a && !a.id.startsWith('broker-binance-') && !a.id.startsWith('broker-bybit-') && !a.id.startsWith('broker-okx-'));
      return clean;
    }
    return [];
  } catch (e) {
    console.error('Erro ao ler contas de corretoras do localStorage:', e);
    return [];
  }
}

export function saveLocalBrokerAccounts(accounts: BrokerAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Erro ao salvar contas de corretoras no localStorage:', e);
  }
}

export async function syncBrokerAccountToDb(account: BrokerAccount) {
  try {
    const { error } = await supabase
      .from('broker_accounts')
      .upsert({
        id: account.id,
        broker: account.broker,
        nome_conta: account.nome_conta,
        tipo_mercado: account.tipo_mercado,
        ambiente: account.ambiente,
        status: account.status,
        saldo_total_usd: account.saldo_total_usd,
        saldo_disponivel_usd: account.saldo_disponivel_usd,
        ultimo_sync: account.ultimo_sync,
        cor_hex: account.cor_hex,
        ativo: account.ativo,
      });

    if (error) {
      console.warn('Sync to Supabase broker_accounts notice:', error.message);
    }
  } catch (e) {
    // Offline or table not created yet in user Supabase
  }
}
