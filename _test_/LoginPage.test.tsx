import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../src/app/(auth)/login/page';
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
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('debe mostrar error si las credenciales son inválidas', async () => {
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      user: null,
      session: null,
      error: 'Credenciales inválidas',
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Credenciales inválidas/i)).toBeInTheDocument();
    });
  });

  it('debe mostrar error si la cuenta está bloqueada', async () => {
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      user: null,
      session: null,
      error: 'LOCK:900',
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Cuenta bloqueada. Intente nuevamente en 15:00/i)).toBeInTheDocument();
    });
  });

  it('debe validar los campos con Zod antes de enviar al backend', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    // Correo con formato correcto, pero contraseña muy corta (falla Zod, pasa navegador)
    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, '123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/La contraseña debe tener al menos 6 caracteres/i)).toBeInTheDocument();
    });
    expect(AuthService.signIn).not.toHaveBeenCalled();
  });

  it('debe redirigir a recuperar contraseña cuando se hace click en el enlace', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const recoveryButton = screen.getByText(/¿Olvidaste tu contraseña?/i);
    await user.click(recoveryButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/recuperar');
  });

  it('debe manejar excepciones si AuthService.signIn arroja un error', async () => {
    (AuthService.signIn as jest.Mock).mockRejectedValue(new Error('Auth service crash'));

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Auth service crash/i)).toBeInTheDocument();
    });
  });

  it('debe manejar excepciones no tipadas si AuthService.signIn arroja un error desconocido', async () => {
    (AuthService.signIn as jest.Mock).mockRejectedValue('String error');

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error al iniciar sesión. Intente más tarde./i)).toBeInTheDocument();
    });
  });

  it('debe decrementar el temporizador de bloqueo y reactivar el formulario al llegar a cero', async () => {
    jest.useFakeTimers();
    (AuthService.signIn as jest.Mock).mockResolvedValue({
      user: null,
      session: null,
      error: 'LOCK:3',
    });

    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('Correo electrónico');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    // Para simular el submit sin userEvent (ya que userEvent no funciona bien con fake timers de jest)
    const form = emailInput.closest('form');
    expect(form).not.toBeNull();

    await userEvent.type(emailInput, 'test@test.com', { delay: null });
    await userEvent.type(passwordInput, 'wrongpassword', { delay: null });
    
    // Ejecutar submit manualmente para gatillar handleLogin
    act(() => {
      submitButton.click();
    });

    await waitFor(() => {
      expect(screen.getByText(/Cuenta bloqueada. Intente nuevamente en 00:03/i)).toBeInTheDocument();
    });

    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();

    // Avanzar 1 segundo
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => {
      expect(screen.getByText(/Cuenta bloqueada. Intente nuevamente en 00:02/i)).toBeInTheDocument();
    });

    // Avanzar 2 segundos más (llega a 0 y se limpia)
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() => {
      expect(screen.queryByText(/Cuenta bloqueada/i)).not.toBeInTheDocument();
    });

    expect(emailInput).not.toBeDisabled();
    expect(passwordInput).not.toBeDisabled(); // rehabilitado
    expect(submitButton).not.toBeDisabled();

    jest.useRealTimers();
  });
});
