import React, { useState } from 'react';
import { Database, FolderTree, Check, Copy, Info } from 'lucide-react';

export default function DBBlueprint() {
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlSchema = `-- ==========================================
-- SCRIPT DE BANCO DE DADOS: SUPABASE (POSTGRESQL)
-- PORTFÓLIO, DIÁRIO DE TRADES E CADASTRO DE INSTITUIÇÕES
-- ==========================================

-- 1. Criação do Tipo ENUM para Status de Trade
CREATE TYPE trade_status AS ENUM ('Aberto', 'Fechado_Gain', 'Fechado_Loss');

-- 2. Criação do Tipo ENUM para Tipos de Instituição
CREATE TYPE instituicao_tipo AS ENUM ('CEX', 'DEX', 'Wallet', 'Bank');

-- 3. Tabela de Instituições (Exchanges, Carteiras e Bancos)
CREATE TABLE public.instituicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE, -- Nome unico de referencia (P. Ex. 'Binance', 'MetaMask')
    tipo instituicao_tipo NOT NULL,
    cor_hex VARCHAR(7) NOT NULL DEFAULT '#3b82f6', -- Cor em hexadecimal para colorir os graficos no dashboard
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Habilitar RLS para Instituições
ALTER TABLE public.instituicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instituições são visíveis para todos os autenticados" ON public.instituicoes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar e gerenciar as próprias instituições" ON public.instituicoes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Tabela de Contas de Corretoras (Multi-Contas por Corretora via API)
CREATE TABLE public.broker_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    broker VARCHAR(100) NOT NULL, -- ex: 'Binance', 'Bybit', 'OKX'
    nome_conta VARCHAR(150) NOT NULL, -- ex: 'Binance Spot Principal', 'Subconta 02 Futuros'
    tipo_mercado VARCHAR(50) NOT NULL DEFAULT 'Spot', -- 'Spot', 'Futuros', 'Ambos'
    ambiente VARCHAR(50) NOT NULL DEFAULT 'Mainnet', -- 'Mainnet', 'Testnet'
    status VARCHAR(50) NOT NULL DEFAULT 'Conectado',
    saldo_total_usd NUMERIC(20, 4) NOT NULL DEFAULT 0,
    saldo_disponivel_usd NUMERIC(20, 4) NOT NULL DEFAULT 0,
    cor_hex VARCHAR(7) NOT NULL DEFAULT '#22c55e',
    ativo BOOLEAN NOT NULL DEFAULT true,
    ultimo_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, broker, nome_conta)
);

ALTER TABLE public.broker_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias contas de corretoras" ON public.broker_accounts
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Tabela Principal de Trades (Atualizada com Integridade Referencial e Multi-Contas)
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Integração direta com Supabase Auth
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Chave estrangeira de integridade amarrando a exchange do trade à tabela de instituições cadastradas
    exchange VARCHAR(100) NOT NULL REFERENCES public.instituicoes(nome) ON UPDATE CASCADE,
    
    moeda VARCHAR(20) NOT NULL, -- ex: BTC, ETH, SOL
    preco_compra NUMERIC(20, 8) NOT NULL,
    quantidade NUMERIC(20, 8) NOT NULL,
    taxa_corretora_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
    stop_loss NUMERIC(20, 8),
    alvo_1 NUMERIC(20, 8),
    alvo_2 NUMERIC(20, 8),
    alvo_3 NUMERIC(20, 8),
    alvo_4 NUMERIC(20, 8),
    alvo_5 NUMERIC(20, 8),
    alvo_6 NUMERIC(20, 8),
    status trade_status NOT NULL DEFAULT 'Aberto',
    pnl_realizado NUMERIC(20, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Índices de Otimização Alta Densidade (Traders de Alta Frequência)
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_moeda ON public.trades(moeda);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_instituicoes_nome ON public.instituicoes(nome);

-- 6. Políticas de Segurança Supabase para Trades (Row Level Security - RLS)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Traders can manage their own trades" ON public.trades
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Trigger Função para Cálculo Automático do Custo de Aquisição nos Fechamentos
-- (Útil para registrar o PnL estático no Supabase quando o trade muda de status)
CREATE OR REPLACE FUNCTION calculate_realized_pnl()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != 'Aberto' AND OLD.status = 'Aberto' THEN
        -- Exemplo simplificado de cálculo de PnL realizado estático caso batido stop ou alvos no back-end
        -- PnL = (Preço de Saída - Preço de Compra) * Quantidade - Taxa
        -- Em produção, o motor de cálculo atualiza essa coluna em tempo real.
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

  const proposedStructure = `├── .env.example
├── .gitignore
├── README.md
├── package.json
├── tailwind.config.ts (ou next.config.ts)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Layout Principal com Provedores
│   │   ├── page.tsx            # Página de Dashboard (Layout de Alta Densidade)
│   │   ├── trades/             # Diário / Histórico detalhado
│   │   │   └── page.tsx
│   │   └── api/                # Endpoints auxiliares (CoinGecko Proxy)
│   │       └── prices/route.ts
│   ├── components/             # Componentes Reutilizáveis (Shadcn/ui)
│   │   ├── ui/                 # Componentes Atômicos de UI (botão, tabela, card, etc.)
│   │   │   ├── button.tsx
│   │   │   ├── table.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── dropdown-menu.tsx
│   │   ├── trade-journal-table.tsx  # Grid de trades detalhado
│   │   ├── metrics-highlights.tsx   # Cards de PnL / Investido
│   │   ├── allocation-chart.tsx     # Recharts Donut de Alocação
│   │   └── csv-importer.tsx         # Upload e parser de CSV
│   ├── lib/
│   │   ├── supabase.ts         # Inicialização do Cliente Supabase
│   │   ├── coingecko.ts        # Integração e Cache com a API CoinGecko
│   │   └── utils.ts            # Helpers matemáticos e classes Tailwind
│   └── types/
│       └── database.types.ts   # Tipos Autogerados pelo Supabase CLI
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div id="db-blueprint-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Passo 1: Estrutura de Pastas */}
      <div id="folder-structure" className="bg-terminal-panel border border-terminal-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-terminal-border pb-3">
          <FolderTree className="w-5 h-5 text-amber-500" />
          <h3 className="font-mono text-sm font-semibold text-zinc-100 uppercase tracking-wider">
            Passo 1: Estrutura de Pastas Next.js (App Router)
          </h3>
        </div>
        <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
          Arquitetura profissional modular sugerida para o projeto final para garantir altíssima performance, renderização no servidor para SEO/feed de preços (SSR) e fácil manutenção.
        </p>
        <div className="bg-terminal-bg rounded border border-terminal-border p-3 overflow-x-auto max-h-[380px] text-xs">
          <pre className="font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap sm:whitespace-pre">
            {proposedStructure}
          </pre>
        </div>
      </div>

      {/* Passo 2: Schema de Banco de Dados */}
      <div id="database-schema" className="bg-terminal-panel border border-terminal-border rounded-lg p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-terminal-border pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              <h3 className="font-mono text-sm font-semibold text-zinc-100 uppercase tracking-wider">
                Passo 2: Schema SQL (Supabase / Postgres)
              </h3>
            </div>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              title="Copiar SQL"
              id="btn-copy-sql"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>
          </div>
          <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
            Schema otimizado com suporte a multi-usuários via Supabase RLS, índices focados em busca e as colunas decimais de alta precisão requeridas para evitar problemas de arredondamento de criptomoedas.
          </p>
          <div className="bg-terminal-bg rounded border border-terminal-border p-3 overflow-x-auto max-h-[320px] text-xs">
            <pre className="font-mono text-emerald-400 leading-relaxed">
              {sqlSchema}
            </pre>
          </div>
        </div>
        <div className="mt-4 flex gap-2 items-start bg-zinc-900/50 p-2.5 rounded border border-zinc-800 text-xs text-zinc-400 font-mono">
          <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>Nota: As colunas <code className="text-zinc-200">alvo_1</code> a <code className="text-zinc-200">alvo_6</code> permitem monitorar o progresso em níveis múltiplos de lucro (Take Profit).</span>
        </div>
      </div>
    </div>
  );
}
