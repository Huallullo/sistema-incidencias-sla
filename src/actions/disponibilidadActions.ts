'use server';

import { 
  DisponibilidadTecnico, 
  RegistroDisponibilidadInput, 
  RegistroRangoDisponibilidadInput 
} from '@/types/disponibilidad';
import { DisponibilidadService } from '@/services/DisponibilidadService';

/**
 * Server Action para registrar disponibilidad individual (fecha única)
 */
export async function registrarDisponibilidadAction(
  input: RegistroDisponibilidadInput,
  userId: string
): Promise<{ success: boolean; data?: DisponibilidadTecnico; error?: string }> {
  try {
    return await DisponibilidadService.registrarDisponibilidad(userId, input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al registrar disponibilidad en el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Server Action para registrar disponibilidad por rango de fechas
 */
export async function registrarRangoDisponibilidadAction(
  input: RegistroRangoDisponibilidadInput,
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    return await DisponibilidadService.registrarRangoDisponibilidad(userId, input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al registrar rango de disponibilidad en el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Server Action para actualizar la disponibilidad de un técnico
 */
export async function actualizarDisponibilidadAction(
  id: string,
  input: {
    fecha?: string;
    hora_inicio?: string;
    hora_fin?: string;
    turno?: 'mañana' | 'tarde' | 'noche';
    estado?: 'disponible' | 'no_disponible';
  },
  userId: string
): Promise<{ success: boolean; data?: DisponibilidadTecnico; error?: string }> {
  try {
    return await DisponibilidadService.actualizarDisponibilidad(userId, id, input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar la disponibilidad en el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Server Action para eliminar un registro de disponibilidad
 */
export async function eliminarDisponibilidadAction(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await DisponibilidadService.eliminarDisponibilidad(userId, id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar la disponibilidad en el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Server Action para obtener la lista de disponibilidades de técnicos con filtros
 */
export async function obtenerDisponibilidadesAction(
  filters: {
    id_tecnico?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    turno?: string;
    estado?: string;
  },
  userId: string
): Promise<{ success: boolean; data?: DisponibilidadTecnico[]; error?: string }> {
  try {
    const data = await DisponibilidadService.obtenerDisponibilidades(userId, filters);
    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener disponibilidades en el servidor';
    return { success: false, error: msg };
  }
}

/**
 * Server Action para obtener todos los perfiles de técnicos
 */
export async function obtenerTecnicosAction(): Promise<{ success: boolean; data?: import('@/types/auth').PerfilUsuario[]; error?: string }> {
  try {
    const { UsuariosService } = await import('@/services/UsuariosService');
    const res = await UsuariosService.getUsers({ rol: 'tecnico', limit: 100 });
    return { success: res.success, data: res.data as import('@/types/auth').PerfilUsuario[], error: res.error };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener técnicos';
    return { success: false, error: msg };
  }
}
