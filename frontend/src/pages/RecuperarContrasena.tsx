import { useState, FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { asset } from "@/lib/asset";
import { supabase } from "../lib/supabase";

export default function RecuperarContrasena() {
  const [params] = useSearchParams();
  const backTo = params.get("origen") === "socios" ? "/portal-socios" : "/login";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
    });
    setLoading(false);
    // Only surface rate limiting; every other outcome shows the same message
    // so the form can't be used to discover which emails have accounts.
    if (error && (error.status === 429 || /rate limit/i.test(error.message))) {
      setError("Ya enviamos un correo hace poco. Espera un minuto e intenta de nuevo.");
      return;
    }
    setSent(true);
  }

  const fieldClass =
    "w-full bg-primary border border-secondary/60 text-white placeholder-secondary/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-alternative";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-white border border-divider rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 pt-8 pb-6 text-center">
          <img src={asset("images/logo.png")} alt="OrthoRad" className="h-14 w-auto mx-auto mb-5" />
          <h2 className="font-montserrat font-bold text-primary text-xl mb-1">
            Recuperar contraseña
          </h2>
          <p className="text-text text-sm font-quicksand">
            Te enviaremos un enlace para crear una nueva contraseña.
          </p>
        </div>

        {sent ? (
          <div className="bg-primary px-8 py-7 space-y-5 text-center">
            <p className="text-white text-sm font-quicksand">
              Si el correo <strong>{email}</strong> está registrado, recibirás un mensaje de
              OrthoRad con el enlace para restablecer tu contraseña.
            </p>
            <p className="text-alternative/80 text-xs font-quicksand">
              Revisa también tu carpeta de spam. El enlace funciona una sola vez y vence en 1 hora.
            </p>
            <Link
              to={backTo}
              className="block w-full bg-background-alt text-primary py-3 rounded-xl font-quicksand font-semibold text-sm hover:bg-white transition-colors"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
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
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                className={fieldClass}
              />
            </div>

            {error && <p className="text-red-300 text-xs font-quicksand">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-background-alt text-primary py-3 rounded-xl font-quicksand font-semibold text-sm hover:bg-white transition-colors disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>

            <p className="text-center">
              <Link
                to={backTo}
                className="text-alternative/80 text-xs font-quicksand underline hover:text-white"
              >
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
