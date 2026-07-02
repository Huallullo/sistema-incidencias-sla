'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaHeadphones, FaLock, FaSpinner } from 'react-icons/fa';
import { UsuariosService } from '@/services/UsuariosService';

export const dynamic = 'force-dynamic';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  useEffect(() => {
    async function checkTokenValidity() {
      if (!token) {
        setErrorMsg('El enlace de recuperación es inválido o ha expirado. Por favor, solicite uno nuevo.');
        setCheckingSession(false);
        return;
      }

      try {
        const result = await UsuariosService.verifyPasswordResetToken(token);
        if (!result.success) {
          setErrorMsg(result.error || 'El enlace de recuperación es inválido o ha expirado.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Error al validar el enlace de recuperación');
      } finally {
        setCheckingSession(false);
      }
    }

    checkTokenValidity();
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const result = await UsuariosService.resetPasswordWithToken(token, password);

      if (result.success) {
        setSuccessMsg('Su contraseña ha sido restablecida con éxito. Redirigiendo al inicio de sesión...');
        
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setErrorMsg(result.error || 'No se pudo restablecer la contraseña. El enlace podría haber expirado.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Ocurrió un error inesperado al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#dbeafe] px-4">
        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center gap-3">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
          <span className="text-slate-500 font-medium">Validando token de acceso...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#dbeafe] px-4">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-[#1e293b] tracking-tight">
          <div className="flex justify-center mb-2">
            <FaHeadphones className="text-5xl text-blue-600" />
          </div>
          Nueva Contraseña
        </h1>
        <p className="text-center text-[#64748b] text-sm mt-2">
          Establezca su nueva contraseña de acceso.
        </p>

        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              Nueva Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-300">
                <FaLock size={14} />
              </span>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!errorMsg || loading}
                className="w-full pl-10 pr-4 py-3 border border-[#d1d5db] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent text-base text-[#1e293b] placeholder-[#9ca3af] bg-white disabled:bg-slate-50 disabled:text-slate-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-300">
                <FaLock size={14} />
              </span>
              <input
                type="password"
                placeholder="Repita la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!!errorMsg || loading}
                className="w-full pl-10 pr-4 py-3 border border-[#d1d5db] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent text-base text-[#1e293b] placeholder-[#9ca3af] bg-white disabled:bg-slate-50 disabled:text-slate-400"
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!errorMsg}
            className="w-full bg-[#2563eb] text-white py-3 rounded-xl hover:bg-[#1d4ed8] transition text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <FaSpinner className="animate-spin" />}
            {loading ? 'Guardando...' : 'Establecer contraseña'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-[#2563eb] hover:underline font-medium bg-transparent border-none cursor-pointer"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#dbeafe] px-4">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
