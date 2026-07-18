import { generarReporteFallasAction } from '@/actions/reporteFallasEquipoActions';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

const mockIncidencias = [
  {
    id_incidencia: 'inc-01',
    codigo_ticket: 'TK-00001',
    titulo: 'Laptop no enciende',
    categoria: 'hardware',
    prioridad: 'alta',
    estado: 'cerrado',
    creado_en: '2026-07-01T10:00:00Z',
    fecha_cierre: '2026-07-01T15:00:00Z', // 5 horas
    asignado_a: 'tec-A',
    id_equipo: 'eq-01',
    asignado: { nombre: 'Carlos', apellido: 'Perez' },
    equipo: {
      id_equipo: 'eq-01',
      codigo: 'EQ-LAP-001',
      nombre: 'Laptop Lenovo T14',
      tipo: 'laptop',
      ubicacion: 'Oficina 302',
      estado_operativo: 'operativo',
    },
  },
  {
    id_incidencia: 'inc-02',
    codigo_ticket: 'TK-00002',
    titulo: 'Teclado defectuoso',
    categoria: 'hardware',
    prioridad: 'media',
    estado: 'abierto',
    creado_en: '2026-07-02T10:00:00Z',
    fecha_cierre: null,
    asignado_a: 'tec-A',
    id_equipo: 'eq-01',
    asignado: { nombre: 'Carlos', apellido: 'Perez' },
    equipo: {
      id_equipo: 'eq-01',
      codigo: 'EQ-LAP-001',
      nombre: 'Laptop Lenovo T14',
      tipo: 'laptop',
      ubicacion: 'Oficina 302',
      estado_operativo: 'operativo',
    },
  },
  {
    id_incidencia: 'inc-03',
    codigo_ticket: 'TK-00003',
    titulo: 'Pantalla parpadea',
    categoria: 'hardware',
    prioridad: 'critica',
    estado: 'resuelto',
    creado_en: '2026-07-03T10:00:00Z',
    fecha_cierre: null,
    asignado_a: 'tec-B',
    id_equipo: 'eq-02',
    asignado: { nombre: 'Maria', apellido: 'Lopez' },
    equipo: {
      id_equipo: 'eq-02',
      codigo: 'EQ-DES-002',
      nombre: 'Desktop Dell Optiplex',
      tipo: 'desktop',
      ubicacion: 'Sistemas',
      estado_operativo: 'mantenimiento',
    },
  },
];

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        not: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: mockIncidencias, error: null }),
        })),
      })),
    })),
  })),
}));

describe('HU-022: Reporte del Historial de Fallas por Equipo Informático', () => {
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

    const result = await generarReporteFallasAction({}, mockTecnicoId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Solo el Jefe de TI');
  });

  it('debe generar el reporte correctamente para el Jefe de TI', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteFallasAction({}, mockJefeId);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.equipos).toHaveLength(2);
    expect(result.data!.total_incidencias).toBe(3);
  });

  it('debe agrupar incidencias por equipo correctamente', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteFallasAction({}, mockJefeId);
    const eq01 = result.data!.equipos.find(e => e.id_equipo === 'eq-01');

    expect(eq01).toBeDefined();
    expect(eq01!.total_fallas).toBe(2);
    expect(eq01!.fallas_abiertas).toBe(1);
    expect(eq01!.fallas_cerradas).toBe(1);
    expect(eq01!.incidencias).toHaveLength(2);
  });

  it('debe calcular correctamente el tiempo promedio de resolución por equipo', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteFallasAction({}, mockJefeId);
    const eq01 = result.data!.equipos.find(e => e.id_equipo === 'eq-01');

    // TK-00001 tomó 5 horas de resolución
    expect(eq01!.tiempo_promedio_hrs).toBe(5);
  });

  it('debe identificar el equipo con más fallas', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteFallasAction({}, mockJefeId);

    expect(result.data!.equipo_mas_fallas).toContain('Laptop Lenovo T14');
  });

  it('debe rechazar filtros con formatos inválidos', async () => {
    const result = await generarReporteFallasAction(
      { fechaInicio: 12345 as any },
      mockJefeId
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
