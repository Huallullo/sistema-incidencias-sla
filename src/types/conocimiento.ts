import { z } from 'zod';

export type CategoriaArticulo = 'hardware' | 'software' | 'redes' | 'otros';

export interface ArticuloConocimiento {
  id_articulo: string;
  titulo: string;
  categoria: CategoriaArticulo;
  descripcion_problema: string;
  solucion_pasos: string;
  id_incidencia: string | null;
  autor_id: string;
  creado_en: string;
  actualizado_en: string;
  // Campos adicionales de joins
  autor?: {
    nombre: string;
    apellido: string;
  } | null;
  incidencia?: {
    codigo_ticket: string;
    titulo: string;
  } | null;
}

export const registroArticuloSchema = z.object({
  titulo: z
    .string()
    .min(10, { message: 'El título debe tener al menos 10 caracteres' })
    .max(150, { message: 'El título no puede exceder los 150 caracteres' }),
  categoria: z.enum(['hardware', 'software', 'redes', 'otros'], {
    message: 'Seleccione una categoría válida: hardware, software, redes u otros',
  }),
  descripcion_problema: z
    .string()
    .min(20, { message: 'La descripción del problema debe tener al menos 20 caracteres' }),
  solucion_pasos: z
    .string()
    .min(20, { message: 'Los pasos de la solución deben tener al menos 20 caracteres' }),
  id_incidencia: z
    .string()
    .uuid({ message: 'El ID del ticket debe ser un UUID válido' })
    .nullable()
    .optional(),
});

export type ArticuloInput = z.infer<typeof registroArticuloSchema>;
