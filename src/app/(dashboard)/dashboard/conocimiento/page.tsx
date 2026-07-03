'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuSearch,
  LuPlus,
  LuBookOpen,
  LuLibrary,
  LuX,
  LuUser,
  LuLink,
  LuClock,
  LuTriangle,
  LuCircleCheck,
  LuFileText,
} from 'react-icons/lu';
import { FaSpinner } from 'react-icons/fa';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { ArticuloConocimiento, CategoriaArticulo, registroArticuloSchema } from '@/types/conocimiento';
import { Incidencia } from '@/types/incidencias';
import { registrarArticuloAction, obtenerArticulosAction } from '@/actions/conocimientoActions';
import { obtenerTodasLasIncidenciasAction } from '@/actions/incidenciasActions';

export const dynamic = 'force-dynamic';

export default function ConocimientoPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados de Artículos
  const [articulos, setArticulos] = useState<ArticuloConocimiento[]>([]);
  const [loadingArticulos, setLoadingArticulos] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticuloConocimiento | null>(null);

  // Estados del Buscador y Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Estados del Formulario (Creación)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketsResueltos, setTicketsResueltos] = useState<Incidencia[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<CategoriaArticulo>('software');
  const [descripcionProblema, setDescripcionProblema] = useState('');
  const [solucionPasos, setSolucionPasos] = useState('');
  const [idIncidencia, setIdIncidencia] = useState<string>('');

  // Estados de Operación y Validaciones
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Carga de Artículos (con búsqueda)
  useEffect(() => {
    if (loading) return;
    
    async function fetchArticulos() {
      setLoadingArticulos(true);
      const res = await obtenerArticulosAction({
        query: searchQuery,
        categoria: selectedCategory || undefined,
      });
      if (res.success && res.data) {
        setArticulos(res.data);
      }
      setLoadingArticulos(false);
    }

    const timer = setTimeout(() => {
      fetchArticulos();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, loading]);

  // Cargar tickets para vinculación al abrir modal
  useEffect(() => {
    if (!isModalOpen) return;

    async function fetchTickets() {
      setLoadingTickets(true);
      const res = await obtenerTodasLasIncidenciasAction();
      if (res.success && res.data) {
        // Filtrar solo tickets resueltos o cerrados
        const filtered = res.data.filter(
          (t) => t.estado === 'resuelto' || t.estado === 'cerrado'
        );
        setTicketsResueltos(filtered);
      }
      setLoadingTickets(false);
    }
    fetchTickets();
  }, [isModalOpen]);

  // Mostrar Notificaciones (Toast)
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Enviar Formulario
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id_auth_supabase) return;

    setValidationErrors({});
    setSaveError('');
    setIsSaving(true);

    const inputData = {
      titulo,
      categoria,
      descripcion_problema: descripcionProblema,
      solucion_pasos: solucionPasos,
      id_incidencia: idIncidencia || null,
    };

    // Validar en el cliente localmente con Zod
    const validation = registroArticuloSchema.safeParse(inputData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        fieldErrors[path] = issue.message;
      });
      setValidationErrors(fieldErrors);
      setIsSaving(false);
      return;
    }

    // Llamar al Server Action
    const result = await registrarArticuloAction(
      inputData,
      currentUser.id_auth_supabase
    );

    if (result.success && result.data) {
      showToast('success', '¡Artículo de conocimiento publicado con éxito!');
      
      // Limpiar Formulario
      setTitulo('');
      setCategoria('software');
      setDescripcionProblema('');
      setSolucionPasos('');
      setIdIncidencia('');
      setIsModalOpen(false);

      // Recargar lista de artículos
      const refresh = await obtenerArticulosAction();
      if (refresh.success && refresh.data) {
        setArticulos(refresh.data);
      }
    } else {
      setSaveError(result.error || 'Ocurrió un error al guardar el artículo.');
    }
    setIsSaving(false);
  };

  // Helper para traducir categorías
  const getCategoriaLabel = (cat: string) => {
    switch (cat) {
      case 'hardware':
        return 'Hardware';
      case 'software':
        return 'Software';
      case 'redes':
        return 'Redes';
      default:
        return 'Otros';
    }
  };

  // Helper de estilos de badge para categorías
  const getCategoriaBadgeStyles = (cat: string) => {
    switch (cat) {
      case 'hardware':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'software':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'redes':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <FaSpinner className="animate-spin text-blue-600 text-3xl" />
      </div>
    );
  }

  const isAuthorizedToCreate = currentUser?.id_rol === 1 || currentUser?.id_rol === 2;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl animate-fade-in transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
              : 'bg-red-50 text-red-800 border-red-100'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <LuCircleCheck className="text-emerald-500 text-xl shrink-0" />
          ) : (
            <LuTriangle className="text-red-500 text-xl shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <LuLibrary className="text-blue-600 shrink-0" />
            Base de Conocimiento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consulta y registra diagnósticos, guías técnicas y soluciones aplicadas en incidencias.
          </p>
        </div>

        {isAuthorizedToCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition hover:shadow-md active:scale-95"
          >
            <LuPlus size={18} />
            Nuevo Artículo
          </button>
        )}
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <LuSearch className="absolute left-3.5 top-3 text-slate-400 text-lg" />
          <input
            type="text"
            placeholder="Buscar por título, problema o solución..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 text-slate-700"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
          >
            <option value="">Todas las Categorías</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="redes">Redes</option>
            <option value="otros">Otros</option>
          </select>
        </div>
      </div>

      {/* Listado de Artículos */}
      {loadingArticulos ? (
        <div className="flex justify-center items-center py-20">
          <FaSpinner className="animate-spin text-blue-600 text-3xl" />
        </div>
      ) : articulos.length === 0 ? (
        <div className="bg-white border border-slate-150 rounded-2xl p-12 text-center text-slate-400 italic shadow-sm flex flex-col items-center justify-center gap-3">
          <LuBookOpen size={40} className="text-slate-300" />
          <span>No se encontraron artículos de conocimiento registrados con los filtros aplicados.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articulos.map((art) => (
            <div
              key={art.id_articulo}
              onClick={() => setSelectedArticle(art)}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer hover:border-blue-200 flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getCategoriaBadgeStyles(
                      art.categoria
                    )}`}
                  >
                    {getCategoriaLabel(art.categoria)}
                  </span>
                  
                  {art.id_incidencia && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                      <LuLink size={10} />
                      {art.incidencia?.codigo_ticket || 'Ticket Vinculado'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-blue-600 transition">
                  {art.titulo}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-3">
                  {art.descripcion_problema}
                </p>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <LuUser size={12} />
                  {art.autor ? `${art.autor.nombre} ${art.autor.apellido}` : 'Soporte TI'}
                </span>
                
                <span className="flex items-center gap-1 font-medium">
                  <LuClock size={12} />
                  {new Date(art.creado_en).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: NUEVO ARTÍCULO ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-150">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <LuBookOpen className="text-blue-600 shrink-0" />
                Registrar Artículo de Conocimiento
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <LuX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="p-6 overflow-y-auto space-y-4 flex-1">
              {saveError && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
                  <LuTriangle className="text-red-500 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Título */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Título del Artículo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Falla de red DHCP y renovación de IP"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.titulo ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
                {validationErrors.titulo && (
                  <p className="text-[10px] text-red-600 font-semibold">{validationErrors.titulo}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoría */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaArticulo)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="software">Software</option>
                    <option value="hardware">Hardware</option>
                    <option value="redes">Redes</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                {/* Ticket Asociado (Opcional) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Ticket Resuelto Relacionado
                    <span className="text-[10px] text-slate-400 font-medium lowercase italic">
                      (opcional)
                    </span>
                  </label>
                  <select
                    value={idIncidencia}
                    onChange={(e) => setIdIncidencia(e.target.value)}
                    disabled={loadingTickets}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Ninguno / Sin vincular</option>
                    {ticketsResueltos.map((t) => (
                      <option key={t.id_incidencia} value={t.id_incidencia}>
                        {t.codigo_ticket} - {t.titulo.substring(0, 30)}
                        {t.titulo.length > 30 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                  {loadingTickets && (
                    <p className="text-[10px] text-slate-400 italic">Cargando tickets...</p>
                  )}
                </div>
              </div>

              {/* Descripción del problema */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Descripción del Problema (Síntomas) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalla los síntomas del fallo o comportamiento inusual reportado..."
                  value={descripcionProblema}
                  onChange={(e) => setDescripcionProblema(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.descripcion_problema ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
                {validationErrors.descripcion_problema && (
                  <p className="text-[10px] text-red-600 font-semibold">
                    {validationErrors.descripcion_problema}
                  </p>
                )}
              </div>

              {/* Pasos de la solución */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pasos de la Solución Aplicada <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe la secuencia ordenada de pasos, comandos o ajustes realizados para solucionarlo..."
                  value={solucionPasos}
                  onChange={(e) => setSolucionPasos(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.solucion_pasos ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
                {validationErrors.solucion_pasos && (
                  <p className="text-[10px] text-red-600 font-semibold">
                    {validationErrors.solucion_pasos}
                  </p>
                )}
              </div>

              {/* Botonera de Envío */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow active:scale-95 disabled:opacity-60"
                >
                  {isSaving ? <FaSpinner className="animate-spin text-xs" /> : null}
                  Publicar Artículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALLE DEL ARTÍCULO ────────────────────────────────────── */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-150 bg-slate-50/50">
              <div className="space-y-1">
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${getCategoriaBadgeStyles(
                    selectedArticle.categoria
                  )}`}
                >
                  {getCategoriaLabel(selectedArticle.categoria)}
                </span>
                <h2 className="text-base font-bold text-slate-800 leading-snug">
                  {selectedArticle.titulo}
                </h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <LuX size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Información General / Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200/50 rounded-2xl text-slate-600">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Autor
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <LuUser size={13} className="text-slate-400" />
                    <span>
                      {selectedArticle.autor
                        ? `${selectedArticle.autor.nombre} ${selectedArticle.autor.apellido}`
                        : 'Soporte TI'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Fecha de Publicación
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <LuClock size={13} className="text-slate-400" />
                    <span>
                      {new Date(selectedArticle.creado_en).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {selectedArticle.id_incidencia && (
                  <div className="col-span-2 space-y-1 border-t border-slate-200/60 pt-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Ticket Relacionado
                    </span>
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <LuLink size={13} className="text-blue-500 shrink-0" />
                      <span className="text-blue-600 hover:underline cursor-pointer">
                        {selectedArticle.incidencia?.codigo_ticket} - {selectedArticle.incidencia?.titulo}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Síntomas / Descripción */}
              <div className="space-y-2 border border-slate-200 p-4 bg-slate-50/20 rounded-2xl">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <LuTriangle size={13} className="text-amber-500 shrink-0" />
                  Descripción del Problema (Síntomas)
                </h4>
                <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.descripcion_problema}
                </p>
              </div>

              {/* Solución / Pasos */}
              <div className="space-y-2 border border-slate-200 p-4 bg-slate-50/20 rounded-2xl">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <LuFileText size={13} className="text-emerald-500 shrink-0" />
                  Pasos de la Solución Aplicada
                </h4>
                <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap bg-white border border-slate-100 p-3.5 rounded-xl">
                  {selectedArticle.solucion_pasos}
                </p>
              </div>
            </div>

            <div className="flex justify-end p-5 bg-slate-50 border-t border-slate-150">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
