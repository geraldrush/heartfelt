// src/pages/LandingPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserFriends, faUserCheck, faUsers, faCoins } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext.jsx';
import { getConnectionCounts, getTokenBalance } from '../utils/api.js';

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 text-white text-center p-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">Welcome, {displayName}!</h1>

      <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-lg">
        <Link to="/sent-requests" className="bg-white text-blue-500 flex items-center justify-center p-4 rounded-lg shadow-md hover:bg-gray-100 transition">
          <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
          <span className="text-lg">{sentRequests}</span>
        </Link>
        <Link to="/received-requests" className="bg-white text-blue-500 flex items-center justify-center p-4 rounded-lg shadow-md hover:bg-gray-100 transition">
          <FontAwesomeIcon icon={faUserFriends} className="mr-2" />
          <span className="text-lg">{receivedRequests}</span>
        </Link>
        <Link to="/connections" className="bg-white text-blue-500 flex items-center justify-center p-4 rounded-lg shadow-md hover:bg-gray-100 transition">
          <FontAwesomeIcon icon={faUsers} className="mr-2" />
          <span className="text-lg">{totalConnections}</span>
        </Link>
        <Link to="/tokens" className="bg-white text-blue-500 flex items-center justify-center p-4 rounded-lg shadow-md hover:bg-gray-100 transition">
          <FontAwesomeIcon icon={faCoins} className="mr-2" />
          <span className="text-lg">
            {loading ? '...' : tokenBalance ?? 0}
          </span>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          fetchBalance();
          fetchCounts();
        }}
        className="mb-6 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-md transition hover:bg-gray-100"
      >
        Refresh dashboard
      </button>

      <div className="flex flex-col space-y-4 w-full max-w-lg">
        <Link to="/stories" className="bg-white text-blue-500 py-3 rounded-lg shadow-md hover:bg-gray-100 transition text-center">
          Explore Stories
        </Link>
        <Link to="/profile" className="bg-white text-blue-500 py-3 rounded-lg shadow-md hover:bg-gray-100 transition text-center">
          View User Profile
        </Link>
      </div>

      <footer className="mt-10">
        <p className="text-sm">© {new Date().getFullYear()} Heartfelt Connections. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
