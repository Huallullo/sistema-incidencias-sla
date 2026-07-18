'use server';

import { ArticuloInput, ArticuloConocimiento } from '@/types/conocimiento';
import { ConocimientoService } from '@/services/ConocimientoService';
import { ArticuloConocimientoRepository } from '@/repositories/ArticuloConocimientoRepository';

/**
 * Server Action para registrar un nuevo artículo de conocimiento
 */
export async function registrarArticuloAction(
  input: ArticuloInput,
  userId: string
): Promise<{ success: boolean; data?: ArticuloConocimiento; error?: string }> {
  try {
    return await ConocimientoService.registrarArticulo(input, userId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al registrar el artículo en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener la lista filtrada de artículos de conocimiento
 */
export async function obtenerArticulosAction(filters?: {
  query?: string;
  categoria?: string;
}): Promise<{ success: boolean; data?: ArticuloConocimiento[]; error?: string }> {
  try {
    return await ConocimientoService.obtenerArticulos(filters);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al obtener artículos en el servidor';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para obtener el artículo de conocimiento de una incidencia
 */
export async function obtenerArticuloPorIncidenciaAction(
  idIncidencia: string
): Promise<{ success: boolean; data?: ArticuloConocimiento | null; error?: string }> {
  try {
    const data = await ArticuloConocimientoRepository.findByIncidenciaId(idIncidencia);
    return { success: true, data };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error al buscar el artículo de conocimiento';
    return { success: false, error: errorMessage };
  }
}

/**
 * Server Action para registrar una consulta (vista) a un artículo de conocimiento
 */
export async function registrarConsultaAction(
  idArticulo: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await ConocimientoService.registrarConsulta(idArticulo, userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al registrar consulta en el servidor';
    return { success: false, error: msg };
  }
}
