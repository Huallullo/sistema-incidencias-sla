import { consultarIncidenciasAction } from '@/actions/incidenciasActions';
import { supabase } from '@/lib/supabaseClient';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { IncidenciasService } from '@/services/IncidenciasService';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => {
  const mockFromInstance = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve({ data: [], error: null })),
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

describe('HU-007: Pruebas Unitarias de Consulta de Tickets', () => {
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
    mockFrom.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  describe('consultarIncidenciasAction - Reglas de Aislamiento y Visibilidad', () => {
    it('debe filtrar por creado_por si el usuario autenticado tiene rol de usuario comun', async () => {
      const mockProfile = { id_perfil: 'perfil-user', rol: 'usuario' };
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      const mockTickets = [
        { id_incidencia: '1', codigo_ticket: 'INC-20260001', creado_por: 'perfil-user' },
      ];
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: mockTickets, error: null }));

      const result = await consultarIncidenciasAction('user-123', {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockFrom.eq).toHaveBeenCalledWith('creado_por', 'perfil-user');
    });

    it('debe filtrar por asignado_a si el usuario autenticado tiene el rol de tecnico', async () => {
      const mockProfile = { id_perfil: 'perfil-tec', rol: 'tecnico' };
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      const mockTickets = [
        { id_incidencia: '2', codigo_ticket: 'INC-20260002', asignado_a: 'perfil-tec' },
      ];
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: mockTickets, error: null }));

      const result = await consultarIncidenciasAction('user-123', {});

      expect(result.success).toBe(true);
      expect(mockFrom.eq).toHaveBeenCalledWith('asignado_a', 'perfil-tec');
    });

    it('debe otorgar acceso global sin filtros de creador/asignado si el usuario es jefe_ti', async () => {
      const mockProfile = { id_perfil: 'perfil-admin', rol: 'jefe_ti' };
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      const mockTickets = [
        { id_incidencia: '1', codigo_ticket: 'INC-20260001' },
        { id_incidencia: '2', codigo_ticket: 'INC-20260002' },
      ];
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: mockTickets, error: null }));

      const result = await consultarIncidenciasAction('user-123', {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockFrom.eq).not.toHaveBeenCalledWith('creado_por', expect.any(String));
      expect(mockFrom.eq).not.toHaveBeenCalledWith('asignado_a', expect.any(String));
    });

    it('debe retornar error si la sesion no es valida', async () => {
      const result = await consultarIncidenciasAction('', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sesión no válida. Inicie sesión nuevamente.');
    });

    it('debe retornar error si el perfil del usuario no existe', async () => {
      mockGetProfile.mockResolvedValueOnce(null);

      const result = await consultarIncidenciasAction('user-invalido', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No se encontró un perfil asociado a su cuenta');
    });
  });

  describe('consultarIncidenciasAction - Filtros Avanzados y Búsqueda', () => {
    beforeEach(() => {
      const mockProfile = { id_perfil: 'perfil-admin', rol: 'jefe_ti' };
      mockGetProfile.mockResolvedValue(mockProfile);
    });

    it('debe aplicar filtro de estado si es diferente de todos', async () => {
      await consultarIncidenciasAction('user-123', { estado: 'en_progreso' });
      expect(mockFrom.eq).toHaveBeenCalledWith('estado', 'en_progreso');
    });

    it('debe aplicar filtro de prioridad si es diferente de todos', async () => {
      await consultarIncidenciasAction('user-123', { prioridad: 'critica' });
      expect(mockFrom.eq).toHaveBeenCalledWith('prioridad', 'critica');
    });

    it('debe aplicar filtro de categoria si es diferente de todos', async () => {
      await consultarIncidenciasAction('user-123', { categoria: 'hardware' });
      expect(mockFrom.eq).toHaveBeenCalledWith('categoria', 'hardware');
    });

    it('debe aplicar filtros de fechaInicio y fechaFin si se proporcionan', async () => {
      await consultarIncidenciasAction('user-123', {
        fechaInicio: '2026-06-01',
        fechaFin: '2026-06-30',
      });
      expect(mockFrom.gte).toHaveBeenCalledWith('creado_en', '2026-06-01');
      expect(mockFrom.lte).toHaveBeenCalledWith('creado_en', '2026-06-30');
    });

    it('debe aplicar filtro de busqueda por texto utilizando OR en base de datos', async () => {
      await consultarIncidenciasAction('user-123', { busqueda: 'teclado' });
      expect(mockFrom.or).toHaveBeenCalledWith(
        'titulo.ilike.%teclado%,descripcion.ilike.%teclado%,codigo_ticket.ilike.%teclado%'
      );
    });
  });

  describe('IncidenciasRepository - queryTickets Error Paths', () => {
    it('debe manejar errores devueltos por el cliente supabase', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: 'Database Read Error' } })
      );

      const res = await IncidenciasRepository.queryTickets('jefe_ti', 'perfil-123', {});

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database Read Error');
    });

    it('debe capturar excepciones generales en queryTickets', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) => {
        throw new Error('Crash in pg query');
      });

      const res = await IncidenciasRepository.queryTickets('jefe_ti', 'perfil-123', {});

      expect(res.success).toBe(false);
      expect(res.error).toBe('Crash in pg query');
    });
  });

  describe('IncidenciasService & Actions Exceptions', () => {
    it('debe capturar excepciones generales en el servicio al consultar', async () => {
      mockGetProfile.mockRejectedValueOnce(new Error('Profile service error'));

      const res = await IncidenciasService.consultarIncidencias('user-123', {});

      expect(res.success).toBe(false);
      expect(res.error).toBe('Profile service error');
    });

    it('debe capturar excepciones generales en la Server Action', async () => {
      jest.spyOn(IncidenciasService, 'consultarIncidencias').mockRejectedValueOnce(new Error('Action query crash'));

      const res = await consultarIncidenciasAction('user-123', {});

      expect(res.success).toBe(false);
      expect(res.error).toBe('Action query crash');
    });
  });
});
