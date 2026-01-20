// src/pages/SentRequests.jsx
import React, { useEffect, useState } from 'react';
import { cancelConnectionRequest, getSentRequests, getTokenBalance } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const SentRequests = () => {
  const { user, updateUser } = useAuth();
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSentRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSentRequests();
      setSentRequests(data.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load sent requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSentRequests();
  }, []);

  const refreshBalance = async () => {
    try {
      const data = await getTokenBalance();
      if (user) {
        updateUser({ ...user, token_balance: data.balance });
      }
    } catch (err) {
      // Ignore balance refresh errors.
    }
  };

  const handleCancel = async (request) => {
    const confirmed = window.confirm('Cancel this request? You will be refunded 5 tokens.');
    if (!confirmed) {
      return;
    }

    try {
      await cancelConnectionRequest(request.id);
      await Promise.all([loadSentRequests(), refreshBalance()]);
    } catch (err) {
      setError(err.message || 'Failed to cancel request.');
    }
  };

  const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) {
      return null;
    }
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const totalDays = 7; // Assuming 7-day expiry
    const daysRemaining = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
    const progress = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));
    
    return { daysRemaining, progress };
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-rose-100 via-pink-50 to-peach-100 p-4 pb-28 text-slate-900">
      <h1 className="mb-6 text-3xl font-bold text-rose-700">Sent Connection Requests</h1>

      <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-md">
        {loading && <LoadingSpinner label="Loading..." />}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && sentRequests.length === 0 && (
          <p className="text-gray-600">No sent requests yet.</p>
        )}

        {sentRequests.map((request) => {
          const timeData = getDaysRemaining(request.expires_at);
          const daysRemaining = timeData?.daysRemaining || 0;
          const progress = timeData?.progress || 0;
          
          return (
            <div
              key={request.id}
              className="flex flex-col gap-3 border-b border-gray-200 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-2">
                <span className="font-semibold">{request.full_name}</span>
                <span className="text-gray-600">
                  {request.gender}, {request.age} years old
                </span>
                <span className="text-xs text-gray-500">
                  Status: {request.status}
                </span>
                {timeData && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">
                      Expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}
                    </span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {request.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleCancel(request)}
                  className="rounded bg-rose-500 px-4 py-2 text-white transition hover:bg-rose-600 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          );
        })}}
      </div>
    </div>
  );
};

export default SentRequests;
