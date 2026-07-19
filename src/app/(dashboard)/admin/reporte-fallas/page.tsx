'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuLoader, LuX, LuTriangle, LuCircleCheck, LuFilter, LuMonitorX,
  LuFileSpreadsheet, LuFileText, LuSearch, LuRefreshCcw, LuChevronDown, LuChevronRight,
} from 'react-icons/lu';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import {
  FiltroReporteFallas, ReporteFallasResult, EquipoFallaResumen,
} from '@/types/reporteFallasEquipo';
import { generarReporteFallasAction, obtenerListaEquiposAction } from '@/actions/reporteFallasEquipoActions';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-5 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold border ${
      type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-red-200 text-red-600'
    }`}>
      {type === 'success' ? <LuCircleCheck className="text-lg text-emerald-500 shrink-0" /> : <LuTriangle className="text-lg text-red-500 shrink-0" />}
      <span>{message}</span>
      <button onClick={onClose}><LuX className="text-slate-400" /></button>
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

// ─── Badge de estado ──────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    abierto:     'bg-red-100 text-red-700',
    en_progreso: 'bg-amber-100 text-amber-700',
    resuelto:    'bg-blue-100 text-blue-700',
    cerrado:     'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${map[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {estado.replace('_', ' ')}
    </span>
  );
}

// ─── Badge de prioridad ───────────────────────────────────────────────────────
function PrioridadBadge({ prioridad }: { prioridad: string }) {
  const map: Record<string, string> = {
    critica: 'bg-red-100 text-red-700',
    alta:    'bg-orange-100 text-orange-700',
    media:   'bg-blue-100 text-blue-700',
    baja:    'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${map[prioridad] ?? 'bg-slate-100 text-slate-600'}`}>
      {prioridad}
    </span>
  );
}

// ─── Fila expandible de equipo ────────────────────────────────────────────────
function EquipoRow({ equipo }: { equipo: EquipoFallaResumen }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-b border-slate-100 hover:bg-slate-50/70 transition cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {open ? <LuChevronDown className="text-slate-400 shrink-0" /> : <LuChevronRight className="text-slate-400 shrink-0" />}
            <div>
              <p className="font-bold text-slate-800 text-xs">{equipo.nombre}</p>
              <p className="text-[10px] text-slate-400">{equipo.codigo} — {equipo.tipo}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">{equipo.ubicacion}</td>
        <td className="px-4 py-3 text-center">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            equipo.estado_operativo === 'operativo' ? 'bg-emerald-100 text-emerald-700' :
            equipo.estado_operativo === 'mantenimiento' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>{equipo.estado_operativo}</span>
        </td>
        <td className="px-4 py-3 text-center font-extrabold text-red-600 text-sm">{equipo.total_fallas}</td>
        <td className="px-4 py-3 text-center text-xs text-red-500 font-semibold">{equipo.fallas_abiertas}</td>
        <td className="px-4 py-3 text-center text-xs text-amber-500 font-semibold">{equipo.fallas_en_progreso}</td>
        <td className="px-4 py-3 text-center text-xs text-emerald-600 font-semibold">{equipo.fallas_cerradas + equipo.fallas_resueltas}</td>
        <td className="px-4 py-3 text-center text-xs text-slate-600">
          {equipo.tiempo_promedio_hrs !== null ? `${equipo.tiempo_promedio_hrs}h` : '—'}
        </td>
        <td className="px-4 py-3 text-center text-xs text-slate-400">
          {equipo.ultima_falla ? new Date(equipo.ultima_falla).toLocaleDateString('es-PE') : '—'}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={9} className="px-0 py-0 bg-slate-50/50">
            <div className="px-8 py-3 border-t border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Historial de incidencias ({equipo.incidencias.length})
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="pb-1.5 text-left pr-4">Ticket</th>
                    <th className="pb-1.5 text-left pr-4">Título</th>
                    <th className="pb-1.5 pr-4">Tipo falla</th>
                    <th className="pb-1.5 pr-4">Prioridad</th>
                    <th className="pb-1.5 pr-4">Estado</th>
                    <th className="pb-1.5 pr-4">Técnico</th>
                    <th className="pb-1.5 pr-4">Fecha</th>
                    <th className="pb-1.5">T. Resolución</th>
                  </tr>
                </thead>
                <tbody>
                  {equipo.incidencias.map(inc => (
                    <tr key={inc.id_incidencia} className="border-b border-slate-100">
                      <td className="py-1.5 pr-4 font-mono text-blue-600">{inc.codigo_ticket}</td>
                      <td className="py-1.5 pr-4 text-slate-700 max-w-[200px] truncate">{inc.titulo}</td>
                      <td className="py-1.5 pr-4 text-center capitalize">{inc.categoria}</td>
                      <td className="py-1.5 pr-4 text-center"><PrioridadBadge prioridad={inc.prioridad} /></td>
                      <td className="py-1.5 pr-4 text-center"><EstadoBadge estado={inc.estado} /></td>
                      <td className="py-1.5 pr-4 text-slate-600">{inc.tecnico}</td>
                      <td className="py-1.5 pr-4 text-slate-500">{new Date(inc.fecha_incidente).toLocaleDateString('es-PE')}</td>
                      <td className="py-1.5 text-slate-500">{inc.tiempo_resolucion_horas !== null ? `${inc.tiempo_resolucion_horas}h` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ReporteFallasPage() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [reportData, setReportData] = useState<ReporteFallasResult | null>(null);
  const [equipos, setEquipos]       = useState<{ id_equipo: string; codigo: string; nombre: string }[]>([]);
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [busqueda, setBusqueda]     = useState('');

  // Filtros
  const [equipoId,         setEquipoId]         = useState('todos');
  const [tipoEquipo,       setTipoEquipo]        = useState('todos');
  const [ubicacion,        setUbicacion]         = useState('');
  const [fechaInicio,      setFechaInicio]       = useState('');
  const [fechaFin,         setFechaFin]          = useState('');
  const [estadoIncidencia, setEstadoIncidencia]  = useState('todos');

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await AuthService.getSession();
        if (!session?.user?.id) { router.push('/login'); return; }
        const profile = await PerfilesRepository.getProfileByUserId(session.user.id);
        if (!profile || profile.rol !== 'jefe_ti') { router.push('/dashboard'); return; }
        setAuthUserId(session.user.id);
        const eqRes = await obtenerListaEquiposAction();
        if (eqRes.success && eqRes.data) setEquipos(eqRes.data);
      } catch { router.push('/login'); }
    }
    loadSession();
  }, [router]);

  const generarReporte = useCallback(async () => {
    if (!authUserId) return;
    setLoading(true);
    setReportData(null);
    const filtros: FiltroReporteFallas = { equipoId, tipoEquipo, ubicacion, fechaInicio, fechaFin, estadoIncidencia };
    const res = await generarReporteFallasAction(filtros, authUserId);
    if (res.success && res.data) {
      setReportData(res.data);
    } else {
      setToast({ message: res.error ?? 'Error al generar el reporte', type: 'error' });
    }
    setLoading(false);
  }, [authUserId, equipoId, tipoEquipo, ubicacion, fechaInicio, fechaFin, estadoIncidencia]);

  const limpiar = () => {
    setEquipoId('todos'); setTipoEquipo('todos'); setUbicacion('');
    setFechaInicio(''); setFechaFin(''); setEstadoIncidencia('todos');
    setBusqueda(''); setReportData(null);
  };

  const equiposFiltrados = (reportData?.equipos ?? []).filter(eq =>
    !busqueda ||
    eq.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    eq.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    eq.ubicacion.toLowerCase().includes(busqueda.toLowerCase())
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
      doc.text('Historial de Fallas por Equipo Informático', 14, 24);

      doc.setFontSize(8);
      const now = new Date().toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
      doc.text(`Generado: ${now}`, pageW - 14, 16, { align: 'right' });
      doc.text(`Total fallas: ${reportData.total_incidencias}`, pageW - 14, 24, { align: 'right' });

      // ── SEPARATOR ────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 42, pageW - 14, 42);

      // ── KPI SUMMARY ROW ──────────────────────────────────────────
      let yPos = 46;
      const kpis = [
        { label: 'Total Incidencias',  value: String(reportData.total_incidencias) },
        { label: 'Equipos con Fallas', value: String(reportData.total_equipos_con_fallas) },
        { label: 'Promedio Fallas',    value: String(reportData.promedio_fallas_equipo) },
        { label: 'Equipo Más Afect.',  value: reportData.equipo_mas_fallas.split(' ')[0] },
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
      const rows = equiposFiltrados.map(eq => [
        eq.nombre,
        eq.codigo,
        eq.tipo,
        eq.ubicacion,
        eq.estado_operativo,
        eq.total_fallas,
        eq.fallas_abiertas,
        eq.fallas_en_progreso,
        eq.fallas_resueltas + eq.fallas_cerradas,
        eq.tiempo_promedio_hrs !== null ? `${eq.tiempo_promedio_hrs}h` : '—',
        eq.ultima_falla ? new Date(eq.ultima_falla).toLocaleDateString('es-PE') : '—',
      ]);

      autoTable(doc, {
        startY: yPos,
        margin: { top: 22, left: 14, right: 14, bottom: 15 },
        head: [['Equipo', 'Código', 'Tipo', 'Ubicación', 'Estado', 'Total Fallas', 'Abiertos', 'En Proceso', 'Resueltos', 'T.Prom Res.', 'Última Falla']],
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
          if (data.section === 'body') {
            // Color abiertos red
            if (data.column.index === 6 && Number(data.cell.raw) > 0)
              data.cell.styles.textColor = [220, 38, 38];
            // Color total fallas red
            if (data.column.index === 5 && Number(data.cell.raw) > 0)
              data.cell.styles.textColor = [220, 38, 38];
            // Color estado operativo
            if (data.column.index === 4) {
              if (data.cell.raw === 'operativo') data.cell.styles.textColor = [16, 185, 129];
              else if (data.cell.raw === 'mantenimiento') data.cell.styles.textColor = [245, 158, 11];
              else data.cell.styles.textColor = [220, 38, 38];
            }
          }
        },
      });

      doc.save(`reporte_fallas_equipos_${new Date().toISOString().slice(0, 10)}.pdf`);
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
        ['REPORTE DE HISTORIAL DE FALLAS POR EQUIPO'],
        ['Generado', new Date().toLocaleString('es-PE')],
        [],
        ['Total equipos con fallas', reportData.total_equipos_con_fallas],
        ['Total incidencias', reportData.total_incidencias],
        ['Equipo con más fallas', reportData.equipo_mas_fallas],
        ['Promedio fallas por equipo', reportData.promedio_fallas_equipo],
      ]);
      const rows = equiposFiltrados.map(eq => ({
        Equipo: eq.nombre, Código: eq.codigo, Tipo: eq.tipo, Ubicación: eq.ubicacion,
        'Estado Operativo': eq.estado_operativo, 'Total Fallas': eq.total_fallas,
        Abiertos: eq.fallas_abiertas, 'En Progreso': eq.fallas_en_progreso,
        Resueltos: eq.fallas_resueltas, Cerrados: eq.fallas_cerradas,
        'T.Prom Resolución (h)': eq.tiempo_promedio_hrs ?? '',
        'Última Falla': eq.ultima_falla ? new Date(eq.ultima_falla).toLocaleDateString('es-PE') : '',
      }));
      const detalle = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, resumen, 'Resumen');
      XLSX.utils.book_append_sheet(wb, detalle, 'Fallas por Equipo');
      XLSX.writeFile(wb, `reporte_fallas_equipos_${new Date().toISOString().slice(0,10)}.xlsx`);
      setToast({ message: 'Excel exportado correctamente.', type: 'success' });
    } catch { setToast({ message: 'Error al generar el Excel.', type: 'error' }); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f3f4f6]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <LuMonitorX className="text-red-500" /> Historial de Fallas por Equipo Informático
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Frecuencia, tipo y tiempo de resolución de fallas por activo de hardware.</p>
        </div>
        {reportData && (
          <div className="flex items-center gap-2">
            <button onClick={exportarPDF} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer">
              <LuFileText size={14} />Exportar PDF
            </button>
            <button onClick={exportarExcel} className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition cursor-pointer">
              <LuFileSpreadsheet size={14} />Exportar Excel
            </button>
          </div>
        )}
      </div>

      {/* ── Panel de filtros ─────────────────────────────────────────────── */}
      <div className="p-8 pb-4 shrink-0">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
            <LuFilter className="text-red-500" /><span>Parámetros del Reporte</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { label: 'Equipo', el: <select value={equipoId} onChange={e => setEquipoId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"><option value="todos">Todos</option>{equipos.map(eq => <option key={eq.id_equipo} value={eq.id_equipo}>{eq.nombre}</option>)}</select> },
              { label: 'Tipo Equipo', el: <select value={tipoEquipo} onChange={e => setTipoEquipo(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"><option value="todos">Todos</option><option value="laptop">Laptop</option><option value="desktop">Desktop</option><option value="servidor">Servidor</option><option value="impresora">Impresora</option><option value="switch">Switch</option><option value="otro">Otro</option></select> },
              { label: 'Ubicación', el: <input type="text" value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ej: Piso 2" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20" /> },
              { label: 'Desde', el: <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20" /> },
              { label: 'Hasta', el: <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20" /> },
              { label: 'Estado Falla', el: <select value={estadoIncidencia} onChange={e => setEstadoIncidencia(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"><option value="todos">Todos</option><option value="abierto">Abierto</option><option value="en_progreso">En Progreso</option><option value="resuelto">Resuelto</option><option value="cerrado">Cerrado</option></select> },
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
                placeholder="Buscar equipo en los resultados..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20" />
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={limpiar} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-slate-600 font-semibold transition cursor-pointer">Limpiar</button>
              <button onClick={generarReporte} disabled={loading || !authUserId}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 cursor-pointer">
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
            <LuMonitorX className="text-6xl text-slate-200 mx-auto mb-4" />
            <p className="text-slate-700 font-bold text-lg">Sin datos de reporte</p>
            <p className="text-slate-400 text-sm mt-1">Configura los filtros y presiona <span className="font-semibold text-red-600">Generar Reporte</span>.</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LuLoader className="animate-spin text-4xl text-red-500 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Calculando historial de fallas...</p>
          </div>
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────────── */}
      {reportData && !loading && (
        <div className="flex-1 px-8 pb-8 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard label="Total Incidencias" value={reportData.total_incidencias} sub="registradas en el período" color="bg-white border-slate-200 text-slate-800" />
            <KPICard label="Equipos con Fallas" value={reportData.total_equipos_con_fallas} sub="activos afectados" color="bg-red-50 border-red-200 text-red-800" />
            <KPICard label="Promedio de Fallas" value={reportData.promedio_fallas_equipo} sub="por equipo en el período" color="bg-orange-50 border-orange-200 text-orange-800" />
            <KPICard label="Equipo Más Afectado" value={reportData.equipo_mas_fallas.split(' ')[0]} sub={reportData.equipo_mas_fallas} color="bg-amber-50 border-amber-200 text-amber-800" />
          </div>

          {/* Tabla expandible */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Historial por Equipo ({equiposFiltrados.length} equipo{equiposFiltrados.length !== 1 ? 's' : ''})
              </span>
              <span className="text-[10px] text-slate-400">Haz clic en una fila para ver el detalle de incidencias</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" id="tabla-fallas-equipos">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3.5">Equipo</th>
                    <th className="px-4 py-3.5">Ubicación</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-4 py-3.5 text-center text-red-500">Total Fallas</th>
                    <th className="px-4 py-3.5 text-center">Abiertos</th>
                    <th className="px-4 py-3.5 text-center">En Proceso</th>
                    <th className="px-4 py-3.5 text-center">Resueltos</th>
                    <th className="px-4 py-3.5 text-center">T.Prom Res.</th>
                    <th className="px-4 py-3.5 text-center">Última Falla</th>
                  </tr>
                </thead>
                <tbody>
                  {equiposFiltrados.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-16 text-slate-400">No hay equipos con fallas para los filtros aplicados.</td></tr>
                  ) : (
                    equiposFiltrados.map(eq => <EquipoRow key={eq.id_equipo} equipo={eq} />)
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
