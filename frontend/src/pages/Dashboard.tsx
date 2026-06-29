import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

interface Appointment {
  id: number;
  patient_name: string;
  service_name: string;
  scheduled_at: string;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-secondary/10 text-secondary",
  confirmed: "bg-action/10 text-action",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-divider text-text",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "En Curso",
  cancelled: "Cancelado",
  completed: "Completada",
};

const stats = [
  { label: "Citas de hoy", value: "8", sub: "5 pendientes" },
  { label: "Pacientes Nuevos", value: "1", sub: "este mes" },
  { label: "Reportes Emitidos", value: "2", sub: "6 pendientes" },
  { label: "Reportes Subidos", value: "1", sub: "7 pendientes" },
];

const sideNavItems = [
  { label: "Dashboard", icon: "⊞", to: "/dashboard" },
  { label: "Pacientes", icon: "👤", to: "/dashboard/pacientes" },
  { label: "Reportes", icon: "📄", to: "/dashboard/reportes" },
  { label: "Citas de hoy", icon: "📅", to: "/dashboard/citas" },
];

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/appointments/").then(({ data }) => setAppointments(data)).finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background font-quicksand">
      {/* Sidebar */}
      <aside className="w-56 bg-primary flex flex-col flex-shrink-0 h-full">
        <div className="px-5 py-6 border-b border-secondary/30">
          <img src="/images/logo.png" alt="OrthoRad" className="h-10 w-auto brightness-0 invert" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sideNavItems.map(({ label, icon, to }) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-white"
                    : "text-alternative hover:bg-secondary/20 hover:text-white"
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-secondary/30 space-y-1">
          <Link
            to="#"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-alternative hover:bg-secondary/20 hover:text-white transition-colors"
          >
            <span>⚙</span> Configuración
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-alternative hover:bg-secondary/20 hover:text-white transition-colors"
          >
            <span>→</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="bg-alternative/30 px-8 py-4 flex items-center justify-between border-b border-divider sticky top-0 z-10">
          <h1 className="font-montserrat font-bold text-primary text-lg">Dashboard</h1>
          <div className="flex gap-3">
            <button className="border border-primary text-primary px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary hover:text-white transition-colors flex items-center gap-1.5">
              ↑ Subir Resultados
            </button>
            <button className="bg-action text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-action-dark transition-colors flex items-center gap-1.5">
              + Nueva Cita
            </button>
          </div>
        </header>

        <div className="px-8 py-6">
          {/* Greeting */}
          <div className="mb-6">
            <h2 className="font-montserrat font-bold text-primary text-2xl">Buenos días, Joselyn</h2>
            <p className="text-text text-sm capitalize">{today}</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {stats.map(({ label, value, sub }) => (
              <div key={label} className="bg-primary rounded-xl px-5 py-4 text-white">
                <p className="text-xs text-alternative font-medium mb-2">{label}</p>
                <p className="font-montserrat font-bold text-3xl">{value}</p>
                <p className="text-alternative text-xs mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Status banners */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-action text-white rounded-xl px-4 py-3 text-xs font-medium">
              En progreso: Tomografía Dental 3D · Maria García · Sala 1 · 10:15 a.m.
            </div>
            <div className="bg-background-alt border border-divider rounded-xl px-4 py-3 text-xs text-text">
              Siguiente: Cefalometría · José Sanchéz · Sala 2 · 10:30 a.m.
            </div>
          </div>

          {/* Appointments table */}
          <div className="bg-white rounded-2xl border border-divider overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-divider">
              <h3 className="font-montserrat font-bold text-primary text-base">Citas de hoy</h3>
              <button className="text-secondary text-xs hover:text-primary transition-colors">Ver todas ↗</button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-text text-sm">Cargando...</div>
            ) : appointments.length === 0 ? (
              <div className="p-10 text-center text-text text-sm">No hay citas registradas.</div>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-divider">
                  {appointments.map((appt) => {
                    const time = new Date(appt.scheduled_at).toLocaleTimeString("es-MX", {
                      hour: "2-digit", minute: "2-digit",
                    });
                    return (
                      <tr key={appt.id} className="hover:bg-background transition-colors">
                        <td className="px-6 py-3 text-primary font-montserrat font-semibold text-sm w-16">{time}</td>
                        <td className="px-2 py-3">
                          <p className="font-medium text-primary text-sm">{appt.patient_name}</p>
                          <p className="text-text text-xs">{appt.service_name} · Sala 1</p>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${STATUS_STYLES[appt.status]}`}>
                            {STATUS_LABELS[appt.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
