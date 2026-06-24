import { supabase } from '@/lib/supabaseClient';
import { UserRole, PerfilUsuario } from '@/types/auth';

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
      const { data, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.rol as UserRole || null;
    } catch (err) {
      console.error('Exception in getRoleByUserId:', err);
      return null;
    }
  }

  /**
   * Obtiene el perfil completo de un usuario
   */
  static async getProfileByUserId(userId: string) {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in getProfileByUserId:', err);
      return null;
    }
  }

  /**
   * Crea un nuevo perfil de usuario
   */
  static async createProfile(userId: string, role: UserRole, nombre?: string) {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .insert({
          user_id: userId,
          rol: role,
          nombre: nombre || '',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return data;
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
    }
  ): Promise<{ success: boolean; data?: PerfilUsuario; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Exception in updateProfile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

