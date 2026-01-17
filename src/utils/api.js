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

export const uploadStoryImage = (formData) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_URL}/api/stories/upload-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }).then(async (res) => {
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = payload?.error || payload?.message || 'Image upload failed.';
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return payload;
  });
};

export const createStory = (data) => apiClient.post('/api/stories/create-story', data);
export const updateProfile = (data) => apiClient.put('/api/stories/update-profile', data);
export const getReferenceData = () => apiClient.get('/api/stories/reference/data');
export const processImage = (data) => apiClient.post('/api/images/process', data);
export const getStoryImages = (storyId) => apiClient.get(`/api/stories/${storyId}/images`);
export const getTokenBalance = () => apiClient.get('/api/tokens/balance');
export const transferTokens = (data) => apiClient.post('/api/tokens/transfer', data);
export const getTokenHistory = ({ limit = 50, offset = 0 } = {}) =>
  apiClient.get(`/api/tokens/history?limit=${limit}&offset=${offset}`);
export const createTokenRequest = (data) => apiClient.post('/api/chat/token-requests', data);
export const getTokenRequests = () => apiClient.get('/api/chat/token-requests');
export const fulfillTokenRequest = (id) =>
  apiClient.post(`/api/chat/token-requests/${id}/fulfill`);
export const getStoryFeed = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, value);
    }
  });
  const query = params.toString();
  return apiClient.get(`/api/stories/feed${query ? `?${query}` : ''}`);
};
export const sendConnectionRequest = (data) =>
  apiClient.post('/api/connections/request', data);
export const acceptConnectionRequest = (requestId) =>
  apiClient.post('/api/connections/accept', { request_id: requestId });
export const rejectConnectionRequest = (requestId) =>
  apiClient.post('/api/connections/reject', { request_id: requestId });
export const cancelConnectionRequest = (requestId) =>
  apiClient.post('/api/connections/cancel', { request_id: requestId });
export const getSentRequests = () => apiClient.get('/api/connections/sent');
export const getReceivedRequests = () => apiClient.get('/api/connections/received');
export const getConnections = () => apiClient.get('/api/connections/list');
export const getConnectionCounts = () => apiClient.get('/api/connections/counts');
export const getMessages = (connectionId, { limit = 50, offset = 0, before } = {}) => {
  const params = new URLSearchParams({ limit, offset });
  if (before) {
    params.append('before', before);
  }
  return apiClient.get(`/api/chat/messages/${connectionId}?${params.toString()}`);
};
export const getUnreadCounts = () => apiClient.get('/api/chat/unread-counts');
export const markMessagesAsDelivered = (messageIds) =>
  apiClient.post('/api/chat/messages/mark-delivered', { message_ids: messageIds });
