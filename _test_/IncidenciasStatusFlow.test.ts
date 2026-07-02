import {
  actualizarEstadoTicketAction,
  obtenerHistorialTicketAction,
} from '@/actions/incidenciasActions';
import { supabase } from '@/lib/supabaseClient';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { HistorialEstadoTicketRepository } from '@/repositories/HistorialEstadoTicketRepository';
import { IncidenciasService } from '@/services/IncidenciasService';

// Mock the main supabase client with thenable database query simulation
jest.mock('@/lib/supabaseClient', () => {
  const mockFromInstance = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
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

// Mock PerfilesRepository
jest.mock('@/repositories/PerfilesRepository', () => {
  return {
    PerfilesRepository: {
      getProfileByUserId: jest.fn(),
    },
  };
});

describe('HU-008: Pruebas de Actualización de Estado e Historial de Incidencias', () => {
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
  });

  describe('actualizarEstadoTicketAction', () => {
    it('debe actualizar el estado con éxito, registrar historial y enviar notificación si es Técnico o Jefe de TI', async () => {
      // Mockear perfil del responsable
      const mockResponsable = {
        id_perfil: 'perf-resp-111',
        id_auth_supabase: 'auth-resp-111',
        id_rol: 2, // Técnico
        nombre: 'Carlos',
        apellido: 'Medina',
      };
      mockGetProfile.mockResolvedValueOnce(mockResponsable);

      // Mockear obtener incidencia actual
      const mockIncidencia = {
        id_incidencia: 'inc-888',
        codigo_ticket: 'INC-20260002',
        titulo: 'Fallo de impresora',
        estado: 'abierto',
        creador: {
          id_auth_supabase: 'auth-creador-222',
          nombre: 'Ana',
          apellido: 'Torres',
          correo: 'ana.torres@empresa.pe',
        },
      };
      jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
        success: true,
        data: mockIncidencia as any,
      });

      // Mockear updateEstado
      const mockIncidenciaActualizada = { ...mockIncidencia, estado: 'en_progreso' };
      jest.spyOn(IncidenciasRepository, 'updateEstado').mockResolvedValueOnce({
        success: true,
        data: mockIncidenciaActualizada as any,
      });

      // Mockear inserción en historial
      jest.spyOn(HistorialEstadoTicketRepository, 'insert').mockResolvedValueOnce({
        success: true,
        data: {
          id_historial: 'hist-777',
          id_incidencia: 'inc-888',
          estado_anterior: 'abierto',
          estado_nuevo: 'en_progreso',
          id_perfil_responsable: 'perf-resp-111',
          creado_en: '2026-07-02T12:00:00Z',
        },
      });

      // Mockear inserción en email_logs
      mockFrom.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null }));

      const result = await actualizarEstadoTicketAction('inc-888', 'en_progreso', 'auth-resp-111');

      expect(result.success).toBe(true);
      expect(result.data?.estado).toBe('en_progreso');
      expect(mockGetProfile).toHaveBeenCalledWith('auth-resp-111');
      expect(IncidenciasRepository.getById).toHaveBeenCalledWith('inc-888');
      expect(IncidenciasRepository.updateEstado).toHaveBeenCalledWith('inc-888', 'en_progreso');
      expect(HistorialEstadoTicketRepository.insert).toHaveBeenCalledWith({
        id_incidencia: 'inc-888',
        estado_anterior: 'abierto',
        estado_nuevo: 'en_progreso',
        id_perfil_responsable: 'perf-resp-111',
      });
      expect(supabase.from).toHaveBeenCalledWith('email_logs');
    });

    it('debe fallar si el usuario no tiene rol Técnico o Jefe de TI', async () => {
      const mockResponsable = {
        id_perfil: 'perf-resp-111',
        id_auth_supabase: 'auth-resp-111',
        id_rol: 3, // Usuario común
      };
      mockGetProfile.mockResolvedValueOnce(mockResponsable);

      const result = await actualizarEstadoTicketAction('inc-888', 'en_progreso', 'auth-resp-111');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Solo los Técnicos y Jefes de TI pueden actualizar el estado de una incidencia');
    });

    it('debe rechazar una transición incoherente (ej. de cerrado a en_progreso)', async () => {
      const mockResponsable = {
        id_perfil: 'perf-resp-111',
        id_auth_supabase: 'auth-resp-111',
        id_rol: 1, // Jefe de TI
      };
      mockGetProfile.mockResolvedValueOnce(mockResponsable);

      const mockIncidencia = {
        id_incidencia: 'inc-888',
        estado: 'cerrado',
      };
      jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
        success: true,
        data: mockIncidencia as any,
      });

      const result = await actualizarEstadoTicketAction('inc-888', 'en_progreso', 'auth-resp-111');

      expect(result.success).toBe(false);
      expect(result.error).toBe('La transición de estado no es válida o es incoherente.');
    });
  });

  describe('obtenerHistorialTicketAction', () => {
    it('debe retornar el historial de cambios correctamente', async () => {
      const mockHistorial = [
        {
          id_historial: '1',
          estado_anterior: 'abierto',
          estado_nuevo: 'en_progreso',
          responsable: { nombre: 'Carlos', apellido: 'Medina' },
        },
      ];
      jest.spyOn(HistorialEstadoTicketRepository, 'getByIncidenciaId').mockResolvedValueOnce({
        success: true,
        data: mockHistorial as any,
      });

      const result = await obtenerHistorialTicketAction('inc-888');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].estado_nuevo).toBe('en_progreso');
    });
  });

  describe('Manejo de Errores en Repositorios', () => {
    it('debe manejar errores en IncidenciasRepository.getById', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'GetById database error' },
      });

      const res = await IncidenciasRepository.getById('inc-888');
      expect(res.success).toBe(false);
      expect(res.error).toBe('GetById database error');
    });

    it('debe manejar errores en IncidenciasRepository.updateEstado', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update database error' },
      });

      const res = await IncidenciasRepository.updateEstado('inc-888', 'cerrado');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Update database error');
    });

    it('debe manejar errores en HistorialEstadoTicketRepository.insert', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'History insert database error' },
      });

      const res = await HistorialEstadoTicketRepository.insert({
        id_incidencia: 'inc-888',
        estado_anterior: 'abierto',
        estado_nuevo: 'en_progreso',
        id_perfil_responsable: 'perf-resp-111',
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe('History insert database error');
    });

    it('debe manejar errores en HistorialEstadoTicketRepository.getByIncidenciaId', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: 'History select database error' } })
      );

      const res = await HistorialEstadoTicketRepository.getByIncidenciaId('inc-888');
      expect(res.success).toBe(false);
      expect(res.error).toBe('History select database error');
    });
  });
});
