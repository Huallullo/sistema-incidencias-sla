import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { ReporteSatisfaccionRepository } from '@/repositories/ReporteSatisfaccionRepository';
import { FiltroReporteSatisfaccion, ReporteSatisfaccionResult } from '@/types/reporteSatisfaccion';

export class ReporteSatisfaccionService {
  /**
   * Genera el reporte de evaluaciones de satisfacción.
   * Acceso exclusivo para el rol Jefe de TI (id_rol = 1).
   */
  static async generarReporte(
    filtros: FiltroReporteSatisfaccion,
    authUserId: string
  ): Promise<{ success: boolean; data?: ReporteSatisfaccionResult; error?: string }> {
    try {
      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta.' };
      }
      if (profile.id_rol !== 1) {
        return {
          success: false,
          error: 'Acceso restringido. Solo el Jefe de TI puede generar reportes de satisfacción.',
        };
      }

      return await ReporteSatisfaccionRepository.obtenerReporteSatisfaccion(filtros);
    } catch (err) {
      console.error('Exception in ReporteSatisfaccionService:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte';
      return { success: false, error: msg };
    }
  }
}
