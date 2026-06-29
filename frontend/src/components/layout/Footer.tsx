import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-background font-quicksand">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Logo */}
        <div>
          <img src="/images/logo.png" alt="OrthoRad" className="h-14 w-auto mb-4" />
        </div>

        {/* Servicios */}
        <div>
          <h4 className="font-semibold text-primary mb-4 text-sm">Servicios</h4>
          <ul className="space-y-2 text-sm text-secondary">
            {["Tomografía Dental 3D", "Cefalometría Digital", "Radiografíia Panorámica"].map((s) => (
              <li key={s}>
                <Link to="/servicios" className="hover:text-primary transition-colors">{s}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Empresa */}
        <div>
          <h4 className="font-semibold text-primary mb-4 text-sm">Empresa</h4>
          <ul className="space-y-2 text-sm text-secondary">
            <li><Link to="/sobre-nosotros" className="hover:text-primary transition-colors">Sobre Nosotros</Link></li>
            <li><Link to="/agenda" className="hover:text-primary transition-colors">Agendar Cita</Link></li>
            <li><Link to="/portal-cliente" className="hover:text-primary transition-colors">Portal Clientes</Link></li>
          </ul>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="font-semibold text-primary mb-4 text-sm">Contacto</h4>
          <ul className="space-y-3 text-sm text-secondary">
            <li className="flex gap-2 leading-snug">
              <span>📍</span>
              <span>San Martín Jilotepeque, a un costado de Pollo Landia de barrio El Calvario.</span>
            </li>
            <li className="flex gap-2">
              <span>📞</span>
              <span>+502 3162 8739</span>
            </li>
            <li className="flex gap-2">
              <span>✉</span>
              <span>contacto@orthorad.com</span>
            </li>
          </ul>
          {/* Social icons */}
          <div className="flex gap-3 mt-5">
            {[
              { label: "f", href: "#" },
              { label: "ig", href: "#" },
              { label: "tt", href: "#" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="w-9 h-9 rounded-full bg-secondary/20 hover:bg-secondary flex items-center justify-center text-secondary hover:text-white transition-colors text-xs font-bold"
              >
                {label === "f" ? "f" : label === "ig" ? "in" : "tt"}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-divider py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-text">
          <span>© 2026 OrthoRad. Todos los derechos reservados</span>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-primary transition-colors">Aviso de privacidad</Link>
            <Link to="#" className="hover:text-primary transition-colors">Términos y condiciones</Link>
            <Link to="#" className="hover:text-primary transition-colors">Política de cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
