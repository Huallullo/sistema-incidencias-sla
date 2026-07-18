import { getSupabaseServerClient } from '@/lib/supabaseServer';
import {
  FiltroReporteCarga,
  DesgloseCargaTecnico,
  ReporteCargaResult,
} from '@/types/reporteCargaTrabajo';

export class ReporteCargaTrabajoRepository {
  /**
   * Consulta las incidencias agrupadas por técnico para el reporte de carga de trabajo.
   * Devuelve el desglose por estado y prioridad de cada técnico asignado.
   */
  static async obtenerReporteCarga(
    filtros: FiltroReporteCarga
  ): Promise<{ success: boolean; data?: ReporteCargaResult; error?: string }> {
    try {
      const client = await getSupabaseServerClient();

      // 1. Construir la consulta de incidencias con filtros aplicados
      let query = client
        .from('incidencias')
        .select(`
          id_incidencia,
          prioridad,
          estado,
          asignado_a,
          creado_en,
          asignado:perfiles!asignado_a(id_perfil, nombre, apellido)
        `)
        .not('asignado_a', 'is', null)
        .order('creado_en', { ascending: false });

      if (filtros.fechaInicio && filtros.fechaInicio.trim() !== '') {
        query = query.gte('creado_en', `${filtros.fechaInicio}T00:00:00`);
      }
      if (filtros.fechaFin && filtros.fechaFin.trim() !== '') {
        query = query.lte('creado_en', `${filtros.fechaFin}T23:59:59`);
      }
      if (filtros.tecnicoId && filtros.tecnicoId !== 'todos') {
        query = query.eq('asignado_a', filtros.tecnicoId);
      }
      if (filtros.prioridad && filtros.prioridad !== 'todas') {
        query = query.eq('prioridad', filtros.prioridad);
      }
      if (filtros.estado && filtros.estado !== 'todos') {
        query = query.eq('estado', filtros.estado);
      }

      const { data: incidencias, error } = await query;

      if (error) {
        return { success: false, error: `Error al consultar incidencias: ${error.message}` };
      }

      // 2. Agrupar en memoria por técnico
      const mapa = new Map<string, DesgloseCargaTecnico>();

      for (const inc of incidencias ?? []) {
        const tecnico = inc.asignado as any;
        if (!tecnico) continue;

        const key = tecnico.id_perfil as string;
        if (!mapa.has(key)) {
          mapa.set(key, {
            id_perfil: key,
            nombre_completo: `${tecnico.nombre} ${tecnico.apellido}`.trim(),
            total: 0,
            abiertos: 0,
            en_progreso: 0,
            resueltos: 0,
            cerrados: 0,
            criticos: 0,
            altos: 0,
            medios: 0,
            bajos: 0,
          });
        }

        const entry = mapa.get(key)!;
        entry.total++;

        switch (inc.estado) {
          case 'abierto':     entry.abiertos++;    break;
          case 'en_progreso': entry.en_progreso++; break;
          case 'resuelto':    entry.resueltos++;   break;
          case 'cerrado':     entry.cerrados++;    break;
        }

        switch (inc.prioridad) {
          case 'critica': entry.criticos++; break;
          case 'alta':    entry.altos++;    break;
          case 'media':   entry.medios++;   break;
          case 'baja':    entry.bajos++;    break;
        }
      }

      const tecnicos = Array.from(mapa.values()).sort((a, b) => b.total - a.total);

      // 3. Calcular indicadores globales
      const total_tickets_sistema = tecnicos.reduce((s, t) => s + t.total, 0);
      const promedio_por_tecnico =
        tecnicos.length > 0
          ? Math.round(total_tickets_sistema / tecnicos.length)
          : 0;

      const tecnicoMasCargado = tecnicos[0]?.nombre_completo ?? '—';
      const tecnicoMenosCargado = tecnicos[tecnicos.length - 1]?.nombre_completo ?? '—';

      return {
        success: true,
        data: {
          tecnicos,
          total_tickets_sistema,
          tecnico_mas_cargado: tecnicoMasCargado,
          tecnico_menos_cargado: tecnicoMenosCargado,
          promedio_por_tecnico,
          filtros_aplicados: filtros,
          generado_en: new Date().toISOString(),
        },
      };
    } catch (err) {
      console.error('Exception in ReporteCargaTrabajoRepository:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte';
      return { success: false, error: msg };
    }
  }
}
