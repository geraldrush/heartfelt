// src/pages/Connections.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getConnections, getTokenBalance, transferTokens } from '../utils/api.js';
import ChatList from '../components/ChatList.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const MotionLink = motion.create(Link);

const Connections = () => {
  const [connections, setConnections] = useState([]);
  const [activeConnectionId, setActiveConnectionId] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const data = await getConnections();
      setConnections(data.connections || []);
    } catch (error) {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const data = await getTokenBalance();
      setBalance(data.balance);
    } catch (error) {
      setBalance(null);
    }
  };

  useEffect(() => {
    loadConnections();
    loadBalance();
  }, []);

  const handleTransfer = async (event, recipientId) => {
    event.preventDefault();
    setStatus('');
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setStatus('Enter a valid amount.');
      return;
    }

    if (balance !== null && numericAmount > balance) {
      setStatus('Amount exceeds your balance.');
      return;
    }

    try {
      await transferTokens({
        recipient_id: recipientId,
        amount: numericAmount,
        message: message || undefined,
      });
      setStatus('Tokens sent successfully.');
      setAmount('');
      setMessage('');
      await loadBalance();
      setActiveConnectionId(null);
    } catch (error) {
      setStatus(error.message || 'Transfer failed.');
    }
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
      <path d="M20 22c-5 0-9 4-9 9 0 6 6 12 14 18l7 5 7-5c8-6 14-12 14-18 0-5-4-9-9-9-4 0-7 2-9 5-2-3-5-5-9-5z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-peach-100 p-6 pb-24">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Your Connections</h1>
            <p className="mt-1 text-sm text-slate-600">
              {connections.length} connection{connections.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-xl bg-white/90 px-4 py-2 text-sm text-slate-600 shadow">
            Balance: {balance ?? '...'} tokens
          </div>
        </div>

        {loading && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <LoadingSpinner label="Loading connections..." />
          </div>
        )}

        {!loading && connections.length === 0 && (
          <div className="mt-8">
            <EmptyState
              icon={emptyIcon}
              title="No Connections Yet"
              description="Start swiping to find your match!"
              actionButton={(
                <MotionLink
                  to="/stories"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:from-rose-500 hover:to-pink-500"
                >
                  Explore Stories
                </MotionLink>
              )}
            />
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-slate-900">Chats</h2>
            <p className="mt-1 text-xs text-slate-500">Recent conversations</p>
            <div className="mt-4">
              <ChatList />
            </div>
          </div>
          {connections.map((connection) => (
            <div key={connection.id} className="rounded-2xl bg-white p-6 shadow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {connection.full_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {connection.gender}, {connection.age} years old
                  </p>
                  <p className="text-xs text-slate-500">{connection.location_city}</p>
                  <p className="text-xs text-slate-400">
                    Connected {new Date(connection.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <MotionLink
                    to={`/chat?connectionId=${connection.id}&userId=${connection.other_user_id}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Message
                  </MotionLink>
                  <motion.button
                    type="button"
                    onClick={() =>
                      setActiveConnectionId((prev) =>
                        prev === connection.id ? null : connection.id
                      )
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-rose-500 hover:to-pink-500"
                  >
                    Send Tokens
                  </motion.button>
                </div>
              </div>

              {activeConnectionId === connection.id && (
                <form
                  onSubmit={(event) => handleTransfer(event, connection.other_user_id)}
                  className="mt-4 space-y-3"
                >
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                    placeholder="Amount"
                  />
                  <input
                    type="text"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                    placeholder="Message (optional)"
                  />
                  {status && (
                    <p className="text-xs text-slate-500">{status}</p>
                  )}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Confirm Transfer
                  </motion.button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Connections;
