'use server';

import { ArticuloInput, ArticuloConocimiento } from '@/types/conocimiento';
import { ConocimientoService } from '@/services/ConocimientoService';

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
