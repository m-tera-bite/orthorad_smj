import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import NewAppointmentModal from "../components/dashboard/NewAppointmentModal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stat {
  label: string;
  value: number | string;
  subtitle: string;
}

interface AppointmentRow {
  id: number;
  time: string;
  patient_name: string;
  service_name: string;
  room: string;
  status: string;
}

interface UploadRow {
  appointment_id: number;
  patient_name: string;
  uploaded_at: string | null;
}

interface WeekBar {
  day: string;
  count: number;
  is_today: boolean;
}

interface Banner {
  patient_name: string;
  service_name: string;
  room: string;
  time: string;
}

interface Summary {
  greeting_name: string;
  stats: {
    appointments_today: number;
    appointments_pending: number;
    new_patients_month: number;
    reports_emitted: number;
    reports_emitted_pending: number;
    reports_uploaded: number;
    reports_uploaded_pending: number;
  };
  current_appointment: Banner | null;
  next_appointment: Banner | null;
  todays_appointments: AppointmentRow[];
  weekly_studies: WeekBar[];
  upload_status: UploadRow[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_BG: Record<string, string> = {
  in_progress: "bg-[#3f6e7a]",
  pending: "bg-secondary",
  confirmed: "bg-secondary",
  completed: "bg-alternative",
  cancelled: "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: "En Curso",
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completada",
  cancelled: "Cancelado",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, subtitle }: Stat) {
  return (
    <div className="rounded-[10px] overflow-hidden bg-white flex-1" style={{ minWidth: 0 }}>
      <div className="bg-primary px-[10px] py-[10px]">
        <p className="text-white font-montserrat font-semibold text-[14px] leading-[22px]">{label}</p>
      </div>
      <div className="px-[20px] py-[6px] flex items-baseline gap-3">
        <span className="text-primary font-montserrat font-bold text-[40px] leading-[52px]">
          {value}
        </span>
        <span className="text-secondary font-quicksand text-[12px]">{subtitle}</span>
      </div>
    </div>
  );
}

function WeeklyBar({ bars }: { bars: WeekBar[] }) {
  const max = Math.max(...bars.map((b) => b.count), 1);
  return (
    <div className="flex items-end gap-3 h-[90px] px-1">
      {bars.map(({ day, count, is_today }) => (
        <div key={day} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-quicksand text-secondary">{count}</span>
          <div
            className={`w-full rounded-t-sm transition-all duration-300 ${
              is_today ? "bg-primary" : "bg-alternative/60"
            }`}
            style={{ height: `${Math.max((count / max) * 60, 4)}px` }}
          />
          <span
            className={`text-[10px] font-quicksand ${
              is_today ? "text-primary font-bold" : "text-text"
            }`}
          >
            {day}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  appointments: AppointmentRow[];
  onClose: () => void;
  onUploaded: (appointmentId: number, time: string) => void;
}

function UploadModal({ appointments, onClose, onUploaded }: UploadModalProps) {
  const [selectedId, setSelectedId] = useState<number | "">(appointments[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!selectedId || !file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post(
        `/appointments/${selectedId}/report/upload/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      onUploaded(Number(selectedId), data.uploaded_at);
      onClose();
    } catch {
      setError("No se pudo subir el archivo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(92,51,23,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-alt rounded-[10px] w-full max-w-md mx-4 overflow-hidden shadow-xl">
        {/* Modal header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-montserrat font-bold text-[18px]">Subir Resultado</h2>
          <button
            onClick={onClose}
            className="text-alternative hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Appointment selector */}
          <div>
            <label className="block text-primary font-quicksand font-semibold text-sm mb-2">
              Paciente / Cita
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="w-full border border-divider rounded-[10px] px-4 py-2.5 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white"
            >
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.time} — {a.patient_name} ({a.service_name})
                </option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div>
            <label className="block text-primary font-quicksand font-semibold text-sm mb-2">
              Archivo
            </label>
            <div
              className={`border-2 border-dashed rounded-[10px] px-4 py-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-secondary bg-secondary/10"
                  : "border-alternative bg-background hover:border-secondary"
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.dcm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="space-y-1">
                  <p className="text-primary font-montserrat font-semibold text-sm">{file.name}</p>
                  <p className="text-text text-xs font-quicksand">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs text-secondary underline font-quicksand"
                  >
                    Quitar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    className="mx-auto text-alternative"
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-text font-quicksand text-sm">
                    Arrastra o{" "}
                    <span className="text-secondary underline">selecciona</span> el archivo
                  </p>
                  <p className="text-text/60 font-quicksand text-xs">Imágenes, PDF o DICOM</p>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm font-quicksand">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 border border-primary text-primary py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedId || !file || loading}
              className="flex-1 bg-[#3f6e7a] text-white py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-[#3f6e7a]/80 transition-colors disabled:opacity-50"
            >
              {loading ? "Subiendo..." : "Subir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    api
      .get("/dashboard/summary/")
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));
  }, []);

  function handleUploaded(appointmentId: number, time: string) {
    setSummary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          reports_uploaded: prev.stats.reports_uploaded + 1,
          reports_uploaded_pending: Math.max(0, prev.stats.reports_uploaded_pending - 1),
          reports_emitted: prev.stats.reports_emitted + 1,
          reports_emitted_pending: Math.max(0, prev.stats.reports_emitted_pending - 1),
        },
        upload_status: prev.upload_status.map((row) =>
          row.appointment_id === appointmentId ? { ...row, uploaded_at: time } : row
        ),
      };
    });
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats: Stat[] = summary
    ? [
        {
          label: "Citas de hoy",
          value: summary.stats.appointments_today,
          subtitle: `${summary.stats.appointments_pending} pendientes`,
        },
        {
          label: "Pacientes Nuevos",
          value: summary.stats.new_patients_month,
          subtitle: "este mes",
        },
        {
          label: "Reportes Emitidos",
          value: summary.stats.reports_emitted,
          subtitle: `${summary.stats.reports_emitted_pending} pendientes`,
        },
        {
          label: "Reportes Subidos",
          value: summary.stats.reports_uploaded,
          subtitle: `${summary.stats.reports_uploaded_pending} pendientes`,
        },
      ]
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header | Figma: bg=#cfac8c, pad=[13,40,13,40] */}
        <header
          className="flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: "#cfac8c", padding: "13px 40px" }}
        >
          <h1 className="text-white font-montserrat font-bold text-[20px]">Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 border border-white text-white font-montserrat font-bold text-[12px] rounded-[10px] hover:bg-white/10 transition-colors"
              style={{ padding: "8px 16px", height: 36 }}
            >
              <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
                <path
                  d="M6.5 1v7M3 4l3.5-3L10 4M1 10h11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Subir Resultados
            </button>
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
          </div>
        </header>

        {/* Body | Figma: bg=#fffcf7, pad=[20,40,40,40] */}
        <main
          className="flex-1 overflow-y-auto flex flex-col gap-4"
          style={{ backgroundColor: "#fffcf7", padding: "20px 40px 40px" }}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-secondary font-quicksand">
              Cargando...
            </div>
          ) : (
            <>
              {/* Greeting */}
              <div>
                <p className="font-montserrat font-bold text-primary text-[32px]">
                  {greeting()}, {summary?.greeting_name}
                </p>
                <p className="text-secondary font-quicksand capitalize text-[12px] mt-1">
                  {today}
                </p>
              </div>

              {/* Summary Cards */}
              <div className="flex gap-5">
                {stats.map((s) => (
                  <StatCard key={s.label} {...s} />
                ))}
              </div>

              {/* Progress banners */}
              <div className="flex gap-10">
                <div
                  className="flex-1 flex items-center rounded-[10px] text-white font-montserrat font-bold text-[12px]"
                  style={{ backgroundColor: "#3f6e7a", padding: "10px 20px", minHeight: 39 }}
                >
                  {summary?.current_appointment
                    ? `En progreso: ${summary.current_appointment.service_name} · ${summary.current_appointment.patient_name}${summary.current_appointment.room ? ` · ${summary.current_appointment.room}` : ""} · ${summary.current_appointment.time}`
                    : "Sin cita en progreso"}
                </div>
                <div
                  className="flex-1 flex items-center rounded-[10px] text-primary font-quicksand text-[12px]"
                  style={{ backgroundColor: "#f5ede3", padding: "10px 20px", minHeight: 39 }}
                >
                  {summary?.next_appointment
                    ? `Siguiente: ${summary.next_appointment.service_name} · ${summary.next_appointment.patient_name}${summary.next_appointment.room ? ` · ${summary.next_appointment.room}` : ""} · ${summary.next_appointment.time}`
                    : "Sin próximas citas"}
                </div>
              </div>

              {/* Left + Right panels */}
              <div className="flex gap-5 flex-1 min-h-0" style={{ minHeight: 400 }}>
                {/* Today's Appointments | Figma: 670×549, r=10 */}
                <div
                  className="flex flex-col overflow-hidden bg-white"
                  style={{ borderRadius: 10, flex: "0 0 670px" }}
                >
                  <div
                    className="flex items-center justify-between flex-shrink-0"
                    style={{ backgroundColor: "#f5ede3", padding: "18px 20px 18px 40px" }}
                  >
                    <span className="text-secondary font-montserrat font-bold text-[20px]">
                      Citas de hoy
                    </span>
                    <button className="text-primary font-montserrat font-bold text-[10px] hover:text-secondary transition-colors">
                      Ver todas ↗
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {!summary?.todays_appointments.length ? (
                      <div className="p-10 text-center text-text font-quicksand text-sm">
                        No hay citas registradas para hoy.
                      </div>
                    ) : (
                      summary.todays_appointments.map((appt, i) => (
                        <div
                          key={appt.id}
                          className="flex items-center"
                          style={{
                            height: 70,
                            padding: "10px 20px",
                            gap: 20,
                            backgroundColor: i % 2 === 0 ? "#ffffff" : "#fffcf7",
                          }}
                        >
                          <div
                            className="flex-shrink-0 flex items-center"
                            style={{ width: 86, padding: 10 }}
                          >
                            <span className="text-primary font-montserrat font-bold text-[16px]">
                              {appt.time}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-primary font-montserrat font-bold text-[16px] truncate">
                              {appt.patient_name}
                            </p>
                            <p className="text-secondary font-quicksand text-[13px] truncate">
                              {appt.service_name}
                              {appt.room ? ` · ${appt.room}` : ""}
                            </p>
                          </div>
                          <div
                            className={`flex-shrink-0 flex items-center justify-center rounded-[10px] text-white font-montserrat font-bold text-[12px] ${
                              STATUS_BG[appt.status] ?? "bg-divider"
                            }`}
                            style={{ width: 116, height: 34, padding: "0 10px" }}
                          >
                            {STATUS_LABEL[appt.status] ?? appt.status}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col flex-1 min-w-0 gap-4">
                  {/* Weekly Studies */}
                  <div className="overflow-hidden" style={{ borderRadius: 10 }}>
                    <div
                      className="flex items-center justify-between"
                      style={{ backgroundColor: "#f5ede3", padding: "10px 20px" }}
                    >
                      <span className="text-secondary font-montserrat font-bold text-[16px]">
                        Estudios / Semana
                      </span>
                      <button className="text-primary font-montserrat font-bold text-[10px] hover:text-secondary transition-colors">
                        Ver mes ↗
                      </button>
                    </div>
                    <div className="bg-white" style={{ padding: "15px 20px 10px" }}>
                      <WeeklyBar bars={summary?.weekly_studies ?? []} />
                    </div>
                  </div>

                  {/* Upload Status */}
                  <div
                    className="flex flex-col overflow-hidden flex-1"
                    style={{ borderRadius: 10, backgroundColor: "#ffffff" }}
                  >
                    <div
                      className="flex items-center justify-between flex-shrink-0"
                      style={{ backgroundColor: "#f5ede3", padding: "10px 20px" }}
                    >
                      <span className="text-secondary font-montserrat font-bold text-[16px]">
                        Estado de Subida
                      </span>
                      <button className="text-primary font-montserrat font-bold text-[10px] hover:text-secondary transition-colors">
                        Ver todas ↗
                      </button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {summary?.upload_status.map((row, i) => {
                        const uploaded = !!row.uploaded_at;
                        return (
                          <div
                            key={row.appointment_id}
                            className="flex items-center gap-3"
                            style={{
                              height: 50,
                              padding: "10px 20px",
                              backgroundColor: i % 2 === 0 ? "#ffffff" : "#fffcf7",
                            }}
                          >
                            <div
                              className={`w-[14px] h-[14px] rounded-sm border flex-shrink-0 flex items-center justify-center ${
                                uploaded
                                  ? "bg-[#3f6e7a] border-[#3f6e7a]"
                                  : "border-alternative"
                              }`}
                            >
                              {uploaded && (
                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                  <path
                                    d="M1 3l2.5 2.5L8 1"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-montserrat font-bold text-[14px] truncate ${
                                  uploaded ? "text-primary" : "text-alternative"
                                }`}
                              >
                                {row.patient_name}
                              </p>
                              <p
                                className={`font-quicksand text-[11px] ${
                                  uploaded ? "text-secondary" : "text-primary"
                                }`}
                              >
                                {uploaded ? `Subido ${row.uploaded_at}` : "Pendiente"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

      {showUpload && summary && (
        <UploadModal
          appointments={summary.todays_appointments}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
      {showNew && (
        <NewAppointmentModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            api.get("/dashboard/summary/").then(({ data }) => setSummary(data));
          }}
        />
      )}
    </div>
  );
}
