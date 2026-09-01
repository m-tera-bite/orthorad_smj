import { useState } from "react";
import api from "../../api/client";

interface Patient {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
}

interface Props {
  patient: Patient;
  onClose: () => void;
  onSaved: (updated: Patient) => void;
}

export default function EditPatientModal({ patient, onClose, onSaved }: Props) {
  const [email, setEmail] = useState(patient.patient_email);
  const [phone, setPhone] = useState(patient.patient_phone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full border border-divider rounded-[10px] px-4 py-2.5 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white";
  const labelClass = "block text-primary font-quicksand font-semibold text-sm mb-1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.patch(
        `/appointments/patients/?email=${encodeURIComponent(patient.patient_email)}`,
        { patient_email: email, patient_phone: phone }
      );
      onSaved(data);
    } catch {
      setError("No se pudo guardar. Verifica el correo e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(92,51,23,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-background-alt rounded-[10px] w-full max-w-md mx-4 overflow-hidden shadow-xl">
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-montserrat font-bold text-[18px]">Editar Paciente</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-alternative hover:text-white transition-colors text-xl leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-text font-quicksand text-sm">
            <span className="font-semibold text-primary">{patient.patient_name}</span>
          </p>

          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="+502 0000 0000"
            />
          </div>

          <p className="text-[11px] text-text/50 font-quicksand">
            Estos cambios se aplicarán a todas las citas registradas de este paciente.
          </p>

          {error && <p className="text-red-600 text-sm font-quicksand">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-primary text-primary py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-action-dark text-white py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-action-dark/80 transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
