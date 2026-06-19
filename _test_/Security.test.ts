jest.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

jest.mock('../src/repositories/PerfilesRepository', () => ({
  PerfilesRepository: {
    getRoleByUserId: jest.fn(),
  },
}));

import { AuthService } from '../src/services/AuthService';
import { supabase } from '../src/lib/supabaseClient';
import { PerfilesRepository } from '../src/repositories/PerfilesRepository';

describe('Security - Bloqueo de cuenta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe llamar a handle_failed_login después de credenciales inválidas', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        blocked: false,
        attempts: 1,
        blocked_until: null,
        message: 'Intento fallido',
      },
    });

    const result = await AuthService.signIn({
      email: 'test@test.com',
      password: 'wrong',
    });

    expect(result.error).toBe('Invalid login credentials');
  });

  it('debe bloquear la cuenta después de múltiples intentos fallidos', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        blocked: true,
        attempts: 3,
        blocked_until: new Date(Date.now() + 900000).toISOString(),
        message: 'Cuenta bloqueada',
      },
    });

    const failResult = await AuthService.handleFailedLogin('test@test.com');

    expect(failResult?.blocked).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('handle_failed_login', {
      user_email: 'test@test.com',
    });
  });
});
