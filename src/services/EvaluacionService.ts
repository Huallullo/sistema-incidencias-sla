import { EvaluacionRepository } from '@/repositories/EvaluacionRepository';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { EvaluacionServicio, RegistroEvaluacionInput, EvaluacionServicioDetallada, ConsultaEvaluacionesFilter } from '@/types/evaluacion';

export class EvaluacionService {
  /**
   * Registra una evaluación del servicio para un ticket de incidencia
   */
  static async registrarEvaluacion(
    userId: string,
    input: RegistroEvaluacionInput
  ): Promise<{ success: boolean; data?: EvaluacionServicio; error?: string }> {
    try {
      // 1. Obtener la incidencia
      const ticketRes = await IncidenciasRepository.getById(input.id_incidencia);
      if (!ticketRes.success || !ticketRes.data) {
        return { success: false, error: 'La incidencia especificada no existe.' };
      }
      const ticket = ticketRes.data;

      // 2. Validar que el usuario sea el creador del ticket (propietario)
      if (ticket.creado_por !== userId) {
        return { success: false, error: 'Acceso denegado. Solo el usuario propietario del ticket puede evaluarlo.' };
      }

      // 3. Validar que el ticket esté en estado Cerrado
      if (ticket.estado !== 'cerrado') {
        return { success: false, error: 'La incidencia debe estar en estado "cerrado" para poder ser evaluada.' };
      }

      // 4. Validar que no exista una evaluación previa para este ticket
      const existing = await EvaluacionRepository.findByIncidenciaId(input.id_incidencia);
      if (existing) {
        return { success: false, error: 'Ya existe una evaluación registrada para esta incidencia.' };
      }

      // 5. Proceder al registro
      return await EvaluacionRepository.insert({
        id_incidencia: input.id_incidencia,
        creado_por: userId,
        calificacion: input.calificacion,
        comentario: input.comentario || null,
      });
    } catch (err) {
      console.error('Exception in EvaluacionService.registrarEvaluacion:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al procesar la evaluación';
      return { success: false, error: msg };
    }
  }

  /**
   * Obtiene la evaluación asociada a una incidencia
   */
  static async obtenerEvaluacionPorIncidencia(
    idIncidencia: string
  ): Promise<EvaluacionServicio | null> {
    return await EvaluacionRepository.findByIncidenciaId(idIncidencia);
  }

  /**
   * Consulta las evaluaciones de servicio registradas (Exclusivo para el Jefe de TI)
   */
  static async consultarEvaluaciones(
    filters: ConsultaEvaluacionesFilter,
    authUserId: string
  ): Promise<{ success: boolean; data?: EvaluacionServicioDetallada[]; error?: string }> {
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
        return { success: false, error: 'Acceso restringido. Solo el Jefe de TI puede consultar las evaluaciones de servicio.' };
      }

      // 2. Ejecutar consulta
      return await EvaluacionRepository.queryEvaluaciones(filters);
    } catch (err) {
      console.error('Exception in EvaluacionService.consultarEvaluaciones:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al consultar las evaluaciones';
      return { success: false, error: msg };
    }
  }
}
