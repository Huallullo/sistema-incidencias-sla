import { z } from 'zod';

export type CategoriaIncidencia = 'hardware' | 'software' | 'redes' | 'otros';
export type PrioridadIncidencia = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoIncidencia = 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';

export interface Incidencia {
  id_incidencia: string;
  codigo_ticket: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaIncidencia;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  creado_por: string;
  asignado_a?: string | null;
  creado_en: string;
  actualizado_en: string;
  creador?: { nombre: string; apellido: string } | null;
  asignado?: { nombre: string; apellido: string } | null;
}

// Zod Validation Schema for form registration
export const registroIncidenciaSchema = z.object({
  titulo: z
    .string()
    .min(10, { message: 'El título debe tener al menos 10 caracteres' })
    .max(150, { message: 'El título no puede exceder los 150 caracteres' }),
  descripcion: z
    .string()
    .min(20, { message: 'La descripción detallada debe tener al menos 20 caracteres' }),
  categoria: z.enum(['hardware', 'software', 'redes', 'otros'], {
    message: 'Categoría no válida. Seleccione hardware, software, redes u otros',
  }),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica'], {
    message: 'Prioridad no válida. Seleccione baja, media, alta o critica',
  }),
});

export type IncidenciaInput = z.infer<typeof registroIncidenciaSchema>;
