import { supabase } from '@/lib/supabaseClient';
import { generateTemporaryPassword } from '@/utils/security';
import { PerfilUsuario } from '@/types/auth';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

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
  data?: PerfilUsuario[];
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
        data: (data || []) as PerfilUsuario[],
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

  /**
   * Actualiza los datos de perfil de un usuario, validando duplicidad de correo
   */
  static async updateProfileData(
    userId: string,
    profileData: {
      nombre_completo?: string;
      telefono_interno?: string;
      cargo?: string;
      correo?: string;
    }
  ): Promise<{ success: boolean; data?: PerfilUsuario; error?: string }> {
    try {
      // Validar duplicidad de correo si se está intentando cambiar
      if (profileData.correo) {
        const { data: existing, error: checkError } = await supabase
          .from('perfiles')
          .select('user_id')
          .eq('correo', profileData.correo)
          .neq('user_id', userId)
          .maybeSingle();

        if (checkError) {
          return { success: false, error: checkError.message };
        }
        if (existing) {
          return {
            success: false,
            error: 'El correo electrónico ya se encuentra registrado por otro usuario',
          };
        }
      }

      // Llamar al repositorio para realizar la actualización
      return await PerfilesRepository.updateProfile(userId, profileData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el perfil';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Envía un correo de recuperación de contraseña autónoma
   */
  static async sendPasswordReset(
    email: string,
    redirectTo: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validar primero si el correo existe en perfiles
      const { data: userProfile, error: profileError } = await supabase
        .from('perfiles')
        .select('user_id')
        .eq('correo', email)
        .maybeSingle();

      if (profileError) {
        return { success: false, error: profileError.message };
      }
      if (!userProfile) {
        return {
          success: false,
          error: 'El correo electrónico ingresado no se encuentra registrado en el sistema',
        };
      }

      // Enviar correo de restablecimiento de contraseña de Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al solicitar el enlace de recuperación';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Actualiza la contraseña en Supabase Auth
   */
  static async updateUserPassword(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al restablecer la contraseña';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}


