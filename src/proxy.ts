// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  // Creamos la respuesta base
  const supabaseResponse = NextResponse.next({
    request,
  });

  // Creamos el cliente de Supabase con el manejo de cookies correcto
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Establecer cookies en la solicitud (para el resto de la ejecución)
          cookiesToSet.forEach(({ name, value, options }) => {
            // Usamos la forma de objeto para set, que es la correcta en Next.js 15+
            request.cookies.set({
              name,
              value,
              ...options,
            });
          });
          // Establecer cookies en la respuesta (para el cliente)
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    }
  );

  // Obtener la sesión
  const { data: { session } } = await supabase.auth.getSession();

  console.log(' Middleware - Sesión:', session ? ' Autenticado' : 'No autenticado');
  console.log(' Cookies en request:', request.cookies.getAll().map(c => c.name));

  // Si no hay sesión, redirigir al login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Obtener el rol del usuario
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('id_rol, roles(nombre_rol)')
    .eq('id_auth_supabase', session.user.id)
    .single();

  const roleData = perfil?.roles;
  let roleName: string | null = null;
  if (roleData) {
    if (Array.isArray(roleData)) {
      roleName = roleData[0]?.nombre_rol || null;
    } else if (typeof roleData === 'object') {
      roleName = (roleData as any).nombre_rol || null;
    }
  }

  console.log('👤 Rol del usuario:', roleName, 'id_rol:', perfil?.id_rol, 'Error:', error);

  // Si no es jefe_ti (rol = 1), redirigir a /dashboard
  if (error || (roleName !== 'jefe_ti' && perfil?.id_rol !== 1)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Acceso permitido, devolvemos la respuesta con las cookies actualizadas
  return supabaseResponse;
}

export const config = {
  matcher: '/admin/:path*',
};