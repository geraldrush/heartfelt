// src/pages/LandingPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { faUserCheck, faUserFriends, faUsers, faCoins } from '@fortawesome/free-solid-svg-icons';
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
    <div className="app-shell">
      <main className="app-content flex flex-col items-center justify-center gap-6 py-10 text-center text-slate-900">
        <h1 className="display-font text-4xl font-bold leading-tight md:text-5xl">
          Welcome back, {displayName}.
        </h1>
        <p className="text-sm text-slate-500 md:text-base">
          Track your connections, keep tokens available, and discover meaningful matches.
        </p>

        <div className="w-full rounded-[24px] border border-slate-100 bg-white/90 px-4 py-3 shadow-md sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
            Dashboard
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[[
              'Sent Requests',
              sentRequests,
              '/sent-requests',
              faUserCheck,
              'text-rose-500',
            ], [
              'Received Requests',
              receivedRequests,
              '/received-requests',
              faUserFriends,
              'text-rose-500',
            ], [
              'Connections',
              totalConnections,
              '/connections',
              faUsers,
              'text-rose-500',
            ], [
              'Tokens',
              loading ? '...' : <TokenSparkle value={tokenBalance ?? 0} />,
              '/tokens',
              faCoins,
              'text-rose-500',
            ]].map(([label, value, to, icon, colorClass]) => (
              <MotionLink
                key={label}
                to={to}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 transition ${colorClass}`}
              >
                <span>{label}</span>
                <span className="text-lg text-slate-900">{value}</span>
              </MotionLink>
            ))}
          </div>
        </div>

        {error && (
          <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <motion.button
          type="button"
          onClick={() => {
            fetchBalance();
            fetchCounts();
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary"
        >
          Refresh dashboard
        </motion.button>

        <div className="w-full max-w-lg space-y-3">
          <MotionLink
            to="/stories"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-2xl border border-rose-100 bg-rose-500/90 px-6 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-600"
          >
            Explore Stories
          </MotionLink>
          <MotionLink
            to="/profile"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-rose-200"
          >
            View User Profile
          </MotionLink>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">
          © {new Date().getFullYear()} Heartfelt Connections
        </p>
      </main>
    </div>
  );
};

export default LandingPage;
