'use server';

import { RegistroEquipoInput, EquipoInformatico, ActualizarEquipoInput, HistorialEstadoEquipo, DetalleEquipoInformatico } from '@/types/equipo';
import { EquiposService } from '@/services/EquiposService';

import { revalidatePath } from 'next/cache';

/**
 * Server Action para registrar un nuevo equipo informático
 */
export async function registrarEquipoAction(
  input: RegistroEquipoInput,
  userId: string
): Promise<{ success: boolean; data?: EquipoInformatico; error?: string }> {
  try {
    const res = await EquiposService.registrarEquipo(input, userId);
    if (res.success) {
      revalidatePath('/admin/equipos');
      revalidatePath('/dashboard/equipos');
      revalidatePath('/admin/reporte-fallas');
    }
    return res;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al registrar el equipo en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener la lista de todos los equipos registrados con filtros
 */
export async function obtenerEquiposAction(filters?: {
  query?: string;
  tipo?: string;
  ubicacion?: string;
  estado_operativo?: string;
}): Promise<{
  success: boolean;
  data?: EquipoInformatico[];
  error?: string;
}> {
  try {
    return await EquiposService.obtenerEquipos(filters);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener los equipos en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener el detalle de un equipo informático y sus incidencias
 */
export async function obtenerDetalleEquipoAction(
  idEquipo: string
): Promise<{ success: boolean; data?: DetalleEquipoInformatico; error?: string }> {
  try {
    return await EquiposService.obtenerDetalleEquipo(idEquipo);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener el detalle del equipo en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para actualizar la ficha de un equipo informático
 */
export async function actualizarEquipoAction(
  idEquipo: string,
  input: ActualizarEquipoInput,
  userId: string,
  observacion?: string
): Promise<{ success: boolean; data?: EquipoInformatico; error?: string }> {
  try {
    const res = await EquiposService.actualizarEquipo(idEquipo, input, userId, observacion);
    if (res.success) {
      revalidatePath('/admin/equipos');
      revalidatePath('/dashboard/equipos');
      revalidatePath('/admin/reporte-fallas');
    }
    return res;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el equipo en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener el historial de estados de un equipo informático
 */
export async function obtenerHistorialEstadosAction(
  idEquipo: string
): Promise<{ success: boolean; data?: HistorialEstadoEquipo[]; error?: string }> {
  try {
    return await EquiposService.obtenerHistorialEstados(idEquipo);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener el historial de estados en el servidor';
    return { success: false, error: errorMessage };
  }
}
