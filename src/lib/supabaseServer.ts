import { createServerClient } from '@supabase/ssr';
import { supabase as browserClient } from './supabaseClient';

export async function getSupabaseServerClient() {
  if (typeof window !== 'undefined') {
    return browserClient;
  }
  
  try {
    // Importación dinámica en tiempo de ejecución para evitar errores de empaquetado en componentes de cliente
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set({ name, value, ...options })
              );
            } catch (error) {
              // Ignorar errores al configurar cookies si se llama desde Server Components
            }
          },
        },
      }
    );
  } catch (e) {
    // Fallback para pruebas unitarias en Jest o compilación estática
    return browserClient;
  }
}