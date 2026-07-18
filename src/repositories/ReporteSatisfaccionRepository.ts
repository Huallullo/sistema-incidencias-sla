import { getSupabaseServerClient } from '@/lib/supabaseServer';
import {
  FiltroReporteSatisfaccion,
  EvaluacionDetalleReporte,
  ReporteSatisfaccionResult,
} from '@/types/reporteSatisfaccion';

interface EvaluacionServicioRow {
  id_evaluacion: string;
  calificacion: number;
  comentario: string | null;
  creado_en: string;
  incidencia: {
    id_incidencia: string;
    codigo_ticket: string;
    titulo: string;
    categoria: string;
    prioridad: string;
    creado_por: string;
    asignado_a: string | null;
    creador: { nombre: string; apellido: string } | null;
    asignado: { nombre: string; apellido: string } | null;
  } | null;
}

export class ReporteSatisfaccionRepository {
  /**
   * Obtiene las evaluaciones de servicio, filtra y calcula los indicadores de satisfacción.
   */
  static async obtenerReporteSatisfaccion(
    filtros: FiltroReporteSatisfaccion
  ): Promise<{ success: boolean; data?: ReporteSatisfaccionResult; error?: string }> {
    try {
      const client = await getSupabaseServerClient();

      // Consultamos todas las evaluaciones con sus relaciones
      let queryBuilder = client
        .from('evaluacion_servicio')
        .select(`
          id_evaluacion,
          calificacion,
          comentario,
          creado_en,
          incidencia:incidencias!id_incidencia(
            id_incidencia,
            codigo_ticket,
            titulo,
            categoria,
            prioridad,
            creado_por,
            asignado_a,
            creador:perfiles!creado_por(nombre, apellido),
            asignado:perfiles!asignado_a(nombre, apellido)
          )
        `);

      // Filtrado por fecha de evaluación
      if (filtros.fechaInicio && filtros.fechaInicio.trim() !== '') {
        queryBuilder = queryBuilder.gte('creado_en', `${filtros.fechaInicio}T00:00:00`);
      }
      if (filtros.fechaFin && filtros.fechaFin.trim() !== '') {
        queryBuilder = queryBuilder.lte('creado_en', `${filtros.fechaFin}T23:59:59`);
      }

      const { data: rawData, error } = await queryBuilder.order('creado_en', { ascending: false });

      if (error) {
        return { success: false, error: `Error al consultar evaluaciones: ${error.message}` };
      }

      // Procesar en memoria para aplicar filtros de incidencia y técnico
      const evaluaciones: EvaluacionDetalleReporte[] = [];
      const dist = {
        cinco_estrellas: 0,
        cuatro_estrellas: 0,
        tres_estrellas: 0,
        dos_estrellas: 0,
        una_estrella: 0,
      };

      let sumCalificacion = 0;
      let totalSatisfechos = 0; // calificacion >= 4

      for (const item of (rawData as unknown as EvaluacionServicioRow[]) ?? []) {
        const inc = item.incidencia;
        if (!inc) continue;

        // Filtro por técnico
        if (filtros.tecnicoId && filtros.tecnicoId !== 'todos') {
          if (inc.asignado_a !== filtros.tecnicoId) continue;
        }

        // Filtro por categoría de incidencia
        if (filtros.categoria && filtros.categoria !== 'todas') {
          if (inc.categoria !== filtros.categoria) continue;
        }

        // Filtro por prioridad de servicio
        if (filtros.prioridad && filtros.prioridad !== 'todas') {
          if (inc.prioridad !== filtros.prioridad) continue;
        }

        const creadorNom = inc.creador
          ? `${inc.creador.nombre} ${inc.creador.apellido}`.trim()
          : 'Usuario';
        const asignadoNom = inc.asignado
          ? `${inc.asignado.nombre} ${inc.asignado.apellido}`.trim()
          : 'Sin asignar';

        const row: EvaluacionDetalleReporte = {
          id_evaluacion:     item.id_evaluacion,
          codigo_ticket:     inc.codigo_ticket,
          titulo_incidencia: inc.titulo,
          usuario_creador:   creadorNom,
          tecnico_asignado:  asignadoNom,
          calificacion:      item.calificacion,
          comentario:        item.comentario,
          fecha_evaluacion:  item.creado_en,
          categoria:         inc.categoria,
          prioridad:         inc.prioridad,
        };

        evaluaciones.push(row);

        // Actualizar distribución
        switch (item.calificacion) {
          case 5: dist.cinco_estrellas++;  break;
          case 4: dist.cuatro_estrellas++; break;
          case 3: dist.tres_estrellas++;   break;
          case 2: dist.dos_estrellas++;    break;
          case 1: dist.una_estrella++;     break;
        }

        sumCalificacion += item.calificacion;
        if (item.calificacion >= 4) {
          totalSatisfechos++;
        }
      }

      const total_evaluaciones = evaluaciones.length;
      const promedio = total_evaluaciones > 0 ? Math.round((sumCalificacion / total_evaluaciones) * 10) / 10 : 0;
      const pctSatisfaccion = total_evaluaciones > 0 ? Math.round((totalSatisfechos / total_evaluaciones) * 100) : 0;

      return {
        success: true,
        data: {
          evaluaciones,
          resumen: {
            promedio_calificacion: promedio,
            porcentaje_satisfaccion: pctSatisfaccion,
            total_evaluaciones,
            distribucion: dist,
          },
          filtros_aplicados: filtros,
          generado_en: new Date().toISOString(),
        },
      };
    } catch (err) {
      console.error('Exception in ReporteSatisfaccionRepository:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte';
      return { success: false, error: msg };
    }
  }
}
