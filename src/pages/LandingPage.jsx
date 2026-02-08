// src/pages/LandingPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { faUserCheck, faUserFriends, faUsers, faCoins } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext.jsx';
import { getConnectionCounts, getTokenBalance, getTokenRequests, getUnreadCounts } from '../utils/api.js';
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
  const [unreadChats, setUnreadChats] = useState(0);
  const [pendingTokenRequests, setPendingTokenRequests] = useState(0);
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

  const fetchNotifications = async () => {
    try {
      const [unread, tokenReqs] = await Promise.all([
        getUnreadCounts(),
        getTokenRequests(),
      ]);
      const unreadTotal = (unread.counts || []).reduce((sum, item) => sum + (item.unread_count || 0), 0);
      const pendingTokens = (tokenReqs.requests || []).filter((req) => req.status === 'pending').length;
      setUnreadChats(unreadTotal);
      setPendingTokenRequests(pendingTokens);
    } catch (err) {
      setUnreadChats(0);
      setPendingTokenRequests(0);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchCounts();
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchBalance();
        fetchCounts();
        fetchNotifications();
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
    <div className="app-shell pb-[calc(120px+env(safe-area-inset-bottom,0px))] md:pb-0 overflow-y-auto">
      <main className="app-content flex w-full flex-col items-center gap-6 py-10 text-slate-900 min-h-screen">
        <div className="w-full rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 md:text-4xl">
            Welcome back, {displayName}.
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Track your connections, keep tokens ready, and discover meaningful matches.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <MotionLink
              to="/stories"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 rounded-2xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"
            >
              Discover Stories
            </MotionLink>
            <MotionLink
              to="/profile"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-200"
            >
              View Profile
            </MotionLink>
          </div>
        </div>

        <div className="w-full grid gap-3 sm:grid-cols-2">
          {[[
            'Sent Requests',
            sentRequests,
            '/sent-requests',
          ], [
            'Received Requests',
            receivedRequests,
            '/received-requests',
          ], [
            'Connections',
            totalConnections,
            '/connections',
          ], [
            'Tokens',
            loading ? '...' : <TokenSparkle value={tokenBalance ?? 0} />,
            '/tokens',
          ]].map(([label, value, to]) => (
            <MotionLink
              key={label}
              to={to}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-2xl border border-slate-100 bg-white/90 px-5 py-4 shadow-md transition hover:shadow-lg"
            >
              {label === 'Received Requests' && Number(receivedRequests) > 0 && (
                <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white">
                  {receivedRequests}
                </span>
              )}
              {label === 'Connections' && unreadChats > 0 && (
                <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white">
                  {unreadChats} new
                </span>
              )}
              {label === 'Tokens' && pendingTokenRequests > 0 && (
                <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white">
                  {pendingTokenRequests} req
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</p>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
              <p className="mt-2 text-[11px] text-slate-500">Tap to open</p>
            </MotionLink>
          ))}
        </div>

        {error && (
          <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <motion.button
          type="button"
          onClick={() => {
            fetchBalance();
            fetchCounts();
            fetchNotifications();
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          Refresh dashboard
        </motion.button>

        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">
          © {new Date().getFullYear()} Heartfelt Connections
        </p>
      </main>
    </div>
  );
};

export default LandingPage;
