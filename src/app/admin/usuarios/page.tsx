'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaHeadphones,
  FaBell,
  FaSearch,
  FaPlus,
  FaEdit,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
} from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { UsuariosService, PerfilUsuario } from '@/services/UsuariosService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';

export const dynamic = 'force-dynamic';

export default function GestionUsuariosPage() {
  const router = useRouter();

  // Estados de sesión
  const [currentUser, setCurrentUser] = useState<{
    nombre_completo: string;
    correo: string;
    rol: string;
  } | null>(null);

  // Estados de carga e interfaz
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PerfilUsuario[]>([]);
  const [count, setCount] = useState(0);

  // Filtros y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'tecnico' | 'usuario'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Límite de ítems por página

  // Efecto para debounce de búsqueda (500ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reiniciar a página 1 al buscar
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Cargar datos de la sesión actual
  useEffect(() => {
    async function loadSession() {
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

        // Si no es jefe_ti, la protección del middleware nos redirigirá,
        // pero añadimos una salvaguarda aquí.
        if (profile.rol !== 'jefe_ti') {
          router.push('/dashboard/usuario');
          return;
        }

        setCurrentUser({
          nombre_completo: profile.nombre_completo || 'Jefe de TI',
          correo: profile.correo || session.user.email || '',
          rol: profile.rol,
        });
      } catch (err) {
        console.error('Error cargando sesión:', err);
        router.push('/login');
      }
    }

    loadSession();
  }, [router]);

  // Cargar lista de usuarios al cambiar filtros, búsqueda o página
  useEffect(() => {
    async function fetchUsuarios() {
      setLoading(true);
      try {
        const result = await UsuariosService.getUsers({
          search: debouncedSearch,
          rol: activeTab,
          page: currentPage,
          limit: itemsPerPage,
        });

        if (result.success && result.data) {
          setUsers(result.data);
          setCount(result.count || 0);
        } else {
          console.error('Error fetching users:', result.error);
        }
      } catch (err) {
        console.error('Unexpected error fetching users:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsuarios();
  }, [debouncedSearch, activeTab, currentPage]);

  const handleLogout = async () => {
    await AuthService.signOut();
    router.push('/login');
  };

  // Helper para generar iniciales
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Helper para obtener estilo de avatar e iniciales basado en rol
  const getAvatarStyles = (rol: string) => {
    switch (rol) {
      case 'jefe_ti':
        return 'bg-blue-100 text-blue-600';
      case 'tecnico':
        return 'bg-green-100 text-green-600';
      case 'usuario':
      default:
        return 'bg-orange-100 text-orange-600';
    }
  };

  // Helper para traducir y estilizar el rol en la grilla
  const renderRolBadge = (rol: string) => {
    switch (rol) {
      case 'jefe_ti':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
            Jefe TI
          </span>
        );
      case 'tecnico':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
            Técnico
          </span>
        );
      case 'usuario':
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            Usuario
          </span>
        );
    }
  };

  // Helper para estilizar el estado
  const renderEstadoBadge = (estado: string) => {
    const isActivo = estado?.toLowerCase() === 'activo';
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isActivo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}
      >
        {isActivo ? 'Activo' : 'Inactivo'}
      </span>
    );
  };

  // Paginación helpers
  const totalPages = Math.ceil(count / itemsPerPage);
  const fromIndex = (currentPage - 1) * itemsPerPage + 1;
  const toIndex = Math.min(currentPage * itemsPerPage, count);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ── SIDEBAR LATERAL ────────────────────────────────────────────────── */}
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
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                  Jefe TI
                </span>
              </div>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-4 space-y-6">
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Principal
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => router.push('/dashboard/jefe')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium"
                  >
                    Dashboard
                  </button>
                </li>
                <li>
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium flex items-center justify-between"
                  >
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
                    className="w-full text-left px-3 py-2 rounded-lg text-sm bg-blue-50 text-blue-600 transition font-bold"
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

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Calidad
              </p>
              <ul className="space-y-1">
                <li>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium flex items-center justify-between">
                    <span>Evaluaciones</span>
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      3
                    </span>
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium">
                    Reporte
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium">
                    Base de conocimiento
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Cuenta
              </p>
              <ul className="space-y-1">
                <li>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition font-medium">
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
              {currentUser ? getInitials(currentUser.nombre_completo) : 'JT'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-700 truncate leading-tight">
                {currentUser?.nombre_completo || 'Ana Torres'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {currentUser?.correo || 'ana.torres@empresa.pe'}
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

      {/* ── CONTENIDO PRINCIPAL ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Superior con Buscador y Notificaciones */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Gestión de usuarios
          </h1>

          <div className="flex items-center gap-4">
            {/* Buscador general */}
            <div className="relative w-72">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                <FaSearch />
              </span>
              <input
                type="text"
                placeholder="Buscar tickets, usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition focus:bg-white placeholder-slate-400"
              />
            </div>

            {/* Botón Nuevo Usuario */}
            <button
              onClick={() => router.push('/admin/usuarios/nuevo')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-2 shadow-sm shadow-blue-100"
            >
              <FaPlus />
              Nuevo
            </button>

            {/* Botón Notificaciones */}
            <button className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 relative transition">
              <FaBell />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500"></span>
            </button>
          </div>
        </header>

        {/* Cuerpo del Contenido */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Tabs para Filtrado por Rol */}
          <div className="flex border-b border-slate-200 mb-6 gap-2">
            <button
              data-testid="tab-todos"
              onClick={() => {
                setActiveTab('todos');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition ${
                activeTab === 'todos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Todos
            </button>
            <button
              data-testid="tab-tecnicos"
              onClick={() => {
                setActiveTab('tecnico');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition ${
                activeTab === 'tecnico'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Técnicos
            </button>
            <button
              data-testid="tab-usuarios"
              onClick={() => {
                setActiveTab('usuario');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition ${
                activeTab === 'usuario'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Usuarios
            </button>
          </div>

          {/* Grilla / DataGrid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="py-4 px-6">Nombre</th>
                    <th className="py-4 px-6">Correo</th>
                    <th className="py-4 px-6">Rol</th>
                    <th className="py-4 px-6">Área</th>
                    <th className="py-4 px-6">Estado</th>
                    <th className="py-4 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <FaSpinner className="animate-spin text-2xl text-blue-600" />
                          <span>Cargando usuarios...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No se encontraron usuarios
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition">
                        {/* Nombre completo con Avatar */}
                        <td className="py-4 px-6 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarStyles(
                                user.rol
                              )}`}
                            >
                              {getInitials(user.nombre_completo)}
                            </div>
                            <span className="truncate">{user.nombre_completo}</span>
                          </div>
                        </td>

                        {/* Correo electrónico */}
                        <td className="py-4 px-6 font-normal">
                          <span className="text-slate-500 hover:text-blue-600 hover:underline cursor-pointer">
                            {user.correo || 'N/A'}
                          </span>
                        </td>

                        {/* Rol */}
                        <td className="py-4 px-6">{renderRolBadge(user.rol)}</td>

                        {/* Área */}
                        <td className="py-4 px-6 text-slate-500">
                          {user.cargo || 'TI'} {/* default/fallback a TI si no tiene área configurada */}
                        </td>

                        {/* Estado */}
                        <td className="py-4 px-6">{renderEstadoBadge(user.estado || 'activo')}</td>

                        {/* Acciones */}
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              alert(`Edición en desarrollo para el usuario: ${user.nombre_completo}`);
                            }}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-400 hover:text-slate-700 inline-flex items-center justify-center"
                            title="Editar usuario"
                          >
                            <FaEdit size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {!loading && users.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-400">
                  Mostrando{' '}
                  <strong className="font-semibold text-slate-600">{fromIndex}</strong> a{' '}
                  <strong className="font-semibold text-slate-600">{toIndex}</strong> de{' '}
                  <strong className="font-semibold text-slate-600">{count}</strong> resultados
                </span>

                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
                    title="Página anterior"
                  >
                    <FaChevronLeft size={10} />
                  </button>
                  <button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
                    title="Página siguiente"
                  >
                    <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
