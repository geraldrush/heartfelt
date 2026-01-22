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
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Connections</h1>
            <p className="text-xs text-gray-500">
              {connections.length} connection{connections.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border text-xs text-gray-600">
            {balance ?? '...'} tokens
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg p-4 shadow-sm border">
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
              className="inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition"
            >
              Explore Stories
            </Link>
          </div>
        )}

        <div className="space-y-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <h2 className="text-sm font-medium text-gray-900 mb-1">Recent Chats</h2>
            <p className="text-xs text-gray-500 mb-3">Your conversations</p>
            <ChatList />
          </div>
          
          {connections.map((connection) => (
            <div key={connection.id} className="bg-white rounded-lg p-4 shadow-sm border">
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
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition"
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
                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition"
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
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Amount"
                  />
                  <input
                    type="text"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Message (optional)"
                  />
                  {status && (
                    <p className="text-xs text-gray-500">{status}</p>
                  )}
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition"
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
  );
};

export default Connections;
