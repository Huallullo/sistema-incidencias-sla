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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  user_id: string;
  rol: UserRole;
  nombre?: string;
  email?: string;
}

export interface FailedLoginResult {
  blocked: boolean;
  attempts: number;
  blocked_until: string | null;
  message: string;
}
