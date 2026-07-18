import { generarReporteSatisfaccionAction } from '@/actions/reporteSatisfaccionActions';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

const mockEvaluaciones = [
  {
    id_evaluacion: 'ev-01',
    calificacion: 5,
    comentario: 'Excelente servicio!',
    creado_en: '2026-07-01T10:00:00Z',
    incidencia: {
      id_incidencia: 'inc-01',
      codigo_ticket: 'TK-00001',
      titulo: 'Laptop no enciende',
      categoria: 'hardware',
      prioridad: 'alta',
      creado_por: 'user-01',
      asignado_a: 'tec-A',
      creador: { nombre: 'Juan', apellido: 'Gomez' },
      asignado: { nombre: 'Carlos', apellido: 'Perez' },
    },
  },
  {
    id_evaluacion: 'ev-02',
    calificacion: 4,
    comentario: 'Buen soporte.',
    creado_en: '2026-07-02T10:00:00Z',
    incidencia: {
      id_incidencia: 'inc-02',
      codigo_ticket: 'TK-00002',
      titulo: 'Mouse defectuoso',
      categoria: 'hardware',
      prioridad: 'media',
      creado_por: 'user-01',
      asignado_a: 'tec-A',
      creador: { nombre: 'Juan', apellido: 'Gomez' },
      asignado: { nombre: 'Carlos', apellido: 'Perez' },
    },
  },
  {
    id_evaluacion: 'ev-03',
    calificacion: 2,
    comentario: 'Demoró mucho.',
    creado_en: '2026-07-03T10:00:00Z',
    incidencia: {
      id_incidencia: 'inc-03',
      codigo_ticket: 'TK-00003',
      titulo: 'Soporte de red',
      categoria: 'redes',
      prioridad: 'critica',
      creado_por: 'user-02',
      asignado_a: 'tec-B',
      creador: { nombre: 'Ana', apellido: 'Ruiz' },
      asignado: { nombre: 'Maria', apellido: 'Lopez' },
    },
  },
];

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: mockEvaluaciones, error: null }),
      })),
    })),
  })),
}));

describe('HU-023: Reporte de Evaluaciones de Satisfacción', () => {
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

    const result = await generarReporteSatisfaccionAction({}, mockTecnicoId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Solo el Jefe de TI');
  });

  it('debe generar el reporte correctamente para el Jefe de TI', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteSatisfaccionAction({}, mockJefeId);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.evaluaciones).toHaveLength(3);
    expect(result.data!.resumen.total_evaluaciones).toBe(3);
  });

  it('debe calcular la calificación promedio correctamente', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteSatisfaccionAction({}, mockJefeId);

    // (5 + 4 + 2) / 3 = 3.666... -> 3.7
    expect(result.data!.resumen.promedio_calificacion).toBe(3.7);
  });

  it('debe calcular el porcentaje de satisfacción correctamente', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteSatisfaccionAction({}, mockJefeId);

    // Satisfechos (>= 4 estrellas): 2 evaluaciones de 3 (ev-01 y ev-02).
    // (2 / 3) * 100 = 66.666 -> 67%
    expect(result.data!.resumen.porcentaje_satisfaccion).toBe(67);
  });

  it('debe calcular correctamente la distribución de calificaciones', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeId,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteSatisfaccionAction({}, mockJefeId);
    const dist = result.data!.resumen.distribucion;

    expect(dist.cinco_estrellas).toBe(1);
    expect(dist.cuatro_estrellas).toBe(1);
    expect(dist.tres_estrellas).toBe(0);
    expect(dist.dos_estrellas).toBe(1);
    expect(dist.una_estrella).toBe(0);
  });

  it('debe rechazar filtros con formatos inválidos', async () => {
    const result = await generarReporteSatisfaccionAction(
      { fechaInicio: 99999 as any },
      mockJefeId
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
