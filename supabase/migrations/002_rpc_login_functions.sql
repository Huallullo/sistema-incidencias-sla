-- =============================================================================
-- SCRIPT 5: FUNCIONES RPC FALTANTES
-- Solución al error: "Error resetting failed login attempts: {}"
--
-- PROBLEMA: AuthService.ts llama RPCs con nombre y parámetros distintos
-- a los que existen en la base de datos.
--
-- AuthService llama:              SQL tiene:
--   handle_failed_login(email)  → increment_failed_login(user_id UUID) ❌
--   reset_failed_login_attempts(email) → reset_failed_login(user_id UUID) ❌
--
-- SOLUCIÓN: Crear las funciones que el código TypeScript espera,
-- buscando el user_id internamente a partir del email.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 5.1 handle_failed_login(user_email TEXT)
-- Llamada desde AuthService.handleFailedLogin(email) cuando el login falla.
-- Incrementa intentos y bloquea si llega a 3.
-- Retorna: { blocked, attempts, blocked_until, message }
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_failed_login(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_intentos       INT;
  v_bloqueado_hasta TIMESTAMPTZ;
BEGIN
  -- Buscar el user_id en auth.users por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  -- Si no existe el usuario, devolver estado neutral (no bloqueado)
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'blocked',       false,
      'attempts',      0,
      'blocked_until', NULL,
      'message',       'Usuario no encontrado'
    );
  END IF;

  -- Incrementar el contador de intentos fallidos
  UPDATE perfiles
  SET intentos_fallidos = intentos_fallidos + 1
  WHERE user_id = v_user_id
  RETURNING intentos_fallidos, bloqueado_hasta
    INTO v_intentos, v_bloqueado_hasta;

  -- Si llega a 3 intentos, bloquear por 15 minutos
  IF v_intentos >= 3 THEN
    UPDATE perfiles
    SET bloqueado_hasta = now() + interval '15 minutes'
    WHERE user_id = v_user_id;

    v_bloqueado_hasta := now() + interval '15 minutes';

    RETURN jsonb_build_object(
      'blocked',       true,
      'attempts',      v_intentos,
      'blocked_until', v_bloqueado_hasta,
      'message',       'Cuenta bloqueada por 3 intentos fallidos'
    );
  END IF;

  -- No bloqueado aún
  RETURN jsonb_build_object(
    'blocked',       false,
    'attempts',      v_intentos,
    'blocked_until', NULL,
    'message',       format('Intento fallido %s de 3', v_intentos)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_failed_login] Error para %: %', user_email, SQLERRM;
    RETURN jsonb_build_object(
      'blocked',  false,
      'attempts', 0,
      'blocked_until', NULL,
      'message',  'Error interno'
    );
END;
$$;

COMMENT ON FUNCTION handle_failed_login(TEXT) IS
  'HU-001: Incrementa intentos fallidos de login por email. Bloquea la cuenta 15 min al llegar a 3 intentos.';


-- -----------------------------------------------------------------------------
-- 5.2 reset_failed_login_attempts(user_email TEXT)
-- Llamada desde AuthService.resetFailedLoginAttempts(email) tras login exitoso.
-- Reinicia el contador de intentos fallidos y elimina el bloqueo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar el user_id por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN; -- No hay nada que resetear
  END IF;

  UPDATE perfiles
  SET intentos_fallidos = 0,
      bloqueado_hasta   = NULL
  WHERE user_id = v_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[reset_failed_login_attempts] Error para %: %', user_email, SQLERRM;
END;
$$;

COMMENT ON FUNCTION reset_failed_login_attempts(TEXT) IS
  'HU-001: Resetea el contador de intentos fallidos tras un login exitoso.';
