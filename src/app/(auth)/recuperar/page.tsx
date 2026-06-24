'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaHeadphones, FaEnvelope, FaSpinner } from 'react-icons/fa';
import { UsuariosService } from '@/services/UsuariosService';

export const dynamic = 'force-dynamic';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!email.trim()) {
      setErrorMsg('El correo electrónico es requerido');
      setLoading(false);
      return;
    }

    try {
      // Redirigir al endpoint /reset-password
      const redirectTo = `${window.location.origin}/reset-password`;
      const result = await UsuariosService.sendPasswordReset(email.trim(), redirectTo);

      if (result.success) {
        setSuccessMsg(
          'Se ha enviado un enlace de restablecimiento de contraseña a su correo electrónico. Por favor, revise su bandeja de entrada.'
        );
        setEmail('');
      } else {
        setErrorMsg(result.error || 'No se pudo enviar el correo de recuperación');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Ocurrió un error inesperado al solicitar la recuperación');
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
          Restablecer Clave
        </h1>
        <p className="text-center text-[#64748b] text-sm mt-2">
          Ingrese su correo electrónico registrado para enviarle las instrucciones de recuperación.
        </p>

        <form onSubmit={handleRecuperar} className="mt-6 space-y-4">
          <div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-300">
                <FaEnvelope size={14} />
              </span>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#d1d5db] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent text-base text-[#1e293b] placeholder-[#9ca3af] bg-white"
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
            disabled={loading}
            className="w-full bg-[#2563eb] text-white py-3 rounded-xl hover:bg-[#1d4ed8] transition text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <FaSpinner className="animate-spin" />}
            {loading ? 'Enviando...' : 'Enviar enlace'}
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
