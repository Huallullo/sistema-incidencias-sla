'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LuSearch, LuPencil, LuPlus, LuShieldCheck, LuLoader, LuX, LuTriangle, LuCircleCheck } from 'react-icons/lu';
import { registrarPrioridadAction, obtenerPrioridadesAction } from '@/actions/prioridadesActions';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import {
  PrioridadServicio,
  NivelPrioridad,
  NIVEL_CONFIG,
  PrioridadInput,
  formatMinutos,
} from '@/types/prioridadServicio';

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
      {type === 'success' ? <LuCircleCheck className="text-lg shrink-0 text-emerald-500" /> : <LuTriangle className="text-lg shrink-0 text-red-500" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600 transition">
        <LuX />
      </button>
    </div>
  );
}

// ─── Modal de registro ────────────────────────────────────────────────────
function NuevoPrioridadModal({
  onClose,
  onSuccess,
  nivelesRegistrados,
}: {
  onClose: () => void;
  onSuccess: () => void;
  nivelesRegistrados: NivelPrioridad[];
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    nivel: '' as NivelPrioridad | '',
    descripcion: '',
    tiempo_respuesta_min: '',
    tiempo_resolucion_min: '',
    escalamiento: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const nivelesDisponibles = (['critica', 'alta', 'media', 'baja'] as NivelPrioridad[]).filter(
    (n) => !nivelesRegistrados.includes(n)
  );

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.nivel) e.nivel = 'Seleccione un nivel';
    if (!form.descripcion || form.descripcion.length < 10) e.descripcion = 'Mínimo 10 caracteres';
    const resp = Number(form.tiempo_respuesta_min);
    const resol = Number(form.tiempo_resolucion_min);
    if (!form.tiempo_respuesta_min || isNaN(resp) || resp <= 0 || !Number.isInteger(resp))
      e.tiempo_respuesta_min = 'Ingrese minutos enteros mayor a 0';
    if (!form.tiempo_resolucion_min || isNaN(resol) || resol <= 0 || !Number.isInteger(resol))
      e.tiempo_resolucion_min = 'Ingrese minutos enteros mayor a 0';
    if (resp > 0 && resol > 0 && resol <= resp)
      e.tiempo_resolucion_min = 'La resolución debe ser mayor a la respuesta';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    const input: PrioridadInput = {
      nivel: form.nivel as NivelPrioridad,
      descripcion: form.descripcion,
      tiempo_respuesta_min: Number(form.tiempo_respuesta_min),
      tiempo_resolucion_min: Number(form.tiempo_resolucion_min),
      escalamiento: form.escalamiento || null,
    };

    startTransition(async () => {
      const result = await registrarPrioridadAction(input);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setServerError(result.error || 'Error al registrar');
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Nueva Prioridad SLA</h2>
            <p className="text-xs text-slate-500 mt-0.5">Defina el nivel y los tiempos de servicio</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg">
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <LuTriangle className="shrink-0" /> {serverError}
            </div>
          )}

          {/* Nivel */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Nivel *</label>
            <select
              id="select-nivel-prioridad"
              value={form.nivel}
              onChange={(e) => setForm({ ...form, nivel: e.target.value as NivelPrioridad })}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nivel ? 'border-red-400' : 'border-slate-200'}`}
            >
              <option value="">Seleccionar nivel...</option>
              {nivelesDisponibles.map((n) => (
                <option key={n} value={n}>{NIVEL_CONFIG[n].label}</option>
              ))}
            </select>
            {errors.nivel && <p className="text-xs text-red-500 mt-1">{errors.nivel}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Descripción *</label>
            <textarea
              id="input-descripcion-prioridad"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="ej. Sistema completo caído o pérdida de datos"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.descripcion ? 'border-red-400' : 'border-slate-200'}`}
            />
            {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion}</p>}
          </div>

          {/* Tiempos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                T. Respuesta (min) *
              </label>
              <input
                id="input-tiempo-respuesta"
                type="number"
                min={1}
                value={form.tiempo_respuesta_min}
                onChange={(e) => setForm({ ...form, tiempo_respuesta_min: e.target.value })}
                placeholder="ej. 15"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.tiempo_respuesta_min ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.tiempo_respuesta_min && <p className="text-xs text-red-500 mt-1">{errors.tiempo_respuesta_min}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                T. Resolución (min) *
              </label>
              <input
                id="input-tiempo-resolucion"
                type="number"
                min={1}
                value={form.tiempo_resolucion_min}
                onChange={(e) => setForm({ ...form, tiempo_resolucion_min: e.target.value })}
                placeholder="ej. 120"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.tiempo_resolucion_min ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.tiempo_resolucion_min && <p className="text-xs text-red-500 mt-1">{errors.tiempo_resolucion_min}</p>}
            </div>
          </div>

          {/* Escalamiento */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              Escalamiento (Opcional)
            </label>
            <p className="text-[11px] text-slate-400 mb-1.5 leading-tight">
              Tiempo o regla para derivar la incidencia a un supervisor si expira el SLA (ej. Inmediato, 1 hora).
            </p>
            <input
              id="input-escalamiento"
              type="text"
              value={form.escalamiento}
              onChange={(e) => setForm({ ...form, escalamiento: e.target.value })}
              placeholder="ej. Inmediato, 1 hora, 4 horas"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-prioridad"
              type="submit"
              disabled={isPending}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending ? <LuLoader className="animate-spin" /> : <LuShieldCheck />}
              {isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PrioridadesSLAPage() {
  const router = useRouter();
  const [prioridades, setPrioridades] = useState<PrioridadServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');

  // Proteger ruta para que solo acceda Jefe de TI
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

        cargar();
      } catch (err) {
        console.error('Error cargando sesión:', err);
        router.push('/login');
      }
    }

    loadSession();
  }, [router]);

  async function cargar() {
    setLoading(true);
    const res = await obtenerPrioridadesAction();
    if (res.success && res.data) {
      // Ordenar por nivel: critica > alta > media > baja
      const orden: Record<NivelPrioridad, number> = { critica: 1, alta: 2, media: 3, baja: 4 };
      setPrioridades(res.data.sort((a, b) => orden[a.nivel] - orden[b.nivel]));
    }
    setLoading(false);
  }

  const nivelesRegistrados = prioridades.map((p) => p.nivel);
  const hayDisponibles = nivelesRegistrados.length < 4;

  const filtradas = prioridades.filter(
    (p) =>
      !search ||
      NIVEL_CONFIG[p.nivel].label.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f3f4f6]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {showModal && (
        <NuevoPrioridadModal
          onClose={() => setShowModal(false)}
          nivelesRegistrados={nivelesRegistrados}
          onSuccess={() => {
            cargar();
            setToast({ message: 'Prioridad registrada exitosamente.', type: 'success' });
          }}
        />
      )}

      {/* ── Top bar ────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Prioridades y SLA</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nivel o descripción..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          {/* + Nuevo */}
          {hayDisponibles && (
            <button
              id="btn-nueva-prioridad"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
            >
              <LuPlus className="text-base" />
              Nuevo
            </button>
          )}
        </div>
      </div>

      {/* ── Contenido ──────────────────────────────────── */}
      <div className="flex-1 p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Tabla */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-32">Nivel</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Descripción</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-32">T. Respuesta</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-32">T. Resolución</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-32">
                  <span>Escalamiento</span>
                  <span
                    className="ml-1 inline-block cursor-help text-slate-300 hover:text-slate-500 font-bold"
                    title="Tiempo o regla para derivar el caso a un nivel superior si expira el SLA."
                  >
                    (?)
                  </span>
                </th>
                <th className="w-16 px-4 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <LuLoader className="animate-spin text-2xl mx-auto mb-2 text-blue-400" />
                    <span className="text-sm">Cargando prioridades...</span>
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <LuShieldCheck className="text-4xl mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">
                      {search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay prioridades registradas.'}
                    </p>
                    {!search && hayDisponibles && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="mt-3 text-blue-600 text-sm font-semibold hover:underline"
                      >
                        + Registrar primera prioridad
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtradas.map((p, idx) => {
                  const cfg = NIVEL_CONFIG[p.nivel];
                  return (
                    <tr
                      key={p.id_prioridad}
                      className={`border-b border-slate-50 hover:bg-slate-50/60 transition ${idx % 2 === 0 ? '' : ''}`}
                    >
                      {/* NIVEL */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block text-xs font-semibold px-3 py-1 rounded-md ${cfg.badgeBg} ${cfg.badgeText}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      {/* DESCRIPCIÓN */}
                      <td className="px-4 py-4 text-slate-600">{p.descripcion}</td>
                      {/* T. RESPUESTA */}
                      <td className="px-4 py-4 text-slate-700 font-medium">
                        {formatMinutos(p.tiempo_respuesta_min)}
                      </td>
                      {/* T. RESOLUCIÓN */}
                      <td className="px-4 py-4 text-slate-700 font-medium">
                        {formatMinutos(p.tiempo_resolucion_min)}
                      </td>
                      {/* ESCALAMIENTO */}
                      <td className="px-4 py-4 text-slate-500">
                        {p.escalamiento ?? <span className="text-slate-300">—</span>}
                      </td>
                      {/* EDITAR */}
                      <td className="px-4 py-4 text-right">
                        <button
                          id={`btn-editar-${p.nivel}`}
                          className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-300 transition"
                          title="Editar prioridad"
                        >
                          <LuPencil className="text-sm" />
                        </button>
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
  );
}
