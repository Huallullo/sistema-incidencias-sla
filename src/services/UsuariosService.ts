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
}
