import { z } from 'zod';

export type Turno = 'mañana' | 'tarde' | 'noche';
export type EstadoDisponibilidad = 'disponible' | 'no_disponible';

export interface DisponibilidadTecnico {
  id_disponibilidad: string;
  id_tecnico: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:MM:SS
  hora_fin: string; // HH:MM:SS
  turno: Turno;
  estado: EstadoDisponibilidad;
  creado_en?: string;
  actualizado_en?: string;
  
  // Datos extendidos del técnico (obtenidos mediante join)
  tecnico?: {
    nombre: string;
    apellido: string;
    correo: string;
  };
}

// Esquema de validación para registro individual
export const registroDisponibilidadSchema = z.object({
  id_tecnico: z.string().uuid({ message: "El técnico seleccionado es inválido." }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato YYYY-MM-DD." }),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: "La hora de inicio es inválida (formato HH:MM)." }),
  hora_fin: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: "La hora de fin es inválida (formato HH:MM)." }),
  turno: z.enum(['mañana', 'tarde', 'noche'], { 
    message: "El turno seleccionado debe ser mañana, tarde o noche." 
  }),
  estado: z.enum(['disponible', 'no_disponible'], {
    message: "El estado de disponibilidad debe ser disponible o no disponible."
  })
}).refine(data => {
  return data.hora_inicio < data.hora_fin;
}, {
  message: "La hora de inicio debe ser estrictamente menor que la hora de fin.",
  path: ["hora_fin"]
});

// Esquema de validación para registro por rango de fechas
export const registroRangoDisponibilidadSchema = z.object({
  id_tecnico: z.string().uuid({ message: "El técnico seleccionado es inválido." }),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de inicio debe tener el formato YYYY-MM-DD." }),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de fin debe tener el formato YYYY-MM-DD." }),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: "La hora de inicio es inválida (formato HH:MM)." }),
  hora_fin: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: "La hora de fin es inválida (formato HH:MM)." }),
  turno: z.enum(['mañana', 'tarde', 'noche'], { 
    message: "El turno seleccionado debe ser mañana, tarde o noche." 
  }),
  estado: z.enum(['disponible', 'no_disponible'], {
    message: "El estado de disponibilidad debe ser disponible o no disponible."
  })
}).refine(data => {
  return data.hora_inicio < data.hora_fin;
}, {
  message: "La hora de inicio debe ser estrictamente menor que la hora de fin.",
  path: ["hora_fin"]
}).refine(data => {
  return data.fecha_inicio <= data.fecha_fin;
}, {
  message: "La fecha de inicio debe ser menor o igual que la fecha de fin.",
  path: ["fecha_fin"]
});

export type RegistroDisponibilidadInput = z.infer<typeof registroDisponibilidadSchema>;
export type RegistroRangoDisponibilidadInput = z.infer<typeof registroRangoDisponibilidadSchema>;
