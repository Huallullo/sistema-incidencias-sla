import { IncidenciaInput, registroIncidenciaSchema, Incidencia } from '@/types/incidencias';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

export class IncidenciasService {
  /**
   * Valida y registra una nueva incidencia en el sistema
   */
  static async registrarIncidencia(
    input: IncidenciaInput,
    userId: string
  ): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
    try {
      // 1. Validar los parámetros utilizando el esquema Zod
      const validationResult = registroIncidenciaSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((e) => e.message).join(', ');
        return { success: false, error: errorMessages };
      }

      if (!userId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 2. Obtener el perfil del usuario para asociar su id_perfil interno
      const profile = await PerfilesRepository.getProfileByUserId(userId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta' };
      }

      // 3. Registrar la incidencia asociando el creador detectado
      return await IncidenciasRepository.insert({
        titulo: input.titulo,
        descripcion: input.descripcion,
        categoria: input.categoria,
        prioridad: input.prioridad,
        creado_por: profile.id_perfil,
      });
    } catch (err) {
      console.error('Exception in IncidenciasService.registrarIncidencia:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al registrar incidencia';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene la lista de incidencias asociadas al usuario actual
   */
  static async obtenerIncidenciasDeUsuario(
    userId: string
  ): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
    try {
      if (!userId) {
        return { success: false, error: 'Usuario no identificado' };
      }

      const profile = await PerfilesRepository.getProfileByUserId(userId);
      if (!profile) {
        return { success: false, error: 'Perfil no encontrado' };
      }

      return await IncidenciasRepository.getByCreadoPor(profile.id_perfil);
    } catch (err) {
      console.error('Exception in IncidenciasService.obtenerIncidenciasDeUsuario:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener incidencias del usuario';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene la lista global de todas las incidencias (para personal de soporte)
   */
  static async obtenerTodasLasIncidencias(): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
    try {
      return await IncidenciasRepository.getAll();
    } catch (err) {
      console.error('Exception in IncidenciasService.obtenerTodasLasIncidencias:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener incidencias globales';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Consulta incidencias filtradas aplicando las reglas de negocio del rol del usuario
   */
  static async consultarIncidencias(
    userId: string,
    filtros: {
      estado?: string;
      prioridad?: string;
      categoria?: string;
      fechaInicio?: string;
      fechaFin?: string;
      busqueda?: string;
    }
  ): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
    try {
      if (!userId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 1. Obtener el perfil y rol del usuario
      const profile = await PerfilesRepository.getProfileByUserId(userId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta' };
      }

      // 2. Consultar incidencias delegando al repositorio con el rol del usuario
      return await IncidenciasRepository.queryTickets(
        profile.rol,
        profile.id_perfil,
        filtros
      );
    } catch (err) {
      console.error('Exception in IncidenciasService.consultarIncidencias:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al consultar incidencias';
      return { success: false, error: errorMessage };
    }
  }
}
