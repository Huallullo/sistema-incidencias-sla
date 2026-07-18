'use server';

import { ReporteSLAService } from '@/services/ReporteSLAService';
import { FiltroReporteSLA, ReporteSLAResult, filtroReporteSLASchema } from '@/types/reporteSLA';

/**
 * Server Action para generar el reporte de cumplimiento de SLA.
 * Exclusivo para el rol Jefe de TI.
 */
export async function generarReporteSLAAction(
  filtros: FiltroReporteSLA,
  authUserId: string
): Promise<{ success: boolean; data?: ReporteSLAResult; error?: string }> {
  try {
    // Validar los filtros con Zod
    const validated = filtroReporteSLASchema.safeParse(filtros);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Parámetros de filtrado inválidos.';
      return { success: false, error: firstError };
    }

    return await ReporteSLAService.generarReporte(validated.data, authUserId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el reporte SLA en el servidor';
    return { success: false, error: msg };
  }
}
