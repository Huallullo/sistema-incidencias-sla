import { supabase } from '@/lib/supabaseClient';
import { Incidencia } from '@/types/incidencias';

export class IncidenciasRepository {
  /**
   * Registra una nueva incidencia en la base de datos
   */
  static async insert(data: {
    titulo: string;
    descripcion: string;
    categoria: string;
    prioridad: string;
    creado_por: string;
  }): Promise<{ success: boolean; data?: Incidencia; error?: string }> {
    try {
      const { data: insertedData, error } = await supabase
        .from('incidencias')
        .insert({
          titulo: data.titulo,
          descripcion: data.descripcion,
          categoria: data.categoria,
          prioridad: data.prioridad,
          creado_por: data.creado_por,
          estado: 'abierto', // estado inicial
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error in IncidenciasRepository.insert:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: insertedData as Incidencia };
    } catch (err) {
      console.error('Exception in IncidenciasRepository.insert:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al persistir la incidencia';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene todas las incidencias creadas por un usuario específico
   */
  static async getByCreadoPor(creadoPor: string): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('incidencias')
        .select(`
          *,
          creador:perfiles!creado_por(nombre, apellido),
          asignado:perfiles!asignado_a(nombre, apellido)
        `)
        .eq('creado_por', creadoPor)
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error in IncidenciasRepository.getByCreadoPor:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as Incidencia[] };
    } catch (err) {
      console.error('Exception in IncidenciasRepository.getByCreadoPor:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener incidencias';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene todas las incidencias de la base de datos (para Jefes de TI y Técnicos)
   */
  static async getAll(): Promise<{ success: boolean; data?: Incidencia[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('incidencias')
        .select(`
          *,
          creador:perfiles!creado_por(nombre, apellido),
          asignado:perfiles!asignado_a(nombre, apellido)
        `)
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error in IncidenciasRepository.getAll:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as Incidencia[] };
    } catch (err) {
      console.error('Exception in IncidenciasRepository.getAll:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener todas las incidencias';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Consulta incidencias aplicando filtros avanzados y reglas de visibilidad por rol
   */
  static async queryTickets(
    rol: 'usuario' | 'tecnico' | 'jefe_ti',
    idPerfil: string,
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
      let query = supabase
        .from('incidencias')
        .select(`
          *,
          creador:perfiles!creado_por(nombre, apellido),
          asignado:perfiles!asignado_a(nombre, apellido)
        `);

      // 1. Aplicar reglas de visibilidad según el rol (seguridad perimetral)
      if (rol === 'usuario') {
        query = query.eq('creado_por', idPerfil);
      } else if (rol === 'tecnico') {
        query = query.eq('asignado_a', idPerfil);
      }
      // Si es jefe_ti, no se aplica restricción de visibilidad (acceso global)

      // 2. Filtros de estado, prioridad y categoría
      if (filtros.estado && filtros.estado !== 'todos') {
        query = query.eq('estado', filtros.estado);
      }
      if (filtros.prioridad && filtros.prioridad !== 'todos') {
        query = query.eq('prioridad', filtros.prioridad);
      }
      if (filtros.categoria && filtros.categoria !== 'todos') {
        query = query.eq('categoria', filtros.categoria);
      }

      // 3. Filtros de fecha de creación
      if (filtros.fechaInicio) {
        query = query.gte('creado_en', filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        // Para incluir todo el día final, podemos usar la comparación hasta el final del día
        query = query.lte('creado_en', filtros.fechaFin);
      }

      // 4. Búsqueda por coincidencia de texto (título, descripción o código)
      if (filtros.busqueda && filtros.busqueda.trim() !== '') {
        const cleanBusqueda = filtros.busqueda.trim();
        query = query.or(`titulo.ilike.%${cleanBusqueda}%,descripcion.ilike.%${cleanBusqueda}%,codigo_ticket.ilike.%${cleanBusqueda}%`);
      }

      // 5. Ordenación por fecha de creación descendente
      query = query.order('creado_en', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error in IncidenciasRepository.queryTickets:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as Incidencia[] };
    } catch (err) {
      console.error('Exception in IncidenciasRepository.queryTickets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al realizar la consulta de incidencias';
      return { success: false, error: errorMessage };
    }
  }
}
