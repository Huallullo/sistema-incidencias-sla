import { getSupabaseServerClient } from '@/lib/supabaseServer';
import {
  FiltroReporteConocimiento,
  ArticuloConsultaReporte,
  ReporteConocimientoResult,
} from '@/types/reporteConocimiento';

interface ConocimientoArticuloRow {
  id_articulo: string;
  titulo: string;
  categoria: string;
  creado_en: string;
  autor_id: string;
  autor: { nombre: string; apellido: string } | null;
}

export class ReporteConocimientoRepository {
  /**
   * Obtiene la cantidad de consultas por artículo, ordena de mayor a menor y calcula los KPIs.
   */
  static async obtenerReporteConocimiento(
    filtros: FiltroReporteConocimiento
  ): Promise<{ success: boolean; data?: ReporteConocimientoResult; error?: string }> {
    try {
      const client = await getSupabaseServerClient();

      // 1. Obtener todas las consultas de la tabla `consultas_articulo`
      let queryConsultas = client
        .from('consultas_articulo')
        .select('id_articulo, creado_en');

      if (filtros.fechaInicio && filtros.fechaInicio.trim() !== '') {
        queryConsultas = queryConsultas.gte('creado_en', `${filtros.fechaInicio}T00:00:00`);
      }
      if (filtros.fechaFin && filtros.fechaFin.trim() !== '') {
        queryConsultas = queryConsultas.lte('creado_en', `${filtros.fechaFin}T23:59:59`);
      }

      const { data: consultas, error: errConsultas } = await queryConsultas;
      if (errConsultas) {
        return { success: false, error: `Error al consultar vistas: ${errConsultas.message}` };
      }

      // 2. Obtener todos los artículos de conocimiento con su autor
      const { data: articulos, error: errArticulos } = await client
        .from('articulos_conocimiento')
        .select(`
          id_articulo,
          titulo,
          categoria,
          creado_en,
          autor_id,
          autor:perfiles!autor_id(nombre, apellido)
        `);

      if (errArticulos) {
        return { success: false, error: `Error al consultar artículos: ${errArticulos.message}` };
      }

      // Mapear consultas para contar vistas por id_articulo
      const vistasMap = new Map<string, number>();
      for (const c of consultas ?? []) {
        vistasMap.set(c.id_articulo, (vistasMap.get(c.id_articulo) || 0) + 1);
      }

      // 3. Procesar en memoria y aplicar filtros
      const listado: ArticuloConsultaReporte[] = [];
      const categoriaVistas = new Map<string, number>();

      let maxVistasArticulo = -1;
      let tituloMaxVistas = '—';

      for (const art of (articulos as unknown as ConocimientoArticuloRow[]) ?? []) {
        // Filtro por categoría del artículo
        if (filtros.categoria && filtros.categoria !== 'todas') {
          if (art.categoria !== filtros.categoria) continue;
        }

        // Filtro por autor del artículo
        if (filtros.autorId && filtros.autorId !== 'todos') {
          if (art.autor_id !== filtros.autorId) continue;
        }

        const vistas = vistasMap.get(art.id_articulo) || 0;
        const aut = art.autor;
        const autorNom = aut
          ? `${aut.nombre} ${aut.apellido}`.trim()
          : 'Soporte TI';

        const row: ArticuloConsultaReporte = {
          id_articulo:     art.id_articulo,
          titulo:          art.titulo,
          categoria:       art.categoria,
          autor:           autorNom,
          total_consultas: vistas,
          fecha_creacion:  art.creado_en,
        };

        listado.push(row);

        // Agrupar vistas por categoría
        categoriaVistas.set(art.categoria, (categoriaVistas.get(art.categoria) || 0) + vistas);

        // Detectar artículo más consultado
        if (vistas > maxVistasArticulo) {
          maxVistasArticulo = vistas;
          tituloMaxVistas = art.titulo;
        }
      }

      // Ordenar de mayor a menor frecuencia
      listado.sort((a, b) => b.total_consultas - a.total_consultas);

      // Calcular KPIs globales
      const totalArticulos = listado.length;
      const totalConsultas = Array.from(vistasMap.values()).reduce((sum, v) => sum + v, 0);

      // Encontrar categoría más consultada (falla más recurrente)
      let maxVistasCat = -1;
      let catMasConsultada = '—';
      for (const [cat, v] of categoriaVistas.entries()) {
        if (v > maxVistasCat) {
          maxVistasCat = v;
          catMasConsultada = cat.charAt(0).toUpperCase() + cat.slice(1);
        }
      }

      return {
        success: true,
        data: {
          articulos: listado,
          resumen: {
            total_articulos: totalArticulos,
            total_consultas: totalConsultas,
            categoria_mas_consultada: catMasConsultada,
            articulo_mas_consultado: maxVistasArticulo > 0 ? `${tituloMaxVistas} (${maxVistasArticulo} vistas)` : '—',
          },
          filtros_aplicados: filtros,
          generado_en: new Date().toISOString(),
        },
      };
    } catch (err) {
      console.error('Exception in ReporteConocimientoRepository:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar el reporte';
      return { success: false, error: msg };
    }
  }
}
