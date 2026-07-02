import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { HistorialEstadoTicket } from '@/types/incidencias';

export class HistorialEstadoTicketRepository {
  /**
   * Registra un cambio de estado en el historial
   */
  static async insert(data: {
    id_incidencia: string;
    estado_anterior: string;
    estado_nuevo: string;
    id_perfil_responsable: string;
  }): Promise<{ success: boolean; data?: HistorialEstadoTicket; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: insertedData, error } = await client
        .from('historial_estado_ticket')
        .insert({
          id_incidencia: data.id_incidencia,
          estado_anterior: data.estado_anterior,
          estado_nuevo: data.estado_nuevo,
          id_perfil_responsable: data.id_perfil_responsable,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error in HistorialEstadoTicketRepository.insert:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: insertedData as HistorialEstadoTicket };
    } catch (err) {
      console.error('Exception in HistorialEstadoTicketRepository.insert:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al persistir el historial';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene todos los cambios de estado de una incidencia específica
   */
  static async getByIncidenciaId(
    incidenciaId: string
  ): Promise<{ success: boolean; data?: HistorialEstadoTicket[]; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('historial_estado_ticket')
        .select(`
          *,
          responsable:perfiles!id_perfil_responsable(nombre, apellido)
        `)
        .eq('id_incidencia', incidenciaId)
        .order('creado_en', { ascending: true });

      if (error) {
        console.error('Error in HistorialEstadoTicketRepository.getByIncidenciaId:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as HistorialEstadoTicket[] };
    } catch (err) {
      console.error('Exception in HistorialEstadoTicketRepository.getByIncidenciaId:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al recuperar el historial';
      return { success: false, error: errorMessage };
    }
  }
}
