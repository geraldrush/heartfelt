// src/pages/Connections.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getConnections, getTokenBalance, transferTokens } from '../utils/api.js';
import ChatList from '../components/ChatList.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StickyNav from '../components/StickyNav.jsx';

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

    const confirmed = window.confirm(`Send ${numericAmount} tokens${message ? ` with message: "${message}"` : ''}?`);
    if (!confirmed) return;

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

  return (
    <div className="min-h-screen pb-[calc(100px+env(safe-area-inset-bottom,0px))] md:pb-8" style={{ background: 'radial-gradient(circle at top, rgba(231, 76, 60, 0.08), transparent 55%), radial-gradient(circle at 20% 20%, rgba(243, 156, 18, 0.08), transparent 50%), radial-gradient(circle at 80% 30%, rgba(39, 174, 96, 0.08), transparent 55%), linear-gradient(135deg, #FFF9F5, #F5FFF9)' }}>
      <StickyNav title="Connections" tokenBalance={balance} />
      
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500">
                {connections.length} connection{connections.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {loading && (
            <div className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-3xl p-4 shadow-xl">
              <LoadingSpinner label="Loading connections..." />
            </div>
          )}

          {!loading && connections.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Connections Yet</h3>
              <p className="text-xs text-gray-500 mb-4">Start swiping to find your match!</p>
              <Link
                to="/stories"
                className="inline-block px-4 py-2 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white text-xs font-medium rounded-full transition hover:scale-105"
              >
                Explore Stories
              </Link>
            </div>
          )}

          <div className="space-y-3">
            <div className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-3xl p-4 shadow-xl">
              <h2 className="text-sm font-medium text-gray-900 mb-1">Recent Chats</h2>
              <p className="text-xs text-gray-500 mb-3">Your conversations</p>
              <ChatList />
            </div>
            
            {connections.map((connection) => (
              <div key={connection.id} className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-3xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {connection.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {connection.gender}, {connection.age} • {connection.location_city}
                    </p>
                    <p className="text-xs text-gray-400">
                      Connected {new Date(connection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/chat?connectionId=${connection.id}&userId=${connection.other_user_id}`}
                      className="px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#F39C12] text-white text-xs font-medium rounded-full transition hover:scale-105"
                    >
                      Message
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveConnectionId((prev) =>
                          prev === connection.id ? null : connection.id
                        )
                      }
                      className="px-3 py-1.5 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white text-xs font-medium rounded-full transition hover:scale-105"
                    >
                      Send Tokens
                    </button>
                  </div>
                </div>

                {activeConnectionId === connection.id && (
                  <form
                    onSubmit={(event) => handleTransfer(event, connection.other_user_id)}
                    className="space-y-2 pt-3 border-t border-gray-100"
                  >
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-[#E74C3C] focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/20"
                      placeholder="Amount"
                    />
                    <input
                      type="text"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-[#E74C3C] focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/20"
                      placeholder="Message (optional)"
                    />
                    {status && (
                      <p className="text-xs text-gray-500">{status}</p>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white text-xs font-medium rounded-full transition hover:scale-105"
                    >
                      Confirm Transfer
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connections;
