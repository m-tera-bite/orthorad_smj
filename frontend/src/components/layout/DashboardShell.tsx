import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Pacientes",
    to: "/dashboard/pacientes",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 15c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Reportes",
    to: "/dashboard/reportes",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="3" y="1" width="11" height="15" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 5h5M6 8h5M6 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Socios",
    to: "/dashboard/socios",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path d="M2 15V6l6.5-4L15 6v9M2 15h13M5.5 15v-4h6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Citas de hoy",
    to: "/dashboard/citas",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="1" y="3" width="15" height="13" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 1v4M12 1v4M1 7h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Historial",
    to: "/dashboard/historial",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <circle cx="8.5" cy="8.5" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 4.5v4l2.8 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function DashboardShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-background font-quicksand">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 h-full bg-primary"
        style={{ width: 249, padding: "38px 17px" }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/logo.png`}
          alt="OrthoRad"
          className="brightness-0 invert mb-7"
          style={{ width: 204, height: 86, objectFit: "contain" }}
        />

        <nav className="flex flex-col gap-3 flex-1">
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/dashboard"}
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
          <NavLink
            to="/dashboard/configuracion"
            className="flex items-center gap-3 text-alternative hover:bg-white/10 hover:text-white rounded-[10px] font-semibold text-[13px] transition-colors"
            style={{ padding: "10px 14px" }}
          >
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <circle cx="8.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8.5 1v2M8.5 14v2M1 8.5h2M14 8.5h2M3.4 3.4l1.4 1.4M12.2 12.2l1.4 1.4M3.4 13.6l1.4-1.4M12.2 4.8l1.4-1.4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Configuración
          </NavLink>
          <button
            onClick={() => { logout(); navigate("/"); }}
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
