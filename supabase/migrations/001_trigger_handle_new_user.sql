-- =============================================================================
-- SCRIPT 4: TRIGGER AUTOMÁTICO + MOCK DE CORREO
-- HU-002 — Punto 2.3: Desarrollo de Automatización (Edge/Triggers)
--
-- OBJETIVO:
--   Cuando la Edge Function llama a admin.createUser() y Supabase inserta
--   el usuario en auth.users, este trigger se dispara automáticamente y:
--     a) Inserta el perfil en public.perfiles (con los datos del usuario)
--     b) Registra el correo de bienvenida en email_logs (mock/simulación)
--
-- PRE-REQUISITOS:
--   Haber ejecutado SCRIPT 1 (TABLAS), SCRIPT 2 (FUNCIONES), SCRIPT 3 (POLÍTICAS)
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor (nuevo snippet "Trigger")
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PASO 1: Tabla email_logs — Mock del servicio de envío de correo
--
-- Simula el envío de email registrando cada notificación como "pendiente".
-- En producción, un servicio externo (Resend, SendGrid, etc.) leería esta
-- tabla y enviaría el correo real. Aquí sirve como evidencia del disparo.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_destino TEXT        NOT NULL,
  asunto        TEXT        NOT NULL,
  cuerpo        TEXT        NOT NULL,
  estado        TEXT        NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'enviado', 'error')),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.email_logs IS
  'HU-002 / 2.3 — Mock de correos de bienvenida disparados por el trigger on_auth_user_created.';

-- RLS: cada usuario solo ve sus propios correos
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_logs_select_own ON public.email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- service_role (usado por Edge Functions y triggers) tiene acceso total
CREATE POLICY email_logs_service_role_all ON public.email_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- PASO 2: Función handle_new_user()
--
-- Adaptada EXACTAMENTE a las columnas de tu tabla perfiles:
--   nombre_completo, rol, telefono_interno, cargo
-- (SIN columna "area" porque no existe en tu tabla)
--
-- Lee los metadatos que la Edge Function register-user pasa en user_metadata:
--   { nombre_completo, rol, telefono, cargo }
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre_completo TEXT;
  v_rol             TEXT;
  v_telefono        TEXT;
  v_cargo           TEXT;
  v_cuerpo_correo   TEXT;
BEGIN
  -- ── Leer metadatos enviados desde la Edge Function ─────────────────────────
  v_nombre_completo := COALESCE(
    NEW.raw_user_meta_data->>'nombre_completo',
    NEW.raw_user_meta_data->>'full_name',
    'Usuario sin nombre'
  );
  v_rol      := COALESCE(NEW.raw_user_meta_data->>'rol', 'usuario');
  v_telefono := NEW.raw_user_meta_data->>'telefono';   -- puede ser NULL
  v_cargo    := NEW.raw_user_meta_data->>'cargo';      -- puede ser NULL

  -- ── INSERT en public.perfiles ──────────────────────────────────────────────
  -- Adaptado a tus columnas reales: nombre_completo, rol, telefono_interno, cargo
  -- ON CONFLICT DO NOTHING: si el trigger se dispara dos veces (edge case Auth),
  -- no falla ni duplica.
  INSERT INTO public.perfiles (
    user_id,
    nombre_completo,
    rol,
    telefono_interno,
    cargo
  )
  VALUES (
    NEW.id,
    v_nombre_completo,
    v_rol,
    v_telefono,
    v_cargo
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- ── Mock correo: registrar en email_logs ───────────────────────────────────
  -- Simula el correo de bienvenida con instrucciones de acceso (CA-3 HU-002)
  v_cuerpo_correo := format(
    'Hola %s,

Tu cuenta ha sido creada en el Sistema de Incidencias SLA.

Datos de acceso:
  • Email   : %s
  • Contraseña temporal: Temporal123!
  • Rol asignado       : %s

Ingresa en: https://sistema-incidencias-sla.vercel.app/login

Por seguridad, cambia tu contraseña en el primer inicio de sesión.

Saludos,
Jefe de TI — Sistema de Incidencias SLA',
    v_nombre_completo,
    NEW.email,
    v_rol
  );

  INSERT INTO public.email_logs (
    user_id,
    email_destino,
    asunto,
    cuerpo,
    estado
  )
  VALUES (
    NEW.id,
    NEW.email,
    'Bienvenido al Sistema de Incidencias SLA — Instrucciones de acceso',
    v_cuerpo_correo,
    'pendiente'
  );

  RETURN NEW;

-- ── Manejo de errores ────────────────────────────────────────────────────────
-- Si el trigger falla por cualquier razón, NO bloqueamos la creación del
-- usuario en Auth. Solo registramos el error en los logs de PostgreSQL.
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] Error procesando usuario %: %',
      NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'HU-002 / 2.3 — Trigger function: inserta perfil en perfiles y mock de correo en email_logs cuando Auth crea un usuario.';


-- -----------------------------------------------------------------------------
-- PASO 3: Crear el Trigger en auth.users
--
-- AFTER INSERT: se ejecuta después de que Auth confirma la inserción,
-- garantizando que el user_id ya existe antes de que el trigger lo use.
-- FOR EACH ROW: una ejecución por cada usuario creado.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'HU-002 / 2.3 — Dispara handle_new_user() cada vez que admin.createUser() crea un usuario.';


-- -----------------------------------------------------------------------------
-- VERIFICACIÓN — Ejecuta esto después del script para confirmar que todo quedó
-- -----------------------------------------------------------------------------
-- Verificar que el trigger existe:
-- SELECT trigger_name, event_object_schema, event_object_table, action_timing
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- Verificar que la tabla email_logs existe:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'email_logs' ORDER BY ordinal_position;

-- Después de registrar un usuario, verificar perfiles y correos:
-- SELECT * FROM public.perfiles ORDER BY created_at DESC LIMIT 5;
-- SELECT * FROM public.email_logs ORDER BY creado_en DESC LIMIT 5;
