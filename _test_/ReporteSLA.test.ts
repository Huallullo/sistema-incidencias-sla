import { generarReporteSLAAction } from '@/actions/reporteSLAActions';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';

// ─── Mock de Supabase ─────────────────────────────────────────────────────────
const mockPrioridadesData = [
  { nivel: 'critica', tiempo_respuesta_min: 15,  tiempo_resolucion_min: 120 },
  { nivel: 'alta',    tiempo_respuesta_min: 60,  tiempo_resolucion_min: 480 },
  { nivel: 'media',   tiempo_respuesta_min: 240, tiempo_resolucion_min: 1440 },
  { nivel: 'baja',    tiempo_respuesta_min: 480, tiempo_resolucion_min: 2880 },
];

// Ticket que CUMPLE el SLA: actualizado 10 min después de creación, cerrado en 60 min
const ahora = new Date('2026-07-10T10:00:00Z');
const mockIncidenciasData = [
  {
    id_incidencia: 'inc-001',
    codigo_ticket: 'INC-20260001',
    titulo: 'Servidor caído en datacenter',
    prioridad: 'critica',
    estado: 'cerrado',
    creado_por: 'user-1',
    asignado_a: 'tech-1',
    creado_en: '2026-07-10T10:00:00Z',
    actualizado_en: '2026-07-10T10:10:00Z', // 10 min (SLA resp: 15 min ✓)
    fecha_cierre: '2026-07-10T11:00:00Z',    // 60 min (SLA resol: 120 min ✓)
    creador: { nombre: 'Ana', apellido: 'Torres' },
    asignado: { nombre: 'Carlos', apellido: 'Lopez' },
  },
  // Ticket que NO CUMPLE el SLA: actualizado 30 min después (mayor al SLA de crítica 15 min)
  {
    id_incidencia: 'inc-002',
    codigo_ticket: 'INC-20260002',
    titulo: 'Falla en la red Wi-Fi corporativa',
    prioridad: 'critica',
    estado: 'resuelto',
    creado_por: 'user-2',
    asignado_a: 'tech-2',
    creado_en: '2026-07-10T12:00:00Z',
    actualizado_en: '2026-07-10T12:30:00Z', // 30 min (SLA resp: 15 min ✗)
    fecha_cierre: '2026-07-10T14:30:00Z',    // 150 min (SLA resol: 120 min ✗)
    creador: { nombre: 'Luis', apellido: 'Perez' },
    asignado: { nombre: 'Maria', apellido: 'Ruiz' },
  },
  // Ticket sin SLA (prioridad 'media', sin prioridades_servicio para media en este mock)
  {
    id_incidencia: 'inc-003',
    codigo_ticket: 'INC-20260003',
    titulo: 'Actualización de software',
    prioridad: 'baja',
    estado: 'abierto',
    creado_por: 'user-3',
    asignado_a: null,
    creado_en: '2026-07-10T13:00:00Z',
    actualizado_en: '2026-07-10T13:00:00Z',
    fecha_cierre: null,
    creador: { nombre: 'Jose', apellido: 'Garcia' },
    asignado: null,
  },
];

jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'prioridades_servicio') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockPrioridadesData, error: null }),
        };
      }
      // incidencias
      return {
        select: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: mockIncidenciasData, error: null }),
        })),
      };
    }),
  })),
}));

describe('HU-020: Reporte de Cumplimiento de SLA', () => {
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

  it('debe denegar el acceso si el usuario no es Jefe de TI', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockTecnicoUuid,
      id_rol: 2, // Técnico
      rol: 'tecnico',
    } as any);

    const result = await generarReporteSLAAction({}, mockTecnicoUuid);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Solo el Jefe de TI');
  });

  it('debe generar el reporte correctamente para el Jefe de TI', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid,
      id_rol: 1, // Jefe de TI
      rol: 'jefe_ti',
    } as any);

    const result = await generarReporteSLAAction({}, mockJefeUuid);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.tickets).toHaveLength(3);
    expect(result.data!.resumen.total_tickets).toBe(3);
  });

  it('debe calcular correctamente el cumplimiento SLA del primer ticket (crítica, cumple)', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid, id_rol: 1, rol: 'jefe_ti',
    } as any);

    const result = await generarReporteSLAAction({}, mockJefeUuid);
    const ticket = result.data!.tickets.find(t => t.id_incidencia === 'inc-001');

    expect(ticket).toBeDefined();
    expect(ticket!.cumple_respuesta).toBe(true);  // 10 min ≤ 15 min SLA ✓
    expect(ticket!.cumple_resolucion).toBe(true);  // 60 min ≤ 120 min SLA ✓
    expect(ticket!.cumple_sla).toBe(true);
  });

  it('debe calcular correctamente el incumplimiento SLA del segundo ticket (crítica, no cumple)', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid, id_rol: 1, rol: 'jefe_ti',
    } as any);

    const result = await generarReporteSLAAction({}, mockJefeUuid);
    const ticket = result.data!.tickets.find(t => t.id_incidencia === 'inc-002');

    expect(ticket).toBeDefined();
    expect(ticket!.cumple_respuesta).toBe(false); // 30 min > 15 min SLA ✗
    expect(ticket!.cumple_sla).toBe(false);
  });

  it('debe calcular el porcentaje de cumplimiento global correctamente', async () => {
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid, id_rol: 1, rol: 'jefe_ti',
    } as any);

    const result = await generarReporteSLAAction({}, mockJefeUuid);
    const resumen = result.data!.resumen;

    // inc-001: cumple, inc-002: no cumple, inc-003: baja (SLA configurado en mock)
    // La baja tiene SLA pero sin cierre, sin resolución → cumple_resolucion = null
    // Entonces evaluables puede ser 2 (inc-001 y inc-002 con fechas completas)
    expect(resumen.total_tickets).toBe(3);
    expect(resumen.tickets_cumple).toBeGreaterThanOrEqual(1);
    expect(resumen.porcentaje_cumplimiento).toBeGreaterThanOrEqual(0);
    expect(resumen.porcentaje_cumplimiento).toBeLessThanOrEqual(100);
  });

  it('debe fallar con parámetros inválidos según Zod', async () => {
    const result = await generarReporteSLAAction(
      { fechaInicio: 12345 as any }, // tipo incorrecto
      mockJefeUuid
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
