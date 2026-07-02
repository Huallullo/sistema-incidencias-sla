import { proxy } from '../src/proxy';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Mockear @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

// Mockear NextServer y NextResponse
jest.mock('next/server', () => {
  return {
    NextResponse: {
      next: jest.fn().mockImplementation((options) => ({
        type: 'next',
        ...options,
        cookies: {
          set: jest.fn(),
        },
      })),
      redirect: jest.fn().mockImplementation((url) => ({
        type: 'redirect',
        url: url.toString(),
      })),
    },
  };
});

describe('Middleware de Seguridad y Control de Acceso', () => {
  const mockGetUser = jest.fn();
  const mockGetSession = jest.fn();
  const mockSingle = jest.fn();
  const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

  const mockSupabaseClient = {
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
    from: mockFrom,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Configurar variables de entorno ficticias
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-supabase-url.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key';
  });

  const createMockRequest = (urlPath: string): NextRequest => {
    const url = new URL(`http://localhost${urlPath}`);
    return {
      url: url.toString(),
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    } as unknown as NextRequest;
  };

  it('debe redirigir a /login si no hay una sesión activa', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createMockRequest('/admin/usuarios/nuevo');
    const response = await proxy(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/login',
      })
    );
    expect(response).toEqual(
      expect.objectContaining({
        type: 'redirect',
        url: expect.stringContaining('/login'),
      })
    );
  });

  it('debe redirigir a /dashboard si la sesión es activa pero el rol no es jefe_ti', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-id-tecnico', email: 'tecnico@test.com' },
      },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: { id_rol: 2, roles: { nombre_rol: 'tecnico' } },
      error: null,
    });

    const request = createMockRequest('/admin/usuarios/nuevo');
    const response = await proxy(request);

    expect(mockFrom).toHaveBeenCalledWith('perfiles');
    expect(mockEq).toHaveBeenCalledWith('id_auth_supabase', 'user-id-tecnico');
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/dashboard',
      })
    );
    expect(response).toEqual(
      expect.objectContaining({
        type: 'redirect',
        url: expect.stringContaining('/dashboard'),
      })
    );
  });

  it('debe permitir acceso y llamar a NextResponse.next() si la sesión es activa y el rol es jefe_ti', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-id-jefe', email: 'jefe@test.com' },
      },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: { id_rol: 1, roles: { nombre_rol: 'jefe_ti' } },
      error: null,
    });

    const request = createMockRequest('/admin/usuarios/nuevo');
    const response = await proxy(request);

    expect(mockFrom).toHaveBeenCalledWith('perfiles');
    expect(mockEq).toHaveBeenCalledWith('id_auth_supabase', 'user-id-jefe');
    expect(NextResponse.next).toHaveBeenCalled();
    expect(response).toEqual(
      expect.objectContaining({
        type: 'next',
      })
    );
  });
});
