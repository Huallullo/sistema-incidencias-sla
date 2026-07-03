/**
 * Traduce errores técnicos comunes de Supabase/PostgreSQL a mensajes legibles en español
 */
export function translateError(errorMsg: string | undefined | null): string {
  if (!errorMsg) return 'Error inesperado en el sistema.';

  const msg = errorMsg.toLowerCase();

  // Errores de tabla o columna inexistente (schema cache)
  if (msg.includes('could not find the table') || msg.includes('does not exist') || msg.includes('relation') && msg.includes('does not exist')) {
    return 'La tabla de prioridades no está creada en la base de datos. Por favor, ejecute el script DDL (Script_DDL_HU009.sql) en el SQL Editor de Supabase para crearla.';
  }

  // Errores de clave única / duplicados
  if (msg.includes('duplicate key value violates unique constraint') || msg.includes('already exists')) {
    return 'Ya existe un registro con este nivel de prioridad. No se permiten duplicados.';
  }

  // Errores de RLS / Permisos
  if (msg.includes('row-level security') || msg.includes('violates row-level security policy') || msg.includes('permission denied') || msg.includes('cannot coerce') || msg.includes('single json object')) {
    return 'Acceso denegado. No tiene permisos suficientes en la base de datos para realizar esta acción.';
  }

  // Errores de red o conexión
  if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Error de conexión con la base de datos. Por favor, verifique su conexión a internet.';
  }

  // Errores de clave foránea
  if (msg.includes('violates foreign key constraint')) {
    return 'Error de integridad referencial. El usuario creador no es válido en el sistema.';
  }

  // Retorno por defecto si no coincide con ninguno anterior
  return errorMsg;
}
