import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
}

type Step = 1 | 2 | 3;

const STEPS = [
  { number: 1, label: "Servicio" },
  { number: 2, label: "Fecha y hora" },
  { number: 3, label: "Datos personales" },
];

export default function Agenda() {
  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/appointments/services/").then(({ data }) => setServices(data));
  }, []);

  async function handleSubmit() {
    if (!selectedService) return;
    setSubmitting(true);
    try {
      await api.post("/appointments/", {
        patient_name: form.name,
        patient_email: form.email,
        patient_phone: form.phone,
        service: selectedService.id,
        scheduled_at: `${selectedDate}T${selectedTime}`,
        notes: form.notes,
      });
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  const availableTimes = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  ];

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-action/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-action text-2xl">✓</span>
          </div>
          <h2 className="font-montserrat font-bold text-primary text-2xl mb-3">
            ¡Cita confirmada!
          </h2>
          <p className="text-text text-sm mb-6">
            Recibirás un correo de confirmación en breve con los detalles de tu cita.
          </p>
          <Link to="/" className="bg-secondary text-white px-8 py-3 rounded-lg font-quicksand font-medium hover:bg-primary transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-divider px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm font-quicksand text-secondary">
          <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            ← Volver al inicio
          </Link>
          <span className="text-divider">/</span>
          <span className="text-text">Agendar cita — Radiología Dental</span>
        </div>
      </div>

      {/* Main wizard layout */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-8 items-start justify-center">

        {/* Left panel — info */}
        <div className="bg-primary rounded-2xl p-8 w-full md:w-72 flex-shrink-0 text-white font-quicksand">
          <p className="text-alternative text-xs font-semibold uppercase tracking-widest mb-3">ORTHORAD</p>
          <h2 className="font-montserrat font-bold text-white text-2xl leading-tight mb-8">
            Agenda tu<br />cita dental
          </h2>
          <div className="border-t border-secondary/40 pt-6 space-y-4 text-sm text-alternative mt-auto">
            <div className="flex gap-3 items-start">
              <span className="mt-0.5">📍</span>
              <span>San Martín Jilotepeque, barrio El Calvario</span>
            </div>
            <div className="flex gap-3 items-center">
              <span>📞</span>
              <span>+502 3162 8739</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="mt-0.5">🗓</span>
              <span>
                Lun – Vie 9:00 a 17:00<br />
                Sab – Dom 9:00 a 13:00
              </span>
            </div>
          </div>
        </div>

        {/* Right panel — wizard */}
        <div className="bg-white border border-divider rounded-2xl p-8 w-full max-w-xl">
          {/* Close / step indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-0 text-xs font-quicksand">
              {STEPS.map((s, i) => (
                <div key={s.number} className="flex items-center gap-0">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    step === s.number
                      ? "bg-secondary text-white"
                      : step > s.number
                      ? "text-action"
                      : "text-text"
                  }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      step === s.number ? "bg-white text-secondary" : step > s.number ? "bg-action text-white" : "bg-divider text-text"
                    }`}>
                      {s.number}
                    </span>
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-6 h-px bg-divider mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1 — Seleccionar servicio */}
          {step === 1 && (
            <>
              <h3 className="font-montserrat font-bold text-primary text-xl mb-1">
                Selecciona el estudio
              </h3>
              <p className="text-text text-sm mb-6 font-quicksand">
                Elige el tipo de radiografía que necesitas.
              </p>
              <ul className="space-y-3">
                {services.map((s, i) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedService(s)}
                      className={`w-full flex items-center gap-4 border rounded-xl px-4 py-3 text-left transition-colors ${
                        selectedService?.id === s.id
                          ? "border-secondary bg-secondary/5"
                          : "border-divider hover:border-secondary"
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-montserrat font-bold flex-shrink-0 ${
                        selectedService?.id === s.id ? "bg-secondary text-white" : "bg-background text-primary"
                      }`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 font-montserrat font-medium text-primary text-sm">
                        {s.name}
                      </span>
                      <span className="text-xs text-text font-quicksand flex items-center gap-1">
                        🕐 {s.duration_minutes} min
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end">
                <button
                  disabled={!selectedService}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-secondary text-white px-6 py-2.5 rounded-lg font-quicksand font-medium text-sm hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar <span>›</span>
                </button>
              </div>
            </>
          )}

          {/* Step 2 — Fecha y hora */}
          {step === 2 && (
            <>
              <h3 className="font-montserrat font-bold text-primary text-xl mb-1">
                Elige fecha y hora
              </h3>
              <p className="text-text text-sm mb-6 font-quicksand">
                Selecciona el horario que más te convenga.
              </p>
              <div className="mb-5">
                <label className="block text-sm font-quicksand font-medium text-text mb-2">Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-divider rounded-xl px-4 py-3 text-text text-sm focus:outline-none focus:border-secondary"
                />
              </div>
              {selectedDate && (
                <div>
                  <label className="block text-sm font-quicksand font-medium text-text mb-3">Hora</label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimes.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2 rounded-lg text-xs font-quicksand font-medium border transition-colors ${
                          selectedTime === t
                            ? "bg-secondary text-white border-secondary"
                            : "border-divider text-text hover:border-secondary"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(1)} className="text-secondary text-sm font-quicksand hover:text-primary">
                  ‹ Atrás
                </button>
                <button
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 bg-secondary text-white px-6 py-2.5 rounded-lg font-quicksand font-medium text-sm hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar <span>›</span>
                </button>
              </div>
            </>
          )}

          {/* Step 3 — Datos personales */}
          {step === 3 && (
            <>
              <h3 className="font-montserrat font-bold text-primary text-xl mb-1">
                Datos personales
              </h3>
              <p className="text-text text-sm mb-6 font-quicksand">
                Ingresa tu información para confirmar la cita.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-quicksand font-medium text-text mb-1.5">Nombre completo</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-divider rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:border-secondary"
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-quicksand font-medium text-text mb-1.5">Teléfono</label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border border-divider rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:border-secondary"
                      placeholder="+502 0000-0000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-quicksand font-medium text-text mb-1.5">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-divider rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:border-secondary"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-quicksand font-medium text-text mb-1.5">Notas adicionales</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full border border-divider rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:border-secondary resize-none"
                    placeholder="¿Tienes alguna indicación médica previa?"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(2)} className="text-secondary text-sm font-quicksand hover:text-primary">
                  ‹ Atrás
                </button>
                <button
                  disabled={!form.name || !form.email || !form.phone || submitting}
                  onClick={handleSubmit}
                  className="bg-secondary text-white px-6 py-2.5 rounded-lg font-quicksand font-medium text-sm hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Enviando..." : "Confirmar cita"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
