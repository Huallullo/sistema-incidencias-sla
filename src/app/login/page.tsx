'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaHeadphones } from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { UserRole } from '@/types/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('jefe_ti');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const roleLabels: Record<string, string> = {
    jefe_ti: 'Jefe TI',
    tecnico: 'Técnico',
    usuario: 'Usuario',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Intentar iniciar sesión
      const response = await AuthService.signIn({ email, password });

      // 2. Si hay error de autenticación (credenciales inválidas)
      if (response.error || !response.user) {
        // Llamar al servicio de manejo de intentos fallidos
        const failResult = await AuthService.handleFailedLogin(email);

        if (failResult?.blocked === true) {
          const blockedUntil = new Date(failResult.blocked_until!);
          const minutesLeft = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
          setError(`Cuenta bloqueada por 15 minutos. Reintenta en ${minutesLeft} minuto(s).`);
        } else {
          setError(`Credenciales incorrectas. ${failResult?.message || 'Intento fallido'}`);
        }
        setLoading(false);
        return;
      }

      // 3. Login exitoso: validar rol
      if (!response.user.role) {
        setError('No se pudo obtener el rol de usuario');
        setLoading(false);
        return;
      }

      // 4. Validación de roles seleccionados
      if (response.user.role !== role) {
        const rolSeleccionado = roleLabels[role as UserRole];
        const rolReal = roleLabels[response.user.role];
        setError(
          `El rol seleccionado (${rolSeleccionado}) no coincide con el rol de la cuenta (${rolReal}).`
        );
        setLoading(false);
        return;
      }

      // 5. Resetear contador de intentos (porque logró entrar)
      await AuthService.resetFailedLoginAttempts(email);

      // 6. Redirigir según rol
      const dashboardRoutes: Record<UserRole, string> = {
        jefe_ti: '/dashboard/jefe',
        tecnico: '/dashboard/tecnico',
        usuario: '/dashboard/usuario',
      };

      const route = dashboardRoutes[response.user.role];
      router.push(route);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#dbeafe] px-4">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-[#1e293b] tracking-tight">
          <div className="flex justify-center mb-2">
            <FaHeadphones className="text-5xl text-blue-600" />
          </div>
          Help Desk TI
        </h1>
        <p className="text-center text-[#64748b] text-base mt-1">
          Inicia sesión para continuar
        </p>

        <div className="flex justify-center gap-3 mt-6">
          {Object.entries(roleLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${
                role === key
                  ? 'bg-[#2563eb] text-white shadow-sm'
                  : 'bg-[#e5e7eb] text-[#4b5563] hover:bg-[#d1d5db]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="mt-6">
          <div className="mb-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[#d1d5db] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent text-base text-[#1e293b] placeholder-[#9ca3af]"
              required
            />
          </div>

          <div className="mb-4">
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-[#d1d5db] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent text-base text-[#1e293b] placeholder-[#9ca3af]"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563eb] text-white py-3 rounded-xl hover:bg-[#1d4ed8] transition text-base font-medium disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <a href="#" className="text-sm text-[#2563eb] hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </div>
  );
}