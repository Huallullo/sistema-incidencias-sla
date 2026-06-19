import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../src/app/login/page';
import { useRouter } from 'next/navigation';
import { AuthService } from '../src/services/AuthService';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../src/services/AuthService', () => ({
  AuthService: {
    signIn: jest.fn(),
    handleFailedLogin: jest.fn(),
    resetFailedLoginAttempts: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
};

describe('LoginPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
    mockRouter.push.mockClear();
  });

  it('debe mostrar el formulario de login', () => {
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      user: null,
      session: null,
    });

    render(<LoginPage />);
    
    expect(screen.getByPlaceholderText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
  });

  it('debe iniciar sesión y redirigir a dashboard/jefe si el rol es jefe_ti', async () => {
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      user: {
        id: '123',
        email: 'jefe@ti.com',
        role: 'jefe_ti',
      },
      session: {
        access_token: 'token',
      },
    });
    (AuthService.resetFailedLoginAttempts as jest.Mock).mockResolvedValue(true);

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(emailInput, 'jefe@ti.com');
    await user.type(passwordInput, '123456');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/jefe');
    });
  });

  it('debe mostrar error si las credenciales son inválidas', async () => {
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      user: null,
      session: null,
      error: 'Invalid credentials',
    });
    (AuthService.handleFailedLogin as jest.Mock).mockResolvedValue({
      blocked: false,
      attempts: 1,
      blocked_until: null,
      message: 'Intento fallido',
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'wrong');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Credenciales incorrectas/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar error si la cuenta está bloqueada', async () => {
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      user: null,
      session: null,
      error: 'Too many attempts',
    });
    (AuthService.handleFailedLogin as jest.Mock).mockResolvedValue({
      blocked: true,
      attempts: 3,
      blocked_until: new Date(Date.now() + 900000).toISOString(),
      message: 'Cuenta bloqueada',
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'wrong');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Cuenta bloqueada por 15 minutos/i)).toBeInTheDocument();
    });
  });
});
