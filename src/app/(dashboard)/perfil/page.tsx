'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaSpinner,
  FaSearch,
  FaBell,
} from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { UsuariosService } from '@/services/UsuariosService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import NotificacionesCampana from '@/components/NotificacionesCampana';

export const dynamic = 'force-dynamic';

export default function PerfilPage() {
  const router = useRouter();

  // Estados de sesión
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);

  // Estados de carga e interfaz
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Formularios
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefonoInterno, setTelefonoInterno] = useState('');
  const [cargo, setCargo] = useState('');
  const [correo, setCorreo] = useState('');
  const [area, setArea] = useState('Tecnología de la Información'); // Default/Figma mock

  // Formulario Password
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');

  // Notificaciones
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cargar datos de la sesión y el perfil actual
  useEffect(() => {
    async function loadData() {
      try {
        const session = await AuthService.getSession();
        if (!session?.user?.id) {
          router.push('/login');
          return;
        }

        const profile = await PerfilesRepository.getProfileByUserId(session.user.id);
        if (!profile) {
          router.push('/login');
          return;
        }

        setCurrentUser(profile as PerfilUsuario);
        setNombreCompleto(profile.nombre_completo || '');
        setTelefonoInterno(profile.telefono_interno || 'Ext. 201'); // Fallback Figma
        setCargo(profile.cargo || 'Jefe TI');
        setCorreo(profile.correo || session.user.email || 'ana.torres@empresa.pe');
        
        // Asignar área si tiene, o fallback a Figma mockup
        if (profile.id_rol === 1) {
          setArea('Tecnología de la Información');
        } else {
          setArea('Soporte Técnico');
        }
      } catch (err) {
        console.error('Error cargando perfil:', err);
        setErrorMsg('Error al cargar la información del perfil');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nombreCompleto.trim()) {
      setErrorMsg('El nombre completo es requerido');
      return;
    }

    if (!currentUser?.user_id) return;

    setSavingProfile(true);
    try {
      const response = await UsuariosService.updateProfileData(currentUser.user_id, {
        nombre_completo: nombreCompleto.trim(),
        telefono_interno: telefonoInterno.trim(),
        cargo: cargo.trim(),
      });

      if (response.success && response.data) {
        setSuccessMsg('Información de perfil actualizada con éxito');
        setCurrentUser(response.data);
      } else {
        setErrorMsg(response.error || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setErrorMsg('Ocurrió un error inesperado al guardar los cambios');
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!passwordActual) {
      setErrorMsg('Debe introducir su contraseña actual');
      return;
    }

    if (passwordNueva.length < 8) {
      setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (passwordNueva !== passwordConfirmar) {
      setErrorMsg('La confirmación de la contraseña no coincide');
      return;
    }

    setUpdatingPassword(true);
    try {
      if (!currentUser?.correo) {
        setErrorMsg('No se pudo determinar el correo del usuario actual');
        setUpdatingPassword(false);
        return;
      }

      const reauth = await AuthService.signIn({
        email: currentUser.correo,
        password: passwordActual,
      });

      if (reauth.error || !reauth.user) {
        setErrorMsg('La contraseña actual es incorrecta');
        setUpdatingPassword(false);
        return;
      }

      const result = await UsuariosService.updateUserPassword(passwordNueva);

      if (result.success) {
        setSuccessMsg('Contraseña actualizada con éxito');
        setPasswordActual('');
        setPasswordNueva('');
        setPasswordConfirmar('');
      } else {
        setErrorMsg(result.error || 'Fallo al actualizar la contraseña');
      }
    } catch (err) {
      setErrorMsg('Ocurrió un error inesperado al actualizar la contraseña');
      console.error(err);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getRolLabel = (rol?: string) => {
    switch (rol) {
      case 'jefe_ti':
        return 'Jefe TI';
      case 'tecnico':
        return 'Técnico';
      case 'usuario':
        return 'Usuario';
      default:
        return 'Usuario';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center justify-center gap-3">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
          <span className="text-slate-500 font-medium">Cargando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#e5e7eb]/40">
      {/* Cabecera superior interna con Buscador y Notificaciones */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Mi perfil
        </h1>
        
        <div className="flex items-center gap-4">
          {/* Buscador de cabecera */}
          <div className="relative w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Buscar tickets, usuarios..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition focus:bg-white placeholder-slate-400"
            />
          </div>

          {/* Botón Notificaciones */}
          {currentUser && (
            <NotificacionesCampana authUserId={currentUser.id_auth_supabase ?? ''} />
          )}
        </div>
      </header>

      {/* Cuerpo del Contenido (Figma Single Column Vertical Stack) */}
      <div className="flex-1 p-8 overflow-y-auto max-w-[800px] w-full mx-auto space-y-6">
        
        {/* Banner de Errores y Éxitos */}
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200 transition-all shadow-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 transition-all shadow-xs">
            {successMsg}
          </div>
        )}

        {/* Tarjeta 1: Datos Personales (Con Avatar arriba integrado) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          
          {/* Fila de Perfil Superior (Avatar + Nombre + Rol) */}
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
              {currentUser ? getInitials(currentUser.nombre_completo) : 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">
                {currentUser?.nombre_completo}
              </h2>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase tracking-wide">
                {getRolLabel(currentUser?.rol)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Fila 1: Nombre Completo y Área */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-slate-700 bg-white placeholder-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Área/Departamento
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-slate-700 bg-white placeholder-slate-300"
                />
              </div>
            </div>

            {/* Fila 2: Correo Electrónico (Full Width) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={correo}
                disabled
                className="w-full px-4 py-2.5 border border-slate-100 rounded-xl text-xs text-slate-400 bg-slate-50 cursor-not-allowed"
              />
            </div>

            {/* Fila 3: Teléfono interno y Cargo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Teléfono interno
                </label>
                <input
                  type="text"
                  value={telefonoInterno}
                  onChange={(e) => setTelefonoInterno(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-slate-700 bg-white placeholder-slate-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Cargo
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-slate-700 bg-white placeholder-slate-300"
                />
              </div>
            </div>

            {/* Botón Guardar cambios */}
            <div className="flex justify-end pt-4 border-t border-slate-50">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] duration-100 shadow-sm shadow-blue-100"
              >
                {savingProfile && <FaSpinner className="animate-spin" />}
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>

        {/* Tarjeta 2: Cambiar contraseña */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-4 mb-6">
            Cambiar contraseña
          </h3>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {/* Fila 1: Contraseña actual */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Contraseña actual
              </label>
              <input
                type="password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-slate-700 bg-white placeholder-slate-300"
                placeholder="••••••••••••"
                required
              />
            </div>

            {/* Fila 2: Nueva contraseña y Confirmación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-slate-700 bg-white placeholder-slate-300"
                  placeholder="••••••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={passwordConfirmar}
                  onChange={(e) => setPasswordConfirmar(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-slate-700 bg-white placeholder-slate-300"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
              <button
                type="button"
                onClick={() => {
                  setPasswordActual('');
                  setPasswordNueva('');
                  setPasswordConfirmar('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition text-xs font-bold active:scale-[0.98] duration-100 bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updatingPassword}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] duration-100 shadow-sm shadow-blue-100"
              >
                {updatingPassword && <FaSpinner className="animate-spin" />}
                {updatingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
