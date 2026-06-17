'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';
import { FaHeadphones } from 'react-icons/fa';
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);

      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('user_id', data.user.id)
        .single();

      if (perfilError) throw new Error(perfilError.message);

      if (perfil.rol === 'jefe_ti') router.push('/dashboard/jefe');
      else if (perfil.rol === 'tecnico') router.push('/dashboard/tecnico');
      else router.push('/dashboard/usuario');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg p-8">
        {/* Título y subtítulo */}
        <h1 className="text-3xl font-bold text-center text-[#1e293b] tracking-tight">
          <div className="flex justify-center mb-2">
            <FaHeadphones className="text-5xl text-blue-600" />
           </div>
          Help Desk TI
        </h1>
        <p className="text-center text-[#64748b] text-base mt-1">
          Inicia sesión para continuar
        </p>

        {/* Selector de rol (píldoras) */}
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
          {/* Correo electrónico */}
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

          {/* Contraseña */}
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

          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Botón Iniciar sesión */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563eb] text-white py-3 rounded-xl hover:bg-[#1d4ed8] transition text-base font-medium disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Enlace ¿Olvidaste tu contraseña? */}
        <div className="mt-5 text-center">
          <a href="#" className="text-sm text-[#2563eb] hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </div>
  );
}