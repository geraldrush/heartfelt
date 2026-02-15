import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { refreshToken, getCurrentUser, logoutSession } from '../utils/api.js';
import {
  getIdleTimeout,
  isTokenExpired,
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
    const activeRefreshToken = storage.getRefreshToken();
    if (activeRefreshToken) {
      logoutSession(activeRefreshToken).catch(() => {});
    }
    clearTimers();
    storage.clearSession();
    setToken(null);
    setUser(null);
    setLoading(false);
    
    // Clear any cached data
    if (typeof window !== 'undefined') {
      // Clear session storage
      try {
        window.sessionStorage.clear();
      } catch {}
      
      // Force page reload to clear all state
      window.location.href = '/';
    }
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
    (nextToken, nextRefreshToken, nextUser, options = {}) => {
      if (!nextToken) {
        logout();
        return;
      }

      setToken(nextToken);
      if (nextUser) {
        setUser(nextUser);
      }
      storage.setToken(nextToken);
      if (nextRefreshToken) {
        storage.setRefreshToken(nextRefreshToken);
      }

      if (refreshTimer.current && typeof window !== 'undefined') {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }

      if (typeof window !== 'undefined') {
        // Disable automatic refresh timer to prevent loops
        // refreshTimer.current = scheduleRefreshTimer(nextToken, () => {
        //   refreshSessionRef.current?.({ background: true });
        // });
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
      // Prevent multiple simultaneous refresh calls
      if (refreshSessionRef.current?.pending) {
        return;
      }
      
      refreshSessionRef.current.pending = true;
      
      if (!background) {
        setLoading(true);
      }

      try {
        const data = await refreshToken();
        const accessToken = data.access_token || data.token;
        commitSession(accessToken, data.refresh_token, data.user, {
          skipIdle,
          skipLoading: background,
        });
      } catch (error) {
        // Don't logout on refresh failures - keep existing session
        console.warn('Token refresh failed:', error.message);
        if (!background) {
          setLoading(false);
        }
      } finally {
        refreshSessionRef.current.pending = false;
      }
    },
    [commitSession]
  );

  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

  const login = useCallback(
    (nextToken, nextRefreshToken, nextUser) => {
      if (!nextToken || !nextUser) {
        return;
      }
      commitSession(nextToken, nextRefreshToken, nextUser);
    },
    [commitSession]
  );

  const initializeSession = useCallback(async () => {
    const storedToken = storage.getToken();
    if (!storedToken) {
      setLoading(false);
      return;
    }

    if (!isTokenValid(storedToken) || isTokenExpired(storedToken)) {
      try {
        const data = await refreshToken();
        const accessToken = data.access_token || data.token;
        commitSession(accessToken, data.refresh_token, data.user, { skipLoading: true });
        return;
      } catch {
        storage.clearSession();
        setLoading(false);
        return;
      }
    }
    
    // Set token and fetch user data
    setToken(storedToken);
    
    try {
      const data = await getCurrentUser();
      setUser(data.user);
    } catch {
      // Keep token but set empty user to prevent logout
      setUser({ id: 'temp' });
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    let lastActivity = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity < 300000) return; // Throttle to max 1 call per 5 minutes
      lastActivity = now;
      
      if (token) {
        resetIdleTimer(token);
      }
    };
    const events = ['click'];
    events.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
    };
  }, [resetIdleTimer, token]);

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
