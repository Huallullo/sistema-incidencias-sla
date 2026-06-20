import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterUserPage from '../src/app/admin/usuarios/nuevo/page';
import { useRouter } from 'next/navigation';
import { UsuariosService } from '../src/services/UsuariosService';

// Mockear router de Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mockear el servicio de usuarios
jest.mock('../src/services/UsuariosService', () => ({
  UsuariosService: {
    registerUser: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
};

describe('RegisterUserPage (Formulario de Registro)', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
    mockRouter.push.mockClear();
  });

  it('debe renderizar el formulario correctamente', () => {
    render(<RegisterUserPage />);

    expect(screen.getByText('Registrar nuevo usuario')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nombre')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Apellido')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('usuario@empresa.pe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar usuario/i })).toBeInTheDocument();
  });

  it('debe mostrar error de validación si el correo no tiene formato válido', async () => {
    const user = userEvent.setup();
    render(<RegisterUserPage />);

    const nombreInput = screen.getByPlaceholderText('Nombre');
    const apellidoInput = screen.getByPlaceholderText('Apellido');
    const emailInput = screen.getByPlaceholderText('usuario@empresa.pe');
    const submitButton = screen.getByRole('button', { name: /Registrar usuario/i });

    await user.type(nombreInput, 'Ana');
    await user.type(apellidoInput, 'Gomez');
    await user.type(emailInput, 'ana@invalido'); // Formato no válido para el componente
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Ingresa un correo electrónico válido/i)).toBeInTheDocument();
    });
    expect(UsuariosService.registerUser).not.toHaveBeenCalled();
  });

  it('debe registrar el usuario correctamente y redirigir a /admin/usuarios', async () => {
    (UsuariosService.registerUser as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: { id: 'new-id' } },
    });

    const user = userEvent.setup();
    render(<RegisterUserPage />);

    const nombreInput = screen.getByPlaceholderText('Nombre');
    const apellidoInput = screen.getByPlaceholderText('Apellido');
    const emailInput = screen.getByPlaceholderText('usuario@empresa.pe');
    const submitButton = screen.getByRole('button', { name: /Registrar usuario/i });

    await user.type(nombreInput, 'Ana');
    await user.type(apellidoInput, 'Gomez');
    await user.type(emailInput, 'ana@empresa.pe');
    await user.click(submitButton);

    await waitFor(() => {
      expect(UsuariosService.registerUser).toHaveBeenCalledWith({
        email: 'ana@empresa.pe',
        nombre_completo: 'Ana Gomez',
        rol: 'usuario',
        area: null,
        telefono: null,
        cargo: null,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Usuario registrado correctamente/i)).toBeInTheDocument();
    });

    // Validar redirección tras el timeout de 2 segundos
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/usuarios');
    }, { timeout: 2500 });
  });

  it('debe mostrar mensaje de alerta en la UI si el correo ya está duplicado', async () => {
    (UsuariosService.registerUser as jest.Mock).mockResolvedValue({
      success: false,
      error: 'El correo electrónico ya está registrado en el sistema',
    });

    const user = userEvent.setup();
    render(<RegisterUserPage />);

    const nombreInput = screen.getByPlaceholderText('Nombre');
    const apellidoInput = screen.getByPlaceholderText('Apellido');
    const emailInput = screen.getByPlaceholderText('usuario@empresa.pe');
    const submitButton = screen.getByRole('button', { name: /Registrar usuario/i });

    await user.type(nombreInput, 'Jose');
    await user.type(apellidoInput, 'Perez');
    await user.type(emailInput, 'jose.perez@empresa.pe');
    await user.click(submitButton);

    await waitFor(() => {
      expect(UsuariosService.registerUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/El correo electrónico ya está registrado en el sistema/i)).toBeInTheDocument();
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
