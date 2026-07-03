import { registrarArticuloAction, obtenerArticulosAction } from '@/actions/conocimientoActions';
import { supabase } from '@/lib/supabaseClient';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { ArticuloConocimientoRepository } from '@/repositories/ArticuloConocimientoRepository';
import { ConocimientoService } from '@/services/ConocimientoService';

// Mock client with thenable database query simulation
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

describe('HU-010: Pruebas de Flujo de Base de Conocimiento', () => {
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

  describe('registrarArticuloAction', () => {
    it('debe registrar un artículo con éxito si es Técnico o Jefe de TI', async () => {
      // Mockear perfil del autor
      const mockAutor = {
        id_perfil: 'perf-autor-111',
        id_auth_supabase: 'auth-autor-111',
        id_rol: 2, // Técnico
        nombre: 'Carlos',
        apellido: 'Medina',
      };
      mockGetProfile.mockResolvedValueOnce(mockAutor);

      // Mockear insert de repositorio
      const mockArticulo = {
        id_articulo: 'art-888',
        titulo: 'Fallo de impresora y spooler de Windows',
        categoria: 'software',
        descripcion_problema: 'La cola de impresión se bloquea frecuentemente impidiendo nuevas impresiones.',
        solucion_pasos: '1. Detener servicio spooler. 2. Limpiar carpeta printers. 3. Iniciar servicio spooler.',
        id_incidencia: null,
        autor_id: 'perf-autor-111',
      };
      jest.spyOn(ArticuloConocimientoRepository, 'insert').mockResolvedValueOnce({
        success: true,
        data: mockArticulo as any,
      });

      const result = await registrarArticuloAction(
        {
          titulo: 'Fallo de impresora y spooler de Windows',
          categoria: 'software',
          descripcion_problema: 'La cola de impresión se bloquea frecuentemente impidiendo nuevas impresiones.',
          solucion_pasos: '1. Detener servicio spooler. 2. Limpiar carpeta printers. 3. Iniciar servicio spooler.',
          id_incidencia: null,
        },
        'auth-autor-111'
      );

      expect(result.success).toBe(true);
      expect(result.data?.id_articulo).toBe('art-888');
      expect(mockGetProfile).toHaveBeenCalledWith('auth-autor-111');
      expect(ArticuloConocimientoRepository.insert).toHaveBeenCalled();
    });

    it('debe fallar si el usuario no tiene rol Técnico o Jefe de TI', async () => {
      const mockAutor = {
        id_perfil: 'perf-autor-111',
        id_auth_supabase: 'auth-autor-111',
        id_rol: 3, // Usuario común
      };
      mockGetProfile.mockResolvedValueOnce(mockAutor);

      const result = await registrarArticuloAction(
        {
          titulo: 'Fallo de impresora y spooler de Windows',
          categoria: 'software',
          descripcion_problema: 'La cola de impresión se bloquea frecuentemente impidiendo nuevas impresiones.',
          solucion_pasos: '1. Detener servicio spooler. 2. Limpiar carpeta printers. 3. Iniciar servicio spooler.',
          id_incidencia: null,
        },
        'auth-autor-111'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Solo los roles Técnico y Jefe de TI pueden registrar artículos');
    });

    it('debe rechazar vinculación de ticket si está abierto o en progreso', async () => {
      const mockAutor = {
        id_perfil: 'perf-autor-111',
        id_auth_supabase: 'auth-autor-111',
        id_rol: 1, // Jefe de TI
      };
      mockGetProfile.mockResolvedValueOnce(mockAutor);

      // Mockear ticket abierto
      const mockTicket = {
        id_incidencia: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        estado: 'abierto',
      };
      jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
        success: true,
        data: mockTicket as any,
      });

      const result = await registrarArticuloAction(
        {
          titulo: 'Fallo de impresora y spooler de Windows',
          categoria: 'software',
          descripcion_problema: 'La cola de impresión se bloquea frecuentemente impidiendo nuevas impresiones.',
          solucion_pasos: '1. Detener servicio spooler. 2. Limpiar carpeta printers. 3. Iniciar servicio spooler.',
          id_incidencia: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        },
        'auth-autor-111'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('El ticket seleccionado debe estar en estado resuelto o cerrado');
    });

    it('debe fallar si los campos son más cortos de lo requerido en Zod', async () => {
      const result = await registrarArticuloAction(
        {
          titulo: 'Corto',
          categoria: 'software',
          descripcion_problema: 'Corto',
          solucion_pasos: 'Corto',
        },
        'auth-autor-111'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('El título debe tener al menos 10 caracteres');
    });
  });

  describe('obtenerArticulosAction', () => {
    it('debe retornar lista de artículos', async () => {
      const mockArticulos = [
        {
          id_articulo: '1',
          titulo: 'Solución a caída de router principal',
          categoria: 'redes',
        },
      ];
      jest.spyOn(ArticuloConocimientoRepository, 'getAll').mockResolvedValueOnce({
        success: true,
        data: mockArticulos as any,
      });

      const result = await obtenerArticulosAction();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].categoria).toBe('redes');
    });
  });

  describe('Manejo de Errores en Repositorios', () => {
    it('debe manejar errores en ArticuloConocimientoRepository.insert', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database insert error' },
      });

      const res = await ArticuloConocimientoRepository.insert({
        titulo: 'Test titulo articulo',
        categoria: 'redes',
        descripcion_problema: 'Test descripcion',
        solucion_pasos: 'Test pasos',
        id_incidencia: null,
        autor_id: 'perf-111',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database insert error');
    });

    it('debe manejar errores en ArticuloConocimientoRepository.getAll', async () => {
      mockFrom.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: null, error: { message: 'Database select error' } })
      );

      const res = await ArticuloConocimientoRepository.getAll();

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database select error');
    });
  });
});
