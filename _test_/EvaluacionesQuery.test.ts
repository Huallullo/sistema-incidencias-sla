import { consultarEvaluacionesAction } from '@/actions/evaluacionActions';
import { EvaluacionRepository } from '@/repositories/EvaluacionRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id_evaluacion: 'eval-1',
              id_incidencia: 'tck-1',
              creado_por: 'user-1',
              calificacion: 5,
              comentario: 'Excelente atencion rapida',
              creado_en: '2026-07-12T10:00:00Z',
              incidencia: {
                id_incidencia: 'tck-1',
                codigo_ticket: 'INC-20260001',
                titulo: 'Fallo de impresora oficina',
                creado_por: 'user-1',
                asignado_a: 'tech-1',
                creador: { id_perfil: 'user-1', nombre: 'Luis', apellido: 'Perez' },
                asignado: { id_perfil: 'tech-1', nombre: 'Carlos', apellido: 'Soto' }
              }
            },
            {
              id_evaluacion: 'eval-2',
              id_incidencia: 'tck-2',
              creado_por: 'user-2',
              calificacion: 3,
              comentario: 'Demoro un poco la respuesta',
              creado_en: '2026-07-13T12:00:00Z',
              incidencia: {
                id_incidencia: 'tck-2',
                codigo_ticket: 'INC-20260002',
                titulo: 'Sin conexion a internet',
                creado_por: 'user-2',
                asignado_a: 'tech-2',
                creador: { id_perfil: 'user-2', nombre: 'Ana', apellido: 'Gomez' },
                asignado: { id_perfil: 'tech-2', nombre: 'Maria', apellido: 'Rojas' }
              }
            }
          ],
          error: null
        })
      }))
    }))
  }))
}));

describe('HU-019: Pruebas de Consulta de Evaluaciones de Servicio', () => {
  const mockJefeUuid = '11111111-1111-4111-8111-111111111111';
  const mockTecnicoUuid = '22222222-2222-4222-8222-222222222222';
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

  it('debe permitir al Jefe de TI consultar todas las evaluaciones sin filtros especiales', async () => {
    // Mock perfil del Jefe de TI (rol = 1)
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid,
      id_rol: 1, // Jefe de TI
      rol: 'jefe_ti',
    } as any);

    const filters = {
      tecnicoId: 'todos',
      usuarioId: 'todos',
      calificacion: 'todas',
      fechaInicio: '',
      fechaFin: '',
      busqueda: ''
    };

    const result = await consultarEvaluacionesAction(filters, mockJefeUuid);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]?.calificacion).toBe(5);
  });

  it('debe denegar el acceso si el usuario no tiene el rol de Jefe de TI', async () => {
    // Mock perfil de Técnico (rol = 2)
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockTecnicoUuid,
      id_rol: 2, // Técnico
      rol: 'tecnico',
    } as any);

    const filters = {
      tecnicoId: 'todos',
      usuarioId: 'todos',
      calificacion: 'todas',
      fechaInicio: '',
      fechaFin: '',
      busqueda: ''
    };

    const result = await consultarEvaluacionesAction(filters, mockTecnicoUuid);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Solo el Jefe de TI puede consultar las evaluaciones');
  });

  it('debe aplicar filtros locales por técnico en la respuesta del repositorio', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const filters = {
      tecnicoId: 'tech-1', // Filtrar por técnico 1
      usuarioId: 'todos',
      calificacion: 'todas',
      fechaInicio: '',
      fechaFin: '',
      busqueda: ''
    };

    const result = await consultarEvaluacionesAction(filters, mockJefeUuid);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.incidencia?.asignado_a).toBe('tech-1');
  });

  it('debe aplicar filtrado por búsqueda difusa de texto (busqueda)', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const filters = {
      tecnicoId: 'todos',
      usuarioId: 'todos',
      calificacion: 'todas',
      fechaInicio: '',
      fechaFin: '',
      busqueda: 'impresora' // Buscará 'impresora' en los títulos
    };

    const result = await consultarEvaluacionesAction(filters, mockJefeUuid);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.incidencia?.titulo).toContain('impresora');
  });

  it('debe fallar si los parámetros de filtro son inválidos según Zod', async () => {
    const filters = {
      tecnicoId: 12345, // Debería ser string
      usuarioId: 'todos',
      calificacion: 'todas',
      fechaInicio: '',
      fechaFin: '',
      busqueda: ''
    } as any;

    const result = await consultarEvaluacionesAction(filters, mockJefeUuid);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
