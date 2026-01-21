import { useCallback, useEffect, useRef, useState } from 'react';

const buildWebSocketUrl = (connectionId, token) => {
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://heartfelt-api.gerryrushway.workers.dev' : 'http://localhost:8787');
  const url = new URL(apiUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/api/chat/connect/${connectionId}?token=${token}`;
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
}) => {
  const socketRef = useRef(null);
  const retryRef = useRef(0);
  const reconnectTimer = useRef(null);
  const [connectionState, setConnectionState] = useState('disconnected');

  const sendPayload = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback(() => {
    if (!connectionId) {
      console.log(`[WS-Client] ${new Date().toISOString()} Connection attempt failed: no connectionId provided`);
      setConnectionState('error');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      console.log(`[WS-Client] ${new Date().toISOString()} Connection attempt failed: no token in localStorage`);
      setConnectionState('error');
      return;
    }

    // Don't retry if we've exceeded max retries
    if (retryRef.current >= 5) {
      console.error(`[WS-Client] ${new Date().toISOString()} Max retries exceeded for connectionId: ${connectionId}`);
      setConnectionState('error');
      return;
    }

    const maskedToken = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****';
    const wsUrl = buildWebSocketUrl(connectionId, token);
    const maskedUrl = wsUrl.replace(/token=[^&]+/, `token=${maskedToken}`);
    
    console.log(`[WS-Client] ${new Date().toISOString()} Attempting connection to: ${connectionId}`);
    console.log(`[WS-Client] ${new Date().toISOString()} WebSocket URL: ${maskedUrl}`);
    console.log(`[WS-Client] ${new Date().toISOString()} Token present: ${!!token}, Retry attempt: ${retryRef.current}`);
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    const oldState = connectionState;
    setConnectionState('connecting');
    console.log(`[WS-Client] ${new Date().toISOString()} State transition: ${oldState} -> connecting`);

    ws.onopen = () => {
      console.log(`[WS-Client] ${new Date().toISOString()} Connected successfully`);
      retryRef.current = 0;
      const oldState = connectionState;
      setConnectionState('connected');
      console.log(`[WS-Client] ${new Date().toISOString()} State transition: ${oldState} -> connected`);
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
        
        // Whitelist allowed message types
        const allowedTypes = ['chat_message', 'typing_indicator', 'presence', 'delivery_confirmation', 'read_receipt', 'ping', 'error'];
        if (!allowedTypes.includes(data.type)) {
          return;
        }
        
        switch (data.type) {
          case 'chat_message':
            onMessage?.(data);
            break;
          case 'typing_indicator':
            onTyping?.(data);
            break;
          case 'presence':
            onPresence?.(data);
            break;
          case 'delivery_confirmation':
            onDelivered?.(data);
            break;
          case 'read_receipt':
            onRead?.(data);
            break;
          case 'ping':
            sendPayload({ type: 'pong' });
            break;
          default:
            break;
        }
      } catch (error) {
        // Ignore malformed messages.
      }
    };

    ws.onclose = (event) => {
      const timestamp = new Date().toISOString();
      console.log(`[WS-Client] ${timestamp} Connection closed: code=${event.code}, reason=${event.reason || 'none'}, clean=${event.wasClean}`);
      
      const oldState = connectionState;
      setConnectionState('disconnected');
      console.log(`[WS-Client] ${timestamp} State transition: ${oldState} -> disconnected`);
      
      // Set connection error with specific reason
      let errorMessage = '';
      if (event.code >= 1000 && event.code <= 1003) {
        console.log(`[WS-Client] ${timestamp} Normal/going away/protocol error - not retrying`);
        errorMessage = 'Connection closed normally';
      } else if (event.code >= 4000 && event.code < 5000) {
        console.warn(`[WS-Client] ${timestamp} Application-level error (likely auth/permission) - not retrying`);
        errorMessage = 'Authentication or permission error';
        setConnectionState('error');
        onConnectionError?.(errorMessage);
        return;
      } else if (event.code !== 1006) {
        console.log(`[WS-Client] ${timestamp} Network/server issue (code ${event.code}) - not retrying`);
        errorMessage = `Network error (code ${event.code})`;
        setConnectionState('error');
        onConnectionError?.(errorMessage);
        return;
      }
      
      // Stop retrying after max attempts
      if (retryRef.current >= 5) {
        console.error(`[WS-Client] ${timestamp} Max retries reached, stopping`);
        errorMessage = 'Max connection retries exceeded';
        setConnectionState('error');
        onConnectionError?.(errorMessage);
        return;
      }
      
      const timeout = Math.min(30000, 1000 * 2 ** retryRef.current);
      console.log(`[WS-Client] ${timestamp} Retry attempt ${retryRef.current + 1}/5 in ${timeout}ms`);
      retryRef.current += 1;
      reconnectTimer.current = setTimeout(connect, timeout);
    };

    ws.onerror = (errorEvent) => {
      const timestamp = new Date().toISOString();
      console.error(`[WS-Client] ${timestamp} Connection error for connectionId: ${connectionId}`);
      console.error(`[WS-Client] ${timestamp} Error details: connectionState=${connectionState}, retryCount=${retryRef.current}`);
      console.error(`[WS-Client] ${timestamp} Error event:`, errorEvent);
      
      // Log full diagnostics on first error
      if (retryRef.current === 0) {
        logConnectionDiagnostics(connectionId, localStorage.getItem('token'));
      }
      
      const errorMessage = 'WebSocket connection failed';
      setConnectionState('error');
      onConnectionError?.(errorMessage);
      ws.close();
    };
  }, [connectionId, onDelivered, onMessage, onPresence, onRead, onTyping, sendPayload, onConnectionError]);

  useEffect(() => {
    // Only connect if we have a valid connectionId
    if (connectionId) {
      connect();
    } else {
      setConnectionState('error');
    }
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      socketRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content, clientId) =>
      sendPayload({ type: 'chat_message', content, client_id: clientId }),
    [sendPayload]
  );
  const sendTypingIndicator = useCallback(
    (isTyping) => sendPayload({ type: 'typing_indicator', is_typing: isTyping }),
    [sendPayload]
  );
  const sendReadReceipt = useCallback(
    (messageId) => sendPayload({ type: 'read_receipt', id: messageId }),
    [sendPayload]
  );
  const sendDeliveryConfirmation = useCallback(
    (messageId) => sendPayload({ type: 'delivery_confirmation', id: messageId }),
    [sendPayload]
  );

  const disconnect = useCallback(() => {
    socketRef.current?.close();
  }, []);

  return {
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    sendDeliveryConfirmation,
    connectionState,
    disconnect,
  };
};
