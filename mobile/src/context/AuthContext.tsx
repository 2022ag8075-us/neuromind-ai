import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";

import { getToken, setToken, clearToken } from "../services/api";

/**
 * ===============================
 * 🔐 TYPES
 * ===============================
 */
export interface AuthContextType {
  isAuth: boolean;
  loading: boolean;
  token: string | null;

  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;

  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * ===============================
 * 🧠 CONTEXT
 * ===============================
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * ===============================
 * 🧩 PROVIDER
 * ===============================
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);

  const isMounted = useRef(true);

  /**
   * ===============================
   * 🔄 REFRESH AUTH STATE
   * ===============================
   */
  const refreshAuth = useCallback(async () => {
    try {
      const storedToken = await getToken();

      if (!isMounted.current) return;

      if (storedToken) {
        setTokenState(storedToken);
        setIsAuth(true);
      } else {
        setTokenState(null);
        setIsAuth(false);
      }
    } catch (error) {
      console.log("❌ Auth refresh error:", error);

      if (isMounted.current) {
        setTokenState(null);
        setIsAuth(false);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * ===============================
   * 🔐 LOGIN
   * ===============================
   */
  const login = useCallback(async (newToken: string) => {
    try {
      await setToken(newToken);

      if (!isMounted.current) return;

      setTokenState(newToken);
      setIsAuth(true);
    } catch (error) {
      console.log("❌ Login error:", error);
    }
  }, []);

  /**
   * ===============================
   * 🚪 LOGOUT
   * ===============================
   */
  const logout = useCallback(async () => {
    try {
      await clearToken();

      if (!isMounted.current) return;

      setTokenState(null);
      setIsAuth(false);
    } catch (error) {
      console.log("❌ Logout error:", error);
    }
  }, []);

  /**
   * ===============================
   * 🚀 INIT APP
   * ===============================
   */
  useEffect(() => {
    isMounted.current = true;
    refreshAuth();

    return () => {
      isMounted.current = false;
    };
  }, [refreshAuth]);

  /**
   * ===============================
   * ⚡ MEMO VALUE
   * ===============================
   */
  const value = useMemo(
    () => ({
      isAuth,
      loading,
      token,
      login,
      logout,
      refreshAuth,
      setIsAuth,
    }),
    [isAuth, loading, token, login, logout, refreshAuth]
  );

  /**
   * ===============================
   * 🧱 FAILSAFE (NEVER RETURN UNDEFINED)
   * ===============================
   */
  if (!value) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * ===============================
 * 🪝 HOOK (SAFE)
 * ===============================
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};