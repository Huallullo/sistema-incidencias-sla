import { cerrarTicketAuditadoAction } from '@/actions/incidenciasActions';
import { IncidenciasRepository } from '@/repositories/IncidenciasRepository';
import { ArticuloConocimientoRepository } from '@/repositories/ArticuloConocimientoRepository';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { HistorialEstadoTicketRepository } from '@/repositories/HistorialEstadoTicketRepository';

// Mock repositories and database helpers
jest.mock('@/lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

describe('HU-018: Pruebas de Auditoría y Cierre Definitivo de Tickets', () => {
  const mockJefeUuid = '11111111-1111-4111-8111-111111111111';
  const mockTecnicoUuid = '22222222-2222-4222-8222-222222222222';
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

  it('debe permitir al Jefe de TI cerrar el ticket con observaciones válidas si el ticket está resuelto y tiene solución en KB', async () => {
    // 1. Mock Perfil del usuario activo (Jefe de TI, id_rol = 1)
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid,
      id_rol: 1, // Jefe de TI
      nombre: 'Ana',
      apellido: 'Torres',
      rol: 'jefe_ti',
      id_auth_supabase: mockJefeUuid,
      correo: 'jefe@empresa.pe',
    } as any);

    // 2. Mock del ticket (en estado resuelto)
    const mockTicket = {
      id_incidencia: mockTicketUuid,
      codigo_ticket: 'TCK-500',
      titulo: 'Fallo de impresora',
      descripcion: 'No imprime a color',
      estado: 'resuelto',
      creado_por: 'user-1',
      creado_en: '2026-07-12T10:00:00Z',
      actualizado_en: '2026-07-12T11:00:00Z',
      creador: {
        nombre: 'Luis',
        apellido: 'Medina',
        id_auth_supabase: 'auth-user-1',
        correo: 'luis@empresa.pe',
      },
    };
    jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
      success: true,
      data: mockTicket as any,
    });

    // 3. Mock de búsqueda de KB (existe un artículo)
    jest.spyOn(ArticuloConocimientoRepository, 'findByIncidenciaId').mockResolvedValueOnce({
      id_articulo: 'kb-1',
      titulo: 'Solución a fallo de impresora',
      categoria: 'hardware',
      descripcion_problema: 'No imprime',
      solucion_pasos: 'Limpieza de cabezales',
      id_incidencia: mockTicketUuid,
      autor_id: mockTecnicoUuid,
      creado_en: '2026-07-12T11:30:00Z',
      actualizado_en: '2026-07-12T11:30:00Z',
    });

    // 4. Mock del repositorio closeTicket
    jest.spyOn(IncidenciasRepository, 'closeTicket').mockResolvedValueOnce({
      success: true,
      data: {
        ...mockTicket,
        estado: 'cerrado',
        fecha_cierre: '2026-07-12T12:00:00Z',
        cerrado_por: mockJefeUuid,
        observaciones_cierre: 'Auditoría conforme. Solución y pruebas correctas.',
      } as any,
    });

    // 5. Mock de historial de estados
    jest.spyOn(HistorialEstadoTicketRepository, 'insert').mockResolvedValueOnce({
      success: true,
      data: {} as any,
    });

    const result = await cerrarTicketAuditadoAction(
      mockTicketUuid,
      'Auditoría conforme. Solución y pruebas correctas.',
      mockJefeUuid
    );

    expect(result.success).toBe(true);
    expect(result.data?.estado).toBe('cerrado');
    expect(result.data?.observaciones_cierre).toContain('Auditoría conforme');
  });

  it('debe fallar si el usuario no tiene el rol de Jefe de TI', async () => {
    // Mock Perfil (Técnico, id_rol = 2)
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockTecnicoUuid,
      id_rol: 2, // Técnico
      rol: 'tecnico',
    } as any);

    const result = await cerrarTicketAuditadoAction(
      mockTicketUuid,
      'Cierre administrativo',
      mockTecnicoUuid
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Solo el Jefe de TI puede auditar y realizar el cierre definitivo');
  });

  it('debe fallar si el ticket no está en estado resuelto', async () => {
    // Mock Perfil (Jefe de TI)
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    // Mock Ticket en progreso
    jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
      success: true,
      data: {
        id_incidencia: mockTicketUuid,
        estado: 'en_progreso',
      } as any,
    });

    const result = await cerrarTicketAuditadoAction(
      mockTicketUuid,
      'Cierre administrativo',
      mockJefeUuid
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Solo se pueden auditar y cerrar incidencias en estado "resuelto"');
  });

  it('debe fallar si el ticket no tiene solución registrada en KB', async () => {
    // Mock Perfil (Jefe de TI)
    jest.spyOn(PerfilesRepository, 'getProfileByUserId').mockResolvedValueOnce({
      id_perfil: mockJefeUuid,
      id_rol: 1,
      rol: 'jefe_ti',
    } as any);

    // Mock Ticket resuelto
    jest.spyOn(IncidenciasRepository, 'getById').mockResolvedValueOnce({
      success: true,
      data: {
        id_incidencia: mockTicketUuid,
        estado: 'resuelto',
      } as any,
    });

    // Mock de búsqueda de KB (no existe)
    jest.spyOn(ArticuloConocimientoRepository, 'findByIncidenciaId').mockResolvedValueOnce(null);

    const result = await cerrarTicketAuditadoAction(
      mockTicketUuid,
      'Cierre administrativo',
      mockJefeUuid
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('no se ha registrado ninguna solución en la base de conocimientos');
  });

  it('debe fallar por validación Zod si las observaciones tienen menos de 10 caracteres', async () => {
    const result = await cerrarTicketAuditadoAction(
      mockTicketUuid,
      'Ok', // Menos de 10 caracteres
      mockJefeUuid
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Las observaciones de auditoría deben tener al menos 10 caracteres');
  });
});
