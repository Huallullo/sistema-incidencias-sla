import { z } from 'zod';

// ─── Tipos base de Prioridad de Servicio ───────────────────────────────────
export type NivelPrioridad = 'critica' | 'alta' | 'media' | 'baja';

export interface PrioridadServicio {
  id_prioridad: string;
  nivel: NivelPrioridad;
  descripcion: string;
  tiempo_respuesta_min: number;   // almacenado en MINUTOS
  tiempo_resolucion_min: number;  // almacenado en MINUTOS
  escalamiento: string | null;    // ej. "Inmediato", "1 hora", null
  creado_por: string;             // FK → perfiles.id_perfil
  creado_en: string;
  actualizado_en: string;
  registrador?: { nombre: string; apellido: string } | null;
}

// ─── Esquema Zod de validación ─────────────────────────────────────────────
export const registroPrioridadSchema = z.object({
  nivel: z.enum(['critica', 'alta', 'media', 'baja'], {
    message: 'El nivel de prioridad debe ser: critica, alta, media o baja',
  }),
  descripcion: z
    .string()
    .min(10, { message: 'La descripción debe tener al menos 10 caracteres' })
    .max(255, { message: 'La descripción no puede exceder 255 caracteres' }),
  tiempo_respuesta_min: z
    .number()
    .int({ message: 'El tiempo de respuesta debe ser un número entero de minutos' })
    .positive({ message: 'El tiempo de respuesta debe ser mayor a cero' }),
  tiempo_resolucion_min: z
    .number()
    .int({ message: 'El tiempo de resolución debe ser un número entero de minutos' })
    .positive({ message: 'El tiempo de resolución debe ser mayor a cero' }),
  escalamiento: z.string().max(50).nullable().optional(),
}).refine(
  (data) => data.tiempo_resolucion_min > data.tiempo_respuesta_min,
  {
    message: 'El tiempo de resolución debe ser mayor al tiempo de respuesta',
    path: ['tiempo_resolucion_min'],
  }
);

export type PrioridadInput = z.infer<typeof registroPrioridadSchema>;

// ─── Configuración visual por nivel ───────────────────────────────────────
export const NIVEL_CONFIG: Record<NivelPrioridad, {
  label: string;
  badgeBg: string;
  badgeText: string;
  orden: number;
}> = {
  critica: { label: 'Crítico',  badgeBg: 'bg-red-100',    badgeText: 'text-red-700',    orden: 1 },
  alta:    { label: 'Alto',     badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', orden: 2 },
  media:   { label: 'Medio',    badgeBg: 'bg-blue-100',   badgeText: 'text-blue-700',   orden: 3 },
  baja:    { label: 'Bajo',     badgeBg: 'bg-green-100',  badgeText: 'text-green-700',  orden: 4 },
};

export function formatMinutos(min: number): string {
  if (min < 60) return `${min} min`;
  
  const horas = Math.floor(min / 60);
  const minsRestantes = min % 60;
  
  if (horas < 24) {
    if (minsRestantes === 0) {
      return horas === 1 ? '1 hora' : `${horas} horas`;
    }
    return `${horas} ${horas === 1 ? 'hora' : 'horas'}${minsRestantes > 0 ? ` y ${minsRestantes} min` : ''}`;
  }
  
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  
  if (horasRestantes === 0 && minsRestantes === 0) {
    return dias === 1 ? '1 día' : `${dias} días`;
  }
  
  let parts: string[] = [];
  parts.push(dias === 1 ? '1 día' : `${dias} días`);
  if (horasRestantes > 0) {
    parts.push(horasRestantes === 1 ? '1 hora' : `${horasRestantes} horas`);
  }
  if (minsRestantes > 0) {
    parts.push(`${minsRestantes} min`);
  }
  return parts.join(' y ');
}

