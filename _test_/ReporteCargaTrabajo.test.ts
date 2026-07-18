import { generarReporteCargaAction } from '@/actions/reporteCargaTrabajoActions';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

// ─── Mock de incidencias con técnicos ────────────────────────────────────────
const mockIncidencias = [
  // Técnico A: 3 tickets
  { id_incidencia: 'i1', prioridad: 'critica', estado: 'abierto',     asignado_a: 'tec-A', creado_en: '2026-07-01T10:00:00Z', asignado: { id_perfil: 'tec-A', nombre: 'Carlos', apellido: 'Perez' } },
  { id_incidencia: 'i2', prioridad: 'alta',    estado: 'en_progreso', asignado_a: 'tec-A', creado_en: '2026-07-02T10:00:00Z', asignado: { id_perfil: 'tec-A', nombre: 'Carlos', apellido: 'Perez' } },
  { id_incidencia: 'i3', prioridad: 'media',   estado: 'cerrado',     asignado_a: 'tec-A', creado_en: '2026-07-03T10:00:00Z', asignado: { id_perfil: 'tec-A', nombre: 'Carlos', apellido: 'Perez' } },
  // Técnico B: 1 ticket
  { id_incidencia: 'i4', prioridad: 'baja',    estado: 'resuelto',    asignado_a: 'tec-B', creado_en: '2026-07-04T10:00:00Z', asignado: { id_perfil: 'tec-B', nombre: 'Maria',  apellido: 'Lopez'  } },
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

describe('HU-021: Reporte de Carga de Trabajo de Técnicos', () => {
  const mockJefeId = 'jefe-001';
  const mockTecnicoId = 'tec-A';
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => { consoleErrorSpy.mockRestore(); });
  beforeEach(() => { jest.clearAllMocks(); });

  it('debe denegar el acceso si el usuario no es Jefe de TI', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockTecnicoId, id_rol: 2, rol: 'tecnico',
    } as any);

    const result = await generarReporteCargaAction({}, mockTecnicoId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Solo el Jefe de TI');
  });

  it('debe generar el reporte correctamente para el Jefe de TI', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId, id_rol: 1, rol: 'jefe_ti',
    } as any);

    const result = await generarReporteCargaAction({}, mockJefeId);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.tecnicos).toHaveLength(2);
    expect(result.data!.total_tickets_sistema).toBe(4);
  });

  it('debe calcular correctamente los tickets del técnico A', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId, id_rol: 1, rol: 'jefe_ti',
    } as any);

    const result = await generarReporteCargaAction({}, mockJefeId);
    const tecA = result.data!.tecnicos.find(t => t.id_perfil === 'tec-A');

    expect(tecA).toBeDefined();
    expect(tecA!.total).toBe(3);
    expect(tecA!.abiertos).toBe(1);
    expect(tecA!.en_progreso).toBe(1);
    expect(tecA!.cerrados).toBe(1);
    expect(tecA!.criticos).toBe(1);
  });

  it('debe calcular correctamente el promedio de carga por técnico', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId, id_rol: 1, rol: 'jefe_ti',
    } as any);

    const result = await generarReporteCargaAction({}, mockJefeId);

    // 4 tickets / 2 técnicos = 2 promedio
    expect(result.data!.promedio_por_tecnico).toBe(2);
  });

  it('debe identificar al técnico más cargado como Carlos Perez (3 tickets)', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId, id_rol: 1, rol: 'jefe_ti',
    } as any);

    const result = await generarReporteCargaAction({}, mockJefeId);

    expect(result.data!.tecnico_mas_cargado).toBe('Carlos Perez');
    expect(result.data!.tecnico_menos_cargado).toBe('Maria Lopez');
  });

  it('debe rechazar filtros con tipos inválidos según Zod', async () => {
    const result = await generarReporteCargaAction(
      { fechaInicio: 99999 as any },
      mockJefeId
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
