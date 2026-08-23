import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  staffOnly?: boolean;
  partnerOnly?: boolean;
}

export default function ProtectedRoute({ children, staffOnly = false, partnerOnly = false }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to={partnerOnly ? "/portal-socios" : "/login"} replace />;
  if (staffOnly && !user.is_staff) {
    return <Navigate to={user.partner ? "/socios" : "/portal-cliente"} replace />;
  }
  if (partnerOnly && !user.partner) {
    return <Navigate to={user.is_staff ? "/dashboard" : "/portal-cliente"} replace />;
  }

  return <>{children}</>;
}
