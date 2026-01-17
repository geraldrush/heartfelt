import { useCallback, useEffect, useRef, useState } from 'react';

const buildWebSocketUrl = (connectionId, token) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
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
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
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
        const data = JSON.parse(event.data);
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

    ws.onclose = () => {
      setConnectionState('disconnected');
      if (retryRef.current < 5) {
        const timeout = Math.min(30000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        reconnectTimer.current = setTimeout(connect, timeout);
      }
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
