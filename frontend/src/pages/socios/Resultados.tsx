import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";

interface ReportFile {
  id: number;
  original_name: string;
  url: string | null;
  uploaded_at: string;
}

interface ReportData {
  id: number;
  files: ReportFile[];
  uploaded_at: string | null;
  emitted_at: string | null;
}

interface AppointmentRow {
  id: number;
  patient_name: string;
  patient_email: string;
  service_name: string;
  scheduled_at: string;
  status: string;
  report: ReportData | null;
}

type Filter = "todos" | "disponibles" | "pendientes";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "disponibles", label: "Resultados disponibles" },
  { key: "pendientes", label: "En proceso" },
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

export default function Resultados() {
  const [searchParams, setSearchParams] = useSearchParams();
  const emailFilter = searchParams.get("email") ?? "";

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todos");

  useEffect(() => {
    setLoading(true);
    const url = emailFilter
      ? `/partners/portal/appointments/?patient_email=${encodeURIComponent(emailFilter)}`
      : "/partners/portal/appointments/";
    api.get(url).then(({ data }) => setAppointments(data)).finally(() => setLoading(false));
  }, [emailFilter]);

  const filtered = appointments.filter((a) => {
    const hasFiles = (a.report?.files.length ?? 0) > 0;
    if (filter === "disponibles") return hasFiles;
    if (filter === "pendientes") return !hasFiles;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: "#cfac8c", padding: "13px 40px" }}
      >
        <h1 className="text-white font-montserrat font-bold text-[20px]">Resultados</h1>
        {emailFilter && (
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-2 border border-white text-white font-montserrat font-bold text-[12px] rounded-[10px] hover:bg-white/10 transition-colors"
            style={{ padding: "8px 16px", height: 34 }}
          >
            ✕ Quitar filtro: {emailFilter}
          </button>
        )}
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
              <p className="text-primary font-montserrat font-bold text-[16px] mb-2">Sin resultados</p>
              <p className="text-text font-quicksand text-sm">
                No hay estudios que coincidan con el filtro seleccionado.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div style={{ backgroundColor: "#f5ede3", padding: "14px 20px" }}>
              <span className="text-secondary font-montserrat font-bold text-[16px]">
                {filtered.length} {filtered.length === 1 ? "estudio" : "estudios"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-quicksand">
                <thead>
                  <tr style={{ backgroundColor: "#f5ede3" }}>
                    {["Paciente", "Servicio", "Fecha", "Estado", "Archivos"].map((h) => (
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
                      <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fffcf7" }}>
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
                            {uploaded ? "Disponible" : "En proceso"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {files.length === 0 ? (
                            <span className="text-text/40">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {files.map((f) => (
                                <a
                                  key={f.id}
                                  href={f.url ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#3f6e7a] underline font-quicksand text-sm truncate max-w-[240px]"
                                >
                                  {f.original_name || "Ver archivo"}
                                </a>
                              ))}
                            </div>
                          )}
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
    </div>
  );
}
