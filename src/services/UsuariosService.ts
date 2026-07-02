import { supabase } from '@/lib/supabaseClient';
import { generateTemporaryPassword } from '@/utils/security';
import { UserRole, PerfilUsuario } from '@/types/auth';
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
 * Mapea un registro de la base de datos (con join de roles) a la interfaz PerfilUsuario
 */
function mapDbToPerfilUsuario(data: any): PerfilUsuario {
  if (!data) return data;

  let rolString: UserRole = 'usuario';
  const roleData = data.roles;
  let dbRoleName: string | null = null;
  if (roleData) {
    if (Array.isArray(roleData)) {
      dbRoleName = roleData[0]?.nombre_rol || null;
    } else if (typeof roleData === 'object') {
      dbRoleName = (roleData as any).nombre_rol || null;
    }
  }

  if (dbRoleName === 'jefe_ti' || data.id_rol === 1) {
    rolString = 'jefe_ti';
  } else if (dbRoleName === 'tecnico' || data.id_rol === 2) {
    rolString = 'tecnico';
  }

  const nombreCompleto = `${data.nombre || ''} ${data.apellido || ''}`.trim();

  return {
    id_perfil: data.id_perfil,
    id_auth_supabase: data.id_auth_supabase,
    id_rol: data.id_rol,
    correo: data.correo,
    nombre: data.nombre || '',
    apellido: data.apellido || '',
    estado: data.estado || 'activo',
    intentos_fallidos: data.intentos_fallidos || 0,
    fecha_bloqueo: data.fecha_bloqueo,
    fecha_creacion: data.fecha_creacion,
    cargo: data.cargo,
    telefono_interno: data.telefono_interno,

    // Compatibilidad hacia atrás
    id: data.id_perfil,
    user_id: data.id_auth_supabase,
    nombre_completo: nombreCompleto,
    rol: rolString,
    bloqueado_hasta: data.fecha_bloqueo,
    created_at: data.fecha_creacion,
  };
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

      // Iniciar consulta a la tabla 'perfiles' con join a 'roles'
      let query = supabase
        .from('perfiles')
        .select('id_perfil, id_auth_supabase, id_rol, correo, nombre, apellido, estado, intentos_fallidos, fecha_bloqueo, fecha_creacion, cargo, telefono_interno, roles(nombre_rol)', { count: 'exact' });

      // Filtrar por rol si no es "todos" y tiene valor
      if (rol && rol !== 'todos') {
        let idRol = 3;
        if (rol === 'jefe_ti') idRol = 1;
        else if (rol === 'tecnico') idRol = 2;
        query = query.eq('id_rol', idRol);
      }

      // Filtrar por búsqueda parcial (ilike) en nombre, apellido o correo
      if (search) {
        query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,correo.ilike.%${search}%`);
      }

      // Ordenar por fecha de creación descendente
      query = query.order('fecha_creacion', { ascending: false });

      // Aplicar rango de paginación
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Mapear cada fila al tipo PerfilUsuario
      const mappedData = (data || []).map(row => mapDbToPerfilUsuario(row));

      return {
        success: true,
        data: mappedData,
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
          .select('id_auth_supabase')
          .eq('correo', profileData.correo)
          .neq('id_auth_supabase', userId)
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
      // Importación dinámica del server action para evitar problemas de compilación en cliente
      const { sendPasswordResetAction } = await import('@/actions/authActions');
      return await sendPasswordResetAction(email, redirectTo);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al solicitar el enlace de recuperación';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verifica si un token de recuperación es válido
   */
  static async verifyPasswordResetToken(
    token: string
  ): Promise<{ success: boolean; data?: { perfil_id: string; id_auth_supabase: string }; error?: string }> {
    try {
      const { verifyPasswordResetTokenAction } = await import('@/actions/authActions');
      return await verifyPasswordResetTokenAction(token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al verificar el token';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Restablece la contraseña utilizando el token temporal de base de datos
   */
  static async resetPasswordWithToken(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { resetPasswordWithTokenAction } = await import('@/actions/authActions');
      return await resetPasswordWithTokenAction(token, newPassword);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al restablecer la contraseña';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Actualiza la contraseña en Supabase Auth (para usuarios autenticados)
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



