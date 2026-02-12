import { useCallback, useEffect, useRef, useState } from 'react';
import { isTokenExpiringSoon, isTokenExpired } from '../utils/auth.js';
import { refreshToken, getMessages } from '../utils/api.js';

const buildWebSocketUrl = (connectionId, token) => {
  // Validate connectionId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(connectionId)) {
    console.log('[WS-Client] URL validation: connectionId invalid');
    return null;
  }
  
  // Validate token presence
  if (!token || token.trim() === '') {
    console.log('[WS-Client] URL validation: token missing');
    return null;
  }
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://heartfelt-api.gerryrushway.workers.dev' : 'http://localhost:8787');
    const url = new URL(apiUrl);
    
    // Validate protocol
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      console.log('[WS-Client] URL validation: invalid protocol');
      return null;
    }
    
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    console.log('[WS-Client] URL validation: all checks passed');
    // Always use latest token from localStorage
    const latestToken = localStorage.getItem('auth_token') || token;
    return `${protocol}//${url.host}/api/chat/connect/${connectionId}?token=${latestToken}`;
  } catch (error) {
    console.log('[WS-Client] URL validation: API URL invalid', error.message);
    return null;
  }
};

// Connection diagnostics helper
const logConnectionDiagnostics = (connectionId, token) => {
  const timestamp = new Date().toISOString();
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://heartfelt-api.gerryrushway.workers.dev' : 'http://localhost:8787');
  const maskedToken = token ? (token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****') : 'none';
  const wsUrl = buildWebSocketUrl(connectionId, token || 'dummy');
  const maskedUrl = wsUrl.replace(/token=[^&]+/, `token=${maskedToken}`);
  
  console.log(`[WS-Client] ${timestamp} === CONNECTION DIAGNOSTICS ===`);
  console.log(`[WS-Client] ${timestamp} Connection ID: ${connectionId}`);
  console.log(`[WS-Client] ${timestamp} Token present: ${!!token}`);
  console.log(`[WS-Client] ${timestamp} API URL: ${apiUrl}`);
  console.log(`[WS-Client] ${timestamp} WebSocket URL: ${maskedUrl}`);
  console.log(`[WS-Client] ${timestamp} Browser WebSocket support: ${typeof WebSocket !== 'undefined'}`);
  console.log(`[WS-Client] ${timestamp} Network online: ${navigator.onLine}`);
  console.log(`[WS-Client] ${timestamp} User agent: ${navigator.userAgent}`);
  console.log(`[WS-Client] ${timestamp} === END DIAGNOSTICS ===`);
};

export const useWebSocket = ({
  connectionId,
  onMessage,
  onTyping,
  onPresence,
  onDelivered,
  onRead,
  onConnectionError,
  onNotification,
  onCallStatus,
}) => {
  // Mobile detection at hook level
  const userAgent = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
  
  const socketRef = useRef(null);
  const retryRef = useRef(0);
  const reconnectTimer = useRef(null);
  const heartbeatInterval = useRef(null);
  const lastPongTime = useRef(Date.now());
  const lastActivityTime = useRef(Date.now());
  const visibilityChangeHandler = useRef(null);
  const connectionAttempts = useRef(0);
  const connectionStartTime = useRef(null);
  const networkListeners = useRef({ online: null, offline: null });
  const isManualCloseRef = useRef(false);
  const lastConnectionAttempt = useRef(0);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isPolling, setIsPolling] = useState(false);
  const pollingInterval = useRef(null);
  const lastMessageTimestamp = useRef(null);
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const latencyHistory = useRef([]);
  const messageSentTimes = useRef(new Map());
  const silentReconnectRef = useRef(false);

  const IDLE_THRESHOLD = 120000; // 2 minutes

  // Connection states:
  // - 'disconnected': Initial state or manually disconnected
  // - 'connecting': Attempting to establish connection
  // - 'connected': Active WebSocket connection
  // - 'error': Connection failed with user-facing error
  // - 'polling': Fallback to HTTP polling
  // - 'idle_disconnected': Background disconnect due to inactivity (silent)

  const errorClassifier = useCallback((closeCode) => {
    if (closeCode >= 4001 && closeCode <= 4003) {
      return { type: 'auth', message: 'Authentication failed. Please log in again.', userAction: 'login' };
    }
    if (closeCode >= 4010 && closeCode <= 4020) {
      return { type: 'permission', message: "You don't have permission to access this chat.", userAction: 'goBack' };
    }
    if (closeCode === 1006) {
      return { type: 'network', message: 'Network connection lost. Retrying...', userAction: 'retry' };
    }
    if ([1011, 1012, 1013].includes(closeCode)) {
      return { type: 'server', message: 'Server error. Please try again later.', userAction: 'retry' };
    }
    if ([1000, 1001].includes(closeCode)) {
      return { type: 'normal', message: 'Connection closed.', userAction: 'none' };
    }
    return { type: 'unknown', message: 'Connection error occurred.', userAction: 'retry' };
  }, []);

  const startPolling = useCallback(async () => {
    if (pollingInterval.current || !connectionId) return;
    
    console.log('[WS-Client] Starting polling fallback due to WebSocket failures');
    setIsPolling(true);
    setConnectionState('polling');
    
    let pollCount = 0;
    const poll = async () => {
      try {
        const messages = await getMessages(connectionId, { 
          limit: 50, 
          before: lastMessageTimestamp.current 
        });
        
        if (messages.messages && messages.messages.length > 0) {
          messages.messages.forEach(msg => {
            onMessage?.(msg);
            lastMessageTimestamp.current = msg.created_at;
          });
        }
        
        pollCount++;
        // After 5 successful polls, reduce frequency to save battery
        if (pollCount === 5) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = setInterval(poll, 4000);
        }
      } catch (error) {
        console.error('[WS-Client] Polling error:', error);
        // If polling fails, try WebSocket again
        if (error.status === 401) {
          stopPolling();
          onConnectionError?.({ type: 'auth', message: 'Session expired. Please log in again.', userAction: 'login', code: 0 });
        }
      }
    };
    
    // Start with frequent polling for mobile (1.5s), less frequent for desktop
    const initialInterval = isMobile ? 1500 : 2500;
    
    pollingInterval.current = setInterval(poll, initialInterval);
  }, [connectionId, onMessage, onConnectionError]);
  
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    setIsPolling(false);
    console.log('[WS-Client] Stopped polling fallback');
  }, []);
  
  const updateConnectionQuality = useCallback((latency) => {
    latencyHistory.current.push(latency);
    if (latencyHistory.current.length > 10) {
      latencyHistory.current.shift();
    }
    
    const avgLatency = latencyHistory.current.reduce((a, b) => a + b, 0) / latencyHistory.current.length;
    
    if (avgLatency < 100) {
      setConnectionQuality('excellent');
    } else if (avgLatency < 300) {
      setConnectionQuality('good');
    } else {
      setConnectionQuality('poor');
    }
  }, []);

  const sendPayload = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback(async (silentReconnect = false) => {
    // Store silent reconnect flag for error handlers
    silentReconnectRef.current = silentReconnect;
    // Prevent multiple simultaneous connection attempts
    if (connectionState === 'connecting') {
      console.log(`[WS-Client] ${new Date().toISOString()} Connection already in progress, skipping`);
      return;
    }
    
    // Debounce connection attempts (minimum 1 second between attempts)
    const now = Date.now();
    if (now - lastConnectionAttempt.current < 1000) {
      console.log(`[WS-Client] ${new Date().toISOString()} Connection attempt too soon, debouncing`);
      return;
    }
    lastConnectionAttempt.current = now;
    
    if (!connectionId) {
      console.log(`[WS-Client] ${new Date().toISOString()} Connection attempt failed: no connectionId provided`);
      setConnectionState('error');
      if (!silentReconnectRef.current) {
        onConnectionError?.({ type: 'validation', message: 'No connection ID provided', userAction: 'goBack', code: 0 });
      }
      return;
    }
    
    let token = localStorage.getItem('auth_token');
    if (!token) {
      console.log(`[WS-Client] ${new Date().toISOString()} Connection attempt failed: no token in localStorage`);
      setConnectionState('error');
      if (!silentReconnectRef.current) {
        onConnectionError?.({ type: 'auth', message: 'Authentication required. Please log in again.', userAction: 'login', code: 0 });
      }
      return;
    }

    // Check if token is expired or expiring soon
    if (isTokenExpired(token)) {
      console.log('[WS-Client] Token expired, attempting refresh');
      try {
        const refreshResult = await refreshToken();
        token = refreshResult.token;
        localStorage.setItem('auth_token', token);
        console.log('[WS-Client] Token refresh before WebSocket: success');
      } catch (error) {
        console.log('[WS-Client] Token refresh before WebSocket: failed', error.message);
        setConnectionState('error');
        if (!silentReconnectRef.current) {
          onConnectionError?.({ type: 'auth', message: 'Session expired. Please log in again.', userAction: 'login', code: 0 });
        }
        return;
      }
    } else if (isTokenExpiringSoon(token, 5)) {
      console.log('[WS-Client] Token expiring soon, attempting refresh');
      try {
        const refreshResult = await refreshToken();
        token = refreshResult.token;
        localStorage.setItem('auth_token', token);
        console.log('[WS-Client] Token refresh before WebSocket: success');
      } catch (error) {
        console.log('[WS-Client] Token refresh before WebSocket: failed, proceeding with existing token');
      }
    }

    const wsUrl = buildWebSocketUrl(connectionId, token);
    if (!wsUrl) {
      setConnectionState('error');
      if (!silentReconnectRef.current) {
        onConnectionError?.({ type: 'validation', message: 'Invalid connection parameters', userAction: 'retry', code: 0 });
      }
      return;
    }

    // Don't retry if we've exceeded max retries
    if (retryRef.current >= 3) { // Reduced from 5 to 3
      console.error(`[WS-Client] ${new Date().toISOString()} Max retries exceeded for connectionId: ${connectionId}`);
      setConnectionState('error');
      if (!silentReconnectRef.current) {
        onConnectionError?.({ type: 'retry', message: 'Max connection retries exceeded', userAction: 'retry', code: 0 });
      }
      return;
    }

    const maskedToken = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****';
    const maskedUrl = wsUrl.replace(/token=[^&]+/, `token=${maskedToken}`);
    
    connectionAttempts.current++;
    connectionStartTime.current = Date.now();
    console.log(`[WS-Client] ${new Date().toISOString()} Connection attempt: ${connectionAttempts.current}`);
    console.log(`[WS-Client] ${new Date().toISOString()} Attempting connection to: ${connectionId}`);
    console.log(`[WS-Client] ${new Date().toISOString()} WebSocket URL: ${maskedUrl}`);
    console.log(`[WS-Client] ${new Date().toISOString()} Token present: ${!!token}, Retry attempt: ${retryRef.current}`);
    
    // iOS Safari specific optimizations
    if (isMobile || isSafari) {
      console.log(`[WS-Client] ${new Date().toISOString()} Mobile/Safari detected, applying optimizations`);
      
      // Add small delay for mobile browsers
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    isManualCloseRef.current = false;
    const oldState = connectionState;
    setConnectionState('connecting');
    console.log(`[WS-Client] ${new Date().toISOString()} State transition: ${oldState} -> connecting`);

    // Set shorter timeout for mobile browsers
    const connectionTimeout = (isMobile || isSafari) ? 10000 : 15000;
    const timeoutId = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log(`[WS-Client] ${new Date().toISOString()} Connection timeout after ${connectionTimeout}ms`);
        ws.close();
      }
    }, connectionTimeout);

    ws.onopen = () => {
      clearTimeout(timeoutId);
      const connectionTime = Date.now() - connectionStartTime.current;
      console.log(`[WS-Client] ${new Date().toISOString()} ✅ WebSocket OPENED successfully in ${connectionTime}ms`);
      retryRef.current = 0;
      lastPongTime.current = Date.now();
      const oldState = connectionState;
      setConnectionState('connected');
      console.log(`[WS-Client] ${new Date().toISOString()} State transition: ${oldState} -> connected`);
      
      // Start heartbeat with adaptive intervals
      const startHeartbeat = () => {
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
        }
        
        const sendHeartbeat = () => {
          if (ws.readyState === WebSocket.OPEN) {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityTime.current;
            const timeSinceLastPong = now - lastPongTime.current;
            
            // Only send ping if we haven't had recent activity
            if (timeSinceLastActivity > 20000) {
              console.log('[WS-Client] Heartbeat: ping sent (idle)');
              ws.send(JSON.stringify({ type: 'ping' }));
            }
            
            // Check for stale connection with longer timeout
            const staleTimeout = 120000; // 2 minutes
            if (timeSinceLastPong > staleTimeout) {
              console.log('[WS-Client] Heartbeat: connection stale, closing');
              ws.close();
            }
          }
        };
        
        // Use longer intervals to reduce battery drain
        const heartbeatIntervalMs = 30000; // 30 seconds
        heartbeatInterval.current = setInterval(sendHeartbeat, heartbeatIntervalMs);
      };
      
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        // Validate message size to prevent DoS
        if (event.data.length > 10000) {
          return;
        }
        
        const data = JSON.parse(event.data);
        
        // Validate payload structure
        if (!data || typeof data !== 'object' || !data.type) {
          return;
        }
        
        // Sanitize string fields to prevent XSS
        const sanitizeField = (field) => {
          if (typeof field === 'string') {
            return field.replace(/[<>"'&\/]/g, '');
          }
          return field;
        };
        
        // Whitelist allowed message types
        const allowedTypes = ['chat_message', 'typing_indicator', 'presence', 'delivery_confirmation', 'read_receipt', 'notification', 'call_status', 'ping', 'pong', 'error'];
        if (!allowedTypes.includes(data.type)) {
          return;
        }
        
        switch (data.type) {
          case 'chat_message':
            lastActivityTime.current = Date.now();
            onMessage?.({...data, content: sanitizeField(data.content)});
            break;
          case 'typing_indicator':
            lastActivityTime.current = Date.now();
            onTyping?.(data);
            break;
          case 'presence':
            lastActivityTime.current = Date.now();
            onPresence?.(data);
            break;
          case 'delivery_confirmation':
            lastActivityTime.current = Date.now();
            onDelivered?.(data);
            // Calculate latency for quality monitoring
            if (data.client_id && messageSentTimes.current.has(data.client_id)) {
              const sentTime = messageSentTimes.current.get(data.client_id);
              const latency = Date.now() - sentTime;
              updateConnectionQuality(latency);
              messageSentTimes.current.delete(data.client_id);
            }
            break;
          case 'read_receipt':
            lastActivityTime.current = Date.now();
            onRead?.(data);
            break;
          case 'notification':
            lastActivityTime.current = Date.now();
            onNotification?.(data);
            break;
          case 'call_status':
            lastActivityTime.current = Date.now();
            onCallStatus?.(data);
            break;
          case 'ping':
            sendPayload({ type: 'pong' });
            console.log('[WS-Client] Heartbeat: ping received, pong sent');
            lastPongTime.current = Date.now();
            break;
          case 'pong':
            console.log('[WS-Client] Heartbeat: pong received');
            lastPongTime.current = Date.now();
            break;
          default:
            break;
        }
      } catch (error) {
        // Ignore malformed messages.
      }
    };

    ws.onclose = (event) => {
      clearTimeout(timeoutId);
      const timestamp = new Date().toISOString();
      console.log(`[WS-Client] ${timestamp} ❌ WebSocket CLOSED: code=${event.code}, reason=${event.reason || 'none'}, clean=${event.wasClean}`);
      
      // Check for idle disconnection before processing errors
      const timeSinceActivity = Date.now() - lastActivityTime.current;
      const isIdleDisconnection = event.code === 1006 && timeSinceActivity > IDLE_THRESHOLD;
      console.log('[WS-Client] Idle disconnect check:', isIdleDisconnection, 'ms since activity:', timeSinceActivity);
      if (isIdleDisconnection) {
        console.log('[WS-Client] Idle disconnection detected - suppressing error/retry');
        setConnectionState('idle_disconnected');
        return;  // Skip errorClassifier, retries, onConnectionError
      }
      
      // Clear heartbeat
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      
      // Skip retry logic ONLY for manual closes or normal closes (NOT 1006)
      // Use strict comparison and explicit checks
      if (isManualCloseRef.current) {
        console.log(`[WS-Client] ${timestamp} Manual close detected, not retrying`);
        setConnectionState('disconnected');
        return;
      }
      
      if (event.code === 1000) {
        console.log(`[WS-Client] ${timestamp} Normal close (code=1000), not retrying`);
        setConnectionState('disconnected');
        return;
      }
      
      // Log the actual close code for debugging
      console.log(`[WS-Client] ${timestamp} WebSocket closed with code ${event.code}, will retry`);
      
      const oldState = connectionState;
      setConnectionState('disconnected');
      console.log(`[WS-Client] ${timestamp} State transition: ${oldState} -> disconnected`);
      
      // Clear any existing reconnect timer
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      
      // Classify error and determine retry behavior
      const errorInfo = errorClassifier(event.code);
      console.log(`[WS-Client] ${timestamp} Error classified as: ${errorInfo.type}`);
      
      // Don't retry for auth/permission errors (4000-4999 range)
      if (event.code >= 4000 && event.code < 5000) {
        console.log(`[WS-Client] ${timestamp} Not retrying due to client error code: ${event.code}`);
        setConnectionState('error');
        if (!silentReconnectRef.current) {
          onConnectionError?.({ ...errorInfo, code: event.code });
        }
        return;
      }
      
      // Stop retrying after max attempts
      if (retryRef.current >= 3) { // Reduced from 5 to 3 for mobile
        console.error(`[WS-Client] ${timestamp} Max retries reached, stopping`);
        setConnectionState('error');
        
        // For mobile browsers, start polling immediately after 3 failed attempts
        if (isMobile || isSafari) {
          console.log(`[WS-Client] ${timestamp} Mobile browser detected, starting polling fallback`);
          startPolling();
          return;
        }
        
        // For mobile browsers with persistent 1006 errors, start polling immediately
        if (event.code === 1006 && (isMobile || isSafari)) {
          console.log(`[WS-Client] ${timestamp} Mobile browser with 1006 error, starting polling fallback`);
          startPolling();
          return;
        }
        
        // Start polling fallback for network/unknown errors
        if (errorInfo.type === 'network' || errorInfo.type === 'unknown') {
          startPolling();
        } else {
          if (!silentReconnectRef.current) {
            onConnectionError?.({ type: 'retry', message: 'Max connection retries exceeded', userAction: 'retry', code: 0 });
          }
        }
        return;
      }
      
      // Longer backoff for mobile browsers: 3s, 6s, 12s
      const baseTimeout = (isMobile || isSafari) ? 3000 : 1000;
      const timeout = Math.min(12000, baseTimeout * Math.pow(2, retryRef.current));
      console.log(`[WS-Client] ${timestamp} Retry attempt ${retryRef.current + 1}/3 in ${timeout}ms`);
      retryRef.current += 1;
      reconnectTimer.current = setTimeout(connect, timeout);
    };

    ws.onerror = (errorEvent) => {
      clearTimeout(timeoutId);
      const timestamp = new Date().toISOString();
      console.error(`[WS-Client] ${timestamp} ⚠️ WebSocket ERROR for connectionId: ${connectionId}`);
      console.error(`[WS-Client] ${timestamp} Error details: connectionState=${connectionState}, retryCount=${retryRef.current}`);
      console.error(`[WS-Client] ${timestamp} Error event:`, errorEvent);
      
      // Log full diagnostics on first error
      if (retryRef.current === 0) {
        logConnectionDiagnostics(connectionId, localStorage.getItem('auth_token'));
      }
      
      setConnectionState('error');
      if (!silentReconnectRef.current) {
        onConnectionError?.({ type: 'network', message: 'WebSocket connection failed', userAction: 'retry', code: 0 });
      }
      ws.close();
    };
  }, [connectionId, onDelivered, onMessage, onPresence, onRead, onTyping, sendPayload, onConnectionError, errorClassifier, startPolling]);

  const reconnect = useCallback(() => {
    console.log('[WS-Client] Manual reconnect triggered');
    
    // Stop polling if active
    stopPolling();
    
    // Close existing connection
    if (socketRef.current) {
      isManualCloseRef.current = true;
      socketRef.current.close(1000, 'Manual reconnect');
    }
    
    // Reset retry counter
    retryRef.current = 0;
    
    // Clear any pending reconnect timers
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    
    // Attempt new connection
    connect();
  }, [connect, stopPolling]);

  // Page visibility handling for idle screens
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[WS-Client] Page hidden, reducing activity');
      } else {
        console.log('[WS-Client] Page visible, resuming activity');
        lastActivityTime.current = Date.now();
        
        // Reconnect if disconnected while hidden
        if (connectionState === 'disconnected' || connectionState === 'error' || connectionState === 'idle_disconnected') {
          if (connectionState === 'idle_disconnected') {
            console.log('[WS-Client] Silent reconnect from idle');
            connect(true);
          } else {
            console.log('[WS-Client] Reconnecting after page became visible');
            reconnect();
          }
        }
      }
    };
    
    visibilityChangeHandler.current = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionState, reconnect]);

  // Network change detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('[WS-Client] Network: online');
      if (connectionState === 'disconnected' || connectionState === 'error' || connectionState === 'idle_disconnected') {
        if (connectionState === 'idle_disconnected') {
          connect(true);
        } else {
          connect();
        }
      }
    };
    
    const handleOffline = () => {
      console.log('[WS-Client] Network: offline');
      setConnectionState('disconnected');
    };
    
    networkListeners.current.online = handleOnline;
    networkListeners.current.offline = handleOffline;
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionState, connect]);

  useEffect(() => {
    // Only connect if we have a valid connectionId
    if (connectionId) {
      // Close old connection if connectionId changed
      if (socketRef.current) {
        console.log('[WS-Client] State: closing old connection for new connectionId');
        isManualCloseRef.current = true;
        socketRef.current.close(1000, 'Connection ID changed');
      }
      connect();
    } else {
      setConnectionState('error');
    }
    return () => {
      console.log('[WS-Client] Cleanup: clearing timers and closing connection');
      
      // Clear all timers
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      
      // Stop polling
      stopPolling();
      
      // Remove network listeners
      if (networkListeners.current.online) {
        window.removeEventListener('online', networkListeners.current.online);
      }
      if (networkListeners.current.offline) {
        window.removeEventListener('offline', networkListeners.current.offline);
      }
      
      // Close WebSocket
      if (socketRef.current) {
        isManualCloseRef.current = true;
        socketRef.current.close(1000, 'Component unmounting');
      }
      
      // Reset state
      retryRef.current = 0;
      setConnectionState('disconnected');
    };
  }, [connectionId]); // Remove 'connect' from dependencies to prevent race condition

  const sendMessage = useCallback(
    (content, clientId) => {
      lastActivityTime.current = Date.now();
      // Track send time for latency calculation
      if (clientId) {
        messageSentTimes.current.set(clientId, Date.now());
      }
      return sendPayload({ type: 'chat_message', content, client_id: clientId });
    },
    [sendPayload]
  );
  const sendTypingIndicator = useCallback(
    (isTyping) => {
      lastActivityTime.current = Date.now();
      return sendPayload({ type: 'typing_indicator', is_typing: isTyping });
    },
    [sendPayload]
  );
  const sendReadReceipt = useCallback(
    (messageId) => {
      lastActivityTime.current = Date.now();
      return sendPayload({ type: 'read_receipt', id: messageId });
    },
    [sendPayload]
  );
  const sendDeliveryConfirmation = useCallback(
    (messageId) => {
      lastActivityTime.current = Date.now();
      return sendPayload({ type: 'delivery_confirmation', id: messageId });
    },
    [sendPayload]
  );
  const sendNotification = useCallback(
    (notificationType, data = {}) => {
      if (!notificationType) {
        return;
      }
      lastActivityTime.current = Date.now();
      return sendPayload({ type: 'notification', notification_type: notificationType, ...data });
    },
    [sendPayload]
  );

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    socketRef.current?.close();
  }, []);

  return {
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    sendDeliveryConfirmation,
    sendNotification,
    connectionState,
    disconnect,
    reconnect,
    isPolling,
    connectionQuality,
    averageLatency: latencyHistory.current.length > 0 
      ? Math.round(latencyHistory.current.reduce((a, b) => a + b, 0) / latencyHistory.current.length)
      : 0
  };
};
