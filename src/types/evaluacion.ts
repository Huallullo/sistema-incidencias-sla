import { z } from 'zod';

export const registroEvaluacionSchema = z.object({
  id_incidencia: z.string().uuid({
    message: 'El identificador de la incidencia debe ser un UUID válido.',
  }),
  calificacion: z.number().int().min(1, {
    message: 'La calificación mínima es 1 estrella.',
  }).max(5, {
    message: 'La calificación máxima es 5 estrellas.',
  }),
  comentario: z.string().max(500, {
    message: 'El comentario no puede exceder los 500 caracteres.',
  }).optional().nullable(),
});

export type RegistroEvaluacionInput = z.infer<typeof registroEvaluacionSchema>;

export interface EvaluacionServicio {
  id_evaluacion: string;
  id_incidencia: string;
  creado_por: string;
  calificacion: number;
  comentario: string | null;
  creado_en: string;
}

export interface EvaluacionServicioDetallada extends EvaluacionServicio {
  incidencia?: {
    id_incidencia: string;
    codigo_ticket: string;
    titulo: string;
    creado_por: string;
    asignado_a?: string | null;
    creador?: {
      id_perfil: string;
      nombre: string;
      apellido: string;
    } | null;
    asignado?: {
      id_perfil: string;
      nombre: string;
      apellido: string;
    } | null;
  } | null;
}

export const consultaEvaluacionesFilterSchema = z.object({
  tecnicoId: z.string().optional().or(z.literal('todos')),
  usuarioId: z.string().optional().or(z.literal('todos')),
  calificacion: z.string().optional().or(z.literal('todas')),
  fechaInicio: z.string().optional().or(z.literal('')),
  fechaFin: z.string().optional().or(z.literal('')),
  busqueda: z.string().optional().or(z.literal('')),
});

export type ConsultaEvaluacionesFilter = z.infer<typeof consultaEvaluacionesFilterSchema>;
