import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { refreshToken } from '../utils/api.js';
import {
  getIdleTimeout,
  isTokenValid,
  scheduleRefreshTimer,
  shouldRefreshToken,
  storage,
} from '../utils/auth.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshTimer = useRef(null);
  const idleTimer = useRef(null);
  const refreshSessionRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (refreshTimer.current && typeof window !== 'undefined') {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (idleTimer.current && typeof window !== 'undefined') {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearTimers();
    storage.clearToken();
    setToken(null);
    setUser(null);
    setLoading(false);
  }, [clearTimers]);

  const resetIdleTimer = useCallback(
    (activeToken) => {
      if (idleTimer.current && typeof window !== 'undefined') {
        window.clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
      if (!activeToken || typeof window === 'undefined') {
        return;
      }
      idleTimer.current = window.setTimeout(() => {
        logout();
      }, getIdleTimeout());
    },
    [logout]
  );

  const commitSession = useCallback(
    (nextToken, nextUser, options = {}) => {
      if (!nextToken) {
        logout();
        return;
      }

      setToken(nextToken);
      if (nextUser) {
        setUser(nextUser);
      }
      storage.setToken(nextToken);

      if (refreshTimer.current && typeof window !== 'undefined') {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }

      if (typeof window !== 'undefined') {
        refreshTimer.current = scheduleRefreshTimer(nextToken, () => {
          refreshSessionRef.current?.({ background: true });
        });
      }

      if (!options.skipIdle) {
        resetIdleTimer(nextToken);
      }

      if (!options.skipLoading) {
        setLoading(false);
      }
    },
    [logout, resetIdleTimer]
  );

  const refreshSession = useCallback(
    async ({ background = false, skipIdle = false } = {}) => {
      if (!background) {
        setLoading(true);
      }

      try {
        const data = await refreshToken();
        commitSession(data.token, data.user, {
          skipIdle,
          skipLoading: background,
        });
      } catch (error) {
        logout();
        throw error;
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [commitSession, logout]
  );

  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

  const login = useCallback(
    (nextToken, nextUser) => {
      if (!nextToken || !nextUser) {
        return;
      }
      commitSession(nextToken, nextUser);
    },
    [commitSession]
  );

  const initializeSession = useCallback(async () => {
    setLoading(true);
    const storedToken = storage.getToken();
    if (!storedToken || !isTokenValid(storedToken)) {
      logout();
      return;
    }
    commitSession(storedToken, null, { skipIdle: true });

    try {
      await refreshSession();
    } catch {
      // refreshSession already handles logout on failure
    }
  }, [commitSession, logout, refreshSession]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleActivity = () => {
      if (token && shouldRefreshToken(token)) {
        refreshSession({ background: true, skipIdle: true }).catch(() => {});
      }
      if (token) {
        resetIdleTimer(token);
      }
    };
    const events = ['click', 'keydown', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, handleActivity));
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
    };
  }, [resetIdleTimer, refreshSession, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      updateUser: setUser,
      refreshSession,
    }),
    [loading, login, logout, refreshSession, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
