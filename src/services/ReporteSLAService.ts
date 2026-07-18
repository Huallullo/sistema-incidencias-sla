import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { ReporteSLARepository } from '@/repositories/ReporteSLARepository';
import { FiltroReporteSLA, ReporteSLAResult } from '@/types/reporteSLA';

export class ReporteSLAService {
  /**
   * Genera el reporte de cumplimiento de SLA.
   * Exclusivo para el rol Jefe de TI (id_rol = 1).
   */
  static async generarReporte(
    filtros: FiltroReporteSLA,
    authUserId: string
  ): Promise<{ success: boolean; data?: ReporteSLAResult; error?: string }> {
    try {
      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 1. Validar el rol del usuario (debe ser Jefe de TI, id_rol = 1)
      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta.' };
      }

      if (profile.id_rol !== 1) {
        return {
          success: false,
          error: 'Acceso restringido. Solo el Jefe de TI puede generar reportes de cumplimiento de SLA.',
        };
      }

      // 2. Delegar al repositorio
      return await ReporteSLARepository.obtenerReporteSLA(filtros);
    } catch (err) {
      console.error('Exception in ReporteSLAService.generarReporte:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte de SLA';
      return { success: false, error: msg };
    }
  }
}
