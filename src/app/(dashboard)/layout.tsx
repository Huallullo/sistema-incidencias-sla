'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LuLayoutGrid,
  LuTicket,
  LuUsers,
  LuMonitor,
  LuHistory,
  LuCalendarClock,
  LuStar,
  LuChartColumn,
  LuLibrary,
  LuCircleUser,
  LuLogOut,
  LuMonitorX,
  LuHeart,
  LuMenu,
} from 'react-icons/lu';
import { FaHeadphones, FaSpinner } from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

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
        <div className="space-y-6">
          {/* SECCIÓN: PRINCIPAL */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Principal
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => router.push(currentUser?.rol === 'jefe_ti' ? '/admin/dashboard' : '/dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard' || pathname === '/admin/dashboard'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuLayoutGrid className="text-lg shrink-0" />
                  <span>Dashboard</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push('/dashboard/tickets')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard/tickets'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuTicket className="text-lg shrink-0" />
                  <span>Tickets</span>
                </button>
              </li>
            </ul>
          </div>

          {/* SECCIÓN: GESTIÓN */}
          {currentUser?.rol === 'jefe_ti' && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Gestión
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => router.push('/admin/usuarios')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/usuarios')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuUsers className="text-lg shrink-0" />
                    <span>Usuario</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push('/admin/equipos')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/equipos')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuMonitor className="text-lg shrink-0" />
                    <span>Equipos</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => router.push('/admin/prioridades-sla')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/prioridades-sla')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuHistory className="text-lg shrink-0" />
                    <span>Prioridades SLA</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => router.push('/admin/disponibilidad')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/disponibilidad')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuCalendarClock className="text-lg shrink-0" />
                    <span>Disponibilidad</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* SECCIÓN: CALIDAD */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Calidad
            </p>
            <ul className="space-y-1">
              {currentUser?.rol === 'jefe_ti' && (
                <li>
                  <button
                    onClick={() => router.push('/admin/evaluaciones')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/evaluaciones')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuStar className="text-lg shrink-0" />
                    <span>Evaluaciones</span>
                  </button>
                </li>
              )}
              {currentUser?.rol === 'jefe_ti' && (
                <li>
                  <button
                    onClick={() => router.push('/admin/reporte-sla')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/reporte-sla')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuChartColumn className="text-lg shrink-0" />
                    <span>Reporte SLA</span>
                  </button>
                </li>
              )}
              {currentUser?.rol === 'jefe_ti' && (
                <li>
                  <button
                    onClick={() => router.push('/admin/reporte-carga')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/reporte-carga')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuUsers className="text-lg shrink-0" />
                    <span>Carga de Técnicos</span>
                  </button>
                </li>
              )}
              {currentUser?.rol === 'jefe_ti' && (
                <li>
                  <button
                    onClick={() => router.push('/admin/reporte-fallas')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/reporte-fallas')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuMonitorX className="text-lg shrink-0" />
                    <span>Historial Fallas</span>
                  </button>
                </li>
              )}
              {currentUser?.rol === 'jefe_ti' && (
                <li>
                  <button
                    onClick={() => router.push('/admin/reporte-satisfaccion')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/reporte-satisfaccion')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuHeart className="text-lg shrink-0" />
                    <span>Satisfacción</span>
                  </button>
                </li>
              )}
              {currentUser?.rol === 'jefe_ti' && (
                <li>
                  <button
                    onClick={() => router.push('/admin/reporte-conocimiento')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname?.startsWith('/admin/reporte-conocimiento')
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuLibrary className="text-lg shrink-0" />
                    <span>Uso Conocimiento</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => router.push('/dashboard/conocimiento')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard/conocimiento'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuLibrary className="text-lg shrink-0" />
                  <span>Base de conocimiento</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      );
    } else if (rol === 'tecnico') {
      return (
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Panel Técnico
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => router.push('/dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuLayoutGrid className="text-lg shrink-0" />
                  <span>Dashboard Técnico</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push('/dashboard/tickets')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard/tickets'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuTicket className="text-lg shrink-0" />
                  <span>Mis Incidencias</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push('/dashboard/equipos')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname?.startsWith('/dashboard/equipos')
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuMonitor className="text-lg shrink-0" />
                  <span>Equipos</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push('/dashboard/conocimiento')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard/conocimiento'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuLibrary className="text-lg shrink-0" />
                  <span>Base de conocimiento</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Panel Usuario
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => router.push('/dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuLayoutGrid className="text-lg shrink-0" />
                  <span>Dashboard Usuario</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push('/dashboard/tickets')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard/tickets'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuTicket className="text-lg shrink-0" />
                  <span>Tickets</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push('/dashboard/equipos')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname?.startsWith('/dashboard/equipos')
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuMonitor className="text-lg shrink-0" />
                  <span>Equipos</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push('/dashboard/conocimiento')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                    pathname === '/dashboard/conocimiento'
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LuLibrary className="text-lg shrink-0" />
                  <span>Base de conocimiento</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
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
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR LATERAL CENTRALIZADO (FIGMA) ─────────────────────────── */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 transition-transform duration-300 z-50 ${
        isSidebarOpen 
          ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl h-screen' 
          : 'fixed inset-y-0 left-0 -translate-x-full lg:static lg:h-auto lg:translate-x-0'
      }`}>
        <div>
          {/* Logo y Encabezado de Sidebar */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shrink-0">
                <FaHeadphones />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-slate-800 tracking-tight text-base leading-tight truncate">
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

            {/* SECCIÓN: CUENTA */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Cuenta
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => router.push('/perfil')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition font-semibold ${
                      pathname === '/perfil'
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LuCircleUser className="text-lg shrink-0" />
                    <span>Mi perfil</span>
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Sección de perfil inferior (Figma exacto) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
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
            className="w-full border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-100 transition text-xs font-bold flex items-center justify-center gap-2 bg-white shadow-sm"
          >
            <LuLogOut className="text-base shrink-0" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL INYECTADO (CHILDREN) ────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Top Bar */}
        <div className="lg:hidden h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer border border-slate-150 bg-white"
          >
            <LuMenu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-base">
              <FaHeadphones size={14} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight text-sm">Help Desk TI</span>
          </div>
          <div className="w-10 h-10" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
