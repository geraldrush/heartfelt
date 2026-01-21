const defaultOrigins = [
  'http://localhost:5173',
  'https://heartfelt.pages.dev',
  'https://heartfelt-2ti.pages.dev'
];

export function getAllowedOrigins(env) {
  if (env?.CORS_ORIGIN) {
    return env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }
  return defaultOrigins;
}

export function isOriginAllowed(origin, env) {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins(env);
  return allowedOrigins.includes(origin);
}

export function isRefererAllowed(referer, env) {
  if (!referer) return false;
  try {
    const refererUrl = new URL(referer);
    const origin = `${refererUrl.protocol}//${refererUrl.host}`;
    return isOriginAllowed(origin, env);
  } catch (error) {
    console.log(`[CORS] Invalid referer URL: ${referer}`);
    return false;
  }
}