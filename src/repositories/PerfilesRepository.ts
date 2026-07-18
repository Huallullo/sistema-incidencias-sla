import { supabase as browserClient } from '@/lib/supabaseClient';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { UserRole, PerfilUsuario } from '@/types/auth';

/**
 * Mapea un registro de la base de datos (con join de roles) a la interfaz PerfilUsuario
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToPerfilUsuario(data: any): PerfilUsuario {
  if (!data) return data;

  // Determinar rol como UserRole string
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

  // Reconstruir nombre_completo
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
 * PerfilesRepository - Acceso a datos de perfiles de usuarios
 * Capa de acceso a datos (Data Access Layer)
 */
export class PerfilesRepository {
  /**
   * Obtiene el rol de un usuario por su ID
   */
  static async getRoleByUserId(userId: string): Promise<UserRole | null> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('perfiles')
        .select('id_rol, roles(nombre_rol)')
        .eq('id_auth_supabase', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      const roleData = data?.roles;
      let roleName: string | null = null;
      if (roleData) {
        if (Array.isArray(roleData)) {
          roleName = roleData[0]?.nombre_rol || null;
        } else if (typeof roleData === 'object') {
          roleName = (roleData as any).nombre_rol || null;
        }
      }

      if (roleName === 'jefe_ti' || data?.id_rol === 1) return 'jefe_ti';
      if (roleName === 'tecnico' || data?.id_rol === 2) return 'tecnico';
      if (roleName === 'usuario' || data?.id_rol === 3) return 'usuario';

      return null;
    } catch (err) {
      console.error('Exception in getRoleByUserId:', err);
      return null;
    }
  }

  /**
   * Obtiene el perfil completo de un usuario
   */
  static async getProfileByUserId(userId: string): Promise<PerfilUsuario | null> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('perfiles')
        .select('*, roles(nombre_rol)')
        .eq('id_auth_supabase', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return mapDbToPerfilUsuario(data);
    } catch (err) {
      console.error('Exception in getProfileByUserId:', err);
      return null;
    }
  }

  /**
   * Crea un nuevo perfil de usuario
   */
  static async createProfile(userId: string, role: UserRole, nombreCompleto?: string): Promise<PerfilUsuario | null> {
    try {
      const full = (nombreCompleto || '').trim();
      const firstSpaceIndex = full.indexOf(' ');
      let nombre = full;
      let apellido = '';
      if (firstSpaceIndex !== -1) {
        nombre = full.substring(0, firstSpaceIndex).trim();
        apellido = full.substring(firstSpaceIndex + 1).trim();
      }

      let idRol = 3; // default 'usuario'
      if (role === 'jefe_ti') idRol = 1;
      else if (role === 'tecnico') idRol = 2;

      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('perfiles')
        .insert({
          id_auth_supabase: userId,
          id_rol: idRol,
          nombre,
          apellido,
        })
        .select('*, roles(nombre_rol)')
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return mapDbToPerfilUsuario(data);
    } catch (err) {
      console.error('Exception in createProfile:', err);
      return null;
    }
  }

  /**
   * Actualiza el perfil de un usuario
   */
  static async updateProfile(
    userId: string,
    profileData: {
      nombre_completo?: string;
      telefono_interno?: string;
      cargo?: string;
      correo?: string;
      nombre?: string;
      apellido?: string;
      id_rol?: number;
      estado?: string;
    }
  ): Promise<{ success: boolean; data?: PerfilUsuario; error?: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (profileData.telefono_interno !== undefined) updateData.telefono_interno = profileData.telefono_interno;
      if (profileData.cargo !== undefined) updateData.cargo = profileData.cargo;
      if (profileData.correo !== undefined) updateData.correo = profileData.correo;

      if (profileData.nombre !== undefined) updateData.nombre = profileData.nombre;
      if (profileData.apellido !== undefined) updateData.apellido = profileData.apellido;
      if (profileData.id_rol !== undefined) updateData.id_rol = profileData.id_rol;
      if (profileData.estado !== undefined) updateData.estado = profileData.estado;

      if (profileData.nombre_completo !== undefined) {
        const full = (profileData.nombre_completo || '').trim();
        const firstSpaceIndex = full.indexOf(' ');
        let nombre = full;
        let apellido = '';
        if (firstSpaceIndex !== -1) {
          nombre = full.substring(0, firstSpaceIndex).trim();
          apellido = full.substring(firstSpaceIndex + 1).trim();
        }
        updateData.nombre = nombre;
        updateData.apellido = apellido;
      }

      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('perfiles')
        .update(updateData)
        .eq('id_auth_supabase', userId)
        .select('*, roles(nombre_rol)')
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: mapDbToPerfilUsuario(data) };
    } catch (err) {
      console.error('Exception in updateProfile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obtiene el perfil de un usuario por su id_perfil interno
   */
  static async getProfileById(perfilId: string): Promise<PerfilUsuario | null> {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client
        .from('perfiles')
        .select('*, roles(nombre_rol)')
        .eq('id_perfil', perfilId)
        .single();

      if (error) {
        console.error('Error fetching user profile by id:', error);
        return null;
      }

      return mapDbToPerfilUsuario(data);
    } catch (err) {
      console.error('Exception in getProfileById:', err);
      return null;
    }
  }
}
