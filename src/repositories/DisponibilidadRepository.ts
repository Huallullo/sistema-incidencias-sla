import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { DisponibilidadTecnico } from '@/types/disponibilidad';

export class DisponibilidadRepository {
  /**
   * Registra una disponibilidad en la base de datos
   */
  static async insert(data: {
    id_tecnico: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    turno: string;
    estado: string;
  }): Promise<{ success: boolean; data?: DisponibilidadTecnico; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: inserted, error } = await client
        .from('disponibilidad_tecnico')
        .insert({
          id_tecnico: data.id_tecnico,
          fecha: data.fecha,
          hora_inicio: data.hora_inicio,
          hora_fin: data.hora_fin,
          turno: data.turno,
          estado: data.estado,
        })
        .select('*, tecnico:perfiles!id_tecnico(nombre, apellido, correo)')
        .single();

      if (error) {
        console.error('Error in DisponibilidadRepository.insert:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: inserted as unknown as DisponibilidadTecnico };
    } catch (err) {
      console.error('Exception in DisponibilidadRepository.insert:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al persistir la disponibilidad';
      return { success: false, error: msg };
    }
  }

  /**
   * Registra múltiples disponibilidades en una sola operación atómica (bulk insert)
   */
  static async insertMany(rows: {
    id_tecnico: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    turno: string;
    estado: string;
  }[]): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: inserted, error } = await client
        .from('disponibilidad_tecnico')
        .insert(rows.map(row => ({
          id_tecnico: row.id_tecnico,
          fecha: row.fecha,
          hora_inicio: row.hora_inicio,
          hora_fin: row.hora_fin,
          turno: row.turno,
          estado: row.estado,
        })))
        .select('id_disponibilidad');

      if (error) {
        console.error('Error in DisponibilidadRepository.insertMany:', error);
        return { success: false, error: error.message };
      }

      return { success: true, count: inserted?.length || 0 };
    } catch (err) {
      console.error('Exception in DisponibilidadRepository.insertMany:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al persistir lote de disponibilidades';
      return { success: false, error: msg };
    }
  }

  /**
   * Actualiza un registro de disponibilidad
   */
  static async update(
    id: string,
    data: {
      fecha?: string;
      hora_inicio?: string;
      hora_fin?: string;
      turno?: string;
      estado?: string;
    }
  ): Promise<{ success: boolean; data?: DisponibilidadTecnico; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: updated, error } = await client
        .from('disponibilidad_tecnico')
        .update(data)
        .eq('id_disponibilidad', id)
        .select('*, tecnico:perfiles!id_tecnico(nombre, apellido, correo)')
        .single();

      if (error) {
        console.error('Error in DisponibilidadRepository.update:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: updated as unknown as DisponibilidadTecnico };
    } catch (err) {
      console.error('Exception in DisponibilidadRepository.update:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar la disponibilidad';
      return { success: false, error: msg };
    }
  }

  /**
   * Elimina un registro de disponibilidad
   */
  static async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { error } = await client
        .from('disponibilidad_tecnico')
        .delete()
        .eq('id_disponibilidad', id);

      if (error) {
        console.error('Error in DisponibilidadRepository.delete:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Exception in DisponibilidadRepository.delete:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al eliminar la disponibilidad';
      return { success: false, error: msg };
    }
  }

  /**
   * Obtiene un registro por su ID
   */
  static async findById(id: string): Promise<DisponibilidadTecnico | null> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('disponibilidad_tecnico')
        .select('*, tecnico:perfiles!id_tecnico(nombre, apellido, correo)')
        .eq('id_disponibilidad', id)
        .single();

      if (error) {
        console.error('Error in DisponibilidadRepository.findById:', error);
        return null;
      }

      return data as unknown as DisponibilidadTecnico;
    } catch (err) {
      console.error('Exception in DisponibilidadRepository.findById:', err);
      return null;
    }
  }

  /**
   * Verifica si existe un cruce de horarios para un técnico en una fecha específica
   */
  static async checkOverlap(
    idTecnico: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const client = await getSupabaseServerClient();
      let query = client
        .from('disponibilidad_tecnico')
        .select('id_disponibilidad')
        .eq('id_tecnico', idTecnico)
        .eq('fecha', fecha)
        .lt('hora_inicio', horaFin)
        .gt('hora_fin', horaInicio);

      if (excludeId) {
        query = query.neq('id_disponibilidad', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error in checkOverlap query:', error);
        return true; // Ante error, asumimos conflicto por seguridad
      }

      return (data && data.length > 0);
    } catch (err) {
      console.error('Exception in checkOverlap:', err);
      return true;
    }
  }

  /**
   * Consulta las disponibilidades registradas aplicando filtros
   */
  static async findAll(filters: {
    id_tecnico?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    turno?: string;
    estado?: string;
  } = {}): Promise<DisponibilidadTecnico[]> {
    try {
      const client = await getSupabaseServerClient();
      let query = client
        .from('disponibilidad_tecnico')
        .select('*, tecnico:perfiles!id_tecnico(nombre, apellido, correo)');

      if (filters.id_tecnico) {
        query = query.eq('id_tecnico', filters.id_tecnico);
      }
      if (filters.fecha_inicio) {
        query = query.gte('fecha', filters.fecha_inicio);
      }
      if (filters.fecha_fin) {
        query = query.lte('fecha', filters.fecha_fin);
      }
      if (filters.turno) {
        query = query.eq('turno', filters.turno);
      }
      if (filters.estado) {
        query = query.eq('estado', filters.estado);
      }

      // Ordenar por fecha y hora de inicio de forma ascendente
      const { data, error } = await query.order('fecha', { ascending: true }).order('hora_inicio', { ascending: true });

      if (error) {
        console.error('Error in DisponibilidadRepository.findAll:', error);
        return [];
      }

      return (data || []) as unknown as DisponibilidadTecnico[];
    } catch (err) {
      console.error('Exception in DisponibilidadRepository.findAll:', err);
      return [];
    }
  }
}
