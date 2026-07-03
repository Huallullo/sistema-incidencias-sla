import { PrioridadInput, registroPrioridadSchema, PrioridadServicio } from '@/types/prioridadServicio';
import { PrioridadServicioRepository } from '@/repositories/PrioridadServicioRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

export class PrioridadesService {
  /**
   * Valida el rol, duplicados, tiempos SLA y registra la prioridad de servicio
   */
  static async registrarPrioridad(
    input: PrioridadInput,
    userId: string
  ): Promise<{ success: boolean; data?: PrioridadServicio; error?: string }> {
    try {
      // 1. Verificar sesión activa
      if (!userId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 2. Obtener perfil y validar rol: solo 'jefe_ti' (id_rol = 2) puede registrar
      const profile = await PerfilesRepository.getProfileByUserId(userId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta.' };
      }
      if (profile.rol !== 'jefe_ti') {
        return {
          success: false,
          error: 'Acceso denegado. Solo el Jefe de TI puede registrar prioridades de servicio.',
        };
      }

      // 3. Validar esquema Zod (tiempos, nivel, descripción)
      const validation = registroPrioridadSchema.safeParse(input);
      if (!validation.success) {
        const messages = validation.error.issues.map((e) => e.message).join('. ');
        return { success: false, error: messages };
      }

      // 4. Verificar duplicidad de nivel
      const duplicate = await PrioridadServicioRepository.existePorNivel(input.nivel);
      if (duplicate.error) {
        return { success: false, error: duplicate.error };
      }
      if (duplicate.exists) {
        return {
          success: false,
          error: `Ya existe una prioridad con el nivel "${input.nivel}". No se permiten duplicados.`,
        };
      }

      // 5. Persistir en base de datos
      const result = await PrioridadServicioRepository.insert({
        ...validation.data,
        creado_por: profile.id_perfil,
      });

      return result;
    } catch (err) {
      console.error('Exception in PrioridadesService.registrarPrioridad:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar la prioridad';
      return { success: false, error: msg };
    }
  }

  /**
   * Obtiene la lista completa de prioridades disponibles (acceso público para tickets)
   */
  static async obtenerPrioridades(): Promise<{
    success: boolean;
    data?: PrioridadServicio[];
    error?: string;
  }> {
    return PrioridadServicioRepository.getAll();
  }
}
