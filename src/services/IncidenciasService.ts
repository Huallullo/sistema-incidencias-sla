import { IncidenciaInput, registroIncidenciaSchema, Incidencia, EstadoIncidencia, transitionSchema } from '@/types/incidencias';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { HistorialEstadoTicketRepository } from '@/repositories/HistorialEstadoTicketRepository';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

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
        return { success: false, error: updateResult.error || 'Error al actualizar el estado del ticket' };
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
      return { success: false, error: errorMessage };
    }
  }
}
