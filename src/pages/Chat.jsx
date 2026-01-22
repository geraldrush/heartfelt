// src/pages/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  createTokenRequest,
  getConnections,
  getMessages,
  getTokenRequests,
  refreshToken,
} from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { isTokenExpiringSoon } from '../utils/auth.js';

// Connection Status Banner Component
const ConnectionStatusBanner = ({ connectionState, isPolling, connectionQuality, averageLatency, retryCount, onReconnect }) => {
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    if (connectionState === 'connected') {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setDismissed(false);
    }
  }, [connectionState]);
  
  // Don't show banner for connected state, idle disconnections, or when dismissed
  if (dismissed || connectionState === 'connected' || connectionState === 'idle_disconnected') return null;
  
  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connecting':
        return {
          bg: 'bg-gray-400',
          icon: '⟳',
          text: 'Connecting...',
          animate: ''
        };
      case 'polling':
        return {
          bg: 'bg-orange-500',
          icon: '↻',
          text: 'Limited connectivity',
          showRetry: true,
          animate: 'animate-spin'
        };
      case 'disconnected':
        return {
          bg: 'bg-gray-500',
          icon: '○',
          text: 'Disconnected',
          showRetry: true
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          icon: '⚠',
          text: 'Connection Error',
          showRetry: true
        };
      default:
        return null;
    }
  };
  
  const config = getStatusConfig();
  if (!config) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${config.bg} px-3 py-1.5 mx-4 mt-2 rounded-lg shadow-sm flex items-center justify-between text-white`}
    >
      <div className="flex items-center gap-2">
        <span className={`${config.animate || ''} text-sm`}>{config.icon}</span>
        <span className="text-xs font-medium">{config.text}</span>
      </div>
      {config.showRetry && (
        <button
          onClick={onReconnect}
          className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
};

// Connection Quality Indicator Component
const ConnectionQualityIndicator = ({ connectionState, connectionQuality }) => {
  const getIndicatorConfig = () => {
    if (connectionState === 'connected') {
      return { color: 'bg-green-500', pulse: false, title: 'Connected' };
    }
    if (connectionState === 'connecting' || connectionState === 'idle_disconnected') {
      return { color: 'bg-yellow-400', pulse: true, title: 'Reconnecting' };
    }
    if (connectionState === 'error' || connectionState === 'disconnected') {
      return { color: 'bg-red-500', pulse: false, title: 'Disconnected' };
    }
    if (connectionState === 'polling') {
      return { color: 'bg-orange-500', pulse: true, title: 'Limited connectivity' };
    }
    return { color: 'bg-gray-400', pulse: false, title: 'Unknown' };
  };

  const config = getIndicatorConfig();
  
  return (
    <div className="relative" title={config.title}>
      <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
      {config.pulse && (
        <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping opacity-75`}></div>
      )}
    </div>
  );
};

// Error Boundary Component
class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const timestamp = new Date().toISOString();
    console.error(`[WS-Client] ${timestamp} Chat component error:`, error);
    console.error(`[WS-Client] ${timestamp} Error info:`, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="rounded-2xl bg-white px-6 py-8 text-center text-sm text-slate-600 shadow">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
            <p className="mb-4">The chat component encountered an error. Please refresh the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Chat = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const connectionId = searchParams.get('connectionId');
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showTokenRequest, setShowTokenRequest] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [tokenRequests, setTokenRequests] = useState([]);
  const [tokenWarning, setTokenWarning] = useState(false);

  const listRef = useRef(null);
  const topSentinelRef = useRef(null);
  const typingTimeout = useRef(null);
  const messageRefs = useRef(new Map());
  const readSent = useRef(new Set());

  const otherUserId = connection?.other_user_id;
  const otherUserName = connection?.full_name || 'Connection';

  // Helper function to extract initials from name
  const getInitials = (name) => {
    if (!name || name === 'Connection') return 'U';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Log component lifecycle
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[WS-Client] ${timestamp} Chat component mounted with connectionId: ${connectionId}`);
    return () => {
      console.log(`[WS-Client] ${timestamp} Chat component unmounting`);
    };
  }, [connectionId]);

  if (!connectionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white px-6 py-8 text-center text-sm text-slate-600 shadow">
          Select a connection to start chatting.
        </div>
      </div>
    );
  }

  // Don't attempt WebSocket connection if no valid connection found
  if (!loading && !connection) {
    const timestamp = new Date().toISOString();
    console.log(`[WS-Client] ${timestamp} Connection not found: ${connectionId}`);
    
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white px-6 py-8 text-center text-sm text-slate-600 shadow max-w-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Connection Not Found</h3>
          <p className="mb-4">Connection ID: {connectionId}</p>
          <p className="mb-4">This connection doesn't exist or you don't have access to it.</p>
          <button 
            onClick={() => window.history.back()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const updateMessageStatus = (id, status) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, status } : msg))
    );
  };

  const {
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    sendDeliveryConfirmation,
    connectionState,
    reconnect,
    isPolling,
    connectionQuality,
    averageLatency
  } = useWebSocket({
    connectionId: connection ? connectionId : null, // Only connect if valid connection exists
    onMessage: (data) => {
      // Check if message already exists to prevent duplicates
      setMessages((prev) => {
        // Check for duplicates by ID, content, and timestamp
        const exists = prev.some(msg => 
          msg.id === data.id || 
          (msg.content === data.content && 
           msg.sender_id === data.sender_id && 
           Math.abs(new Date(msg.created_at) - new Date(data.created_at)) < 1000)
        );
        if (exists) {
          console.log('[WS-Client] Duplicate message detected, ignoring:', data.id);
          return prev; // Don't add duplicate
        }
        console.log('[WS-Client] Adding new message from WebSocket:', data.id);
        return [...prev, data]; // Add new message at end
      });
      sendDeliveryConfirmation(data.id);
    },
    onTyping: (data) => {
      setIsOtherUserTyping(Boolean(data.is_typing));
    },
    onPresence: (data) => {
      if (data.user_id !== user?.id) {
        setIsOtherUserOnline(Boolean(data.is_online));
      }
    },
    onDelivered: (data) => {
      if (data.client_id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.client_id
              ? { ...msg, id: data.id, status: data.status || 'sent' }
              : msg
          )
        );
        return;
      }
      updateMessageStatus(data.id, data.status || 'delivered');
    },
    onRead: (data) => {
      updateMessageStatus(data.id, data.status || 'read');
    },
    onConnectionError: (errorInfo) => {
      setConnectionError(errorInfo);
    },
  });

  const loadConnection = async () => {
    if (!connectionId) {
      return;
    }
    const timestamp = new Date().toISOString();
    console.log(`[WS-Client] ${timestamp} Loading connection: ${connectionId}`);
    
    try {
      const data = await getConnections();
      const found = data.connections?.find((item) => item.id === connectionId);
      
      if (!found) {
        console.log(`[WS-Client] ${timestamp} Connection not found in list: ${connectionId}`);
        console.log(`[WS-Client] ${timestamp} Available connections:`, data.connections?.map(c => c.id));
      } else {
        console.log(`[WS-Client] ${timestamp} Connection loaded successfully: ${found.full_name}`);
      }
      
      setConnection(found || null);
    } catch (err) {
      console.error(`[WS-Client] ${timestamp} Load connection error:`, err);
      setError(err.message || 'Unable to load connection.');
    }
  };

  const loadMessages = async ({ reset = false } = {}) => {
    if (!connectionId) {
      return;
    }
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }
    try {
      const data = await getMessages(connectionId, {
        limit: 50,
        offset: reset ? 0 : offset,
      });
      
      // Messages come from API in reverse chronological order (newest first)
      // We need them in chronological order (oldest first) for chat display
      const orderedMessages = [...(data.messages || [])].reverse();
      
      if (reset) {
        // Initial load - replace all messages
        setMessages(orderedMessages);
        setOffset(orderedMessages.length);
        // Scroll to bottom after messages load
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 100);
      } else {
        // Load more (older messages) - prepend to existing messages
        setMessages((prev) => [...orderedMessages, ...prev]);
        setOffset((prev) => prev + orderedMessages.length);
      }
      
      setHasMore((data.messages || []).length === 50);
    } catch (err) {
      console.error('Load messages error:', err);
      setError(err.message || 'Unable to load messages.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadTokenRequests = async () => {
    try {
      const data = await getTokenRequests();
      setTokenRequests(data.requests || []);
    } catch (err) {
      setTokenRequests([]);
    }
  };

  useEffect(() => {
    setMessages([]);
    setOffset(0);
    readSent.current = new Set();
    loadConnection();
    loadMessages({ reset: true });
    loadTokenRequests();
  }, [connectionId]);

  // Cleanup on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (connectionState === 'connected') {
        // Attempt graceful disconnect
        try {
          navigator.sendBeacon && navigator.sendBeacon('/api/disconnect', JSON.stringify({ connectionId }));
        } catch (e) {
          // Ignore beacon errors
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [connectionId, connectionState]);

  useEffect(() => {
    if (!hasMore || loadingMore || !listRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMessages({ reset: false });
        }
      },
      { root: listRef.current, threshold: 0.1 }
    );

    const sentinel = topSentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMore, loadingMore]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const messageId = entry.target.getAttribute('data-message-id');
          if (!messageId || readSent.current.has(messageId)) {
            return;
          }
          const message = messages.find((msg) => msg.id === messageId);
          if (!message || message.sender_id === user?.id || message.status === 'read') {
            return;
          }
          readSent.current.add(messageId);
          sendReadReceipt(messageId);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, status: 'read' } : msg
            )
          );
        });
      },
      { root: listRef.current, threshold: 0.6 }
    );

    messageRefs.current.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [messages, sendReadReceipt, user?.id]);

  useEffect(() => {
    if (!loadingMore && listRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 200;
      if (nearBottom) {
        listRef.current.scrollTo({ top: scrollHeight });
      }
    }
  }, [messages, loadingMore]);

  const handleSend = () => {
    if (!inputText.trim()) {
      return;
    }
    const tempId = crypto.randomUUID();
    const outgoing = {
      id: tempId,
      sender_id: user?.id,
      content: inputText.trim(),
      status: 'sending',
      created_at: new Date().toISOString(),
    };
    
    // Add message to UI immediately for better UX
    setMessages((prev) => [...prev, outgoing]);
    
    // Send message via WebSocket
    sendMessage(inputText.trim(), tempId);
    setInputText('');
    
    // Scroll to bottom
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleTyping = (value) => {
    setInputText(value);
    sendTypingIndicator(true);
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
  };

  const handleRequestTokens = async () => {
    if (!otherUserId) {
      setError('Select a connection to request tokens from.');
      return;
    }
    const numericAmount = Number(requestAmount);
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid token amount.');
      return;
    }
    try {
      await createTokenRequest({
        recipient_id: otherUserId,
        amount: numericAmount,
        reason: requestReason || undefined,
      });
      setRequestAmount('');
      setRequestReason('');
      setShowTokenRequest(false);
      loadTokenRequests();
    } catch (err) {
      setError(err.message || 'Failed to send token request.');
    }
  };

  const statusIcon = (status) => {
    if (status === 'read') {
      return '✓✓';
    }
    if (status === 'delivered') {
      return '✓✓';
    }
    if (status === 'sent') {
      return '✓';
    }
    return '…';
  };

  const sortedTokenRequests = useMemo(
    () => tokenRequests.filter((req) => req.requester_id === user?.id),
    [tokenRequests, user?.id]
  );

  // Helper functions for connection status display
  const getConnectionColor = () => {
    if (connectionState === 'connected' && isOtherUserOnline) return 'bg-green-500';
    if (connectionState === 'connecting' || connectionState === 'idle_disconnected') return 'bg-amber-400';
    if (connectionState === 'error' || connectionState === 'disconnected') return 'bg-red-500';
    if (connectionState === 'polling') return 'bg-orange-500';
    return 'bg-gray-400';
  };

  const getConnectionText = () => {
    if (connectionState === 'connecting') return 'Reconnecting...';
    if (connectionState === 'connected') return isOtherUserOnline ? 'Online' : 'Offline';
    if (connectionState === 'error' || connectionState === 'disconnected') return 'Disconnected';
    if (connectionState === 'polling') return 'Limited connectivity';
    return isOtherUserOnline ? 'Online' : 'Offline';
  };

  const emptyIcon = (
    <svg
      viewBox="0 0 64 64"
      className="h-12 w-12 text-rose-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 30h36M20 22h24M22 40h20" />
      <path d="M10 18a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H24l-10 8v-8H16a6 6 0 0 1-6-6z" />
    </svg>
  );

  return (
    <ChatErrorBoundary>
      <div className="flex min-h-screen flex-col bg-gray-50">
        {/* Fixed Header - Always Visible */}
        <div className="fixed top-0 left-0 right-0 z-20 border-b bg-white shadow-md">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.history.back()}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Avatar Circle */}
              <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center font-semibold text-sm">
                {getInitials(otherUserName)}
              </div>
              
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{otherUserName}</h2>
                  <ConnectionQualityIndicator 
                    connectionState={connectionState}
                    connectionQuality={connectionQuality}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {connectionState === 'connected' && isOtherUserOnline ? 'Online' : 
                   connectionState === 'connected' && !isOtherUserOnline ? 'Offline' : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTokenRequest((prev) => !prev)}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition"
            >
              {showTokenRequest ? 'Close' : 'Request'}
            </button>
          </div>
        </div>

        {/* Connection Status Banner - Only for problematic states, idle_disconnected is filtered out */}
        {(connectionState === 'error' || connectionState === 'polling' || connectionState === 'disconnected') && (
          <ConnectionStatusBanner 
            connectionState={connectionState}
            isPolling={isPolling}
            connectionQuality={connectionQuality}
            averageLatency={averageLatency}
            retryCount={0}
            onReconnect={reconnect}
          />
        )}

        {error && (
          <div className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {connectionError && typeof connectionError === 'object' && (
          <div className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {connectionError.type === 'auth' ? 'Authentication Error' :
                   connectionError.type === 'permission' ? 'Access Denied' :
                   connectionError.type === 'network' ? 'Network Issue' :
                   connectionError.type === 'server' ? 'Server Error' :
                   'Connection Error'}
                </p>
                <p className="text-xs">{connectionError.message}</p>
              </div>
              <div className="flex gap-1">
                {connectionError.userAction === 'login' && (
                  <button 
                    onClick={() => window.location.href = '/login'}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    Log In
                  </button>
                )}
                {connectionError.userAction === 'goBack' && (
                  <button 
                    onClick={() => window.history.back()}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    Go Back
                  </button>
                )}
                {connectionError.userAction === 'retry' && (
                  <button 
                    onClick={reconnect}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showTokenRequest && (
          <div className="mx-4 mt-2 rounded-lg bg-white p-3 shadow-sm border">
            <p className="text-sm font-medium text-gray-900 mb-2">Request Tokens</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                min="1"
                value={requestAmount}
                onChange={(event) => setRequestAmount(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="Amount"
              />
              <input
                type="text"
                value={requestReason}
                onChange={(event) => setRequestReason(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="Reason (optional)"
              />
            </div>
            <button
              type="button"
              onClick={handleRequestTokens}
              className="mt-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
            >
              Send Request
            </button>

            {sortedTokenRequests.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                {sortedTokenRequests.map((req) => (
                  <p key={req.id}>Requested {req.amount} tokens • {req.status}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-3 pt-20"
        >
          {loading && <LoadingSpinner label="Loading messages..." className="justify-start" />}

          <div ref={topSentinelRef} className="h-2" />
          {!loading && messages.length === 0 && (
            <div className="mt-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Messages</h3>
              <p className="text-xs text-gray-500">Send a message to start the conversation!</p>
            </div>
          )}
          
          <div className="space-y-2">
            {messages.map((msg) => {
              const isSender = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    ref={(node) => {
                      if (!node) {
                        messageRefs.current.delete(msg.id);
                        return;
                      }
                      messageRefs.current.set(msg.id, node);
                    }}
                    data-message-id={msg.id}
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      isSender 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.content}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                      isSender ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {isSender && <span>{statusIcon(msg.status)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isOtherUserTyping && (
            <p className="mt-3 text-xs text-gray-500 px-1">{otherUserName} is typing...</p>
          )}
        </div>

        {/* Fixed Input Area */}
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white shadow-sm">
          <div className="flex gap-2 px-4 py-3">
            <input
              value={inputText}
              onChange={(event) => handleTyping(event.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none bg-gray-50"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-full transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </ChatErrorBoundary>
  );
};

export default Chat;
