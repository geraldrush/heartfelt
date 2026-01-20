import { useCallback, useEffect, useRef, useState } from 'react';

const buildWebSocketUrl = (connectionId, token) => {
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://heartfelt-api.gerryrushway.workers.dev' : 'http://localhost:8787');
  const url = new URL(apiUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/api/chat/connect/${connectionId}?token=${token}`;
};

export const useWebSocket = ({
  connectionId,
  onMessage,
  onTyping,
  onPresence,
  onDelivered,
  onRead,
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
      setConnectionState('error');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setConnectionState('error');
      return;
    }

    // Don't retry if we've exceeded max retries
    if (retryRef.current >= 5) {
      setConnectionState('error');
      return;
    }

    const ws = new WebSocket(buildWebSocketUrl(connectionId, token));
    socketRef.current = ws;
    setConnectionState('connecting');

    ws.onopen = () => {
      retryRef.current = 0;
      setConnectionState('connected');
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
      setConnectionState('disconnected');
      
      // Don't retry on auth failures (1000-1015 are standard close codes)
      if (event.code === 1000 || event.code === 1001 || event.code === 1002 || event.code === 1003) {
        return;
      }
      
      // Don't retry on auth/permission errors (4xx equivalent)
      if (event.code >= 4000 && event.code < 5000) {
        setConnectionState('error');
        return;
      }
      
      // Stop retrying after max attempts
      if (retryRef.current >= 5) {
        setConnectionState('error');
        return;
      }
      
      const timeout = Math.min(30000, 1000 * 2 ** retryRef.current);
      retryRef.current += 1;
      reconnectTimer.current = setTimeout(connect, timeout);
    };

    ws.onerror = () => {
      setConnectionState('error');
      ws.close();
    };
  }, [connectionId, onDelivered, onMessage, onPresence, onRead, onTyping, sendPayload]);

  useEffect(() => {
    connect();
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
