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

// Simple validation function for URL to avoid invalid URL errors
const isValidUrl = (url: string) => {
  if (!url) return false;
  if (url.includes('your-supabase-url-here') || url.includes('placeholder')) return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const hasValidCredentials = isValidUrl(supabaseUrl) && supabaseAnonKey && !supabaseAnonKey.includes('your-supabase-anon-key-here');

// Helper mock to avoid crashing the app when Supabase is not configured
const createMockSupabase = () => {
  console.warn(
    'AVISO: Credenciais do Supabase não configuradas ou inválidas no ambiente. O sistema funcionará no modo offline (localStorage).'
  );
  
  const dummyResult = { data: null, error: null };
  
  const fromMock = (table: string) => {
    const chain = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      eq: () => chain,
      order: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (onfulfilled?: (value: any) => any) => {
        const p = Promise.resolve({ data: [], error: null });
        return onfulfilled ? p.then(onfulfilled) : p;
      }
    };
    return chain;
  };

  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve(dummyResult),
      signInWithPassword: () => Promise.resolve(dummyResult),
      signOut: () => Promise.resolve(dummyResult),
    },
    from: fromMock,
  } as any;
};

export const supabase = hasValidCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : createMockSupabase();
