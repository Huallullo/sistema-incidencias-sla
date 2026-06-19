-- =============================================================================
-- MIGRACIÓN: 000_create_perfiles_table.sql
-- HU-002 - Punto 1.4: Modelar base de datos
--
-- OBJETIVO:
--   Crear la tabla public.perfiles vinculada a auth.users.
--   Debe ejecutarse ANTES de 001_trigger_handle_new_user.sql
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla perfiles
-- Almacena el rol y datos informativos de cada usuario del sistema.
-- La columna user_id es FK a auth.users (llave foránea al motor de Auth).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
  user_id       UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT        NOT NULL DEFAULT '',
  rol           TEXT        NOT NULL DEFAULT 'usuario'
                            CHECK (rol IN ('usuario', 'tecnico', 'jefe_ti')),
  area          TEXT,
  telefono      TEXT,
  cargo         TEXT,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.perfiles IS
  'Perfil extendido de cada usuario. Vinculado a auth.users por user_id.';

COMMENT ON COLUMN public.perfiles.rol IS
  'Rol del usuario: usuario | tecnico | jefe_ti. Controla acceso a rutas y funcionalidades.';

-- -----------------------------------------------------------------------------
-- Índice para búsquedas frecuentes por rol
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON public.perfiles(rol);

-- -----------------------------------------------------------------------------
-- Trigger para actualizar automáticamente actualizado_en
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_perfiles_updated_at ON public.perfiles;

CREATE TRIGGER set_perfiles_updated_at
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS (Row Level Security)
-- Los usuarios solo pueden ver su propio perfil.
-- El Jefe de TI puede ver todos (usando service_role desde Edge Functions).
-- -----------------------------------------------------------------------------
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario autenticado puede leer su propio perfil
CREATE POLICY "perfiles_select_own"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- service_role tiene acceso total (Edge Functions, triggers administrativos)
CREATE POLICY "perfiles_service_role_all"
  ON public.perfiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
