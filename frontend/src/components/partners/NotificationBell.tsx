import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

interface NotificationRow {
  id: number;
  message: string;
  created_at: string;
  is_read: boolean;
  appointment_patient_email: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  function fetchNotifications() {
    setLoading(true);
    api
      .get("/partners/portal/notifications/")
      .then(({ data }) => {
        setNotifications(data.results);
        setUnreadCount(data.unread_count);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchNotifications();
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleClick(row: NotificationRow) {
    setOpen(false);
    if (!row.is_read) {
      try {
        await api.post(`/partners/portal/notifications/${row.id}/read/`);
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Navigation still proceeds even if marking as read fails.
      }
    }
    navigate(`/socios/resultados?email=${encodeURIComponent(row.appointment_patient_email)}`);
  }

  return (
    <div ref={containerRef} className="relative mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-[10px] text-alternative hover:bg-white/10 hover:text-white transition-colors"
        title="Notificaciones"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M14.5 12.5V8a5.5 5.5 0 00-11 0v4.5L2 14.5h14l-1.5-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 16.5a2 2 0 002 1.5 2 2 0 002-1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-80 max-h-96 overflow-y-auto bg-white rounded-[10px] shadow-xl">
          <div className="px-4 py-3 border-b border-background">
            <p className="text-primary font-montserrat font-bold text-[13px]">Notificaciones</p>
          </div>
          {loading ? (
            <p className="px-4 py-6 text-center text-text/50 font-quicksand text-sm">Cargando...</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-text/50 font-quicksand text-sm">
              No hay notificaciones.
            </p>
          ) : (
            <ul>
              {notifications.map((row) => (
                <li key={row.id}>
                  <button
                    onClick={() => handleClick(row)}
                    className={`w-full text-left px-4 py-3 border-b border-background hover:bg-background/60 transition-colors ${
                      row.is_read ? "" : "bg-background/40"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!row.is_read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-text font-quicksand text-sm leading-snug">
                          {row.message}
                        </p>
                        <p className="text-text/40 font-quicksand text-[11px] mt-0.5">
                          {formatDateTime(row.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
