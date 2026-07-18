import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { ReporteCargaTrabajoRepository } from '@/repositories/ReporteCargaTrabajoRepository';
import { FiltroReporteCarga, ReporteCargaResult } from '@/types/reporteCargaTrabajo';

export class ReporteCargaTrabajoService {
  /**
   * Genera el reporte de carga de trabajo de los técnicos.
   * Acceso exclusivo para el rol Jefe de TI (id_rol = 1).
   */
  static async generarReporte(
    filtros: FiltroReporteCarga,
    authUserId: string
  ): Promise<{ success: boolean; data?: ReporteCargaResult; error?: string }> {
    try {
      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // Verificar que el usuario sea Jefe de TI
      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta.' };
      }
      if (profile.id_rol !== 1) {
        return {
          success: false,
          error: 'Acceso restringido. Solo el Jefe de TI puede generar reportes de carga de trabajo.',
        };
      }

      return await ReporteCargaTrabajoRepository.obtenerReporteCarga(filtros);
    } catch (err) {
      console.error('Exception in ReporteCargaTrabajoService:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte de carga';
      return { success: false, error: msg };
    }
  }
}
