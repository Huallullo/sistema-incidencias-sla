'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaHeadphones,
  FaSignOutAlt,
  FaSpinner,
} from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
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
      } catch (err) {
        console.error('Error cargando layout de sesión:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await AuthService.signOut();
    router.push('/login');
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

  const renderSidebarLinks = () => {
    const rol = currentUser?.rol || 'usuario';

    if (rol === 'jefe_ti') {
      return (
        <>
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Principal
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium flex items-center justify-between">
                  <span>Tickets</span>
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    5
                  </span>
                </button>
              </li>
            </ul>
          </div>
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Gestión
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => router.push('/admin/usuarios')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium"
                >
                  Usuarios
                </button>
              </li>
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium">
                  Equipos
                </button>
              </li>
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium">
                  Prioridades SLA
                </button>
              </li>
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium">
                  Disponibilidad
                </button>
              </li>
            </ul>
          </div>
        </>
      );
    } else if (rol === 'tecnico') {
      return (
        <>
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Panel Técnico
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium"
                >
                  Dashboard Técnico
                </button>
              </li>
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium flex items-center justify-between">
                  <span>Mis Incidencias</span>
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                </button>
              </li>
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium">
                  Disponibilidad
                </button>
              </li>
            </ul>
          </div>
        </>
      );
    } else {
      return (
        <>
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Panel Usuario
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium"
                >
                  Dashboard Usuario
                </button>
              </li>
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium flex items-center justify-between">
                  <span>Mis Reportes</span>
                </button>
              </li>
            </ul>
          </div>
        </>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center justify-center gap-3">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
          <span className="text-slate-500 font-medium">Cargando aplicación...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ── SIDEBAR LATERAL CENTRALIZADO ─────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo y Encabezado de Sidebar */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl">
                <FaHeadphones />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 tracking-tight text-base leading-tight">
                  Help Desk TI
                </h2>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
                  {getRolLabel(currentUser?.rol)}
                </span>
              </div>
            </div>
          </div>

          {/* Menú de Navegación Dinámico */}
          <nav className="p-4 space-y-6">
            {renderSidebarLinks()}

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Cuenta
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => router.push('/perfil')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium"
                  >
                    Mi perfil
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Sección de perfil inferior */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              {currentUser ? getInitials(currentUser.nombre_completo) : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-700 truncate leading-tight">
                {currentUser?.nombre_completo || 'Usuario'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {currentUser?.correo || 'correo@empresa.pe'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full border border-slate-200 text-slate-600 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition text-xs font-semibold flex items-center justify-center gap-2 bg-white"
          >
            <FaSignOutAlt />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL INYECTADO (CHILDREN) ────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
