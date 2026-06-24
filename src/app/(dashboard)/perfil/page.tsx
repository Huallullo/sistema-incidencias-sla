'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaHeadphones,
  FaBell,
  FaSignOutAlt,
  FaSpinner,
  FaLock,
  FaUser,
  FaPhone,
  FaBriefcase,
  FaEnvelope,
} from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { UsuariosService } from '@/services/UsuariosService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';

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
        setTelefonoInterno(profile.telefono_interno || '');
        setCargo(profile.cargo || '');
        setCorreo(profile.correo || session.user.email || '');
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
      // 1. Re-autenticar de forma segura usando las credenciales del usuario actual
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

      // 2. Ejecutar la actualización de la contraseña
      const result = await UsuariosService.updateUserPassword(passwordNueva);

      if (result.success) {
        setSuccessMsg('Contraseña actualizada con éxito');
        // Limpiar formulario de clave
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

  // Helper para generar iniciales del avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Mapeo visual de roles
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
    <>
      {/* Header Superior */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Configuración de Cuenta
        </h1>
        <div className="flex items-center gap-3">
          {/* Botón Notificaciones */}
          <button className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 relative transition">
            <FaBell />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-blue-500"></span>
          </button>
        </div>
      </header>

      {/* Cuerpo del Contenido - Dos Tarjetas */}
      <div className="flex-1 p-8 overflow-y-auto max-w-5xl w-full mx-auto space-y-6">
        
        {/* Banners de Notificación */}
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200 transition-all">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 transition-all">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tarjeta Visual del Perfil */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center justify-center h-fit">
            <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-md shadow-blue-100">
              {currentUser ? getInitials(currentUser.nombre_completo) : 'U'}
            </div>
            <h2 className="text-xl font-bold text-slate-800 leading-tight">
              {currentUser?.nombre_completo}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{currentUser?.correo}</p>
            
            <div className="mt-4 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 uppercase">
              {getRolLabel(currentUser?.rol)}
            </div>
          </div>

          {/* Formularios de Configuración */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Tarjeta: Datos Personales */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FaUser size={14} />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Datos Personales</h3>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 bg-white placeholder-slate-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                      Teléfono Interno
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-300">
                        <FaPhone size={12} />
                      </span>
                      <input
                        type="text"
                        value={telefonoInterno}
                        onChange={(e) => setTelefonoInterno(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 bg-white placeholder-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                      Cargo
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-300">
                        <FaBriefcase size={12} />
                      </span>
                      <input
                        type="text"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 bg-white placeholder-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                      Correo Electrónico (Solo Lectura)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-300">
                        <FaEnvelope size={12} />
                      </span>
                      <input
                        type="email"
                        value={correo}
                        disabled
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-100 rounded-xl text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] duration-100 shadow-sm shadow-blue-100"
                  >
                    {savingProfile && <FaSpinner className="animate-spin" />}
                    {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>

            {/* Tarjeta: Seguridad / Cambiar Contraseña */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FaLock size={12} />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Seguridad</h3>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 bg-white placeholder-slate-300"
                    placeholder="Ingrese contraseña actual para validar cambios"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      value={passwordNueva}
                      onChange={(e) => setPasswordNueva(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 bg-white placeholder-slate-300"
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      value={passwordConfirmar}
                      onChange={(e) => setPasswordConfirmar(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 bg-white placeholder-slate-300"
                      placeholder="Repita nueva clave"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordActual('');
                      setPasswordNueva('');
                      setPasswordConfirmar('');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition text-sm font-semibold active:scale-[0.98] duration-100 bg-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] duration-100 shadow-sm shadow-blue-100"
                  >
                    {updatingPassword && <FaSpinner className="animate-spin" />}
                    {updatingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>

      </div>
    </>
  );
}
