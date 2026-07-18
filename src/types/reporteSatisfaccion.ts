import { z } from 'zod';

// ─── Filtros del reporte de satisfacción ────────────────────────────────────
export interface FiltroReporteSatisfaccion {
  fechaInicio?: string;   // 'YYYY-MM-DD'
  fechaFin?: string;      // 'YYYY-MM-DD'
  tecnicoId?: string;     // UUID de perfil | 'todos'
  categoria?: string;      // 'todas' | 'hardware' | 'software' | 'redes' | 'otros'
  prioridad?: string;      // 'todas' | 'critica' | 'alta' | 'media' | 'baja'
}

export const filtroReporteSatisfaccionSchema = z.object({
  fechaInicio: z.string().optional().default(''),
  fechaFin:    z.string().optional().default(''),
  tecnicoId:   z.string().optional().default('todos'),
  categoria:   z.string().optional().default('todas'),
  prioridad:   z.string().optional().default('todas'),
});

// ─── Fila individual de evaluación ──────────────────────────────────────────
export interface EvaluacionDetalleReporte {
  id_evaluacion:   string;
  codigo_ticket:   string;
  titulo_incidencia: string;
  usuario_creador: string; // Nombre del usuario que reportó
  tecnico_asignado: string; // Nombre del técnico
  calificacion:    number;
  comentario:      string | null;
  fecha_evaluacion: string;
  categoria:       string;
  prioridad:       string;
}

// ─── Distribución de calificaciones ──────────────────────────────────────────
export interface DistribucionCalificaciones {
  cinco_estrellas: number;
  cuatro_estrellas: number;
  tres_estrellas: number;
  dos_estrellas: number;
  una_estrella: number;
}

// ─── Resumen de indicadores del reporte ─────────────────────────────────────
export interface ResumenSatisfaccion {
  promedio_calificacion:   number;  // 1.0 a 5.0
  porcentaje_satisfaccion: number;  // % de ratings >= 4 (cuatro y cinco estrellas)
  total_evaluaciones:      number;
  distribucion:            DistribucionCalificaciones;
}

// ─── Resultado completo del reporte ────────────────────────────────────────
export interface ReporteSatisfaccionResult {
  evaluaciones:             EvaluacionDetalleReporte[];
  resumen:                  ResumenSatisfaccion;
  filtros_aplicados:        FiltroReporteSatisfaccion;
  generado_en:              string;
}
