import {
  registrarIncidenciaAction,
  obtenerIncidenciasDeUsuarioAction,
  obtenerTodasLasIncidenciasAction,
} from '@/actions/incidenciasActions';
import { supabase } from '@/lib/supabaseClient';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { IncidenciasService } from '@/services/IncidenciasService';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';

// Mock the main supabase client with thenable database query simulation
jest.mock('@/lib/supabaseClient', () => {
  const mockFromInstance = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve({ data: null, error: null })),
  };

  return {
    supabase: {
      from: jest.fn(() => mockFromInstance),
    },
  };
});

// Mock PerfilesRepository
jest.mock('@/repositories/PerfilesRepository', () => {
  return {
    PerfilesRepository: {
      getProfileByUserId: jest.fn(),
    },
  };
});

describe('HU-006: Pruebas Unitarias de Registro de Incidencias', () => {
  const mockFrom = (supabase.from as jest.Mock)();
  const mockGetProfile = PerfilesRepository.getProfileByUserId as jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Default database insert resolves successfully
    mockFrom.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
  });

  describe('registrarIncidenciaAction', () => {
    it('debe registrar un ticket exitosamente si los datos y la sesión son válidos', async () => {
      const mockProfile = { id_perfil: 'perfil-123', correo: 'jefe.ti@empresa.pe' };
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      const mockIncidencia = {
        id_incidencia: 'inc-999',
        codigo_ticket: 'INC-20260001',
        titulo: 'Fallo de monitor en Oficina B',
        descripcion: 'El monitor parpadea constantemente e interrumpe el trabajo.',
        categoria: 'hardware',
        prioridad: 'alta',
        estado: 'abierto',
        creado_por: 'perfil-123',
      };
      mockFrom.single.mockResolvedValueOnce({ data: mockIncidencia, error: null });

      const input = {
        titulo: 'Fallo de monitor en Oficina B',
        descripcion: 'El monitor parpadea constantemente e interrumpe el trabajo.',
        categoria: 'hardware' as const,
        prioridad: 'alta' as const,
      };

      const result = await registrarIncidenciaAction(input, 'user-123');

      expect(result.success).toBe(true);
      expect(result.data?.codigo_ticket).toBe('INC-20260001');
    });

    it('debe fallar la validación si el título tiene menos de 10 caracteres', async () => {
      const input = {
        titulo: 'Corto',
        descripcion: 'El monitor parpadea constantemente e interrumpe el trabajo.',
        categoria: 'hardware' as const,
        prioridad: 'alta' as const,
      };

      const result = await registrarIncidenciaAction(input, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('El título debe tener al menos 10 caracteres');
    });

    it('debe fallar la validación si la descripción tiene menos de 20 caracteres', async () => {
      const input = {
        titulo: 'Fallo de monitor en Oficina B',
        descripcion: 'Muy corto',
        categoria: 'hardware' as const,
        prioridad: 'alta' as const,
      };

      const result = await registrarIncidenciaAction(input, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('La descripción detallada debe tener al menos 20 caracteres');
    });

    it('debe retornar error si no se proporciona un ID de usuario de sesión', async () => {
      const input = {
        titulo: 'Fallo de monitor en Oficina B',
        descripcion: 'El monitor parpadea constantemente e interrumpe el trabajo.',
        categoria: 'hardware' as const,
        prioridad: 'alta' as const,
      };

      const result = await registrarIncidenciaAction(input, '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sesión no válida. Inicie sesión nuevamente.');
    });

    it('debe retornar error si el usuario no tiene un perfil registrado en el sistema', async () => {
      mockGetProfile.mockResolvedValueOnce(null);

      const input = {
        titulo: 'Fallo de monitor en Oficina B',
        descripcion: 'El monitor parpadea constantemente e interrumpe el trabajo.',
        categoria: 'hardware' as const,
        prioridad: 'alta' as const,
      };

      const result = await registrarIncidenciaAction(input, 'user-fantasma');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No se encontró un perfil asociado a su cuenta');
    });

    it('debe retornar error si falla la inserción en la base de datos', async () => {
      const mockProfile = { id_perfil: 'perfil-123', correo: 'jefe.ti@empresa.pe' };
      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      const input = {
        titulo: 'Fallo de monitor en Oficina B',
        descripcion: 'El monitor parpadea constantemente e interrumpe el trabajo.',
        categoria: 'hardware' as const,
        prioridad: 'alta' as const,
      };

      const result = await registrarIncidenciaAction(input, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database constraint violation');
    });

    it('debe capturar excepciones generales en el catch del servicio', async () => {
      mockGetProfile.mockRejectedValueOnce(new Error('Fatal error'));

      const input = {
        titulo: 'Fallo de monitor en Oficina B',
        descripcion: 'El monitor parpadea constantemente e interrumpe el trabajo.',
        categoria: 'hardware' as const,
        prioridad: 'alta' as const,
      };

      const result = await registrarIncidenciaAction(input, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fatal error');
    });

    it('debe capturar excepciones en el catch del Server Action si el servicio arroja error', async () => {
      jest.spyOn(IncidenciasService, 'registrarIncidencia').mockRejectedValueOnce(new Error('Action crash'));

      const input = {
        titulo: 'Fallo de monitor en Oficina B',
        descripcion: 'El monitor parpadea constantemente e interrumpe el trabajo.',
        categoria: 'hardware' as const,
        prioridad: 'alta' as const,
      };

      const result = await registrarIncidenciaAction(input, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Action crash');
    });
  });

  describe('obtenerIncidenciasDeUsuarioAction', () => {
    it('debe retornar el listado de incidencias del usuario si se identifica correctamente', async () => {
      const mockProfile = { id_perfil: 'perfil-123' };
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      const mockList = [
        { id_incidencia: '1', titulo: 'Incidencia 1', creado_por: 'perfil-123' },
        { id_incidencia: '2', titulo: 'Incidencia 2', creado_por: 'perfil-123' },
      ];
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: mockList, error: null }));

      const result = await obtenerIncidenciasDeUsuarioAction('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('debe retornar error si el usuario no tiene un perfil asociado', async () => {
      mockGetProfile.mockResolvedValueOnce(null);

      const result = await obtenerIncidenciasDeUsuarioAction('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Perfil no encontrado');
    });

    it('debe capturar excepciones en el catch del servicio', async () => {
      mockGetProfile.mockRejectedValueOnce(new Error('Unexpected service error'));

      const result = await obtenerIncidenciasDeUsuarioAction('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected service error');
    });

    it('debe capturar excepciones en el catch del Server Action', async () => {
      jest.spyOn(IncidenciasService, 'obtenerIncidenciasDeUsuario').mockRejectedValueOnce(new Error('Action list crash'));

      const result = await obtenerIncidenciasDeUsuarioAction('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Action list crash');
    });
  });

  describe('obtenerTodasLasIncidenciasAction', () => {
    it('debe retornar el listado global de todas las incidencias del sistema', async () => {
      const mockList = [
        { id_incidencia: '1', titulo: 'Incidencia A' },
        { id_incidencia: '2', titulo: 'Incidencia B' },
      ];
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: mockList, error: null }));

      const result = await obtenerTodasLasIncidenciasAction();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('debe capturar excepciones en el catch de la Server Action', async () => {
      jest.spyOn(IncidenciasService, 'obtenerTodasLasIncidencias').mockRejectedValueOnce(new Error('Action global crash'));

      const result = await obtenerTodasLasIncidenciasAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Action global crash');
    });
  });

  describe('IncidenciasRepository Error Paths', () => {
    it('debe manejar errores de base de datos en insert', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database Insert Error' },
      });

      const res = await IncidenciasRepository.insert({
        titulo: 'Test monitor error',
        descripcion: 'Some error details that are long enough',
        categoria: 'hardware',
        prioridad: 'alta',
        creado_por: 'perfil-123',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database Insert Error');
    });

    it('debe manejar excepciones generales en insert', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Insert crash'));

      const res = await IncidenciasRepository.insert({
        titulo: 'Test monitor error',
        descripcion: 'Some error details that are long enough',
        categoria: 'hardware',
        prioridad: 'alta',
        creado_por: 'perfil-123',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Insert crash');
    });

    it('debe manejar errores de consulta en getByCreadoPor', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: 'Query Error' } })
      );

      const res = await IncidenciasRepository.getByCreadoPor('perfil-123');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Query Error');
    });

    it('debe manejar excepciones generales en getByCreadoPor', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) => {
        throw new Error('Get exception');
      });

      const res = await IncidenciasRepository.getByCreadoPor('perfil-123');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Get exception');
    });

    it('debe manejar errores de consulta en getAll', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: 'GetAll Error' } })
      );

      const res = await IncidenciasRepository.getAll();

      expect(res.success).toBe(false);
      expect(res.error).toBe('GetAll Error');
    });

    it('debe manejar excepciones generales en getAll', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) => {
        throw new Error('GetAll exception');
      });

      const res = await IncidenciasRepository.getAll();

      expect(res.success).toBe(false);
      expect(res.error).toBe('GetAll exception');
    });
  });
});
