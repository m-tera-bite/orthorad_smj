import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import UploadModal, { AppointmentOption, ReportFile } from "../../components/dashboard/UploadModal";
import UploadResultsButton from "../../components/dashboard/UploadResultsButton";
import { fuzzyFilter } from "../../lib/fuzzySearch";

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
  referring_partner: number | null;
  referring_partner_name: string | null;
  report: ReportData | null;
}

// Clinic filter: every report (with or without clinic), only reports with
// no referring clinic, or one specific clinic by id.
type ClinicFilter = "all" | "none" | `${number}`;

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState<ClinicFilter>("all");
  const [partners, setPartners] = useState<{ id: number; name: string }[]>([]);

  function load() {
    api.get("/appointments/").then(({ data }) => setAppointments(data)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.get("/partners/").then(({ data }) => setPartners(data)).catch(() => setPartners([]));
  }, []);

  // Clinics for the filter: the partner list, plus any clinic referenced by
  // a loaded report but missing from it (e.g. since deactivated).
  const clinicOptions = (() => {
    const byId = new Map<number, string>(partners.map((p) => [p.id, p.name]));
    for (const a of appointments) {
      if (a.referring_partner != null && !byId.has(a.referring_partner)) {
        byId.set(a.referring_partner, a.referring_partner_name ?? `Clínica #${a.referring_partner}`);
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((x, y) => x.name.localeCompare(y.name, "es"));
  })();

  // Reopening the upload modal from the minimized bar routes here with
  // ?manage=<appointmentId> since this page can target any appointment,
  // unlike the dashboard's today-only upload modal.
  useEffect(() => {
    const manageId = searchParams.get("manage");
    if (manageId) {
      setUploadTarget(Number(manageId));
      setShowUpload(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("manage");
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const byStatusAndClinic = appointments.filter((a) => {
    const hasFiles = (a.report?.files.length ?? 0) > 0;
    if (filter === "subidos" && !hasFiles) return false;
    if (filter === "pendientes" && hasFiles) return false;
    if (clinicFilter === "none") return a.referring_partner == null;
    if (clinicFilter !== "all") return a.referring_partner === Number(clinicFilter);
    return true;
  });
  const filtered = fuzzyFilter(byStatusAndClinic, search, (a) => a.patient_name);
  const isFiltering = !!search.trim() || clinicFilter !== "all" || filter !== "todos";

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

  function toOption(a: AppointmentRow): AppointmentOption {
    return {
      id: a.id,
      time: formatDateTime(a.scheduled_at),
      patient_name: a.patient_name,
      service_name: a.service_name,
      date_of_birth: a.date_of_birth,
      report_access_code: a.report_access_code,
      existingFiles: a.report?.files ?? [],
    };
  }

  // Header button: every appointment, those still without results first,
  // so it stays usable (to add more files) even when nothing is pending.
  const allAppointmentOptions: AppointmentOption[] = [
    ...appointments.filter((a) => (a.report?.files.length ?? 0) === 0),
    ...appointments.filter((a) => (a.report?.files.length ?? 0) > 0),
  ].map(toOption);

  const modalAppointments: AppointmentOption[] = uploadTarget
    ? appointments.filter((a) => a.id === uploadTarget).map(toOption)
    : allAppointmentOptions;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: "#cfac8c", padding: "13px 40px" }}
      >
        <h1 className="text-white font-montserrat font-bold text-[20px]">Reportes</h1>
        <UploadResultsButton
          onClick={() => { setUploadTarget(null); setShowUpload(true); }}
          disabled={appointments.length === 0}
        />
      </header>

      {/* Body */}
      <main
        className="flex-1 overflow-y-auto flex flex-col gap-5"
        style={{ backgroundColor: "#fffcf7", padding: "24px 40px 40px" }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative w-full max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-alternative" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por nombre del paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-divider rounded-[10px] text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white"
            />
          </div>
          <select
            value={clinicFilter}
            onChange={(e) => setClinicFilter(e.target.value as ClinicFilter)}
            aria-label="Filtrar por clínica"
            className="border border-divider rounded-[10px] px-4 py-2.5 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white max-w-[260px]"
          >
            <option value="all">Todas las clínicas (incluye sin clínica)</option>
            <option value="none">Sin clínica</option>
            {clinicOptions.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

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
              <p className="text-text font-quicksand text-sm">
                {search.trim()
                  ? `No se encontraron reportes para “${search.trim()}”.`
                  : "No hay citas que coincidan con el filtro seleccionado."}
              </p>
              {isFiltering && (
                <button
                  onClick={() => { setSearch(""); setClinicFilter("all"); setFilter("todos"); }}
                  className="mt-4 text-sm text-secondary underline font-quicksand"
                >
                  Limpiar filtros
                </button>
              )}
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
                          ) : files.length === 1 && files[0].url ? (
                            <a
                              href={files[0].url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#3f6e7a] underline font-quicksand text-sm"
                            >
                              Ver archivo
                            </a>
                          ) : files.length === 1 ? (
                            <span className="text-secondary font-quicksand text-sm">
                              {files[0].status === "failed" ? "Error al subir" : "Procesando…"}
                            </span>
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
