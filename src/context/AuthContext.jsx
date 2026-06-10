import { createContext, useContext, useMemo, useState } from "react";
import { TOKEN_KEY, PROFILE_KEY } from "../api/client";
import { adminLogin } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    } catch {
      return null;
    }
  });

  const login = async (phoneNumber, password) => {
    const res = await adminLogin(phoneNumber, password);
    const newToken = res.data?.token;
    const profile = res.data?.data?.admin || null;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setToken(newToken);
    setAdmin(profile);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setToken(null);
    setAdmin(null);
  };

  const value = useMemo(
    () => ({ token, admin, isAuthenticated: Boolean(token), login, logout }),
    [token, admin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
