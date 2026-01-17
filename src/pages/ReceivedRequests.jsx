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

const ReceivedRequests = () => {
  const { user, updateUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);

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
      if (user) {
        updateUser({ ...user, token_balance: data.balance });
      }
    } catch (err) {
      // Ignore balance refresh errors.
    }
  };

  useEffect(() => {
    loadRequests();
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
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Received Requests</h1>
        <p className="mt-2 text-sm text-slate-500">Accepting a request costs 3 tokens.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
            {error.toLowerCase().includes('insufficient') && (
              <span className="ml-2">
                <Link to="/tokens" className="font-semibold text-blue-600">
                  Buy tokens
                </Link>
              </span>
            )}
          </div>
        )}

        {loading && <p className="mt-6 text-sm text-slate-500">Loading...</p>}

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
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Accept (3 tokens)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-60"
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
