import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearAuthStorage,
  getStoredAuthData,
  getStoredToken,
  setStoredAuthData,
  setStoredToken,
} from "../services/api";
import { authService } from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const cached = getStoredAuthData();
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => cached?.user || null);
  const [permissions, setPermissions] = useState(() => cached?.permissions || []);
  const [menus, setMenus] = useState(() => cached?.menus || []);
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));
  const [apiInfo, setApiInfo] = useState(null);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("simrs_dark_mode") === "true"
  );

  // Sync dark mode class and theme accent attribute on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("simrs_dark_mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = user?.theme || "default";
    if (theme && theme !== "default") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }, [user?.theme]);

  // Check backend-yii2 health on startup
  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await authService.getHealthStatus();
      setApiInfo({
        online: true,
        name: res?.name || "SIMRS Backend API (Yii2)",
        version: res?.version || "1.0.0",
        environment: res?.environment || "dev",
        timezone: res?.timezone || "Asia/Jakarta",
      });
    } catch {
      setApiInfo({
        online: false,
        name: "SIMRS Backend API (Yii2)",
        version: "-",
        environment: "offline",
      });
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  const applySessionPayload = useCallback((data, newToken) => {
    if (newToken) {
      setStoredToken(newToken);
      setToken(newToken);
    }
    const nextUser = data?.user || null;
    const nextPermissions = data?.permissions || [];
    const nextMenus = data?.menus || [];
    setUser(nextUser);
    setPermissions(nextPermissions);
    setMenus(nextMenus);
    setStoredAuthData({
      user: nextUser,
      permissions: nextPermissions,
      menus: nextMenus,
    });
  }, []);

  const clearSession = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setPermissions([]);
    setMenus([]);
  }, []);

  // Refresh user profile, permissions & menus from GET /api/auth/me
  const refreshMe = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      setLoading(false);
      return null;
    }
    try {
      const res = await authService.getMe();
      if (res?.data) {
        const mergedUser = res.data.role
          ? { ...res.data.user, role: res.data.role }
          : res.data.user;
        applySessionPayload(
          {
            user: mergedUser,
            permissions: res.data.permissions || [],
            menus: res.data.menus || [],
          },
          activeToken
        );
        return res.data;
      }
    } catch (err) {
      if (err?.status === 401) {
        clearSession();
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [applySessionPayload, clearSession]);

  useEffect(() => {
    if (token) {
      refreshMe();
    } else {
      setLoading(false);
    }
  }, [token, refreshMe]);

  // Listen for global 401 unauthorized events (e.g. session_version revoked)
  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
    };
    window.addEventListener("simrs:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("simrs:unauthorized", handleUnauthorized);
  }, [clearSession]);

  const login = useCallback(
    async ({ email, password, rememberMe = true }) => {
      const res = await authService.login({ email, password, rememberMe });
      if (res?.data) {
        applySessionPayload(res.data, res.data.token);
      }
      return res;
    },
    [applySessionPayload]
  );

  const register = useCallback(
    async (payload) => {
      const res = await authService.register(payload);
      if (res?.data) {
        applySessionPayload(res.data, res.data.token);
      }
      return res;
    },
    [applySessionPayload]
  );

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await authService.logout();
      }
    } catch {
      // ignore network/401 error on logout
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateProfile = useCallback(
    async (payload) => {
      const res = await authService.updateProfile(payload);
      if (res?.data) {
        const updatedUser = { ...user, ...res.data };
        setUser(updatedUser);
        setStoredAuthData({
          user: updatedUser,
          permissions,
          menus,
        });
      }
      return res;
    },
    [user, permissions, menus]
  );

  /**
   * Checks whether current user has CRUD permission on a module_code
   * e.g. hasPermission('users-list', 'create')
   */
  const hasPermission = useCallback(
    (moduleCode, action = "read") => {
      if (!user) return false;
      if (!moduleCode) return true;
      const roleName = user?.role?.name || "";
      if (roleName === "superadmin") {
        const entry = permissions.find((p) => p.module_code === moduleCode);
        if (entry && action in entry) {
          return Boolean(entry[action]);
        }
        return true;
      }
      const found = permissions.find((p) => p.module_code === moduleCode);
      if (!found) return false;
      return Boolean(found[action]);
    },
    [user, permissions]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      permissions,
      menus,
      loading,
      isAuthenticated: Boolean(token && user),
      apiInfo,
      darkMode,
      setDarkMode,
      login,
      register,
      logout,
      refreshMe,
      updateProfile,
      hasPermission,
      checkBackendHealth,
    }),
    [
      token,
      user,
      permissions,
      menus,
      loading,
      apiInfo,
      darkMode,
      login,
      register,
      logout,
      refreshMe,
      updateProfile,
      hasPermission,
      checkBackendHealth,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
