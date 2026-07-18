'use server';

import { ReporteSatisfaccionService } from '@/services/ReporteSatisfaccionService';
import {
  FiltroReporteSatisfaccion,
  ReporteSatisfaccionResult,
  filtroReporteSatisfaccionSchema,
} from '@/types/reporteSatisfaccion';

export async function generarReporteSatisfaccionAction(
  filtros: FiltroReporteSatisfaccion,
  authUserId: string
): Promise<{ success: boolean; data?: ReporteSatisfaccionResult; error?: string }> {
  try {
    const validated = filtroReporteSatisfaccionSchema.safeParse(filtros);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Parámetros de filtrado inválidos.';
      return { success: false, error: firstError };
    }
    return await ReporteSatisfaccionService.generarReporte(validated.data, authUserId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el reporte en el servidor';
    return { success: false, error: msg };
  }
}
