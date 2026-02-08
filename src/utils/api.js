const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://heartfelt-api.gerryrushway.workers.dev' : 'http://localhost:8787');

// Simple cache for GET requests
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

async function request(method, path, data) {
  // Check cache for GET requests
  if (method === 'GET' && !data) {
    const cacheKey = `${method}:${path}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // SSRF protection - validate URL and path
  if (!path.startsWith('/api/')) {
    throw new Error('Invalid API path');
  }
  
  // Prevent path traversal and ensure path is safe
  if (path.includes('..') || path.includes('//') || !path.match(/^\/api\/[a-zA-Z0-9\/_-]+$/)) {
    throw new Error('Invalid API path format');
  }
  
  const fullUrl = `${API_URL}${path}`;
  try {
    const url = new URL(fullUrl);
    const apiUrl = new URL(API_URL);
    // Only allow requests to the configured API domain and protocol
    if (url.origin !== apiUrl.origin || url.protocol !== apiUrl.protocol) {
      throw new Error('Invalid request destination');
    }
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    redirect: 'manual',
    referrerPolicy: 'no-referrer',
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
    error.code = payload?.code;
    throw error;
  }

  // Cache successful GET requests
  if (method === 'GET' && !data) {
    const cacheKey = `${method}:${path}`;
    cache.set(cacheKey, { data: payload, timestamp: Date.now() });
    
    // Clean old cache entries
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
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
export const refreshToken = async () => {
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      const result = await apiClient.post('/api/auth/refresh');
      console.log('[API] Token refresh successful');
      return result;
    } catch (error) {
      console.log(`[API] Token refresh attempt ${retryCount + 1} failed:`, error.message);
      
      if (error.code === 'TOKEN_EXPIRED') {
        console.log('[API] Token expired, clearing localStorage and redirecting to login');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw error;
      }
      
      if (retryCount < maxRetries && (error.status >= 500 || error.message.includes('network'))) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[API] Retrying token refresh in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }
      
      throw error;
    }
  }
};
export const getCurrentUser = () => apiClient.get('/api/auth/me');
export const deleteAccount = () => apiClient.delete('/api/auth/account');

export const uploadStoryImage = (formData) => {
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  return fetch(`${API_URL}/api/stories/upload-image`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'same-origin',
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
export const updateOnboardingBasics = (data) => apiClient.put('/api/stories/onboarding-basics', data);
export const updateProfilePartial = (data) => apiClient.put('/api/stories/update-profile-partial', data);
export const getReferenceData = () => apiClient.get('/api/stories/reference/data');
export const processImage = (data) => apiClient.post('/api/images/process', data);
export const getStoryImages = (storyId) => apiClient.get(`/api/stories/${storyId}/images`);
export const getMyStory = () => apiClient.get('/api/stories/me');
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

export const getUserPreferences = async () => {
  return apiClient.get('/api/stories/preferences');
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
export const getConnectionProfile = (connectionId) =>
  apiClient.get(`/api/connections/profile/${connectionId}`);
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
export const getTokenPackages = () => apiClient.get('/api/payments/packages');
export const initiatePayment = (data) => apiClient.post('/api/payments/initiate', data);
export const getPaymentStatus = (paymentId) =>
  apiClient.get(`/api/payments/status/${paymentId}`);
