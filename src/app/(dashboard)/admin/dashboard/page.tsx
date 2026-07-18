'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaSpinner,
  FaSearch,
  FaBell,
} from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { UsuariosService } from '@/services/UsuariosService';
import { PerfilUsuario } from '@/types/auth';
import { Incidencia } from '@/types/incidencias';
import { obtenerTodasLasIncidenciasAction } from '@/actions/incidenciasActions';
import NotificacionesCampana from '@/components/NotificacionesCampana';

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados de datos reales
  const [tickets, setTickets] = useState<Incidencia[]>([]);
  const [technicians, setTechnicians] = useState<PerfilUsuario[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
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

        if (profile.rol !== 'jefe_ti') {
          router.push('/dashboard');
          return;
        }

        setCurrentUser(profile as PerfilUsuario);
        setLoading(false);
        setLoadingData(true);

        // Fetch todas las incidencias
        const ticketResult = await obtenerTodasLasIncidenciasAction();
        if (ticketResult.success && ticketResult.data) {
          setTickets(ticketResult.data);
        }

        // Fetch todos los técnicos registrados
        const techResult = await UsuariosService.getUsers({ rol: 'tecnico', limit: 20 });
        if (techResult.success && techResult.data) {
          setTechnicians(techResult.data);
        }
      } catch (err) {
        console.error('Error cargando datos del dashboard:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center justify-center gap-3">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
          <span className="text-slate-500 font-medium">Cargando panel de control...</span>
        </div>
      </div>
    );
  }

  // Helper para verificar si una fecha es de hoy
  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // 1. Cálculos de KPIs
  const abiertosCount = tickets.filter(t => t.estado === 'abierto').length;
  const progresoCount = tickets.filter(t => t.estado === 'en_progreso').length;
  const cerradosHoyCount = tickets.filter(t => (t.estado === 'cerrado' || t.estado === 'resuelto') && isToday(t.actualizado_en || '')).length;
  const nuevosHoyCount = tickets.filter(t => isToday(t.creado_en)).length;

  // Técnicos activos (que tienen incidencias asignadas en progreso)
  const activeTechIds = new Set(
    tickets
      .filter(t => t.estado === 'en_progreso' && t.asignado_a)
      .map(t => t.asignado_a)
  );
  const activeTechCount = activeTechIds.size;

  // 2. Tickets recientes (últimos 4 creados)
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
    .slice(0, 4);

  // 3. Distribución semanal de tickets creados (Lunes a Domingo de la semana actual)
  const getWeeklyCounts = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Lun, Mar, Mié, Jue, Vie, Sáb, Dom
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Dom, 1 = Lun...
    
    // Encontrar el lunes de la semana actual
    const startOfWeek = new Date(today);
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    tickets.forEach(t => {
      const created = new Date(t.creado_en);
      const msDiff = created.getTime() - startOfWeek.getTime();
      if (msDiff >= 0) {
        const dayIndex = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < 7) {
          counts[dayIndex]++;
        }
      }
    });
    return counts;
  };

  const weeklyCounts = getWeeklyCounts();
  const maxWeeklyCount = Math.max(...weeklyCounts, 1);

  // Totales de estados para el pie del gráfico
  const totalAbiertos = tickets.filter(t => t.estado === 'abierto').length;
  const totalProgreso = tickets.filter(t => t.estado === 'en_progreso').length;
  const totalCerrados = tickets.filter(t => t.estado === 'cerrado' || t.estado === 'resuelto').length;
  const totalCancelados = 0; // No hay estado cancelado explícito en tipo EstadoIncidencia

  // 4. Disponibilidad de técnicos en base a su carga de trabajo real
  const getTechAvailability = (techId?: string | null) => {
    if (!techId) return { label: 'Libre', dotClass: 'bg-emerald-500' };
    const workload = tickets.filter(t => t.asignado_a === techId && t.estado === 'en_progreso').length;
    if (workload === 0) return { label: 'Libre', dotClass: 'bg-emerald-500' };
    if (workload === 1) return { label: 'Parcial', dotClass: 'bg-amber-400' };
    return { label: 'Ocupado', dotClass: 'bg-red-500' };
  };

  // 5. Cumplimiento de SLA real (porcentaje de tickets resueltos o cerrados por prioridad)
  const calculateSlaPercentage = (pri: string) => {
    const totalPri = tickets.filter(t => t.prioridad === pri).length;
    if (totalPri === 0) return 100; // Si no hay tickets, cumple al 100% por defecto
    const closedPri = tickets.filter(t => t.prioridad === pri && (t.estado === 'cerrado' || t.estado === 'resuelto')).length;
    return Math.round((closedPri / totalPri) * 100);
  };

  const slaPercentages = {
    critica: calculateSlaPercentage('critica'),
    alta: calculateSlaPercentage('alta'),
    media: calculateSlaPercentage('media'),
    baja: calculateSlaPercentage('baja'),
  };

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

  const getSlaColorClass = (pct: number) => {
    if (pct >= 95) return 'bg-emerald-500';
    if (pct >= 90) return 'bg-blue-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getWeeklyBarColor = (dayIdx: number) => {
    const todayIdx = new Date().getDay();
    const normalizedToday = todayIdx === 0 ? 6 : todayIdx - 1; // 0-6 represent Lun-Dom
    return dayIdx === normalizedToday ? 'bg-blue-500' : 'bg-blue-100';
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#e5e7eb]/40">
      {/* Cabecera superior interna con Buscador y Notificaciones */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Dashboard
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

      {/* Cuerpo del Contenido (Dynamic Real Data Layout) */}
      <div className="flex-1 p-8 overflow-y-auto max-w-[1200px] w-full mx-auto space-y-6">
        
        {/* Fila superior: 4 Tarjetas de Estadísticas Reales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Tarjeta 1: Tickets Abiertos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tickets Abiertos
              </p>
              <h3 className="text-4xl font-extrabold text-amber-500 mt-2">
                {abiertosCount}
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1 font-semibold">
              <span>{nuevosHoyCount} nuevos hoy</span>
            </p>
          </div>

          {/* Tarjeta 2: En Progreso */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                En Progreso
              </p>
              <h3 className="text-4xl font-extrabold text-blue-500 mt-2">
                {progresoCount}
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1 font-semibold">
              <span>{activeTechCount} técnicos activos</span>
            </p>
          </div>

          {/* Tarjeta 3: Cerrados Hoy */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cerrados Hoy
              </p>
              <h3 className="text-4xl font-extrabold text-emerald-500 mt-2">
                {cerradosHoyCount}
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1 font-semibold">
              <span>Resueltos hoy en tiempo real</span>
            </p>
          </div>

          {/* Tarjeta 4: Satisfacción */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Satisfacción
              </p>
              <h3 className="text-4xl font-extrabold text-slate-400 mt-2 flex items-baseline">
                -
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1 font-semibold">
              <span>Sin calificaciones registradas</span>
            </p>
          </div>

        </div>

        {/* Fila Media y Baja: Diseño de dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* COLUMNA IZQUIERDA: Tickets Recientes y Disponibilidad */}
          <div className="space-y-6">
            
            {/* Tarjeta: Tickets Recientes Reales */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800">
                  Tickets recientes
                </h3>
                <button
                  onClick={() => router.push('/dashboard/tickets')}
                  className="text-xs text-blue-600 hover:underline font-bold bg-transparent border-none cursor-pointer"
                >
                  Ver todos →
                </button>
              </div>

              <div className="space-y-3">
                {recentTickets.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                    <p className="text-xs font-bold text-slate-400">No se encontraron tickets registrados</p>
                  </div>
                ) : (
                  recentTickets.map((ticket, index) => (
                    <div
                      key={index}
                      onClick={() => router.push('/dashboard/tickets')}
                      className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-blue-200 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-slate-400 shrink-0 w-12">
                          #{ticket.codigo_ticket.substring(4)}
                        </span>
                        <span className="text-xs font-bold text-slate-700 truncate leading-snug">
                          {ticket.titulo}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${getPriorityStyle(ticket.prioridad)}`}>
                          {getPriorityLabel(ticket.prioridad)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${getStatusStyle(ticket.estado)}`}>
                          {getStatusLabel(ticket.estado)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tarjeta: Disponibilidad de técnicos reales */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800">
                  Disponibilidad de técnicos
                </h3>
                <button
                  onClick={() => alert('Gestión de Disponibilidad en desarrollo')}
                  className="text-xs text-blue-600 hover:underline font-bold bg-transparent border-none cursor-pointer"
                >
                  Gestionar →
                </button>
              </div>

              {/* Grid de Técnicos Reales */}
              {technicians.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                  <p className="text-xs font-bold text-slate-400">No hay personal técnico registrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {technicians.slice(0, 6).map((tech, idx) => {
                    const availability = getTechAvailability(tech.id_auth_supabase);
                    // Nombre abreviado
                    const shortName = tech.nombre && tech.apellido
                      ? `${tech.nombre} ${tech.apellido.charAt(0)}.`
                      : tech.nombre_completo || 'Técnico';

                    return (
                      <div
                        key={idx}
                        className="border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white hover:shadow-xs transition"
                      >
                        <p className="text-xs font-bold text-slate-700 truncate w-full">{shortName}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`w-2 h-2 rounded-full ${availability.dotClass}`} />
                          <span className="text-[10px] font-semibold text-slate-400 capitalize">{availability.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* COLUMNA DERECHA: Gráfico semanal real y Cumplimiento SLA real */}
          <div className="space-y-6">
            
            {/* Tarjeta: Gráfico de tickets por día real */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-6">
                  Tickets por día (semana actual)
                </h3>
                
                {/* Contenedor del Gráfico de Barras real */}
                <div className="h-44 flex items-end justify-between gap-2 px-2 border-b border-slate-100 pb-2">
                  {[
                    { dia: 'Lun', valor: weeklyCounts[0] },
                    { dia: 'Mar', valor: weeklyCounts[1] },
                    { dia: 'Mié', valor: weeklyCounts[2] },
                    { dia: 'Jue', valor: weeklyCounts[3] },
                    { dia: 'Vie', valor: weeklyCounts[4] },
                    { dia: 'Sáb', valor: weeklyCounts[5] },
                    { dia: 'Dom', valor: weeklyCounts[6] },
                  ].map((bar, idx) => {
                    const heightPercent = `${(bar.valor / maxWeeklyCount) * 90 + 5}%`; // Mínimo 5% si tiene valor
                    const showHeight = bar.valor > 0 ? heightPercent : '0%';
                    const barColor = getWeeklyBarColor(idx);

                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 group">
                        <div 
                          style={{ height: showHeight }} 
                          className={`w-full ${barColor} rounded-t-sm transition-all duration-300 group-hover:opacity-80`} 
                          title={`${bar.valor} tickets`}
                        />
                        <span className="text-[10px] text-slate-400 font-bold mt-2">{bar.dia}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leyenda del gráfico con datos reales */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-6 text-[10px] font-bold text-slate-500 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Abierto {totalAbiertos}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span>En progreso {totalProgreso}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                  <span>Cerrado {totalCerrados}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                  <span>Cancelado {totalCancelados}</span>
                </div>
              </div>
            </div>

            {/* Tarjeta: Cumplimiento SLA real */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-6">
                Cumplimiento SLA
              </h3>

              <div className="space-y-4">
                {[
                  { nivel: 'Crítico', porcentaje: slaPercentages.critica, priorityKey: 'critica' },
                  { nivel: 'Alto', porcentaje: slaPercentages.alta, priorityKey: 'alta' },
                  { nivel: 'Medio', porcentaje: slaPercentages.media, priorityKey: 'media' },
                  { nivel: 'Bajo', porcentaje: slaPercentages.baja, priorityKey: 'baja' },
                ].map((item, idx) => {
                  const hasPriorityTickets = tickets.some(t => t.prioridad === item.priorityKey);
                  const displayPct = hasPriorityTickets ? `${item.porcentaje}%` : '-';
                  const barColor = getSlaColorClass(item.porcentaje);

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500">{item.nivel}</span>
                        <span className="text-slate-400">{displayPct}</span>
                      </div>
                      {/* Barra de progreso */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: hasPriorityTickets ? `${item.porcentaje}%` : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
