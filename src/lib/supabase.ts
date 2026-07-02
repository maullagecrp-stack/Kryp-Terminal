import { createClient } from '@supabase/supabase-js';

// Bulletproof environment variable lookup for Vite SPA, server-side Node, and Next.js environments
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  '';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  '';

// Lazy client setup or warning fallback
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'AVISO: Credenciais do Supabase não configuradas no ambiente. Verifique o seu arquivo .env.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
