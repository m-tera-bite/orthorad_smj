import { useEffect, useState } from "react";
import api from "../../api/client";
import UploadModal, { AppointmentOption, ReportFile } from "../../components/dashboard/UploadModal";

interface ReportData {
  id: number;
  files: ReportFile[];
  uploaded_at: string | null;
  emitted_at: string | null;
}

interface AppointmentRow {
  id: number;
  patient_name: string;
  date_of_birth: string | null;
  report_access_code: string | null;
  service_name: string;
  scheduled_at: string;
  status: string;
  report: ReportData | null;
}

type Filter = "todos" | "pendientes" | "subidos";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendientes", label: "Pendientes" },
  { key: "subidos", label: "Subidos" },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Reportes() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todos");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);

  function load() {
    api.get("/appointments/").then(({ data }) => setAppointments(data)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = appointments.filter((a) => {
    const hasFiles = (a.report?.files.length ?? 0) > 0;
    if (filter === "subidos") return hasFiles;
    if (filter === "pendientes") return !hasFiles;
    return true;
  });

  function handleUploaded(appointmentId: number, uploadedAt: string, newFiles: ReportFile[]) {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              report: {
                ...(a.report ?? { id: 0, emitted_at: null }),
                uploaded_at: uploadedAt,
                files: [...(a.report?.files ?? []), ...newFiles],
              },
            }
          : a
      )
    );
  }

  function handleFileDeleted(appointmentId: number, fileId: number) {
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id !== appointmentId || !a.report) return a;
        const remaining = a.report.files.filter((f) => f.id !== fileId);
        return {
          ...a,
          report: {
            ...a.report,
            files: remaining,
            uploaded_at: remaining.length === 0 ? null : a.report.uploaded_at,
          },
        };
      })
    );
  }

  function openManage(appointmentId: number) {
    setUploadTarget(appointmentId);
    setShowUpload(true);
  }

  const pendingAppointments: AppointmentOption[] = appointments
    .filter((a) => (a.report?.files.length ?? 0) === 0)
    .map((a) => ({
      id: a.id,
      patient_name: a.patient_name,
      service_name: a.service_name,
      date_of_birth: a.date_of_birth,
      report_access_code: a.report_access_code,
    }));

  const modalAppointments: AppointmentOption[] = uploadTarget
    ? appointments
        .filter((a) => a.id === uploadTarget)
        .map((a) => ({
          id: a.id,
          patient_name: a.patient_name,
          service_name: a.service_name,
          date_of_birth: a.date_of_birth,
          report_access_code: a.report_access_code,
          existingFiles: a.report?.files ?? [],
        }))
    : pendingAppointments;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: "#cfac8c", padding: "13px 40px" }}
      >
        <h1 className="text-white font-montserrat font-bold text-[20px]">Reportes</h1>
        <button
          onClick={() => { setUploadTarget(null); setShowUpload(true); }}
          disabled={pendingAppointments.length === 0}
          className="flex items-center gap-2 border border-white text-white font-montserrat font-bold text-[12px] rounded-[10px] hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ padding: "8px 16px", height: 36 }}
        >
          <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
            <path d="M6.5 1v7M3 4l3.5-3L10 4M1 10h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Subir Resultados
        </button>
      </header>

      {/* Body */}
      <main
        className="flex-1 overflow-y-auto flex flex-col gap-5"
        style={{ backgroundColor: "#fffcf7", padding: "24px 40px 40px" }}
      >
        <div className="flex gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-[10px] font-quicksand font-semibold text-sm transition-colors ${
                filter === key ? "bg-primary text-white" : "bg-background text-text hover:bg-alternative/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-secondary font-quicksand">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center bg-white rounded-[10px] p-10 max-w-sm">
              <svg className="mx-auto text-alternative mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
              </svg>
              <p className="text-primary font-montserrat font-bold text-[16px] mb-2">Sin reportes</p>
              <p className="text-text font-quicksand text-sm">No hay citas que coincidan con el filtro seleccionado.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div style={{ backgroundColor: "#f5ede3", padding: "14px 20px" }}>
              <span className="text-secondary font-montserrat font-bold text-[16px]">
                {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-quicksand">
                <thead>
                  <tr style={{ backgroundColor: "#f5ede3" }}>
                    {["Paciente", "Servicio", "Fecha", "Estado", "Archivos", "Acción"].map((h) => (
                      <th key={h} className="text-left text-primary font-montserrat font-bold text-[12px] px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => {
                    const files = a.report?.files ?? [];
                    const uploaded = files.length > 0;
                    return (
                      <tr
                        key={a.id}
                        style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fffcf7" }}
                      >
                        <td className="px-5 py-3 text-primary font-montserrat font-bold text-[14px] truncate max-w-[180px]">
                          {a.patient_name}
                        </td>
                        <td className="px-5 py-3 text-text truncate max-w-[160px]">{a.service_name}</td>
                        <td className="px-5 py-3 text-text whitespace-nowrap">{formatDateTime(a.scheduled_at)}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center justify-center rounded-[10px] text-white font-montserrat font-bold text-[11px] px-3 py-1 ${
                              uploaded ? "bg-[#3f6e7a]" : "bg-secondary"
                            }`}
                          >
                            {uploaded ? "Subido" : "Pendiente"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {files.length === 0 ? (
                            <span className="text-text/40">—</span>
                          ) : files.length === 1 ? (
                            <a
                              href={files[0].url ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#3f6e7a] underline font-quicksand text-sm"
                            >
                              Ver archivo
                            </a>
                          ) : (
                            <span className="text-[#3f6e7a] font-quicksand text-sm">
                              {files.length} archivos
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => openManage(a.id)}
                            className={`font-quicksand font-semibold text-[11px] rounded-[10px] px-3 py-1.5 transition-opacity hover:opacity-75 ${
                              uploaded
                                ? "border border-[#3f6e7a] text-[#3f6e7a] bg-white"
                                : "bg-[#3f6e7a] text-white"
                            }`}
                          >
                            {uploaded ? "Gestionar" : "Subir"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showUpload && modalAppointments.length > 0 && (
        <UploadModal
          appointments={modalAppointments}
          onClose={() => { setShowUpload(false); setUploadTarget(null); }}
          onUploaded={handleUploaded}
          onFileDeleted={handleFileDeleted}
        />
      )}
    </div>
  );
}
