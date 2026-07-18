import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { ArticuloConocimiento } from '@/types/conocimiento';

export class ArticuloConocimientoRepository {
  /**
   * Registra un nuevo artículo de conocimiento
   */
  static async insert(data: {
    titulo: string;
    categoria: string;
    descripcion_problema: string;
    solucion_pasos: string;
    id_incidencia: string | null;
    autor_id: string;
  }): Promise<{ success: boolean; data?: ArticuloConocimiento; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { data: insertedData, error } = await client
        .from('articulos_conocimiento')
        .insert({
          titulo: data.titulo,
          categoria: data.categoria,
          descripcion_problema: data.descripcion_problema,
          solucion_pasos: data.solucion_pasos,
          id_incidencia: data.id_incidencia || null,
          autor_id: data.autor_id,
        })
        .select(`
          *,
          autor:perfiles!autor_id(nombre, apellido),
          incidencia:incidencias!id_incidencia(codigo_ticket, titulo)
        `)
        .single();

      if (error) {
        console.error('Error in ArticuloConocimientoRepository.insert:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: insertedData as ArticuloConocimiento };
    } catch (err) {
      console.error('Exception in ArticuloConocimientoRepository.insert:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al registrar el artículo';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene todos los artículos con filtros opcionales de búsqueda
   */
  static async getAll(filters?: {
    query?: string;
    categoria?: string;
  }): Promise<{ success: boolean; data?: ArticuloConocimiento[]; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      let queryBuilder = client
        .from('articulos_conocimiento')
        .select(`
          *,
          autor:perfiles!autor_id(nombre, apellido),
          incidencia:incidencias!id_incidencia(codigo_ticket, titulo)
        `);

      if (filters?.categoria) {
        queryBuilder = queryBuilder.eq('categoria', filters.categoria);
      }

      if (filters?.query) {
        const cleanQuery = filters.query.trim();
        if (cleanQuery) {
          queryBuilder = queryBuilder.or(
            `titulo.ilike.%${cleanQuery}%,descripcion_problema.ilike.%${cleanQuery}%,solucion_pasos.ilike.%${cleanQuery}%`
          );
        }
      }

      const { data, error } = await queryBuilder.order('creado_en', { ascending: false });

      if (error) {
        console.error('Error in ArticuloConocimientoRepository.getAll:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: (data as ArticuloConocimiento[]) || [] };
    } catch (err) {
      console.error('Exception in ArticuloConocimientoRepository.getAll:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado al cargar los artículos';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Busca un artículo de conocimiento asociado a una incidencia específica
   */
  static async findByIncidenciaId(idIncidencia: string): Promise<ArticuloConocimiento | null> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('articulos_conocimiento')
        .select('*')
        .eq('id_incidencia', idIncidencia)
        .maybeSingle();

      if (error) {
        console.error('Error in ArticuloConocimientoRepository.findByIncidenciaId:', error);
        return null;
      }

      return data as unknown as ArticuloConocimiento;
    } catch (err) {
      console.error('Exception in ArticuloConocimientoRepository.findByIncidenciaId:', err);
      return null;
    }
  }

  /**
   * Registra una consulta a un artículo de conocimiento
   */
  static async registrarConsulta(idArticulo: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await getSupabaseServerClient();
      const { error } = await client
        .from('consultas_articulo')
        .insert({
          id_articulo: idArticulo,
          creado_por: userId || null,
        });

      if (error) {
        console.error('Error in ArticuloConocimientoRepository.registrarConsulta:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      console.error('Exception in ArticuloConocimientoRepository.registrarConsulta:', err);
      const msg = err instanceof Error ? err.message : 'Error al registrar consulta';
      return { success: false, error: msg };
    }
  }
}

