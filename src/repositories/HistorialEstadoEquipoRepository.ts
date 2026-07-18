import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { HistorialEstadoEquipo } from '@/types/equipo';

export class HistorialEstadoEquipoRepository {
  /**
   * Registra un cambio de estado en la base de datos
   */
  static async insert(data: {
    id_equipo: string;
    estado_anterior: string;
    estado_nuevo: string;
    observacion?: string;
    id_usuario_cambio: string;
  }): Promise<{ success: boolean; data?: HistorialEstadoEquipo; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: insertedData, error } = await client
        .from('historial_estado_equipo')
        .insert({
          id_equipo: data.id_equipo,
          estado_anterior: data.estado_anterior,
          estado_nuevo: data.estado_nuevo,
          observacion: data.observacion || null,
          id_usuario_cambio: data.id_usuario_cambio,
        })
        .select(`
          *,
          usuario_cambio:perfiles!id_usuario_cambio(nombre, apellido)
        `)
        .single();

      if (error) {
        console.error('Error in HistorialEstadoEquipoRepository.insert:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: insertedData as HistorialEstadoEquipo };
    } catch (err) {
      console.error('Exception in HistorialEstadoEquipoRepository.insert:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al registrar el historial de estado';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene el historial de estados de un equipo ordenado de forma descendente por fecha
   */
  static async findByEquipoId(
    idEquipo: string
  ): Promise<{ success: boolean; data?: HistorialEstadoEquipo[]; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('historial_estado_equipo')
        .select(`
          *,
          usuario_cambio:perfiles!id_usuario_cambio(nombre, apellido)
        `)
        .eq('id_equipo', idEquipo)
        .order('fecha_cambio', { ascending: false });

      if (error) {
        console.error('Error in HistorialEstadoEquipoRepository.findByEquipoId:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: (data as HistorialEstadoEquipo[]) || [] };
    } catch (err) {
      console.error('Exception in HistorialEstadoEquipoRepository.findByEquipoId:', err);
      return { success: false, error: 'Error inesperado al obtener el historial de estados' };
    }
  }
}
