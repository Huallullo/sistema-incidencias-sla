-- =============================================================================
-- SCRIPT 4: TABLA EMAIL_LOGS (mock de correo)
-- HU-002 — Punto 2.3: Desarrollo de Automatización (Edge/Triggers)
--
-- NOTA: El trigger en auth.users fue reemplazado por automatización
-- en la Edge Function register-user (equivalente funcional).
-- Supabase SQL Editor no permite CREATE TRIGGER en auth.users en proyectos
-- con plan gratuito (error 42501 — restricted permissions).
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- =============================================================================

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
  'HU-002 / 2.3 — Mock del servicio de correo. La Edge Function register-user inserta aquí cada notificación de bienvenida.';

-- RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve solo sus propios registros
CREATE POLICY email_logs_select_own ON public.email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- service_role (Edge Functions) tiene acceso total
CREATE POLICY email_logs_service_role_all ON public.email_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── VERIFICACIÓN ──────────────────────────────────────────────────────────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'email_logs'
-- ORDER BY ordinal_position;
