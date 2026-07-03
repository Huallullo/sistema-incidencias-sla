import { ArticuloInput, registroArticuloSchema, ArticuloConocimiento } from '@/types/conocimiento';
import { ArticuloConocimientoRepository } from '@/repositories/ArticuloConocimientoRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { translateError } from '@/utils/errorTranslator';

export class ConocimientoService {
  /**
   * Valida y registra un nuevo artículo de conocimiento
   */
  static async registrarArticulo(
    input: ArticuloInput,
    authUserId: string
  ): Promise<{ success: boolean; data?: ArticuloConocimiento; error?: string }> {
    try {
      // 1. Validar los parámetros utilizando el esquema Zod
      const validationResult = registroArticuloSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((e) => e.message).join(', ');
        return { success: false, error: errorMessages };
      }

      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 2. Obtener el perfil del autor y validar que tenga rol autorizado (Técnico: 2, Jefe de TI: 1)
      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta' };
      }

      if (profile.id_rol !== 1 && profile.id_rol !== 2) {
        return {
          success: false,
          error: 'Acceso denegado. Solo los roles Técnico y Jefe de TI pueden registrar artículos de conocimiento.',
        };
      }

      // 3. Si se vincula un ticket, verificar que exista y se encuentre en estado resuelto o cerrado
      if (input.id_incidencia) {
        const ticketResult = await IncidenciasRepository.getById(input.id_incidencia);
        if (!ticketResult.success || !ticketResult.data) {
          return {
            success: false,
            error: 'El ticket seleccionado no existe o no se pudo verificar.',
          };
        }

        const ticket = ticketResult.data;
        if (ticket.estado !== 'resuelto' && ticket.estado !== 'cerrado') {
          return {
            success: false,
            error: 'El ticket seleccionado debe estar en estado resuelto o cerrado para vincularlo a un artículo.',
          };
        }
      }

      // 4. Registrar artículo
      const insertResult = await ArticuloConocimientoRepository.insert({
        titulo: input.titulo,
        categoria: input.categoria,
        descripcion_problema: input.descripcion_problema,
        solucion_pasos: input.solucion_pasos,
        id_incidencia: input.id_incidencia || null,
        autor_id: profile.id_perfil,
      });

      if (!insertResult.success) {
        return { success: false, error: translateError(insertResult.error) };
      }

      return { success: true, data: insertResult.data };
    } catch (err) {
      console.error('Exception in ConocimientoService.registrarArticulo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al registrar el artículo';
      return { success: false, error: translateError(errorMessage) };
    }
  }

  /**
   * Obtiene la lista de artículos aplicando filtros
   */
  static async obtenerArticulos(filters?: {
    query?: string;
    categoria?: string;
  }): Promise<{ success: boolean; data?: ArticuloConocimiento[]; error?: string }> {
    try {
      const result = await ArticuloConocimientoRepository.getAll(filters);
      if (!result.success) {
        return { success: false, error: translateError(result.error) };
      }
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Exception in ConocimientoService.obtenerArticulos:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener artículos';
      return { success: false, error: translateError(errorMessage) };
    }
  }
}
