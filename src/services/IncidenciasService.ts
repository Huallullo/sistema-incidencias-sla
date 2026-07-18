import { IncidenciaInput, registroIncidenciaSchema, Incidencia, EstadoIncidencia, transitionSchema } from '@/types/incidencias';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { HistorialEstadoTicketRepository } from '@/repositories/HistorialEstadoTicketRepository';
import { ArticuloConocimientoRepository } from '@/repositories/ArticuloConocimientoRepository';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { translateError } from '@/utils/errorTranslator';

export class IncidenciasService {
  /**
   * Valida y registra una nueva incidencia en el sistema
   */
  static async registrarIncidencia(
    input: IncidenciaInput,
    userId: string
  ): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
    try {
      // 1. Validar los parámetros utilizando el esquema Zod
      const validationResult = registroIncidenciaSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((e) => e.message).join(', ');
        return { success: false, error: errorMessages };
      }

      if (!userId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 2. Obtener el perfil del usuario para asociar su id_perfil interno
      const profile = await PerfilesRepository.getProfileByUserId(userId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta' };
      }

      // 3. Registrar la incidencia asociando el creador detectado
      return await IncidenciasRepository.insert({
        titulo: input.titulo,
        descripcion: input.descripcion,
        categoria: input.categoria,
        prioridad: input.prioridad,
        creado_por: profile.id_perfil,
      });
    } catch (err) {
      console.error('Exception in IncidenciasService.registrarIncidencia:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al registrar incidencia';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene la lista de incidencias asociadas al usuario actual
   */
  static async obtenerIncidenciasDeUsuario(
    userId: string
  ): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
    try {
      if (!userId) {
        return { success: false, error: 'Usuario no identificado' };
      }

      const profile = await PerfilesRepository.getProfileByUserId(userId);
      if (!profile) {
        return { success: false, error: 'Perfil no encontrado' };
      }

      return await IncidenciasRepository.getByCreadoPor(profile.id_perfil);
    } catch (err) {
      console.error('Exception in IncidenciasService.obtenerIncidenciasDeUsuario:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener incidencias del usuario';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene la lista global de todas las incidencias (para personal de soporte)
   */
  static async obtenerTodasLasIncidencias(): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
    try {
      return await IncidenciasRepository.getAll();
    } catch (err) {
      console.error('Exception in IncidenciasService.obtenerTodasLasIncidencias:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener incidencias globales';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Consulta incidencias filtradas aplicando las reglas de negocio del rol del usuario
   */
  static async consultarIncidencias(
    userId: string,
    filtros: {
      estado?: string;
      prioridad?: string;
      categoria?: string;
      fechaInicio?: string;
      fechaFin?: string;
      busqueda?: string;
    }
  ): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
    try {
      if (!userId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 1. Obtener el perfil y rol del usuario
      const profile = await PerfilesRepository.getProfileByUserId(userId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta' };
      }

      // 2. Consultar incidencias delegando al repositorio con el rol del usuario
      return await IncidenciasRepository.queryTickets(
        profile.rol,
        profile.id_perfil,
        filtros
      );
    } catch (err) {
      console.error('Exception in IncidenciasService.consultarIncidencias:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al consultar incidencias';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Actualiza el estado de una incidencia, validando el rol del usuario,
   * la coherencia de la transición, registrando en el historial y notificando.
   */
  static async actualizarEstadoTicket(
    incidenciaId: string,
    nuevoEstado: EstadoIncidencia,
    authUserId: string
  ): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
    try {
      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 1. Validar el rol del usuario (Técnico / Jefe de TI)
      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta' };
      }

      if (profile.id_rol !== 1 && profile.id_rol !== 2) {
        return { success: false, error: 'Solo los Técnicos y Jefes de TI pueden actualizar el estado de una incidencia' };
      }

      // 2. Obtener el ticket/incidencia actual
      const getTicketResult = await IncidenciasRepository.getById(incidenciaId);
      if (!getTicketResult.success || !getTicketResult.data) {
        return { success: false, error: getTicketResult.error || 'La incidencia no existe' };
      }
      const ticket = getTicketResult.data;
      const estadoAnterior = ticket.estado;

      // 3. Validar transición de estado coherente usando Zod schema
      const validation = transitionSchema.safeParse({
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
      });

      if (!validation.success) {
        return { success: false, error: 'La transición de estado no es válida o es incoherente.' };
      }

      // 4. Actualizar el estado del ticket
      const updateResult = await IncidenciasRepository.updateEstado(incidenciaId, nuevoEstado);
      if (!updateResult.success || !updateResult.data) {
        return { success: false, error: translateError(updateResult.error) };
      }

      // 5. Registrar en el historial de cambios de estado
      const historyResult = await HistorialEstadoTicketRepository.insert({
        id_incidencia: incidenciaId,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        id_perfil_responsable: profile.id_perfil,
      });

      if (!historyResult.success) {
        console.error('Warning: Failed to write to status history log:', historyResult.error);
      }

      // 6. Notificar al usuario reportante (insertar log en email_logs)
      const reportante = ticket.creador;
      if (reportante && reportante.id_auth_supabase) {
        const client = await getSupabaseServerClient();
        
        const mapEstadoStr = (est: string) => {
          if (est === 'abierto') return 'Abierto';
          if (est === 'en_progreso') return 'En progreso';
          if (est === 'resuelto') return 'Resuelto';
          if (est === 'cerrado') return 'Cerrado';
          return est;
        };

        const mailBody = `Hola ${reportante.nombre},\n\nTe informamos que tu ticket con código #${ticket.codigo_ticket.substring(4)} ("${ticket.titulo}") ha sido actualizado.\n\nEstado anterior: ${mapEstadoStr(estadoAnterior)}\nEstado nuevo: ${mapEstadoStr(nuevoEstado)}\nResponsable del cambio: ${profile.nombre} ${profile.apellido}\n\nSaludos,\nEquipo de Soporte de TI.`;

        const { error: logError } = await client
          .from('email_logs')
          .insert({
            user_id: reportante.id_auth_supabase,
            email_destino: reportante.correo || 'usuario@empresa.pe',
            asunto: `Actualización de ticket #${ticket.codigo_ticket.substring(4)}`,
            cuerpo: mailBody,
            estado: 'pendiente',
          });

        if (logError) {
          console.error('Warning: Failed to queue email notification:', logError);
        }
      }

      return { success: true, data: updateResult.data };
    } catch (err) {
      console.error('Exception in IncidenciasService.actualizarEstadoTicket:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al actualizar el estado del ticket';
      return { success: false, error: translateError(errorMessage) };
    }
  }

  /**
   * Asigna un técnico a una incidencia (Solo Jefe de TI)
   */
  static async asignarTecnico(
    incidenciaId: string,
    tecnicoId: string | null,
    authUserId: string
  ): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
    try {
      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 1. Validar el rol del usuario asignador (debe ser Jefe de TI, id_rol = 1)
      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta' };
      }

      if (profile.id_rol !== 1) {
        return { success: false, error: 'Solo el Jefe de TI puede asignar técnicos a una incidencia.' };
      }

      // 2. Si se especifica un técnico, verificar que su perfil tenga rol de técnico (id_rol = 2)
      if (tecnicoId) {
        const tecnicoProfile = await PerfilesRepository.getProfileById(tecnicoId);
        if (!tecnicoProfile) {
          return { success: false, error: 'El técnico seleccionado no existe.' };
        }
        if (tecnicoProfile.id_rol !== 2) {
          return { success: false, error: 'El usuario seleccionado no tiene el rol de Técnico.' };
        }
      }

      // 3. Ejecutar la asignación
      const assignResult = await IncidenciasRepository.updateAsignacion(incidenciaId, tecnicoId);
      if (!assignResult.success || !assignResult.data) {
        return { success: false, error: translateError(assignResult.error) };
      }

      // 4. Notificar al técnico asignado (si aplica)
      if (tecnicoId && assignResult.data) {
        const tecnicoProfile = await PerfilesRepository.getProfileById(tecnicoId);
        if (tecnicoProfile && tecnicoProfile.id_auth_supabase) {
          const client = await getSupabaseServerClient();
          const ticket = assignResult.data;
          const mailBody = `Hola ${tecnicoProfile.nombre},\n\nTe informamos que se te ha asignado el ticket de incidencia con código #${ticket.codigo_ticket.substring(4)} ("${ticket.titulo}").\n\nPor favor, ingresa al sistema para revisar el detalle y comenzar su atención.\n\nSaludos,\nEquipo de Soporte de TI.`;

          const { error: logError } = await client
            .from('email_logs')
            .insert({
              user_id: tecnicoProfile.id_auth_supabase,
              email_destino: tecnicoProfile.correo || 'tecnico@empresa.pe',
              asunto: `Asignación de ticket #${ticket.codigo_ticket.substring(4)}`,
              cuerpo: mailBody,
              estado: 'pendiente',
            });

          if (logError) {
            console.error('Warning: Failed to queue assignee email notification:', logError);
          }
        }
      }

      return { success: true, data: assignResult.data };
    } catch (err) {
      console.error('Exception in IncidenciasService.asignarTecnico:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al asignar el técnico';
      return { success: false, error: translateError(errorMessage) };
    }
  }

  /**
   * Cierra definitivamente un ticket de incidencia tras validar que esté resuelto,
   * tenga una solución registrada en la base de conocimientos y que el usuario sea Jefe de TI.
   */
  static async cerrarTicketAuditado(
    incidenciaId: string,
    observaciones: string,
    authUserId: string
  ): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
    try {
      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 1. Validar el rol del usuario (debe ser Jefe de TI, id_rol = 1)
      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta.' };
      }

      if (profile.id_rol !== 1) {
        return { success: false, error: 'Acceso restringido. Solo el Jefe de TI puede auditar y realizar el cierre definitivo de tickets.' };
      }

      // 2. Obtener el ticket
      const getTicketResult = await IncidenciasRepository.getById(incidenciaId);
      if (!getTicketResult.success || !getTicketResult.data) {
        return { success: false, error: 'La incidencia no existe.' };
      }
      const ticket = getTicketResult.data;

      // 3. Impedir el cierre de tickets que no estén resueltos
      if (ticket.estado !== 'resuelto') {
        return {
          success: false,
          error: `No se puede cerrar el ticket: actualmente está en estado "${ticket.estado}". Solo se pueden auditar y cerrar incidencias en estado "resuelto".`
        };
      }

      // 4. Impedir el cierre de tickets sin una solución registrada en la base de conocimientos
      // Buscamos un artículo que tenga este ticket vinculado
      const kbArticle = await ArticuloConocimientoRepository.findByIncidenciaId(incidenciaId);
      if (!kbArticle) {
        return {
          success: false,
          error: 'No se puede cerrar el ticket: no se ha registrado ninguna solución en la base de conocimientos para esta incidencia.'
        };
      }

      // 5. Proceder al cierre definitivo en base de datos
      const closeResult = await IncidenciasRepository.closeTicket(
        incidenciaId,
        profile.id_perfil,
        observaciones
      );

      if (!closeResult.success || !closeResult.data) {
        return { success: false, error: translateError(closeResult.error) };
      }

      // 6. Registrar en el historial de cambios de estado
      const historyResult = await HistorialEstadoTicketRepository.insert({
        id_incidencia: incidenciaId,
        estado_anterior: 'resuelto',
        estado_nuevo: 'cerrado',
        id_perfil_responsable: profile.id_perfil,
      });

      if (!historyResult.success) {
        console.error('Warning: Failed to log state change to closure:', historyResult.error);
      }

      // 7. Notificar al usuario reportante
      const reportante = ticket.creador;
      if (reportante && reportante.id_auth_supabase) {
        const client = await getSupabaseServerClient();
        const mailBody = `Hola ${reportante.nombre},\n\nTe informamos que tu ticket con código #${ticket.codigo_ticket.substring(4)} ("${ticket.titulo}") ha sido cerrado y auditado formalmente por el Jefe de TI.\n\nDetalles del Cierre:\nFecha/Hora: ${new Date().toLocaleString('es-PE')}\nObservaciones del Cierre:\n"${observaciones}"\n\nSaludos,\nEquipo de Soporte de TI.`;

        const { error: logError } = await client
          .from('email_logs')
          .insert({
            user_id: reportante.id_auth_supabase,
            email_destino: reportante.correo || 'usuario@empresa.pe',
            asunto: `Cierre definitivo y auditoría de ticket #${ticket.codigo_ticket.substring(4)}`,
            cuerpo: mailBody,
            estado: 'pendiente',
          });

        if (logError) {
          console.error('Warning: Failed to queue closure notification email:', logError);
        }
      }

      return { success: true, data: closeResult.data };
    } catch (err) {
      console.error('Exception in IncidenciasService.cerrarTicketAuditado:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al auditar e iniciar cierre definitivo';
      return { success: false, error: translateError(errorMessage) };
    }
  }
}
