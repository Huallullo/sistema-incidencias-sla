'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaHeadphones } from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { loginSchema } from '@/types/auth';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Formatear segundos en [mm:ss]
  const formatTime = (seconds: number) => {
    const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
    const ss = (seconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Manejar el temporizador dinámico del bloqueo de la cuenta
  useEffect(() => {
    if (lockCountdown === null) return;
    if (lockCountdown <= 0) {
      setLockCountdown(null);
      setError('');
      return;
    }

    const interval = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setError('');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockCountdown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLockCountdown(null);
    setLoading(true);

    // 1. Validar campos en tiempo real usando Zod
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Credenciales inválidas';
      setError(firstError);
      setLoading(false);
      return;
    }

    try {
      // 2. Intentar iniciar sesión
      const response = await AuthService.signIn({ email, password });

      // 3. Manejo de errores devueltos por el backend
      if (response.error || !response.user) {
        const errorMsg = response.error || 'Error al iniciar sesión';

        if (errorMsg.startsWith('LOCK:')) {
          const seconds = parseInt(errorMsg.split(':')[1], 10);
          setLockCountdown(seconds);
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        return;
      }

      // 4. Redirigir al panel de control principal
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al iniciar sesión. Intente más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  const displayError = lockCountdown !== null && lockCountdown > 0
    ? `Cuenta bloqueada. Intente nuevamente en ${formatTime(lockCountdown)}`
    : error;

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

        <form onSubmit={handleLogin} className="mt-8">
          <div className="mb-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[#d1d5db] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent text-base text-[#1e293b] placeholder-[#9ca3af]"
              disabled={loading || (lockCountdown !== null && lockCountdown > 0)}
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
              disabled={loading || (lockCountdown !== null && lockCountdown > 0)}
              required
            />
          </div>

          {displayError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (lockCountdown !== null && lockCountdown > 0)}
            className="w-full bg-[#2563eb] text-white py-3 rounded-xl hover:bg-[#1d4ed8] transition text-base font-medium disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => router.push('/recuperar')}
            className="text-sm text-[#2563eb] hover:underline bg-transparent border-none cursor-pointer"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}