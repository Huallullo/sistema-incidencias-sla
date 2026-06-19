-- =============================================================================
-- MIGRACIÓN: 001_trigger_handle_new_user.sql
-- HU-002 - Punto 2.3: Automatización Edge/Triggers
--
-- OBJETIVO:
--   Cuando Supabase Auth crea un usuario con admin.createUser(),
--   este trigger se dispara automáticamente e inserta el perfil
--   del nuevo usuario en la tabla public.perfiles.
--
-- CÓMO FUNCIONA:
--   1. Edge Function register-user llama a admin.createUser()
--   2. Supabase inserta el usuario en auth.users
--   3. Este trigger detecta el INSERT en auth.users
--   4. Llama a handle_new_user() que:
--      a) Inserta fila en public.perfiles con el rol y datos del usuario
--      b) Inserta registro en public.email_logs (mock de correo)
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PASO 1: Tabla email_logs (mock de servicio de correo)
-- Simula el envío de correo registrando cada notificación pendiente.
-- En producción, una Cloud Function real leería esta tabla y enviaría el correo.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_destino TEXT        NOT NULL,
  asunto        TEXT        NOT NULL,
  cuerpo        TEXT        NOT NULL,
  estado        TEXT        NOT NULL DEFAULT 'pendiente',  -- pendiente | enviado | error
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.email_logs IS
  'Registro mock de correos de bienvenida. Simula el servicio de envío de email (HU-002, tarea 2.3).';

COMMENT ON COLUMN public.email_logs.estado IS
  'pendiente = aún no enviado, enviado = procesado por el servicio real, error = falló el envío';


-- -----------------------------------------------------------------------------
-- PASO 2: Función handle_new_user()
-- Se ejecuta automáticamente después de cada INSERT en auth.users.
-- Lee los metadatos del usuario (nombre, rol, etc.) y los persiste
-- en public.perfiles. Luego registra el correo de bienvenida en email_logs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER   -- Se ejecuta con permisos del propietario (postgres), no del usuario que hace el INSERT
SET search_path = public
AS $$
DECLARE
  v_nombre_completo TEXT;
  v_rol             TEXT;
  v_area            TEXT;
  v_telefono        TEXT;
  v_cargo           TEXT;
  v_cuerpo_correo   TEXT;
BEGIN
  -- ── Leer metadatos que la Edge Function pasó en user_metadata ──────────────
  v_nombre_completo := COALESCE(
    NEW.raw_user_meta_data->>'nombre_completo',
    NEW.raw_user_meta_data->>'full_name',
    'Usuario'
  );
  v_rol       := COALESCE(NEW.raw_user_meta_data->>'rol',      'usuario');
  v_area      := NEW.raw_user_meta_data->>'area';
  v_telefono  := NEW.raw_user_meta_data->>'telefono';
  v_cargo     := NEW.raw_user_meta_data->>'cargo';

  -- ── INSERT en public.perfiles ──────────────────────────────────────────────
  -- ON CONFLICT DO NOTHING protege contra duplicados si el trigger se dispara
  -- más de una vez (ej. actualización de email_confirm).
  INSERT INTO public.perfiles (user_id, nombre, rol, area, telefono, cargo)
  VALUES (
    NEW.id,
    v_nombre_completo,
    v_rol,
    v_area,
    v_telefono,
    v_cargo
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- ── Mock de correo: registrar en email_logs ────────────────────────────────
  v_cuerpo_correo := format(
    'Hola %s,

Tu cuenta ha sido creada exitosamente en el Sistema de Incidencias SLA.

Datos de acceso:
  • Email: %s
  • Rol asignado: %s
  • Área: %s

Ingresa al sistema en: https://sistema-incidencias-sla.vercel.app/login

Si tienes alguna consulta, contacta al Jefe de TI.

Saludos,
Sistema de Incidencias SLA',
    v_nombre_completo,
    NEW.email,
    v_rol,
    COALESCE(v_area, 'No especificada')
  );

  INSERT INTO public.email_logs (user_id, email_destino, asunto, cuerpo, estado)
  VALUES (
    NEW.id,
    NEW.email,
    'Bienvenido al Sistema de Incidencias SLA — Instrucciones de acceso',
    v_cuerpo_correo,
    'pendiente'
  );

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- No bloquear la creación del usuario si el trigger falla.
    -- Registrar el error en los logs de PostgreSQL para auditoría.
    RAISE WARNING 'handle_new_user: error procesando usuario % → %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function HU-002 tarea 2.3: inserta perfil en public.perfiles y registra correo de bienvenida en email_logs al crear un usuario en auth.users.';


-- -----------------------------------------------------------------------------
-- PASO 3: Crear el Trigger en auth.users
-- Se dispara AFTER INSERT para no bloquear la operación principal de Auth.
-- FOR EACH ROW garantiza que se ejecute una vez por cada usuario creado.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'HU-002 tarea 2.3: dispara handle_new_user() cada vez que se crea un usuario en Supabase Auth.';


-- -----------------------------------------------------------------------------
-- PASO 4: RLS (Row Level Security) para email_logs
-- Solo el rol service_role (usado por Edge Functions) puede leer/escribir.
-- Los usuarios normales no pueden ver correos de otros.
-- -----------------------------------------------------------------------------
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Política: el propio usuario puede ver sus correos (útil para auditoría futura)
CREATE POLICY "email_logs_own_user"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Política: el service_role puede hacer todo (necesario para el trigger y Edge Functions)
CREATE POLICY "email_logs_service_role_all"
  ON public.email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
