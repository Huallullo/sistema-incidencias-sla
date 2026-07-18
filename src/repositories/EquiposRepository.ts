import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { EquipoInformatico } from '@/types/equipo';

export class EquiposRepository {
  /**
   * Registra un nuevo equipo informático en la base de datos
   */
  static async insert(data: {
    codigo: string;
    nombre: string;
    tipo: string;
    marca: string;
    modelo: string;
    numero_serie: string;
    ubicacion: string;
    estado_operativo: string;
    id_usuario_registro: string;
  }): Promise<{ success: boolean; data?: EquipoInformatico; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: insertedData, error } = await client
        .from('equipos_informaticos')
        .insert({
          codigo: data.codigo,
          nombre: data.nombre,
          tipo: data.tipo,
          marca: data.marca,
          modelo: data.modelo,
          numero_serie: data.numero_serie,
          ubicacion: data.ubicacion,
          estado_operativo: data.estado_operativo,
          id_usuario_registro: data.id_usuario_registro,
        })
        .select(`
          *,
          usuario_registro:perfiles!id_usuario_registro(nombre, apellido)
        `)
        .single();

      if (error) {
        console.error('Error in EquiposRepository.insert:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: insertedData as EquipoInformatico };
    } catch (err) {
      console.error('Exception in EquiposRepository.insert:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al registrar el equipo';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Busca un equipo por su código único
   */
  static async findByCodigo(codigo: string): Promise<EquipoInformatico | null> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('equipos_informaticos')
        .select('*')
        .eq('codigo', codigo.trim())
        .maybeSingle();

      if (error) {
        console.error('Error in EquiposRepository.findByCodigo:', error);
        return null;
      }

      return data as EquipoInformatico | null;
    } catch (err) {
      console.error('Exception in EquiposRepository.findByCodigo:', err);
      return null;
    }
  }

  /**
   * Busca un equipo por su número de serie único
   */
  static async findByNumeroSerie(numeroSerie: string): Promise<EquipoInformatico | null> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('equipos_informaticos')
        .select('*')
        .eq('numero_serie', numeroSerie.trim())
        .maybeSingle();

      if (error) {
        console.error('Error in EquiposRepository.findByNumeroSerie:', error);
        return null;
      }

      return data as EquipoInformatico | null;
    } catch (err) {
      console.error('Exception in EquiposRepository.findByNumeroSerie:', err);
      return null;
    }
  }

  /**
   * Recupera todos los equipos informáticos ordenados por fecha de registro descendente
   * con soporte para filtros por query, tipo, ubicación y estado
   */
  static async findAll(filters?: {
    query?: string;
    tipo?: string;
    ubicacion?: string;
    estado_operativo?: string;
  }): Promise<{ success: boolean; data?: EquipoInformatico[]; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      let queryBuilder = client
        .from('equipos_informaticos')
        .select(`
          *,
          usuario_registro:perfiles!id_usuario_registro(nombre, apellido)
        `);

      if (filters) {
        if (filters.tipo && filters.tipo !== 'all') {
          queryBuilder = queryBuilder.eq('tipo', filters.tipo.toLowerCase().trim());
        }
        if (filters.ubicacion && filters.ubicacion !== 'all') {
          queryBuilder = queryBuilder.eq('ubicacion', filters.ubicacion.trim());
        }
        if (filters.estado_operativo && filters.estado_operativo !== 'all') {
          queryBuilder = queryBuilder.eq('estado_operativo', filters.estado_operativo.toLowerCase().trim());
        }
        if (filters.query && filters.query.trim() !== '') {
          const searchTerm = `%${filters.query.trim()}%`;
          queryBuilder = queryBuilder.or(`codigo.ilike.${searchTerm},nombre.ilike.${searchTerm},numero_serie.ilike.${searchTerm}`);
        }
      }

      const { data, error } = await queryBuilder.order('fecha_registro', { ascending: false });

      if (error) {
        console.error('Error in EquiposRepository.findAll:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: (data as EquipoInformatico[]) || [] };
    } catch (err) {
      console.error('Exception in EquiposRepository.findAll:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al cargar los equipos';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene los detalles de un equipo informático específico con su historial de incidencias
   */
  static async getEquipmentDetails(idEquipo: string): Promise<{ success: boolean; data?: EquipoInformatico & { incidencias?: unknown[] }; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('equipos_informaticos')
        .select(`
          *,
          usuario_registro:perfiles!id_usuario_registro(nombre, apellido),
          incidencias:incidencias(id_incidencia, codigo_ticket, titulo, estado, fecha_creacion)
        `)
        .eq('id_equipo', idEquipo)
        .maybeSingle();

      if (error) {
        console.error('Error in EquiposRepository.getEquipmentDetails:', error);
        return { success: false, error: error.message };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { success: true, data: data as any };
    } catch (err) {
      console.error('Exception in EquiposRepository.getEquipmentDetails:', err);
      return { success: false, error: 'Error inesperado al cargar el detalle del equipo' };
    }
  }

  /**
   * Actualiza los datos de un equipo informático
   */
  static async update(
    idEquipo: string,
    data: {
      nombre: string;
      tipo: string;
      marca: string;
      modelo: string;
      numero_serie: string;
      ubicacion: string;
      estado_operativo: string;
    }
  ): Promise<{ success: boolean; data?: EquipoInformatico; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: updatedData, error } = await client
        .from('equipos_informaticos')
        .update({
          nombre: data.nombre,
          tipo: data.tipo,
          marca: data.marca,
          modelo: data.modelo,
          numero_serie: data.numero_serie,
          ubicacion: data.ubicacion,
          estado_operativo: data.estado_operativo,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id_equipo', idEquipo)
        .select(`
          *,
          usuario_registro:perfiles!id_usuario_registro(nombre, apellido)
        `)
        .single();

      if (error) {
        console.error('Error in EquiposRepository.update:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: updatedData as EquipoInformatico };
    } catch (err) {
      console.error('Exception in EquiposRepository.update:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al actualizar el equipo';
      return { success: false, error: errorMessage };
    }
  }
}
