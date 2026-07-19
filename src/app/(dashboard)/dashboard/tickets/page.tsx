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
  FaChevronLeft,
  FaChevronRight,
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
import { EstadoIncidencia, transicionesPermitidas, HistorialEstadoTicket } from '@/types/incidencias';
import {
  registrarEvaluacionAction,
  obtenerEvaluacionTicketAction,
} from '@/actions/evaluacionActions';
import { obtenerArticuloPorIncidenciaAction } from '@/actions/conocimientoActions';
import { obtenerDisponibilidadesAction } from '@/actions/disponibilidadActions';
import { DisponibilidadTecnico } from '@/types/disponibilidad';
import { obtenerPrioridadesAction } from '@/actions/prioridadesActions';
import { PrioridadServicio } from '@/types/prioridadServicio';
import { obtenerDetalleEquipoAction, obtenerEquiposAction } from '@/actions/equipoActions';
import { EvaluacionServicio } from '@/types/evaluacion';
import { ArticuloConocimiento } from '@/types/conocimiento';
import { DetalleEquipoInformatico, EquipoInformatico } from '@/types/equipo';

export const dynamic = 'force-dynamic';

export default function TicketsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Incidencia[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
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
  const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoInformatico[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [submittingNew, setSubmittingNew] = useState(false);
  const [newError, setNewError] = useState('');
  const [newSuccess, setNewSuccess] = useState(false);

  // Estado Modal Detalle Ticket
  const [selectedTicket, setSelectedTicket] = useState<Incidencia | null>(null);

  // Estado Historial del Ticket Seleccionado
  const [ticketHistory, setTicketHistory] = useState<HistorialEstadoTicket[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);

  // Estado Asignación de Técnicos
  const [tecnicos, setTecnicos] = useState<PerfilUsuario[]>([]);
  const [disponibilidadesHoy, setDisponibilidadesHoy] = useState<DisponibilidadTecnico[]>([]);
  const [prioridadesSLA, setPrioridadesSLA] = useState<PrioridadServicio[]>([]);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [assigneeError, setAssigneeError] = useState('');
  const [assigneeSuccess, setAssigneeSuccess] = useState(false);
  const [showFallasPrevias, setShowFallasPrevias] = useState(false);

  // Estados para Evaluación del Servicio
  const [evaluation, setEvaluation] = useState<EvaluacionServicio | null>(null);
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
        currentUser.id_auth_supabase
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

  const [kbArticle, setKbArticle] = useState<ArticuloConocimiento | null>(null);
  const [loadingKb, setLoadingKb] = useState(false);
  const [auditComments, setAuditComments] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditSuccess, setAuditSuccess] = useState(false);

  // Estados para Detalle del Equipo Afectado
  const [detalleEquipo, setDetalleEquipo] = useState<DetalleEquipoInformatico | null>(null);
  const [loadingDetalleEquipo, setLoadingDetalleEquipo] = useState(false);

  // Carga del detalle del equipo afectado cuando se selecciona un ticket
  useEffect(() => {
    setShowFallasPrevias(false);
    if (!selectedTicket?.id_equipo) {
      setDetalleEquipo(null);
      return;
    }

    const equipoId = selectedTicket.id_equipo;

    async function loadEquipoDetails() {
      setLoadingDetalleEquipo(true);
      const res = await obtenerDetalleEquipoAction(equipoId);
      if (res.success && res.data) {
        setDetalleEquipo(res.data);
      } else {
        setDetalleEquipo(null);
      }
      setLoadingDetalleEquipo(false);
    }
    loadEquipoDetails();
  }, [selectedTicket]);

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
      const tech = tecnicoId ? tecnicos.find(t => t.id_perfil === tecnicoId) : null;
      const updatedTicket: Incidencia = {
        ...selectedTicket,
        asignado_a: tecnicoId,
        asignado: tech ? { nombre: tech.nombre, apellido: tech.apellido } : null
      };
      setSelectedTicket(updatedTicket);

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

  // Carga de Técnicos, disponibilidades y prioridades SLA para el dropdown y visualizaciones
  useEffect(() => {
    if (!currentUser?.id_auth_supabase) return;
    const authId = currentUser.id_auth_supabase;

    async function loadInitialData() {
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

      // Cargar configuraciones de SLA de la BD
      const prioRes = await obtenerPrioridadesAction();
      if (prioRes.success && prioRes.data) {
        setPrioridadesSLA(prioRes.data);
      }
    }

    loadInitialData();
  }, [currentUser]);

  // Carga y Filtrado de Tickets
  useEffect(() => {
    if (!currentUser?.id_auth_supabase) return;
    const authId = currentUser.id_auth_supabase;

    async function fetchTickets() {
      setLoadingTickets(true);
      setErrorMsg('');

      const filtros: {
        busqueda?: string;
        categoria?: string;
        prioridad?: string;
        fechaInicio?: string;
        fechaFin?: string;
        estado?: string;
      } = {
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
        setCurrentPage(1);
      } else {
        setErrorMsg(result.error || 'Error al recuperar los tickets');
        setCurrentPage(1);
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
        ...(newEquipo ? { id_equipo: newEquipo } : {}),
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

  const itemsPerPage = 10;
  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = tickets.slice(startIndex, startIndex + itemsPerPage);

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
            onClick={async () => {
              setIsNewModalOpen(true);
              setLoadingEquipos(true);
              const res = await obtenerEquiposAction({ estado_operativo: 'operativo' });
              if (res.success && res.data) setEquiposDisponibles(res.data);
              setLoadingEquipos(false);
            }}
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
            {currentItems.map((ticket) => (
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

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Mostrando <span className="font-semibold text-slate-700">{startIndex + 1}</span> al{' '}
                  <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, tickets.length)}</span> de{' '}
                  <span className="font-semibold text-slate-700">{tickets.length}</span> tickets
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentPage((p) => Math.max(p - 1, 1)); }}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <FaChevronLeft size={12} />
                  </button>
                  <span className="text-xs text-slate-600 font-semibold px-1">
                    Pág. {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentPage((p) => Math.min(p + 1, totalPages)); }}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <FaChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
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
                {loadingEquipos ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2.5">
                    <FaSpinner className="animate-spin" />
                    Cargando equipos registrados...
                  </div>
                ) : (
                  <select
                    value={newEquipo}
                    onChange={(e) => setNewEquipo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 bg-white"
                  >
                    <option value="">-- Sin equipo afectado --</option>
                    {equiposDisponibles.map((eq) => (
                      <option key={eq.id_equipo} value={eq.id_equipo}>
                        {eq.nombre} — {eq.codigo} ({eq.tipo})
                      </option>
                    ))}
                  </select>
                )}
                {equiposDisponibles.length === 0 && !loadingEquipos && (
                  <p className="text-[10px] text-slate-400 mt-1">No hay equipos registrados en el sistema.</p>
                )}
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] my-auto flex flex-col border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
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
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
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

              {/* Monitoreo en Vivo de SLA */}
              <SLAWidget ticket={selectedTicket} prioridades={prioridadesSLA} />

              {/* Bloque Descripción */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descripción detallada</span>
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.descripcion}
                </p>
              </div>

              {/* Ficha Técnica del Equipo Afectado e Historial de Fallas */}
              {selectedTicket.id_equipo && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 shrink-0">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Dispositivo Afectado y Antecedentes
                  </span>

                  {loadingDetalleEquipo ? (
                    <div className="flex justify-center items-center py-4">
                      <FaSpinner className="animate-spin text-blue-600 text-sm" />
                    </div>
                  ) : detalleEquipo ? (
                    <div className="space-y-3">
                      {/* Información técnica del hardware */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-white border border-slate-100 rounded-xl p-3.5 shadow-2xs">
                        <div>
                          <span className="block text-[9px] font-semibold text-slate-400 uppercase">Código Inventario</span>
                          <span className="font-bold text-slate-700">{detalleEquipo.codigo}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-semibold text-slate-400 uppercase">Nombre / Tipo</span>
                          <span className="font-bold text-slate-700 capitalize">{detalleEquipo.nombre} ({detalleEquipo.tipo})</span>
                        </div>
                        <div className="mt-1">
                          <span className="block text-[9px] font-semibold text-slate-400 uppercase">Marca y Modelo</span>
                          <span className="font-semibold text-slate-600">{detalleEquipo.marca} - {detalleEquipo.modelo}</span>
                        </div>
                        <div className="mt-1">
                          <span className="block text-[9px] font-semibold text-slate-400 uppercase">Ubicación Física</span>
                          <span className="font-semibold text-slate-600">{detalleEquipo.ubicacion}</span>
                        </div>
                        <div className="col-span-2 mt-1 border-t border-slate-50 pt-1.5 flex items-center justify-between">
                          <span className="text-[9px] font-semibold text-slate-400 uppercase">Estado Operativo</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            detalleEquipo.estado_operativo === 'operativo'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : detalleEquipo.estado_operativo === 'mantenimiento'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {detalleEquipo.estado_operativo}
                          </span>
                        </div>
                      </div>

                      {/* Historial colapsable de incidencias previas */}
                      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setShowFallasPrevias((prev) => !prev)}
                          className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50/50 transition cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-700">
                            Ver historial de fallas (hasta 10 incidencias previas)
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold">
                            {showFallasPrevias ? 'Contraer' : 'Expandir'}
                          </span>
                        </button>

                        {showFallasPrevias && (
                          <div className="px-3 pb-3 pt-1 border-t border-slate-50 space-y-2 max-h-36 overflow-y-auto">
                            {detalleEquipo.incidencias?.filter((i) => i.id_incidencia !== selectedTicket?.id_incidencia).length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-1">Sin incidencias reportadas anteriormente.</p>
                            ) : (
                              detalleEquipo.incidencias
                                ?.filter((i) => i.id_incidencia !== selectedTicket?.id_incidencia)
                                .map((inc) => (
                                  <div key={inc.id_incidencia} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-b-0">
                                    <div className="min-w-0 pr-2">
                                      <span className="font-semibold text-slate-700 block truncate">{inc.titulo}</span>
                                      <span className="text-[10px] text-slate-400">Código: #{inc.codigo_ticket.substring(4)}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                      inc.estado === 'abierto'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : inc.estado === 'en_progreso'
                                        ? 'bg-sky-50 text-sky-700 border border-sky-100'
                                        : inc.estado === 'resuelto'
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                      {inc.estado}
                                    </span>
                                  </div>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No se pudo cargar la ficha técnica del equipo.</p>
                  )}
                </div>
              )}

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

// Componente de Visualización en Vivo del Acuerdo de Nivel de Servicio (SLA)
function SLAWidget({
  ticket,
  prioridades,
}: {
  ticket: Incidencia;
  prioridades: PrioridadServicio[];
}) {
  const [now, setNow] = useState(Date.now());

  // Actualizar el cronómetro cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const config = prioridades.find((p) => p.nivel === ticket.prioridad);
  const fallback = {
    critica: { tiempo_respuesta_min: 15, tiempo_resolucion_min: 120 },
    alta: { tiempo_respuesta_min: 30, tiempo_resolucion_min: 240 },
    media: { tiempo_respuesta_min: 60, tiempo_resolucion_min: 480 },
    baja: { tiempo_respuesta_min: 120, tiempo_resolucion_min: 960 },
  };
  const slas = config || fallback[ticket.prioridad] || fallback.baja;

  const fechaCreacion = new Date(ticket.creado_en);
  const limiteRespuesta = new Date(fechaCreacion.getTime() + slas.tiempo_respuesta_min * 60000);
  const limiteResolucion = new Date(fechaCreacion.getTime() + slas.tiempo_resolucion_min * 60000);

  // 1. SLA de Respuesta
  let respuestaCumplida = ticket.estado !== 'abierto';
  let minutosRespuesta = Math.round((limiteRespuesta.getTime() - now) / 60000);
  let respuestaExpirada = minutosRespuesta <= 0;

  // 2. SLA de Resolución
  let resolucionCumplida = ticket.estado === 'resuelto' || ticket.estado === 'cerrado';
  let minutosResolucion = 0;
  let resolucionExpirada = false;

  if (resolucionCumplida) {
    const fechaFin = ticket.fecha_cierre
      ? new Date(ticket.fecha_cierre)
      : new Date(ticket.actualizado_en || ticket.creado_en);
    minutosResolucion = Math.round((limiteResolucion.getTime() - fechaFin.getTime()) / 60000);
    resolucionExpirada = minutosResolucion < 0;
  } else {
    minutosResolucion = Math.round((limiteResolucion.getTime() - now) / 60000);
    resolucionExpirada = minutosResolucion <= 0;
  }

  const formatMinutosLabel = (m: number) => {
    const absMin = Math.abs(m);
    if (absMin < 60) return `${absMin} min`;
    const horas = Math.floor(absMin / 60);
    const mins = absMin % 60;
    return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
  };

  return (
    <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/30 space-y-3 shrink-0">
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Monitoreo de SLA (Tiempos de Servicio)
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* SLA DE RESPUESTA */}
        <div
          className={`border rounded-xl p-3 flex flex-col justify-between min-h-[72px] transition ${
            respuestaCumplida
              ? 'bg-emerald-50/50 text-emerald-800 border-emerald-100/70'
              : respuestaExpirada
              ? 'bg-rose-50/50 text-rose-800 border-rose-100/70'
              : 'bg-amber-50/50 text-amber-800 border-amber-100/70'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wide opacity-80 mb-1">
            <span>SLA Respuesta</span>
            <span>Límite: {slas.tiempo_respuesta_min} min</span>
          </div>

          <div className="flex items-center gap-2 mt-auto">
            {respuestaCumplida ? (
              <>
                <FaCheckCircle className="text-emerald-500 shrink-0 text-sm" />
                <span className="font-bold">Atendido a tiempo</span>
              </>
            ) : respuestaExpirada ? (
              <>
                <FaExclamationTriangle className="text-rose-500 shrink-0 text-sm animate-pulse" />
                <span className="font-bold">Expirado por {formatMinutosLabel(minutosRespuesta)}</span>
              </>
            ) : (
              <>
                <FaSpinner className="text-amber-500 shrink-0 text-sm animate-spin" />
                <span className="font-bold">Restan {formatMinutosLabel(minutosRespuesta)}</span>
              </>
            )}
          </div>
        </div>

        {/* SLA DE RESOLUCIÓN */}
        <div
          className={`border rounded-xl p-3 flex flex-col justify-between min-h-[72px] transition ${
            resolucionCumplida && !resolucionExpirada
              ? 'bg-emerald-50/50 text-emerald-800 border-emerald-100/70'
              : resolucionExpirada
              ? 'bg-rose-50/50 text-rose-800 border-rose-100/70'
              : minutosResolucion < 30
              ? 'bg-amber-50/50 text-amber-800 border-amber-100/70'
              : 'bg-blue-50/50 text-blue-800 border-blue-100/70'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wide opacity-80 mb-1">
            <span>SLA Resolución</span>
            <span>Límite: {formatMinutosLabel(slas.tiempo_resolucion_min)}</span>
          </div>

          <div className="flex items-center gap-2 mt-auto">
            {resolucionCumplida ? (
              resolucionExpirada ? (
                <>
                  <FaExclamationTriangle className="text-rose-500 shrink-0 text-sm" />
                  <span className="font-bold">Excedido por {formatMinutosLabel(minutosResolucion)}</span>
                </>
              ) : (
                <>
                  <FaCheckCircle className="text-emerald-500 shrink-0 text-sm" />
                  <span className="font-bold">Resuelto a tiempo</span>
                </>
              )
            ) : resolucionExpirada ? (
              <>
                <FaExclamationTriangle className="text-rose-500 shrink-0 text-sm animate-pulse" />
                <span className="font-bold">Vencido hace {formatMinutosLabel(minutosResolucion)}</span>
              </>
            ) : (
              <>
                <FaSpinner className="text-blue-500 shrink-0 text-sm animate-spin" />
                <span className="font-bold">Restan {formatMinutosLabel(minutosResolucion)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
