'use server';

import { ReporteConocimientoService } from '@/services/ReporteConocimientoService';
import {
  FiltroReporteConocimiento,
  ReporteConocimientoResult,
  filtroReporteConocimientoSchema,
} from '@/types/reporteConocimiento';

export async function generarReporteConocimientoAction(
  filtros: FiltroReporteConocimiento,
  authUserId: string
): Promise<{ success: boolean; data?: ReporteConocimientoResult; error?: string }> {
  try {
    const validated = filtroReporteConocimientoSchema.safeParse(filtros);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Parámetros de filtrado inválidos.';
      return { success: false, error: firstError };
    }
    return await ReporteConocimientoService.generarReporte(validated.data, authUserId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el reporte en el servidor';
    return { success: false, error: msg };
  }
}
