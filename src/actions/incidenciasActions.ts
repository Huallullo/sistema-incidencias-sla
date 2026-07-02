'use server';

import { IncidenciaInput, Incidencia, EstadoIncidencia, HistorialEstadoTicket } from '@/types/incidencias';
import { IncidenciasService } from '@/services/IncidenciasService';
import { HistorialEstadoTicketRepository } from '@/repositories/HistorialEstadoTicketRepository';

/**
 * Server Action para registrar una nueva incidencia
 */
export async function registrarIncidenciaAction(
  input: IncidenciaInput,
  userId: string
): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
  try {
    return await IncidenciasService.registrarIncidencia(input, userId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al registrar incidencia en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener las incidencias creadas por el usuario autenticado
 */
export async function obtenerIncidenciasDeUsuarioAction(
  userId: string
): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
  try {
    return await IncidenciasService.obtenerIncidenciasDeUsuario(userId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener incidencias en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener la lista global de todas las incidencias (soporte)
 */
export async function obtenerTodasLasIncidenciasAction(): Promise<{
  success: boolean;
  data?: Incidencia[];
  error?: string;
}> {
  try {
    return await IncidenciasService.obtenerTodasLasIncidencias();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener incidencias globales en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para consultar incidencias con filtros y visibilidad por rol
 */
export async function consultarIncidenciasAction(
  userId: string,
  filtros: {
    estado?: string;
    prioridad?: string;
    categoria?: string;
    fechaInicio?: string;
    fechaFin?: string;
    busqueda?: string;
  }
): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
  try {
    return await IncidenciasService.consultarIncidencias(userId, filtros);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al consultar incidencias en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para actualizar el estado de un ticket
 */
export async function actualizarEstadoTicketAction(
  incidenciaId: string,
  nuevoEstado: EstadoIncidencia,
  userId: string
): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
  try {
    return await IncidenciasService.actualizarEstadoTicket(incidenciaId, nuevoEstado, userId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el estado de la incidencia en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener el historial de cambios de un ticket
 */
export async function obtenerHistorialTicketAction(
  incidenciaId: string
): Promise<{ success: boolean; data?: HistorialEstadoTicket[]; error?: string }> {
  try {
    return await HistorialEstadoTicketRepository.getByIncidenciaId(incidenciaId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener el historial de la incidencia en el servidor';
    return { success: false, error: errorMessage };
  }
}
