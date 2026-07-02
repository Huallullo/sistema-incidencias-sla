import {
  sendPasswordResetAction,
  verifyPasswordResetTokenAction,
  resetPasswordWithTokenAction,
} from '@/actions/authActions';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Mock the main supabase client using the exact alias path and thenable chaining
jest.mock('@/lib/supabaseClient', () => {
  const mockFromInstance = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve({ data: null, error: null })),
  };

  return {
    supabase: {
      from: jest.fn(() => mockFromInstance),
    },
  };
});

// Mock the supabase admin client using the exact alias path
jest.mock('@/lib/supabaseAdmin', () => {
  const mockAdminInstance = {
    updateUserById: jest.fn(),
  };

  return {
    supabaseAdmin: {
      auth: {
        admin: mockAdminInstance,
      },
    },
  };
});

describe('HU-005: Pruebas Unitarias del Flujo de Recuperación de Contraseña', () => {
  const mockFrom = (supabase.from as jest.Mock)();
  const mockAdmin = supabaseAdmin.auth.admin as any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock behavior for then
    mockFrom.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
  });

  describe('sendPasswordResetAction', () => {
    it('debe registrar un token de recuperación y una bitácora de correo si el email existe', async () => {
      // 1. Mock de verificación de correo en perfiles (existe)
      const mockUserProfile = { id_perfil: 'perfil-123', id_auth_supabase: 'auth-123' };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockUserProfile, error: null });

      const result = await sendPasswordResetAction('jefe.ti@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('perfiles');
      expect(mockFrom.eq).toHaveBeenCalledWith('correo', 'jefe.ti@empresa.pe');
      expect(supabase.from).toHaveBeenCalledWith('password_reset_tokens');
      expect(supabase.from).toHaveBeenCalledWith('email_logs');
    });

    it('debe retornar error si el correo es vacío', async () => {
      const result = await sendPasswordResetAction('', 'http://localhost:3000/reset-password');
      expect(result.success).toBe(false);
      expect(result.error).toBe('El correo electrónico es requerido');
    });

    it('debe retornar error si el correo no está registrado en perfiles', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await sendPasswordResetAction('desconocido@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('El correo electrónico ingresado no se encuentra registrado en el sistema');
    });

    it('debe retornar error si falla la consulta de perfiles', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Excepción de base de datos' },
      });

      const result = await sendPasswordResetAction('error@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Excepción de base de datos');
    });

    it('debe retornar error si falla la inserción del token', async () => {
      const mockUserProfile = { id_perfil: 'perfil-123', id_auth_supabase: 'auth-123' };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockUserProfile, error: null });
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: { message: 'Error de inserción de token' } }));

      const result = await sendPasswordResetAction('jefe.ti@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error de inserción de token');
    });

    it('debe retornar error si falla la inserción de la bitácora de correo', async () => {
      const mockUserProfile = { id_perfil: 'perfil-123', id_auth_supabase: 'auth-123' };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockUserProfile, error: null });
      // Inserción de token funciona
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null }));
      // Inserción de email_logs falla
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: { message: 'Error de logs' } }));

      const result = await sendPasswordResetAction('jefe.ti@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error de logs');
    });

    it('debe manejar excepciones generales en el catch de sendPasswordResetAction', async () => {
      mockFrom.maybeSingle.mockRejectedValueOnce(new Error('Fatal error'));

      const result = await sendPasswordResetAction('fatal@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fatal error');
    });
  });

  describe('verifyPasswordResetTokenAction', () => {
    it('debe validar un token activo, no expirado y no usado', async () => {
      const mockTokenData = {
        token: 'token-valido-123',
        perfil_id: 'perfil-123',
        fecha_expiracion: new Date(Date.now() + 3600000).toISOString(),
        usado: false,
        perfiles: { id_auth_supabase: 'auth-123' },
      };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockTokenData, error: null });

      const result = await verifyPasswordResetTokenAction('token-valido-123');

      expect(result.success).toBe(true);
      expect(result.data?.id_auth_supabase).toBe('auth-123');
      expect(mockFrom.eq).toHaveBeenCalledWith('token', 'token-valido-123');
    });

    it('debe retornar error si el token es vacío', async () => {
      const result = await verifyPasswordResetTokenAction('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('El token de recuperación es requerido');
    });

    it('debe retornar error si falla al consultar el token por error de base de datos', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'Query token error' } });

      const result = await verifyPasswordResetTokenAction('token-error');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query token error');
    });

    it('debe denegar tokens ya utilizados', async () => {
      const mockTokenData = {
        token: 'token-usado-123',
        perfil_id: 'perfil-123',
        fecha_expiracion: new Date(Date.now() + 3600000).toISOString(),
        usado: true,
        perfiles: { id_auth_supabase: 'auth-123' },
      };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockTokenData, error: null });

      const result = await verifyPasswordResetTokenAction('token-usado-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('El enlace de recuperación ya ha sido utilizado');
    });

    it('debe denegar tokens expirados', async () => {
      const mockTokenData = {
        token: 'token-expirado-123',
        perfil_id: 'perfil-123',
        fecha_expiracion: new Date(Date.now() - 3600000).toISOString(),
        usado: false,
        perfiles: { id_auth_supabase: 'auth-123' },
      };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockTokenData, error: null });

      const result = await verifyPasswordResetTokenAction('token-expirado-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('El enlace de recuperación ha expirado');
    });

    it('debe retornar error si el token no existe', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await verifyPasswordResetTokenAction('token-fantasma');

      expect(result.success).toBe(false);
      expect(result.error).toBe('El enlace de recuperación es inválido');
    });

    it('debe capturar excepciones generales en verifyPasswordResetTokenAction', async () => {
      mockFrom.maybeSingle.mockRejectedValueOnce(new Error('Fatal verify error'));

      const result = await verifyPasswordResetTokenAction('token-fatal');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fatal verify error');
    });
  });

  describe('resetPasswordWithTokenAction', () => {
    it('debe actualizar la contraseña y marcar el token como usado si el token es válido', async () => {
      const mockTokenData = {
        token: 'token-ok-123',
        perfil_id: 'perfil-123',
        fecha_expiracion: new Date(Date.now() + 3600000).toISOString(),
        usado: false,
        perfiles: { id_auth_supabase: 'auth-123' },
      };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockTokenData, error: null });
      mockAdmin.updateUserById.mockResolvedValueOnce({ data: { user: {} }, error: null });

      const result = await resetPasswordWithTokenAction('token-ok-123', 'nuevaClaveSegura123!');

      expect(result.success).toBe(true);
      expect(mockAdmin.updateUserById).toHaveBeenCalledWith('auth-123', { password: 'nuevaClaveSegura123!' });
      expect(supabase.from).toHaveBeenCalledWith('password_reset_tokens');
      expect(mockFrom.eq).toHaveBeenCalledWith('token', 'token-ok-123');
    });

    it('debe rechazar contraseñas de menos de 8 caracteres', async () => {
      const result = await resetPasswordWithTokenAction('token-ok-123', 'corta');

      expect(result.success).toBe(false);
      expect(result.error).toBe('La contraseña debe tener al menos 8 caracteres');
      expect(mockAdmin.updateUserById).not.toHaveBeenCalled();
    });

    it('debe retornar error si falla al actualizar el estado de usado del token en BD', async () => {
      const mockTokenData = {
        token: 'token-ok-123',
        perfil_id: 'perfil-123',
        fecha_expiracion: new Date(Date.now() + 3600000).toISOString(),
        usado: false,
        perfiles: { id_auth_supabase: 'auth-123' },
      };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockTokenData, error: null });
      mockAdmin.updateUserById.mockResolvedValueOnce({ data: { user: {} }, error: null });
      // Fallo de update de token usado
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: { message: 'Token update failed' } }));

      const result = await resetPasswordWithTokenAction('token-ok-123', 'nuevaClaveSegura123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token update failed');
    });

    it('debe retornar error si falla la actualización de clave en Auth Admin', async () => {
      const mockTokenData = {
        token: 'token-ok-123',
        perfil_id: 'perfil-123',
        fecha_expiracion: new Date(Date.now() + 3600000).toISOString(),
        usado: false,
        perfiles: { id_auth_supabase: 'auth-123' },
      };
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockTokenData, error: null });

      mockAdmin.updateUserById.mockResolvedValueOnce({
        data: null,
        error: { message: 'Límites de complejidad de contraseña no alcanzados' },
      });

      const result = await resetPasswordWithTokenAction('token-ok-123', 'nuevaclave123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Límites de complejidad de contraseña no alcanzados');
    });

    it('debe capturar excepciones en el catch de resetPasswordWithTokenAction', async () => {
      mockFrom.maybeSingle.mockRejectedValueOnce(new Error('Fatal reset error'));

      const result = await resetPasswordWithTokenAction('token-fatal-reset', 'nuevaClaveSegura123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fatal reset error');
    });
  });
});
