import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { EvaluacionServicio, EvaluacionServicioDetallada, ConsultaEvaluacionesFilter } from '@/types/evaluacion';

export class EvaluacionRepository {
  /**
   * Inserta un nuevo registro de evaluación en la base de datos
   */
  static async insert(data: {
    id_incidencia: string;
    creado_por: string;
    calificacion: number;
    comentario: string | null;
  }): Promise<{ success: boolean; data?: EvaluacionServicio; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: inserted, error } = await client
        .from('evaluacion_servicio')
        .insert({
          id_incidencia: data.id_incidencia,
          creado_por: data.creado_por,
          calificacion: data.calificacion,
          comentario: data.comentario,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error in EvaluacionRepository.insert:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: inserted as unknown as EvaluacionServicio };
    } catch (err) {
      console.error('Exception in EvaluacionRepository.insert:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar la evaluación';
      return { success: false, error: msg };
    }
  }

  /**
   * Busca la evaluación de una incidencia por su ID
   */
  static async findByIncidenciaId(idIncidencia: string): Promise<EvaluacionServicio | null> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('evaluacion_servicio')
        .select('*')
        .eq('id_incidencia', idIncidencia)
        .maybeSingle();

      if (error) {
        console.error('Error in EvaluacionRepository.findByIncidenciaId:', error);
        return null;
      }

      return data as unknown as EvaluacionServicio;
    } catch (err) {
      console.error('Exception in EvaluacionRepository.findByIncidenciaId:', err);
      return null;
    }
  }

  /**
   * Obtiene la lista de evaluaciones filtradas aplicando joins relacionales
   */
  static async queryEvaluaciones(
    filters?: ConsultaEvaluacionesFilter
  ): Promise<{ success: boolean; data?: EvaluacionServicioDetallada[]; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      let queryBuilder = client
        .from('evaluacion_servicio')
        .select(`
          *,
          incidencia:incidencias!id_incidencia(
            id_incidencia,
            codigo_ticket,
            titulo,
            creado_por,
            asignado_a,
            creador:perfiles!creado_por(id_perfil, nombre, apellido),
            asignado:perfiles!asignado_a(id_perfil, nombre, apellido)
          )
        `);

      // 1. Filtrar por calificación si corresponde
      if (filters?.calificacion && filters.calificacion !== 'todas') {
        const ratingNum = parseInt(filters.calificacion, 10);
        if (!isNaN(ratingNum)) {
          queryBuilder = queryBuilder.eq('calificacion', ratingNum);
        }
      }

      // 2. Filtrar por rango de fechas de la evaluación
      if (filters?.fechaInicio) {
        queryBuilder = queryBuilder.gte('creado_en', filters.fechaInicio);
      }
      if (filters?.fechaFin) {
        const endOfDay = `${filters.fechaFin}T23:59:59.999Z`;
        queryBuilder = queryBuilder.lte('creado_en', endOfDay);
      }

      const { data, error } = await queryBuilder.order('creado_en', { ascending: false });

      if (error) {
        console.error('Error in EvaluacionRepository.queryEvaluaciones:', error);
        return { success: false, error: error.message };
      }

      let list = (data as unknown as EvaluacionServicioDetallada[]) || [];

      // 3. Filtrar en memoria por técnico, usuario o búsqueda textual difusa
      if (filters?.tecnicoId && filters.tecnicoId !== 'todos') {
        list = list.filter(item => item.incidencia?.asignado_a === filters.tecnicoId);
      }

      if (filters?.usuarioId && filters.usuarioId !== 'todos') {
        list = list.filter(item => item.incidencia?.creado_por === filters.usuarioId);
      }

      if (filters?.busqueda) {
        const queryText = filters.busqueda.toLowerCase().trim();
        if (queryText) {
          list = list.filter(item => {
            const ticketCode = item.incidencia?.codigo_ticket?.toLowerCase() || '';
            const ticketTitle = item.incidencia?.titulo?.toLowerCase() || '';
            const comment = item.comentario?.toLowerCase() || '';
            
            const creadorNombreCompleto = item.incidencia?.creador
              ? `${item.incidencia.creador.nombre} ${item.incidencia.creador.apellido}`.toLowerCase()
              : '';
              
            const tecnicoNombreCompleto = item.incidencia?.asignado
              ? `${item.incidencia.asignado.nombre} ${item.incidencia.asignado.apellido}`.toLowerCase()
              : '';

            return (
              ticketCode.includes(queryText) ||
              ticketTitle.includes(queryText) ||
              comment.includes(queryText) ||
              creadorNombreCompleto.includes(queryText) ||
              tecnicoNombreCompleto.includes(queryText)
            );
          });
        }
      }

      return { success: true, data: list };
    } catch (err) {
      console.error('Exception in EvaluacionRepository.queryEvaluaciones:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al consultar las evaluaciones de servicio';
      return { success: false, error: msg };
    }
  }
}
