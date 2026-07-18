'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell, FaSpinner, FaPlus, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { Incidencia } from '@/types/incidencias';
import { PrioridadServicio } from '@/types/prioridadServicio';
import NotificacionesCampana from '@/components/NotificacionesCampana';
import { consultarIncidenciasAction } from '@/actions/incidenciasActions';
import { obtenerPrioridadesAction } from '@/actions/prioridadesActions';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para métricas reales
  const [ticketsActivos, setTicketsActivos] = useState(0);
  const [ticketsResueltos, setTicketsResueltos] = useState(0);
  const [ticketsFueraSLA, setTicketsFueraSLA] = useState(0);

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

        // Si es Jefe de TI, redirigir a la interfaz administrativa
        if (profile.rol === 'jefe_ti') {
          router.push('/admin/dashboard');
          return;
        }

        setCurrentUser(profile as PerfilUsuario);

        // Cargar incidencias del usuario y prioridades para calcular métricas reales
        const [ticketsRes, prioRes] = await Promise.all([
          consultarIncidenciasAction(profile.id_auth_supabase, {}),
          obtenerPrioridadesAction(),
        ]);

        let listTickets: Incidencia[] = [];
        let listPrioridades: PrioridadServicio[] = [];

        if (ticketsRes.success && ticketsRes.data) {
          listTickets = ticketsRes.data;
        }
        if (prioRes.success && prioRes.data) {
          listPrioridades = prioRes.data;
        }

        // 1. Tickets Activos (abierto, en_progreso)
        const activos = listTickets.filter(
          (t) => t.estado === 'abierto' || t.estado === 'en_progreso'
        ).length;

        // 2. Resueltos (resuelto, cerrado)
        const resueltos = listTickets.filter(
          (t) => t.estado === 'resuelto' || t.estado === 'cerrado'
        ).length;

        // 3. Fuera de SLA
        let fueraSLA = 0;
        const fallback = {
          critica: 120,
          alta: 240,
          media: 480,
          baja: 960,
        };

        listTickets.forEach((t) => {
          const config = listPrioridades.find((p) => p.nivel === t.prioridad);
          const tiempoResolucionMin = config
            ? config.tiempo_resolucion_min
            : (fallback[t.prioridad as keyof typeof fallback] || 960);

          const fechaCreacion = new Date(t.creado_en);
          const limite = new Date(fechaCreacion.getTime() + tiempoResolucionMin * 60000);

          if (t.estado === 'resuelto' || t.estado === 'cerrado') {
            const fechaResolucion = t.fecha_cierre
              ? new Date(t.fecha_cierre)
              : new Date(t.actualizado_en || t.creado_en);
            if (fechaResolucion > limite) {
              fueraSLA++;
            }
          } else {
            if (new Date() > limite) {
              fueraSLA++;
            }
          }
        });

        setTicketsActivos(activos);
        setTicketsResueltos(resueltos);
        setTicketsFueraSLA(fueraSLA);

      } catch (err) {
        console.error('Error cargando sesión en dashboard:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadSession();
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

  const isTecnico = currentUser?.rol === 'tecnico';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Cabecera superior interna */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          {isTecnico ? 'Panel de Control de Técnico' : 'Panel de Control de Usuario'}
        </h1>
        <div className="flex items-center gap-3">
          {!isTecnico && (
            <button
              onClick={() => router.push('/dashboard/tickets')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-2 shadow-sm shadow-blue-100 cursor-pointer"
            >
              <FaPlus />
              Reportar Incidencia
            </button>
          )}
          <NotificacionesCampana authUserId={currentUser?.id_auth_supabase ?? ''} />
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 p-8 overflow-y-auto max-w-5xl w-full mx-auto space-y-6">
        
        {/* Mensaje de Bienvenida */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 leading-tight">
              ¡Bienvenido, {currentUser?.nombre_completo}!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isTecnico
                ? 'Aquí puedes hacer seguimiento de las incidencias asignadas bajo tu cargo y cumplir los niveles de servicio (SLA).'
                : 'Aquí puedes reportar incidencias técnicas y revisar el estado actual de tus solicitudes.'}
            </p>
          </div>
          <div className="px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-600">
            {isTecnico ? 'Rol Técnico' : 'Rol Usuario'}
          </div>
        </div>

        {/* Métrica / Tarjetas de Resumen Rápido (Diseño Premium) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-xl shrink-0">
              <FaClock />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isTecnico ? 'Tickets Pendientes' : 'Tickets Activos'}
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {ticketsActivos}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center text-xl shrink-0">
              <FaCheckCircle />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Resueltos este mes
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
                {ticketsResueltos}
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
                {ticketsFueraSLA}
              </h3>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
