jest.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

jest.mock('../src/repositories/PerfilesRepository', () => ({
  PerfilesRepository: {
    getRoleByUserId: jest.fn(),
    getProfileByUserId: jest.fn(),
    createProfile: jest.fn(),
  },
}));

import { AuthService } from '../src/services/AuthService';
import { PerfilesRepository } from '../src/repositories/PerfilesRepository';
import { supabase } from '../src/lib/supabaseClient';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('debe retornar error si las credenciales son inválidas', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: 'wrong',
      });

      expect(result.error).toBe('Invalid login credentials');
      expect(result.user).toBeNull();
    });

    it('debe retornar usuario con rol si el login es exitoso', async () => {
      const mockUser = { id: '123', email: 'test@test.com' };
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token123' },
        },
        error: null,
      });
      (PerfilesRepository.getRoleByUserId as jest.Mock).mockResolvedValue('jefe_ti');

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: '123456',
      });

      expect(result.user).not.toBeNull();
      expect(result.user?.role).toBe('jefe_ti');
      expect(result.error).toBeUndefined();
    });
  });

  describe('signOut', () => {
    it('debe cerrar la sesión correctamente', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await AuthService.signOut();

      expect(result.error).toBeUndefined();
    });
  });

  describe('handleFailedLogin', () => {
    it('debe llamar a la función RPC handle_failed_login', async () => {
      const mockResult = {
        blocked: false,
        attempts: 1,
        blocked_until: null,
        message: 'Intento fallido',
      };
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await AuthService.handleFailedLogin('test@test.com');

      expect(supabase.rpc).toHaveBeenCalledWith('handle_failed_login', {
        user_email: 'test@test.com',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('resetFailedLoginAttempts', () => {
    it('debe resetear los intentos fallidos', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await AuthService.resetFailedLoginAttempts('test@test.com');

      expect(supabase.rpc).toHaveBeenCalledWith('reset_failed_login_attempts', {
        user_email: 'test@test.com',
      });
      expect(result).toBe(true);
    });
  });
});
