import { useEffect, useState } from "react";
import api from "../../api/client";

interface ServiceCategory {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  category: ServiceCategory | null;
}

interface PartnerOption {
  id: number;
  name: string;
  is_active: boolean;
}

export interface EditableAppointment {
  id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  service: number | null;
  referring_partner: number | null;
  scheduled_at: string;
  room: string;
  notes: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
  defaultEmail?: string;
  appointment?: EditableAppointment;
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewAppointmentModal({ onClose, onSaved, defaultEmail = "", appointment }: Props) {
  const isEdit = Boolean(appointment);
  const [services, setServices] = useState<Service[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [form, setForm] = useState(() =>
    appointment
      ? {
          patient_name: appointment.patient_name,
          patient_email: appointment.patient_email,
          patient_phone: appointment.patient_phone,
          service: appointment.service ? String(appointment.service) : "",
          referring_partner: appointment.referring_partner ? String(appointment.referring_partner) : "",
          scheduled_at: toDatetimeLocal(appointment.scheduled_at),
          room: appointment.room,
          notes: appointment.notes,
        }
      : {
          patient_name: "",
          patient_email: defaultEmail,
          patient_phone: "",
          service: "",
          referring_partner: "",
          scheduled_at: "",
          room: "",
          notes: "",
        }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/appointments/services/").then(({ data }) => setServices(data));
    api
      .get("/partners/")
      .then(({ data }) => setPartners(data.filter((p: PartnerOption) => p.is_active)))
      .catch(() => setPartners([]));
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.service || !form.scheduled_at) {
      setError("El servicio y la fecha son obligatorios.");
      return;
    }
    setLoading(true);
    setError(null);
    const payload = {
      ...form,
      service: Number(form.service),
      referring_partner: form.referring_partner ? Number(form.referring_partner) : null,
    };
    try {
      if (isEdit && appointment) {
        await api.patch(`/appointments/${appointment.id}/`, payload);
      } else {
        await api.post("/appointments/", payload);
      }
      onSaved();
      onClose();
    } catch {
      setError(isEdit ? "No se pudieron guardar los cambios." : "No se pudo crear la cita. Verifica los datos.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-divider rounded-[10px] px-4 py-2.5 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white";
  const labelClass = "block text-primary font-quicksand font-semibold text-sm mb-1";

  const grouped = services.reduce((acc, s) => {
    const key = s.category?.name ?? "Otros";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, Service[]>);

  const selectedService = services.find((s) => s.id === Number(form.service));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(92,51,23,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-alt rounded-[10px] w-full max-w-lg mx-4 overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        <div className="bg-primary px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-montserrat font-bold text-[18px]">{isEdit ? "Editar Cita" : "Nueva Cita"}</h2>
          <button onClick={onClose} className="text-alternative hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {/* Patient name — full width */}
            <div className="col-span-2">
              <label className={labelClass}>Nombre del paciente *</label>
              <input
                required
                type="text"
                value={form.patient_name}
                onChange={(e) => set("patient_name", e.target.value)}
                className={inputClass}
                placeholder="Nombre completo"
              />
            </div>

            {/* Email | Phone */}
            <div>
              <label className={labelClass}>Correo electrónico</label>
              <input
                type="email"
                value={form.patient_email}
                onChange={(e) => set("patient_email", e.target.value)}
                className={inputClass}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="tel"
                value={form.patient_phone}
                onChange={(e) => set("patient_phone", e.target.value)}
                className={inputClass}
                placeholder="+502 0000 0000"
              />
            </div>

            {/* Service selector — full width, scrollable card list */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass.replace("mb-1", "")}>Servicio *</label>
                {selectedService && (
                  <span className="text-xs font-quicksand text-secondary font-medium truncate max-w-[220px]">
                    {selectedService.name}
                  </span>
                )}
              </div>
              <div className={`border rounded-[10px] overflow-hidden transition-colors ${
                form.service ? "border-secondary" : "border-divider"
              }`}>
                <div className="overflow-y-auto max-h-[210px]">
                  {services.length === 0 ? (
                    <p className="text-text/40 text-xs font-quicksand px-4 py-6 text-center">
                      Cargando servicios...
                    </p>
                  ) : (
                    Object.entries(grouped).map(([cat, items]) => (
                      <div key={cat}>
                        <p className="sticky top-0 bg-background-alt text-[10px] font-montserrat font-bold text-secondary uppercase tracking-widest px-3 py-1.5 border-b border-divider/50">
                          {cat}
                        </p>
                        <div className="px-2 py-1 space-y-0.5">
                          {items.map((s) => (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => set("service", String(s.id))}
                              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                form.service === String(s.id)
                                  ? "bg-secondary/10 text-primary"
                                  : "hover:bg-background text-text"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                form.service === String(s.id) ? "bg-secondary" : "bg-divider"
                              }`} />
                              <span className="flex-1 font-montserrat font-medium text-sm">{s.name}</span>
                              <span className="text-[11px] text-text/50 font-quicksand flex-shrink-0">
                                {s.duration_minutes} min
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Date/time | Room */}
            <div>
              <label className={labelClass}>Fecha y hora *</label>
              <input
                required
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => set("scheduled_at", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sala / Consultorio</label>
              <input
                type="text"
                value={form.room}
                onChange={(e) => set("room", e.target.value)}
                className={inputClass}
                placeholder="Ej. Sala 1"
              />
            </div>

            {/* Referring partner clinic — full width */}
            <div className="col-span-2">
              <label className={labelClass}>Clínica referente (opcional)</label>
              <select
                value={form.referring_partner}
                onChange={(e) => set("referring_partner", e.target.value)}
                className={inputClass}
              >
                <option value="">Sin clínica referente</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-text/50 font-quicksand mt-1">
                La clínica seleccionada podrá ver este estudio y sus resultados en su portal.
              </p>
            </div>

            {/* Notes — full width */}
            <div className="col-span-2">
              <label className={labelClass}>Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm font-quicksand">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-primary text-primary py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-action-dark text-white py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-action-dark/80 transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
