'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuLoader, LuX, LuTriangle, LuCircleCheck, LuFilter, LuHeart,
  LuFileSpreadsheet, LuFileText, LuSearch, LuRefreshCcw, LuStar,
} from 'react-icons/lu';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { FiltroReporteSatisfaccion, ReporteSatisfaccionResult, EvaluacionDetalleReporte } from '@/types/reporteSatisfaccion';
import { generarReporteSatisfaccionAction } from '@/actions/reporteSatisfaccionActions';
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
      {sub && <span className="text-[11px] opacity-60 mt-0.5">{sub}</span>}
    </div>
  );
}

// ─── Rating Stars ─────────────────────────────────────────────────────────────
function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((s) => (
        <LuStar
          key={s}
          className={`text-xs ${
            s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

// ─── UI del Reporte de Satisfacción ───────────────────────────────────────────
export default function ReporteSatisfaccionPage() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [reportData, setReportData] = useState<ReporteSatisfaccionResult | null>(null);
  const [tecnicos, setTecnicos]     = useState<PerfilUsuario[]>([]);
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [busqueda, setBusqueda]     = useState('');

  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin]       = useState('');
  const [tecnicoId, setTecnicoId]     = useState('todos');
  const [categoria, setCategoria]     = useState('todas');
  const [prioridad, setPrioridad]     = useState('todas');

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await AuthService.getSession();
        if (!session?.user?.id) { router.push('/login'); return; }
        const profile = await PerfilesRepository.getProfileByUserId(session.user.id);
        if (!profile || profile.rol !== 'jefe_ti') { router.push('/dashboard'); return; }
        setAuthUserId(session.user.id);
        const tecRes = await obtenerTecnicosAction();
        if (tecRes.success && tecRes.data) setTecnicos(tecRes.data);
      } catch { router.push('/login'); }
    }
    loadSession();
  }, [router]);

  const generarReporte = useCallback(async () => {
    if (!authUserId) return;
    setLoading(true);
    setReportData(null);
    const filtros: FiltroReporteSatisfaccion = { fechaInicio, fechaFin, tecnicoId, categoria, prioridad };
    const res = await generarReporteSatisfaccionAction(filtros, authUserId);
    if (res.success && res.data) {
      setReportData(res.data);
    } else {
      setToast({ message: res.error ?? 'Error al generar el reporte', type: 'error' });
    }
    setLoading(false);
  }, [authUserId, fechaInicio, fechaFin, tecnicoId, categoria, prioridad]);

  const limpiarFiltros = () => {
    setFechaInicio(''); setFechaFin('');
    setTecnicoId('todos'); setCategoria('todas'); setPrioridad('todas');
    setBusqueda(''); setReportData(null);
  };

  const evaluacionesFiltradas: EvaluacionDetalleReporte[] = (reportData?.evaluaciones ?? []).filter((e) =>
    !busqueda ||
    e.codigo_ticket.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.titulo_incidencia.toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.comentario?.toLowerCase() ?? '').includes(busqueda.toLowerCase()) ||
    e.tecnico_asignado.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.usuario_creador.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ─── Exportar PDF ────────────────────────────────────────────────────────
  const exportarPDF = async () => {
    if (!reportData) return;
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const primaryBlue: [number, number, number] = [30, 64, 175];
      const lightBlue: [number, number, number] = [239, 246, 255];
      const white: [number, number, number] = [255, 255, 255];
      const darkText: [number, number, number] = [15, 23, 42];
      const mutedText: [number, number, number] = [100, 116, 139];

      // ── HEADER BAND ──────────────────────────────────────────────
      doc.setFillColor(...primaryBlue);
      doc.rect(0, 0, pageW, 38, 'F');

      doc.setTextColor(...white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('HELP DESK SLA TI', 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Reporte de Satisfacción del Usuario — Evaluación del Servicio', 14, 24);

      doc.setFontSize(8);
      const now = new Date().toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
      doc.text(`Generado: ${now}`, pageW - 14, 16, { align: 'right' });
      doc.text(`Total evaluaciones: ${reportData.resumen.total_evaluaciones}`, pageW - 14, 24, { align: 'right' });

      // ── SEPARATOR ────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 42, pageW - 14, 42);

      // ── KPI SUMMARY ROW ──────────────────────────────────────────
      let yPos = 46;
      const kpis = [
        { label: 'Total Evaluaciones',  value: String(reportData.resumen.total_evaluaciones) },
        { label: 'Calif. Promedio',     value: `${reportData.resumen.promedio_calificacion}/5` },
        { label: 'Nivel Satisfacción',  value: `${reportData.resumen.porcentaje_satisfaccion}%` },
        { label: '5 Estrellas',         value: String(reportData.resumen.distribucion.cinco_estrellas) },
      ];
      const kpiBoxW = (pageW - 28) / kpis.length;
      kpis.forEach((kpi, i) => {
        const x = 14 + i * kpiBoxW;
        doc.setFillColor(...lightBlue);
        doc.roundedRect(x, yPos, kpiBoxW - 4, 22, 2, 2, 'F');
        doc.setTextColor(...mutedText);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(kpi.label.toUpperCase(), x + (kpiBoxW - 4) / 2, yPos + 7, { align: 'center' });
        doc.setTextColor(...primaryBlue);
        doc.setFontSize(13);
        doc.text(kpi.value, x + (kpiBoxW - 4) / 2, yPos + 17, { align: 'center' });
      });
      yPos += 30;

      // ── TABLE ────────────────────────────────────────────────────
      const rows = evaluacionesFiltradas.map((e) => [
        e.codigo_ticket,
        e.titulo_incidencia.substring(0, 35),
        e.usuario_creador,
        e.tecnico_asignado,
        e.calificacion,
        e.comentario ? e.comentario.substring(0, 50) : '—',
        new Date(e.fecha_evaluacion).toLocaleDateString('es-PE'),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Ticket', 'Incidencia', 'Usuario Creador', 'Técnico Asignado', 'Calificación', 'Comentario', 'Fecha']],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: darkText },
        headStyles: {
          fillColor: primaryBlue,
          textColor: white,
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: lightBlue },
        didDrawPage: (data: any) => {
          doc.setFontSize(7);
          doc.setTextColor(...mutedText);
          doc.text(
            `Generado por Help Desk SLA TI — Confidencial | Página ${data.pageNumber}`,
            pageW / 2, pageH - 8, { align: 'center' }
          );
          if (data.pageNumber > 1) {
            doc.setFillColor(...primaryBlue);
            doc.rect(0, 0, pageW, 14, 'F');
            doc.setTextColor(...white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('HELP DESK SLA TI', 14, 10);
          }
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            const rating = Number(data.cell.raw);
            if (rating >= 4) data.cell.styles.textColor = [16, 185, 129];
            else if (rating <= 2) data.cell.styles.textColor = [220, 38, 38];
            else data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      doc.save(`reporte_satisfaccion_${new Date().toISOString().slice(0, 10)}.pdf`);
      setToast({ message: 'PDF exportado correctamente.', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error al generar el PDF.', type: 'error' });
    }
  };

  // ─── Exportar Excel ──────────────────────────────────────────────────────
  const exportarExcel = async () => {
    if (!reportData) return;
    try {
      const XLSX = await import('xlsx');
      const resumen = XLSX.utils.aoa_to_sheet([
        ['REPORTE DE EVALUACIONES DE SATISFACCIÓN DE USUARIOS'],
        ['Generado', new Date().toLocaleString('es-PE')],
        [],
        ['Calificación Promedio', reportData.resumen.promedio_calificacion],
        ['Porcentaje Satisfacción (>=4*)', `${reportData.resumen.porcentaje_satisfaccion}%`],
        ['Evaluaciones Recibidas', reportData.resumen.total_evaluaciones],
        [],
        ['DISTRIBUCIÓN DE CALIFICACIONES'],
        ['5 Estrellas', reportData.resumen.distribucion.cinco_estrellas],
        ['4 Estrellas', reportData.resumen.distribucion.cuatro_estrellas],
        ['3 Estrellas', reportData.resumen.distribucion.tres_estrellas],
        ['2 Estrellas', reportData.resumen.distribucion.dos_estrellas],
        ['1 Estrella',  reportData.resumen.distribucion.una_estrella],
      ]);

      const rows = evaluacionesFiltradas.map((e) => ({
        Ticket: e.codigo_ticket,
        Incidencia: e.titulo_incidencia,
        'Usuario Creador': e.usuario_creador,
        'Técnico Asignado': e.tecnico_asignado,
        Calificación: e.calificacion,
        Comentario: e.comentario ?? '',
        Categoría: e.categoria,
        Prioridad: e.prioridad,
        Fecha: new Date(e.fecha_evaluacion).toLocaleDateString('es-PE'),
      }));

      const detalle = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, resumen, 'Resumen');
      XLSX.utils.book_append_sheet(wb, detalle, 'Detalle Evaluaciones');
      XLSX.writeFile(wb, `reporte_satisfaccion_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToast({ message: 'Excel exportado correctamente.', type: 'success' });
    } catch { setToast({ message: 'Error al generar el Excel.', type: 'error' }); }
  };

  // ─── Estadísticas de barras de calificaciones ──────────────────────────────
  const renderRatingBar = (stars: number, count: number, total: number) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div key={stars} className="flex items-center gap-3 text-xs text-slate-600">
        <span className="w-16 font-semibold flex items-center gap-1 justify-end">{stars} <LuStar className="fill-amber-400 text-amber-400 text-xs inline" /></span>
        <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div className="bg-amber-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-10 text-right font-bold">{count} ({pct}%)</span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f3f4f6]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <LuHeart className="text-indigo-600" /> Reporte de Satisfacción de Usuarios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Indicadores, promedio de calificación y distribución de evaluaciones de servicio.</p>
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
            <LuFilter className="text-indigo-600" />
            <span>Parámetros del Reporte</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'Desde', el: <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /> },
              { label: 'Hasta', el: <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" /> },
              { label: 'Técnico Responsable', el: <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="todos">Todos</option>{tecnicos.map(t => <option key={t.id_perfil} value={t.id_perfil}>{t.nombre} {t.apellido}</option>)}</select> },
              { label: 'Categoría Incidencia', el: <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="todas">Todas</option><option value="hardware">Hardware</option><option value="software">Software</option><option value="redes">Redes</option><option value="otros">Otros</option></select> },
              { label: 'Prioridad de Servicio', el: <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"><option value="todas">Todas</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select> },
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
                placeholder="Buscar por ticket, título o técnico..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs" />
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={limpiarFiltros} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-slate-600 font-semibold transition cursor-pointer">Limpiar</button>
              <button onClick={generarReporte} disabled={loading || !authUserId}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 cursor-pointer">
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
            <LuHeart className="text-6xl text-slate-200 mx-auto mb-4" />
            <p className="text-slate-700 font-bold text-lg">Sin datos de reporte</p>
            <p className="text-slate-400 text-sm mt-1">Configura los filtros y presiona <span className="font-semibold text-indigo-600">Generar Reporte</span>.</p>
          </div>
        </div>
      )}

      {/* ── Cargando ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LuLoader className="animate-spin text-4xl text-indigo-500 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Calculando satisfacción del usuario...</p>
          </div>
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────────── */}
      {reportData && !loading && (
        <div className="flex-1 px-8 pb-8 space-y-5">

          {/* KPIs y Gráfico de distribución lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Indicadores Consolidados */}
            <div className="lg:col-span-1 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <KPICard
                  label="Evaluaciones Recibidas"
                  value={reportData.resumen.total_evaluaciones}
                  sub="En el período seleccionado"
                  color="bg-white border-slate-200 text-slate-800"
                />
              </div>
              <KPICard
                label="Calificación Promedio"
                value={`${reportData.resumen.promedio_calificacion} / 5.0`}
                sub="De atención al cliente"
                color="bg-indigo-50 border-indigo-200 text-indigo-800"
              />
              <KPICard
                label="Nivel de Satisfacción"
                value={`${reportData.resumen.porcentaje_satisfaccion}%`}
                sub="Calificaciones >= 4*"
                color={reportData.resumen.porcentaje_satisfaccion >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}
              />
            </div>

            {/* Distribución de Calificaciones (Gráfica de barras CSS) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                  Distribución de Calificaciones de Servicio
                </p>
                <div className="space-y-3">
                  {renderRatingBar(5, reportData.resumen.distribucion.cinco_estrellas, reportData.resumen.total_evaluaciones)}
                  {renderRatingBar(4, reportData.resumen.distribucion.cuatro_estrellas, reportData.resumen.total_evaluaciones)}
                  {renderRatingBar(3, reportData.resumen.distribucion.tres_estrellas, reportData.resumen.total_evaluaciones)}
                  {renderRatingBar(2, reportData.resumen.distribucion.dos_estrellas, reportData.resumen.total_evaluaciones)}
                  {renderRatingBar(1, reportData.resumen.distribucion.una_estrella, reportData.resumen.total_evaluaciones)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de detalle */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Listado Detallado de Evaluaciones ({evaluacionesFiltradas.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" id="tabla-reporte-satisfaccion">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Ticket</th>
                    <th className="px-4 py-3.5">Incidencia</th>
                    <th className="px-4 py-3.5">Usuario Creador</th>
                    <th className="px-4 py-3.5">Técnico Asignado</th>
                    <th className="px-4 py-3.5 text-center">Calificación</th>
                    <th className="px-5 py-3.5">Comentario de Retroalimentación</th>
                    <th className="px-4 py-3.5 text-center">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluacionesFiltradas.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-16 text-slate-400">No hay evaluaciones registradas para los filtros aplicados.</td></tr>
                  ) : (
                    evaluacionesFiltradas.map((e) => (
                      <tr key={e.id_evaluacion} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-mono text-indigo-600 font-bold">{e.codigo_ticket}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700 max-w-[200px] truncate">{e.titulo_incidencia}</td>
                        <td className="px-4 py-3.5 text-slate-600">{e.usuario_creador}</td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">{e.tecnico_asignado}</td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-col gap-0.5 items-center">
                            <RatingStars rating={e.calificacion} />
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{e.calificacion} / 5</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 max-w-[320px] whitespace-normal break-words">
                          {e.comentario ? `“${e.comentario}”` : <span className="text-slate-300 italic">Sin comentario</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-400">
                          {new Date(e.fecha_evaluacion).toLocaleDateString('es-PE')}
                        </td>
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
