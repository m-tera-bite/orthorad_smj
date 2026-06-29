import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";

export default function PortalCliente() {
  const [dob, setDob] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // TODO: wire to backend endpoint that validates DOB + expedition code
      await new Promise((r) => setTimeout(r, 800));
      // On success, navigate to results viewer
      // navigate(`/resultados/${code}`);
      setError("Código de expediente no encontrado. Verifica tus datos.");
    } finally {
      setLoading(false);
    }
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

      {/* Login card */}
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white border border-divider rounded-2xl overflow-hidden shadow-sm">
          {/* Top — logo + heading */}
          <div className="px-8 pt-8 pb-6 text-center">
            <img src="/images/logo.png" alt="OrthoRad" className="h-14 w-auto mx-auto mb-5" />
            <h2 className="font-montserrat font-bold text-primary text-xl mb-1">
              Bienvenido a la Plataforma
            </h2>
            <p className="text-text text-sm font-quicksand">Accede a tus estudios radiológicos</p>
          </div>

          {/* Bottom — dark brown form */}
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
              <button
                type="button"
                className="mt-1.5 text-xs text-alternative/70 hover:text-alternative font-quicksand text-right w-full"
              >
                ¿Has olvidado tu código?
              </button>
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
        </div>
      </div>
    </>
  );
}
