import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { ReporteFallasEquipoRepository } from '@/repositories/ReporteFallasEquipoRepository';
import { FiltroReporteFallas, ReporteFallasResult } from '@/types/reporteFallasEquipo';

export class ReporteFallasEquipoService {
  /**
   * Genera el reporte de historial de fallas por equipo informático.
   * Acceso exclusivo para el rol Jefe de TI (id_rol = 1).
   */
  static async generarReporte(
    filtros: FiltroReporteFallas,
    authUserId: string
  ): Promise<{ success: boolean; data?: ReporteFallasResult; error?: string }> {
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
          error: 'Acceso restringido. Solo el Jefe de TI puede generar reportes de historial de fallas.',
        };
      }

      return await ReporteFallasEquipoRepository.obtenerReporteFallas(filtros);
    } catch (err) {
      console.error('Exception in ReporteFallasEquipoService:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte';
      return { success: false, error: msg };
    }
  }
}
