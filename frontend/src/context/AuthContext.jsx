import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, logout as apiLogout } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await apiLogout(); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const isMD    = user?.is_md_level === true;
  const isManager = user?.role === "manager" || isMD;
  const isEmployee = !!(user);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isMD, isManager, isEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
