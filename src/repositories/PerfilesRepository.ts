import { supabase } from '@/lib/supabaseClient';
import { UserRole } from '@/types/auth';

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
}
