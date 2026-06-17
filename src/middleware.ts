// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean; httpOnly?: boolean }) {
          request.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean; httpOnly?: boolean }) {
          request.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('user_id', session.user.id)
    .single();

  if (error || perfil?.rol !== 'jefe_ti') {
    return NextResponse.redirect(new URL('/dashboard/usuario', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};