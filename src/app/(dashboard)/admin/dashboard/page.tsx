'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaSpinner,
  FaTicketAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaUsers,
  FaArrowRight,
  FaPlus,
  FaUserShield,
} from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { Incidencia } from '@/types/incidencias';
import { obtenerTodasLasIncidenciasAction } from '@/actions/incidenciasActions';
import { UsuariosService } from '@/services/UsuariosService';

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estadísticas del sistema
  const [stats, setStats] = useState({
    totalTickets: 0,
    activeTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    criticalTickets: 0,
    outOfSla: 0,
    totalUsers: 0,
    techniciansCount: 0,
  });
  
  const [recentTickets, setRecentTickets] = useState<Incidencia[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function loadSessionAndStats() {
      try {
        // 1. Validar sesión de usuario
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

        // Salvaguarda: solo jefe_ti puede estar aquí
        if (profile.rol !== 'jefe_ti') {
          router.push('/dashboard');
          return;
        }

        setCurrentUser(profile as PerfilUsuario);
        setLoading(false);
        setLoadingData(true);

        // 2. Cargar tickets para estadísticas
        const ticketsResult = await obtenerTodasLasIncidenciasAction();
        let allTickets: Incidencia[] = [];
        if (ticketsResult.success && ticketsResult.data) {
          allTickets = ticketsResult.data;
        }

        // 3. Cargar usuarios para estadísticas
        const usersResult = await UsuariosService.getUsers({ limit: 100 });
        let allUsers: PerfilUsuario[] = [];
        if (usersResult.success && usersResult.data) {
          allUsers = usersResult.data;
        }

        // 4. Calcular métricas
        const active = allTickets.filter(t => t.estado === 'abierto' || t.estado === 'en_progreso').length;
        const resolved = allTickets.filter(t => t.estado === 'resuelto').length;
        const closed = allTickets.filter(t => t.estado === 'cerrado').length;
        const critical = allTickets.filter(t => t.prioridad === 'critica').length;
        
        // Mapear métrica SLA: incidencias de alta/crítica creadas hace más de 24h que siguen abiertas
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const slaViolations = allTickets.filter(t => 
          (t.estado === 'abierto' || t.estado === 'en_progreso') && 
          (t.prioridad === 'alta' || t.prioridad === 'critica') &&
          new Date(t.creado_en).getTime() < oneDayAgo
        ).length;

        const technicians = allUsers.filter(u => u.rol === 'tecnico').length;

        setStats({
          totalTickets: allTickets.length,
          activeTickets: active,
          resolvedTickets: resolved,
          closedTickets: closed,
          criticalTickets: critical,
          outOfSla: slaViolations,
          totalUsers: allUsers.length,
          techniciansCount: technicians,
        });

        // Tomar las 5 incidencias más recientes
        setRecentTickets(allTickets.slice(0, 5));

      } catch (err) {
        console.error('Error cargando panel de administración:', err);
        router.push('/login');
      } finally {
        setLoadingData(false);
      }
    }

    loadSessionAndStats();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center justify-center gap-3">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
          <span className="text-slate-500 font-medium">Iniciando panel de administración...</span>
        </div>
      </div>
    );
  }

  // Estilos de badges para prioridad
  const getPriorityStyle = (pri: string) => {
    switch (pri) {
      case 'critica':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      case 'alta':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'media':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'baja':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

  const getPriorityLabel = (pri: string) => {
    switch (pri) {
      case 'critica': return 'Crítico';
      case 'alta': return 'Alto';
      case 'media': return 'Medio';
      case 'baja': return 'Bajo';
      default: return pri;
    }
  };

  // Estilos de badges para estado
  const getStatusStyle = (est: string) => {
    switch (est) {
      case 'abierto':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'en_progreso':
        return 'bg-sky-50 text-sky-700 border border-sky-100';
      case 'resuelto':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'cerrado':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

  const getStatusLabel = (est: string) => {
    switch (est) {
      case 'abierto': return 'Abierto';
      case 'en_progreso': return 'En progreso';
      case 'resuelto': return 'Resuelto';
      case 'cerrado': return 'Cerrado';
      default: return est;
    }
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
      {/* Cabecera superior interna */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FaUserShield className="text-blue-600" /> Panel de Control de Administración
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/usuarios/nuevo')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-2 shadow-sm shadow-blue-100"
          >
            <FaPlus />
            Registrar Usuario
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 p-8 overflow-y-auto max-w-6xl w-full mx-auto space-y-8">
        
        {/* Mensaje de Bienvenida */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 leading-tight">
              ¡Bienvenido, {currentUser?.nombre_completo}!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Como Jefe de TI de Resinplast, aquí tienes una vista global de la gestión de incidencias, el cumplimiento de niveles de servicio (SLA) y la administración de usuarios.
            </p>
          </div>
          <div className="px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-600 shrink-0">
            Jefe de TI
          </div>
        </div>

        {/* Tarjetas de Resumen Rápido (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl shrink-0">
              <FaTicketAlt />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Incidencias
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {loadingData ? '...' : stats.totalTickets}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-xl shrink-0">
              <FaClock />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tickets Activos
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {loadingData ? '...' : stats.activeTickets}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl shrink-0">
              <FaExclamationTriangle />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Fuera de SLA
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {loadingData ? '...' : stats.outOfSla}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center text-xl shrink-0">
              <FaUsers />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Usuarios Registrados
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {loadingData ? '...' : stats.totalUsers}
              </h3>
            </div>
          </div>

        </div>

        {/* Sección de Dos Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Incidencias Recientes (Ocupa 2/3) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-800">
                Últimas Incidencias Reportadas
              </h3>
              <button
                onClick={() => router.push('/dashboard/tickets')}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold bg-transparent border-none cursor-pointer"
              >
                Ver todos <FaArrowRight size={10} />
              </button>
            </div>

            {loadingData ? (
              <div className="flex flex-1 justify-center items-center py-12">
                <FaSpinner className="animate-spin text-2xl text-blue-600" />
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="flex-1 py-12 text-center text-slate-400 text-sm">
                No hay incidencias registradas en el sistema.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 flex-1">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id_incidencia}
                    onClick={() => router.push('/dashboard/tickets')}
                    className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition cursor-pointer"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 shrink-0">
                        #{ticket.codigo_ticket.substring(4)}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-700 truncate leading-snug">
                        {ticket.titulo}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${getPriorityStyle(ticket.prioridad)}`}>
                        {getPriorityLabel(ticket.prioridad)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${getStatusStyle(ticket.estado)}`}>
                        {getStatusLabel(ticket.estado)}
                      </span>
                      <span className="text-xs font-medium text-slate-400 w-10 text-right">
                        {formatShortDate(ticket.creado_en)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Accesos Rápidos y Más Métricas (Ocupa 1/3) */}
          <div className="space-y-6">
            
            {/* Tarjeta de Personal de TI */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-800 mb-4">Personal de Soporte</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Técnicos Activos</span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 font-bold rounded-lg text-sm border border-green-100">
                    {stats.techniciansCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Administradores</span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-sm border border-blue-100">
                    {stats.totalUsers > 0 ? allAdministratorsCount(stats.totalUsers, stats.techniciansCount) : '1'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta de Accesos Directos */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-800 mb-4">Acciones Administrativas</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/admin/usuarios')}
                  className="w-full py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center justify-between bg-white transition"
                >
                  <span>Administrar Usuarios</span>
                  <FaArrowRight size={10} className="text-slate-400" />
                </button>
                <button
                  onClick={() => router.push('/admin/usuarios/nuevo')}
                  className="w-full py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center justify-between bg-white transition"
                >
                  <span>Registrar Nuevo Usuario</span>
                  <FaArrowRight size={10} className="text-slate-400" />
                </button>
                <button
                  onClick={() => router.push('/dashboard/tickets')}
                  className="w-full py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center justify-between bg-white transition"
                >
                  <span>Consultar Incidencias</span>
                  <FaArrowRight size={10} className="text-slate-400" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

// Helper rápido para simular administradores (como mínimo 1, jefe de TI actual)
function allAdministratorsCount(totalUsers: number, techs: number) {
  // Resta aproximada de usuarios regulares y técnicos
  const rest = totalUsers - techs;
  return rest > 0 ? Math.min(rest, 3) : 1; // Mínimo 1
}
