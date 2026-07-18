import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { DisponibilidadRepository } from '@/repositories/DisponibilidadRepository';
import { 
  DisponibilidadTecnico, 
  RegistroDisponibilidadInput, 
  RegistroRangoDisponibilidadInput,
  registroDisponibilidadSchema,
  registroRangoDisponibilidadSchema
} from '@/types/disponibilidad';

export class DisponibilidadService {
  /**
   * Registra disponibilidad para un técnico (fecha única o rango de fechas)
   */
  static async registrarDisponibilidad(
    userId: string,
    input: RegistroDisponibilidadInput
  ): Promise<{ success: boolean; data?: DisponibilidadTecnico; error?: string }> {
    try {
      // 1. Validar autorización: Solo Jefe de TI (rol = 1)
      const role = await PerfilesRepository.getRoleByUserId(userId);
      if (role !== 'jefe_ti') {
        return { success: false, error: 'Acceso denegado. Solo el rol Jefe de TI puede registrar disponibilidad.' };
      }

      // 2. Validar estructura con Zod
      const parsed = registroDisponibilidadSchema.safeParse(input);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || 'Error de validación.' };
      }

      const { id_tecnico, fecha, hora_inicio, hora_fin, turno, estado } = parsed.data;

      // 3. Validar conflictos de horario
      const hasConflict = await DisponibilidadRepository.checkOverlap(id_tecnico, fecha, hora_inicio, hora_fin);
      if (hasConflict) {
        return { 
          success: false, 
          error: `Conflicto de horario: El técnico ya tiene disponibilidad registrada en este horario para el día ${fecha}.` 
        };
      }

      // 4. Persistir registro
      return await DisponibilidadRepository.insert({
        id_tecnico,
        fecha,
        hora_inicio,
        hora_fin,
        turno,
        estado
      });
    } catch (err) {
      console.error('Exception in DisponibilidadService.registrarDisponibilidad:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar disponibilidad';
      return { success: false, error: msg };
    }
  }

  /**
   * Registra disponibilidad por un rango de fechas para un técnico (creando un registro por día)
   */
  static async registrarRangoDisponibilidad(
    userId: string,
    input: RegistroRangoDisponibilidadInput
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      // 1. Validar autorización: Solo Jefe de TI (rol = 1)
      const role = await PerfilesRepository.getRoleByUserId(userId);
      if (role !== 'jefe_ti') {
        return { success: false, error: 'Acceso denegado. Solo el rol Jefe de TI puede registrar disponibilidad.' };
      }

      // 2. Validar estructura con Zod
      const parsed = registroRangoDisponibilidadSchema.safeParse(input);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || 'Error de validación.' };
      }

      const { id_tecnico, fecha_inicio, fecha_fin, hora_inicio, hora_fin, turno, estado } = parsed.data;

      // 3. Expandir rango de fechas
      const dates: string[] = [];
      let current = new Date(fecha_inicio + 'T00:00:00');
      const end = new Date(fecha_fin + 'T00:00:00');
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // 4. Validar colisiones en todo el rango antes de insertar (para evitar cargas parciales fallidas)
      for (const d of dates) {
        const hasConflict = await DisponibilidadRepository.checkOverlap(id_tecnico, d, hora_inicio, hora_fin);
        if (hasConflict) {
          return {
            success: false,
            error: `Conflicto de horario: El técnico ya tiene disponibilidad en el horario seleccionado para el día ${d}.`
          };
        }
      }

      // 5. Insertar registros
      let insertCount = 0;
      for (const d of dates) {
        const res = await DisponibilidadRepository.insert({
          id_tecnico,
          fecha: d,
          hora_inicio,
          hora_fin,
          turno,
          estado
        });
        if (res.success) {
          insertCount++;
        }
      }

      return { success: true, count: insertCount };
    } catch (err) {
      console.error('Exception in DisponibilidadService.registrarRangoDisponibilidad:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar rango de disponibilidad';
      return { success: false, error: msg };
    }
  }

  /**
   * Actualiza los datos de una disponibilidad existente
   */
  static async actualizarDisponibilidad(
    userId: string,
    id: string,
    input: {
      fecha?: string;
      hora_inicio?: string;
      hora_fin?: string;
      turno?: 'mañana' | 'tarde' | 'noche';
      estado?: 'disponible' | 'no_disponible';
    }
  ): Promise<{ success: boolean; data?: DisponibilidadTecnico; error?: string }> {
    try {
      // 1. Validar autorización
      const role = await PerfilesRepository.getRoleByUserId(userId);
      if (role !== 'jefe_ti') {
        return { success: false, error: 'Acceso denegado. Solo el rol Jefe de TI puede actualizar disponibilidad.' };
      }

      // 2. Obtener registro actual
      const current = await DisponibilidadRepository.findById(id);
      if (!current) {
        return { success: false, error: 'La disponibilidad no existe.' };
      }

      // 3. Preparar variables de actualización y validar consistencia
      const fecha = input.fecha !== undefined ? input.fecha : current.fecha;
      const hora_inicio = input.hora_inicio !== undefined ? input.hora_inicio : current.hora_inicio;
      const hora_fin = input.hora_fin !== undefined ? input.hora_fin : current.hora_fin;
      const turno = input.turno !== undefined ? input.turno : current.turno;
      const estado = input.estado !== undefined ? input.estado : current.estado;

      // Validar orden de horas
      if (hora_inicio >= hora_fin) {
        return { success: false, error: 'La hora de inicio debe ser estrictamente menor que la hora de fin.' };
      }

      // 4. Validar conflicto de horario excluyendo el registro actual
      const hasConflict = await DisponibilidadRepository.checkOverlap(
        current.id_tecnico,
        fecha,
        hora_inicio,
        hora_fin,
        id
      );

      if (hasConflict) {
        return {
          success: false,
          error: `Conflicto de horario: El técnico ya tiene disponibilidad registrada en este horario para el día ${fecha}.`
        };
      }

      // 5. Guardar cambios
      return await DisponibilidadRepository.update(id, {
        fecha,
        hora_inicio,
        hora_fin,
        turno,
        estado
      });
    } catch (err) {
      console.error('Exception in DisponibilidadService.actualizarDisponibilidad:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar disponibilidad';
      return { success: false, error: msg };
    }
  }

  /**
   * Elimina un registro de disponibilidad
   */
  static async eliminarDisponibilidad(
    userId: string,
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validar autorización
      const role = await PerfilesRepository.getRoleByUserId(userId);
      if (role !== 'jefe_ti') {
        return { success: false, error: 'Acceso denegado. Solo el rol Jefe de TI puede eliminar disponibilidad.' };
      }

      // 2. Verificar existencia
      const current = await DisponibilidadRepository.findById(id);
      if (!current) {
        return { success: false, error: 'La disponibilidad no existe.' };
      }

      // 3. Eliminar
      return await DisponibilidadRepository.delete(id);
    } catch (err) {
      console.error('Exception in DisponibilidadService.eliminarDisponibilidad:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al eliminar disponibilidad';
      return { success: false, error: msg };
    }
  }

  /**
   * Obtiene listado de disponibilidad filtrado (Accesible para cualquier rol autenticado)
   */
  static async obtenerDisponibilidades(
    userId: string,
    filters: {
      id_tecnico?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      turno?: string;
      estado?: string;
    } = {}
  ): Promise<DisponibilidadTecnico[]> {
    try {
      // Cualquier usuario con sesión activa puede leer las disponibilidades (para flujos de asignación y calendarios)
      const role = await PerfilesRepository.getRoleByUserId(userId);
      if (!role) {
        return [];
      }

      return await DisponibilidadRepository.findAll(filters);
    } catch (err) {
      console.error('Exception in DisponibilidadService.obtenerDisponibilidades:', err);
      return [];
    }
  }
}
