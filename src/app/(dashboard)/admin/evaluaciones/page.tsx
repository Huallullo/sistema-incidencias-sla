'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuSearch,
  LuLoader,
  LuX,
  LuTriangle,
  LuCircleCheck,
  LuStar,
  LuFilter,
  LuCalendar,
  LuUser,
  LuTicket,
  LuMessageSquare,
} from 'react-icons/lu';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { EvaluacionServicioDetallada, ConsultaEvaluacionesFilter } from '@/types/evaluacion';
import { consultarEvaluacionesAction } from '@/actions/evaluacionActions';
import { obtenerTecnicosAction, obtenerUsuariosAction } from '@/actions/incidenciasActions';

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed top-5 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-sm font-semibold border ${
        type === 'success'
          ? 'bg-white border-emerald-200 text-emerald-700'
          : 'bg-white border-red-200 text-red-600'
      }`}
    >
      {type === 'success' ? <LuCircleCheck className="text-lg text-emerald-500 shrink-0" /> : <LuTriangle className="text-lg text-red-500 shrink-0" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600 transition">
        <LuX />
      </button>
    </div>
  );
}

// Helper para formato de fecha larga
function formatLongDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
}

export default function EvaluacionesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionServicioDetallada[]>([]);
  const [tecnicos, setTecnicos] = useState<PerfilUsuario[]>([]);
  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>([]);
  
  // Filtros
  const [filterTecnicoId, setFilterTecnicoId] = useState('todos');
  const [filterUsuarioId, setFilterUsuarioId] = useState('todos');
  const [filterCalificacion, setFilterCalificacion] = useState('todas');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modales y Feedback
  const [selectedEval, setSelectedEval] = useState<EvaluacionServicioDetallada | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Proteger ruta para rol Jefe de TI
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

        if (profile.rol !== 'jefe_ti') {
          router.push('/dashboard');
          return;
        }

        setCurrentUser(profile);
        
        // Cargar listas de técnicos, usuarios y evaluaciones iniciales
        cargarListas();
      } catch (err) {
        console.error('Error cargando sesión en evaluaciones:', err);
        router.push('/login');
      }
    }
    loadSession();
  }, [router]);

  async function cargarListas() {
    setLoading(true);
    try {
      // 1. Obtener técnicos
      const tecRes = await obtenerTecnicosAction();
      if (tecRes.success && tecRes.data) {
        setTecnicos(tecRes.data);
      }

      // 2. Obtener usuarios creadores
      const usrRes = await obtenerUsuariosAction();
      if (usrRes.success && usrRes.data) {
        setUsuarios(usrRes.data);
      }

      // 3. Cargar evaluaciones iniciales
      await consultar();
    } catch (e) {
      console.error('Error al precargar listas de evaluaciones:', e);
      setToast({ message: 'Error de red al precargar los datos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function consultar(customFilters?: ConsultaEvaluacionesFilter) {
    // Obtener la sesión activa para el token de Supabase en el servidor
    const session = await AuthService.getSession();
    if (!session?.user?.id) return;

    const filterObj: ConsultaEvaluacionesFilter = customFilters || {
      tecnicoId: filterTecnicoId,
      usuarioId: filterUsuarioId,
      calificacion: filterCalificacion,
      fechaInicio: filterFechaInicio,
      fechaFin: filterFechaFin,
      busqueda: searchQuery,
    };

    const res = await consultarEvaluacionesAction(filterObj, session.user.id);
    if (res.success && res.data) {
      setEvaluaciones(res.data);
    } else {
      setEvaluaciones([]);
      if (res.error) {
        setToast({ message: res.error, type: 'error' });
      }
    }
  }

  // Disparador de búsqueda al cambiar los filtros interactivos
  useEffect(() => {
    if (currentUser) {
      consultar();
    }
  }, [filterTecnicoId, filterUsuarioId, filterCalificacion, filterFechaInicio, filterFechaFin]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    consultar();
  };

  const handleLimpiarFiltros = () => {
    setFilterTecnicoId('todos');
    setFilterUsuarioId('todos');
    setFilterCalificacion('todas');
    setFilterFechaInicio('');
    setFilterFechaFin('');
    setSearchQuery('');
    
    // Ejecutar con filtros en blanco
    consultar({
      tecnicoId: 'todos',
      usuarioId: 'todos',
      calificacion: 'todas',
      fechaInicio: '',
      fechaFin: '',
      busqueda: '',
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f3f4f6]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Top Bar ──────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Evaluaciones de Servicio</h1>
          <p className="text-xs text-slate-500 mt-0.5">Consulta e inspección de calidad e índices de satisfacción.</p>
        </div>
      </div>

      {/* ── Panel de Filtros ──────────────────────────────── */}
      <div className="p-8 pb-4 shrink-0">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
            <LuFilter className="text-blue-600" />
            <span>Filtros de Auditoría</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Técnico */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Técnico
              </label>
              <select
                value={filterTecnicoId}
                onChange={(e) => setFilterTecnicoId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="todos">Todos los técnicos</option>
                {tecnicos.map((t) => (
                  <option key={t.id_perfil} value={t.id_perfil}>
                    {t.nombre} {t.apellido}
                  </option>
                ))}
              </select>
            </div>

            {/* Usuario Reportante */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Usuario
              </label>
              <select
                value={filterUsuarioId}
                onChange={(e) => setFilterUsuarioId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="todos">Todos los usuarios</option>
                {usuarios.map((u) => (
                  <option key={u.id_perfil} value={u.id_perfil}>
                    {u.nombre} {u.apellido}
                  </option>
                ))}
              </select>
            </div>

            {/* Calificación */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Calificación
              </label>
              <select
                value={filterCalificacion}
                onChange={(e) => setFilterCalificacion(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="todas">Todas las calificaciones</option>
                <option value="5">5 Estrellas ★★★★★</option>
                <option value="4">4 Estrellas ★★★★☆</option>
                <option value="3">3 Estrellas ★★★☆☆</option>
                <option value="2">2 Estrellas ★★☆☆☆</option>
                <option value="1">1 Estrella ★☆☆☆☆</option>
              </select>
            </div>

            {/* Rango de Fechas */}
            <div className="grid grid-cols-2 gap-2 col-span-1 sm:col-span-2 md:col-span-1 lg:col-span-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Desde
                </label>
                <input
                  type="date"
                  value={filterFechaInicio}
                  onChange={(e) => setFilterFechaInicio(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filterFechaFin}
                  onChange={(e) => setFilterFechaFin(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
            {/* Formulario de Búsqueda Textual */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código de ticket, palabra clave, cliente o técnico..."
                className="w-full pl-9 pr-24 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
              >
                Buscar
              </button>
            </form>

            <button
              onClick={handleLimpiarFiltros}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-slate-600 font-semibold transition shrink-0 cursor-pointer"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* ── Contenido de la Tabla ────────────────────────── */}
      <div className="flex-1 px-8 pb-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-6 py-4 w-36">Ticket</th>
                <th className="px-4 py-4 w-52">Usuario</th>
                <th className="px-4 py-4 w-52">Técnico</th>
                <th className="px-4 py-4 w-36 text-center">Calificación</th>
                <th className="px-4 py-4">Comentario</th>
                <th className="px-6 py-4 w-44">Fecha Eval.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400">
                    <LuLoader className="animate-spin text-2xl mx-auto mb-2 text-blue-400" />
                    <span>Cargando evaluaciones de satisfacción...</span>
                  </td>
                </tr>
              ) : evaluaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400">
                    <LuStar className="text-4xl mx-auto mb-3 text-slate-200" />
                    <p className="font-semibold text-slate-600">No se encontraron evaluaciones registradas.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Ajusta los filtros o escribe otros términos de búsqueda.</p>
                  </td>
                </tr>
              ) : (
                evaluaciones.map((item) => (
                  <tr
                    key={item.id_evaluacion}
                    onClick={() => setSelectedEval(item)}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    {/* Ticket */}
                    <td className="px-6 py-4 font-bold text-blue-600">
                      #{item.incidencia?.codigo_ticket?.substring(4)}
                    </td>
                    {/* Usuario */}
                    <td className="px-4 py-4 text-slate-700 font-medium">
                      {item.incidencia?.creador
                        ? `${item.incidencia.creador.nombre} ${item.incidencia.creador.apellido}`
                        : 'Usuario Anónimo'}
                    </td>
                    {/* Técnico */}
                    <td className="px-4 py-4 text-slate-700">
                      {item.incidencia?.asignado
                        ? `${item.incidencia.asignado.nombre} ${item.incidencia.asignado.apellido}`
                        : <span className="text-slate-400 italic">Sin asignar</span>}
                    </td>
                    {/* Calificación */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-0.5 text-amber-400 text-sm">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star}>
                            {star <= item.calificacion ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </td>
                    {/* Comentario */}
                    <td className="px-4 py-4 text-slate-500 line-clamp-1 max-w-xs mt-1">
                      {item.comentario ? `"${item.comentario}"` : <span className="text-slate-300 italic">Sin comentarios</span>}
                    </td>
                    {/* Fecha */}
                    <td className="px-6 py-4 text-slate-400">
                      {formatLongDate(item.creado_en)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Detallado de Evaluación ────────────────── */}
      {selectedEval && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <LuStar className="text-amber-400 shrink-0 fill-amber-400" />
                  <span>Detalle de Evaluación</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Incidencia #{selectedEval.incidencia?.codigo_ticket?.substring(4)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEval(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <LuX />
              </button>
            </div>

            {/* Contenido */}
            <div className="px-6 py-5 space-y-5">
              {/* Bloque de Estrellas */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Calificación del Usuario
                </span>
                <div className="flex items-center gap-1 text-3xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star}>
                      {star <= selectedEval.calificacion ? (
                        <FaStar className="text-amber-400" />
                      ) : (
                        <FaRegStar className="text-slate-200" />
                      )}
                    </span>
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {selectedEval.calificacion} / 5 Estrellas
                </span>
              </div>

              {/* Comentarios del cliente */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <LuMessageSquare size={12} />
                  Retroalimentación Recibida
                </span>
                <p className="text-xs text-slate-700 bg-blue-50/30 border border-blue-100/50 rounded-xl p-3.5 italic leading-relaxed">
                  {selectedEval.comentario ? `"${selectedEval.comentario}"` : 'El usuario no ingresó comentarios adicionales.'}
                </p>
              </div>

              {/* Ficha técnica del ticket */}
              <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                  Información Técnica del Ticket
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <span className="block text-[10px] text-slate-400">Título de Incidencia</span>
                    <span className="font-semibold text-slate-700 text-sm">
                      {selectedEval.incidencia?.titulo || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="block text-[10px] text-slate-400 flex items-center gap-1">
                        <LuUser size={10} />
                        Usuario Creador
                      </span>
                      <span className="font-medium text-slate-600">
                        {selectedEval.incidencia?.creador
                          ? `${selectedEval.incidencia.creador.nombre} ${selectedEval.incidencia.creador.apellido}`
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400 flex items-center gap-1">
                        <LuUser size={10} />
                        Técnico Asignado
                      </span>
                      <span className="font-medium text-slate-600">
                        {selectedEval.incidencia?.asignado
                          ? `${selectedEval.incidencia.asignado.nombre} ${selectedEval.incidencia.asignado.apellido}`
                          : <span className="text-slate-300 italic">No asignado</span>}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-50">
                    <div>
                      <span className="block text-[10px] text-slate-400 flex items-center gap-1">
                        <LuCalendar size={10} />
                        Fecha Evaluación
                      </span>
                      <span className="text-slate-600">
                        {formatLongDate(selectedEval.creado_en)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400 flex items-center gap-1">
                        <LuTicket size={10} />
                        ID de Incidencia
                      </span>
                      <span className="text-slate-400 select-all font-mono text-[10px]">
                        {selectedEval.id_incidencia}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedEval(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
