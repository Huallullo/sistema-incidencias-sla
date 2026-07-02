import { UsuariosService } from '../src/services/UsuariosService';
import { PerfilesRepository } from '../src/repositories/PerfilesRepository';
import { supabase } from '../src/lib/supabaseClient';

// Mockear el cliente de Supabase
jest.mock('../src/lib/supabaseClient', () => {
  const mockFromInstance = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: jest.fn(() => mockFromInstance),
      auth: {
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        getSession: jest.fn(),
      },
    },
  };
});

describe('HU-004: Pruebas Unitarias de Perfil de Usuario', () => {
  const mockFrom = (supabase.from as jest.Mock)();
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UsuariosService.updateProfileData', () => {
    it('debe actualizar los datos exitosamente si no hay duplicidad de correo', async () => {
      // Mockear la validación de duplicado de correo: retorna null (no duplicado)
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // Mockear el update final en la base de datos
      const mockUpdatedProfile = {
        id_perfil: 'perfil-id-123',
        id_auth_supabase: 'user-id-123',
        nombre: 'Juan',
        apellido: 'Pérez Modificado',
        telefono_interno: 'Ext 999',
        cargo: 'Soporte',
        correo: 'juan.perez@empresa.pe',
        id_rol: 3,
        roles: { nombre_rol: 'usuario' }
      };
      mockFrom.single.mockResolvedValueOnce({ data: mockUpdatedProfile, error: null });

      const result = await UsuariosService.updateProfileData('user-id-123', {
        nombre_completo: 'Juan Pérez Modificado',
        telefono_interno: 'Ext 999',
        cargo: 'Soporte',
        correo: 'juan.perez@empresa.pe',
      });

      expect(result.success).toBe(true);
      expect(result.data?.nombre_completo).toBe('Juan Pérez Modificado');
      expect(supabase.from).toHaveBeenCalledWith('perfiles');
      expect(mockFrom.eq).toHaveBeenCalledWith('correo', 'juan.perez@empresa.pe');
      expect(mockFrom.neq).toHaveBeenCalledWith('id_auth_supabase', 'user-id-123');
    });    it('debe retornar error si el correo ya está registrado por otro usuario', async () => {
      // Mockear validación de duplicado: retorna un registro existente con otro id_auth_supabase
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: { id_auth_supabase: 'other-user-456' },
        error: null,
      });

      const result = await UsuariosService.updateProfileData('user-id-123', {
        correo: 'duplicado@empresa.pe',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('El correo electrónico ya se encuentra registrado por otro usuario');
      // No debe llamar a update en el repositorio
      expect(mockFrom.update).not.toHaveBeenCalled();
    });

    it('debe retornar error si falla la consulta de validación de duplicidad', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database failure during check' },
      });

      const result = await UsuariosService.updateProfileData('user-id-123', {
        correo: 'test@empresa.pe',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database failure during check');
    });
  });

  describe('PerfilesRepository.updateProfile', () => {
    it('debe llamar correctamente a la BD y retornar éxito con los datos', async () => {
      const mockDbRow = {
        id_perfil: 'perfil-123',
        id_auth_supabase: 'user-123',
        nombre: 'Test',
        apellido: '',
        id_rol: 3,
        roles: { nombre_rol: 'usuario' }
      };
      mockFrom.single.mockResolvedValueOnce({ data: mockDbRow, error: null });

      const result = await PerfilesRepository.updateProfile('user-123', {
        nombre_completo: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.data?.nombre_completo).toBe('Test');
      expect(mockFrom.update).toHaveBeenCalledWith({ nombre: 'Test', apellido: '' });
      expect(mockFrom.eq).toHaveBeenCalledWith('id_auth_supabase', 'user-123');
    });

    it('debe retornar error si la consulta update en perfiles falla', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'RLS update policy restriction' },
      });

      const result = await PerfilesRepository.updateProfile('user-123', {
        nombre_completo: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('RLS update policy restriction');
    });
  });

  describe('UsuariosService.sendPasswordReset', () => {
    it('debe enviar el correo de recuperación exitosamente si el email está registrado', async () => {
      // 1. Mockear la verificación del email en perfiles (existe)
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: { id_perfil: 'perfil-123', id_auth_supabase: 'user-123' },
        error: null,
      });

      // 2. Mockear la inserción en password_reset_tokens y email_logs
      mockFrom.insert.mockResolvedValueOnce({ data: null, error: null }); // tokens
      mockFrom.insert.mockResolvedValueOnce({ data: null, error: null }); // logs

      const result = await UsuariosService.sendPasswordReset('test@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('perfiles');
      expect(supabase.from).toHaveBeenCalledWith('password_reset_tokens');
      expect(supabase.from).toHaveBeenCalledWith('email_logs');
    });

    it('debe retornar error si el correo no existe en la base de datos de perfiles', async () => {
      // Mockear verificación del email en perfiles (no existe)
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await UsuariosService.sendPasswordReset('no.existe@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('El correo electrónico ingresado no se encuentra registrado en el sistema');
      expect(mockFrom.insert).not.toHaveBeenCalled();
    });

    it('debe retornar error si falla al registrar el token en base de datos', async () => {
      // 1. Mockear verificación del email en perfiles (existe)
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: { id_perfil: 'perfil-123', id_auth_supabase: 'user-123' },
        error: null,
      });

      // 2. Mockear fallo en inserción de token
      mockFrom.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database write error' },
      });

      const result = await UsuariosService.sendPasswordReset('test@empresa.pe', 'http://localhost:3000/reset-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database write error');
    });
  });

  describe('UsuariosService.updateUserPassword', () => {
    it('debe actualizar la contraseña exitosamente', async () => {
      (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      });

      const result = await UsuariosService.updateUserPassword('newSecurePassword123!');

      expect(result.success).toBe(true);
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newSecurePassword123!' });
    });

    it('debe retornar error si falla la actualización en Supabase Auth', async () => {
      (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Password does not meet complexity requirements' },
      });

      const result = await UsuariosService.updateUserPassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password does not meet complexity requirements');
    });
  });
});
