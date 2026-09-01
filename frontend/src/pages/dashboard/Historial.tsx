import { Fragment, useEffect, useState } from "react";
import api from "../../api/client";

interface AuditEntry {
  id: number;
  actor_email: string;
  actor_role: string;
  actor_role_display: string;
  action: string;
  action_display: string;
  object_type: string;
  object_id: string;
  description: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

interface AuditResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditEntry[];
}

const ACTION_OPTIONS = [
  { value: "", label: "Cambios (sin consultas)" },
  { value: "all", label: "Todas las acciones" },
  { value: "create", label: "Creaciones" },
  { value: "update", label: "Ediciones" },
  { value: "delete", label: "Eliminaciones" },
  { value: "upload", label: "Cargas de archivos" },
  { value: "email", label: "Correos enviados" },
  { value: "view", label: "Consultas" },
];

const OBJECT_OPTIONS = [
  { value: "", label: "Todos los objetos" },
  { value: "appointment", label: "Citas" },
  { value: "patient", label: "Pacientes" },
  { value: "partner", label: "Clínicas asociadas" },
  { value: "partner_user", label: "Accesos de clínicas" },
  { value: "report_file", label: "Archivos de resultados" },
  { value: "report_email", label: "Correos de resultados" },
  { value: "partner_portal", label: "Portal de socios" },
  { value: "dashboard", label: "Dashboard" },
];

const ACTION_BG: Record<string, string> = {
  delete: "bg-red-500",
  create: "bg-[#3f6e7a]",
  update: "bg-secondary",
  upload: "bg-primary",
  email: "bg-[#4f8a7b]",
  view: "bg-alternative",
};

const OBJECT_LABELS: Record<string, string> = {
  appointment: "Cita",
  patient: "Paciente",
  partner: "Clínica asociada",
  partner_user: "Acceso de clínica",
  report_file: "Archivo de resultados",
  report_email: "Correo de resultados",
  partner_portal: "Portal de socios",
  dashboard: "Dashboard",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Historial() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [objectType, setObjectType] = useState("");
  const [actor, setActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (action === "") {
      params.set("exclude_views", "1");
    } else if (action !== "all") {
      params.set("action", action);
    }
    if (objectType) params.set("object_type", objectType);
    if (actor) params.set("actor", actor);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    api
      .get(`/audit/?${params.toString()}`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, action, objectType, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce the free-text actor filter
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [actor]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 50)) : 1;

  const selectClass =
    "border border-divider rounded-[10px] px-4 py-2 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: "#cfac8c", padding: "13px 40px" }}
      >
        <h1 className="text-white font-montserrat font-bold text-[20px]">
          Historial de Acciones
        </h1>
      </header>

      {/* Body */}
      <main
        className="flex-1 overflow-y-auto flex flex-col gap-5"
        style={{ backgroundColor: "#fffcf7", padding: "24px 40px 40px" }}
      >
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className={selectClass}
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={objectType}
            onChange={(e) => { setObjectType(e.target.value); setPage(1); }}
            className={selectClass}
          >
            {OBJECT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filtrar por usuario..."
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className={selectClass}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className={selectClass}
            />
            <span className="text-text/60 font-quicksand text-sm">a</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className={selectClass}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-secondary font-quicksand">
            Cargando...
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center bg-white rounded-[10px] p-10 max-w-sm">
              <svg className="mx-auto text-alternative mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" />
              </svg>
              <p className="text-primary font-montserrat font-bold text-[16px] mb-2">
                Sin registros
              </p>
              <p className="text-text font-quicksand text-sm">
                No hay acciones registradas con los filtros actuales.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div style={{ backgroundColor: "#f5ede3", padding: "14px 20px" }}>
              <span className="text-secondary font-montserrat font-bold text-[16px]">
                {data.count} {data.count === 1 ? "registro" : "registros"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-quicksand">
                <thead>
                  <tr style={{ backgroundColor: "#f5ede3" }}>
                    {["Fecha y Hora", "Usuario", "Rol", "Acción", "Objeto", "Descripción", ""].map((h, i) => (
                      <th key={i} className="text-left text-primary font-montserrat font-bold text-[12px] px-5 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((entry, i) => {
                    const hasDetails = entry.details && Object.keys(entry.details).length > 0;
                    const expanded = expandedId === entry.id;
                    return (
                      <Fragment key={entry.id}>
                        <tr
                          style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fffcf7" }}
                          className={hasDetails ? "cursor-pointer" : ""}
                          onClick={() => hasDetails && setExpandedId(expanded ? null : entry.id)}
                        >
                          <td className="px-5 py-3 text-text whitespace-nowrap">
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td className="px-5 py-3 font-montserrat font-bold text-primary truncate max-w-[180px]">
                            {entry.actor_email || "Público"}
                          </td>
                          <td className="px-5 py-3 text-text whitespace-nowrap">
                            {entry.actor_role_display}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-block rounded-[10px] text-white font-montserrat font-bold text-[11px] px-2 py-1 ${
                                ACTION_BG[entry.action] ?? "bg-divider"
                              }`}
                            >
                              {entry.action_display}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-text whitespace-nowrap">
                            {OBJECT_LABELS[entry.object_type] ?? entry.object_type ?? "—"}
                            {entry.object_id ? ` #${entry.object_id}` : ""}
                          </td>
                          <td className="px-5 py-3 text-text">{entry.description}</td>
                          <td className="px-3 py-3 text-alternative">
                            {hasDetails && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                style={{
                                  transform: expanded ? "rotate(180deg)" : undefined,
                                  transition: "transform 0.15s",
                                }}
                              >
                                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </td>
                        </tr>
                        {expanded && (
                          <tr style={{ backgroundColor: "#f5ede3" }}>
                            <td colSpan={7} className="px-5 py-4">
                              <p className="text-primary font-montserrat font-bold text-[12px] mb-2">
                                Detalles{entry.ip_address ? ` · IP ${entry.ip_address}` : ""}
                              </p>
                              <pre className="bg-white rounded-[10px] p-4 text-[12px] text-text overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(entry.details, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && data.count > 50 && (
          <div className="flex items-center justify-center gap-4">
            <button
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border border-primary text-primary px-4 py-2 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Anterior
            </button>
            <span className="text-text font-quicksand text-sm">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
              className="border border-primary text-primary px-4 py-2 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Siguiente
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
