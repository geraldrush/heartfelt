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