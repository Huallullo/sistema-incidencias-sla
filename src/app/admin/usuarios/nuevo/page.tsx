'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';

export default function RegisterUserPage() {
  // ============ ESTADOS DEL FORMULARIO ============
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('usuario');
  const [telefono, setTelefono] = useState('');
  const [cargo, setCargo] = useState('');

  // ============ ESTADOS DE UI ============
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // ============ MANEJO DEL ENVÍO ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // --- Validación de campos obligatorios ---
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !rol) {
      setError('❌ Los campos Nombre, Apellido, Correo y Rol son obligatorios.');
      setLoading(false);
      return;
    }

    // --- Validación básica de email ---
    if (!email.includes('@') || !email.includes('.')) {
      setError('❌ Ingresa un correo electrónico válido.');
      setLoading(false);
      return;
    }

    try {
      // --- Obtener el token de sesión (para autenticar la petición) ---
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('No tienes sesión activa. Inicia sesión nuevamente.');
      }

      // --- Llamar a la Edge Function para crear el usuario ---
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email,
            password: 'Temporal123!', // Contraseña temporal, el usuario la cambiará al entrar
            nombre_completo: `${nombre.trim()} ${apellido.trim()}`,
            rol,
            telefono: telefono.trim() || null,
            cargo: cargo.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar usuario');
      }

      // --- Éxito ---
      setSuccess(true);
      setError('');
      // Limpiar formulario (opcional)
      setNombre('');
      setApellido('');
      setEmail('');
      setTelefono('');
      setCargo('');

      // Redirigir al listado de usuarios después de 2 segundos
      setTimeout(() => {
        router.push('/admin/usuarios');
      }, 2000);
    } catch (err: unknown) {
  console.error('Error en registro:', err);
  const errorMessage = err instanceof Error ? err.message : 'Error al procesar la solicitud';
  setError(`❌ ${errorMessage}`);
}finally {
      setLoading(false);
    }
  };

  // ============ RENDERIZADO DEL FORMULARIO ============
  return (
    <div className="min-h-screen bg-[#f3f4f6] p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-2xl font-bold text-[#1e293b] mb-6">
          Registrar nuevo usuario
        </h1>

        {/* Mensaje de éxito */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span>Usuario registrado correctamente. Se ha enviado un correo de bienvenida.</span>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ============ FORMULARIO ============ */}
        <form onSubmit={handleSubmit}>
          {/* Fila 1: Nombre y Apellido */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej. Pérez"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              />
            </div>
          </div>

          {/* Fila 2: Correo electrónico */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo corporativo <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.pe"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
          </div>

          {/* Fila 3: Rol funcional */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="usuario">Usuario</option>
              <option value="tecnico">Técnico</option>
              <option value="jefe_ti">Jefe TI</option>
            </select>
          </div>

          {/* Fila 4: Teléfono interno (opcional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono interno
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ext. 000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Fila 5: Cargo (opcional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargo
            </label>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ej. Analista"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* ============ BOTONES ============ */}
          <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => router.push('/admin/usuarios')}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Registrando...
                </>
              ) : (
                'Registrar usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}