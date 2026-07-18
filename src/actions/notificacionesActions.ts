'use server';

import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

export interface AlertaNotificacion {
  id: string;
  titulo: string;
  descripcion: string;
  tiempo: string;
  leido: boolean;
  tipo: 'alerta' | 'info' | 'urgente';
  link: string;
}

/**
 * Obtiene las alertas de actividad en tiempo real según el rol del usuario conectado
 */
export async function obtenerAlertasNotificacionesAction(
  authUserId: string
): Promise<{ success: boolean; data?: AlertaNotificacion[]; error?: string }> {
  try {
    if (!authUserId) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const profile = await PerfilesRepository.getProfileByUserId(authUserId);
    if (!profile) {
      return { success: false, error: 'Perfil no encontrado' };
    }

    const alertas: AlertaNotificacion[] = [];

    if (profile.rol === 'jefe_ti') {
      // Para el Jefe de TI: consultar SOLO tickets sin asignar y los resueltos pendientes de cierre
      const client = await getSupabaseServerClient();

      // A. Tickets abiertos sin asignar (máx. 3 alertas)
      const { data: sinAsignar } = await client
        .from('incidencias')
        .select('id_incidencia, codigo_ticket, titulo')
        .eq('estado', 'abierto')
        .is('asignado_a', null)
        .order('creado_en', { ascending: true })
        .limit(3);

      (sinAsignar || []).forEach(t => {
        alertas.push({
          id: `tck-asignar-${t.id_incidencia}`,
          titulo: 'Asignación Pendiente',
          descripcion: `El ticket #${t.codigo_ticket.substring(4)} ("${t.titulo}") está abierto y requiere asignación de técnico.`,
          tiempo: 'Hace unos instantes',
          leido: false,
          tipo: 'alerta',
          link: '/dashboard/tickets',
        });
      });

      // B. Tickets resueltos pendientes de auditoría/cierre (máx. 3 alertas)
      const { data: resueltos } = await client
        .from('incidencias')
        .select('id_incidencia, codigo_ticket, titulo')
        .eq('estado', 'resuelto')
        .order('actualizado_en', { ascending: true })
        .limit(3);

      (resueltos || []).forEach(t => {
        alertas.push({
          id: `tck-auditar-${t.id_incidencia}`,
          titulo: 'Auditoría de Cierre',
          descripcion: `El ticket #${t.codigo_ticket.substring(4)} fue resuelto por el técnico y requiere cierre definitivo.`,
          tiempo: 'Pendiente de auditar',
          leido: false,
          tipo: 'urgente',
          link: '/dashboard/tickets',
        });
      });

    } else if (profile.rol === 'tecnico') {
      // Para el Técnico: solo sus tickets asignados que están abiertos o en progreso
      const client = await getSupabaseServerClient();
      const { data: asignados } = await client
        .from('incidencias')
        .select('id_incidencia, codigo_ticket, titulo, estado, prioridad')
        .eq('asignado_a', profile.id_perfil)
        .in('estado', ['abierto', 'en_progreso'])
        .order('creado_en', { ascending: true })
        .limit(5);

      (asignados || []).forEach(t => {
        alertas.push({
          id: `tck-tecnico-${t.id_incidencia}`,
          titulo: t.estado === 'abierto' ? 'Nueva Asignación' : 'Trabajo en Progreso',
          descripcion: `Tienes asignada la atención del ticket #${t.codigo_ticket.substring(4)}: "${t.titulo}".`,
          tiempo: t.estado === 'abierto' ? 'Urgente' : 'En progreso',
          leido: false,
          tipo: t.prioridad === 'critica' || t.prioridad === 'alta' ? 'urgente' : 'info',
          link: '/dashboard/tickets',
        });
      });

    } else {
      // Para el Usuario Final: solo sus propios tickets con estados relevantes
      const client = await getSupabaseServerClient();
      const { data: deUsuario } = await client
        .from('incidencias')
        .select('id_incidencia, codigo_ticket, titulo, estado')
        .eq('creado_por', profile.id_perfil)
        .in('estado', ['en_progreso', 'resuelto', 'cerrado'])
        .order('actualizado_en', { ascending: false })
        .limit(5);

      (deUsuario || []).forEach(t => {
        if (t.estado === 'en_progreso') {
          alertas.push({
            id: `tck-user-prog-${t.id_incidencia}`,
            titulo: 'Ticket en Atención',
            descripcion: `El soporte técnico ha empezado a trabajar en tu ticket #${t.codigo_ticket.substring(4)}.`,
            tiempo: 'En atención',
            leido: false,
            tipo: 'info',
            link: '/dashboard/tickets',
          });
        } else if (t.estado === 'resuelto') {
          alertas.push({
            id: `tck-user-res-${t.id_incidencia}`,
            titulo: 'Resolución de Ticket',
            descripcion: `Tu ticket #${t.codigo_ticket.substring(4)} ha sido marcado como resuelto. Espera el cierre del Jefe de TI.`,
            tiempo: 'Resuelto',
            leido: false,
            tipo: 'info',
            link: '/dashboard/tickets',
          });
        } else if (t.estado === 'cerrado') {
          alertas.push({
            id: `tck-user-close-${t.id_incidencia}`,
            titulo: 'Ticket Cerrado',
            descripcion: `El ticket #${t.codigo_ticket.substring(4)} ha sido auditado y cerrado. ¡Por favor evalúa la atención recibida!`,
            tiempo: 'Cerrado',
            leido: false,
            tipo: 'alerta',
            link: '/dashboard/tickets',
          });
        }
      });
    }

    // Si no hay alertas de base de datos, colocar una informativa por defecto
    if (alertas.length === 0) {
      alertas.push({
        id: 'no-alerts',
        titulo: 'Sin alertas pendientes',
        descripcion: 'No tienes tareas o actualizaciones pendientes de atención en este momento.',
        tiempo: 'Hoy',
        leido: true,
        tipo: 'info',
        link: '#',
      });
    }

    return { success: true, data: alertas };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener alertas';
    return { success: false, error: msg };
  }
}
