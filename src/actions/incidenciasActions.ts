'use server';

import { IncidenciaInput, Incidencia, EstadoIncidencia, HistorialEstadoTicket, cierreTicketSchema } from '@/types/incidencias';
import { IncidenciasService } from '@/services/IncidenciasService';
import { HistorialEstadoTicketRepository } from '@/repositories/HistorialEstadoTicketRepository';
import { UsuariosService } from '@/services/UsuariosService';
import { PerfilUsuario } from '@/types/auth';

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

/**
 * Server Action para obtener todos los técnicos registrados en el sistema
 */
export async function obtenerTecnicosAction(): Promise<{ success: boolean; data?: PerfilUsuario[]; error?: string }> {
  try {
    const res = await UsuariosService.getUsers({ rol: 'tecnico', limit: 100 });
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Error al obtener los técnicos' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener técnicos en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para asignar un técnico a una incidencia
 */
export async function asignarTecnicoAction(
  incidenciaId: string,
  tecnicoId: string | null,
  userId: string
): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
  try {
    return await IncidenciasService.asignarTecnico(incidenciaId, tecnicoId, userId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al asignar el técnico en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para que el Jefe de TI audite y realice el cierre definitivo de un ticket
 */
export async function cerrarTicketAuditadoAction(
  incidenciaId: string,
  observaciones: string,
  userId: string
): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
  try {
    const validated = cierreTicketSchema.safeParse({
      id_incidencia: incidenciaId,
      observaciones_cierre: observaciones,
    });

    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Datos de cierre de ticket inválidos.';
      return { success: false, error: firstError };
    }

    return await IncidenciasService.cerrarTicketAuditado(incidenciaId, observaciones, userId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al auditar y cerrar la incidencia en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener todos los usuarios reportantes registrados en el sistema
 */
export async function obtenerUsuariosAction(): Promise<{ success: boolean; data?: PerfilUsuario[]; error?: string }> {
  try {
    const res = await UsuariosService.getUsers({ rol: 'usuario', limit: 100 });
    if (res.success && res.data) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Error al obtener los usuarios' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener usuarios en el servidor';
    return { success: false, error: errorMessage };
  }
}
