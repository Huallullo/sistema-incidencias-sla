const mockMaybeSingle = jest.fn();
const mockEq = jest.fn().mockImplementation(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn().mockImplementation(() => ({ eq: mockEq }));
const mockFrom = jest.fn().mockImplementation(() => ({ select: mockSelect }));

jest.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
    rpc: jest.fn(),
    from: (table: string) => mockFrom(table),
  },
}));

jest.mock('../src/repositories/PerfilesRepository', () => ({
  PerfilesRepository: {
    getRoleByUserId: jest.fn(),
  },
}));

import { AuthService } from '../src/services/AuthService';
import { supabase } from '../src/lib/supabaseClient';

describe('Security - Bloqueo de cuenta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
  });

  it('debe llamar a handle_failed_login después de credenciales inválidas', async () => {
    // Pre-check de perfil sin bloqueo
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

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
      password: 'wrongpassword',
    });

    expect(result.error).toBe('Credenciales inválidas');
  });

  it('debe bloquear la cuenta después de múltiples intentos fallidos', async () => {
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

