import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asset } from "@/lib/asset";
import { useAuth } from "../context/AuthContext";

export default function PortalSocios() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (user.partner) {
        navigate("/socios");
      } else if (user.is_staff) {
        navigate("/dashboard");
      } else {
        await logout();
        setError("Esta cuenta no pertenece a una clínica asociada.");
      }
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full bg-primary border border-secondary/60 text-white placeholder-secondary/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-alternative";

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-divider px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm font-quicksand text-secondary">
          <Link to="/" className="hover:text-primary transition-colors">← Volver al inicio</Link>
          <span className="text-divider">/</span>
          <span className="text-text">Portal Clínicas Asociadas</span>
        </div>
      </div>

      {/* Login card */}
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white border border-divider rounded-2xl overflow-hidden shadow-sm">
          {/* Top — logo + heading */}
          <div className="px-8 pt-8 pb-6 text-center">
            <img src={asset("images/logo.png")} alt="OrthoRad" className="h-14 w-auto mx-auto mb-5" />
            <h2 className="font-montserrat font-bold text-primary text-xl mb-1">
              Portal de Clínicas Asociadas
            </h2>
            <p className="text-text text-sm font-quicksand">
              Consulta los resultados de tus pacientes referidos
            </p>
          </div>

          {/* Bottom — dark brown form */}
          <form onSubmit={handleSubmit} className="bg-primary px-8 py-7 space-y-5">
            <div>
              <label className="block text-white text-sm font-quicksand font-medium mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="clinica@ejemplo.com"
                autoComplete="email"
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-white text-sm font-quicksand font-medium mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={fieldClass}
              />
            </div>

            {error && <p className="text-red-300 text-xs font-quicksand">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-background-alt text-primary py-3 rounded-xl font-quicksand font-semibold text-sm hover:bg-white transition-colors disabled:opacity-60"
            >
              {loading ? "Verificando..." : "Acceder al Portal"}
            </button>

            <p className="text-alternative/70 text-[11px] font-quicksand text-center">
              ¿Sin acceso? Contacta a OrthoRad para solicitar tu cuenta de clínica asociada.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
