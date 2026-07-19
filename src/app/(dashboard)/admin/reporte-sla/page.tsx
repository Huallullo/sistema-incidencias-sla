'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuLoader, LuX, LuTriangle, LuCircleCheck, LuFilter, LuDownload,
  LuFileSpreadsheet, LuFileText, LuChartColumn, LuSearch, LuCheck, LuRefreshCcw,
} from 'react-icons/lu';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { PerfilUsuario } from '@/types/auth';
import { FiltroReporteSLA, ReporteSLAResult, TicketSLADetalle } from '@/types/reporteSLA';
import { generarReporteSLAAction } from '@/actions/reporteSLAActions';
import { obtenerTecnicosAction } from '@/actions/incidenciasActions';
import type { CellHookData } from 'jspdf-autotable';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatMin(min: number | null): string {
  if (min === null) return '—';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PRIORIDAD_LABELS: Record<string, string> = {
  critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja',
};

const ESTADO_LABELS: Record<string, string> = {
  abierto: 'Abierto', en_progreso: 'En Progreso', resuelto: 'Resuelto', cerrado: 'Cerrado',
};

function PrioridadBadge({ nivel }: { nivel: string }) {
  const cfg: Record<string, string> = {
    critica: 'bg-red-100 text-red-700',
    alta: 'bg-orange-100 text-orange-700',
    media: 'bg-blue-100 text-blue-700',
    baja: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md ${cfg[nivel] ?? 'bg-slate-100 text-slate-600'}`}>
      {PRIORIDAD_LABELS[nivel] ?? nivel}
    </span>
  );
}

function SLABadge({ cumple }: { cumple: boolean | null }) {
  if (cumple === null) {
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500">Sin SLA</span>;
  }
  return cumple
    ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700"><LuCheck size={10} />Cumple</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-red-100 text-red-700"><LuX size={10} />No Cumple</span>;
}

// ─── Tarjeta KPI ─────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-1 ${color}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-3xl font-extrabold leading-none">{value}</span>
      {sub && <span className="text-[11px] opacity-60 mt-0.5">{sub}</span>}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ReporteSLAPage() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReporteSLAResult | null>(null);
  const [tecnicos, setTecnicos] = useState<PerfilUsuario[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [prioridad, setPrioridad] = useState('todas');
  const [tecnicoId, setTecnicoId] = useState('todos');
  const [estado, setEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Autenticación y carga inicial
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
      } catch {
        router.push('/login');
      }
    }
    loadSession();
  }, [router]);

  const generarReporte = useCallback(async () => {
    if (!authUserId) return;
    setLoading(true);
    setReportData(null);
    const filtros: FiltroReporteSLA = { fechaInicio, fechaFin, prioridad, tecnicoId, estado };
    const res = await generarReporteSLAAction(filtros, authUserId);
    if (res.success && res.data) {
      setReportData(res.data);
    } else {
      setToast({ message: res.error ?? 'Error al generar el reporte', type: 'error' });
    }
    setLoading(false);
  }, [authUserId, fechaInicio, fechaFin, prioridad, tecnicoId, estado]);

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setPrioridad('todas');
    setTecnicoId('todos');
    setEstado('todos');
    setBusqueda('');
    setReportData(null);
  };

  // Filtrado textual en cliente (busqueda)
  const ticketsFiltrados: TicketSLADetalle[] = (reportData?.tickets ?? []).filter((t) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      t.codigo_ticket?.toLowerCase().includes(q) ||
      t.titulo?.toLowerCase().includes(q) ||
      t.tecnico_nombre?.toLowerCase().includes(q) ||
      t.usuario_nombre?.toLowerCase().includes(q)
    );
  });

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
      doc.text('Análisis de Cumplimiento de Acuerdos de Nivel de Servicio', 14, 24);

      doc.setFontSize(8);
      const now = new Date().toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
      doc.text(`Generado: ${now}`, pageW - 14, 16, { align: 'right' });
      doc.text(`Total registros: ${reportData.resumen.total_tickets}`, pageW - 14, 24, { align: 'right' });

      // ── SEPARATOR ────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 42, pageW - 14, 42);

      // ── KPI SUMMARY ROW ──────────────────────────────────────────
      let yPos = 46;
      const kpis = [
        { label: 'Total Tickets',    value: String(reportData.resumen.total_tickets) },
        { label: '% Cumplimiento',   value: `${reportData.resumen.porcentaje_cumplimiento}%` },
        { label: 'Cumplen SLA',      value: String(reportData.resumen.tickets_cumple) },
        { label: 'No Cumplen SLA',   value: String(reportData.resumen.tickets_no_cumple) },
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
      const rows = ticketsFiltrados.map((t) => [
        t.codigo_ticket,
        t.titulo.substring(0, 40),
        PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad,
        ESTADO_LABELS[t.estado] ?? t.estado,
        t.tecnico_nombre,
        formatMin(t.sla_tiempo_respuesta_min),
        formatMin(t.tiempo_respuesta_real_min),
        formatMin(t.sla_tiempo_resolucion_min),
        formatMin(t.tiempo_resolucion_real_min),
        t.cumple_sla === null ? 'N/A' : t.cumple_sla ? 'SÍ' : 'NO',
      ]);

      autoTable(doc, {
        startY: yPos,
        margin: { top: 22, left: 14, right: 14, bottom: 15 },
        head: [['Ticket', 'Título', 'Prioridad', 'Estado', 'Técnico', 'T.Resp.SLA', 'T.Resp.Real', 'T.Resol.SLA', 'T.Resol.Real', 'SLA']],
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
          if (data.section === 'body' && data.column.index === 9) {
            if (data.cell.raw === 'SÍ') data.cell.styles.textColor = [16, 185, 129];
            else if (data.cell.raw === 'NO') data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });

      doc.save(`reporte_sla_${new Date().toISOString().slice(0, 10)}.pdf`);
      setToast({ message: 'Reporte exportado en PDF correctamente.', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error al generar el PDF. Intente de nuevo.', type: 'error' });
    }
  };

  // ─── Exportar Excel ─────────────────────────────────────────────────────
  const exportarExcel = async () => {
    if (!reportData) return;
    try {
      const XLSX = await import('xlsx');

      const resumenSheet = XLSX.utils.aoa_to_sheet([
        ['REPORTE DE CUMPLIMIENTO SLA', '', '', ''],
        ['Generado', new Date().toLocaleString('es-PE'), '', ''],
        [],
        ['RESUMEN', '', '', ''],
        ['Total Tickets', reportData.resumen.total_tickets],
        ['Tickets que Cumplen', reportData.resumen.tickets_cumple],
        ['Tickets que NO Cumplen', reportData.resumen.tickets_no_cumple],
        ['Sin SLA Configurado', reportData.resumen.tickets_sin_sla],
        ['% Cumplimiento', `${reportData.resumen.porcentaje_cumplimiento}%`],
      ]);

      const rows = ticketsFiltrados.map((t) => ({
        Ticket: t.codigo_ticket,
        Título: t.titulo,
        Prioridad: PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad,
        Estado: ESTADO_LABELS[t.estado] ?? t.estado,
        Técnico: t.tecnico_nombre,
        'Usuario Creador': t.usuario_nombre,
        'Fecha Creación': formatDate(t.creado_en),
        'SLA Respuesta (min)': t.sla_tiempo_respuesta_min ?? 'N/A',
        'Tiempo Real Respuesta (min)': t.tiempo_respuesta_real_min ?? 'N/A',
        'Cumple Respuesta': t.cumple_respuesta === null ? 'N/A' : t.cumple_respuesta ? 'SÍ' : 'NO',
        'SLA Resolución (min)': t.sla_tiempo_resolucion_min ?? 'N/A',
        'Tiempo Real Resolución (min)': t.tiempo_resolucion_real_min ?? 'N/A',
        'Cumple SLA': t.cumple_sla === null ? 'N/A' : t.cumple_sla ? 'SÍ' : 'NO',
      }));

      const detailSheet = XLSX.utils.json_to_sheet(rows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');
      XLSX.utils.book_append_sheet(wb, detailSheet, 'Detalle Tickets');

      XLSX.writeFile(wb, `reporte_sla_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToast({ message: 'Reporte exportado en Excel correctamente.', type: 'success' });
    } catch (e) {
      setToast({ message: 'Error al generar el Excel. Intente de nuevo.', type: 'error' });
    }
  };

  const resumen = reportData?.resumen;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f3f4f6]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Reporte de Cumplimiento SLA</h1>
          <p className="text-xs text-slate-500 mt-0.5">Análisis de tiempos de respuesta y resolución frente a los SLA definidos.</p>
        </div>
        {reportData && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <LuFileText size={14} />
              Exportar PDF
            </button>
            <button
              onClick={exportarExcel}
              className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <LuFileSpreadsheet size={14} />
              Exportar Excel
            </button>
          </div>
        )}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="p-8 pb-4 shrink-0">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
            <LuFilter className="text-blue-600" />
            <span>Parámetros del Reporte</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Fecha inicio */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Desde</label>
              <input
                type="date" value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            {/* Fecha fin */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hasta</label>
              <input
                type="date" value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            {/* Prioridad */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Prioridad</label>
              <select
                value={prioridad} onChange={(e) => setPrioridad(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="todas">Todas</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            {/* Técnico */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Técnico</label>
              <select
                value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="todos">Todos</option>
                {tecnicos.map((t) => (
                  <option key={t.id_perfil} value={t.id_perfil}>{t.nombre} {t.apellido}</option>
                ))}
              </select>
            </div>
            {/* Estado */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Estado</label>
              <select
                value={estado} onChange={(e) => setEstado(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="abierto">Abierto</option>
                <option value="en_progreso">En Progreso</option>
                <option value="resuelto">Resuelto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en resultados por ticket, título o técnico..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={limpiarFiltros}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-slate-600 font-semibold transition cursor-pointer"
              >
                Limpiar
              </button>
              <button
                onClick={generarReporte}
                disabled={loading || !authUserId}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {loading ? <LuLoader className="animate-spin" size={14} /> : <LuRefreshCcw size={14} />}
                {loading ? 'Generando...' : 'Generar Reporte'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Estado vacío inicial ─────────────────────────────────────────────── */}
      {!reportData && !loading && (
        <div className="flex-1 flex items-center justify-center px-8 pb-8">
          <div className="text-center">
            <LuChartColumn className="text-6xl text-slate-200 mx-auto mb-4" />
            <p className="text-slate-700 font-bold text-lg">Sin datos de reporte</p>
            <p className="text-slate-400 text-sm mt-1">Configura los filtros y presiona <span className="font-semibold text-blue-600">Generar Reporte</span>.</p>
          </div>
        </div>
      )}

      {/* ── Cargando ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LuLoader className="animate-spin text-4xl text-blue-500 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Calculando indicadores SLA...</p>
          </div>
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────────────── */}
      {reportData && !loading && (
        <div className="flex-1 px-8 pb-8 space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              label="Total Tickets"
              value={resumen!.total_tickets}
              sub="En el período seleccionado"
              color="bg-white border-slate-200 text-slate-800"
            />
            <KPICard
              label="% Cumplimiento"
              value={`${resumen!.porcentaje_cumplimiento}%`}
              sub={`${resumen!.tickets_cumple} tickets dentro del SLA`}
              color={resumen!.porcentaje_cumplimiento >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}
            />
            <KPICard
              label="Cumplen SLA"
              value={resumen!.tickets_cumple}
              sub="Dentro de los tiempos acordados"
              color="bg-emerald-50 border-emerald-200 text-emerald-800"
            />
            <KPICard
              label="No Cumplen SLA"
              value={resumen!.tickets_no_cumple}
              sub="Superan el tiempo acordado"
              color="bg-red-50 border-red-200 text-red-800"
            />
          </div>

          {/* Desglose por prioridad */}
          {Object.keys(resumen!.por_prioridad).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cumplimiento por Nivel de Prioridad</span>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(['critica', 'alta', 'media', 'baja'] as const).map((nivel) => {
                  const g = resumen!.por_prioridad[nivel];
                  if (!g) return null;
                  const pct = g.porcentaje;
                  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={nivel} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <PrioridadBadge nivel={nivel} />
                        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{g.cumple} de {g.total} tickets</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabla detallada */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Detalle de Tickets ({ticketsFiltrados.length})
              </span>
              {resumen && resumen.tickets_sin_sla > 0 && (
                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md font-semibold">
                  {resumen.tickets_sin_sla} tickets sin SLA configurado
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" id="tabla-reporte-sla">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5 w-32">Ticket</th>
                    <th className="px-4 py-3.5">Título</th>
                    <th className="px-4 py-3.5 w-24">Prioridad</th>
                    <th className="px-4 py-3.5 w-28">Técnico</th>
                    <th className="px-4 py-3.5 w-24 text-center">T. Resp. SLA</th>
                    <th className="px-4 py-3.5 w-24 text-center">T. Resp. Real</th>
                    <th className="px-4 py-3.5 w-24 text-center">T. Resol. SLA</th>
                    <th className="px-4 py-3.5 w-24 text-center">T. Resol. Real</th>
                    <th className="px-4 py-3.5 w-28 text-center">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-slate-400">
                        <LuChartColumn className="text-4xl mx-auto mb-2 text-slate-200" />
                        <p className="font-semibold">No hay registros para los filtros aplicados.</p>
                      </td>
                    </tr>
                  ) : (
                    ticketsFiltrados.map((t) => (
                      <tr key={t.id_incidencia} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-bold text-blue-600">
                          #{t.codigo_ticket?.substring(4)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 max-w-xs">
                          <span className="line-clamp-1">{t.titulo}</span>
                          <span className="block text-[10px] text-slate-400">{t.usuario_nombre}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <PrioridadBadge nivel={t.prioridad} />
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{t.tecnico_nombre}</td>
                        <td className="px-4 py-3.5 text-center text-slate-500">
                          {formatMin(t.sla_tiempo_respuesta_min)}
                        </td>
                        <td className={`px-4 py-3.5 text-center font-semibold ${
                          t.cumple_respuesta === null ? 'text-slate-400' : t.cumple_respuesta ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {formatMin(t.tiempo_respuesta_real_min)}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500">
                          {formatMin(t.sla_tiempo_resolucion_min)}
                        </td>
                        <td className={`px-4 py-3.5 text-center font-semibold ${
                          t.cumple_resolucion === null ? 'text-slate-400' : t.cumple_resolucion ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {formatMin(t.tiempo_resolucion_real_min)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <SLABadge cumple={t.cumple_sla} />
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
