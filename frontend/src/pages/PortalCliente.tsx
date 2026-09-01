import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { asset } from "@/lib/asset";
import api from "@/api/client";

interface ResultFile {
  id: number;
  original_name: string;
  url: string | null;
  uploaded_at: string;
}

interface LookupResult {
  patient_name: string;
  service_name: string;
  scheduled_at: string;
  uploaded_at: string;
  files: ResultFile[];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PortalCliente() {
  const [dob, setDob] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/portal/resultados/buscar/", {
        date_of_birth: dob,
        code,
      });
      setResult(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Código de expediente no encontrado. Verifica tus datos."
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setDob("");
    setCode("");
    setError(null);
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-divider px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm font-quicksand text-secondary">
          <Link to="/" className="hover:text-primary transition-colors">← Volver al inicio</Link>
          <span className="text-divider">/</span>
          <span className="text-text">Portal Clientes - Resultados Online</span>
        </div>
      </div>

      <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white border border-divider rounded-2xl overflow-hidden shadow-sm">
          {/* Top — logo + heading */}
          <div className="px-8 pt-8 pb-6 text-center">
            <img src={asset("images/logo.png")} alt="OrthoRad" className="h-14 w-auto mx-auto mb-5" />
            <h2 className="font-montserrat font-bold text-primary text-xl mb-1">
              {result ? "Tus resultados" : "Bienvenido a la Plataforma"}
            </h2>
            <p className="text-text text-sm font-quicksand">
              {result ? `${result.patient_name} — ${result.service_name}` : "Accede a tus estudios radiológicos"}
            </p>
          </div>

          {result ? (
            <div className="bg-primary px-8 py-7 space-y-4">
              <p className="text-alternative text-xs font-quicksand">
                Estudio del {formatDateTime(result.scheduled_at)}
              </p>
              <ul className="space-y-2">
                {result.files.map((f) => (
                  <li key={f.id}>
                    <a
                      href={f.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-background-alt rounded-xl px-4 py-3 text-primary font-quicksand text-sm hover:bg-white transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="flex-shrink-0">
                        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="13 2 13 9 20 9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="truncate">{f.original_name || "Ver archivo"}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={reset}
                className="w-full bg-background-alt text-primary py-3 rounded-xl font-quicksand font-semibold text-sm hover:bg-white transition-colors"
              >
                Buscar otro resultado
              </button>
            </div>
          ) : (
            /* Bottom — dark brown form */
            <form onSubmit={handleSubmit} className="bg-primary px-8 py-7 space-y-5">
              <div>
                <label className="block text-white text-sm font-quicksand font-medium mb-2">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="yyyy/mm/dd"
                  className="w-full bg-primary border border-secondary/60 text-white placeholder-secondary/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-alternative"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-quicksand font-medium mb-2">
                  Código de Expediente
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ej. ORTHORAD-2026-0987"
                  className="w-full bg-primary border border-secondary/60 text-white placeholder-secondary/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-alternative"
                />
                <p className="mt-1.5 text-xs text-alternative/70 font-quicksand text-right w-full">
                  El código se te envía por correo cuando tus resultados están listos.
                </p>
              </div>

              {error && (
                <p className="text-red-300 text-xs font-quicksand">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-background-alt text-primary py-3 rounded-xl font-quicksand font-semibold text-sm hover:bg-white transition-colors disabled:opacity-60"
              >
                {loading ? "Verificando..." : "Acceder a mis Resultados"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
