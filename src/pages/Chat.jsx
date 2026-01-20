// src/pages/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  createTokenRequest,
  getConnections,
  getMessages,
  getTokenRequests,
} from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

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
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showTokenRequest, setShowTokenRequest] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [tokenRequests, setTokenRequests] = useState([]);

  const listRef = useRef(null);
  const topSentinelRef = useRef(null);
  const typingTimeout = useRef(null);
  const messageRefs = useRef(new Map());
  const readSent = useRef(new Set());

  const otherUserId = connection?.other_user_id;
  const otherUserName = connection?.full_name || 'Connection';

  if (!connectionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white px-6 py-8 text-center text-sm text-slate-600 shadow">
          Select a connection to start chatting.
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
  } = useWebSocket({
    connectionId,
    onMessage: (data) => {
      setMessages((prev) => [...prev, data]);
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
  });

  const loadConnection = async () => {
    if (!connectionId) {
      return;
    }
    try {
      const data = await getConnections();
      const found = data.connections?.find((item) => item.id === connectionId);
      setConnection(found || null);
    } catch (err) {
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
      const ordered = [...(data.messages || [])].reverse();
      setMessages((prev) => (reset ? ordered : [...ordered, ...prev]));
      setHasMore((data.messages || []).length === 50);
      setOffset((prev) => prev + (data.messages || []).length);

      if (reset) {
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        }, 0);
      }
    } catch (err) {
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
    setMessages((prev) => [...prev, outgoing]);
    sendMessage(inputText.trim(), tempId);
    setInputText('');
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 0);
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-rose-50 via-pink-50 to-peach-100 pb-24">
      <div className="border-b bg-white/90 px-6 py-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Chatting with</p>
            <h2 className="text-2xl font-semibold text-slate-900">{otherUserName}</h2>
            <p className="text-xs text-slate-500">
              {isOtherUserOnline ? 'Online' : 'Offline'} • 
              <span className={`${
                connectionState === 'connected' ? 'text-green-600' : 
                connectionState === 'connecting' ? 'text-yellow-600' : 
                connectionState === 'error' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {connectionState === 'connected' ? 'Connected' :
                 connectionState === 'connecting' ? 'Connecting...' :
                 connectionState === 'error' ? 'Connection Error' : 'Disconnected'}
              </span>
            </p>
          </div>
          <motion.button
            type="button"
            onClick={() => setShowTokenRequest((prev) => !prev)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:from-rose-500 hover:to-pink-500"
          >
            {showTokenRequest ? 'Close Token Request' : 'Request Tokens'}
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {connectionState === 'error' && (
        <div className="mx-6 mt-4 rounded-xl bg-yellow-100 px-4 py-3 text-sm text-yellow-700">
          Unable to connect to chat. Please check your connection and try refreshing the page.
        </div>
      )}

      {showTokenRequest && (
        <div className="mx-6 mt-4 rounded-xl bg-white p-4 shadow">
          <p className="text-sm font-semibold text-slate-900">Request Tokens</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="1"
              value={requestAmount}
              onChange={(event) => setRequestAmount(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
              placeholder="Amount"
            />
            <input
              type="text"
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
              placeholder="Reason (optional)"
            />
          </div>
          <motion.button
            type="button"
            onClick={handleRequestTokens}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-rose-500 hover:to-pink-500"
          >
            Send Request
          </motion.button>

          {sortedTokenRequests.length > 0 && (
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              {sortedTokenRequests.map((req) => (
                <p key={req.id}>Requested {req.amount} tokens · {req.status}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-4"
      >
        {loading && <LoadingSpinner label="Loading messages..." className="justify-start" />}

        <div ref={topSentinelRef} className="h-4" />
        {!loading && messages.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={emptyIcon}
              title="No Messages"
              description="Send a message to start the conversation!"
            />
          </div>
        )}
        <div className="space-y-3">
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
                  className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow ${
                    isSender ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  <p>{msg.content}</p>
                  <div className="mt-1 flex items-center justify-end gap-2 text-xs text-white/70">
                    <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                    {isSender && <span>{statusIcon(msg.status)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isOtherUserTyping && (
          <p className="mt-4 text-xs text-slate-500">{otherUserName} is typing...</p>
        )}
      </div>

      <div className="border-t bg-white px-6 py-4">
        <div className="flex gap-3">
          <input
            value={inputText}
            onChange={(event) => handleTyping(event.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
          />
          <motion.button
            type="button"
            onClick={handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:from-rose-500 hover:to-pink-500"
          >
            Send
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
