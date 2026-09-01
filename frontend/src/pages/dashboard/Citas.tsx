import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import NewAppointmentModal from "../../components/dashboard/NewAppointmentModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

interface Appointment {
  id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  date_of_birth: string | null;
  service: number;
  service_name: string;
  referring_partner: number | null;
  scheduled_at: string;
  room: string;
  notes: string;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "in_progress", label: "En Curso" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelado" },
];

const STATUS_BG: Record<string, string> = {
  in_progress: "bg-[#3f6e7a]",
  pending: "bg-secondary",
  confirmed: "bg-secondary",
  completed: "bg-alternative",
  cancelled: "bg-red-500",
};

type DateFilter = "today" | "week" | "all";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default function Citas() {
  const [searchParams] = useSearchParams();
  const emailFilter = searchParams.get("email") ?? "";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState<Appointment | null>(null);

  function buildUrl() {
    const params = new URLSearchParams();
    if (dateFilter !== "all") params.set("date", dateFilter);
    if (statusFilter) params.set("status", statusFilter);
    return `/appointments/?${params.toString()}`;
  }

  function load() {
    setLoading(true);
    api.get(buildUrl()).then(({ data }) => setAppointments(data)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [dateFilter, statusFilter]);

  const filtered = emailFilter
    ? appointments.filter((a) => a.patient_email === emailFilter)
    : appointments;

  async function updateStatus(id: number, status: string) {
    setUpdatingId(id);
    try {
      await api.patch(`/appointments/${id}/`, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(appt: Appointment) {
    await api.delete(`/appointments/${appt.id}/`);
    setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
  }

  const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: "today", label: "Hoy" },
    { key: "week", label: "Esta semana" },
    { key: "all", label: "Todas" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: "#cfac8c", padding: "13px 40px" }}
      >
        <h1 className="text-white font-montserrat font-bold text-[20px]">
          Citas{emailFilter ? ` · ${emailFilter}` : ""}
        </h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-white font-montserrat font-bold text-[12px] rounded-[10px] hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "#3f6e7a", padding: "8px 16px", height: 34 }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nueva Cita
        </button>
      </header>

      {/* Body */}
      <main
        className="flex-1 overflow-y-auto flex flex-col gap-5"
        style={{ backgroundColor: "#fffcf7", padding: "24px 40px 40px" }}
      >
        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2">
            {DATE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateFilter(key)}
                className={`px-4 py-2 rounded-[10px] font-quicksand font-semibold text-sm transition-colors ${
                  dateFilter === key ? "bg-primary text-white" : "bg-background text-text hover:bg-alternative/30"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-divider rounded-[10px] px-4 py-2 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-secondary font-quicksand">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center bg-white rounded-[10px] p-10 max-w-sm">
              <svg className="mx-auto text-alternative mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M8 2v4M16 2v4M3 10h18" strokeLinecap="round" />
              </svg>
              <p className="text-primary font-montserrat font-bold text-[16px] mb-2">Sin citas</p>
              <p className="text-text font-quicksand text-sm">No hay citas para mostrar con los filtros actuales.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div style={{ backgroundColor: "#f5ede3", padding: "14px 20px" }}>
              <span className="text-secondary font-montserrat font-bold text-[16px]">
                {filtered.length} {filtered.length === 1 ? "cita" : "citas"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-quicksand">
                <thead>
                  <tr style={{ backgroundColor: "#f5ede3" }}>
                    {["Fecha", "Hora", "Paciente", "Servicio", "Sala", "Estado", ""].map((h) => (
                      <th key={h} className="text-left text-primary font-montserrat font-bold text-[12px] px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`${a.status === "completed" ? "opacity-60" : ""}`}
                      style={{
                        backgroundColor:
                          a.status === "in_progress"
                            ? "rgba(63,110,122,0.06)"
                            : i % 2 === 0
                            ? "#ffffff"
                            : "#fffcf7",
                      }}
                    >
                      <td className="px-5 py-3 text-text whitespace-nowrap">{formatDate(a.scheduled_at)}</td>
                      <td className="px-5 py-3 text-primary font-montserrat font-bold text-[14px] whitespace-nowrap">
                        {formatTime(a.scheduled_at)}
                      </td>
                      <td className="px-5 py-3 font-montserrat font-bold text-primary truncate max-w-[180px]">
                        {a.patient_name}
                      </td>
                      <td className="px-5 py-3 text-text truncate max-w-[150px]">{a.service_name}</td>
                      <td className="px-5 py-3 text-text">{a.room || "—"}</td>
                      <td className="px-5 py-3">
                        <select
                          value={a.status}
                          disabled={updatingId === a.id}
                          onChange={(e) => updateStatus(a.id, e.target.value)}
                          className={`rounded-[10px] text-white font-montserrat font-bold text-[11px] px-2 py-1.5 border-0 focus:outline-none cursor-pointer disabled:opacity-60 ${
                            STATUS_BG[a.status] ?? "bg-divider"
                          }`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value} className="bg-white text-text">
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditing(a)}
                            title="Editar cita"
                            className="text-secondary hover:text-primary transition-colors p-1"
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                              <path
                                d="M9.5 2l3 3-7 7-3.5.5.5-3.5 7-7z"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleting(a)}
                            title="Eliminar cita"
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                          >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                              <path
                                d="M2 4h11M5.5 4V2.5h4V4M3.5 4l.7 8.5a1 1 0 001 .9h4.6a1 1 0 001-.9L11.5 4M6 6.5v4M9 6.5v4"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showNew && (
        <NewAppointmentModal
          onClose={() => setShowNew(false)}
          onSaved={() => load()}
          defaultEmail={emailFilter}
        />
      )}

      {editing && (
        <NewAppointmentModal
          appointment={editing}
          onClose={() => setEditing(null)}
          onSaved={() => load()}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar Cita"
          message={
            <>
              ¿Eliminar la cita de <strong>{deleting.patient_name}</strong> (
              {deleting.service_name}, {formatDate(deleting.scheduled_at)}{" "}
              {formatTime(deleting.scheduled_at)})? La cita y sus resultados dejarán
              de mostrarse en el sistema.
            </>
          }
          confirmLabel="Eliminar Cita"
          onConfirm={() => handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
