import { z } from 'zod';

// ─── Filtros del reporte de conocimiento ────────────────────────────────────
export interface FiltroReporteConocimiento {
  fechaInicio?: string;   // 'YYYY-MM-DD'
  fechaFin?: string;      // 'YYYY-MM-DD'
  categoria?: string;     // 'todas' | 'hardware' | 'software' | 'redes' | 'otros'
  autorId?: string;       // UUID de perfil | 'todos'
}

export const filtroReporteConocimientoSchema = z.object({
  fechaInicio: z.string().optional().default(''),
  fechaFin:    z.string().optional().default(''),
  categoria:   z.string().optional().default('todas'),
  autorId:     z.string().optional().default('todos'),
});

// ─── Fila individual de artículo en el reporte ──────────────────────────────
export interface ArticuloConsultaReporte {
  id_articulo:      string;
  titulo:           string;
  categoria:        string;
  autor:            string;       // Nombre del técnico autor
  total_consultas:  number;       // Número de vistas en el rango
  fecha_creacion:   string;       // creado_en del artículo
}

// ─── KPIs / Indicadores consolidables ────────────────────────────────────────
export interface ResumenConocimiento {
  total_articulos:         number;      // Total de artículos consultados o en base
  total_consultas:         number;      // Suma de todas las vistas
  categoria_mas_consultada: string;     // Falla más recurrente (Categoría)
  articulo_mas_consultado:  string;     // Solución más utilizada (Título)
}

// ─── Resultado completo del reporte ────────────────────────────────────────
export interface ReporteConocimientoResult {
  articulos:                ArticuloConsultaReporte[];
  resumen:                  ResumenConocimiento;
  filtros_aplicados:        FiltroReporteConocimiento;
  generado_en:              string;
}
