'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuLoader, LuX, LuTriangle, LuCircleCheck, LuFilter, LuUsers,
  LuFileSpreadsheet, LuFileText, LuSearch, LuRefreshCcw, LuTrendingUp,
} from 'react-icons/lu';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { FiltroReporteCarga, ReporteCargaResult, DesgloseCargaTecnico } from '@/types/reporteCargaTrabajo';
import { generarReporteCargaAction } from '@/actions/reporteCargaTrabajoActions';
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

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-1 ${color}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-3xl font-extrabold leading-none">{value}</span>
      {sub && <span className="text-[11px] opacity-60 mt-0.5">{sub}</span>}
    </div>
  );
}

// ─── Mini barra de estado ────────────────────────────────────────────────────
function StatusBar({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{value}</span>
    </div>
  );
}

// ─── Tarjeta de Técnico ──────────────────────────────────────────────────────
function TecnicoCard({ t, maxTotal }: { t: DesgloseCargaTecnico; maxTotal: number }) {
  const widthPct = maxTotal > 0 ? (t.total / maxTotal) * 100 : 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-slate-800 text-sm">{t.nombre_completo}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{t.total} ticket{t.total !== 1 ? 's' : ''} asignados</p>
        </div>
        <span className="text-2xl font-extrabold text-blue-600">{t.total}</span>
      </div>
      {/* Barra total relativa */}
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className="h-2.5 rounded-full bg-blue-500 transition-all" style={{ width: `${widthPct}%` }} />
      </div>
      {/* Desglose por estado */}
      <div className="space-y-1.5">
        <StatusBar value={t.abiertos}    total={t.total} color="#ef4444" label="Abiertos" />
        <StatusBar value={t.en_progreso} total={t.total} color="#f59e0b" label="En Progreso" />
        <StatusBar value={t.resueltos}   total={t.total} color="#3b82f6" label="Resueltos" />
        <StatusBar value={t.cerrados}    total={t.total} color="#10b981" label="Cerrados" />
      </div>
      {/* Etiquetas de prioridad */}
      <div className="flex gap-1.5 flex-wrap pt-1 border-t border-slate-100">
        {t.criticos > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">Crítica: {t.criticos}</span>}
        {t.altos > 0    && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">Alta: {t.altos}</span>}
        {t.medios > 0   && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Media: {t.medios}</span>}
        {t.bajos > 0    && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">Baja: {t.bajos}</span>}
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function ReporteCargaPage() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReporteCargaResult | null>(null);
  const [tecnicos, setTecnicos] = useState<PerfilUsuario[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tecnicoId, setTecnicoId] = useState('todos');
  const [prioridad, setPrioridad] = useState('todas');
  const [estado, setEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

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
    const filtros: FiltroReporteCarga = { fechaInicio, fechaFin, tecnicoId, prioridad, estado };
    const res = await generarReporteCargaAction(filtros, authUserId);
    if (res.success && res.data) {
      setReportData(res.data);
    } else {
      setToast({ message: res.error ?? 'Error al generar el reporte', type: 'error' });
    }
    setLoading(false);
  }, [authUserId, fechaInicio, fechaFin, tecnicoId, prioridad, estado]);

  const limpiarFiltros = () => {
    setFechaInicio(''); setFechaFin('');
    setTecnicoId('todos'); setPrioridad('todas'); setEstado('todos');
    setBusqueda(''); setReportData(null);
  };

  const tecnicosFiltrados: DesgloseCargaTecnico[] = (reportData?.tecnicos ?? []).filter((t) =>
    !busqueda || t.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const maxTotal = Math.max(...tecnicosFiltrados.map(t => t.total), 1);

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
      doc.text('Reporte de Carga de Trabajo por Técnico', 14, 24);

      doc.setFontSize(8);
      const now = new Date().toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
      doc.text(`Generado: ${now}`, pageW - 14, 16, { align: 'right' });
      doc.text(`Total tickets: ${reportData.total_tickets_sistema}`, pageW - 14, 24, { align: 'right' });

      // ── SEPARATOR ────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 42, pageW - 14, 42);

      // ── KPI SUMMARY ROW ──────────────────────────────────────────
      let yPos = 46;
      const kpis = [
        { label: 'Total Tickets',     value: String(reportData.total_tickets_sistema) },
        { label: 'Técnicos con Carga', value: String(reportData.tecnicos.length) },
        { label: 'Promedio de Carga', value: String(reportData.promedio_por_tecnico) },
        { label: 'Más Cargado',       value: reportData.tecnico_mas_cargado.split(' ')[0] },
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
      const rows = tecnicosFiltrados.map((t) => {
        const pct = reportData.total_tickets_sistema > 0
          ? `${Math.round((t.total / reportData.total_tickets_sistema) * 100)}%`
          : '0%';
        return [
          t.nombre_completo,
          t.total,
          t.abiertos,
          t.en_progreso,
          t.resueltos,
          t.cerrados,
          t.criticos,
          t.altos,
          t.medios,
          t.bajos,
          pct,
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Técnico', 'Total', 'Abiertos', 'En Progreso', 'Resueltos', 'Cerrados', 'Críticos', 'Altos', 'Medios', 'Bajos', '% del Total']],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: darkText, halign: 'center' },
        headStyles: {
          fillColor: primaryBlue,
          textColor: white,
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: { 0: { halign: 'left' } },
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
          if (data.section === 'body') {
            if (data.column.index === 2 && Number(data.cell.raw) > 0)
              data.cell.styles.textColor = [220, 38, 38];
            if (data.column.index === 6 && Number(data.cell.raw) > 0)
              data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });

      doc.save(`reporte_carga_tecnicos_${new Date().toISOString().slice(0, 10)}.pdf`);
      setToast({ message: 'PDF exportado correctamente.', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error al generar el PDF.', type: 'error' });
    }
  };

  // ─── Exportar Excel ─────────────────────────────────────────────────────
  const exportarExcel = async () => {
    if (!reportData) return;
    try {
      const XLSX = await import('xlsx');

      const resumen = XLSX.utils.aoa_to_sheet([
        ['REPORTE DE CARGA DE TRABAJO DE TÉCNICOS'],
        ['Generado', new Date().toLocaleString('es-PE')],
        [],
        ['Total Tickets Sistema', reportData.total_tickets_sistema],
        ['Promedio por Técnico', reportData.promedio_por_tecnico],
        ['Técnico más cargado', reportData.tecnico_mas_cargado],
        ['Técnico menos cargado', reportData.tecnico_menos_cargado],
      ]);

      const rows = tecnicosFiltrados.map((t) => ({
        Técnico: t.nombre_completo,
        Total: t.total,
        Abiertos: t.abiertos,
        'En Progreso': t.en_progreso,
        Resueltos: t.resueltos,
        Cerrados: t.cerrados,
        Críticos: t.criticos,
        Altos: t.altos,
        Medios: t.medios,
        Bajos: t.bajos,
      }));

      const detalle = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, resumen, 'Resumen');
      XLSX.utils.book_append_sheet(wb, detalle, 'Detalle Técnicos');
      XLSX.writeFile(wb, `reporte_carga_tecnicos_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToast({ message: 'Excel exportado correctamente.', type: 'success' });
    } catch { setToast({ message: 'Error al generar el Excel.', type: 'error' }); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f3f4f6]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Reporte de Carga de Trabajo de Técnicos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Distribución de incidencias asignadas por técnico, estado y prioridad.</p>
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
            <span>Parámetros del Reporte</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'Desde', el: <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /> },
              { label: 'Hasta', el: <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /> },
              { label: 'Técnico', el: <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"><option value="todos">Todos</option>{tecnicos.map(t => <option key={t.id_perfil} value={t.id_perfil}>{t.nombre} {t.apellido}</option>)}</select> },
              { label: 'Prioridad', el: <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"><option value="todas">Todas</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select> },
              { label: 'Estado', el: <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"><option value="todos">Todos</option><option value="abierto">Abierto</option><option value="en_progreso">En Progreso</option><option value="resuelto">Resuelto</option><option value="cerrado">Cerrado</option></select> },
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
                placeholder="Buscar técnico en los resultados..."
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
            <LuUsers className="text-6xl text-slate-200 mx-auto mb-4" />
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
            <p className="text-slate-500 text-sm font-medium">Calculando carga de trabajo...</p>
          </div>
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────────── */}
      {reportData && !loading && (
        <div className="flex-1 px-8 pb-8 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard label="Total Tickets" value={reportData.total_tickets_sistema} sub="En el período seleccionado" color="bg-white border-slate-200 text-slate-800" />
            <KPICard label="Técnicos con carga" value={reportData.tecnicos.length} sub="Con tickets asignados" color="bg-blue-50 border-blue-200 text-blue-800" />
            <KPICard label="Promedio de carga" value={`${reportData.promedio_por_tecnico}`} sub="tickets por técnico" color="bg-indigo-50 border-indigo-200 text-indigo-800" />
            <KPICard label="Más cargado" value={reportData.tecnico_mas_cargado.split(' ')[0]} sub={reportData.tecnico_mas_cargado} color="bg-amber-50 border-amber-200 text-amber-800" />
          </div>

          {/* Tarjetas por técnico */}
          {tecnicosFiltrados.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LuTrendingUp className="text-blue-600" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Distribución por Técnico</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tecnicosFiltrados.map((t) => (
                  <TecnicoCard key={t.id_perfil} t={t} maxTotal={maxTotal} />
                ))}
              </div>
            </div>
          )}

          {/* Tabla comparativa */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Tabla Comparativa de Carga ({tecnicosFiltrados.length} técnico{tecnicosFiltrados.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" id="tabla-carga-tecnicos">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider text-center">
                    <th className="px-5 py-3.5 text-left">Técnico</th>
                    <th className="px-4 py-3.5">Total</th>
                    <th className="px-4 py-3.5 text-red-500">Abiertos</th>
                    <th className="px-4 py-3.5 text-amber-500">En Progreso</th>
                    <th className="px-4 py-3.5 text-blue-500">Resueltos</th>
                    <th className="px-4 py-3.5 text-emerald-500">Cerrados</th>
                    <th className="px-4 py-3.5">Críticos</th>
                    <th className="px-4 py-3.5">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicosFiltrados.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16 text-slate-400">No hay registros para los filtros aplicados.</td></tr>
                  ) : (
                    tecnicosFiltrados.map((t) => {
                      const pct = reportData.total_tickets_sistema > 0
                        ? Math.round((t.total / reportData.total_tickets_sistema) * 100)
                        : 0;
                      return (
                        <tr key={t.id_perfil} className="border-b border-slate-100 hover:bg-slate-50/70 transition text-center">
                          <td className="px-5 py-3.5 text-left font-bold text-slate-700">{t.nombre_completo}</td>
                          <td className="px-4 py-3.5 font-extrabold text-blue-600">{t.total}</td>
                          <td className="px-4 py-3.5 text-red-600 font-semibold">{t.abiertos}</td>
                          <td className="px-4 py-3.5 text-amber-600 font-semibold">{t.en_progreso}</td>
                          <td className="px-4 py-3.5 text-blue-600 font-semibold">{t.resueltos}</td>
                          <td className="px-4 py-3.5 text-emerald-600 font-semibold">{t.cerrados}</td>
                          <td className="px-4 py-3.5">
                            {t.criticos > 0 && (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">{t.criticos}</span>
                            )}
                            {t.criticos === 0 && <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="font-bold text-slate-600">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
