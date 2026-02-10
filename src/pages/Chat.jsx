// src/pages/Chat.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  createTokenRequest,
  getConnections,
  getMessages,
  getTokenRequests,
  getTokenBalance,
  requestVideoCall,
  transferTokens,
  refreshToken,
} from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Toast from '../components/Toast.jsx';
import VideoCall from '../components/VideoCall.jsx';
import { isTokenExpiringSoon } from '../utils/auth.js';
import { getPeerConfig } from '../utils/peer.js';

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
    this.handleRefresh = this.handleRefresh.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const timestamp = new Date().toISOString();
    console.error(`[WS-Client] ${timestamp} Chat component error:`, error);
    console.error(`[WS-Client] ${timestamp} Error info:`, errorInfo);
  }

  handleRefresh() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="rounded-2xl bg-white px-6 py-8 text-center text-sm text-slate-600 shadow">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
            <p className="mb-4">The chat component encountered an error. Please refresh the page.</p>
            <button 
              onClick={this.handleRefresh} 
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const connectionId = searchParams.get('connectionId');
  const incomingParam = searchParams.get('incoming');
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
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [videoCallInvitation, setVideoCallInvitation] = useState(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [toast, setToast] = useState(null);
  const [peerReady, setPeerReady] = useState(false);
  const peerRef = useRef(null);
  const giftOptions = [5, 10, 20, 50];

  const listRef = useRef(null);
  const topSentinelRef = useRef(null);
  const typingTimeout = useRef(null);
  const messageRefs = useRef(new Map());
  const readSent = useRef(new Set());

  const otherUserId = connection?.other_user_id;
  const otherUserName = connection?.full_name || 'Connection';
  const otherUserImage = connection?.image_url || null;

  // Helper function to extract initials from name
  const getInitials = (name) => {
    if (!name || name === 'Connection') return 'U';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  const handleNavigateToConnection = useCallback(() => {
    navigate(`/connection/${connectionId}`);
  }, [navigate, connectionId]);

  const handleLoginRedirect = useCallback(() => {
    window.location.href = '/login';
  }, []);

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
            onClick={handleGoBack} 
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

  const messageKey = (msg) =>
    msg.id || `${msg.sender_id}|${msg.created_at}|${msg.content}`;

  const mergeUniqueMessages = (base, incoming, { prepend = false } = {}) => {
    const combined = prepend ? [...incoming, ...base] : [...base, ...incoming];
    const seen = new Set();
    const unique = [];
    for (const msg of combined) {
      const key = messageKey(msg);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(msg);
    }
    return unique;
  };

  const {
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    sendDeliveryConfirmation,
    sendNotification,
    connectionState,
    reconnect,
    isPolling,
    connectionQuality,
    averageLatency
  } = useWebSocket({
    connectionId: connection ? connectionId : null, // Only connect if valid connection exists
    onMessage: (data) => {
      setMessages((prev) => mergeUniqueMessages(prev, [data], { prepend: false }));
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
    onNotification: (data) => {
      if (data.notification_type === 'video_call_request') {
        setVideoCallInvitation(data);
        setToast({ message: 'Incoming video call request', type: 'info' });
      }
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
        setMessages(mergeUniqueMessages([], orderedMessages, { prepend: false }));
        setOffset(orderedMessages.length);
        // Scroll to bottom after messages load
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 100);
      } else {
        // Load more (older messages) - prepend to existing messages
        setMessages((prev) => mergeUniqueMessages(prev, orderedMessages, { prepend: true }));
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

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleRequestVideoCall = useCallback(async () => {
    if (!connectionId || !connection?.other_user_id) {
      showToast('Unable to start video call.', 'error');
      return;
    }
    try {
      await requestVideoCall(connectionId, connection.other_user_id);
      sendNotification('video_call_request');
      setIsIncomingCall(false);
      setShowVideoCall(true);
      showToast('Video call request sent', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to request video call.');
    }
  }, [connectionId, connection?.other_user_id, sendNotification, showToast]);

  useEffect(() => {
    setMessages([]);
    setOffset(0);
    readSent.current = new Set();
    loadConnection();
    loadMessages({ reset: true });
    loadTokenRequests();
    getTokenBalance().then(data => setTokenBalance(data.balance));
    
    // Initialize PeerJS connection when chat opens
    if (user?.id && !peerRef.current) {
      import('peerjs').then(({ default: Peer }) => {
        const peerConfig = getPeerConfig();
        const peer = new Peer(user.id, {
          ...peerConfig
        });
        
        peer.on('open', () => {
          console.log('Peer connected:', user.id);
          setPeerReady(true);
        });
        
        peer.on('error', (error) => {
          console.error('Peer error:', error);
        });
        
        peerRef.current = peer;
      });
    }
    
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
        setPeerReady(false);
      }
    };
  }, [connectionId, user?.id]);

  useEffect(() => {
    if (!connectionId || !incomingParam) {
      return;
    }
    setVideoCallInvitation({ notification_type: 'video_call_request' });
    setSearchParams({ connectionId });
  }, [connectionId, incomingParam, setSearchParams]);

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

  const sendQuickMessage = (content) => {
    if (!content?.trim()) return;
    const tempId = crypto.randomUUID();
    const outgoing = {
      id: tempId,
      sender_id: user?.id,
      content,
      status: 'sending',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, outgoing]);
    sendMessage(content, tempId);
  };

  const handleSendGift = async (amount) => {
    if (!otherUserId) {
      setError('No recipient selected for gifts.');
      return;
    }
    if (tokenBalance < amount) {
      setError(`You need at least ${amount} tokens to send this gift.`);
      return;
    }
    try {
      const result = await transferTokens({
        recipient_id: otherUserId,
        amount,
        message: `Video gift`,
      });
      setTokenBalance(result.new_balance ?? tokenBalance - amount);
      sendQuickMessage(`🎁 Sent ${amount} tokens to ${otherUserName}`);
    } catch (err) {
      setError(err.message || 'Failed to send gift.');
    }
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
    if (connectionState === 'connected' && isOtherUserOnline) return 'Online now';
    if (connectionState === 'connecting') return 'Reconnecting...';
    if (connectionState === 'connected' && !isOtherUserOnline) {
      return connection?.is_online ? 'Online recently' : 'Offline';
    }
    if (connectionState === 'error' || connectionState === 'disconnected') return 'Disconnected';
    if (connectionState === 'polling') return 'Limited connectivity';
    return connection?.is_online ? 'Online recently' : 'Offline';
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
      <div className="fixed inset-0 flex flex-col" style={{ background: 'radial-gradient(circle at top, rgba(231, 76, 60, 0.08), transparent 55%), radial-gradient(circle at 20% 20%, rgba(243, 156, 18, 0.08), transparent 50%), radial-gradient(circle at 80% 30%, rgba(39, 174, 96, 0.08), transparent 55%), linear-gradient(135deg, #FFF9F5, #F5FFF9)' }}>
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-white/95 backdrop-blur-lg shadow-md z-20">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleGoBack}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Avatar Circle */}
              <button
                type="button"
                onClick={handleNavigateToConnection}
                className="relative h-10 w-10 overflow-hidden rounded-full bg-rose-100 text-white"
              >
                {otherUserImage ? (
                  <img
                    src={otherUserImage}
                    alt={otherUserName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-rose-600">
                    {getInitials(otherUserName)}
                  </span>
                )}
                <span
                  className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                    (isOtherUserOnline || connection?.is_online) ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </button>
              
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{otherUserName}</h2>
                  <ConnectionQualityIndicator 
                    connectionState={connectionState}
                    connectionQuality={connectionQuality}
                  />
                </div>
                <p className="text-xs text-gray-500">{getConnectionText()}</p>
              </div>
            </div>
              <button
                type="button"
                onClick={handleRequestVideoCall}
                className="p-2 rounded-full transition-transform hover:scale-110" style={{ background: 'linear-gradient(135deg, #E74C3C, #F39C12)' }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
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

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
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
                    onClick={handleLoginRedirect}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    Log In
                  </button>
                )}
                {connectionError.userAction === 'goBack' && (
                  <button 
                    onClick={handleGoBack}
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

        {/* Messages Area - Scrollable */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{ overscrollBehavior: 'contain' }}
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
          
          <div className="space-y-3 max-w-4xl mx-auto w-full">
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
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                      isSender 
                        ? 'text-white' 
                        : 'bg-white/95 backdrop-blur-lg text-gray-800 border border-gray-200'
                    }`}
                    style={isSender ? { background: 'linear-gradient(135deg, #E74C3C, #F39C12)' } : {}}
                  >
                    <p className="leading-relaxed">{msg.content}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                      isSender ? 'text-white/80' : 'text-gray-500'
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

        {/* Input Area */}
        <div className="flex-shrink-0 border-t bg-white/95 backdrop-blur-lg shadow-sm z-20">
          <div className="flex gap-2 px-4 py-3 max-w-4xl mx-auto">
            <input
              value={inputText}
              onChange={(event) => handleTyping(event.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-gray-50"
              style={{ focusRingColor: '#E74C3C' }}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="px-5 py-2.5 text-white text-sm font-medium rounded-full transition hover:scale-105 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #E74C3C, #F39C12)' }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Video Call Invitation Modal */}
      {videoCallInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-3xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Incoming Video Call</h3>
            <p className="text-gray-600 mb-4">{otherUserName} is calling you</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setVideoCallInvitation(null);
                  setIsIncomingCall(true);
                  setShowVideoCall(true);
                }}
                className="flex-1 text-white px-3 py-2 rounded-full font-semibold text-sm hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #27AE60, #F39C12)' }}
              >
                Accept
              </button>
              <button
                onClick={() => setVideoCallInvitation(null)}
                className="flex-1 text-white px-3 py-2 rounded-full font-semibold text-sm hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #E74C3C, #2C3E50)' }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call Component */}
      {showVideoCall && peerRef.current && (
        <VideoCall
          userId={user?.id}
          connectionId={connectionId}
          remotePeerId={otherUserId}
          tokenBalance={tokenBalance}
          peer={peerRef.current}
            isIncoming={isIncomingCall}
            autoStart={!isIncomingCall}
            autoAnswer={isIncomingCall}
            messages={messages}
            onSendMessage={sendQuickMessage}
            onSendGift={handleSendGift}
            giftOptions={giftOptions}
            otherUserName={otherUserName}
            onClose={() => {
              setShowVideoCall(false);
              setIsIncomingCall(false);
              getTokenBalance().then(data => setTokenBalance(data.balance));
            }}
          />
        )}
    </ChatErrorBoundary>
  );
};

export default Chat;
