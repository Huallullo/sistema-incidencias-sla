// @ts-nocheck
// supabase/functions/register-user/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('MY_SUPABASE_URL')!,
  Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    const { email, password, nombre_completo, rol, area, telefono, cargo } = await req.json();

    if (!email || !password || !nombre_completo || !rol) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios (email, password, nombre, rol)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre_completo,
        rol,
        area: area || null,
        telefono: telefono || null,
        cargo: cargo || null,
      },
    });

    if (authError) {
      if (authError.message.includes('duplicate')) {
        return new Response(
          JSON.stringify({ error: 'El correo electrónico ya está registrado' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en register-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});