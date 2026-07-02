'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsuariosService } from '@/services/UsuariosService';

import { registerUserSchema } from '@/types/auth';

export const dynamic = 'force-dynamic';

export default function RegisterUserPage() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('usuario');
  const [area, setArea] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargo, setCargo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const validation = registerUserSchema.safeParse({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim(),
      rol,
      area: area.trim() || null,
      telefono: telefono.trim() || null,
      cargo: cargo.trim() || null,
    });

    if (!validation.success) {
      const firstError = validation.error?.issues?.[0]?.message || 'Datos de formulario inválidos';
      setError(` ${firstError}`);
      setLoading(false);
      return;
    }

    const validData = validation.data;

    try {
      const result = await UsuariosService.registerUser({
        email: validData.email,
        nombre_completo: `${validData.nombre} ${validData.apellido}`,
        rol: validData.rol,
        area: validData.area,
        telefono: validData.telefono,
        cargo: validData.cargo,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al registrar usuario');
      }

      setSuccess(true);
      setError('');
      setNombre('');
      setApellido('');
      setEmail('');
      setArea('');
      setTelefono('');
      setCargo('');

      setTimeout(() => {
        router.push('/admin/usuarios');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar la solicitud';
      setError(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header Superior */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Registrar nuevo usuario
        </h1>
      </header>

      {/* Cuerpo del Contenido */}
      <div className="flex-1 p-8 overflow-y-auto max-w-3xl w-full mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {success && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
              ✅ Usuario registrado correctamente. Se ha enviado un correo de bienvenida.
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

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
                  placeholder="Nombre"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500 bg-white"
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
                  placeholder="Apellido"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500 bg-white"
                  required
                />
              </div>
            </div>

            {/* Fila 2: Correo corporativo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo corporativo <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.pe"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500 bg-white"
                required
              />
            </div>

            {/* Fila 3: Rol y Área (lado a lado) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800"
                >
                  <option value="usuario">Usuario</option>
                  <option value="tecnico">Técnico</option>
                  <option value="jefe_ti">Jefe TI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área / Departamentos
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Seleccionar área"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500 bg-white"
                />
              </div>
            </div>

            {/* Fila 4: Teléfono interno y Cargo (lado a lado) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono interno
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ext. 009"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ej. Analista"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500 bg-white"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => router.push('/admin/usuarios')}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium bg-white"
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
    </>
  );
}