'use server';

import { ReporteCargaTrabajoService } from '@/services/ReporteCargaTrabajoService';
import {
  FiltroReporteCarga,
  ReporteCargaResult,
  filtroReporteCargaSchema,
} from '@/types/reporteCargaTrabajo';

/**
 * Server Action para generar el reporte de carga de trabajo de los técnicos.
 * Exclusivo para el rol Jefe de TI.
 */
export async function generarReporteCargaAction(
  filtros: FiltroReporteCarga,
  authUserId: string
): Promise<{ success: boolean; data?: ReporteCargaResult; error?: string }> {
  try {
    const validated = filtroReporteCargaSchema.safeParse(filtros);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Parámetros de filtrado inválidos.';
      return { success: false, error: firstError };
    }

    return await ReporteCargaTrabajoService.generarReporte(validated.data, authUserId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el reporte en el servidor';
    return { success: false, error: msg };
  }
}
