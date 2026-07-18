'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuSearch,
  LuMonitor,
  LuLoader,
  LuX,
  LuCircleCheck,
  LuTag,
  LuInfo,
  LuMapPin,
  LuLayers,
  LuHistory,
  LuShieldAlert,
  LuActivity,
} from 'react-icons/lu';
import { obtenerEquiposAction, obtenerDetalleEquipoAction } from '@/actions/equipoActions';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { EquipoInformatico, EstadoEquipo } from '@/types/equipo';

// ─── Componente Modal de Detalles Completo ──────────────────────────────────
function DetalleEquipoModal({
  idEquipo,
  onClose,
}: {
  idEquipo: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [equipo, setEquipo] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      const result = await obtenerDetalleEquipoAction(idEquipo);
      if (result.success && result.data) {
        setEquipo(result.data);
      } else {
        setError(result.error || 'No se pudo cargar el detalle del equipo.');
      }
      setLoading(false);
    }
    loadDetails();
  }, [idEquipo]);

  const getStatusBadge = (status: string) => {
    const config = {
      operativo: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      mantenimiento: 'bg-amber-50 text-amber-700 border-amber-100',
      inoperativo: 'bg-red-50 text-red-700 border-red-100',
    }[status] || 'bg-slate-50 text-slate-700 border-slate-100';
    
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${config}`}>
        {status}
      </span>
    );
  };

  const getTicketStatusBadge = (status: string) => {
    const config = {
      abierto: 'bg-blue-50 text-blue-700 border-blue-100',
      en_progreso: 'bg-purple-50 text-purple-700 border-purple-100',
      resuelto: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      cerrado: 'bg-slate-50 text-slate-700 border-slate-100',
    }[status] || 'bg-slate-50 text-slate-700 border-slate-100';

    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${config}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <LuMonitor className="text-blue-600" />
              <span>Detalles del Activo de Hardware</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Especificaciones técnicas e historial de fallas del equipo</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
            <LuX />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <LuLoader className="text-3xl text-blue-600 animate-spin" />
              <p className="text-slate-500 text-sm font-semibold">Cargando historial del equipo...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <LuShieldAlert className="shrink-0 text-red-500 text-lg" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Resumen del equipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Equipo</span>
                    <p className="text-sm font-bold text-slate-800">{equipo.nombre}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código Patrimonial</span>
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <LuTag className="text-slate-400" />
                      <span>{equipo.codigo}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo & Estado</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded uppercase tracking-wider">
                        {equipo.tipo}
                      </span>
                      {getStatusBadge(equipo.estado_operativo)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marca / Modelo</span>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                      <LuInfo className="text-slate-400" />
                      <span>{equipo.marca} {equipo.modelo}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número de Serie (Fabricante)</span>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                      <LuLayers className="text-slate-400" />
                      <span>{equipo.numero_serie}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ubicación Física</span>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                      <LuMapPin className="text-slate-400" />
                      <span>{equipo.ubicacion}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Registro Info */}
              <div className="text-xs text-slate-400 flex flex-wrap gap-4 border-b border-slate-100 pb-4">
                <span>
                  Registrado por:{' '}
                  <strong className="text-slate-500 font-semibold">
                    {equipo.usuario_registro?.nombre} {equipo.usuario_registro?.apellido}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Fecha de alta:{' '}
                  <strong className="text-slate-500 font-semibold">
                    {new Date(equipo.fecha_registro).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </strong>
                </span>
              </div>

              {/* Historial de Incidencias */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <LuHistory className="text-blue-500" />
                  <span>Historial de Reportes de Fallas / Incidencias</span>
                </h3>

                {(!equipo.incidencias || equipo.incidencias.length === 0) ? (
                  <div className="bg-slate-50/40 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <p className="text-slate-400 text-sm font-medium">
                      Este equipo no cuenta con incidentes técnicos reportados.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {equipo.incidencias.map((ticket: any) => (
                      <div
                        key={ticket.id_incidencia}
                        className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-slate-200 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">#{ticket.codigo_ticket}</span>
                            {getTicketStatusBadge(ticket.estado)}
                          </div>
                          <h4 className="text-sm font-bold text-slate-700 line-clamp-1">{ticket.titulo}</h4>
                        </div>

                        <div className="text-[11px] text-slate-400 sm:text-right shrink-0">
                          <span className="block">Fecha reporte:</span>
                          <span className="font-semibold text-slate-500">
                            {new Date(ticket.fecha_creacion).toLocaleDateString('es-PE', {
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
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal de Consulta ───────────────────────────────────────
export default function ConsultaEquiposPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [equipos, setEquipos] = useState<EquipoInformatico[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Filtros interactivos
  const [filters, setFilters] = useState({
    query: '',
    tipo: 'all',
    estado_operativo: 'all',
    ubicacion: 'all',
  });

  // Lista dinámica de ubicaciones encontradas para filtrar
  const [ubicacionesDisponibles, setUbicacionesDisponibles] = useState<string[]>([]);
  
  // Selección para modal
  const [selectedEquipoId, setSelectedEquipoId] = useState<string | null>(null);

  // 1. Verificar sesión de autenticación (cualquier rol)
  useEffect(() => {
    async function checkAuth() {
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

        setCurrentUser(profile);
      } catch (err) {
        console.error('Error verificando sesión:', err);
        router.push('/login');
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Cargar equipos desde el servidor aplicando filtros
  const fetchEquipos = async () => {
    setLoadingList(true);
    const result = await obtenerEquiposAction({
      query: filters.query,
      tipo: filters.tipo,
      estado_operativo: filters.estado_operativo,
      ubicacion: filters.ubicacion,
    });
    
    if (result.success && result.data) {
      setEquipos(result.data);

      // Cargar lista única de ubicaciones sólo en la primera carga si no se ha filtrado
      if (filters.query === '' && filters.tipo === 'all' && filters.estado_operativo === 'all' && filters.ubicacion === 'all') {
        const ubs = Array.from(new Set(result.data.map((e) => e.ubicacion).filter(Boolean)));
        setUbicacionesDisponibles(ubs);
      }
    }
    setLoadingList(false);
  };

  useEffect(() => {
    if (!loadingAuth && currentUser) {
      fetchEquipos();
    }
  }, [loadingAuth, currentUser, filters.tipo, filters.estado_operativo, filters.ubicacion]);

  // Manejador del buscador (búsqueda al presionar Enter o hacer clic en buscar)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEquipos();
  };

  const handleClearFilters = () => {
    setFilters({
      query: '',
      tipo: 'all',
      estado_operativo: 'all',
      ubicacion: 'all',
    });
  };

  // Escucha de limpieza del input query
  useEffect(() => {
    if (filters.query === '') {
      fetchEquipos();
    }
  }, [filters.query]);

  // Render Loader General
  if (loadingAuth) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <LuLoader className="text-4xl text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Cargando inventario de equipos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <LuMonitor className="text-blue-600" />
          <span>Consulta de Equipos Informáticos</span>
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Revise las especificaciones técnicas de los activos de hardware y su historial de fallas asociadas.
        </p>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <LuSearch className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Buscar por código patrimonial, nombre o número de serie..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-blue-700 transition"
          >
            Buscar
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-50 pt-4">
          {/* Clasificación por Tipo */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Tipo de Equipo</label>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="laptop">Laptop</option>
              <option value="desktop">Desktop</option>
              <option value="servidor">Servidor</option>
              <option value="switch">Switch</option>
              <option value="router">Router</option>
              <option value="impresora">Impresora</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Filtrar por Estado Operativo */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Estado Operativo</label>
            <select
              value={filters.estado_operativo}
              onChange={(e) => setFilters({ ...filters, estado_operativo: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="operativo">Operativo</option>
              <option value="mantenimiento">En Mantenimiento</option>
              <option value="inoperativo">Inoperativo</option>
            </select>
          </div>

          {/* Filtrar por Ubicación Física */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Ubicación Física</label>
            <select
              value={filters.ubicacion}
              onChange={(e) => setFilters({ ...filters, ubicacion: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Todas las ubicaciones</option>
              {ubicacionesDisponibles.map((ub) => (
                <option key={ub} value={ub}>
                  {ub}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listado Grilla de Tarjetas */}
      {loadingList ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm animate-pulse flex flex-col gap-4">
              <div className="h-4 bg-slate-200 rounded-lg w-1/4"></div>
              <div className="h-6 bg-slate-200 rounded-lg w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded-lg w-1/2"></div>
              <div className="h-8 bg-slate-200 rounded-lg mt-2"></div>
            </div>
          ))}
        </div>
      ) : equipos.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <LuMonitor className="text-2xl" />
          </div>
          <h3 className="font-bold text-slate-800">No se encontraron equipos</h3>
          <p className="text-slate-500 text-sm mt-1.5">
            No existen activos de hardware que coincidan con la combinación de filtros y términos de búsqueda aplicados.
          </p>
          {(filters.query || filters.tipo !== 'all' || filters.estado_operativo !== 'all' || filters.ubicacion !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipos.map((equipo) => {
            const statusConfig = {
              operativo: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Operativo' },
              mantenimiento: { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Mantenimiento' },
              inoperativo: { bg: 'bg-red-50 text-red-700 border-red-100', label: 'Inoperativo' },
            }[equipo.estado_operativo] || { bg: 'bg-slate-50 text-slate-700 border-slate-100', label: equipo.estado_operativo };

            return (
              <div
                key={equipo.id_equipo}
                onClick={() => setSelectedEquipoId(equipo.id_equipo)}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col gap-4 relative overflow-hidden cursor-pointer group"
              >
                {/* Categorías y Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {equipo.tipo}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusConfig.bg}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Nombre y Código */}
                <div>
                  <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-blue-600 transition line-clamp-1">
                    {equipo.nombre}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <LuTag />
                    <span>Código: {equipo.codigo}</span>
                  </div>
                </div>

                {/* Información rápida */}
                <div className="border-t border-slate-50 pt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><LuInfo /> Marca/Modelo</span>
                    <span className="font-semibold text-slate-700">{equipo.marca} {equipo.modelo}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><LuLayers /> N/S</span>
                    <span className="font-semibold text-slate-700">{equipo.numero_serie}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><LuMapPin /> Ubicación</span>
                    <span className="font-semibold text-slate-700 truncate max-w-[150px]">{equipo.ubicacion}</span>
                  </div>
                </div>

                {/* Acción Click */}
                <div className="border-t border-slate-50 pt-2 flex items-center justify-end text-xs text-blue-600 font-bold gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <LuActivity className="text-sm" />
                  <span>Ver historial y detalles</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalles Completo */}
      {selectedEquipoId && (
        <DetalleEquipoModal
          idEquipo={selectedEquipoId}
          onClose={() => setSelectedEquipoId(null)}
        />
      )}
    </div>
  );
}
