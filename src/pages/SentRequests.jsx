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
    <div className="mobile-container bg-premium-mesh relative pt-[env(safe-area-inset-top,0px)] pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
      <div className="relative z-10 px-4 py-8">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 bg-clip-text text-transparent mb-6">
            Sent Requests
          </h1>

          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner label="Loading requests..." />
            </div>
          )}
          
          {error && (
            <div className="glass-card rounded-2xl px-6 py-4 text-red-600 mb-6">
              {error}
            </div>
          )}

          {!loading && sentRequests.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">📤</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Sent Requests</h3>
              <p className="text-gray-600">You haven't sent any connection requests yet.</p>
            </div>
          )}

          <div className="space-y-4">
            {sentRequests.map((request) => {
              const timeData = getDaysRemaining(request.expires_at);
              const daysRemaining = timeData?.daysRemaining || 0;
              const progress = timeData?.progress || 0;
              
              return (
                <div key={request.id} className="glass-card rounded-2xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {request.full_name}
                      </h3>
                      <p className="text-gray-600 mb-2">
                        {request.gender}, {request.age} years old
                      </p>
                      
                      {request.message && (
                        <div className="bg-gray-50 rounded-xl p-3 mb-3">
                          <p className="text-sm text-gray-700 italic">"{request.message}"</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending' 
                            ? 'bg-amber-100 text-amber-700'
                            : request.status === 'accepted'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {request.status === 'pending' ? '⏳ Pending' : 
                           request.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                        </span>
                        
                        {timeData && request.status === 'pending' && (
                          <span>
                            Expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      
                      {timeData && request.status === 'pending' && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full transition-all duration-300"
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
                        className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentRequests;
