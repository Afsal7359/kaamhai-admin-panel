import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TOKEN_KEY, PROFILE_KEY } from "../api/client";
import { adminLogin, getAccessMe } from "../api/endpoints";

const ACCESS_KEY = "kh_admin_access";

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
  // { role: 'superadmin' | 'admin', permissions: [{resource, actions[]}] }
  const [access, setAccess] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ACCESS_KEY) || "null");
    } catch {
      return null;
    }
  });

  const refreshAccess = useCallback(async () => {
    try {
      const res = await getAccessMe();
      const a = res.data?.data || null;
      if (a) {
        localStorage.setItem(ACCESS_KEY, JSON.stringify(a));
        setAccess(a);
      }
      return a;
    } catch {
      return null;
    }
  }, []);

  // Keep permissions fresh — a superadmin may have changed them since login.
  useEffect(() => {
    if (token) refreshAccess();
  }, [token, refreshAccess]);

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
    localStorage.removeItem(ACCESS_KEY);
    setToken(null);
    setAdmin(null);
    setAccess(null);
  };

  const value = useMemo(() => {
    const isSuper = !access || access.role === "superadmin";
    const can = (resource, action = "view") => {
      if (isSuper) return true;
      const entry = (access.permissions || []).find((p) => p.resource === resource);
      return Boolean(entry && entry.actions?.includes(action));
    };
    return {
      token,
      admin,
      access,
      isSuperAdmin: isSuper,
      can,
      isAuthenticated: Boolean(token),
      login,
      logout,
      refreshAccess,
    };
  }, [token, admin, access, refreshAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
