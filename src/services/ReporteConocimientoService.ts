import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { ReporteConocimientoRepository } from '@/repositories/ReporteConocimientoRepository';
import { FiltroReporteConocimiento, ReporteConocimientoResult } from '@/types/reporteConocimiento';

export class ReporteConocimientoService {
  /**
   * Genera el reporte de los artículos de conocimiento más consultados.
   * Acceso exclusivo para el rol Jefe de TI (id_rol = 1).
   */
  static async generarReporte(
    filtros: FiltroReporteConocimiento,
    authUserId: string
  ): Promise<{ success: boolean; data?: ReporteConocimientoResult; error?: string }> {
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
          error: 'Acceso restringido. Solo el Jefe de TI puede generar reportes de la base de conocimientos.',
        };
      }

      return await ReporteConocimientoRepository.obtenerReporteConocimiento(filtros);
    } catch (err) {
      console.error('Exception in ReporteConocimientoService:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte';
      return { success: false, error: msg };
    }
  }
}
