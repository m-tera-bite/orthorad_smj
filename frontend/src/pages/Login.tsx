import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate("/portal-cliente");
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-divider rounded-xl px-4 py-3 text-text font-inter text-sm focus:outline-none focus:border-action bg-white";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-primary text-center mb-2 text-3xl">Iniciar sesión</h1>
        <p className="text-center text-text text-sm mb-8 font-quicksand">
          Accede a tu portal de paciente
        </p>

        <form onSubmit={handleSubmit} className="bg-background-alt border border-divider rounded-2xl p-8 space-y-4">
          <div>
            <label className="block text-sm font-quicksand font-medium text-text mb-1">
              Usuario o correo
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-quicksand font-medium text-text mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-red-600 text-sm font-quicksand">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-action text-white py-3 rounded-full font-quicksand font-medium hover:bg-action-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-text mt-6 font-quicksand">
          ¿No tienes cuenta?{" "}
          <Link to="/agenda" className="text-action underline">
            Agenda tu primera cita
          </Link>
        </p>
      </div>
    </div>
  );
}
