import { useEffect, useState, FormEvent } from "react";
import api from "../../api/client";

interface Partner {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  users_count: number;
}

interface PartnerUserRow {
  id: number;
  email: string;
  created_at: string;
}

const inputClass =
  "w-full border border-divider rounded-[10px] px-4 py-2.5 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white";
const labelClass = "block text-primary font-quicksand font-semibold text-sm mb-1";

/* ------------------------------------------------------------------ */
/* Create / edit partner modal                                         */
/* ------------------------------------------------------------------ */
function PartnerModal({
  partner,
  onClose,
  onSaved,
}: {
  partner: Partner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: partner?.name ?? "",
    contact_name: partner?.contact_name ?? "",
    email: partner?.email ?? "",
    phone: partner?.phone ?? "",
    is_active: partner?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (partner) {
        await api.patch(`/partners/${partner.id}/`, form);
      } else {
        await api.post("/partners/", form);
      }
      onSaved();
      onClose();
    } catch {
      setError("No se pudo guardar la clínica. Verifica los datos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(92,51,23,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-alt rounded-[10px] w-full max-w-lg mx-4 overflow-hidden shadow-xl">
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-montserrat font-bold text-[18px]">
            {partner ? "Editar Clínica Asociada" : "Nueva Clínica Asociada"}
          </h2>
          <button onClick={onClose} className="text-alternative hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Nombre de la clínica *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
                placeholder="Ej. Clínica Dental Sonrisa"
              />
            </div>
            <div>
              <label className={labelClass}>Contacto</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                className={inputClass}
                placeholder="Nombre del contacto"
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className={inputClass}
                placeholder="+502 0000 0000"
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Correo de contacto</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className={inputClass}
                placeholder="contacto@clinica.com"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="partner-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              />
              <label htmlFor="partner-active" className="text-text font-quicksand text-sm">
                Activa (con acceso al portal)
              </label>
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
              {loading ? "Guardando..." : partner ? "Guardar Cambios" : "Crear Clínica"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Users (accounts) modal                                              */
/* ------------------------------------------------------------------ */
function UsersModal({ partner, onClose, onChanged }: { partner: Partner; onClose: () => void; onChanged: () => void }) {
  const [users, setUsers] = useState<PartnerUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    api
      .get(`/partners/${partner.id}/users/`)
      .then(({ data }) => setUsers(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    setNotice(null);
    setCredentials(null);
    try {
      const { data } = await api.post(`/partners/${partner.id}/users/`, { email });
      if (data.temp_password) {
        setCredentials({ email: data.email, password: data.temp_password });
      } else if (data.supabase_message) {
        setNotice(data.supabase_message);
      }
      setEmail("");
      load();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo agregar el usuario.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(linkId: number) {
    try {
      await api.delete(`/partners/${partner.id}/users/${linkId}/`);
      setUsers((prev) => prev.filter((u) => u.id !== linkId));
      onChanged();
    } catch {
      setError("No se pudo eliminar el usuario.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(92,51,23,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-alt rounded-[10px] w-full max-w-lg mx-4 overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        <div className="bg-primary px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-montserrat font-bold text-[18px]">
            Accesos — {partner.name}
          </h2>
          <button onClick={onClose} className="text-alternative hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="correo@clinica.com"
            />
            <button
              type="submit"
              disabled={adding}
              className="flex-shrink-0 bg-action-dark text-white px-4 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-action-dark/80 transition-colors disabled:opacity-50"
            >
              {adding ? "Agregando..." : "Agregar"}
            </button>
          </form>

          {credentials && (
            <div className="bg-[#3f6e7a]/10 border border-[#3f6e7a] rounded-[10px] p-4">
              <p className="text-[#3f6e7a] font-montserrat font-bold text-[13px] mb-1">
                Cuenta creada — comparte estas credenciales (se muestran una sola vez):
              </p>
              <p className="text-text font-quicksand text-sm">Usuario: <strong>{credentials.email}</strong></p>
              <p className="text-text font-quicksand text-sm">Contraseña temporal: <strong>{credentials.password}</strong></p>
            </div>
          )}
          {notice && (
            <p className="text-secondary text-xs font-quicksand bg-background rounded-[10px] p-3">{notice}</p>
          )}
          {error && <p className="text-red-600 text-sm font-quicksand">{error}</p>}

          {loading ? (
            <p className="text-secondary font-quicksand text-sm">Cargando...</p>
          ) : users.length === 0 ? (
            <p className="text-text/60 font-quicksand text-sm">
              Esta clínica aún no tiene usuarios con acceso al portal.
            </p>
          ) : (
            <ul className="divide-y divide-divider border border-divider rounded-[10px] overflow-hidden">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-4 py-2.5 bg-white">
                  <span className="text-text font-quicksand text-sm truncate">{u.email}</span>
                  <button
                    onClick={() => handleRemove(u.id)}
                    className="text-red-600 hover:text-red-800 font-quicksand text-[12px] font-semibold"
                  >
                    Quitar acceso
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Socios() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partner | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [usersFor, setUsersFor] = useState<Partner | null>(null);

  function load() {
    api.get("/partners/").then(({ data }) => setPartners(data)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = partners.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: "#cfac8c", padding: "13px 40px" }}
      >
        <h1 className="text-white font-montserrat font-bold text-[20px]">Clínicas Asociadas</h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-white font-montserrat font-bold text-[12px] rounded-[10px] hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "#3f6e7a", padding: "8px 16px", height: 34 }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nueva Clínica
        </button>
      </header>

      {/* Body */}
      <main
        className="flex-1 overflow-y-auto flex flex-col gap-5"
        style={{ backgroundColor: "#fffcf7", padding: "24px 40px 40px" }}
      >
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-alternative" width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar clínica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-divider rounded-[10px] text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white"
          />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-secondary font-quicksand">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center bg-white rounded-[10px] p-10 max-w-sm">
              <svg className="mx-auto text-alternative mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M3 21V8l7-5 7 5v13M3 21h18M7 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-primary font-montserrat font-bold text-[16px] mb-2">
                {search ? "Sin resultados" : "No hay clínicas asociadas aún"}
              </p>
              <p className="text-text font-quicksand text-sm">
                {search
                  ? "Intenta con otro nombre."
                  : "Registra las clínicas que refieren pacientes para darles acceso a sus resultados."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {filtered.map((p) => (
              <div key={p.id} className={`bg-white rounded-[10px] overflow-hidden ${!p.is_active ? "opacity-60" : ""}`}>
                <div className="bg-primary px-4 py-3 flex items-center justify-between">
                  <p className="text-white font-montserrat font-bold text-[15px] truncate">{p.name}</p>
                  {!p.is_active && (
                    <span className="bg-white/20 text-white text-[10px] font-montserrat font-bold rounded-full px-2 py-0.5 flex-shrink-0">
                      Inactiva
                    </span>
                  )}
                </div>
                <div className="px-4 py-4 space-y-2">
                  <p className="text-text font-quicksand text-sm truncate">
                    {p.contact_name || "Sin contacto"} · {p.phone || "—"}
                  </p>
                  <p className="text-text font-quicksand text-sm truncate">{p.email || "—"}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-divider">
                    <span className="bg-secondary text-white font-montserrat font-bold text-[11px] rounded-[10px] px-2 py-0.5">
                      {p.users_count} {p.users_count === 1 ? "acceso" : "accesos"}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setEditing(p)}
                      className="flex-1 border border-primary text-primary text-[12px] font-quicksand font-semibold rounded-[10px] py-2 hover:bg-primary hover:text-white transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setUsersFor(p)}
                      className="flex-1 bg-[#3f6e7a] text-white text-[12px] font-quicksand font-semibold rounded-[10px] py-2 hover:opacity-80 transition-opacity"
                    >
                      Accesos
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {(showNew || editing) && (
        <PartnerModal
          partner={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSaved={load}
        />
      )}
      {usersFor && (
        <UsersModal partner={usersFor} onClose={() => setUsersFor(null)} onChanged={load} />
      )}
    </div>
  );
}
