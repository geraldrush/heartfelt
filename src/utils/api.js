const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function request(method, path, data) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload?.error || payload?.message || response.statusText || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.details = payload?.details;
    throw error;
  }

  return payload;
}

export const apiClient = {
  get: (path) => request('GET', path),
  post: (path, data) => request('POST', path, data),
  put: (path, data) => request('PUT', path, data),
  delete: (path, data) => request('DELETE', path, data),
};

export const emailSignup = (data) => apiClient.post('/api/auth/email-signup', data);
export const emailLogin = (data) => apiClient.post('/api/auth/email-login', data);
export const googleAuth = (credential) =>
  apiClient.post('/api/auth/google', { credential });
export const refreshToken = () => apiClient.post('/api/auth/refresh');
export const getCurrentUser = () => apiClient.get('/api/auth/me');
