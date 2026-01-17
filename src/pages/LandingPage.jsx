// src/pages/LandingPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserFriends, faUserCheck, faUsers, faCoins } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext.jsx';
import { getConnectionCounts, getTokenBalance } from '../utils/api.js';
import TokenSparkle from '../components/animations/TokenSparkle.jsx';

const MotionLink = motion.create(Link);

const LandingPage = () => {
  const { user } = useAuth();
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [connectionCounts, setConnectionCounts] = useState({
    sent_requests: 0,
    received_requests: 0,
    total_connections: 0,
  });
  const [error, setError] = useState('');

  const fetchBalance = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTokenBalance();
      setTokenBalance(data.balance);
    } catch (err) {
      setError(err.message || 'Unable to load token balance.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    setCountsLoading(true);
    setError('');
    try {
      const data = await getConnectionCounts();
      setConnectionCounts(data);
    } catch (err) {
      setError(err.message || 'Unable to load connection counts.');
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchCounts();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchBalance();
        fetchCounts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const sentRequests = countsLoading ? '...' : connectionCounts.sent_requests;
  const receivedRequests = countsLoading ? '...' : connectionCounts.received_requests;
  const totalConnections = countsLoading ? '...' : connectionCounts.total_connections;
  const displayName = user?.full_name || 'there';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-romantic-gradient px-4 pb-24 pt-10 text-center text-white">
      <h1 className="mb-4 text-3xl font-bold md:text-5xl">Welcome, {displayName}!</h1>

      <div className="mb-6 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <MotionLink
          to="/sent-requests"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white/90 p-4 text-rose-600 shadow-lg transition hover:bg-white"
        >
          <FontAwesomeIcon icon={faUserCheck} />
          <span className="text-lg">{sentRequests}</span>
        </MotionLink>
        <MotionLink
          to="/received-requests"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white/90 p-4 text-rose-600 shadow-lg transition hover:bg-white"
        >
          <FontAwesomeIcon icon={faUserFriends} />
          <span className="text-lg">{receivedRequests}</span>
        </MotionLink>
        <MotionLink
          to="/connections"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white/90 p-4 text-rose-600 shadow-lg transition hover:bg-white"
        >
          <FontAwesomeIcon icon={faUsers} />
          <span className="text-lg">{totalConnections}</span>
        </MotionLink>
        <MotionLink
          to="/tokens"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white/90 p-4 text-rose-600 shadow-lg transition hover:bg-white"
        >
          <FontAwesomeIcon icon={faCoins} />
          <span className="text-lg">
            {loading ? '...' : <TokenSparkle value={tokenBalance ?? 0} />}
          </span>
        </MotionLink>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <motion.button
        type="button"
        onClick={() => {
          fetchBalance();
          fetchCounts();
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mb-6 rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-rose-600 shadow-md transition hover:bg-white"
      >
        Refresh dashboard
      </motion.button>

      <div className="flex w-full max-w-lg flex-col space-y-4">
        <MotionLink
          to="/stories"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:from-rose-500 hover:to-pink-500"
        >
          Explore Stories
        </MotionLink>
        <MotionLink
          to="/profile"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-2xl bg-white/90 py-3 text-center text-sm font-semibold text-rose-600 shadow-lg transition hover:bg-white"
        >
          View User Profile
        </MotionLink>
      </div>

      <footer className="mt-10 text-sm text-white/80">
        © {new Date().getFullYear()} Heartfelt Connections. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
