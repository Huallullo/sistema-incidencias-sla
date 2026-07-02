// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStorage = {
    getItem: (key: string) => {
      if (typeof document === 'undefined') {
        try {
          const { cookies } = require('next/headers');
          const cookieStore = cookies();
          return cookieStore.get(key)?.value || null;
        } catch (e) {
          return null;
        }
      }
      const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    },
    setItem: (key: string, value: string) => {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    },
    removeItem: (key: string) => {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
    },
  };

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: cookieStorage,
      autoRefreshToken: true,
      persistSession: true,
    },
  });

  return _client;
}

// Proxy para mantener compatibilidad: `supabase.auth.xxx` sigue funcionando
// pero el cliente real se crea solo cuando se accede por primera vez (en el browser)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  },
});