'use server';

import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
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

    // 1. Obtener todas las incidencias para procesar según el rol
    const ticketsRes = await IncidenciasRepository.getAll();
    if (!ticketsRes.success || !ticketsRes.data) {
      return { success: true, data: [] };
    }

    const tickets = ticketsRes.data;

    if (profile.rol === 'jefe_ti') {
      // Alertas para el Jefe de TI
      // A. Tickets abiertos sin asignar
      const sinAsignar = tickets.filter(t => t.estado === 'abierto' && !t.asignado_a);
      sinAsignar.slice(0, 3).forEach(t => {
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

      // B. Tickets resueltos que requieren cierre/auditoría
      const resueltos = tickets.filter(t => t.estado === 'resuelto');
      resueltos.slice(0, 3).forEach(t => {
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
      // Alertas para el Técnico
      // Tickets asignados a él en progreso o abiertos
      const asignados = tickets.filter(t => t.asignado_a === profile.id_perfil && (t.estado === 'abierto' || t.estado === 'en_progreso'));
      asignados.slice(0, 5).forEach(t => {
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
      // Alertas para el Usuario Final
      // Tickets creados por él que han cambiado de estado
      const deUsuario = tickets.filter(t => t.creado_por === profile.id_perfil);
      deUsuario.slice(0, 5).forEach(t => {
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
