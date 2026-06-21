import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GestionUsuariosPage from '../src/app/admin/usuarios/page';
import { useRouter } from 'next/navigation';
import { AuthService } from '../src/services/AuthService';
import { UsuariosService } from '../src/services/UsuariosService';
import { PerfilesRepository } from '../src/repositories/PerfilesRepository';

// Mockear router de Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mockear AuthService
jest.mock('../src/services/AuthService', () => ({
  AuthService: {
    getSession: jest.fn(),
    signOut: jest.fn(),
  },
}));

// Mockear UsuariosService
jest.mock('../src/services/UsuariosService', () => ({
  UsuariosService: {
    getUsers: jest.fn(),
  },
}));

// Mockear PerfilesRepository
jest.mock('../src/repositories/PerfilesRepository', () => ({
  PerfilesRepository: {
    getProfileByUserId: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
};

const mockUsers = [
  {
    id: '1',
    nombre_completo: 'Alicia Torres',
    correo: 'alicia.torres@empresa.pe',
    rol: 'jefe_ti',
    estado: 'activo',
    cargo: 'TI',
  },
  {
    id: '2',
    nombre_completo: 'Luis Garcia',
    correo: 'luis.garcia@empresa.pe',
    rol: 'tecnico',
    estado: 'activo',
    cargo: 'TI',
  },
  {
    id: '3',
    nombre_completo: 'Pedro Vargas',
    correo: 'p.vargas@empresa.pe',
    rol: 'usuario',
    estado: 'inactivo',
    cargo: 'Contabilidad',
  },
];

describe('GestionUsuariosPage (Consulta de Usuarios)', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();

    // Mock session and profile of Jefe TI logged-in by default
    (AuthService.getSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin-id', email: 'ana.torres@empresa.pe' },
    });
    (PerfilesRepository.getProfileByUserId as jest.Mock).mockResolvedValue({
      user_id: 'admin-id',
      nombre_completo: 'Ana Torres',
      correo: 'ana.torres@empresa.pe',
      rol: 'jefe_ti',
    });

    // Mock getUsers service call to return user list
    (UsuariosService.getUsers as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUsers,
      count: 3,
    });
  });

  it('debe renderizar el layout base y mostrar cargando', async () => {
    render(<GestionUsuariosPage />);

    expect(screen.getByText('Gestión de usuarios')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar tickets, usuarios...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo/i })).toBeInTheDocument();

    // Esperar a que termine de cargar para evitar advertencias de act()
    await waitFor(() => {
      expect(screen.queryByText('Cargando usuarios...')).toBeNull();
    });
  });

  it('debe listar los usuarios devueltos por el servicio', async () => {
    render(<GestionUsuariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Alicia Torres')).toBeInTheDocument();
    });

    expect(screen.getByText('alicia.torres@empresa.pe')).toBeInTheDocument();
    expect(screen.getByText('Luis Garcia')).toBeInTheDocument();
    expect(screen.getByText('luis.garcia@empresa.pe')).toBeInTheDocument();
    expect(screen.getByText('Pedro Vargas')).toBeInTheDocument();
    expect(screen.getByText('p.vargas@empresa.pe')).toBeInTheDocument();

    // Badges de estado
    expect(screen.getAllByText('Activo')).toHaveLength(2);
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('debe filtrar por rol al hacer click en los tabs', async () => {
    const user = userEvent.setup();
    render(<GestionUsuariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Alicia Torres')).toBeInTheDocument();
    });

    const tecnicosTab = screen.getByTestId('tab-tecnicos');
    await user.click(tecnicosTab);

    await waitFor(() => {
      expect(UsuariosService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ rol: 'tecnico' })
      );
    });

    const usuariosTab = screen.getByTestId('tab-usuarios');
    await user.click(usuariosTab);

    await waitFor(() => {
      expect(UsuariosService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ rol: 'usuario' })
      );
    });
  });

  it('debe llamar al servicio de consulta con el debounce de busqueda', async () => {
    const user = userEvent.setup();
    render(<GestionUsuariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Alicia Torres')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar tickets, usuarios...');
    await user.type(searchInput, 'Luis');

    // Debounce de 500ms
    await waitFor(() => {
      expect(UsuariosService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Luis' })
      );
    }, { timeout: 1000 });
  });

  it('debe redirigir al login si no hay sesion activa', async () => {
    (AuthService.getSession as jest.Mock).mockResolvedValue(null);
    render(<GestionUsuariosPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  it('debe redirigir al dashboard de usuario si no es jefe_ti', async () => {
    (PerfilesRepository.getProfileByUserId as jest.Mock).mockResolvedValue({
      user_id: 'tech-id',
      nombre_completo: 'Luis Garcia',
      rol: 'tecnico',
    });

    render(<GestionUsuariosPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/usuario');
    });
  });
});
