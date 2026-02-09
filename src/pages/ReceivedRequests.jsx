// src/pages/ReceivedRequests.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  acceptConnectionRequest,
  getReceivedRequests,
  getTokenBalance,
  rejectConnectionRequest,
} from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StickyNav from '../components/StickyNav.jsx';

const ReceivedRequests = () => {
  const { user, updateUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReceivedRequests();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    try {
      const data = await getTokenBalance();
      setTokenBalance(data.balance);
      if (user) {
        updateUser({ ...user, token_balance: data.balance });
      }
    } catch (err) {
      // Ignore balance refresh errors.
    }
  };

  useEffect(() => {
    loadRequests();
    refreshBalance();
  }, []);

  const handleAccept = async (requestId) => {
    setProcessingId(requestId);
    setError('');
    try {
      await acceptConnectionRequest(requestId);
      await Promise.all([loadRequests(), refreshBalance()]);
    } catch (err) {
      setError(err.message || 'Failed to accept request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    const confirmed = window.confirm('Reject this connection request?');
    if (!confirmed) {
      return;
    }

    setProcessingId(requestId);
    setError('');
    try {
      await rejectConnectionRequest(requestId);
      await Promise.all([loadRequests(), refreshBalance()]);
    } catch (err) {
      setError(err.message || 'Failed to reject request.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-28 text-slate-900" style={{ background: 'radial-gradient(circle at top, rgba(231, 76, 60, 0.08), transparent 55%), radial-gradient(circle at 20% 20%, rgba(243, 156, 18, 0.08), transparent 50%), radial-gradient(circle at 80% 30%, rgba(39, 174, 96, 0.08), transparent 55%), linear-gradient(135deg, #FFF9F5, #F5FFF9)' }}>
      <StickyNav title="Received Requests" tokenBalance={tokenBalance} />
      
      <div className="mx-auto w-full max-w-3xl bg-white/95 backdrop-blur-lg border border-gray-200 rounded-3xl p-6 shadow-xl mt-6">
        <p className="mt-2 text-sm text-slate-500">Accepting a request costs 5 tokens.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700">
            {error}
            {error.toLowerCase().includes('insufficient') && (
              <span className="ml-2">
                <Link to="/tokens" className="font-semibold text-rose-600">
                  Buy tokens
                </Link>
              </span>
            )}
          </div>
        )}

        {loading && (
          <div className="mt-6">
            <LoadingSpinner label="Loading..." />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No pending requests.</p>
        )}

        <div className="mt-6 space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {request.full_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {request.gender}, {request.age} years old
                  </p>
                  {request.message && (
                    <p className="mt-2 text-sm text-slate-600">“{request.message}”</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(request.id)}
                    disabled={processingId === request.id}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white hover:scale-105 transition-transform disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #27AE60, #F39C12)' }}
                  >
                    Accept (5 tokens)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="rounded-full bg-white border border-gray-200 px-4 py-2 text-sm font-semibold hover:scale-105 transition-transform disabled:opacity-60" style={{ color: '#E74C3C' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReceivedRequests;
