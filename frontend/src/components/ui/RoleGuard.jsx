import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** Redirect to /login if not authenticated. */
export function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
