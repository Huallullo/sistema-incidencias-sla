import { registrarEquipoAction, obtenerEquiposAction, obtenerDetalleEquipoAction, actualizarEquipoAction, obtenerHistorialEstadosAction } from '@/actions/equipoActions';
import { supabase } from '@/lib/supabaseClient';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { EquiposRepository } from '@/repositories/EquiposRepository';
import { HistorialEstadoEquipoRepository } from '@/repositories/HistorialEstadoEquipoRepository';
import { EquiposService } from '@/services/EquiposService';

// Mock client with thenable database query simulation
jest.mock('@/lib/supabaseClient', () => {
  const mockFromInstance = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    limit: jest.fn().mockReturnThis(),
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

describe('HU-012: Pruebas de Flujo de Inventario de Equipos Informáticos', () => {
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
    mockFrom.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.single.mockResolvedValue({ data: null, error: null });
  });

  describe('registrarEquipoAction', () => {
    it('debe registrar un equipo con éxito si el rol es Jefe de TI', async () => {
      const mockJefeTi = {
        id_perfil: 'perf-jefe-ti',
        id_auth_supabase: 'auth-jefe-ti',
        id_rol: 1, // Jefe de TI
      };
      mockGetProfile.mockResolvedValueOnce(mockJefeTi);

      // Mockear repositorio para que no encuentre duplicados (retornan null)
      jest.spyOn(EquiposRepository, 'findByCodigo').mockResolvedValueOnce(null);
      jest.spyOn(EquiposRepository, 'findByNumeroSerie').mockResolvedValueOnce(null);

      const mockEquipo = {
        id_equipo: 'eq-uuid-123',
        codigo: 'LAP-101',
        nombre: 'Laptop Lenovo ThinkPad',
        estado_operativo: 'operativo',
      };
      jest.spyOn(EquiposRepository, 'insert').mockResolvedValueOnce({
        success: true,
        data: mockEquipo as any,
      });

      const result = await registrarEquipoAction(
        {
          codigo: 'LAP-101',
          nombre: 'Laptop Lenovo ThinkPad',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: 'T14 Gen 2',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        'auth-jefe-ti'
      );

      expect(result.success).toBe(true);
      expect(result.data?.id_equipo).toBe('eq-uuid-123');
    });

    it('debe fallar si el usuario no tiene rol de Jefe de TI', async () => {
      const mockTecnico = {
        id_perfil: 'perf-tec',
        id_auth_supabase: 'auth-tec',
        id_rol: 2, // Técnico
      };
      mockGetProfile.mockResolvedValueOnce(mockTecnico);

      const result = await registrarEquipoAction(
        {
          codigo: 'LAP-101',
          nombre: 'Laptop Lenovo ThinkPad',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: 'T14 Gen 2',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        'auth-tec'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Solo el rol Jefe de TI puede registrar equipos');
    });

    it('debe fallar si el código del equipo ya está registrado', async () => {
      const mockJefeTi = {
        id_perfil: 'perf-jefe-ti',
        id_auth_supabase: 'auth-jefe-ti',
        id_rol: 1,
      };
      mockGetProfile.mockResolvedValueOnce(mockJefeTi);

      const mockEquipoExistente = { id_equipo: 'eq-1' } as any;
      jest.spyOn(EquiposRepository, 'findByCodigo').mockResolvedValueOnce(mockEquipoExistente);

      const result = await registrarEquipoAction(
        {
          codigo: 'LAP-101',
          nombre: 'Laptop Lenovo ThinkPad',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: 'T14 Gen 2',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        'auth-jefe-ti'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('ya se encuentra registrado en el inventario');
    });

    it('debe fallar si el número de serie ya está registrado', async () => {
      const mockJefeTi = {
        id_perfil: 'perf-jefe-ti',
        id_auth_supabase: 'auth-jefe-ti',
        id_rol: 1,
      };
      mockGetProfile.mockResolvedValueOnce(mockJefeTi);

      jest.spyOn(EquiposRepository, 'findByCodigo').mockResolvedValueOnce(null);
      const mockEquipoExistente = { id_equipo: 'eq-1' } as any;
      jest.spyOn(EquiposRepository, 'findByNumeroSerie').mockResolvedValueOnce(mockEquipoExistente);

      const result = await registrarEquipoAction(
        {
          codigo: 'LAP-101',
          nombre: 'Laptop Lenovo ThinkPad',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: 'T14 Gen 2',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        'auth-jefe-ti'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('ya se encuentra registrado en el inventario');
    });

    it('debe fallar si faltan campos obligatorios en Zod', async () => {
      const result = await registrarEquipoAction(
        {
          codigo: '',
          nombre: 'Laptop Lenovo',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: '',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        'auth-jefe-ti'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('El código del equipo es obligatorio.');
    });

    it('debe fallar si no se proporciona userId', async () => {
      const result = await registrarEquipoAction(
        {
          codigo: 'LAP-101',
          nombre: 'Laptop Lenovo',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: 'T14',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        ''
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sesión no válida');
    });

    it('debe fallar si no se encuentra perfil asociado al usuario', async () => {
      mockGetProfile.mockResolvedValueOnce(null);

      const result = await registrarEquipoAction(
        {
          codigo: 'LAP-101',
          nombre: 'Laptop Lenovo',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: 'T14',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        'auth-jefe-ti'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se encontró un perfil asociado');
    });

    it('debe fallar si ocurre una excepción en el servicio de registro', async () => {
      mockGetProfile.mockRejectedValueOnce(new Error('Auth Timeout'));

      const result = await registrarEquipoAction(
        {
          codigo: 'LAP-101',
          nombre: 'Laptop Lenovo',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: 'T14',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        'auth-jefe-ti'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Auth Timeout');
    });

    it('debe fallar si el repositorio insert retorna error', async () => {
      const mockJefeTi = {
        id_perfil: 'perf-jefe-ti',
        id_auth_supabase: 'auth-jefe-ti',
        id_rol: 1,
      };
      mockGetProfile.mockResolvedValueOnce(mockJefeTi);
      jest.spyOn(EquiposRepository, 'findByCodigo').mockResolvedValueOnce(null);
      jest.spyOn(EquiposRepository, 'findByNumeroSerie').mockResolvedValueOnce(null);

      jest.spyOn(EquiposRepository, 'insert').mockResolvedValueOnce({
        success: false,
        error: 'Conexión perdida con base de datos',
      });

      const result = await registrarEquipoAction(
        {
          codigo: 'LAP-101',
          nombre: 'Laptop Lenovo',
          tipo: 'laptop',
          marca: 'Lenovo',
          modelo: 'T14',
          numero_serie: 'SN-THINK123',
          ubicacion: 'Oficina 302',
          estado_operativo: 'operativo',
        },
        'auth-jefe-ti'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conexión perdida con base de datos');
    });
  });

  describe('obtenerEquiposAction', () => {
    it('debe retornar lista de equipos informáticos', async () => {
      const mockEquipos = [
        { id_equipo: '1', codigo: 'LAP-101', estado_operativo: 'operativo' },
      ];
      jest.spyOn(EquiposRepository, 'findAll').mockResolvedValueOnce({
        success: true,
        data: mockEquipos as any,
      });

      const result = await obtenerEquiposAction();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('debe fallar si el repositorio findAll retorna error', async () => {
      jest.spyOn(EquiposRepository, 'findAll').mockResolvedValueOnce({
        success: false,
        error: 'Timeout en consulta',
      });

      const result = await obtenerEquiposAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout en consulta');
    });

    it('debe manejar excepciones en obtenerEquiposAction', async () => {
      jest.spyOn(EquiposService, 'obtenerEquipos').mockRejectedValueOnce(new Error('Network Crash'));

      const result = await obtenerEquiposAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network Crash');
    });
  });

  describe('EquiposRepository', () => {
    it('debe buscar equipo por código usando cliente supabase', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: { id_equipo: 'eq-1', codigo: 'LAP-101' },
        error: null,
      });

      const result = await EquiposRepository.findByCodigo('LAP-101');
      expect(result?.id_equipo).toBe('eq-1');
    });

    it('debe retornar null en findByCodigo si ocurre error', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await EquiposRepository.findByCodigo('LAP-101');
      expect(result).toBeNull();
    });

    it('debe retornar null en findByCodigo si lanza excepción', async () => {
      mockFrom.maybeSingle.mockRejectedValueOnce(new Error('Query Crash'));

      const result = await EquiposRepository.findByCodigo('LAP-101');
      expect(result).toBeNull();
    });

    it('debe buscar equipo por número de serie usando cliente supabase', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: { id_equipo: 'eq-1', numero_serie: 'SN-111' },
        error: null,
      });

      const result = await EquiposRepository.findByNumeroSerie('SN-111');
      expect(result?.id_equipo).toBe('eq-1');
    });

    it('debe retornar null en findByNumeroSerie si ocurre error', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await EquiposRepository.findByNumeroSerie('SN-111');
      expect(result).toBeNull();
    });

    it('debe retornar null en findByNumeroSerie si lanza excepción', async () => {
      mockFrom.maybeSingle.mockRejectedValueOnce(new Error('Query Crash'));

      const result = await EquiposRepository.findByNumeroSerie('SN-111');
      expect(result).toBeNull();
    });
  });

  describe('Manejo de Errores en Repositorios (Insert y FindAll)', () => {
    it('debe manejar errores en EquiposRepository.insert', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database insert error' },
      });

      const res = await EquiposRepository.insert({
        codigo: 'LAP-101',
        nombre: 'Laptop Dell',
        tipo: 'laptop',
        marca: 'Dell',
        modelo: 'Latitude',
        numero_serie: 'SN-111',
        ubicacion: 'Almacén',
        estado_operativo: 'operativo',
        id_usuario_registro: 'perf-jefe-ti',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database insert error');
    });

    it('debe manejar excepciones en EquiposRepository.insert', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Exception insert'));

      const res = await EquiposRepository.insert({
        codigo: 'LAP-101',
        nombre: 'Laptop Dell',
        tipo: 'laptop',
        marca: 'Dell',
        modelo: 'Latitude',
        numero_serie: 'SN-111',
        ubicacion: 'Almacén',
        estado_operativo: 'operativo',
        id_usuario_registro: 'perf-jefe-ti',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Exception insert');
    });

    it('debe manejar errores en EquiposRepository.findAll', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: 'Database select error' } })
      );

      const res = await EquiposRepository.findAll();

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database select error');
    });

    it('debe manejar excepciones en EquiposRepository.findAll', async () => {
      mockFrom.then.mockImplementationOnce((_: unknown, reject: any) =>
        reject(new Error('Exception select'))
      );

      const res = await EquiposRepository.findAll();

      expect(res.success).toBe(false);
      expect(res.error).toBe('Exception select');
    });
  });

  describe('HU-013: Pruebas de Consulta de Equipos Informáticos', () => {
    describe('obtenerEquiposAction con filtros', () => {
      it('debe llamar a EquiposService.obtenerEquipos con filtros y tener éxito', async () => {
        const mockEquipos = [{ id_equipo: 'eq-1', codigo: 'LAP-101', tipo: 'laptop' }];
        const serviceSpy = jest.spyOn(EquiposService, 'obtenerEquipos').mockResolvedValueOnce({
          success: true,
          data: mockEquipos as any,
        });

        const result = await obtenerEquiposAction({
          query: 'LAP',
          tipo: 'laptop',
          estado_operativo: 'operativo',
          ubicacion: 'Oficina 301',
        });

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(serviceSpy).toHaveBeenCalledWith({
          query: 'LAP',
          tipo: 'laptop',
          estado_operativo: 'operativo',
          ubicacion: 'Oficina 301',
        });
      });
    });

    describe('obtenerDetalleEquipoAction', () => {
      it('debe obtener el detalle del equipo con éxito', async () => {
        const mockDetalle = {
          id_equipo: 'eq-1',
          codigo: 'LAP-101',
          incidencias: [{ id_incidencia: 't-1', titulo: 'Falla de pantalla' }],
        };
        const serviceSpy = jest.spyOn(EquiposService, 'obtenerDetalleEquipo').mockResolvedValueOnce({
          success: true,
          data: mockDetalle,
        });

        const result = await obtenerDetalleEquipoAction('eq-1');

        expect(result.success).toBe(true);
        expect(result.data?.codigo).toBe('LAP-101');
        expect(result.data?.incidencias).toHaveLength(1);
        expect(serviceSpy).toHaveBeenCalledWith('eq-1');
      });

      it('debe fallar si no se proporciona idEquipo', async () => {
        const result = await obtenerDetalleEquipoAction('');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Identificador del equipo no proporcionado');
      });

      it('debe manejar excepciones en obtenerDetalleEquipoAction', async () => {
        jest.spyOn(EquiposService, 'obtenerDetalleEquipo').mockRejectedValueOnce(new Error('Details Crash'));
        const result = await obtenerDetalleEquipoAction('eq-1');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Details Crash');
      });
    });

    describe('EquiposRepository.getEquipmentDetails', () => {
      it('debe realizar la consulta correcta a Supabase para el detalle de equipo', async () => {
        mockFrom.maybeSingle.mockResolvedValueOnce({
          data: { id_equipo: 'eq-1', codigo: 'LAP-101', incidencias: [] },
          error: null,
        });

        const result = await EquiposRepository.getEquipmentDetails('eq-1');
        expect(result.success).toBe(true);
        expect(result.data?.codigo).toBe('LAP-101');
      });

      it('debe manejar errores en la consulta de getEquipmentDetails', async () => {
        mockFrom.maybeSingle.mockResolvedValueOnce({
          data: null,
          error: { message: 'Details db error' },
        });

        const result = await EquiposRepository.getEquipmentDetails('eq-1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Details db error');
      });

      it('debe manejar excepciones en getEquipmentDetails', async () => {
        mockFrom.maybeSingle.mockRejectedValueOnce(new Error('Crash details repo'));

        const result = await EquiposRepository.getEquipmentDetails('eq-1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error inesperado al cargar el detalle del equipo');
      });
    });

    describe('EquiposRepository.findAll con filtros', () => {
      it('debe aplicar filtros tipo, estado, ubicacion y query en la consulta Supabase', async () => {
        mockFrom.then.mockImplementationOnce((resolve: any) =>
          resolve({ data: [], error: null })
        );

        const res = await EquiposRepository.findAll({
          query: 'LAP',
          tipo: 'laptop',
          estado_operativo: 'operativo',
          ubicacion: 'Oficina 301',
        });

        expect(res.success).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('equipos_informaticos');
      });
    });
  });

  describe('HU-014: Pruebas de Actualización de Equipos Informáticos', () => {
    const mockJefeTi = {
      id_perfil: 'perf-jefe-ti',
      id_auth_supabase: 'auth-jefe-ti',
      id_rol: 1,
    };

    const mockEquipment = {
      id_equipo: 'eq-1',
      codigo: 'LAP-101',
      nombre: 'Lenovo ThinkPad',
      tipo: 'laptop',
      marca: 'Lenovo',
      modelo: 'T14',
      numero_serie: 'SN-111',
      ubicacion: 'Oficina 301',
      estado_operativo: 'operativo',
    };

    const mockFrom = (supabase.from as jest.Mock)();
    const mockGetProfile = PerfilesRepository.getProfileByUserId as jest.Mock;

    beforeEach(() => {
      mockGetProfile.mockResolvedValue(mockJefeTi);
    });

    describe('actualizarEquipoAction', () => {
      it('debe actualizar los datos de la ficha sin cambio de estado operativo', async () => {
        jest.spyOn(EquiposRepository, 'getEquipmentDetails').mockResolvedValueOnce({
          success: true,
          data: mockEquipment as any,
        });
        jest.spyOn(EquiposRepository, 'findByNumeroSerie').mockResolvedValueOnce(null);
        
        const updateSpy = jest.spyOn(EquiposRepository, 'update').mockResolvedValueOnce({
          success: true,
          data: { ...mockEquipment, nombre: 'Lenovo ThinkPad v2' } as any,
        });

        const result = await actualizarEquipoAction(
          'eq-1',
          {
            nombre: 'Lenovo ThinkPad v2',
            tipo: 'laptop',
            marca: 'Lenovo',
            modelo: 'T14',
            numero_serie: 'SN-111',
            ubicacion: 'Oficina 301',
            estado_operativo: 'operativo',
          },
          'auth-jefe-ti'
        );

        expect(result.success).toBe(true);
        expect(result.data?.nombre).toBe('Lenovo ThinkPad v2');
        expect(updateSpy).toHaveBeenCalled();
      });

      it('debe registrar historial de estados si cambia el estado operativo con observación', async () => {
        jest.spyOn(EquiposRepository, 'getEquipmentDetails').mockResolvedValueOnce({
          success: true,
          data: mockEquipment as any,
        });
        jest.spyOn(EquiposRepository, 'findByNumeroSerie').mockResolvedValueOnce(null);

        const historySpy = jest.spyOn(HistorialEstadoEquipoRepository, 'insert').mockResolvedValueOnce({
          success: true,
          data: {} as any,
        });

        jest.spyOn(EquiposRepository, 'update').mockResolvedValueOnce({
          success: true,
          data: { ...mockEquipment, estado_operativo: 'mantenimiento' } as any,
        });

        const result = await actualizarEquipoAction(
          'eq-1',
          {
            nombre: 'Lenovo ThinkPad',
            tipo: 'laptop',
            marca: 'Lenovo',
            modelo: 'T14',
            numero_serie: 'SN-111',
            ubicacion: 'Oficina 301',
            estado_operativo: 'mantenimiento',
          },
          'auth-jefe-ti',
          'Mantenimiento preventivo anual'
        );

        expect(result.success).toBe(true);
        expect(historySpy).toHaveBeenCalledWith({
          id_equipo: 'eq-1',
          estado_anterior: 'operativo',
          estado_nuevo: 'mantenimiento',
          observacion: 'Mantenimiento preventivo anual',
          id_usuario_cambio: 'perf-jefe-ti',
        });
      });

      it('debe fallar al cambiar de estado operativo si no se proporciona observación', async () => {
        jest.spyOn(EquiposRepository, 'getEquipmentDetails').mockResolvedValueOnce({
          success: true,
          data: mockEquipment as any,
        });

        const result = await actualizarEquipoAction(
          'eq-1',
          {
            nombre: 'Lenovo ThinkPad',
            tipo: 'laptop',
            marca: 'Lenovo',
            modelo: 'T14',
            numero_serie: 'SN-111',
            ubicacion: 'Oficina 301',
            estado_operativo: 'mantenimiento',
          },
          'auth-jefe-ti',
          ''
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Debe ingresar una observación');
      });

      it('debe denegar el acceso si el rol no es Jefe de TI', async () => {
        mockGetProfile.mockResolvedValueOnce({
          id_perfil: 'perf-tec',
          id_auth_supabase: 'auth-tec',
          id_rol: 2, // Técnico
        });

        const result = await actualizarEquipoAction(
          'eq-1',
          {
            nombre: 'Lenovo ThinkPad',
            tipo: 'laptop',
            marca: 'Lenovo',
            modelo: 'T14',
            numero_serie: 'SN-111',
            ubicacion: 'Oficina 301',
            estado_operativo: 'operativo',
          },
          'auth-tec'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Solo el rol Jefe de TI puede actualizar');
      });

      it('debe fallar si el número de serie ya está en uso por otro equipo', async () => {
        jest.spyOn(EquiposRepository, 'getEquipmentDetails').mockResolvedValueOnce({
          success: true,
          data: mockEquipment as any,
        });

        // Simular que otra máquina ya tiene este número de serie
        jest.spyOn(EquiposRepository, 'findByNumeroSerie').mockResolvedValueOnce({
          id_equipo: 'eq-2',
          numero_serie: 'SN-DUPLICADO',
        } as any);

        const result = await actualizarEquipoAction(
          'eq-1',
          {
            nombre: 'Lenovo ThinkPad',
            tipo: 'laptop',
            marca: 'Lenovo',
            modelo: 'T14',
            numero_serie: 'SN-DUPLICADO',
            ubicacion: 'Oficina 301',
            estado_operativo: 'operativo',
          },
          'auth-jefe-ti'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('ya se encuentra registrado en otro equipo');
      });
    });

    describe('obtenerHistorialEstadosAction', () => {
      it('debe obtener el historial de estados con éxito', async () => {
        const mockHistorial = [
          { id_historial: 'h-1', estado_anterior: 'operativo', estado_nuevo: 'mantenimiento' },
        ];
        jest.spyOn(HistorialEstadoEquipoRepository, 'findByEquipoId').mockResolvedValueOnce({
          success: true,
          data: mockHistorial as any,
        });

        const result = await obtenerHistorialEstadosAction('eq-1');
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });

    describe('HistorialEstadoEquipoRepository', () => {
      it('debe insertar registros de historial de estado en Supabase', async () => {
        mockFrom.single.mockResolvedValueOnce({
          data: { id_historial: 'h-1' },
          error: null,
        });

        const res = await HistorialEstadoEquipoRepository.insert({
          id_equipo: 'eq-1',
          estado_anterior: 'operativo',
          estado_nuevo: 'mantenimiento',
          observacion: 'Cambio de prueba',
          id_usuario_cambio: 'perf-jefe-ti',
        });

        expect(res.success).toBe(true);
        expect(res.data?.id_historial).toBe('h-1');
      });

      it('debe obtener registros de historial de estado desde Supabase', async () => {
        mockFrom.then.mockImplementationOnce((resolve: any) =>
          resolve({ data: [{ id_historial: 'h-1' }], error: null })
        );

        const res = await HistorialEstadoEquipoRepository.findByEquipoId('eq-1');
        expect(res.success).toBe(true);
        expect(res.data).toHaveLength(1);
      });
    });
  });
});
