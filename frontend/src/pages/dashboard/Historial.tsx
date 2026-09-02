import { Fragment, useEffect, useRef, useState } from "react";
import api from "../../api/client";
import DatePicker from "../../components/ui/DatePicker";

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

interface Option {
  value: string;
  label: string;
}

const ACTION_OPTIONS: Option[] = [
  { value: "create", label: "Creaciones" },
  { value: "update", label: "Ediciones" },
  { value: "delete", label: "Eliminaciones" },
  { value: "upload", label: "Cargas de archivos" },
  { value: "email", label: "Correos enviados" },
  { value: "view", label: "Consultas" },
];

const OBJECT_OPTIONS: Option[] = [
  { value: "appointment", label: "Citas" },
  { value: "patient", label: "Pacientes" },
  { value: "partner", label: "Clínicas asociadas" },
  { value: "partner_user", label: "Accesos de clínicas" },
  { value: "report_file", label: "Archivos de resultados" },
  { value: "report_email", label: "Correos de resultados" },
  { value: "report_lookup", label: "Búsquedas del portal de pacientes" },
  { value: "partner_portal", label: "Portal de socios" },
  { value: "dashboard", label: "Dashboard" },
];

const ROLE_OPTIONS: Option[] = [
  { value: "staff", label: "Personal" },
  { value: "partner", label: "Clínica asociada" },
  { value: "patient", label: "Paciente" },
  { value: "public", label: "Público" },
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
  report_lookup: "Búsqueda del portal de pacientes",
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

function humanizeKey(key: string) {
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Renders an audit log's `details` payload as readable key/value rows instead of raw JSON. */
function DetailValue({ value }: { value: unknown }) {
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (
      keys.length > 0 &&
      keys.every((k) => ["antes", "despues"].includes(k))
    ) {
      return (
        <span className="text-text">
          {formatPrimitive(value.antes)}
          <span className="text-alternative mx-1">→</span>
          {formatPrimitive(value.despues)}
        </span>
      );
    }
    return (
      <div className="flex flex-col gap-1 pl-3 border-l-2 border-divider">
        {keys.map((k) => (
          <div key={k} className="flex flex-wrap gap-1">
            <span className="font-semibold text-primary">{humanizeKey(k)}:</span>
            <DetailValue value={value[k]} />
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-text">—</span>;
    if (value.every((v) => !isPlainObject(v) && !Array.isArray(v))) {
      return <span className="text-text">{value.map(formatPrimitive).join(", ")}</span>;
    }
    return (
      <div className="flex flex-col gap-1 pl-3 border-l-2 border-divider">
        {value.map((v, i) => (
          <DetailValue key={i} value={v} />
        ))}
      </div>
    );
  }

  return <span className="text-text">{formatPrimitive(value)}</span>;
}

function AuditDetails({ details }: { details: Record<string, unknown> }) {
  const keys = Object.keys(details);
  return (
    <div className="flex flex-col gap-2">
      {keys.map((k) => (
        <div key={k} className="flex flex-wrap gap-1 text-[12px]">
          <span className="font-montserrat font-bold text-primary">{humanizeKey(k)}:</span>
          <DetailValue value={details[k]} />
        </div>
      ))}
    </div>
  );
}

function useOutsideClick(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

function ColumnFilterHeader({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 font-montserrat font-bold text-[12px] whitespace-nowrap ${
          active ? "text-secondary" : "text-primary"
        }`}
      >
        {label}
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" className="flex-shrink-0">
          <path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />}
      </button>
      {open && (
        <div
          className="absolute z-20 top-full left-0 mt-2 bg-white border border-divider rounded-[10px] shadow-lg p-3 min-w-[200px] font-normal normal-case"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function CheckboxList({
  options,
  selected,
  onChange,
}: {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 max-h-[220px] overflow-y-auto">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-2 px-1.5 py-1 rounded-[6px] hover:bg-background cursor-pointer text-[12px] text-text font-quicksand"
          >
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={() => toggle(o.value)}
              className="accent-secondary"
            />
            {o.label}
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="self-start text-[11px] text-alternative hover:text-secondary font-quicksand font-semibold"
        >
          Limpiar filtro
        </button>
      )}
    </div>
  );
}

export default function Historial() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actions, setActions] = useState<string[]>(
    ACTION_OPTIONS.filter((o) => o.value !== "view").map((o) => o.value)
  );
  const [objectTypes, setObjectTypes] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [actor, setActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (actions.length > 0 && actions.length < ACTION_OPTIONS.length) {
      params.set("action", actions.join(","));
    }
    if (objectTypes.length > 0) params.set("object_type", objectTypes.join(","));
    if (roles.length > 0) params.set("role", roles.join(","));
    if (actor) params.set("actor", actor);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    api
      .get(`/audit/?${params.toString()}`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, actions, objectTypes, roles, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce the free-text actor filter
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [actor]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearAllFilters() {
    setActions(ACTION_OPTIONS.filter((o) => o.value !== "view").map((o) => o.value));
    setObjectTypes([]);
    setRoles([]);
    setActor("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 50)) : 1;
  const dateActive = Boolean(dateFrom || dateTo);
  const actorActive = Boolean(actor);
  const actionsActive = actions.length !== ACTION_OPTIONS.length - 1 || actions.includes("view");
  const objectTypesActive = objectTypes.length > 0;
  const rolesActive = roles.length > 0;
  const anyFilterActive = dateActive || actorActive || actionsActive || objectTypesActive || rolesActive;
  const dateInputClass =
    "border border-divider rounded-[8px] px-2 py-1.5 text-text font-quicksand text-[12px] focus:outline-none focus:border-secondary bg-white w-full";
  const dateTriggerClass =
    "w-full text-left border border-divider rounded-[8px] px-2 py-1.5 text-text font-quicksand text-[12px] focus:outline-none focus:border-secondary bg-white";

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
        {loading && !data ? (
          <div className="flex-1 flex items-center justify-center text-secondary font-quicksand">
            Cargando...
          </div>
        ) : (
          <div
            className="bg-white rounded-[10px] flex flex-col flex-1 min-h-0"
            style={{ maxHeight: "calc(100vh - 260px)" }}
          >
            <div
              className="flex-shrink-0 flex items-center justify-between"
              style={{ backgroundColor: "#f5ede3", padding: "14px 20px" }}
            >
              <span className="text-secondary font-montserrat font-bold text-[16px]">
                {data?.count ?? 0} {data?.count === 1 ? "registro" : "registros"}
              </span>
              {anyFilterActive && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-alternative hover:text-secondary font-quicksand font-semibold text-[12px]"
                >
                  Limpiar todos los filtros
                </button>
              )}
            </div>
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-sm font-quicksand table-fixed">
                <colgroup>
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "4%" }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: "#f5ede3" }} className="sticky top-0 z-10">
                    <th className="text-left px-5 py-3 whitespace-nowrap" style={{ backgroundColor: "#f5ede3" }}>
                      <ColumnFilterHeader label="Fecha y Hora" active={dateActive}>
                        {() => (
                          <div className="flex flex-col gap-2 w-[190px]">
                            <div>
                              <label className="block text-[11px] text-text/70 mb-1">Desde</label>
                              <DatePicker
                                value={dateFrom}
                                onChange={(v) => { setDateFrom(v); setPage(1); }}
                                placeholder="AAAA-MM-DD"
                                minYear={new Date().getFullYear() - 5}
                                maxYear={new Date().getFullYear()}
                                triggerClassName={dateTriggerClass}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-text/70 mb-1">Hasta</label>
                              <DatePicker
                                value={dateTo}
                                onChange={(v) => { setDateTo(v); setPage(1); }}
                                placeholder="AAAA-MM-DD"
                                minYear={new Date().getFullYear() - 5}
                                maxYear={new Date().getFullYear()}
                                triggerClassName={dateTriggerClass}
                              />
                            </div>
                            {dateActive && (
                              <button
                                type="button"
                                onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
                                className="self-start text-[11px] text-alternative hover:text-secondary font-quicksand font-semibold"
                              >
                                Limpiar filtro
                              </button>
                            )}
                          </div>
                        )}
                      </ColumnFilterHeader>
                    </th>
                    <th className="text-left px-5 py-3 whitespace-nowrap" style={{ backgroundColor: "#f5ede3" }}>
                      <ColumnFilterHeader label="Usuario" active={actorActive}>
                        {() => (
                          <div className="w-[190px]">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Filtrar por usuario..."
                              value={actor}
                              onChange={(e) => setActor(e.target.value)}
                              className={dateInputClass}
                            />
                            {actorActive && (
                              <button
                                type="button"
                                onClick={() => setActor("")}
                                className="mt-2 text-[11px] text-alternative hover:text-secondary font-quicksand font-semibold"
                              >
                                Limpiar filtro
                              </button>
                            )}
                          </div>
                        )}
                      </ColumnFilterHeader>
                    </th>
                    <th className="text-left px-5 py-3" style={{ backgroundColor: "#f5ede3" }}>
                      <ColumnFilterHeader label="Rol" active={roles.length > 0}>
                        {() => (
                          <CheckboxList options={ROLE_OPTIONS} selected={roles} onChange={(v) => { setRoles(v); setPage(1); }} />
                        )}
                      </ColumnFilterHeader>
                    </th>
                    <th className="text-left px-5 py-3 whitespace-nowrap" style={{ backgroundColor: "#f5ede3" }}>
                      <ColumnFilterHeader label="Acción" active={actionsActive}>
                        {() => (
                          <CheckboxList options={ACTION_OPTIONS} selected={actions} onChange={(v) => { setActions(v); setPage(1); }} />
                        )}
                      </ColumnFilterHeader>
                    </th>
                    <th className="text-left px-5 py-3" style={{ backgroundColor: "#f5ede3" }}>
                      <ColumnFilterHeader label="Objeto" active={objectTypes.length > 0}>
                        {() => (
                          <CheckboxList options={OBJECT_OPTIONS} selected={objectTypes} onChange={(v) => { setObjectTypes(v); setPage(1); }} />
                        )}
                      </ColumnFilterHeader>
                    </th>
                    <th
                      className="text-left text-primary font-montserrat font-bold text-[12px] px-5 py-3 whitespace-nowrap"
                      style={{ backgroundColor: "#f5ede3" }}
                    >
                      Descripción
                    </th>
                    <th className="px-3 py-3" style={{ backgroundColor: "#f5ede3" }} />
                  </tr>
                </thead>
                <tbody>
                  {data && data.results.length > 0 ? data.results.map((entry, i) => {
                    const hasDetails = entry.details && Object.keys(entry.details).length > 0;
                    const expanded = expandedId === entry.id;
                    return (
                      <Fragment key={entry.id}>
                        <tr
                          style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fffcf7" }}
                          className={hasDetails ? "cursor-pointer" : ""}
                          onClick={() => hasDetails && setExpandedId(expanded ? null : entry.id)}
                        >
                          <td className="px-5 py-3 text-text whitespace-nowrap overflow-hidden text-ellipsis">
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td className="px-5 py-3 font-montserrat font-bold text-primary truncate" title={entry.actor_email || "Público"}>
                            {entry.actor_email || "Público"}
                          </td>
                          <td className="px-5 py-3 text-text">
                            {entry.actor_role_display}
                          </td>
                          <td className="px-5 py-3 overflow-hidden">
                            <span
                              className={`inline-block rounded-[10px] text-white font-montserrat font-bold text-[11px] px-2 py-1 ${
                                ACTION_BG[entry.action] ?? "bg-divider"
                              }`}
                            >
                              {entry.action_display}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-text">
                            {OBJECT_LABELS[entry.object_type] ?? entry.object_type ?? "—"}
                            {entry.object_id ? ` #${entry.object_id}` : ""}
                          </td>
                          <td className="px-5 py-3 text-text whitespace-normal break-words">{entry.description}</td>
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
                              <div className="bg-white rounded-[10px] p-4">
                                <AuditDetails details={entry.details} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <svg className="mx-auto text-alternative mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 3" strokeLinecap="round" />
                        </svg>
                        <p className="text-primary font-montserrat font-bold text-[15px] mb-1">
                          Sin registros
                        </p>
                        <p className="text-text font-quicksand text-sm mb-3">
                          {anyFilterActive
                            ? "No hay acciones registradas con los filtros actuales."
                            : "No hay acciones registradas."}
                        </p>
                        {anyFilterActive && (
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="border border-primary text-primary px-4 py-2 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors"
                          >
                            Limpiar todos los filtros
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && data.count > 50 && (
          <div className="flex items-center justify-center gap-4 flex-shrink-0">
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
