import { Fragment } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navLinks = [
  { to: "/servicios", label: "Servicios" },
  { to: "/#por-que-elegirnos", label: "Por qué elegirnos" },
  { to: "/sobre-nosotros", label: "Sobre Nosotros" },
  { to: "/#faq", label: "FAQ" },
];

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-background-alt border-b border-divider">
      {/* Contact bar | Figma: 1440×50, pad=[9,120,9,120], bg=primary */}
      <div
        className="bg-primary text-white font-quicksand"
        style={{ height: "50px" }}
      >
        <div
          className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between"
        >
          {/* Left: location + phone with gap=11 */}
          <div className="flex items-center gap-[11px] text-xs">
            <span className="flex items-center gap-[3px]">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 0C2.24 0 0 2.24 0 5C0 8.75 5 12 5 12C5 12 10 8.75 10 5C10 2.24 7.76 0 5 0ZM5 6.5C4.17 6.5 3.5 5.83 3.5 5C3.5 4.17 4.17 3.5 5 3.5C5.83 3.5 6.5 4.17 6.5 5C6.5 5.83 5.83 6.5 5 6.5Z" fill="currentColor"/>
              </svg>
              San Martín Jilotepeque, a un costado de Pollo Landia de barrio El Calvario.
            </span>
            <span className="flex items-center gap-[3px]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.4 5.2C3.4 7.2 5 8.8 7 9.8L8.6 8.2C8.8 8 9.1 7.95 9.35 8.05C10.1 8.3 10.9 8.45 11.75 8.45C12.15 8.45 12.5 8.8 12.5 9.2V11.75C12.5 12.15 12.15 12.5 11.75 12.5C5.5 12.5 0.5 7.5 0.5 1.25C0.5 0.85 0.85 0.5 1.25 0.5H3.75C4.15 0.5 4.5 0.85 4.5 1.25C4.5 2.1 4.65 2.9 4.9 3.65C4.975 3.9 4.9 4.2 4.725 4.4L3.1 5.85C3.2 5.64 2.4 5.2 2.4 5.2Z" fill="currentColor"/>
              </svg>
              +502 3162 8739
            </span>
          </div>

          {/* Right: 2 buttons, pad=[10,10,10,10] r=5 */}
          <div className="flex items-center gap-3">
            <Link
              to="/portal-cliente"
              className="border border-alternative text-alternative text-xs font-medium px-[10px] py-[5px] rounded-[5px] hover:bg-alternative hover:text-primary transition-colors"
            >
              Resultados Online
            </Link>
            <Link
              to="/agenda"
              className="bg-secondary text-white text-xs font-medium px-[10px] py-[5px] rounded-[5px] hover:bg-alternative hover:text-primary transition-colors"
            >
              Agendar Cita
            </Link>
          </div>
        </div>
      </div>

      {/* Main nav | Figma: 1440×113, pad=[10,120,10,120] */}
      <nav
        className="max-w-[1200px] mx-auto px-6 flex items-center justify-between"
        style={{ height: "113px" }}
      >
        {/* Logo | Figma: 220×93 */}
        <Link to="/" className="flex-shrink-0">
          <img src="/images/logo.png" alt="OrthoRad" style={{ height: "93px", width: "auto" }} />
        </Link>

        {/* Links Container | Figma: 527×49, gap=89 between items, with | separators */}
        <ul className="hidden md:flex items-center font-quicksand font-medium text-sm text-text" style={{ gap: "0" }}>
          {navLinks.map(({ to, label }, i) => (
            <Fragment key={label}>
              <li>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `px-4 py-1 transition-colors ${
                      isActive ? "text-action font-semibold" : "hover:text-secondary"
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
              {i < navLinks.length - 1 && (
                <li aria-hidden className="text-alternative/60 select-none px-1" style={{ fontSize: "12px" }}>|</li>
              )}
            </Fragment>
          ))}
        </ul>

        {/* Right CTA buttons (shared with contact bar buttons at top — desktop shows both) */}
        <div className="hidden md:flex items-center gap-3 font-quicksand text-sm">
          {user ? (
            <>
              <Link to="/portal-cliente" className="text-text hover:text-secondary transition-colors">
                Mi Portal
              </Link>
              <button
                onClick={logout}
                className="bg-primary text-white px-4 py-2 rounded-[5px] hover:bg-secondary transition-colors text-sm font-medium"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                to="/portal-cliente"
                className="border border-primary text-primary px-[10px] py-[10px] rounded-[5px] hover:bg-primary hover:text-white transition-colors text-sm font-medium"
              >
                Resultados Online
              </Link>
              <Link
                to="/agenda"
                className="bg-secondary text-white px-[10px] py-[10px] rounded-[5px] hover:bg-primary transition-colors text-sm font-medium"
              >
                Agendar Cita
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
