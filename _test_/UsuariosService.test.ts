import { UsuariosService } from '../src/services/UsuariosService';
import { supabase } from '../src/lib/supabaseClient';

// Mockear supabase client
jest.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// Guardar variables de entorno originales
const originalEnv = process.env;

describe('UsuariosService - registerUser', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dokdnmdqckwrlcfkuabt.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon';
    jest.clearAllMocks();
    
    // Mockear fetch global
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('debe retornar error si no se han configurado las variables de entorno de Supabase', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const result = await UsuariosService.registerUser({
      email: 'test@test.com',
      nombre_completo: 'Test User',
      rol: 'usuario',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Faltan las variables de entorno');
  });

  it('debe retornar error si no hay sesión activa', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await UsuariosService.registerUser({
      email: 'test@test.com',
      nombre_completo: 'Test User',
      rol: 'usuario',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('No tienes sesión activa. Inicia sesión nuevamente.');
  });

  it('debe registrar un usuario exitosamente con contraseña autogenerada', async () => {
    // Mockear sesión
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: { access_token: 'fake-token-123' },
      },
      error: null,
    });

    // Mockear respuesta fetch exitosa
    const mockSuccessResponse = {
      success: true,
      user: { id: 'new-user-id', email: 'test@test.com' },
      perfil_creado: true,
      email_programado: true,
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockSuccessResponse),
    });

    const result = await UsuariosService.registerUser({
      email: 'test@test.com',
      nombre_completo: 'Test User',
      rol: 'usuario',
      telefono: 'Ext 123',
      cargo: 'Analista',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSuccessResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://dokdnmdqckwrlcfkuabt.supabase.co/functions/v1/register-user',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer fake-token-123',
        }),
        body: expect.any(String),
      })
    );

    // Comprobar que el body enviado tenga los datos correctos y una contraseña autogenerada
    const fetchCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(fetchCallBody.email).toBe('test@test.com');
    expect(fetchCallBody.nombre_completo).toBe('Test User');
    expect(fetchCallBody.rol).toBe('usuario');
    expect(fetchCallBody.telefono).toBe('Ext 123');
    expect(fetchCallBody.cargo).toBe('Analista');
    expect(fetchCallBody.password).toBeDefined();
    expect(fetchCallBody.password.length).toBeGreaterThanOrEqual(12);
  });

  it('debe alertar correctamente cuando el correo electrónico ya existe (duplicidad)', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: { access_token: 'fake-token-123' },
      },
      error: null,
    });

    // Mockear respuesta fetch fallida con error de duplicidad
    const mockErrorResponse = {
      error: 'El correo electrónico ya está registrado en el sistema',
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue(mockErrorResponse),
    });

    const result = await UsuariosService.registerUser({
      email: 'duplicado@test.com',
      nombre_completo: 'Test Duplicado',
      rol: 'usuario',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('El correo electrónico ya está registrado en el sistema');
  });

  it('debe propagar otros errores devueltos por el Edge Function', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: { access_token: 'fake-token-123' },
      },
      error: null,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'La contraseña es demasiado débil' }),
    });

    const result = await UsuariosService.registerUser({
      email: 'debil@test.com',
      nombre_completo: 'Test Debil',
      rol: 'usuario',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('La contraseña es demasiado débil');
  });
});
