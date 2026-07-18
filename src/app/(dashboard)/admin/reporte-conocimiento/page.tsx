'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuLoader, LuX, LuTriangle, LuCircleCheck, LuFilter, LuLibrary,
  LuFileSpreadsheet, LuFileText, LuSearch, LuRefreshCcw,
} from 'react-icons/lu';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { FiltroReporteConocimiento, ReporteConocimientoResult } from '@/types/reporteConocimiento';
import { generarReporteConocimientoAction } from '@/actions/reporteConocimientoActions';
import { obtenerTecnicosAction } from '@/actions/incidenciasActions';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-5 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold border ${
      type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-red-200 text-red-600'
    }`}>
      {type === 'success' ? <LuCircleCheck className="text-lg text-emerald-500 shrink-0" /> : <LuTriangle className="text-lg text-red-500 shrink-0" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600 transition"><LuX /></button>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-1 ${color}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-3xl font-extrabold leading-none">{value}</span>
      {sub && <span className="text-xl font-bold opacity-60 mt-0.5 max-w-[280px] truncate text-[11px] block">{sub}</span>}
    </div>
  );
}

// ─── Helper traducción categorías ─────────────────────────────────────────────
const getCategoriaLabel = (cat: string) => {
  switch (cat.toLowerCase()) {
    case 'hardware': return 'Hardware';
    case 'software': return 'Software';
    case 'redes':    return 'Redes';
    default:         return 'Otros';
  }
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ReporteConocimientoPage() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [reportData, setReportData] = useState<ReporteConocimientoResult | null>(null);
  const [autores, setAutores]       = useState<PerfilUsuario[]>([]);
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [busqueda, setBusqueda]     = useState('');

  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin]       = useState('');
  const [categoria, setCategoria]     = useState('todas');
  const [autorId, setAutorId]         = useState('todos');

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await AuthService.getSession();
        if (!session?.user?.id) { router.push('/login'); return; }
        const profile = await PerfilesRepository.getProfileByUserId(session.user.id);
        if (!profile || profile.rol !== 'jefe_ti') { router.push('/dashboard'); return; }
        setAuthUserId(session.user.id);
        
        // Cargar técnicos autores
        const tecRes = await obtenerTecnicosAction();
        if (tecRes.success && tecRes.data) setAutores(tecRes.data);
      } catch { router.push('/login'); }
    }
    loadSession();
  }, [router]);

  const generarReporte = useCallback(async () => {
    if (!authUserId) return;
    setLoading(true);
    setReportData(null);
    const filtros: FiltroReporteConocimiento = { fechaInicio, fechaFin, categoria, autorId };
    const res = await generarReporteConocimientoAction(filtros, authUserId);
    if (res.success && res.data) {
      setReportData(res.data);
    } else {
      setToast({ message: res.error ?? 'Error al generar el reporte', type: 'error' });
    }
    setLoading(false);
  }, [authUserId, fechaInicio, fechaFin, categoria, autorId]);

  const limpiarFiltros = () => {
    setFechaInicio(''); setFechaFin('');
    setCategoria('todas'); setAutorId('todos');
    setBusqueda(''); setReportData(null);
  };

  const articulosFiltrados = (reportData?.articulos ?? []).filter((art) =>
    !busqueda ||
    art.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
    art.autor.toLowerCase().includes(busqueda.toLowerCase()) ||
    art.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ─── Exportar PDF ────────────────────────────────────────────────────────
  const exportarPDF = async () => {
    if (!reportData) return;
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });

      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Reporte de Uso de Base de Conocimiento', 14, 18);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${new Date().toLocaleString('es-PE')}  |  Total Artículos: ${reportData.resumen.total_articulos}  |  Total Consultas: ${reportData.resumen.total_consultas}`, 14, 26);

      const rows = articulosFiltrados.map((art) => [
        art.titulo,
        getCategoriaLabel(art.categoria),
        art.autor,
        art.total_consultas.toString(),
        new Date(art.fecha_creacion).toLocaleDateString('es-PE'),
      ]);

      autoTable(doc, {
        startY: 32,
        head: [['Título del Artículo', 'Categoría', 'Autor/Técnico', 'Consultas', 'Fecha Creación']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`reporte_uso_conocimiento_${new Date().toISOString().slice(0, 10)}.pdf`);
      setToast({ message: 'PDF exportado correctamente.', type: 'success' });
    } catch { setToast({ message: 'Error al generar el PDF.', type: 'error' }); }
  };

  // ─── Exportar Excel ──────────────────────────────────────────────────────
  const exportarExcel = async () => {
    if (!reportData) return;
    try {
      const XLSX = await import('xlsx');
      const resumen = XLSX.utils.aoa_to_sheet([
        ['REPORTE DE USO Y CONSULTAS DE LA BASE DE CONOCIMIENTO'],
        ['Generado', new Date().toLocaleString('es-PE')],
        [],
        ['Total Artículos en Reporte', reportData.resumen.total_articulos],
        ['Total Consultas / Vistas', reportData.resumen.total_consultas],
        ['Categoría Más Consultada (Falla Recurrente)', reportData.resumen.categoria_mas_consultada],
        ['Artículo Más Consultado (Solución Común)', reportData.resumen.articulo_mas_consultado],
      ]);

      const rows = articulosFiltrados.map((art) => ({
        'Título del Artículo': art.titulo,
        Categoría: getCategoriaLabel(art.categoria),
        Autor: art.autor,
        'Total Consultas': art.total_consultas,
        'Fecha Creación': new Date(art.fecha_creacion).toLocaleDateString('es-PE'),
      }));

      const detalle = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, resumen, 'Resumen KPIs');
      XLSX.utils.book_append_sheet(wb, detalle, 'Artículos más Consultados');
      XLSX.writeFile(wb, `reporte_uso_conocimiento_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToast({ message: 'Excel exportado correctamente.', type: 'success' });
    } catch { setToast({ message: 'Error al generar el Excel.', type: 'error' }); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f3f4f6]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <LuLibrary className="text-blue-600" /> Reporte de Base de Conocimiento
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Artículos de conocimiento más consultados, fallas recurrentes y soluciones más utilizadas.</p>
        </div>
        {reportData && (
          <div className="flex items-center gap-2">
            <button onClick={exportarPDF}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer">
              <LuFileText size={14} />Exportar PDF
            </button>
            <button onClick={exportarExcel}
              className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition cursor-pointer">
              <LuFileSpreadsheet size={14} />Exportar Excel
            </button>
          </div>
        )}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="p-8 pb-4 shrink-0">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
            <LuFilter className="text-blue-600" />
            <span>Criterios de Consulta</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[
              { label: 'Desde', el: <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /> },
              { label: 'Hasta', el: <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /> },
              { label: 'Categoría Artículo', el: <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"><option value="todas">Todas</option><option value="hardware">Hardware</option><option value="software">Software</option><option value="redes">Redes</option><option value="otros">Otros</option></select> },
              { label: 'Autor del Artículo', el: <select value={autorId} onChange={e => setAutorId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"><option value="todos">Todos</option>{autores.map(a => <option key={a.id_perfil} value={a.id_perfil}>{a.nombre} {a.apellido}</option>)}</select> },
            ].map(({ label, el }) => (
              <div key={label}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
                {el}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por título, autor o categoría..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs" />
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={limpiarFiltros} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-slate-600 font-semibold transition cursor-pointer">Limpiar</button>
              <button onClick={generarReporte} disabled={loading || !authUserId}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 cursor-pointer">
                {loading ? <LuLoader className="animate-spin" size={14} /> : <LuRefreshCcw size={14} />}
                {loading ? 'Generando...' : 'Generar Reporte'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Estado vacío ─────────────────────────────────────────────────── */}
      {!reportData && !loading && (
        <div className="flex-1 flex items-center justify-center px-8 pb-8">
          <div className="text-center">
            <LuLibrary className="text-6xl text-slate-200 mx-auto mb-4" />
            <p className="text-slate-700 font-bold text-lg">Sin datos de reporte</p>
            <p className="text-slate-400 text-sm mt-1">Configura los filtros y presiona <span className="font-semibold text-blue-600">Generar Reporte</span>.</p>
          </div>
        </div>
      )}

      {/* ── Cargando ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LuLoader className="animate-spin text-4xl text-blue-500 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Calculando consultas a la base de conocimiento...</p>
          </div>
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────────── */}
      {reportData && !loading && (
        <div className="flex-1 px-8 pb-8 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard label="Total Artículos" value={reportData.resumen.total_articulos} sub="registrados en el sistema" color="bg-white border-slate-200 text-slate-800" />
            <KPICard label="Consultas Totales" value={reportData.resumen.total_consultas} sub="vistas en el rango de fechas" color="bg-blue-50 border-blue-200 text-blue-800" />
            <KPICard label="Falla Más Recuente" value={reportData.resumen.categoria_mas_consultada} sub="categoría con más lecturas" color="bg-amber-50 border-amber-200 text-amber-800" />
            <KPICard label="Solución Más Utilizada" value={reportData.resumen.articulo_mas_consultado.split(' ')[0]} sub={reportData.resumen.articulo_mas_consultado} color="bg-emerald-50 border-emerald-200 text-emerald-800" />
          </div>

          {/* Tabla consolidada */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Artículos más consultados ({articulosFiltrados.length})
              </span>
              <span className="text-[10px] text-slate-400">Ordenados de mayor a menor frecuencia</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" id="tabla-reporte-conocimiento">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Título del Artículo de Conocimiento</th>
                    <th className="px-4 py-3.5 text-center">Categoría</th>
                    <th className="px-4 py-3.5">Autor/Técnico</th>
                    <th className="px-4 py-3.5 text-center text-blue-600">Consultas / Vistas</th>
                    <th className="px-4 py-3.5 text-center">Fecha de Creación</th>
                  </tr>
                </thead>
                <tbody>
                  {articulosFiltrados.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-16 text-slate-400">No hay artículos que coincidan con los filtros aplicados.</td></tr>
                  ) : (
                    articulosFiltrados.map((art) => (
                      <tr key={art.id_articulo} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-700 max-w-[320px] truncate">{art.titulo}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            art.categoria === 'hardware' ? 'bg-amber-100 text-amber-700' :
                            art.categoria === 'software' ? 'bg-sky-100 text-sky-700' :
                            art.categoria === 'redes'    ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {getCategoriaLabel(art.categoria)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">{art.autor}</td>
                        <td className="px-4 py-3.5 text-center text-blue-600 font-extrabold text-sm">{art.total_consultas}</td>
                        <td className="px-4 py-3.5 text-center text-slate-400">{new Date(art.fecha_creacion).toLocaleDateString('es-PE')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
