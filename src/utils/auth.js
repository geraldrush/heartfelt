const TOKEN_STORAGE_KEY = 'token';
const REFRESH_MARGIN_MS = 2 * 60 * 1000; // refresh 2 minutes before expiry
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minute idle logout

const decodeBase64 = (value) => {
  if (typeof atob === 'function') {
    return atob(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('binary');
  }
  return '';
};

const normalizeTokenPayload = (raw) => {
  try {
    // Validate input size to prevent DoS
    if (raw.length > 2048) {
      return null;
    }
    
    // Add padding for URL-safe base64 variations
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = decodeBase64(padded);
    
    // Validate decoded size
    if (decoded.length > 1024) {
      return null;
    }
    
    const payload = JSON.parse(decoded);
    
    // Validate payload structure for JWT
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    
    // Validate required JWT fields
    if (payload.exp && typeof payload.exp !== 'number') {
      return null;
    }
    
    if (payload.sub && typeof payload.sub !== 'string') {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
};

export const decodeToken = (token) => {
  if (!token) {
    return null;
  }
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }
  return normalizeTokenPayload(segments[1]);
};

export const getTokenExpiryMs = (token) => {
  const payload = decodeToken(token);
  if (!payload || typeof payload.exp !== 'number') {
    return null;
  }
  return payload.exp * 1000;
};

export const isTokenValid = (token) => {
  const expiresAt = getTokenExpiryMs(token);
  if (!expiresAt) {
    return false;
  }
  return Date.now() < expiresAt;
};

export const shouldRefreshToken = (token) => {
  const expiresAt = getTokenExpiryMs(token);
  if (!expiresAt) {
    return false;
  }
  return expiresAt - Date.now() <= REFRESH_MARGIN_MS;
};

export const scheduleRefreshTimer = (token, callback) => {
  if (!token || typeof callback !== 'function') {
    return null;
  }
  const expiresAt = getTokenExpiryMs(token);
  if (!expiresAt) {
    return null;
  }
  const delay = Math.max(expiresAt - Date.now() - REFRESH_MARGIN_MS, 1_000);
  if (delay <= 0) {
    callback();
    return null;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  return window.setTimeout(callback, delay);
};

export const getIdleTimeout = () => IDLE_TIMEOUT_MS;

export const storage = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    try {
      if (token) {
        // XSS protection - validate token format
        if (typeof token !== 'string' || token.length > 4096) {
          return;
        }
        // Ensure token only contains safe characters (base64url + dots)
        if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
          return;
        }
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  },
  clearToken: () => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  },
};
