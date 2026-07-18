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
  FaStar,
  FaRegStar,
} from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { Incidencia, CategoriaIncidencia, PrioridadIncidencia } from '@/types/incidencias';
import {
  consultarIncidenciasAction,
  registrarIncidenciaAction,
  actualizarEstadoTicketAction,
  obtenerHistorialTicketAction,
  obtenerTecnicosAction,
  asignarTecnicoAction,
  cerrarTicketAuditadoAction,
} from '@/actions/incidenciasActions';
import { EstadoIncidencia, transicionesPermitidas } from '@/types/incidencias';
import {
  registrarEvaluacionAction,
  obtenerEvaluacionTicketAction,
} from '@/actions/evaluacionActions';
import { obtenerArticuloPorIncidenciaAction } from '@/actions/conocimientoActions';
import { obtenerDisponibilidadesAction } from '@/actions/disponibilidadActions';
import { DisponibilidadTecnico } from '@/types/disponibilidad';

export const dynamic = 'force-dynamic';

export default function TicketsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Incidencia[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // Estado Historial del Ticket Seleccionado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);

  // Estado Asignación de Técnicos
  const [tecnicos, setTecnicos] = useState<PerfilUsuario[]>([]);
  const [disponibilidadesHoy, setDisponibilidadesHoy] = useState<DisponibilidadTecnico[]>([]);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [assigneeError, setAssigneeError] = useState('');
  const [assigneeSuccess, setAssigneeSuccess] = useState(false);

  // Estados para Evaluación del Servicio
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [evalRating, setEvalRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [evalComment, setEvalComment] = useState<string>('');
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [evalSuccess, setEvalSuccess] = useState(false);

  // Carga de evaluación cuando se selecciona un ticket
  useEffect(() => {
    if (!selectedTicket?.id_incidencia) {
      setEvaluation(null);
      setEvalError('');
      setEvalSuccess(false);
      setEvalComment('');
      setEvalRating(5);
      return;
    }

    const ticketId = selectedTicket.id_incidencia;

    async function loadEvaluation() {
      setLoadingEvaluation(true);
      const res = await obtenerEvaluacionTicketAction(ticketId);
      if (res.success && res.data) {
        setEvaluation(res.data);
      } else {
        setEvaluation(null);
      }
      setLoadingEvaluation(false);
    }
    loadEvaluation();
  }, [selectedTicket]);

  const handleSubmittingEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !currentUser?.id_auth_supabase) return;

    setSubmittingEval(true);
    setEvalError('');
    setEvalSuccess(false);

    try {
      const res = await registrarEvaluacionAction(
        {
          id_incidencia: selectedTicket.id_incidencia,
          calificacion: evalRating,
          comentario: evalComment.trim() || null,
        },
        currentUser.id_perfil
      );

      if (res.success && res.data) {
        setEvalSuccess(true);
        setEvaluation(res.data);
        setEvalComment('');
        setRefreshTrigger((prev) => prev + 1);
        router.refresh();
      } else {
        setEvalError(res.error || 'Error al registrar la calificación.');
      }
    } catch (err) {
      setEvalError('Error de red al intentar registrar la evaluación.');
    } finally {
      setSubmittingEval(false);
    }
  };

  // Estados para Auditoría y Cierre (Jefe de TI)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [kbArticle, setKbArticle] = useState<any | null>(null);
  const [loadingKb, setLoadingKb] = useState(false);
  const [auditComments, setAuditComments] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditSuccess, setAuditSuccess] = useState(false);

  // Carga de artículo de conocimiento cuando se selecciona un ticket
  useEffect(() => {
    if (!selectedTicket?.id_incidencia) {
      setKbArticle(null);
      setAuditComments('');
      setAuditError('');
      setAuditSuccess(false);
      return;
    }

    const ticketId = selectedTicket.id_incidencia;

    async function loadKbArticle() {
      setLoadingKb(true);
      const res = await obtenerArticuloPorIncidenciaAction(ticketId);
      if (res.success && res.data) {
        setKbArticle(res.data);
      } else {
        setKbArticle(null);
      }
      setLoadingKb(false);
    }
    loadKbArticle();
  }, [selectedTicket]);

  const handleSubmittingAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !currentUser?.id_auth_supabase) return;

    setSubmittingAudit(true);
    setAuditError('');
    setAuditSuccess(false);

    try {
      const res = await cerrarTicketAuditadoAction(
        selectedTicket.id_incidencia,
        auditComments.trim(),
        currentUser.id_auth_supabase
      );

      if (res.success && res.data) {
        setAuditSuccess(true);
        setAuditComments('');
        setRefreshTrigger((prev) => prev + 1);
        router.refresh();
        
        const fechaCierre = res.data.fecha_cierre;
        const cerradoPor = res.data.cerrado_por;
        const obsCierre = res.data.observaciones_cierre;

        // Actualizar ticket seleccionado en la UI con los datos de cierre devueltos por el servidor
        const updatedTicket = { 
          ...selectedTicket, 
          estado: 'cerrado' as const,
          fecha_cierre: fechaCierre,
          cerrado_por: cerradoPor,
          observaciones_cierre: obsCierre
        };
        setSelectedTicket(updatedTicket);

        // Actualizar la grilla local de tickets
        setTickets((prev) =>
          prev.map((t) => (t.id_incidencia === selectedTicket.id_incidencia ? { 
            ...t, 
            estado: 'cerrado' as const,
            fecha_cierre: fechaCierre,
            cerrado_por: cerradoPor,
            observaciones_cierre: obsCierre
          } : t))
        );

        // Forzar actualización del historial
        const histResult = await obtenerHistorialTicketAction(selectedTicket.id_incidencia);
        if (histResult.success) {
          setTicketHistory(histResult.data || []);
        }
      } else {
        setAuditError(res.error || 'Error al procesar el cierre definitivo del ticket.');
      }
    } catch (err) {
      setAuditError('Error de red al intentar auditar y cerrar.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  // Carga del Historial cuando se selecciona un ticket
  useEffect(() => {
    if (!selectedTicket?.id_incidencia) {
      setTicketHistory([]);
      setStatusUpdateError('');
      setStatusUpdateSuccess(false);
      return;
    }

    const ticketId = selectedTicket.id_incidencia;

    async function loadHistory() {
      setLoadingHistory(true);
      const result = await obtenerHistorialTicketAction(ticketId);
      if (result.success) {
        setTicketHistory(result.data || []);
      } else {
        console.error('Error cargando historial:', result.error);
      }
      setLoadingHistory(false);
    }

    loadHistory();
  }, [selectedTicket]);

  // Manejo de actualización de estado
  const handleUpdateStatus = async (nuevoEstado: EstadoIncidencia) => {
    if (!selectedTicket || !currentUser?.id_auth_supabase) return;
    setUpdatingStatus(true);
    setStatusUpdateError('');
    setStatusUpdateSuccess(false);

    const result = await actualizarEstadoTicketAction(
      selectedTicket.id_incidencia,
      nuevoEstado,
      currentUser.id_auth_supabase
    );

    if (result.success && result.data) {
      setStatusUpdateSuccess(true);
      setRefreshTrigger((prev) => prev + 1);
      router.refresh();
      
      const updatedTicket = { ...selectedTicket, estado: nuevoEstado };
      setSelectedTicket(updatedTicket);
      
      setTickets((prev) =>
        prev.map((t) => (t.id_incidencia === selectedTicket.id_incidencia ? { ...t, estado: nuevoEstado } : t))
      );

      const histResult = await obtenerHistorialTicketAction(selectedTicket.id_incidencia);
      if (histResult.success) {
        setTicketHistory(histResult.data || []);
      }

      setTimeout(() => {
        setStatusUpdateSuccess(false);
      }, 2500);
    } else {
      setStatusUpdateError(result.error || 'Ocurrió un error al actualizar el estado');
    }
    setUpdatingStatus(false);
  };

  // Manejo de actualización de asignación
  const handleAssignTecnico = async (tecnicoId: string | null) => {
    if (!selectedTicket || !currentUser?.id_auth_supabase) return;
    setUpdatingAssignee(true);
    setAssigneeError('');
    setAssigneeSuccess(false);

    const result = await asignarTecnicoAction(
      selectedTicket.id_incidencia,
      tecnicoId,
      currentUser.id_auth_supabase
    );

    if (result.success && result.data) {
      setAssigneeSuccess(true);
      setRefreshTrigger((prev) => prev + 1);
      router.refresh();
      
      // Actualizar ticket seleccionado en UI
      const updatedTicket = {
        ...selectedTicket,
        asignado_a: tecnicoId,
        asignado: tecnicoId ? tecnicos.find(t => t.id_perfil === tecnicoId) || null : null
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSelectedTicket(updatedTicket as any);

      // Actualizar lista de tickets
      setTickets((prev) =>
        prev.map((t) => (t.id_incidencia === selectedTicket.id_incidencia ? { 
          ...t, 
          asignado_a: tecnicoId, 
          asignado: tecnicoId ? { nombre: tecnicos.find(x => x.id_perfil === tecnicoId)?.nombre || '', apellido: tecnicos.find(x => x.id_perfil === tecnicoId)?.apellido || '' } : null 
        } : t))
      );

      setTimeout(() => {
        setAssigneeSuccess(false);
      }, 2500);
    } else {
      setAssigneeError(result.error || 'Ocurrió un error al asignar el técnico');
    }
    setUpdatingAssignee(false);
  };

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

  // Carga de Técnicos y sus disponibilidades para el dropdown de asignación
  useEffect(() => {
    if (!currentUser?.id_auth_supabase) return;
    const authId = currentUser.id_auth_supabase;

    async function loadTecnicosAndAvailability() {
      const res = await obtenerTecnicosAction();
      if (res.success && res.data) {
        setTecnicos(res.data);
      }

      // Obtener la fecha de hoy en formato local YYYY-MM-DD
      const hoyStr = new Date().toLocaleDateString('sv-SE');
      const dispRes = await obtenerDisponibilidadesAction(
        { fecha_inicio: hoyStr, fecha_fin: hoyStr },
        authId
      );
      if (dispRes.success && dispRes.data) {
        setDisponibilidadesHoy(dispRes.data);
      }
    }

    loadTecnicosAndAvailability();
  }, [currentUser]);

  // Carga y Filtrado de Tickets
  useEffect(() => {
    if (!currentUser?.id_auth_supabase) return;
    const authId = currentUser.id_auth_supabase;

    async function fetchTickets() {
      setLoadingTickets(true);
      setErrorMsg('');

      // Construcción de filtros para Server Action
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [currentUser, filtroPill, busqueda, categoria, prioridad, fechaInicio, fechaFin, refreshTrigger]);

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
      setRefreshTrigger((prev) => prev + 1);
      router.refresh();
      
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

              {/* Gestión de Estado (Técnicos y Jefes de TI) */}
              {(currentUser?.id_rol === 1 || currentUser?.id_rol === 2) && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Gestión de Estado
                  </span>
                  
                  {statusUpdateSuccess && (
                    <div className="mb-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-500 shrink-0" />
                      <span>¡Estado del ticket actualizado con éxito!</span>
                    </div>
                  )}

                  {statusUpdateError && (
                    <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs flex items-center gap-2">
                      <FaExclamationTriangle className="text-red-500 shrink-0" />
                      <span>{statusUpdateError}</span>
                    </div>
                  )}

                  {selectedTicket.estado === 'cerrado' ? (
                    <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                      Este ticket se encuentra Cerrado y no admite más transiciones de estado.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500 mr-2 font-medium">Cambiar a:</span>
                      {transicionesPermitidas[selectedTicket.estado]?.map((nextState) => (
                        <button
                          key={nextState}
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleUpdateStatus(nextState)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border hover:shadow-sm ${
                            nextState === 'en_progreso' ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' :
                            nextState === 'resuelto' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' :
                            nextState === 'cerrado' ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' :
                            nextState === 'abierto' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {updatingStatus ? <FaSpinner className="animate-spin text-xs" /> : null}
                          {getStatusLabel(nextState)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Asignación de Técnico (Técnicos y Jefes de TI) */}
              {(currentUser?.id_rol === 1 || currentUser?.id_rol === 2) && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Técnico Responsable de Atención
                  </span>

                  {assigneeSuccess && (
                    <div className="mb-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-500 shrink-0" />
                      <span>¡Técnico asignado con éxito!</span>
                    </div>
                  )}

                  {assigneeError && (
                    <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs flex items-center gap-2">
                      <FaExclamationTriangle className="text-red-500 shrink-0" />
                      <span>{assigneeError}</span>
                    </div>
                  )}

                  {currentUser?.id_rol === 1 ? (
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedTicket.asignado_a || ''}
                        onChange={(e) => handleAssignTecnico(e.target.value || null)}
                        disabled={updatingAssignee || selectedTicket.estado === 'cerrado'}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                      >
                        <option value="">Sin asignar / Pendiente</option>
                        {tecnicos.map((tec) => {
                          const dispHoy = disponibilidadesHoy.find((d) => d.id_tecnico === tec.id_perfil);
                          let label = `${tec.nombre} ${tec.apellido}`;
                          if (dispHoy) {
                            if (dispHoy.estado === 'disponible') {
                              label = `🟢 Disponible (${dispHoy.hora_inicio.substring(0, 5)} - ${dispHoy.hora_fin.substring(0, 5)}) — ${label}`;
                            } else {
                              label = `🔴 No Disponible — ${label}`;
                            }
                          } else {
                            label = `⚪ Sin Turno Hoy — ${label}`;
                          }
                          return (
                            <option key={tec.id_perfil} value={tec.id_perfil}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      {updatingAssignee && <FaSpinner className="animate-spin text-blue-600 text-xs shrink-0" />}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                      <FaUser size={12} className="text-slate-400" />
                      <span>
                        {selectedTicket.asignado
                          ? `${selectedTicket.asignado.nombre} ${selectedTicket.asignado.apellido}`
                          : 'Sin asignar / Pendiente'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline de Historial de Cambios (Criterio de aceptación 4) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Historial de Cambios de Estado
                </span>
                
                {loadingHistory ? (
                  <div className="flex justify-center items-center py-4">
                    <FaSpinner className="animate-spin text-blue-600 text-sm" />
                  </div>
                ) : ticketHistory.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">
                    No se registran cambios de estado previos para este ticket.
                  </div>
                ) : (
                  <div className="relative pl-4 border-l border-slate-200 space-y-4">
                    {ticketHistory.map((hist) => (
                      <div key={hist.id_historial} className="relative">
                        {/* Dot indicador */}
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white bg-blue-500 shadow-sm"></span>
                        
                        <div className="text-xs">
                          <span className="font-bold text-slate-700">
                            Transición: {getStatusLabel(hist.estado_anterior)} ➔ {getStatusLabel(hist.estado_nuevo)}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Por: {hist.responsable ? `${hist.responsable.nombre} ${hist.responsable.apellido}` : 'Sistema'} — {formatLongDate(hist.creado_en)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección de Evaluación del Servicio (Solo si el ticket está Cerrado) */}
              {selectedTicket.estado === 'cerrado' && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Evaluación del Servicio
                  </span>
                  
                  {loadingEvaluation ? (
                    <div className="flex justify-center items-center py-2">
                      <FaSpinner className="animate-spin text-blue-600 text-xs" />
                    </div>
                  ) : evaluation ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-xl">
                            {star <= evaluation.calificacion ? (
                              <FaStar className="text-amber-400" />
                            ) : (
                              <FaRegStar className="text-slate-300" />
                            )}
                          </span>
                        ))}
                        <span className="text-xs font-bold text-slate-500 ml-2">
                          ({evaluation.calificacion} / 5)
                        </span>
                      </div>
                      {evaluation.comentario && (
                        <p className="text-xs text-slate-600 italic bg-white border border-slate-100 rounded-lg p-2.5">
                          "{evaluation.comentario}"
                        </p>
                      )}
                      <span className="block text-[10px] text-slate-400 mt-1">
                        Calificado por el usuario el {formatLongDate(evaluation.creado_en)}
                      </span>
                    </div>
                  ) : currentUser && currentUser.id_rol === 3 && selectedTicket.creado_por === currentUser.id_perfil ? (
                    <form onSubmit={handleSubmittingEvaluation} className="space-y-4">
                      {evalSuccess && (
                        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs flex items-center gap-2">
                          <FaCheckCircle className="text-emerald-500 shrink-0" />
                          <span>¡Calificación registrada con éxito! Gracias por tu retroalimentación.</span>
                        </div>
                      )}
                      {evalError && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs flex items-center gap-2">
                          <FaExclamationTriangle className="text-red-500 shrink-0" />
                          <span>{evalError}</span>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1.5 font-semibold">Califica la atención recibida *</label>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setEvalRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              className="text-2xl transition hover:scale-110 focus:outline-none cursor-pointer"
                            >
                              {(hoverRating !== null ? star <= hoverRating : star <= evalRating) ? (
                                <FaStar className="text-amber-400" />
                              ) : (
                                <FaRegStar className="text-slate-300 hover:text-amber-200" />
                              )}
                            </button>
                          ))}
                          <span className="text-xs font-bold text-slate-500 ml-2">
                            ({evalRating} / 5 estrellas)
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1.5 font-semibold">Comentario u observaciones (Opcional)</label>
                        <textarea
                          rows={3}
                          value={evalComment}
                          onChange={(e) => setEvalComment(e.target.value)}
                          placeholder="Brinda comentarios sobre la atención o sugerencias de mejora..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 resize-none"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={submittingEval}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-100 disabled:opacity-75 cursor-pointer"
                      >
                        {submittingEval ? <FaSpinner className="animate-spin text-xs" /> : <FaPaperPlane size={10} />}
                        <span>{submittingEval ? 'Registrando...' : 'Registrar Calificación'}</span>
                      </button>
                    </form>
                  ) : (
                    <div className="text-xs font-semibold text-slate-400 italic">
                      Sin evaluaciones registradas. Solo el propietario del ticket puede calificar la atención.
                    </div>
                  )}
                </div>
              )}

              {/* Sección de Auditoría y Cierre Definitivo (Solo para Jefe de TI) */}
              {currentUser?.id_rol === 1 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Auditoría de Cierre Definitivo
                  </span>

                  {/* 1. Mostrar solución de KB asociada (si existe) */}
                  <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Solución Registrada (Base de Conocimiento)
                    </span>
                    {loadingKb ? (
                      <div className="flex justify-center items-center py-2">
                        <FaSpinner className="animate-spin text-blue-600 text-xs" />
                      </div>
                    ) : kbArticle ? (
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-slate-700">{kbArticle.titulo}</div>
                        <div className="text-slate-500">
                          <span className="font-semibold text-slate-600">Pasos de Solución:</span> {kbArticle.solucion_pasos}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-red-500 font-semibold italic flex items-center gap-1.5">
                        <FaExclamationTriangle className="text-red-400" />
                        Sin solución registrada en la base de conocimientos.
                      </div>
                    )}
                  </div>

                  {/* 2. Si el ticket está resuelto, mostrar formulario de cierre */}
                  {selectedTicket.estado === 'resuelto' && (
                    <form onSubmit={handleSubmittingAudit} className="space-y-3">
                      {auditSuccess && (
                        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs flex items-center gap-2">
                          <FaCheckCircle className="text-emerald-500 shrink-0" />
                          <span>¡El ticket ha sido auditado y cerrado definitivamente con éxito!</span>
                        </div>
                      )}
                      {auditError && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs flex items-center gap-2">
                          <FaExclamationTriangle className="text-red-500 shrink-0" />
                          <span>{auditError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1.5 font-semibold">
                          Observaciones de Auditoría de Cierre * (mínimo 10 caracteres)
                        </label>
                        <textarea
                          rows={3}
                          value={auditComments}
                          onChange={(e) => setAuditComments(e.target.value)}
                          placeholder="Ingresa las observaciones de auditoría respecto a la atención recibida..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 resize-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingAudit || !kbArticle}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-100 disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAudit ? <FaSpinner className="animate-spin text-xs" /> : <FaCheckCircle size={10} />}
                        <span>{submittingAudit ? 'Procesando...' : 'Aprobar Cierre Definitivo'}</span>
                      </button>
                    </form>
                  )}

                  {/* 3. Si el ticket ya está cerrado, mostrar info de auditoría guardada */}
                  {selectedTicket.estado === 'cerrado' && selectedTicket.observaciones_cierre && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <FaCheckCircle />
                        Cierre Definitivo Auditado
                      </div>
                      <div className="text-slate-600">
                        <span className="font-semibold text-slate-700">Observaciones:</span> "{selectedTicket.observaciones_cierre}"
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Cerrado el {formatLongDate(selectedTicket.fecha_cierre || '')}
                      </div>
                    </div>
                  )}

                  {/* 4. Si el ticket está en otro estado (abierto, en_progreso), advertir que no se puede cerrar */}
                  {(selectedTicket.estado === 'abierto' || selectedTicket.estado === 'en_progreso') && (
                    <div className="text-xs font-semibold text-slate-400 italic bg-white border border-slate-100 rounded-xl p-3.5">
                      El ticket debe estar en estado "Resuelto" con solución registrada para poder proceder con la auditoría de cierre.
                    </div>
                  )}
                </div>
              )}

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
