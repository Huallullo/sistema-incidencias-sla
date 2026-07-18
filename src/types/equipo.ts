import { z } from 'zod';

export type EstadoEquipo = 'operativo' | 'mantenimiento' | 'inoperativo';

export interface EquipoInformatico {
  id_equipo: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  ubicacion: string;
  estado_operativo: EstadoEquipo;
  id_usuario_registro: string;
  fecha_registro: string;
  actualizado_en?: string;
  
  // Datos expandidos (opcionales)
  usuario_registro?: {
    nombre: string;
    apellido: string;
  };
}

// Esquema de validación con Zod para el registro de equipos
export const registroEquipoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, { message: 'El código del equipo es obligatorio.' })
    .max(50, { message: 'El código no puede superar los 50 caracteres.' })
    .regex(/^[A-Za-z0-9-_]+$/, {
      message: 'El código solo puede contener letras, números, guiones y guiones bajos.',
    }),
  nombre: z
    .string()
    .trim()
    .min(1, { message: 'El nombre del equipo es obligatorio.' })
    .max(100, { message: 'El nombre no puede superar los 100 caracteres.' }),
  tipo: z
    .string()
    .trim()
    .min(1, { message: 'El tipo de equipo es obligatorio.' })
    .max(50, { message: 'El tipo no puede superar los 50 caracteres.' }),
  marca: z
    .string()
    .trim()
    .min(1, { message: 'La marca es obligatoria.' })
    .max(50, { message: 'La marca no puede superar los 50 caracteres.' }),
  modelo: z
    .string()
    .trim()
    .min(1, { message: 'El modelo es obligatorio.' })
    .max(50, { message: 'El modelo no puede superar los 50 caracteres.' }),
  numero_serie: z
    .string()
    .trim()
    .min(1, { message: 'El número de serie es obligatorio.' })
    .max(100, { message: 'El número de serie no puede superar los 100 caracteres.' }),
  ubicacion: z
    .string()
    .trim()
    .min(1, { message: 'La ubicación es obligatoria.' })
    .max(100, { message: 'La ubicación no puede superar los 100 caracteres.' }),
  estado_operativo: z.enum(['operativo', 'mantenimiento', 'inoperativo'], {
    message: 'El estado operativo seleccionado no es válido.',
  }),
});

export type RegistroEquipoInput = z.infer<typeof registroEquipoSchema>;

export interface HistorialEstadoEquipo {
  id_historial: string;
  id_equipo: string;
  estado_anterior: EstadoEquipo;
  estado_nuevo: EstadoEquipo;
  observacion?: string;
  id_usuario_cambio: string;
  fecha_cambio: string;
  usuario_cambio?: {
    nombre: string;
    apellido: string;
  };
}

export const actualizarEquipoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, { message: 'El nombre del equipo es obligatorio.' })
    .max(100, { message: 'El nombre no puede superar los 100 caracteres.' }),
  tipo: z
    .string()
    .trim()
    .min(1, { message: 'El tipo de equipo es obligatorio.' })
    .max(50, { message: 'El tipo no puede superar los 50 caracteres.' }),
  marca: z
    .string()
    .trim()
    .min(1, { message: 'La marca es obligatoria.' })
    .max(50, { message: 'La marca no puede superar los 50 caracteres.' }),
  modelo: z
    .string()
    .trim()
    .min(1, { message: 'El modelo es obligatorio.' })
    .max(50, { message: 'El modelo no puede superar los 50 caracteres.' }),
  numero_serie: z
    .string()
    .trim()
    .min(1, { message: 'El número de serie es obligatorio.' })
    .max(100, { message: 'El número de serie no puede superar los 100 caracteres.' }),
  ubicacion: z
    .string()
    .trim()
    .min(1, { message: 'La ubicación es obligatoria.' })
    .max(100, { message: 'La ubicación no puede superar los 100 caracteres.' }),
  estado_operativo: z.enum(['operativo', 'mantenimiento', 'inoperativo'], {
    message: 'El estado operativo seleccionado no es válido.',
  }),
});

export type ActualizarEquipoInput = z.infer<typeof actualizarEquipoSchema>;

export interface DetalleEquipoInformatico extends EquipoInformatico {
  incidencias?: {
    id_incidencia: string;
    codigo_ticket: string;
    titulo: string;
    estado: string;
    fecha_creacion: string;
  }[];
}


