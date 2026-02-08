export function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    return null;
  }
}

export function isTokenExpiringSoon(token, thresholdMinutes = 5) {
  try {
    const expiry = getTokenExpiry(token);
    if (!expiry) return false;
    const now = Date.now();
    const threshold = thresholdMinutes * 60 * 1000;
    return expiry - now < threshold;
  } catch (error) {
    return false;
  }
}

export function isTokenExpired(token) {
  try {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    return Date.now() >= expiry;
  } catch (error) {
    return true;
  }
}

export function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    JSON.parse(atob(parts[1]));
    return !isTokenExpired(token);
  } catch (error) {
    return false;
  }
}

export function getIdleTimeout() {
  return 30 * 60 * 1000; // 30 minutes
}

export function shouldRefreshToken(token) {
  return isTokenExpiringSoon(token, 5);
}

export function scheduleRefreshTimer(token, callback) {
  // Validate token format
  if (!token || typeof token !== 'string' || !token.match(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
    return null;
  }
  
  const expiry = getTokenExpiry(token);
  if (!expiry) return null;
  
  // Validate callback is a function
  if (typeof callback !== 'function') return null;
  
  const refreshTime = expiry - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry
  if (refreshTime <= 0) return null;
  
  return setTimeout(callback, refreshTime);
}

export const storage = {
  getToken: () => {
    try {
      return localStorage.getItem('auth_token');
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    try {
      // Validate token format before storing
      if (!token || typeof token !== 'string' || !token.match(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
        throw new Error('Invalid token format');
      }
      localStorage.setItem('auth_token', token);
    } catch {}
  },
  clearToken: () => {
    try {
      localStorage.removeItem('auth_token');
    } catch {}
  }
};