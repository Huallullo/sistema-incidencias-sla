import { getSupabaseServerClient } from '@/lib/supabaseServer';
import {
  FiltroReporteFallas,
  EquipoFallaResumen,
  IncidenciaFalla,
  ReporteFallasResult,
} from '@/types/reporteFallasEquipo';

export class ReporteFallasEquipoRepository {
  /**
   * Consulta el historial de incidencias por equipo informático,
   * calcula los indicadores de frecuencia y tiempo promedio de resolución.
   */
  static async obtenerReporteFallas(
    filtros: FiltroReporteFallas
  ): Promise<{ success: boolean; data?: ReporteFallasResult; error?: string }> {
    try {
      const client = await getSupabaseServerClient();

      // 1. Construir la query de incidencias que tienen equipo vinculado
      let query = client
        .from('incidencias')
        .select(`
          id_incidencia,
          codigo_ticket,
          titulo,
          categoria,
          prioridad,
          estado,
          creado_en,
          fecha_cierre,
          asignado_a,
          id_equipo,
          asignado:perfiles!asignado_a(nombre, apellido),
          equipo:equipos_informaticos!id_equipo(
            id_equipo, codigo, nombre, tipo, ubicacion, estado_operativo
          )
        `)
        .not('id_equipo', 'is', null)
        .order('creado_en', { ascending: false });

      // Aplicar filtros opcionales
      if (filtros.equipoId && filtros.equipoId !== 'todos') {
        query = query.eq('id_equipo', filtros.equipoId);
      }
      if (filtros.estadoIncidencia && filtros.estadoIncidencia !== 'todos') {
        query = query.eq('estado', filtros.estadoIncidencia);
      }
      if (filtros.fechaInicio && filtros.fechaInicio.trim() !== '') {
        query = query.gte('creado_en', `${filtros.fechaInicio}T00:00:00`);
      }
      if (filtros.fechaFin && filtros.fechaFin.trim() !== '') {
        query = query.lte('creado_en', `${filtros.fechaFin}T23:59:59`);
      }

      const { data: incidencias, error } = await query;

      if (error) {
        return { success: false, error: `Error al consultar incidencias: ${error.message}` };
      }

      // 2. Agrupar por equipo en memoria con filtros adicionales de tipo y ubicación
      const mapa = new Map<string, EquipoFallaResumen>();

      for (const inc of incidencias ?? []) {
        const eq = inc.equipo as any;
        if (!eq) continue;

        // Filtro por tipo de equipo (post-query porque es campo del equipo)
        if (filtros.tipoEquipo && filtros.tipoEquipo !== 'todos') {
          if ((eq.tipo as string).toLowerCase() !== filtros.tipoEquipo.toLowerCase()) continue;
        }
        // Filtro por ubicación (contiene)
        if (filtros.ubicacion && filtros.ubicacion.trim() !== '') {
          if (!(eq.ubicacion as string).toLowerCase().includes(filtros.ubicacion.toLowerCase())) continue;
        }

        const key = eq.id_equipo as string;
        if (!mapa.has(key)) {
          mapa.set(key, {
            id_equipo:           key,
            codigo:              eq.codigo,
            nombre:              eq.nombre,
            tipo:                eq.tipo,
            ubicacion:           eq.ubicacion,
            estado_operativo:    eq.estado_operativo,
            total_fallas:        0,
            fallas_abiertas:     0,
            fallas_en_progreso:  0,
            fallas_resueltas:    0,
            fallas_cerradas:     0,
            tiempo_promedio_hrs: null,
            ultima_falla:        null,
            incidencias:         [],
          });
        }

        const entry  = mapa.get(key)!;
        const tec    = inc.asignado as any;
        const tecNom = tec ? `${tec.nombre} ${tec.apellido}`.trim() : 'Sin asignar';

        // Calcular tiempo de resolución en horas
        let tiempoHrs: number | null = null;
        if (inc.fecha_cierre) {
          const ms = new Date(inc.fecha_cierre).getTime() - new Date(inc.creado_en).getTime();
          tiempoHrs = Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
        }

        const fila: IncidenciaFalla = {
          id_incidencia:           inc.id_incidencia,
          codigo_ticket:           inc.codigo_ticket,
          titulo:                  inc.titulo,
          categoria:               inc.categoria,
          prioridad:               inc.prioridad,
          estado:                  inc.estado,
          tecnico:                 tecNom,
          fecha_incidente:         inc.creado_en,
          fecha_cierre:            inc.fecha_cierre ?? null,
          tiempo_resolucion_horas: tiempoHrs,
        };

        entry.incidencias.push(fila);
        entry.total_fallas++;

        switch (inc.estado) {
          case 'abierto':     entry.fallas_abiertas++;    break;
          case 'en_progreso': entry.fallas_en_progreso++; break;
          case 'resuelto':    entry.fallas_resueltas++;   break;
          case 'cerrado':     entry.fallas_cerradas++;    break;
        }

        // Actualizar última falla
        if (!entry.ultima_falla || inc.creado_en > entry.ultima_falla) {
          entry.ultima_falla = inc.creado_en;
        }
      }

      // 3. Calcular tiempo promedio por equipo y ordenar por total desc
      for (const entry of mapa.values()) {
        const cerradas = entry.incidencias.filter(i => i.tiempo_resolucion_horas !== null);
        if (cerradas.length > 0) {
          const suma = cerradas.reduce((s, i) => s + (i.tiempo_resolucion_horas ?? 0), 0);
          entry.tiempo_promedio_hrs = Math.round((suma / cerradas.length) * 10) / 10;
        }
      }

      const equipos = Array.from(mapa.values()).sort((a, b) => b.total_fallas - a.total_fallas);
      const total   = equipos.reduce((s, e) => s + e.total_fallas, 0);
      const prom    = equipos.length > 0 ? Math.round(total / equipos.length) : 0;
      const masFallas = equipos[0]
        ? `${equipos[0].nombre} (${equipos[0].total_fallas} fallas)`
        : '—';

      return {
        success: true,
        data: {
          equipos,
          total_equipos_con_fallas: equipos.length,
          total_incidencias:        total,
          equipo_mas_fallas:        masFallas,
          promedio_fallas_equipo:   prom,
          filtros_aplicados:        filtros,
          generado_en:              new Date().toISOString(),
        },
      };
    } catch (err) {
      console.error('Exception in ReporteFallasEquipoRepository:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte';
      return { success: false, error: msg };
    }
  }

  /** Obtiene todos los equipos para poblar el selector de filtros */
  static async obtenerListaEquipos(): Promise<{ id_equipo: string; codigo: string; nombre: string }[]> {
    const client = await getSupabaseServerClient();
    const { data } = await client
      .from('equipos_informaticos')
      .select('id_equipo, codigo, nombre')
      .order('nombre', { ascending: true });
    return data ?? [];
  }
}
