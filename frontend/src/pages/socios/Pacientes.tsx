import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

interface Patient {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_count: number;
  last_appointment: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Pacientes() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get("/partners/portal/patients/")
      .then(({ data }) => setPatients(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      p.patient_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: "#cfac8c", padding: "13px 40px" }}
      >
        <h1 className="text-white font-montserrat font-bold text-[20px]">Mis Pacientes Referidos</h1>
      </header>

      {/* Body */}
      <main
        className="flex-1 overflow-y-auto flex flex-col gap-5"
        style={{ backgroundColor: "#fffcf7", padding: "24px 40px 40px" }}
      >
        {/* Search */}
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-alternative" width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-divider rounded-[10px] text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white"
          />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-secondary font-quicksand">
            Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center bg-white rounded-[10px] p-10 max-w-sm">
              <svg className="mx-auto text-alternative mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
              <p className="text-primary font-montserrat font-bold text-[16px] mb-2">
                {search ? "Sin resultados" : "Aún no hay pacientes referidos"}
              </p>
              <p className="text-text font-quicksand text-sm">
                {search
                  ? "Intenta con otro nombre o correo."
                  : "Cuando OrthoRad registre citas referidas por tu clínica, aparecerán aquí."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtered.map((p) => (
              <div key={p.patient_email || p.patient_name} className="bg-white rounded-[10px] overflow-hidden">
                <div className="bg-primary px-4 py-3">
                  <p className="text-white font-montserrat font-bold text-[15px] truncate">{p.patient_name}</p>
                </div>
                <div className="px-4 py-4 space-y-2">
                  <div className="flex items-center gap-2 text-text font-quicksand text-sm">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-alternative flex-shrink-0">
                      <path d="M1 3h11v8a1 1 0 01-1 1H2a1 1 0 01-1-1V3zM1 3l5.5 5L12 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <span className="truncate">{p.patient_email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text font-quicksand text-sm">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-alternative flex-shrink-0">
                      <path d="M2.5 5.5C3.4 7.2 5 8.8 6.8 9.7L8.2 8.3c.2-.2.5-.25.75-.15.75.25 1.55.4 2.4.4.4 0 .75.35.75.75V11.5c0 .4-.35.75-.75.75C5 12.25.75 8 .75 2.75.75 2.35 1.1 2 1.5 2H3.75c.4 0 .75.35.75.75 0 .85.15 1.65.4 2.4.075.25 0 .55-.175.75L2.5 5.5z" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    <span>{p.patient_phone || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-divider">
                    <span className="bg-secondary text-white font-montserrat font-bold text-[11px] rounded-[10px] px-2 py-0.5">
                      {p.appointment_count} {p.appointment_count === 1 ? "estudio" : "estudios"}
                    </span>
                    <span className="text-text/60 font-quicksand text-[11px]">
                      Último: {formatDate(p.last_appointment)}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/socios/resultados?email=${encodeURIComponent(p.patient_email)}`)}
                    className="w-full mt-1 border border-primary text-primary text-[12px] font-quicksand font-semibold rounded-[10px] py-2 hover:bg-primary hover:text-white transition-colors"
                  >
                    Ver Resultados
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
