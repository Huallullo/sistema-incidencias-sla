import { 
  registrarDisponibilidadAction, 
  registrarRangoDisponibilidadAction, 
  actualizarDisponibilidadAction, 
  eliminarDisponibilidadAction, 
  obtenerDisponibilidadesAction,
  obtenerTecnicosAction
} from '@/actions/disponibilidadActions';
import { supabase } from '@/lib/supabaseClient';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { DisponibilidadRepository } from '@/repositories/DisponibilidadRepository';
import { DisponibilidadService } from '@/services/DisponibilidadService';

// Mock Supabase Client
jest.mock('@/lib/supabaseClient', () => {
  const mockFromInstance = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
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
      getRoleByUserId: jest.fn(),
      getProfileByUserId: jest.fn(),
    },
  };
});

describe('HU-015: Pruebas del Módulo de Disponibilidad de Técnicos', () => {
  const mockFrom = (supabase.from as jest.Mock)();
  const mockGetRole = PerfilesRepository.getRoleByUserId as jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  const mockTecnicoUuid = '11111111-1111-4111-8111-111111111111';

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
    mockFrom.single.mockResolvedValue({ data: null, error: null });
  });

  describe('registrarDisponibilidadAction', () => {
    it('debe registrar disponibilidad individual con éxito si el rol es Jefe de TI', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      jest.spyOn(DisponibilidadRepository, 'checkOverlap').mockResolvedValueOnce(false);
      
      const mockResult = {
        id_disponibilidad: 'disp-1',
        id_tecnico: mockTecnicoUuid,
        fecha: '2026-07-12',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana' as const,
        estado: 'disponible' as const,
      };

      jest.spyOn(DisponibilidadRepository, 'insert').mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      const result = await registrarDisponibilidadAction({
        id_tecnico: mockTecnicoUuid,
        fecha: '2026-07-12',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana',
        estado: 'disponible',
      }, 'auth-jefe-ti');

      expect(result.success).toBe(true);
      expect(result.data?.id_disponibilidad).toBe('disp-1');
    });

    it('debe fallar si el usuario no tiene rol de Jefe de TI', async () => {
      mockGetRole.mockResolvedValueOnce('tecnico');

      const result = await registrarDisponibilidadAction({
        id_tecnico: mockTecnicoUuid,
        fecha: '2026-07-12',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana',
        estado: 'disponible',
      }, 'auth-tec');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Solo el rol Jefe de TI puede registrar');
    });

    it('debe fallar si existe cruce de horario', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      jest.spyOn(DisponibilidadRepository, 'checkOverlap').mockResolvedValueOnce(true);

      const result = await registrarDisponibilidadAction({
        id_tecnico: mockTecnicoUuid,
        fecha: '2026-07-12',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana',
        estado: 'disponible',
      }, 'auth-jefe-ti');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conflicto de horario');
    });

    it('debe fallar por validación Zod si las horas son cronológicamente inconsistentes', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');

      const result = await registrarDisponibilidadAction({
        id_tecnico: mockTecnicoUuid,
        fecha: '2026-07-12',
        hora_inicio: '17:00', // hora_inicio > hora_fin
        hora_fin: '12:00',
        turno: 'mañana',
        estado: 'disponible',
      }, 'auth-jefe-ti');

      expect(result.success).toBe(false);
      expect(result.error).toContain('La hora de inicio debe ser estrictamente menor');
    });
  });

  describe('registrarRangoDisponibilidadAction', () => {
    it('debe registrar múltiples disponibilidades exitosamente para un rango sin conflictos', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      jest.spyOn(DisponibilidadRepository, 'checkOverlap').mockResolvedValue(false);
      jest.spyOn(DisponibilidadRepository, 'insert').mockResolvedValue({
        success: true,
        data: {} as any
      });

      // Rango de 3 días: 2026-07-12, 13, 14
      const result = await registrarRangoDisponibilidadAction({
        id_tecnico: mockTecnicoUuid,
        fecha_inicio: '2026-07-12',
        fecha_fin: '2026-07-14',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana',
        estado: 'disponible',
      }, 'auth-jefe-ti');

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
    });

    it('debe fallar si hay colisiones en cualquier fecha del rango', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      
      // Simular conflicto solo el día 2026-07-13 (el segundo día)
      const overlapSpy = jest.spyOn(DisponibilidadRepository, 'checkOverlap');
      overlapSpy.mockImplementation(async (id, date) => {
        return date === '2026-07-13';
      });

      const result = await registrarRangoDisponibilidadAction({
        id_tecnico: mockTecnicoUuid,
        fecha_inicio: '2026-07-12',
        fecha_fin: '2026-07-14',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana',
        estado: 'disponible',
      }, 'auth-jefe-ti');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conflicto de horario');
      expect(result.error).toContain('2026-07-13');
    });
  });

  describe('actualizarDisponibilidadAction', () => {
    it('debe actualizar disponibilidad exitosamente', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      
      jest.spyOn(DisponibilidadRepository, 'findById').mockResolvedValueOnce({
        id_disponibilidad: 'disp-1',
        id_tecnico: mockTecnicoUuid,
        fecha: '2026-07-12',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana',
        estado: 'disponible',
      });
      jest.spyOn(DisponibilidadRepository, 'checkOverlap').mockResolvedValueOnce(false);
      jest.spyOn(DisponibilidadRepository, 'update').mockResolvedValueOnce({
        success: true,
        data: { id_disponibilidad: 'disp-1' } as any,
      });

      const result = await actualizarDisponibilidadAction('disp-1', {
        estado: 'no_disponible',
      }, 'auth-jefe-ti');

      expect(result.success).toBe(true);
    });

    it('debe fallar si las horas actualizadas se cruzan con otra disponibilidad', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      
      jest.spyOn(DisponibilidadRepository, 'findById').mockResolvedValueOnce({
        id_disponibilidad: 'disp-1',
        id_tecnico: mockTecnicoUuid,
        fecha: '2026-07-12',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana',
        estado: 'disponible',
      });
      jest.spyOn(DisponibilidadRepository, 'checkOverlap').mockResolvedValueOnce(true);

      const result = await actualizarDisponibilidadAction('disp-1', {
        hora_inicio: '10:00',
      }, 'auth-jefe-ti');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conflicto de horario');
    });
  });

  describe('eliminarDisponibilidadAction', () => {
    it('debe eliminar la disponibilidad si es Jefe de TI', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      jest.spyOn(DisponibilidadRepository, 'findById').mockResolvedValueOnce({} as any);
      jest.spyOn(DisponibilidadRepository, 'delete').mockResolvedValueOnce({ success: true });

      const result = await eliminarDisponibilidadAction('disp-1', 'auth-jefe-ti');
      expect(result.success).toBe(true);
    });

    it('debe fallar si el registro no existe', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      jest.spyOn(DisponibilidadRepository, 'findById').mockResolvedValueOnce(null);

      const result = await eliminarDisponibilidadAction('disp-1', 'auth-jefe-ti');
      expect(result.success).toBe(false);
      expect(result.error).toContain('La disponibilidad no existe');
    });
  });

  describe('obtenerDisponibilidadesAction', () => {
    it('debe obtener la lista de disponibilidades', async () => {
      mockGetRole.mockResolvedValueOnce('tecnico');
      const mockList = [{ id_disponibilidad: 'disp-1', fecha: '2026-07-12' }] as any[];
      jest.spyOn(DisponibilidadRepository, 'findAll').mockResolvedValueOnce(mockList);

      const result = await obtenerDisponibilidadesAction({}, 'auth-tec');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('debe propagar los filtros de búsqueda (rango de fechas, turno, estado) al repositorio', async () => {
      mockGetRole.mockResolvedValueOnce('jefe_ti');
      const mockList = [{ id_disponibilidad: 'disp-2', fecha: '2026-07-15' }] as any[];
      const findAllSpy = jest.spyOn(DisponibilidadRepository, 'findAll').mockResolvedValueOnce(mockList);

      const filters = {
        fecha_inicio: '2026-07-10',
        fecha_fin: '2026-07-20',
        turno: 'tarde',
        estado: 'disponible'
      };

      const result = await obtenerDisponibilidadesAction(filters, 'auth-jefe-ti');
      expect(result.success).toBe(true);
      expect(findAllSpy).toHaveBeenCalledWith(filters);
    });

    it('debe manejar errores en la consulta regresando success false', async () => {
      jest.spyOn(DisponibilidadService, 'obtenerDisponibilidades').mockRejectedValueOnce(new Error('DB Error'));

      const result = await obtenerDisponibilidadesAction({}, 'auth-jefe-ti');
      expect(result.success).toBe(false);
      expect(result.error).toContain('DB Error');
    });
  });

  describe('DisponibilidadRepository', () => {
    it('debe insertar registros en Supabase', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { id_disponibilidad: 'disp-1' },
        error: null,
      });

      const res = await DisponibilidadRepository.insert({
        id_tecnico: mockTecnicoUuid,
        fecha: '2026-07-12',
        hora_inicio: '08:00',
        hora_fin: '16:00',
        turno: 'mañana',
        estado: 'disponible',
      });

      expect(res.success).toBe(true);
      expect(res.data?.id_disponibilidad).toBe('disp-1');
    });

    it('debe actualizar registros en Supabase', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { id_disponibilidad: 'disp-1', estado: 'no_disponible' },
        error: null,
      });

      const res = await DisponibilidadRepository.update('disp-1', {
        estado: 'no_disponible',
      });

      expect(res.success).toBe(true);
      expect(res.data?.estado).toBe('no_disponible');
    });

    it('debe borrar registros en Supabase', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: null })
      );

      const res = await DisponibilidadRepository.delete('disp-1');
      expect(res.success).toBe(true);
    });
  });
});
