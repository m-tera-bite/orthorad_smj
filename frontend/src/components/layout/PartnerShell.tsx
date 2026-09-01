import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../partners/NotificationBell";

const NAV_ITEMS = [
  {
    label: "Pacientes",
    to: "/socios",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 15c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Resultados",
    to: "/socios/resultados",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="3" y="1" width="11" height="15" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 5h5M6 8h5M6 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function PartnerShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-background font-quicksand">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 h-full bg-primary"
        style={{ width: 249, padding: "38px 17px" }}
      >
        <div className="flex items-start justify-between mb-4">
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="OrthoRad"
            className="brightness-0 invert"
            style={{ width: 204, height: 86, objectFit: "contain" }}
          />
          <NotificationBell />
        </div>

        <div className="mb-6 px-2">
          <p className="text-alternative text-[10px] font-montserrat font-bold uppercase tracking-widest mb-1">
            Clínica asociada
          </p>
          <p className="text-white font-montserrat font-bold text-[14px] leading-tight">
            {user?.partner?.name}
          </p>
        </div>

        <nav className="flex flex-col gap-3 flex-1">
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/socios"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[10px] font-semibold text-[13px] leading-5 transition-colors ${
                  isActive
                    ? "bg-white text-primary"
                    : "text-alternative hover:bg-white/10 hover:text-white"
                }`
              }
              style={{ padding: "10px 14px" }}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-3 mt-6">
          <div className="border-t border-alternative/30" />
          <p className="text-alternative/70 text-[11px] px-2 leading-snug">
            Acceso de solo lectura a los resultados de tus pacientes referidos.
          </p>
          <button
            onClick={() => { logout(); navigate("/portal-socios"); }}
            className="flex items-center gap-3 text-alternative hover:bg-white/10 hover:text-white rounded-[10px] font-semibold text-[13px] transition-colors w-full text-left"
            style={{ padding: "10px 14px" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Page content rendered by nested route */}
      <Outlet />
    </div>
  );
}
