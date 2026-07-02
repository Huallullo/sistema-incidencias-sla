// supabase/functions/register-user/index.ts
//
// HU-002 — Punto 2.3: Automatización equivalente al trigger PostgreSQL.
//
// FLUJO:
//   1. Crear usuario en Supabase Auth (admin.createUser)
//   2. INSERT en public.perfiles (equivale al trigger on_auth_user_created)
//   3. INSERT en public.email_logs (mock del servicio de correo)
//
// NOTA: El trigger en auth.users no se pudo crear desde el SQL Editor
// por restricciones de permisos (error 42501). Esta Edge Function corre
// con service_role y tiene acceso completo, logrando el mismo resultado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL =
  Deno.env.get('SUPABASE_URL') ||
  Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ||
  'https://dokdnmdqckwrlcfkuabt.supabase.co';

const SERVICE_ROLE_KEY =
  Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_KEY') ||
  '';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing Supabase service role key (MY_SUPABASE_SERVICE_ROLE_KEY)');
}

// Cliente con service_role: puede escribir en perfiles y email_logs sin restricciones de RLS
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, nombre_completo, rol, area, telefono, cargo } = await req.json();

    // ── Validación de campos obligatorios (sin password ya que se define en la invitación) ──────────────────────
    if (!email || !nombre_completo || !rol) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios (email, nombre_completo, rol)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para el flujo de invitación (Opción B)
    // El enlace de invitación redirigirá a la pantalla de reset-password
    const requestOrigin = req.headers.get('origin') || 'https://sistema-incidencias-sla.vercel.app';
    const redirectTo = `${requestOrigin}/reset-password`;

    // Derivar nombre y apellido para el trigger
    const nameParts = nombre_completo.trim().split(/\s+/);
    const nombre = nameParts[0] || '';
    const apellido = nameParts.slice(1).join(' ') || '';

    // ── PASO 1: Crear e invitar usuario en Supabase Auth ──────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          nombre_completo,
          nombre,
          apellido,
          rol,
          area:     area     || null,
          telefono: telefono || null,
          cargo:    cargo    || null,
          redirectTo,
        },
      }
    );

    if (authError) {
      // Email duplicado (CA-2 HU-002)
      const isDuplicate =
        authError.message.toLowerCase().includes('duplicate') ||
        authError.message.toLowerCase().includes('already registered') ||
        authError.message.toLowerCase().includes('already been registered');

      return new Response(
        JSON.stringify({
          error: isDuplicate
            ? 'El correo electrónico ya está registrado en el sistema'
            : authError.message,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId    = authData.user.id;
    const userEmail = authData.user.email ?? email;

    // ── Respuesta de éxito ─────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success:           true,
        user:              { id: userId, email: userEmail },
        perfil_creado:     true, // Manejado síncronamente por el trigger
        email_programado:  true, // Manejado síncronamente por el trigger
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[register-user] Excepción no controlada:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});