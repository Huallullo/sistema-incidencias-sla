import { z } from 'zod';
import { PrioridadIncidencia, EstadoIncidencia } from './incidencias';

// ─── Filtros del reporte ────────────────────────────────────────────────────
export interface FiltroReporteSLA {
  fechaInicio?: string;   // ISO date string 'YYYY-MM-DD'
  fechaFin?: string;      // ISO date string 'YYYY-MM-DD'
  prioridad?: string;     // 'todas' | 'critica' | 'alta' | 'media' | 'baja'
  tecnicoId?: string;     // perfil UUID | 'todos'
  estado?: string;        // 'todos' | 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado'
}

export const filtroReporteSLASchema = z.object({
  fechaInicio: z.string().optional().default(''),
  fechaFin: z.string().optional().default(''),
  prioridad: z.string().optional().default('todas'),
  tecnicoId: z.string().optional().default('todos'),
  estado: z.string().optional().default('todos'),
});

// ─── Fila de detalle de ticket con métricas SLA ─────────────────────────────
export interface TicketSLADetalle {
  id_incidencia: string;
  codigo_ticket: string;
  titulo: string;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  tecnico_nombre: string;
  usuario_nombre: string;
  creado_en: string;
  actualizado_en: string;
  fecha_cierre: string | null;

  // Tiempos calculados (en minutos)
  tiempo_respuesta_real_min: number | null;    // minutos hasta primera acción (en_progreso)
  tiempo_resolucion_real_min: number | null;   // minutos hasta cierre/resolución

  // Tiempos SLA configurados (en minutos)
  sla_tiempo_respuesta_min: number | null;
  sla_tiempo_resolucion_min: number | null;

  // Indicadores de cumplimiento
  cumple_respuesta: boolean | null;
  cumple_resolucion: boolean | null;
  cumple_sla: boolean | null;   // true si cumple ambos
}

// ─── Resumen del reporte SLA ────────────────────────────────────────────────
export interface ResumenSLA {
  total_tickets: number;
  tickets_cumple: number;
  tickets_no_cumple: number;
  tickets_sin_sla: number;             // sin prioridad SLA configurada
  porcentaje_cumplimiento: number;     // 0-100

  // Desgloses
  por_prioridad: Record<string, {
    total: number;
    cumple: number;
    porcentaje: number;
  }>;
}

// ─── Resultado completo del reporte ────────────────────────────────────────
export interface ReporteSLAResult {
  tickets: TicketSLADetalle[];
  resumen: ResumenSLA;
  filtros_aplicados: FiltroReporteSLA;
  generado_en: string;
}
