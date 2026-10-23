import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(null); // null = unknown

  useEffect(() => {
    api.session().then((s) => setLoggedIn(s.logged_in)).catch(() => setLoggedIn(false));
  }, []);

  const login = async (username, password) => {
    await api.login(username, password);
    setLoggedIn(true);
  };
  const logout = async () => {
    await api.logout();
    setLoggedIn(false);
  };

  return <AuthContext.Provider value={{ loggedIn, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireLogin({ children }) {
  const { loggedIn } = useAuth();
  const location = useLocation();
  if (loggedIn === null) return null;
  if (!loggedIn) {
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}
