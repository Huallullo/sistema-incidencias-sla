'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuSearch,
  LuCalendarClock,
  LuPlus,
  LuX,
  LuTriangle,
  LuCircleCheck,
  LuPencil,
  LuTrash2,
  LuClock,
  LuCalendar,
  LuUser,
  LuLoader,
} from 'react-icons/lu';
import { 
  registrarDisponibilidadAction, 
  registrarRangoDisponibilidadAction,
  actualizarDisponibilidadAction, 
  eliminarDisponibilidadAction, 
  obtenerDisponibilidadesAction,
  obtenerTecnicosAction
} from '@/actions/disponibilidadActions';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { 
  DisponibilidadTecnico, 
  Turno, 
  EstadoDisponibilidad,
  registroDisponibilidadSchema,
  registroRangoDisponibilidadSchema
} from '@/types/disponibilidad';
import type { PerfilUsuario } from '@/types/auth';

// ─── Toast Component ──────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
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
      {type === 'success' ? (
        <LuCircleCheck className="text-lg shrink-0 text-emerald-500" />
      ) : (
        <LuTriangle className="text-lg shrink-0 text-red-500" />
      )}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600 transition">
        <LuX />
      </button>
    </div>
  );
}

// ─── Modal de Registro ────────────────────────────────────────────────────
function NuevaDisponibilidadModal({
  onClose,
  onSuccess,
  userId,
  tecnicos,
  defaultTecnicoId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  tecnicos: PerfilUsuario[];
  defaultTecnicoId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [form, setForm] = useState({
    id_tecnico: defaultTecnicoId || '',
    fecha: new Date().toISOString().split('T')[0],
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    hora_inicio: '08:00',
    hora_fin: '16:00',
    turno: 'mañana' as Turno,
    estado: 'disponible' as EstadoDisponibilidad,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const validate = (): boolean => {
    let result;
    if (mode === 'single') {
      result = registroDisponibilidadSchema.safeParse({
        id_tecnico: form.id_tecnico,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        turno: form.turno,
        estado: form.estado,
      });
    } else {
      result = registroRangoDisponibilidadSchema.safeParse({
        id_tecnico: form.id_tecnico,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        turno: form.turno,
        estado: form.estado,
      });
    }

    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        newErrors[issue.path[0] as string] = issue.message;
      }
    });
    setErrors(newErrors);
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        let res;
        if (mode === 'single') {
          res = await registrarDisponibilidadAction({
            id_tecnico: form.id_tecnico,
            fecha: form.fecha,
            hora_inicio: form.hora_inicio,
            hora_fin: form.hora_fin,
            turno: form.turno,
            estado: form.estado,
          }, userId);
        } else {
          res = await registrarRangoDisponibilidadAction({
            id_tecnico: form.id_tecnico,
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin,
            hora_inicio: form.hora_inicio,
            hora_fin: form.hora_fin,
            turno: form.turno,
            estado: form.estado,
          }, userId);
        }

        if (res.success) {
          onSuccess();
        } else {
          setServerError(res.error || 'Error al guardar la disponibilidad.');
        }
      } catch (err) {
        setServerError('Error de comunicación con el servidor.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <LuCalendarClock className="text-xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Registrar Disponibilidad</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Asigne horarios al personal técnico</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100">
            <LuX className="text-xl" />
          </button>
        </div>

        {/* Selector de Modo (Día / Rango) */}
        <div className="flex px-6 pt-5 shrink-0 gap-4">
          <button
            type="button"
            onClick={() => {
              setMode('single');
              setErrors({});
            }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border text-center transition ${
              mode === 'single'
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            Fecha Única
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('range');
              setErrors({});
            }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border text-center transition ${
              mode === 'range'
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            Rango de Fechas
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <LuTriangle className="shrink-0 text-red-500" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Técnico */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Técnico Asignado *</label>
            <select
              value={form.id_tecnico}
              onChange={(e) => setForm({ ...form, id_tecnico: e.target.value })}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                errors.id_tecnico ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
              }`}
            >
              <option value="">Seleccione un técnico...</option>
              {tecnicos.map((t) => (
                <option key={t.id_perfil} value={t.id_perfil}>
                  {t.nombre} {t.apellido} ({t.correo})
                </option>
              ))}
            </select>
            {errors.id_tecnico && <p className="text-xs text-red-500 mt-1">{errors.id_tecnico}</p>}
          </div>

          {/* Fechas */}
          {mode === 'single' ? (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Fecha de Disponibilidad *</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.fecha ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
              {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Fecha Inicio *</label>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.fecha_inicio ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                  }`}
                />
                {errors.fecha_inicio && <p className="text-xs text-red-500 mt-1">{errors.fecha_inicio}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Fecha Fin *</label>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.fecha_fin ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                  }`}
                />
                {errors.fecha_fin && <p className="text-xs text-red-500 mt-1">{errors.fecha_fin}</p>}
              </div>
            </div>
          )}

          {/* Horas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Hora Inicio *</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.hora_fin ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Hora Fin *</label>
              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.hora_fin ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.hora_fin && <p className="col-span-2 text-xs text-red-500">{errors.hora_fin}</p>}
          </div>

          {/* Turno y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Turno *</label>
              <select
                value={form.turno}
                onChange={(e) => setForm({ ...form, turno: e.target.value as Turno })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Estado *</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoDisponibilidad })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="disponible">Disponible</option>
                <option value="no_disponible">No Disponible</option>
              </select>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isPending && <LuLoader className="animate-spin text-base" />}
              <span>{isPending ? 'Registrando...' : 'Registrar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de Edición ─────────────────────────────────────────────────────
function EditarDisponibilidadModal({
  disponibilidad,
  onClose,
  onSuccess,
  userId,
}: {
  disponibilidad: DisponibilidadTecnico;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    fecha: disponibilidad.fecha,
    hora_inicio: disponibilidad.hora_inicio.substring(0, 5),
    hora_fin: disponibilidad.hora_fin.substring(0, 5),
    turno: disponibilidad.turno,
    estado: disponibilidad.estado,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const validate = (): boolean => {
    const result = registroDisponibilidadSchema.safeParse({
      id_tecnico: disponibilidad.id_tecnico,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      turno: form.turno,
      estado: form.estado,
    });

    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        newErrors[issue.path[0] as string] = issue.message;
      }
    });
    setErrors(newErrors);
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        const res = await actualizarDisponibilidadAction(
          disponibilidad.id_disponibilidad,
          {
            fecha: form.fecha,
            hora_inicio: form.hora_inicio,
            hora_fin: form.hora_fin,
            turno: form.turno,
            estado: form.estado,
          },
          userId
        );

        if (res.success) {
          onSuccess();
        } else {
          setServerError(res.error || 'Error al actualizar la disponibilidad.');
        }
      } catch (err) {
        setServerError('Error de comunicación con el servidor.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <LuPencil className="text-xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Editar Disponibilidad</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Modifique la ficha del técnico</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100">
            <LuX className="text-xl" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <LuTriangle className="shrink-0 text-red-500" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Técnico (Solo Lectura) */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Técnico (Solo lectura)</label>
            <div className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-400 bg-slate-50 select-none">
              {disponibilidad.tecnico?.nombre} {disponibilidad.tecnico?.apellido}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Fecha *</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                errors.fecha ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
              }`}
            />
            {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha}</p>}
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Hora Inicio *</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.hora_fin ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Hora Fin *</label>
              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.hora_fin ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.hora_fin && <p className="col-span-2 text-xs text-red-500">{errors.hora_fin}</p>}
          </div>

          {/* Turno y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Turno *</label>
              <select
                value={form.turno}
                onChange={(e) => setForm({ ...form, turno: e.target.value as Turno })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Estado *</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoDisponibilidad })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="disponible">Disponible</option>
                <option value="no_disponible">No Disponible</option>
              </select>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isPending && <LuLoader className="animate-spin text-base" />}
              <span>{isPending ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de Eliminación ─────────────────────────────────────────────────
function ConfirmarEliminarModal({
  onClose,
  onConfirm,
  isPending,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
        <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <LuTrash2 className="text-xl" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-2">¿Eliminar Disponibilidad?</h3>
        <p className="text-xs text-slate-500 font-semibold mb-6">
          Esta acción no se puede deshacer. Se removerá este bloque del inventario de disponibilidad del personal técnico.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-75"
          >
            {isPending && <LuLoader className="animate-spin text-sm" />}
            <span>{isPending ? 'Eliminando...' : 'Eliminar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────
export default function DisponibilidadPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [tecnicos, setTecnicos] = useState<PerfilUsuario[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadTecnico[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Estados de expansión y técnicos seleccionados por defecto
  const [expandedTecnicos, setExpandedTecnicos] = useState<Record<string, boolean>>({});
  const [defaultTecnicoId, setDefaultTecnicoId] = useState<string | undefined>(undefined);

  // Filtros locales e interacción con backend
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTurno, setFilterTurno] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Modales y Toasts
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDisp, setEditingDisp] = useState<DisponibilidadTecnico | null>(null);
  const [deletingDispId, setDeletingDispId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTecnicos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const groupedList = tecnicos
    .map((tec) => {
      let schs = disponibilidades.filter((d) => d.id_tecnico === tec.id_perfil);
      if (filterTurno !== 'todos') {
        schs = schs.filter((d) => d.turno === filterTurno);
      }
      if (filterEstado !== 'todos') {
        schs = schs.filter((d) => d.estado === filterEstado);
      }
      return {
        tecnico: tec,
        schedules: schs,
      };
    })
    .filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (q === '') return true;
      const full = `${item.tecnico.nombre} ${item.tecnico.apellido}`.toLowerCase();
      return full.includes(q) || (item.tecnico.correo || '').toLowerCase().includes(q);
    })
    .filter((item) => {
      if (filterTurno !== 'todos' || filterEstado !== 'todos') {
        return item.schedules.length > 0;
      }
      return true;
    });

  // 1. Cargar sesión y verificar rol de Jefe de TI
  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await AuthService.getSession();
        if (!session?.user?.id) {
          router.push('/login');
          return;
        }

        const profile = await PerfilesRepository.getProfileByUserId(session.user.id);
        if (!profile || profile.id_rol !== 1) {
          router.push('/dashboard');
          return;
        }

        setCurrentUser(profile as PerfilUsuario);
      } catch (err) {
        console.error('Error verificando sesión:', err);
        router.push('/login');
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Cargar disponibilidades y técnicos con filtros de backend
  const loadData = async () => {
    if (!currentUser) return;
    setLoadingList(true);
    try {
      const filters: { fecha_inicio?: string; fecha_fin?: string } = {};
      if (filterFechaInicio) filters.fecha_inicio = filterFechaInicio;
      if (filterFechaFin) filters.fecha_fin = filterFechaFin;

      const listRes = await obtenerDisponibilidadesAction(filters, currentUser.id_auth_supabase ?? '');
      if (listRes.success && listRes.data) {
        setDisponibilidades(listRes.data);
      }

      const tecRes = await obtenerTecnicosAction();
      if (tecRes.success && tecRes.data) {
        setTecnicos(tecRes.data);
      }
    } catch (err) {
      console.error('Error al cargar datos de disponibilidad:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, filterFechaInicio, filterFechaFin]);



  // 4. Eliminar disponibilidad
  const handleConfirmDelete = async () => {
    if (!deletingDispId || !currentUser) return;
    setIsDeleting(true);
    try {
      const res = await eliminarDisponibilidadAction(deletingDispId, currentUser.id_auth_supabase ?? '');
      if (res.success) {
        setToast({ message: 'Disponibilidad eliminada con éxito.', type: 'success' });
        setDeletingDispId(null);
        loadData();
      } else {
        setToast({ message: res.error || 'Error al eliminar.', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Error de red al intentar eliminar.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <LuLoader className="animate-spin text-3xl text-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Cargando módulo de disponibilidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/40 px-6 py-6 gap-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LuCalendarClock className="text-blue-600" />
            <span>Disponibilidad de Técnicos</span>
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Gestione los turnos y horarios semanales para la asignación de incidencias del soporte técnico.
          </p>
        </div>

        <button
          onClick={() => {
            setDefaultTecnicoId(undefined);
            setModalOpen(true);
          }}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm shadow-blue-500/10 cursor-pointer self-start md:self-auto"
        >
          <LuPlus className="text-base" />
          <span>Registrar Disponibilidad</span>
        </button>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4 shrink-0">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Buscador */}
          <div className="flex-1 relative">
            <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Buscar por nombre de técnico o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
            />
          </div>

          {/* Filtro Turno */}
          <div className="w-full md:w-48">
            <select
              value={filterTurno}
              onChange={(e) => setFilterTurno(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="todos">Todos los Turnos</option>
              <option value="mañana">Turno Mañana</option>
              <option value="tarde">Turno Tarde</option>
              <option value="noche">Turno Noche</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="w-full md:w-48">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="todos">Todos los Estados</option>
              <option value="disponible">Disponible</option>
              <option value="no_disponible">No Disponible</option>
            </select>
          </div>
        </div>

        {/* Fila de Filtro de Fechas (Período Vigente Consultado) */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
            <span>Período de consulta:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-semibold">Desde:</label>
            <input
              type="date"
              value={filterFechaInicio}
              onChange={(e) => setFilterFechaInicio(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-semibold">Hasta:</label>
            <input
              type="date"
              value={filterFechaFin}
              onChange={(e) => setFilterFechaFin(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          {(searchQuery || filterTurno !== 'todos' || filterEstado !== 'todos' || filterFechaInicio || filterFechaFin) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterTurno('todos');
                setFilterEstado('todos');
                setFilterFechaInicio('');
                setFilterFechaFin('');
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline ml-auto flex items-center gap-1 transition cursor-pointer"
            >
              <LuX />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="flex-1 overflow-y-auto">
        {loadingList ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <LuLoader className="animate-spin text-2xl text-blue-600" />
              <p className="text-xs font-semibold text-slate-500">Cargando disponibilidades...</p>
            </div>
          </div>
        ) : groupedList.length === 0 ? (
          <div className="h-full bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <LuCalendarClock className="text-2xl" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">No se encontraron registros</h3>
            <p className="text-xs text-slate-500 font-semibold max-w-sm">
              No hay disponibilidades registradas en el sistema que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-6">
            {groupedList.map((item) => {
              const { tecnico, schedules } = item;
              const isExpanded = !!expandedTecnicos[tecnico.id_perfil];
              const initials = `${tecnico.nombre?.charAt(0) || 'T'}${tecnico.apellido?.charAt(0) || 'S'}`.toUpperCase();

              return (
                <div
                  key={tecnico.id_perfil}
                  className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-sm transition overflow-hidden"
                >
                  {/* Fila Principal: Datos del Técnico */}
                  <div
                    onClick={() => toggleExpand(tecnico.id_perfil)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          {tecnico.nombre} {tecnico.apellido}
                          <span className="text-xs text-slate-400 font-normal">({tecnico.cargo || 'Técnico de Soporte'})</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{tecnico.correo}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        schedules.length > 0 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {schedules.length} {schedules.length === 1 ? 'horario' : 'horarios'}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultTecnicoId(tecnico.id_perfil);
                          setModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <LuPlus className="text-sm shrink-0" />
                        <span>Agregar Horario</span>
                      </button>

                      <div className="text-slate-400 p-1 hover:text-slate-600 text-xs font-bold text-blue-600">
                        {isExpanded ? 'Ocultar ▲' : 'Ver turnos ▼'}
                      </div>
                    </div>
                  </div>

                  {/* Sub-tabla de Horarios */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/30 p-5">
                      {schedules.length === 0 ? (
                        <div className="text-center py-6 text-slate-400">
                          <p className="text-xs font-semibold italic">Sin turnos asignados para este período.</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDefaultTecnicoId(tecnico.id_perfil);
                              setModalOpen(true);
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer"
                          >
                            Asignar el primer turno ahora ➔
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                                <th className="px-5 py-3 w-1/3">Día / Fecha</th>
                                <th className="px-4 py-3">Rango Horario</th>
                                <th className="px-4 py-3">Turno</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-5 py-3 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {schedules.map((d) => {
                                const turnColors = {
                                  mañana: 'bg-sky-50 text-sky-700 border-sky-100',
                                  tarde: 'bg-amber-50 text-amber-700 border-amber-100',
                                  noche: 'bg-purple-50 text-purple-700 border-purple-100',
                                };

                                const stateColors = {
                                  disponible: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                                  no_disponible: 'bg-red-50 text-red-700 border-red-100',
                                };

                                return (
                                  <tr key={d.id_disponibilidad} className="hover:bg-slate-50/50 transition">
                                    <td className="px-5 py-3 font-semibold text-slate-700">
                                      {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                      })}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-600">
                                      {d.hora_inicio.substring(0, 5)} - {d.hora_fin.substring(0, 5)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${turnColors[d.turno] || 'bg-slate-50'}`}>
                                        {d.turno}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${stateColors[d.estado] || 'bg-slate-50'}`}>
                                        {d.estado === 'disponible' ? 'Disponible' : 'No Disponible'}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingDisp(d);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                          title="Editar"
                                        >
                                          <LuPencil className="text-sm" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingDispId(d.id_disponibilidad);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                          title="Eliminar"
                                        >
                                          <LuTrash2 className="text-sm" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      {modalOpen && currentUser && (
        <NuevaDisponibilidadModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            setToast({ message: 'Disponibilidad registrada correctamente.', type: 'success' });
            loadData();
          }}
          userId={currentUser.id_auth_supabase ?? ''}
          tecnicos={tecnicos}
          defaultTecnicoId={defaultTecnicoId}
        />
      )}

      {editingDisp && currentUser && (
        <EditarDisponibilidadModal
          disponibilidad={editingDisp}
          onClose={() => setEditingDisp(null)}
          onSuccess={() => {
            setEditingDisp(null);
            setToast({ message: 'Disponibilidad actualizada correctamente.', type: 'success' });
            loadData();
          }}
          userId={currentUser.id_auth_supabase ?? ''}
        />
      )}

      {deletingDispId && (
        <ConfirmarEliminarModal
          onClose={() => setDeletingDispId(null)}
          onConfirm={handleConfirmDelete}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
