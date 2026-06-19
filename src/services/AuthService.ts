import { supabase } from '@/lib/supabaseClient';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { LoginCredentials, AuthResponse, UserRole, FailedLoginResult } from '@/types/auth';

/**
 * AuthService - Lógica de autenticación
 * Capa de lógica de negocio (Business Logic Layer)
 */
export class AuthService {
  /**
   * Inicia sesión con email y contraseña
   */
  static async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: error.message,
        };
      }

      // Obtener rol del usuario
      if (data.user) {
        const role = await PerfilesRepository.getRoleByUserId(data.user.id);
        return {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            role: role || undefined,
          },
          session: {
            access_token: data.session?.access_token || '',
            refresh_token: data.session?.refresh_token || '',
          },
        };
      }

      return {
        user: null,
        session: null,
        error: 'No user returned from authentication',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        user: null,
        session: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  static async signOut(): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { error: errorMessage };
    }
  }

  /**
   * Obtiene la sesión actual del usuario
   */
  static async getSession() {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch (err) {
      console.error('Error getting session:', err);
      return null;
    }
  }

  /**
   * Obtiene el rol del usuario actual
   */
  static async getCurrentUserRole(): Promise<UserRole | null> {
    try {
      const session = await this.getSession();
      if (!session?.user?.id) {
        return null;
      }

      return await PerfilesRepository.getRoleByUserId(session.user.id);
    } catch (err) {
      console.error('Error getting current user role:', err);
      return null;
    }
  }

  /**
   * Maneja los intentos fallidos de login (RPC)
   */
  static async handleFailedLogin(email: string): Promise<FailedLoginResult | null> {
    try {
      const { data, error } = await supabase.rpc('handle_failed_login', {
        user_email: email,
      });

      if (error) {
        console.error('Error in handle_failed_login RPC:', error);
        return null;
      }

      return data as FailedLoginResult;
    } catch (err) {
      console.error('Exception in handleFailedLogin:', err);
      return null;
    }
  }

  /**
   * Reinicia el contador de intentos fallidos
   */
  static async resetFailedLoginAttempts(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('reset_failed_login_attempts', {
        user_email: email,
      });

      if (error) {
        console.error('Error resetting failed login attempts:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Exception in resetFailedLoginAttempts:', err);
      return false;
    }
  }
}
