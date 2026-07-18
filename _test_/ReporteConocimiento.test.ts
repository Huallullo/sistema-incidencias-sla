import { generarReporteConocimientoAction } from '@/actions/reporteConocimientoActions';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

const mockConsultas = [
  { id_articulo: 'art-01', creado_en: '2026-07-01T12:00:00Z' },
  { id_articulo: 'art-01', creado_en: '2026-07-02T12:00:00Z' },
  { id_articulo: 'art-01', creado_en: '2026-07-03T12:00:00Z' },
  { id_articulo: 'art-02', creado_en: '2026-07-02T12:00:00Z' },
];

const mockArticulos = [
  {
    id_articulo: 'art-01',
    titulo: 'Instalar impresora HP',
    categoria: 'hardware',
    creado_en: '2026-06-01T10:00:00Z',
    autor_id: 'autor-01',
    autor: { nombre: 'Juan', apellido: 'Gomez' },
  },
  {
    id_articulo: 'art-02',
    titulo: 'Renovacion de IP DHCP',
    categoria: 'redes',
    creado_en: '2026-06-02T10:00:00Z',
    autor_id: 'autor-02',
    autor: { nombre: 'Ana', apellido: 'Ruiz' },
  },
];

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: jest.fn((table) => ({
      select: jest.fn(() => {
        if (table === 'consultas_articulo') {
          const mockQuery: any = Promise.resolve({ data: mockConsultas, error: null });
          mockQuery.order = jest.fn().mockResolvedValue({ data: mockConsultas, error: null });
          mockQuery.gte = jest.fn(() => mockQuery);
          mockQuery.lte = jest.fn(() => mockQuery);
          return mockQuery;
        }
        return Promise.resolve({ data: mockArticulos, error: null });
      }),
    })),
  })),
}));

describe('HU-024: Reporte de Artículos de Conocimiento Más Consultados', () => {
  const mockJefeId = 'jefe-001';
  const mockTecnicoId = 'tec-A';
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

  it('debe denegar el acceso si el usuario no es Jefe de TI', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockTecnicoId,
      id_rol: 2,
      rol: 'tecnico',
    } as any);

    const result = await generarReporteConocimientoAction({}, mockTecnicoId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Solo el Jefe de TI');
  });

  it('debe generar el reporte correctamente para el Jefe de TI', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteConocimientoAction({}, mockJefeId);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.articulos).toHaveLength(2);
    expect(result.data!.resumen.total_consultas).toBe(4);
  });

  it('debe ordenar los artículos de mayor a menor número de consultas', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteConocimientoAction({}, mockJefeId);
    const arts = result.data!.articulos;

    // El primer artículo en la lista ordenada debe ser 'art-01' con 3 consultas
    expect(arts[0].id_articulo).toBe('art-01');
    expect(arts[0].total_consultas).toBe(3);

    // El segundo debe ser 'art-02' con 1 consulta
    expect(arts[1].id_articulo).toBe('art-02');
    expect(arts[1].total_consultas).toBe(1);
  });

  it('debe calcular correctamente los KPIs del reporte de conocimiento', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteConocimientoAction({}, mockJefeId);
    const res = result.data!.resumen;

    expect(res.total_articulos).toBe(2);
    expect(res.total_consultas).toBe(4);
    // Categoría más consultada: 'Hardware' con 3 consultas de 'art-01'
    expect(res.categoria_mas_consultada).toBe('Hardware');
    expect(res.articulo_mas_consultado).toContain('Instalar impresora HP');
  });

  it('debe rechazar filtros con formatos inválidos', async () => {
    const result = await generarReporteConocimientoAction(
      { fechaInicio: false as any },
      mockJefeId
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
