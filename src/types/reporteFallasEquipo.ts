import { z } from 'zod';

// ─── Filtros del reporte ────────────────────────────────────────────────────
export interface FiltroReporteFallas {
  equipoId?: string;       // UUID del equipo | 'todos'
  tipoEquipo?: string;     // 'todos' | 'laptop' | 'desktop' | etc.
  ubicacion?: string;      // texto libre
  fechaInicio?: string;    // 'YYYY-MM-DD'
  fechaFin?: string;       // 'YYYY-MM-DD'
  estadoIncidencia?: string; // 'todos' | 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado'
}

export const filtroReporteFallasSchema = z.object({
  equipoId:         z.string().optional().default('todos'),
  tipoEquipo:       z.string().optional().default('todos'),
  ubicacion:        z.string().optional().default(''),
  fechaInicio:      z.string().optional().default(''),
  fechaFin:         z.string().optional().default(''),
  estadoIncidencia: z.string().optional().default('todos'),
});

// ─── Fila de incidencia dentro del historial de un equipo ──────────────────
export interface IncidenciaFalla {
  id_incidencia:    string;
  codigo_ticket:    string;
  titulo:           string;
  categoria:        string;   // tipo de falla: hardware | software | redes | otros
  prioridad:        string;
  estado:           string;
  tecnico:          string;   // nombre completo del técnico asignado
  fecha_incidente:  string;   // creado_en
  fecha_cierre:     string | null;
  tiempo_resolucion_horas: number | null; // horas desde apertura hasta cierre
}

// ─── Resumen por equipo ─────────────────────────────────────────────────────
export interface EquipoFallaResumen {
  id_equipo:              string;
  codigo:                 string;
  nombre:                 string;
  tipo:                   string;
  ubicacion:              string;
  estado_operativo:       string;
  total_fallas:           number;
  fallas_abiertas:        number;
  fallas_en_progreso:     number;
  fallas_resueltas:       number;
  fallas_cerradas:        number;
  tiempo_promedio_hrs:    number | null;  // promedio de resolución en horas
  ultima_falla:           string | null;  // fecha de la última incidencia
  incidencias:            IncidenciaFalla[];
}

// ─── Resultado completo del reporte ────────────────────────────────────────
export interface ReporteFallasResult {
  equipos:                  EquipoFallaResumen[];
  total_equipos_con_fallas: number;
  total_incidencias:        number;
  equipo_mas_fallas:        string;
  promedio_fallas_equipo:   number;
  filtros_aplicados:        FiltroReporteFallas;
  generado_en:              string;
}
