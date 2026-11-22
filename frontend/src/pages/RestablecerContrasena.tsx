import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { asset } from "@/lib/asset";
import { createRecoveryClient } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const MIN_LENGTH = 8;

// The email link is single-use. React StrictMode runs effects twice in dev,
// so cache the verification per token to avoid burning it on the first run.
const verifications = new Map<
  string,
  { client: SupabaseClient; promise: Promise<Session | null> }
>();

function verifyToken(tokenHash: string) {
  let entry = verifications.get(tokenHash);
  if (!entry) {
    const client = createRecoveryClient();
    const promise = client.auth
      .verifyOtp({ type: "recovery", token_hash: tokenHash })
      .then(({ data, error }) => (error ? null : data.session));
    entry = { client, promise };
    verifications.set(tokenHash, entry);
  }
  return entry;
}

type Status = "verifying" | "ready" | "invalid";

export default function RestablecerContrasena() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  const [status, setStatus] = useState<Status>(
    tokenHash && type === "recovery" ? "verifying" : "invalid"
  );
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tokenHash || type !== "recovery") return;
    let cancelled = false;
    verifyToken(tokenHash).promise.then((s) => {
      if (cancelled) return;
      setSession(s);
      setStatus(s ? "ready" : "invalid");
    });
    return () => {
      cancelled = true;
    };
  }, [tokenHash, type]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tokenHash || !session) return;
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    const { client } = verifyToken(tokenHash);
    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      if (updateError.code === "same_password") {
        setError("La nueva contraseña debe ser distinta a la anterior.");
      } else if (updateError.code === "weak_password") {
        setError("La contraseña es demasiado débil. Usa letras, números y símbolos.");
      } else {
        setError("No se pudo actualizar la contraseña. Solicita un nuevo enlace.");
      }
      return;
    }

    // Decide which login to send them back to, using the recovery token.
    let destination = "/login";
    try {
      const res = await fetch("/api/portal/me/", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.user?.partner) destination = "/portal-socios";
      }
    } catch {
      // fall back to the generic login
    }

    verifications.delete(tokenHash);
    await client.auth.signOut();
    await logout(); // also clears any other session left in this browser
    navigate(destination, {
      replace: true,
      state: { notice: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." },
    });
  }

  const fieldClass =
    "w-full bg-primary border border-secondary/60 text-white placeholder-secondary/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-alternative";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-white border border-divider rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 pt-8 pb-6 text-center">
          <img src={asset("images/logo.png")} alt="OrthoRad" className="h-14 w-auto mx-auto mb-5" />
          <h2 className="font-montserrat font-bold text-primary text-xl mb-1">
            Nueva contraseña
          </h2>
          <p className="text-text text-sm font-quicksand">
            Elige una contraseña para tu cuenta de OrthoRad.
          </p>
        </div>

        {status === "verifying" && (
          <div className="bg-primary px-8 py-10 text-center">
            <p className="text-white text-sm font-quicksand">Verificando enlace...</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="bg-primary px-8 py-7 space-y-5 text-center">
            <p className="text-white text-sm font-quicksand">
              Este enlace ya no es válido. Puede haber vencido o haberse usado antes.
            </p>
            <Link
              to="/recuperar-contrasena"
              className="block w-full bg-background-alt text-primary py-3 rounded-xl font-quicksand font-semibold text-sm hover:bg-white transition-colors"
            >
              Solicitar un nuevo enlace
            </Link>
            <Link
              to="/login"
              className="block text-alternative/80 text-xs font-quicksand underline hover:text-white"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="bg-primary px-8 py-7 space-y-5">
            <div>
              <label className="block text-white text-sm font-quicksand font-medium mb-2">
                Nueva contraseña
              </label>
              <input
                type={show ? "text" : "password"}
                required
                minLength={MIN_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Mínimo ${MIN_LENGTH} caracteres`}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-white text-sm font-quicksand font-medium mb-2">
                Confirmar contraseña
              </label>
              <input
                type={show ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>

            <label className="flex items-center gap-2 text-alternative/80 text-xs font-quicksand cursor-pointer">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
              Mostrar contraseña
            </label>

            {error && <p className="text-red-300 text-xs font-quicksand">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-background-alt text-primary py-3 rounded-xl font-quicksand font-semibold text-sm hover:bg-white transition-colors disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
