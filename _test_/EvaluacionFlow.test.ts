import { 
  registrarEvaluacionAction, 
  obtenerEvaluacionTicketAction 
} from '@/actions/evaluacionActions';
import { supabase } from '@/lib/supabaseClient';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { EvaluacionRepository } from '@/repositories/EvaluacionRepository';
import { EvaluacionService } from '@/services/EvaluacionService';

// Mock Supabase Client
jest.mock('@/lib/supabaseClient', () => {
  const mockFromInstance = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    insert: jest.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: jest.fn(() => mockFromInstance),
    },
  };
});

describe('HU-017: Pruebas del Módulo de Evaluación del Servicio', () => {
  const mockFrom = (supabase.from as jest.Mock)();
  const mockUserUuid = '22222222-2222-4222-8222-222222222222';
  const mockTicketUuid = '33333333-3333-4333-8333-333333333333';
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
  });

  describe('registrarEvaluacionAction', () => {
    it('debe registrar la evaluación con éxito si cumple con todas las condiciones', async () => {
      // 1. Mock de obtener incidencia
      jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
        success: true,
        data: {
          id_incidencia: mockTicketUuid,
          creado_por: mockUserUuid,
          estado: 'cerrado',
          titulo: 'Problema de red',
          descripcion: 'Falla',
          categoria: 'redes',
          prioridad: 'baja',
          creado_en: '2026-07-12T10:00:00Z',
          codigo_ticket: 'TCK-100',
          actualizado_en: null,
          asignado_a: null,
          id_equipo: null,
        },
      });

      // 2. Mock de buscar evaluación previa (debe ser null)
      jest.spyOn(EvaluacionRepository, 'findByIncidenciaId').mockResolvedValueOnce(null);

      // 3. Mock de insertar evaluación
      const mockResult = {
        id_evaluacion: 'eval-1',
        id_incidencia: mockTicketUuid,
        creado_por: mockUserUuid,
        calificacion: 5,
        comentario: 'Excelente atención',
        creado_en: '2026-07-12T12:00:00Z',
      };
      jest.spyOn(EvaluacionRepository, 'insert').mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      const result = await registrarEvaluacionAction({
        id_incidencia: mockTicketUuid,
        calificacion: 5,
        comentario: 'Excelente atención',
      }, mockUserUuid);

      expect(result.success).toBe(true);
      expect(result.data?.id_evaluacion).toBe('eval-1');
      expect(result.data?.calificacion).toBe(5);
    });

    it('debe fallar si el usuario no es el propietario de la incidencia', async () => {
      // Mock de obtener incidencia (creado por otro usuario)
      jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
        success: true,
        data: {
          id_incidencia: mockTicketUuid,
          creado_por: 'otro-usuario-uuid',
          estado: 'cerrado',
          titulo: 'Problema de red',
          descripcion: 'Falla',
          categoria: 'redes',
          prioridad: 'baja',
          creado_en: '2026-07-12T10:00:00Z',
          codigo_ticket: 'TCK-100',
          actualizado_en: null,
          asignado_a: null,
          id_equipo: null,
        },
      });

      const result = await registrarEvaluacionAction({
        id_incidencia: mockTicketUuid,
        calificacion: 4,
        comentario: 'Buen soporte',
      }, mockUserUuid);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Solo el usuario propietario del ticket puede evaluarlo');
    });

    it('debe fallar si la incidencia no está en estado cerrado', async () => {
      // Mock de obtener incidencia en estado 'en_progreso'
      jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
        success: true,
        data: {
          id_incidencia: mockTicketUuid,
          creado_por: mockUserUuid,
          estado: 'en_progreso',
          titulo: 'Problema de red',
          descripcion: 'Falla',
          categoria: 'redes',
          prioridad: 'baja',
          creado_en: '2026-07-12T10:00:00Z',
          codigo_ticket: 'TCK-100',
          actualizado_en: null,
          asignado_a: null,
          id_equipo: null,
        },
      });

      const result = await registrarEvaluacionAction({
        id_incidencia: mockTicketUuid,
        calificacion: 4,
        comentario: 'Soporte regular',
      }, mockUserUuid);

      expect(result.success).toBe(false);
      expect(result.error).toContain('La incidencia debe estar en estado "cerrado"');
    });

    it('debe fallar si ya existe una evaluación previa para la incidencia', async () => {
      // Mock de obtener incidencia cerrada
      jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
        success: true,
        data: {
          id_incidencia: mockTicketUuid,
          creado_por: mockUserUuid,
          estado: 'cerrado',
          titulo: 'Problema de red',
          descripcion: 'Falla',
          categoria: 'redes',
          prioridad: 'baja',
          creado_en: '2026-07-12T10:00:00Z',
          codigo_ticket: 'TCK-100',
          actualizado_en: null,
          asignado_a: null,
          id_equipo: null,
        },
      });

      // Mock de buscar evaluación previa (ya existe una evaluación)
      jest.spyOn(EvaluacionRepository, 'findByIncidenciaId').mockResolvedValueOnce({
        id_evaluacion: 'eval-existente',
        id_incidencia: mockTicketUuid,
        creado_por: mockUserUuid,
        calificacion: 3,
        comentario: 'Ok',
        creado_en: '2026-07-12T11:00:00Z',
      });

      const result = await registrarEvaluacionAction({
        id_incidencia: mockTicketUuid,
        calificacion: 5,
        comentario: 'Intento duplicar',
      }, mockUserUuid);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Ya existe una evaluación registrada');
    });

    it('debe fallar por validación Zod si la calificación está fuera de rango', async () => {
      const result = await registrarEvaluacionAction({
        id_incidencia: mockTicketUuid,
        calificacion: 6, // Fuera del rango 1-5
        comentario: 'Excelente',
      }, mockUserUuid);

      expect(result.success).toBe(false);
      expect(result.error).toContain('La calificación máxima es 5 estrellas');
    });
  });

  describe('obtenerEvaluacionTicketAction', () => {
    it('debe obtener la evaluación asociada', async () => {
      const mockEval = {
        id_evaluacion: 'eval-1',
        id_incidencia: mockTicketUuid,
        creado_por: mockUserUuid,
        calificacion: 5,
        comentario: 'Ok',
        creado_en: '2026-07-12T11:00:00Z',
      };
      jest.spyOn(EvaluacionRepository, 'findByIncidenciaId').mockResolvedValueOnce(mockEval);

      const result = await obtenerEvaluacionTicketAction(mockTicketUuid);
      expect(result.success).toBe(true);
      expect(result.data?.id_evaluacion).toBe('eval-1');
    });

    it('debe propagar nulo si la incidencia no ha sido evaluada aún', async () => {
      jest.spyOn(EvaluacionRepository, 'findByIncidenciaId').mockResolvedValueOnce(null);

      const result = await obtenerEvaluacionTicketAction(mockTicketUuid);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });
});
