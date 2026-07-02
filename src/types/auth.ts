import { z } from 'zod';

/**
 * Tipos de autenticación y autorización
 */

export type UserRole = 'jefe_ti' | 'tecnico' | 'usuario';

export interface AuthUser {
  id: string;
  email: string;
  role?: UserRole;
  createdAt?: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  session: {
    access_token: string;
    refresh_token?: string;
  } | null;
  error?: string;
}

export const loginSchema = z.object({
  email: z.string()
    .min(1, { message: 'El correo electrónico es requerido' })
    .email({ message: 'El correo electrónico no es válido' }),
  password: z.string()
    .min(1, { message: 'La contraseña es requerida' })
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export interface UserProfile {
  user_id: string;
  rol: UserRole;
  nombre?: string;
  email?: string;
}

export interface PerfilUsuario {
  id_perfil: string;
  id_auth_supabase: string;
  id_rol: number;
  correo: string | null;
  nombre: string;
  apellido: string;
  estado: string;
  intentos_fallidos: number;
  fecha_bloqueo: string | null;
  fecha_creacion: string;
  cargo: string | null;
  telefono_interno: string | null;

  // Campos de compatibilidad hacia atrás
  id: string;
  user_id: string;
  nombre_completo: string;
  rol: UserRole;
  bloqueado_hasta: string | null;
  created_at: string;
}

export interface FailedLoginResult {
  blocked: boolean;
  attempts: number;
  blocked_until: string | null;
  message: string;
}

export const registerUserSchema = z.object({
  nombre: z.string()
    .min(1, { message: 'El nombre es requerido' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: 'El nombre solo debe contener letras' }),
  apellido: z.string()
    .min(1, { message: 'El apellido es requerido' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: 'El apellido solo debe contener letras' }),
  email: z.string()
    .min(1, { message: 'El correo electrónico es requerido' })
    .email({ message: 'Ingresa un correo electrónico válido' }),
  rol: z.enum(['jefe_ti', 'tecnico', 'usuario']),
  cargo: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
});

export type RegisterUserFormValues = z.infer<typeof registerUserSchema>;


