'use server';

import { EvaluacionService } from '@/services/EvaluacionService';
import { 
  EvaluacionServicio, 
  RegistroEvaluacionInput, 
  registroEvaluacionSchema, 
  EvaluacionServicioDetallada, 
  ConsultaEvaluacionesFilter, 
  consultaEvaluacionesFilterSchema 
} from '@/types/evaluacion';

/**
 * Server Action para registrar una nueva evaluación de servicio
 */
export async function registrarEvaluacionAction(
  input: RegistroEvaluacionInput,
  userId: string
): Promise<{ success: boolean; data?: EvaluacionServicio; error?: string }> {
  try {
    // Validar esquema Zod
    const validated = registroEvaluacionSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Datos de evaluación inválidos.';
      return { success: false, error: firstError };
    }

    return await EvaluacionService.registrarEvaluacion(userId, validated.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al registrar la evaluación en el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Server Action para obtener la evaluación de una incidencia
 */
export async function obtenerEvaluacionTicketAction(
  idIncidencia: string
): Promise<{ success: boolean; data?: EvaluacionServicio | null; error?: string }> {
  try {
    const data = await EvaluacionService.obtenerEvaluacionPorIncidencia(idIncidencia);
    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al consultar la evaluación en el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Server Action para consultar las evaluaciones de servicio filtradas
 */
export async function consultarEvaluacionesAction(
  filters: ConsultaEvaluacionesFilter,
  authUserId: string
): Promise<{ success: boolean; data?: EvaluacionServicioDetallada[]; error?: string }> {
  try {
    // Validar filtros usando Zod
    const validated = consultaEvaluacionesFilterSchema.safeParse(filters);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Parámetros de búsqueda inválidos.';
      return { success: false, error: firstError };
    }

    return await EvaluacionService.consultarEvaluaciones(validated.data, authUserId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al consultar evaluaciones en el servidor';
    return { success: false, error: msg };
  }
}
