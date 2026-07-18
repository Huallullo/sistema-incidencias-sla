import { z } from 'zod';

// ─── Filtros del reporte ────────────────────────────────────────────────────
export interface FiltroReporteCarga {
  fechaInicio?: string;   // 'YYYY-MM-DD'
  fechaFin?: string;      // 'YYYY-MM-DD'
  tecnicoId?: string;     // UUID de perfil | 'todos'
  prioridad?: string;     // 'todas' | 'critica' | 'alta' | 'media' | 'baja'
  estado?: string;        // 'todos' | 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado'
}

export const filtroReporteCargaSchema = z.object({
  fechaInicio: z.string().optional().default(''),
  fechaFin: z.string().optional().default(''),
  tecnicoId: z.string().optional().default('todos'),
  prioridad: z.string().optional().default('todas'),
  estado: z.string().optional().default('todos'),
});

// ─── Desglose de tickets por estado de un técnico ───────────────────────────
export interface DesgloseCargaTecnico {
  id_perfil: string;
  nombre_completo: string;
  total: number;
  abiertos: number;
  en_progreso: number;
  resueltos: number;
  cerrados: number;
  criticos: number;
  altos: number;
  medios: number;
  bajos: number;
}

// ─── Resultado completo del reporte ────────────────────────────────────────
export interface ReporteCargaResult {
  tecnicos: DesgloseCargaTecnico[];
  total_tickets_sistema: number;
  tecnico_mas_cargado: string;
  tecnico_menos_cargado: string;
  promedio_por_tecnico: number;
  filtros_aplicados: FiltroReporteCarga;
  generado_en: string;
}
