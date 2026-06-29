import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  staffOnly?: boolean;
}

export default function ProtectedRoute({ children, staffOnly = false }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (staffOnly && !user.is_staff) return <Navigate to="/portal-cliente" replace />;

  return <>{children}</>;
}
