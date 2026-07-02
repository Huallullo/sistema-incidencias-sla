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
      // 1. Consultar estado de bloqueo en la base de datos antes de intentar autenticar
      const { data: profile, error: profileErr } = await supabase
        .from('perfiles')
        .select('id_auth_supabase, fecha_bloqueo, intentos_fallidos, estado')
        .eq('correo', credentials.email)
        .maybeSingle();

      if (profile) {
        // Verificar si la cuenta está inactiva
        if (profile.estado === 'inactivo') {
          return {
            user: null,
            session: null,
            error: 'Cuenta desactivada. Contacte al Jefe de TI.',
          };
        }

        // Verificar si tiene un bloqueo activo
        if (profile.fecha_bloqueo) {
          const lockTime = new Date(profile.fecha_bloqueo).getTime();
          const now = Date.now();
          if (lockTime > now) {
            const remainingSec = Math.ceil((lockTime - now) / 1000);
            return {
              user: null,
              session: null,
              error: `LOCK:${remainingSec}`,
            };
          }
        }
      }

      // 2. Intentar autenticar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        // Incrementar intentos fallidos usando el RPC
        const failedResult = await AuthService.handleFailedLogin(credentials.email);

        // Si el error de Supabase es de conexión de red
        if (error.message.includes('fetch') || error.status === 0 || error.message.toLowerCase().includes('network')) {
          return {
            user: null,
            session: null,
            error: 'Error de conexión con el servidor. Intente más tarde',
          };
        }

        if (failedResult?.blocked) {
          const remainingSec = 900; // 15 minutos por defecto en segundos
          return {
            user: null,
            session: null,
            error: `LOCK:${remainingSec}`,
          };
        }

        return {
          user: null,
          session: null,
          error: 'Credenciales inválidas',
        };
      }

      // 3. Validar perfil y rol del usuario autenticado
      if (data.user) {
        const role = await PerfilesRepository.getRoleByUserId(data.user.id);
        
        // Si el usuario no tiene perfil o rol asignado
        if (!role) {
          await supabase.auth.signOut();
          return {
            user: null,
            session: null,
            error: 'Perfil o rol no válido. Contacte al Jefe de TI',
          };
        }

        // Reiniciar el contador de intentos fallidos tras login exitoso
        await AuthService.resetFailedLoginAttempts(credentials.email);

        return {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            role: role,
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
      const { error } = await supabase.rpc('reset_failed_login_attempts', {
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
