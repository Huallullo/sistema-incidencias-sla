import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { PrioridadServicio, PrioridadInput } from '@/types/prioridadServicio';
import { translateError } from '@/utils/errorTranslator';

export class PrioridadServicioRepository {
  /**
   * Verifica si ya existe una prioridad con el mismo nivel (control de duplicados)
   */
  static async existePorNivel(
    nivel: string
  ): Promise<{ exists: boolean; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('prioridades_servicio')
        .select('id_prioridad')
        .eq('nivel', nivel)
        .maybeSingle();

      if (error) {
        console.error('Error in PrioridadServicioRepository.existePorNivel:', error);
        return { exists: false, error: translateError(error.message) };
      }

      return { exists: !!data };
    } catch (err) {
      console.error('Exception in PrioridadServicioRepository.existePorNivel:', err);
      return { exists: false, error: 'Error inesperado al verificar duplicados' };
    }
  }

  /**
   * Registra una nueva prioridad de servicio en la base de datos
   */
  static async insert(
    data: PrioridadInput & { creado_por: string }
  ): Promise<{ success: boolean; data?: PrioridadServicio; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: inserted, error } = await client
        .from('prioridades_servicio')
        .insert({
          nivel: data.nivel,
          descripcion: data.descripcion,
          tiempo_respuesta_min: data.tiempo_respuesta_min,
          tiempo_resolucion_min: data.tiempo_resolucion_min,
          escalamiento: data.escalamiento ?? null,
          creado_por: data.creado_por,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error in PrioridadServicioRepository.insert:', error);
        return { success: false, error: translateError(error.message) };
      }

      return { success: true, data: inserted as PrioridadServicio };
    } catch (err) {
      console.error('Exception in PrioridadServicioRepository.insert:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar prioridad';
      return { success: false, error: translateError(msg) };
    }
  }

  /**
   * Obtiene todas las prioridades de servicio registradas, ordenadas por nivel
   */
  static async getAll(): Promise<{ success: boolean; data?: PrioridadServicio[]; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('prioridades_servicio')
        .select(`
          *,
          registrador:perfiles!creado_por(nombre, apellido)
        `)
        .order('tiempo_respuesta_min', { ascending: true });

      if (error) {
        console.error('Error in PrioridadServicioRepository.getAll:', error);
        return { success: false, error: translateError(error.message) };
      }

      return { success: true, data: data as PrioridadServicio[] };
    } catch (err) {
      console.error('Exception in PrioridadServicioRepository.getAll:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al obtener prioridades';
      return { success: false, error: translateError(msg) };
    }
  }

  /**
   * Obtiene una prioridad por su ID
   */
  static async getById(
    id: string
  ): Promise<{ success: boolean; data?: PrioridadServicio; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('prioridades_servicio')
        .select('*')
        .eq('id_prioridad', id)
        .single();

      if (error) {
        return { success: false, error: translateError(error.message) };
      }

      return { success: true, data: data as PrioridadServicio };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      return { success: false, error: translateError(msg) };
    }
  }
}

