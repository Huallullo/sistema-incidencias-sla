'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell, FaInfoCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import { obtenerAlertasNotificacionesAction, AlertaNotificacion } from '@/actions/notificacionesActions';

export default function NotificacionesCampana({ authUserId }: { authUserId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [alertas, setAlertas] = useState<AlertaNotificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = async () => {
    if (!authUserId) return;
    setLoading(true);
    const res = await obtenerAlertasNotificacionesAction(authUserId);
    if (res.success && res.data) {
      setAlertas(res.data);
      const unread = res.data.some(a => !a.leido && a.id !== 'no-alerts');
      setHasUnread(unread);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();

    // Consultar cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [authUserId]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (item: AlertaNotificacion) => {
    setIsOpen(false);
    // Marcar como leído localmente para mejorar UX
    setAlertas(prev => prev.map(a => a.id === item.id ? { ...a, leido: true } : a));
    
    // Si no quedan sin leer
    const stillUnread = alertas.some(a => a.id !== item.id && !a.leido && a.id !== 'no-alerts');
    setHasUnread(stillUnread);

    if (item.link && item.link !== '#') {
      router.push(item.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de la Campana */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            loadNotifications();
          }
        }}
        className={`w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 relative transition cursor-pointer ${
          isOpen ? 'bg-slate-50 ring-2 ring-blue-500/20' : 'bg-white'
        }`}
        title="Notificaciones de actividad"
      >
        <FaBell className={hasUnread ? 'text-blue-600 animate-bounce' : 'text-slate-500'} size={14} />
        {hasUnread && (
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500 ring-2 ring-white"></span>
        )}
      </button>

      {/* Menú Desplegable Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Alertas de Actividad
            </h3>
            {hasUnread && (
              <button
                onClick={() => {
                  setAlertas(prev => prev.map(a => ({ ...a, leido: true })));
                  setHasUnread(false);
                }}
                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <FaSpinner className="animate-spin text-blue-600 text-lg" />
                <span className="text-[10px] text-slate-400 font-semibold">Cargando alertas...</span>
              </div>
            ) : alertas.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No tienes notificaciones
              </div>
            ) : (
              alertas.map((item) => {
                const isNoAlert = item.id === 'no-alerts';
                return (
                  <div
                    key={item.id}
                    onClick={() => !isNoAlert && handleNotificationClick(item)}
                    className={`p-4 flex gap-3 transition ${
                      isNoAlert
                        ? 'bg-white cursor-default'
                        : 'hover:bg-slate-50/70 cursor-pointer'
                    } ${!item.leido ? 'bg-blue-50/20' : ''}`}
                  >
                    {/* Icono según tipo */}
                    <div className="shrink-0 mt-0.5">
                      {item.tipo === 'urgente' ? (
                        <FaExclamationCircle className="text-red-500 text-base" />
                      ) : (
                        <FaInfoCircle className="text-blue-500 text-base" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline gap-1.5">
                        <h4 className={`text-xs truncate ${!item.leido ? 'font-bold text-slate-800' : 'font-semibold text-slate-600'}`}>
                          {item.titulo}
                        </h4>
                        <span className="text-[9px] text-slate-400 shrink-0 font-medium">{item.tiempo}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">
                        {item.descripcion}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              Help Desk SLA TI
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
