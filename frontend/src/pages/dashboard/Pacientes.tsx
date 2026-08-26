import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import NewAppointmentModal from "../../components/dashboard/NewAppointmentModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

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
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState<Patient | null>(null);

  function load() {
    api.get("/appointments/patients/").then(({ data }) => setPatients(data)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(patient: Patient) {
    await api.delete(
      `/appointments/patients/?email=${encodeURIComponent(patient.patient_email)}`
    );
    setPatients((prev) =>
      prev.filter((p) => p.patient_email !== patient.patient_email)
    );
  }

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
        <h1 className="text-white font-montserrat font-bold text-[20px]">Pacientes</h1>
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
                {search ? "Sin resultados" : "No hay pacientes aún"}
              </p>
              <p className="text-text font-quicksand text-sm">
                {search
                  ? "Intenta con otro nombre o correo."
                  : "Los pacientes aparecerán aquí cuando se registren citas."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtered.map((p) => (
              <div key={p.patient_email} className="bg-white rounded-[10px] overflow-hidden">
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
                    <div className="flex items-center gap-2">
                      <span className="bg-secondary text-white font-montserrat font-bold text-[11px] rounded-[10px] px-2 py-0.5">
                        {p.appointment_count} {p.appointment_count === 1 ? "cita" : "citas"}
                      </span>
                    </div>
                    <span className="text-text/60 font-quicksand text-[11px]">
                      Última: {formatDate(p.last_appointment)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => navigate(`/dashboard/citas?email=${encodeURIComponent(p.patient_email)}`)}
                      className="flex-1 border border-primary text-primary text-[12px] font-quicksand font-semibold rounded-[10px] py-2 hover:bg-primary hover:text-white transition-colors"
                    >
                      Ver Citas
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      title="Eliminar paciente"
                      className="flex-shrink-0 border border-red-500 text-red-500 rounded-[10px] px-3 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewAppointmentModal
          onClose={() => setShowNew(false)}
          onCreated={() => { load(); }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar Paciente"
          message={
            <>
              ¿Eliminar al paciente <strong>{deleting.patient_name}</strong> (
              {deleting.patient_email})? Se eliminarán sus{" "}
              <strong>
                {deleting.appointment_count}{" "}
                {deleting.appointment_count === 1 ? "cita" : "citas"}
              </strong>{" "}
              junto con sus resultados, y dejarán de mostrarse en el sistema — incluido
              el portal de clínicas asociadas.
            </>
          }
          confirmLabel="Eliminar Paciente"
          onConfirm={() => handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
