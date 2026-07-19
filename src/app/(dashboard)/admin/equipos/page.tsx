'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuSearch,
  LuMonitor,
  LuPlus,
  LuShieldCheck,
  LuLoader,
  LuX,
  LuTriangle,
  LuCircleCheck,
  LuTag,
  LuInfo,
  LuMapPin,
  LuLayers,
  LuPencil,
  LuHistory,
  LuChevronLeft,
  LuChevronRight,
} from 'react-icons/lu';
import { registrarEquipoAction, obtenerEquiposAction, actualizarEquipoAction, obtenerHistorialEstadosAction } from '@/actions/equipoActions';
import { AuthService } from '@/services/AuthService';
import { PerfilesRepository } from '@/repositories/PerfilesRepository';
import { EquipoInformatico, EstadoEquipo, registroEquipoSchema, actualizarEquipoSchema, HistorialEstadoEquipo } from '@/types/equipo';
import { PerfilUsuario } from '@/types/auth';

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
function NuevoEquipoModal({
  onClose,
  onSuccess,
  userId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    tipo: 'laptop',
    marca: '',
    modelo: '',
    numero_serie: '',
    ubicacion: '',
    estado_operativo: 'operativo' as EstadoEquipo,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const validate = (): boolean => {
    const result = registroEquipoSchema.safeParse(form);
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
    setServerError('');

    if (!validate()) return;

    startTransition(async () => {
      const result = await registrarEquipoAction(form, userId);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setServerError(result.error || 'Error al registrar el equipo.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Registrar Equipo Informático</h2>
            <p className="text-xs text-slate-500 mt-0.5">Defina un nuevo activo físico en el inventario</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <LuTriangle className="shrink-0 text-red-500" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Código y Número de Serie */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Código *</label>
              <input
                type="text"
                placeholder="Ej. LAP-102"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.codigo ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
              {errors.codigo && <p className="text-xs text-red-500 mt-1">{errors.codigo}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Nº de Serie *</label>
              <input
                type="text"
                placeholder="Ej. SN-ABCD1234"
                value={form.numero_serie}
                onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.numero_serie ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
              {errors.numero_serie && <p className="text-xs text-red-500 mt-1">{errors.numero_serie}</p>}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Nombre del Equipo *</label>
            <input
              type="text"
              placeholder="Ej. Laptop Dell Latitude 5420"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                errors.nombre ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
              }`}
            />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
          </div>

          {/* Tipo y Estado Operativo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Tipo de Equipo *</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.tipo ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              >
                <option value="laptop">Laptop</option>
                <option value="desktop">Desktop</option>
                <option value="servidor">Servidor</option>
                <option value="switch">Switch</option>
                <option value="router">Router</option>
                <option value="impresora">Impresora</option>
                <option value="otro">Otro</option>
              </select>
              {errors.tipo && <p className="text-xs text-red-500 mt-1">{errors.tipo}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Estado Operativo *</label>
              <select
                value={form.estado_operativo}
                onChange={(e) => setForm({ ...form, estado_operativo: e.target.value as EstadoEquipo })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.estado_operativo ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              >
                <option value="operativo">Operativo</option>
                <option value="mantenimiento">En Mantenimiento</option>
                <option value="inoperativo">Inoperativo</option>
              </select>
              {errors.estado_operativo && <p className="text-xs text-red-500 mt-1">{errors.estado_operativo}</p>}
            </div>
          </div>

          {/* Marca y Modelo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Marca *</label>
              <input
                type="text"
                placeholder="Ej. Dell"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.marca ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
              {errors.marca && <p className="text-xs text-red-500 mt-1">{errors.marca}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Modelo *</label>
              <input
                type="text"
                placeholder="Ej. Latitude 5420"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.modelo ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
              {errors.modelo && <p className="text-xs text-red-500 mt-1">{errors.modelo}</p>}
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Ubicación Física *</label>
            <input
              type="text"
              placeholder="Ej. Oficina 301 - Piso 3"
              value={form.ubicacion}
              onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                errors.ubicacion ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
              }`}
            />
            {errors.ubicacion && <p className="text-xs text-red-500 mt-1">{errors.ubicacion}</p>}
          </div>

          {/* Footer del Formulario */}
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <LuLoader className="animate-spin text-base" />
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Registrar Equipo</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de Edición ─────────────────────────────────────────────────────
function EditarEquipoModal({
  equipo,
  onClose,
  onSuccess,
  userId,
}: {
  equipo: EquipoInformatico;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'datos' | 'historial'>('datos');
  const [form, setForm] = useState({
    nombre: equipo.nombre,
    tipo: equipo.tipo,
    marca: equipo.marca,
    modelo: equipo.modelo,
    numero_serie: equipo.numero_serie,
    ubicacion: equipo.ubicacion,
    estado_operativo: equipo.estado_operativo,
  });
  const [observacion, setObservacion] = useState('');
  const [historial, setHistorial] = useState<HistorialEstadoEquipo[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    async function loadHistorial() {
      setLoadingHistorial(true);
      const res = await obtenerHistorialEstadosAction(equipo.id_equipo);
      if (res.success && res.data) {
        setHistorial(res.data);
      }
      setLoadingHistorial(false);
    }
    loadHistorial();
  }, [equipo.id_equipo]);

  const validate = (): boolean => {
    const result = actualizarEquipoSchema.safeParse(form);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(newErrors);
      return false;
    }

    if (form.estado_operativo !== equipo.estado_operativo && (!observacion || observacion.trim() === '')) {
      setErrors({ observacion: 'Debe ingresar una observación que justifique el cambio de estado.' });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    startTransition(async () => {
      const result = await actualizarEquipoAction(
        equipo.id_equipo,
        form,
        userId,
        form.estado_operativo !== equipo.estado_operativo ? observacion : undefined
      );
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setServerError(result.error || 'Error al actualizar el equipo.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Actualizar Ficha de Equipo</h2>
            <p className="text-xs text-slate-500 mt-0.5">Código Patrimonial: {equipo.codigo}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
            <LuX />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/30 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('datos')}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 px-2 transition ${
              activeTab === 'datos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ficha Técnica
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 px-2 transition flex items-center gap-2 ${
              activeTab === 'historial'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LuHistory className="text-sm" />
            <span>Historial de Estados</span>
          </button>
        </div>

        {activeTab === 'datos' ? (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
                <LuTriangle className="shrink-0 text-red-500" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Código (Deshabilitado) */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Código Patrimonial (Solo lectura)</label>
              <input
                type="text"
                disabled
                value={equipo.codigo}
                className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Nombre del Equipo *</label>
              <input
                type="text"
                placeholder="Ej. Laptop Dell Latitude 5420"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.nombre ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
              />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
            </div>

            {/* Tipo y Estado Operativo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Tipo de Equipo *</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.tipo ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                  }`}
                >
                  <option value="laptop">Laptop</option>
                  <option value="desktop">Desktop</option>
                  <option value="servidor">Servidor</option>
                  <option value="switch">Switch</option>
                  <option value="router">Router</option>
                  <option value="impresora">Impresora</option>
                  <option value="otro">Otro</option>
                </select>
                {errors.tipo && <p className="text-xs text-red-500 mt-1">{errors.tipo}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Estado Operativo *</label>
                <select
                  value={form.estado_operativo}
                  onChange={(e) => setForm({ ...form, estado_operativo: e.target.value as EstadoEquipo })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.estado_operativo ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                  }`}
                >
                  <option value="operativo">Operativo</option>
                  <option value="mantenimiento">En Mantenimiento</option>
                  <option value="inoperativo">Inoperativo</option>
                </select>
                {errors.estado_operativo && <p className="text-xs text-red-500 mt-1">{errors.estado_operativo}</p>}
              </div>
            </div>

            {/* Observación para Cambio de Estado */}
            {form.estado_operativo !== equipo.estado_operativo && (
              <div className="bg-amber-50/30 border border-amber-100 p-4 rounded-xl flex flex-col gap-2 shrink-0">
                <label className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                  <LuInfo />
                  <span>Observación del cambio de estado *</span>
                </label>
                <textarea
                  placeholder="Justifique detalladamente el cambio de estado operativo del equipo..."
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 h-20 resize-none ${
                    errors.observacion ? 'border-red-300' : 'border-amber-200'
                  }`}
                />
                {errors.observacion && <p className="text-xs text-red-500 mt-0.5">{errors.observacion}</p>}
              </div>
            )}

            {/* Marca y Modelo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Marca *</label>
                <input
                  type="text"
                  placeholder="Ej. Dell"
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.marca ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                  }`}
                />
                {errors.marca && <p className="text-xs text-red-500 mt-1">{errors.marca}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Modelo *</label>
                <input
                  type="text"
                  placeholder="Ej. Latitude 5420"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.modelo ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                  }`}
                />
                {errors.modelo && <p className="text-xs text-red-500 mt-1">{errors.modelo}</p>}
              </div>
            </div>

            {/* Número de Serie y Ubicación */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Nº de Serie *</label>
                <input
                  type="text"
                  placeholder="Ej. SN-ABCD1234"
                  value={form.numero_serie}
                  onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.numero_serie ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                  }`}
                />
                {errors.numero_serie && <p className="text-xs text-red-500 mt-1">{errors.numero_serie}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Ubicación Física *</label>
                <input
                  type="text"
                  placeholder="Ej. Oficina 301 - Piso 3"
                  value={form.ubicacion}
                  onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.ubicacion ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                  }`}
                />
                {errors.ubicacion && <p className="text-xs text-red-500 mt-1">{errors.ubicacion}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-auto pt-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <LuLoader className="animate-spin text-base" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Cambios</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Historial Tab */
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loadingHistorial ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <LuLoader className="text-3xl text-blue-600 animate-spin" />
                <span className="text-slate-500 text-xs font-semibold">Cargando trazabilidad...</span>
              </div>
            ) : historial.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-sm">
                  <LuHistory className="text-xl" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Sin cambios de estado</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Este equipo mantiene su estado original de registro y no reporta historial de cambios de estado operativo.
                </p>
              </div>
            ) : (
              /* Timeline */
              <div className="relative border-l border-slate-100 ml-3 pl-6 space-y-6 py-2">
                {historial.map((h) => {
                  const statusColors = {
                    operativo: { text: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                    mantenimiento: { text: 'text-amber-700 bg-amber-50 border-amber-100' },
                    inoperativo: { text: 'text-red-700 bg-red-50 border-red-100' },
                  };

                  return (
                    <div key={h.id_historial} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 bg-white border-2 border-blue-500 w-4 h-4 rounded-full flex items-center justify-center">
                        <span className="bg-blue-500 w-1.5 h-1.5 rounded-full"></span>
                      </span>

                      {/* Content Card */}
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                        {/* Title & Date */}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {new Date(h.fecha_cambio).toLocaleString()}
                          </span>
                          {h.usuario_cambio && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              Por: {h.usuario_cambio.nombre} {h.usuario_cambio.apellido}
                            </span>
                          )}
                        </div>

                        {/* Transition badges */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColors[h.estado_anterior as EstadoEquipo]?.text || 'bg-slate-100'}`}>
                            {h.estado_anterior}
                          </span>
                          <span className="text-slate-400 text-xs font-bold">→</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColors[h.estado_nuevo as EstadoEquipo]?.text || 'bg-slate-100'}`}>
                            {h.estado_nuevo}
                          </span>
                        </div>

                        {/* Observación */}
                        {h.observacion && (
                          <p className="text-xs text-slate-600 mt-1 italic border-l-2 border-slate-200 pl-2 bg-white/40 py-1 rounded">
                            "{h.observacion}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────
export default function EquiposPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  const [isJefeTi, setIsJefeTi] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [equipos, setEquipos] = useState<EquipoInformatico[]>([]);
  const [filteredEquipos, setFilteredEquipos] = useState<EquipoInformatico[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<EquipoInformatico | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 1. Cargar datos de autenticación y verificar rol Jefe de TI (id_rol = 1)
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
        setIsJefeTi(profile.id_rol === 1);
      } catch (err) {
        console.error('Error verificando sesión:', err);
        router.push('/login');
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Cargar lista de equipos registrados
  const loadEquipos = async () => {
    setLoadingList(true);
    const result = await obtenerEquiposAction();
    if (result.success && result.data) {
      setEquipos(result.data);
      setFilteredEquipos(result.data);
    } else {
      setToast({ message: result.error || 'Error al cargar equipos', type: 'error' });
    }
    setLoadingList(false);
  };

  useEffect(() => {
    if (!loadingAuth && isJefeTi) {
      loadEquipos();
    }
  }, [loadingAuth, isJefeTi]);

  // 3. Filtrado local de equipos
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredEquipos(equipos);
      setCurrentPage(1);
      return;
    }

    const filtered = equipos.filter(
      (e) =>
        e.codigo.toLowerCase().includes(q) ||
        e.nombre.toLowerCase().includes(q) ||
        e.marca.toLowerCase().includes(q) ||
        e.modelo.toLowerCase().includes(q) ||
        e.numero_serie.toLowerCase().includes(q) ||
        e.ubicacion.toLowerCase().includes(q) ||
        e.tipo.toLowerCase().includes(q)
    );
    setFilteredEquipos(filtered);
    setCurrentPage(1);
  }, [searchQuery, equipos]);

  const handleRegisterSuccess = () => {
    setToast({ message: 'Equipo registrado correctamente en el inventario.', type: 'success' });
    loadEquipos();
  };

  const handleEditSuccess = () => {
    setToast({ message: 'Ficha de equipo actualizada con éxito.', type: 'success' });
    loadEquipos();
  };

  // Render Loader
  if (loadingAuth) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <LuLoader className="text-4xl text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Cargando módulo de inventario...</p>
      </div>
    );
  }

  // Render Access Denied Fallback
  if (!isJefeTi) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-4 border border-red-100 shadow-sm">
          <LuShieldCheck className="text-3xl" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Acceso Restringido</h1>
        <p className="text-slate-500 text-sm max-w-sm mt-2">
          Esta sección es exclusiva para el rol **Jefe de TI**. Su cuenta actual no posee privilegios para registrar o visualizar activos de hardware.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 px-5 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl shadow hover:bg-slate-700 transition"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const itemsPerPage = 9;
  const totalPages = Math.ceil(filteredEquipos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredEquipos.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LuMonitor className="text-blue-600" />
            <span>Inventario de Equipos</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Gestione y asocie los activos informáticos a los reportes de incidentes.
          </p>
        </div>

        <button
          id="btn-nuevo-equipo"
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0"
        >
          <LuPlus className="text-lg" />
          <span>Registrar Equipo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <LuSearch className="absolute left-3.5 top-3.5 text-slate-400 text-lg" />
          <input
            type="text"
            placeholder="Buscar por código, serie, nombre, marca o modelo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
          />
        </div>
      </div>

      {/* Listado Grid */}
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
      ) : filteredEquipos.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <LuMonitor className="text-2xl" />
          </div>
          <h3 className="font-bold text-slate-800">No se encontraron equipos</h3>
          <p className="text-slate-500 text-sm mt-1.5">
            {searchQuery
              ? 'No hay registros que coincidan con su búsqueda. Intente con otro término.'
              : 'Aún no se ha registrado ningún equipo informático en el sistema.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition"
            >
              Limpiar Búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((equipo) => {
            const statusConfig = {
              operativo: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Operativo' },
              mantenimiento: { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Mantenimiento' },
              inoperativo: { bg: 'bg-red-50 text-red-700 border-red-100', label: 'Inoperativo' },
            }[equipo.estado_operativo] || { bg: 'bg-slate-50 text-slate-700 border-slate-100', label: equipo.estado_operativo };

            return (
              <div
                key={equipo.id_equipo}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Badge de Estado */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {equipo.tipo}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusConfig.bg}`}>
                      {statusConfig.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEquipo(equipo);
                      }}
                      className="p-1 border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg transition shrink-0 bg-white shadow-sm"
                      title="Editar Ficha"
                    >
                      <LuPencil className="text-[10px]" />
                    </button>
                  </div>
                </div>

                {/* Título y Código */}
                <div>
                  <h3 className="font-bold text-slate-800 text-base leading-tight line-clamp-1">{equipo.nombre}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <LuTag />
                    <span>Código: {equipo.codigo}</span>
                  </div>
                </div>

                {/* Detalles del Inventario */}
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
                    <span className="font-semibold text-slate-700">{equipo.ubicacion}</span>
                  </div>
                </div>

                {/* Registro Footer */}
                {equipo.usuario_registro && (
                  <div className="border-t border-slate-50 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Registrado por:</span>
                    <span className="font-medium text-slate-600">
                      {equipo.usuario_registro.nombre} {equipo.usuario_registro.apellido}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 col-span-full">
              <span className="text-xs text-slate-500 font-medium">
                Mostrando <span className="font-semibold text-slate-700">{startIndex + 1}</span> al{' '}
                <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, filteredEquipos.length)}</span> de{' '}
                <span className="font-semibold text-slate-700">{filteredEquipos.length}</span> equipos
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <LuChevronLeft size={14} />
                </button>
                <span className="text-xs text-slate-600 font-semibold px-1">
                  Pág. {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <LuChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Registro */}
      {modalOpen && currentUser && (
        <NuevoEquipoModal
          userId={currentUser.id_auth_supabase}
          onClose={() => setModalOpen(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}

      {/* Modal de Edición */}
      {editingEquipo && currentUser && (
        <EditarEquipoModal
          userId={currentUser.id_auth_supabase}
          equipo={editingEquipo}
          onClose={() => setEditingEquipo(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
