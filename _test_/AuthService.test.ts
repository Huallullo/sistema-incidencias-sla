const mockMaybeSingle = jest.fn();
const mockEq = jest.fn().mockImplementation(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn().mockImplementation(() => ({ eq: mockEq }));
const mockFrom = jest.fn().mockImplementation(() => ({ select: mockSelect }));

jest.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    rpc: jest.fn(),
    from: (table: string) => mockFrom(table),
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
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
  });

  describe('signIn', () => {
    it('debe retornar error si las credenciales son inválidas', async () => {
      // Pre-check de perfil sin bloqueo
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { blocked: false, attempts: 1 },
        error: null,
      });

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: 'wrongpassword',
      });

      expect(result.error).toBe('Credenciales inválidas');
      expect(result.user).toBeNull();
    });

    it('debe retornar usuario con rol si el login es exitoso', async () => {
      // Pre-check de perfil sin bloqueo
      mockMaybeSingle.mockResolvedValue({
        data: {
          id_auth_supabase: '123',
          fecha_bloqueo: null,
          intentos_fallidos: 0,
          estado: 'activo',
        },
        error: null,
      });

      const mockUser = { id: '123', email: 'test@test.com' };
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token123' },
        },
        error: null,
      });
      (PerfilesRepository.getRoleByUserId as jest.Mock).mockResolvedValue('jefe_ti');
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null }); // reset attempts

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: 'wrongpassword',
      });

      expect(result.user).not.toBeNull();
      expect(result.user?.role).toBe('jefe_ti');
      expect(result.error).toBeUndefined();
    });

    it('debe bloquear el login preventivamente si la cuenta tiene fecha_bloqueo activa', async () => {
      const futureDate = new Date(Date.now() + 60000).toISOString(); // +1 min
      mockMaybeSingle.mockResolvedValue({
        data: {
          id_auth_supabase: '123',
          fecha_bloqueo: futureDate,
          intentos_fallidos: 3,
          estado: 'activo',
        },
        error: null,
      });

      const result = await AuthService.signIn({
        email: 'locked@test.com',
        password: 'anypassword',
      });

      expect(result.user).toBeNull();
      expect(result.error).toContain('LOCK:');
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('debe denegar el acceso si el estado de la cuenta es inactivo', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          id_auth_supabase: '123',
          fecha_bloqueo: null,
          intentos_fallidos: 0,
          estado: 'inactivo',
        },
        error: null,
      });

      const result = await AuthService.signIn({
        email: 'inactive@test.com',
        password: 'anypassword',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBe('Cuenta desactivada. Contacte al Jefe de TI.');
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('debe cerrar sesión y dar error si el usuario no tiene perfil o rol asignado', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@test.com' },
          session: { access_token: 'token123' },
        },
        error: null,
      });
      (PerfilesRepository.getRoleByUserId as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: 'wrongpassword',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBe('Perfil o rol no válido. Contacte al Jefe de TI');
      expect(supabase.auth.signOut).toHaveBeenCalled();
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

    it('debe retornar error si Supabase falla al cerrar sesión', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Signout failed' },
      });

      const result = await AuthService.signOut();

      expect(result.error).toBe('Signout failed');
    });

    it('debe manejar excepciones en signOut', async () => {
      (supabase.auth.signOut as jest.Mock).mockRejectedValue(new Error('Signout exception'));

      const result = await AuthService.signOut();

      expect(result.error).toBe('Signout exception');
    });
  });

  describe('getSession', () => {
    it('debe obtener la sesión actual si existe', async () => {
      const mockSession = { access_token: 'validToken' };
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await AuthService.getSession();
      expect(result).toEqual(mockSession);
    });

    it('debe retornar null si ocurre una excepción al obtener sesión', async () => {
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Session error'));
      const result = await AuthService.getSession();
      expect(result).toBeNull();
    });
  });

  describe('getCurrentUserRole', () => {
    it('debe retornar el rol del usuario actual', async () => {
      const mockSession = { user: { id: '123' } };
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      (PerfilesRepository.getRoleByUserId as jest.Mock).mockResolvedValue('tecnico');

      const result = await AuthService.getCurrentUserRole();
      expect(result).toBe('tecnico');
    });

    it('debe retornar null si no hay sesión activa', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await AuthService.getCurrentUserRole();
      expect(result).toBeNull();
    });

    it('debe retornar null si ocurre una excepción al obtener el rol del usuario', async () => {
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Role fetch error'));
      const result = await AuthService.getCurrentUserRole();
      expect(result).toBeNull();
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

    it('debe retornar null y registrar error si RPC falla', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC Error' },
      });

      const result = await AuthService.handleFailedLogin('test@test.com');
      expect(result).toBeNull();
    });

    it('debe retornar null si ocurre una excepción', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Exception'));
      const result = await AuthService.handleFailedLogin('test@test.com');
      expect(result).toBeNull();
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

    it('debe retornar false si RPC falla', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC Error' },
      });

      const result = await AuthService.resetFailedLoginAttempts('test@test.com');
      expect(result).toBe(false);
    });

    it('debe retornar false si ocurre una excepción', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Exception'));
      const result = await AuthService.resetFailedLoginAttempts('test@test.com');
      expect(result).toBe(false);
    });
  });

  describe('signIn exceptions and extra cases', () => {
    it('debe manejar excepciones generales en signIn', async () => {
      mockMaybeSingle.mockRejectedValue(new Error('General DB Exception'));

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBe('General DB Exception');
    });

    it('debe retornar error de red si Supabase Auth falla por problemas de red', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'TypeError: failed to fetch', status: 0 },
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBe('Error de conexión con el servidor. Intente más tarde');
    });

    it('debe retornar LOCK si el intento fallido activa un bloqueo', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { blocked: true, attempts: 3 },
        error: null,
      });

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBe('LOCK:900');
    });

    it('debe retornar error si no se devuelve un usuario ni error tras autenticación exitosa', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await AuthService.signIn({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBe('No user returned from authentication');
    });
  });
});

