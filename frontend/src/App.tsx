import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DashboardShell from "./components/layout/DashboardShell";

import Home from "./pages/Home";
import SobreNosotros from "./pages/SobreNosotros";
import Servicios from "./pages/Servicios";
import Agenda from "./pages/Agenda";
import PortalCliente from "./pages/PortalCliente";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/dashboard/Pacientes";
import Reportes from "./pages/dashboard/Reportes";
import Citas from "./pages/dashboard/Citas";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public site — with Navbar + Footer */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sobre-nosotros" element={<SobreNosotros />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/login" element={<Login />} />
          <Route path="/portal-cliente" element={<PortalCliente />} />
        </Route>

        {/* Staff dashboard — full-screen, nested routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute staffOnly>
              <DashboardShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pacientes" element={<Pacientes />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="citas" element={<Citas />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
