import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** Redirect to /login if not authenticated. */
export function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Redirect to correct dashboard based on role. */
export function RoleRedirect() {
  const { user, isMD, isManager } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isMD) return <Navigate to="/md" replace />;
  if (isManager) return <Navigate to="/manager" replace />;
  return <Navigate to="/employee" replace />;
}

/** Only render children if user has required role; otherwise redirect to root. */
export function RequireRole({ roles, children }) {
  const { user, isMD } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const effective = isMD ? [...(user.role ? [user.role] : []), "md"] : [user.role];
  const allowed = roles.some((r) => effective.includes(r));
  return allowed ? children : <Navigate to="/" replace />;
}
