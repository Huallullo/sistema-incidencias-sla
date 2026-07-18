import { RegistroEquipoInput, registroEquipoSchema, EquipoInformatico, ActualizarEquipoInput, actualizarEquipoSchema, HistorialEstadoEquipo } from '@/types/equipo';
import { EquiposRepository } from '@/repositories/EquiposRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { HistorialEstadoEquipoRepository } from '@/repositories/HistorialEstadoEquipoRepository';
import { translateError } from '@/utils/errorTranslator';

export class EquiposService {
  /**
   * Valida y registra un nuevo equipo informático
   */
  static async registrarEquipo(
    input: RegistroEquipoInput,
    authUserId: string
  ): Promise<{ success: boolean; data?: EquipoInformatico; error?: string }> {
    try {
      // 1. Validar los parámetros utilizando el esquema Zod
      const validationResult = registroEquipoSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((e) => e.message).join(', ');
        return { success: false, error: errorMessages };
      }

      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 2. Obtener el perfil del usuario y validar que sea Jefe de TI (id_rol = 1)
      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta.' };
      }

      if (profile.id_rol !== 1) {
        return {
          success: false,
          error: 'Acceso denegado. Solo el rol Jefe de TI puede registrar equipos informáticos.',
        };
      }

      // 3. Validar que el código no exista previamente
      const existingCode = await EquiposRepository.findByCodigo(input.codigo);
      if (existingCode) {
        return {
          success: false,
          error: `El código "${input.codigo}" ya se encuentra registrado en el inventario.`,
        };
      }

      // 4. Validar que el número de serie no exista previamente
      const existingSerial = await EquiposRepository.findByNumeroSerie(input.numero_serie);
      if (existingSerial) {
        return {
          success: false,
          error: `El número de serie "${input.numero_serie}" ya se encuentra registrado en el inventario.`,
        };
      }

      // 5. Registrar el equipo
      const insertResult = await EquiposRepository.insert({
        codigo: input.codigo.trim(),
        nombre: input.nombre.trim(),
        tipo: input.tipo.trim(),
        marca: input.marca.trim(),
        modelo: input.modelo.trim(),
        numero_serie: input.numero_serie.trim(),
        ubicacion: input.ubicacion.trim(),
        estado_operativo: input.estado_operativo,
        id_usuario_registro: profile.id_perfil,
      });

      if (!insertResult.success) {
        return { success: false, error: translateError(insertResult.error) };
      }

      return { success: true, data: insertResult.data };
    } catch (err) {
      console.error('Exception in EquiposService.registrarEquipo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al registrar el equipo';
      return { success: false, error: translateError(errorMessage) };
    }
  }

  /**
   * Obtiene la lista de todos los equipos registrados con soporte para filtros
   */
  static async obtenerEquipos(filters?: {
    query?: string;
    tipo?: string;
    ubicacion?: string;
    estado_operativo?: string;
  }): Promise<{ success: boolean; data?: EquipoInformatico[]; error?: string }> {
    try {
      const result = await EquiposRepository.findAll(filters);
      if (!result.success) {
        return { success: false, error: translateError(result.error) };
      }
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Exception in EquiposService.obtenerEquipos:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener los equipos';
      return { success: false, error: translateError(errorMessage) };
    }
  }

  /**
   * Obtiene los detalles de un equipo informático y su historial de incidencias
   */
  static async obtenerDetalleEquipo(
    idEquipo: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!idEquipo) {
        return { success: false, error: 'Identificador del equipo no proporcionado.' };
      }
      const result = await EquiposRepository.getEquipmentDetails(idEquipo);
      if (!result.success) {
        return { success: false, error: translateError(result.error) };
      }
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Exception in EquiposService.obtenerDetalleEquipo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al cargar el detalle del equipo';
      return { success: false, error: translateError(errorMessage) };
    }
  }

  /**
   * Actualiza los datos de un equipo informático y registra cambios de estado
   */
  static async actualizarEquipo(
    idEquipo: string,
    input: ActualizarEquipoInput,
    authUserId: string,
    observacion?: string
  ): Promise<{ success: boolean; data?: EquipoInformatico; error?: string }> {
    try {
      // 1. Validar los parámetros utilizando el esquema Zod
      const validationResult = actualizarEquipoSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((e) => e.message).join(', ');
        return { success: false, error: errorMessages };
      }

      if (!idEquipo) {
        return { success: false, error: 'Identificador del equipo no proporcionado.' };
      }

      if (!authUserId) {
        return { success: false, error: 'Sesión no válida. Inicie sesión nuevamente.' };
      }

      // 2. Obtener el perfil del usuario y validar que sea Jefe de TI (id_rol = 1)
      const profile = await PerfilesRepository.getProfileByUserId(authUserId);
      if (!profile) {
        return { success: false, error: 'No se encontró un perfil asociado a su cuenta.' };
      }

      if (profile.id_rol !== 1) {
        return {
          success: false,
          error: 'Acceso denegado. Solo el rol Jefe de TI puede actualizar la ficha de equipos.',
        };
      }

      // 3. Obtener los datos actuales del equipo
      const currentRes = await EquiposRepository.getEquipmentDetails(idEquipo);
      if (!currentRes.success || !currentRes.data) {
        return { success: false, error: 'No se encontró el equipo informático especificado.' };
      }
      const currentEquipment = currentRes.data;

      // 4. Validar duplicidad de número de serie si cambió
      if (input.numero_serie.trim().toLowerCase() !== (currentEquipment.numero_serie as string).trim().toLowerCase()) {
        const existingSerial = await EquiposRepository.findByNumeroSerie(input.numero_serie);
        if (existingSerial && existingSerial.id_equipo !== idEquipo) {
          return {
            success: false,
            error: `El número de serie "${input.numero_serie}" ya se encuentra registrado en otro equipo del inventario.`,
          };
        }
      }

      // 5. Validar y registrar cambio de estado operativo si corresponde
      if (input.estado_operativo !== (currentEquipment.estado_operativo as string)) {
        if (!observacion || observacion.trim() === '') {
          return {
            success: false,
            error: 'Debe ingresar una observación que justifique el cambio de estado operativo.',
          };
        }

        const historyResult = await HistorialEstadoEquipoRepository.insert({
          id_equipo: idEquipo,
          estado_anterior: currentEquipment.estado_operativo as string,
          estado_nuevo: input.estado_operativo,
          observacion: observacion.trim(),
          id_usuario_cambio: profile.id_perfil,
        });

        if (!historyResult.success) {
          return {
            success: false,
            error: `Error al registrar el historial de estado: ${translateError(historyResult.error)}`,
          };
        }
      }

      // 6. Actualizar los datos del equipo
      const updateResult = await EquiposRepository.update(idEquipo, {
        nombre: input.nombre.trim(),
        tipo: input.tipo.trim(),
        marca: input.marca.trim(),
        modelo: input.modelo.trim(),
        numero_serie: input.numero_serie.trim(),
        ubicacion: input.ubicacion.trim(),
        estado_operativo: input.estado_operativo,
      });

      if (!updateResult.success) {
        return { success: false, error: translateError(updateResult.error) };
      }

      return { success: true, data: updateResult.data };
    } catch (err) {
      console.error('Exception in EquiposService.actualizarEquipo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al actualizar el equipo';
      return { success: false, error: translateError(errorMessage) };
    }
  }

  /**
   * Obtiene el historial de estados de un equipo informático
   */
  static async obtenerHistorialEstados(
    idEquipo: string
  ): Promise<{ success: boolean; data?: HistorialEstadoEquipo[]; error?: string }> {
    try {
      if (!idEquipo) {
        return { success: false, error: 'Identificador del equipo no proporcionado.' };
      }
      return await HistorialEstadoEquipoRepository.findByEquipoId(idEquipo);
    } catch (err) {
      console.error('Exception in EquiposService.obtenerHistorialEstados:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener el historial';
      return { success: false, error: translateError(errorMessage) };
    }
  }
}
