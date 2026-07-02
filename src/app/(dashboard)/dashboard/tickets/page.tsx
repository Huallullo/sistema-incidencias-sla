'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaSearch,
  FaPlus,
  FaSpinner,
  FaTimes,
  FaTicketAlt,
  FaCalendarAlt,
  FaPaperPlane,
  FaInfoCircle,
  FaUser,
  FaTags,
  FaExclamationTriangle,
  FaCheckCircle,
} from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { Incidencia, CategoriaIncidencia, PrioridadIncidencia } from '@/types/incidencias';
import { consultarIncidenciasAction, registrarIncidenciaAction } from '@/actions/incidenciasActions';

export const dynamic = 'force-dynamic';

export default function TicketsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Incidencia[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de Filtros
  const [filtroPill, setFiltroPill] = useState<'todos' | 'abierto' | 'en_progreso' | 'cerrado' | 'critica'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todos');
  const [prioridad, setPrioridad] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Estado Modal Nuevo Ticket
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newAsunto, setNewAsunto] = useState('');
  const [newCategoria, setNewCategoria] = useState<CategoriaIncidencia>('hardware');
  const [newPrioridad, setNewPrioridad] = useState<PrioridadIncidencia>('media');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [newEquipo, setNewEquipo] = useState('');
  const [submittingNew, setSubmittingNew] = useState(false);
  const [newError, setNewError] = useState('');
  const [newSuccess, setNewSuccess] = useState(false);

  // Estado Modal Detalle Ticket
  const [selectedTicket, setSelectedTicket] = useState<Incidencia | null>(null);

  // Carga de Sesión
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

        setCurrentUser(profile as PerfilUsuario);
      } catch (err) {
        console.error('Error cargando sesión:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [router]);

  // Carga y Filtrado de Tickets
  useEffect(() => {
    if (!currentUser?.id_auth_supabase) return;
    const authId = currentUser.id_auth_supabase;

    async function fetchTickets() {
      setLoadingTickets(true);
      setErrorMsg('');

      // Construcción de filtros para Server Action
      const filtros: any = {
        busqueda,
        categoria: categoria !== 'todos' ? categoria : undefined,
        prioridad: prioridad !== 'todos' ? prioridad : undefined,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      };

      // Mapeo del filtro rápido (pills)
      if (filtroPill === 'critica') {
        filtros.prioridad = 'critica';
      } else if (filtroPill !== 'todos') {
        filtros.estado = filtroPill;
      }

      const result = await consultarIncidenciasAction(authId, filtros);

      if (result.success) {
        setTickets(result.data || []);
      } else {
        setErrorMsg(result.error || 'Error al recuperar los tickets');
      }
      setLoadingTickets(false);
    }

    // Debounce simple para la búsqueda por texto
    const timer = setTimeout(() => {
      fetchTickets();
    }, 300);

    return () => clearTimeout(timer);
  }, [currentUser, filtroPill, busqueda, categoria, prioridad, fechaInicio, fechaFin]);

  // Manejo de envío de nuevo ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id_auth_supabase) return;
    const authId = currentUser.id_auth_supabase;

    setNewError('');
    setNewSuccess(false);
    setSubmittingNew(true);

    const result = await registrarIncidenciaAction(
      {
        titulo: newAsunto.trim(),
        categoria: newCategoria,
        prioridad: newPrioridad,
        descripcion: newDescripcion.trim(),
      },
      authId
    );

    if (result.success) {
      setNewSuccess(true);
      setNewAsunto('');
      setNewDescripcion('');
      setNewEquipo('');
      
      // Forzar recarga de tickets
      setFiltroPill('todos');
      
      // Cerrar modal tras 2 segundos
      setTimeout(() => {
        setIsNewModalOpen(false);
        setNewSuccess(false);
      }, 2000);
    } else {
      setNewError(result.error || 'Ocurrió un error al registrar el ticket');
    }
    setSubmittingNew(false);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center justify-center gap-3">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
          <span className="text-slate-500 font-medium">Iniciando consulta de tickets...</span>
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

  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('es-PE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-[#f8fafc]">
      {/* ── CABECERA SUPERIOR INTERNA ─────────────────────────────────── */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Tickets
        </h1>
        <div className="flex items-center gap-4">
          {/* Campo de Búsqueda de Cabecera (Figma) */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <FaSearch size={14} />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tickets, usuarios..."
              className="w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-slate-50 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Botón "+ Nuevo" */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition text-sm font-bold flex items-center gap-2 shadow-sm shadow-blue-100"
          >
            <FaPlus size={12} />
            Nuevo
          </button>
        </div>
      </header>

      {/* ── CUERPO DEL CONTENIDO ─────────────────────────────────────── */}
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl w-full mx-auto">
        {/* Pills Filtros Rápidos (Figma) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltroPill('todos')}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
              filtroPill === 'todos'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroPill('abierto')}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
              filtroPill === 'abierto'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Abiertos
          </button>
          <button
            onClick={() => setFiltroPill('en_progreso')}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
              filtroPill === 'en_progreso'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            En progreso
          </button>
          <button
            onClick={() => setFiltroPill('cerrado')}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
              filtroPill === 'cerrado'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Cerrados
          </button>
          <button
            onClick={() => setFiltroPill('critica')}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
              filtroPill === 'critica'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Críticos
          </button>
        </div>

        {/* Panel lateral de Filtros Avanzados (Opcional - Plegable) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todas las categorías</option>
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="redes">Redes</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todas las prioridades</option>
              <option value="baja">Bajo</option>
              <option value="media">Medio</option>
              <option value="alta">Alto</option>
              <option value="critica">Crítico</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* ── LISTADO DE TICKETS ────────────────────────────────────────── */}
        {errorMsg && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
            <FaExclamationTriangle />
            {errorMsg}
          </div>
        )}

        {loadingTickets ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className="animate-spin text-3xl text-blue-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center text-2xl">
              <FaTicketAlt />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No se encontraron tickets</h3>
            <p className="text-sm text-slate-400 max-w-sm">
              Prueba cambiando las palabras clave de la barra de búsqueda o ajustando los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id_incidencia}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md shadow-sm p-5 transition cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Código de Ticket */}
                  <span className="text-slate-400 font-bold text-sm shrink-0 tracking-tight">
                    #{ticket.codigo_ticket.substring(4)}
                  </span>
                  {/* Título de Ticket */}
                  <h3 className="text-slate-800 font-bold text-sm truncate leading-tight">
                    {ticket.titulo}
                  </h3>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                  {/* Autor o Creador */}
                  <span className="text-slate-500 font-semibold text-xs min-w-[80px] text-right">
                    {ticket.creador ? `${ticket.creador.nombre.charAt(0)}. ${ticket.creador.apellido}` : 'Sin autor'}
                  </span>

                  {/* Prioridad Badge */}
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider leading-none shrink-0 ${getPriorityStyle(ticket.prioridad)}`}>
                    {getPriorityLabel(ticket.prioridad)}
                  </span>

                  {/* Estado Badge */}
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider leading-none shrink-0 ${getStatusStyle(ticket.estado)}`}>
                    {getStatusLabel(ticket.estado)}
                  </span>

                  {/* Fecha Corta */}
                  <span className="text-slate-400 text-xs font-semibold w-[42px] text-right">
                    {formatShortDate(ticket.creado_en)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── MODAL: NUEVO TICKET (FIGMA EXACTO) ────────────────────────── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-blue-600 text-lg">
                  <FaTicketAlt />
                </span>
                <h2 className="text-lg font-bold text-slate-800">
                  Nuevo ticket de incidencia
                </h2>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateTicket} className="p-8">
              {newSuccess && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 flex items-center gap-2">
                  <FaCheckCircle />
                  ¡Incidencia registrada con éxito! Generando ticket...
                </div>
              )}

              {newError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
                  <FaExclamationTriangle />
                  {newError}
                </div>
              )}

              {/* Fila 1: Asunto */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  Asunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAsunto}
                  onChange={(e) => setNewAsunto(e.target.value)}
                  placeholder="Describe brevemente la falla"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 placeholder-slate-400 bg-white"
                />
              </div>

              {/* Fila 2: Categoría y Prioridad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                    Categoría
                  </label>
                  <select
                    value={newCategoria}
                    onChange={(e) => setNewCategoria(e.target.value as CategoriaIncidencia)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="redes">Redes</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                    Prioridad
                  </label>
                  <select
                    value={newPrioridad}
                    onChange={(e) => setNewPrioridad(e.target.value as PrioridadIncidencia)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="baja">Bajo</option>
                    <option value="media">Medio</option>
                    <option value="alta">Alto</option>
                    <option value="critica">Crítico</option>
                  </select>
                </div>
              </div>

              {/* Fila 3: Descripción detallada */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  Descripción detallada <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newDescripcion}
                  onChange={(e) => setNewDescripcion(e.target.value)}
                  placeholder="Describe paso a paso lo que ocurre, mensajes de error, etc."
                  rows={4}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 placeholder-slate-400 bg-white resize-none"
                />
              </div>

              {/* Fila 4: Equipo Afectado (Opcional) */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  Equipo afectado (opcional)
                </label>
                <input
                  type="text"
                  value={newEquipo}
                  onChange={(e) => setNewEquipo(e.target.value)}
                  placeholder="Seleccionar o escribir código de inventario"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 placeholder-slate-400 bg-white"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-6 py-2.5 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingNew}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition text-sm font-semibold flex items-center gap-2 shadow-sm shadow-blue-100 disabled:opacity-50"
                >
                  {submittingNew ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaPaperPlane size={12} />
                  )}
                  Enviar ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALLE DE TICKET (CUMPLIENDO CRITERIO 4) ──────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-blue-600 text-lg">
                  <FaInfoCircle />
                </span>
                <h2 className="text-lg font-bold text-slate-800">
                  Detalle del ticket: {selectedTicket.codigo_ticket}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Contenido del Detalle */}
            <div className="p-8 space-y-6">
              {/* Bloque Asunto */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Asunto / Título</span>
                <h3 className="text-lg font-bold text-slate-800 leading-snug">
                  {selectedTicket.titulo}
                </h3>
              </div>

              {/* Fila de Tags/Badges */}
              <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-4 bg-slate-50/50 px-4 rounded-xl">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoría</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 capitalize">
                    <FaTags size={10} className="text-slate-400" />
                    {selectedTicket.categoria}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prioridad</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPriorityStyle(selectedTicket.prioridad)}`}>
                    {getPriorityLabel(selectedTicket.prioridad)}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estado</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(selectedTicket.estado)}`}>
                    {getStatusLabel(selectedTicket.estado)}
                  </span>
                </div>
              </div>

              {/* Bloque Descripción */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descripción detallada</span>
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.descripcion}
                </p>
              </div>

              {/* Detalles Adicionales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                    <FaUser size={12} />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reportado por</span>
                    <span className="font-bold text-slate-700">
                      {selectedTicket.creador ? `${selectedTicket.creador.nombre} ${selectedTicket.creador.apellido}` : 'Sin identificar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                    <FaCalendarAlt size={12} />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fecha de creación</span>
                    <span className="font-bold text-slate-700">
                      {formatLongDate(selectedTicket.creado_en)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de modal */}
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl transition text-sm font-semibold shadow-sm shadow-slate-100"
              >
                Cerrar detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
