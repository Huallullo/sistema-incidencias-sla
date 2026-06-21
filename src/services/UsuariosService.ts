import { supabase } from '@/lib/supabaseClient';
import { generateTemporaryPassword } from '@/utils/security';

export interface RegisterUserParams {
  email: string;
  nombre_completo: string;
  rol: string;
  area?: string | null;
  telefono?: string | null;
  cargo?: string | null;
  password?: string;
}

export interface GetUsersParams {
  search?: string;  // Búsqueda por nombre o correo
  rol?: string;     // Filtro por rol (jefe_ti, tecnico, usuario, todos)
  page?: number;    // Número de página (1-indexed)
  limit?: number;   // Cantidad de registros por página
}

export interface GetUsersResult {
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
}

/**
 * Service to handle User Operations
 */
export class UsuariosService {
  /**
   * Registers a new user calling the Supabase Edge Function 'register-user'
   */
  static async registerUser(params: RegisterUserParams): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        return {
          success: false,
          error: 'Faltan las variables de entorno de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL.',
        };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'No tienes sesión activa. Inicia sesión nuevamente.',
        };
      }

      // Generar contraseña/token temporal si no se pasa una
      const password = params.password || generateTemporaryPassword();

      const response = await fetch(
        `${supabaseUrl}/functions/v1/register-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: params.email,
            password,
            nombre_completo: params.nombre_completo,
            rol: params.rol,
            area: params.area || null,
            telefono: params.telefono || null,
            cargo: params.cargo || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Error al registrar usuario',
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar la solicitud';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Obtiene el listado de usuarios con filtros de búsqueda, rol y paginación
   */
  static async getUsers(params: GetUsersParams = {}): Promise<GetUsersResult> {
    try {
      const search = params.search?.trim();
      const rol = params.rol;
      const page = params.page || 1;
      const limit = params.limit || 10;

      // Calcular rango para la paginación de Supabase
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Iniciar consulta a la tabla 'perfiles'
      let query = supabase
        .from('perfiles')
        .select('id, user_id, nombre_completo, rol, intentos_fallidos, created_at, telefono_interno, cargo, correo, estado', { count: 'exact' });

      // Filtrar por rol si no es "todos" y tiene valor
      if (rol && rol !== 'todos') {
        query = query.eq('rol', rol);
      }

      // Filtrar por búsqueda parcial (ilike) en nombre o correo
      if (search) {
        query = query.or(`nombre_completo.ilike.%${search}%,correo.ilike.%${search}%`);
      }

      // Ordenar por fecha de creación descendente
      query = query.order('created_at', { ascending: false });

      // Aplicar rango de paginación
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data || [],
        count: count || 0,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar la consulta';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

