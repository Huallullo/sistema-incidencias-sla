'use server';

import { ReporteFallasEquipoService } from '@/services/ReporteFallasEquipoService';
import {
  FiltroReporteFallas,
  ReporteFallasResult,
  filtroReporteFallasSchema,
} from '@/types/reporteFallasEquipo';
import { ReporteFallasEquipoRepository } from '@/repositories/ReporteFallasEquipoRepository';

export async function generarReporteFallasAction(
  filtros: FiltroReporteFallas,
  authUserId: string
): Promise<{ success: boolean; data?: ReporteFallasResult; error?: string }> {
  try {
    const validated = filtroReporteFallasSchema.safeParse(filtros);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Parámetros de filtrado inválidos.';
      return { success: false, error: firstError };
    }
    return await ReporteFallasEquipoService.generarReporte(validated.data, authUserId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el reporte en el servidor';
    return { success: false, error: msg };
  }
}

export async function obtenerListaEquiposAction(): Promise<{
  success: boolean;
  data?: { id_equipo: string; codigo: string; nombre: string }[];
  error?: string;
}> {
  try {
    const data = await ReporteFallasEquipoRepository.obtenerListaEquipos();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: 'Error al cargar la lista de equipos' };
  }
}
