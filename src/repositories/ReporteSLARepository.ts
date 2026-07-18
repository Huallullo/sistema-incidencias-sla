import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { FiltroReporteSLA, TicketSLADetalle, ResumenSLA, ReporteSLAResult } from '@/types/reporteSLA';

export class ReporteSLARepository {
  /**
   * Consulta las incidencias con sus datos de prioridad_servicio para el cálculo de SLA.
   * Aplica los filtros recibidos directamente en la consulta de Supabase.
   */
  static async obtenerReporteSLA(
    filtros: FiltroReporteSLA
  ): Promise<{ success: boolean; data?: ReporteSLAResult; error?: string }> {
    try {
      const client = await getSupabaseServerClient();

      // 1. Cargar el mapa de SLA por nivel de prioridad
      const { data: prioridadesData, error: prioridadError } = await client
        .from('prioridades_servicio')
        .select('nivel, tiempo_respuesta_min, tiempo_resolucion_min');

      if (prioridadError) {
        return { success: false, error: `Error al cargar prioridades SLA: ${prioridadError.message}` };
      }

      const slaMap: Record<string, { resp: number; resol: number }> = {};
      for (const p of prioridadesData ?? []) {
        slaMap[p.nivel] = {
          resp: p.tiempo_respuesta_min,
          resol: p.tiempo_resolucion_min,
        };
      }

      // 2. Construir la query de incidencias con los filtros
      let query = client
        .from('incidencias')
        .select(`
          id_incidencia,
          codigo_ticket,
          titulo,
          prioridad,
          estado,
          creado_por,
          asignado_a,
          creado_en,
          actualizado_en,
          fecha_cierre,
          creador:perfiles!creado_por(nombre, apellido),
          asignado:perfiles!asignado_a(nombre, apellido)
        `)
        .order('creado_en', { ascending: false });

      // Filtro por fecha de inicio
      if (filtros.fechaInicio && filtros.fechaInicio.trim() !== '') {
        query = query.gte('creado_en', `${filtros.fechaInicio}T00:00:00`);
      }

      // Filtro por fecha fin
      if (filtros.fechaFin && filtros.fechaFin.trim() !== '') {
        query = query.lte('creado_en', `${filtros.fechaFin}T23:59:59`);
      }

      // Filtro por prioridad
      if (filtros.prioridad && filtros.prioridad !== 'todas') {
        query = query.eq('prioridad', filtros.prioridad);
      }

      // Filtro por técnico asignado
      if (filtros.tecnicoId && filtros.tecnicoId !== 'todos') {
        query = query.eq('asignado_a', filtros.tecnicoId);
      }

      // Filtro por estado
      if (filtros.estado && filtros.estado !== 'todos') {
        query = query.eq('estado', filtros.estado);
      }

      const { data: incidencias, error: incError } = await query;

      if (incError) {
        return { success: false, error: `Error al consultar incidencias: ${incError.message}` };
      }

      // 3. Calcular métricas SLA por cada ticket
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tickets: TicketSLADetalle[] = (incidencias ?? []).map((inc: any) => {
        const createdAt = new Date(inc.creado_en);
        const updatedAt = new Date(inc.actualizado_en);
        const closedAt = inc.fecha_cierre ? new Date(inc.fecha_cierre) : null;

        const slaData = slaMap[inc.prioridad] ?? null;

        // Tiempo de respuesta: desde creación hasta primera actualización (aproximado)
        const tiempoRespuestaMin = slaData
          ? Math.round((updatedAt.getTime() - createdAt.getTime()) / 60000)
          : null;

        // Tiempo de resolución: desde creación hasta cierre/resolución
        const tiempoResolucionMin = closedAt
          ? Math.round((closedAt.getTime() - createdAt.getTime()) / 60000)
          : inc.estado === 'resuelto'
          ? Math.round((updatedAt.getTime() - createdAt.getTime()) / 60000)
          : null;

        // Indicadores de cumplimiento
        const cumpleRespuesta =
          slaData && tiempoRespuestaMin !== null
            ? tiempoRespuestaMin <= slaData.resp
            : null;

        const cumpleResolucion =
          slaData && tiempoResolucionMin !== null
            ? tiempoResolucionMin <= slaData.resol
            : null;

        const cumpleSLA =
          cumpleRespuesta !== null && cumpleResolucion !== null
            ? cumpleRespuesta && cumpleResolucion
            : cumpleRespuesta !== null
            ? cumpleRespuesta
            : null;

        const tecnicoNombre = inc.asignado
          ? `${inc.asignado.nombre} ${inc.asignado.apellido}`.trim()
          : '—';

        const usuarioNombre = inc.creador
          ? `${inc.creador.nombre} ${inc.creador.apellido}`.trim()
          : '—';

        return {
          id_incidencia: inc.id_incidencia,
          codigo_ticket: inc.codigo_ticket,
          titulo: inc.titulo,
          prioridad: inc.prioridad,
          estado: inc.estado,
          tecnico_nombre: tecnicoNombre,
          usuario_nombre: usuarioNombre,
          creado_en: inc.creado_en,
          actualizado_en: inc.actualizado_en,
          fecha_cierre: inc.fecha_cierre ?? null,
          tiempo_respuesta_real_min: tiempoRespuestaMin,
          tiempo_resolucion_real_min: tiempoResolucionMin,
          sla_tiempo_respuesta_min: slaData?.resp ?? null,
          sla_tiempo_resolucion_min: slaData?.resol ?? null,
          cumple_respuesta: cumpleRespuesta,
          cumple_resolucion: cumpleResolucion,
          cumple_sla: cumpleSLA,
        } as TicketSLADetalle;
      });

      // 4. Calcular resumen agregado
      const porPrioridad: Record<string, { total: number; cumple: number; porcentaje: number }> = {};
      let totalCumple = 0;
      let totalNoCumple = 0;
      let totalSinSLA = 0;

      for (const t of tickets) {
        const nivel = t.prioridad;
        if (!porPrioridad[nivel]) {
          porPrioridad[nivel] = { total: 0, cumple: 0, porcentaje: 0 };
        }
        porPrioridad[nivel].total++;

        if (t.cumple_sla === null) {
          totalSinSLA++;
        } else if (t.cumple_sla) {
          totalCumple++;
          porPrioridad[nivel].cumple++;
        } else {
          totalNoCumple++;
        }
      }

      for (const nivel of Object.keys(porPrioridad)) {
        const g = porPrioridad[nivel];
        g.porcentaje = g.total > 0 ? Math.round((g.cumple / g.total) * 100) : 0;
      }

      const evaluables = tickets.length - totalSinSLA;
      const porcentajeCumplimiento = evaluables > 0
        ? Math.round((totalCumple / evaluables) * 100)
        : 0;

      const resumen: ResumenSLA = {
        total_tickets: tickets.length,
        tickets_cumple: totalCumple,
        tickets_no_cumple: totalNoCumple,
        tickets_sin_sla: totalSinSLA,
        porcentaje_cumplimiento: porcentajeCumplimiento,
        por_prioridad: porPrioridad,
      };

      return {
        success: true,
        data: {
          tickets,
          resumen,
          filtros_aplicados: filtros,
          generado_en: new Date().toISOString(),
        },
      };
    } catch (err) {
      console.error('Exception in ReporteSLARepository.obtenerReporteSLA:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte SLA';
      return { success: false, error: msg };
    }
  }
}
