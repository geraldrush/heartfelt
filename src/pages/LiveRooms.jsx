import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createLiveRoom, getLiveRooms, joinLiveRoom, getTokenBalance } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StickyNav from '../components/StickyNav.jsx';

const LiveRooms = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [tokenBalance, setTokenBalance] = useState(null);

  const loadRooms = async () => {
    try {
      const data = await getLiveRooms();
      setRooms(data.rooms || []);
    } catch (err) {
      setError(err.message || 'Failed to load live rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    const fetchBalance = async () => {
      try {
        const data = await getTokenBalance();
        setTokenBalance(data.balance);
      } catch (err) {
        console.error('Failed to load token balance:', err);
      }
    };
    fetchBalance();
    const interval = setInterval(loadRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please add a title for your live room.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const data = await createLiveRoom({ title: title.trim(), description: description.trim() });
      const room = data.room;
      setTitle('');
      setDescription('');
      setShowCreateForm(false);
      navigate(`/live/${room.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create live room.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (roomId) => {
    try {
      const response = await joinLiveRoom(roomId);
      if (response.status === 'pending') {
        setError('Join request sent! Waiting for host approval...');
        setTimeout(() => setError(''), 3000);
      } else if (
        response.success ||
        response.status === 'joined' ||
        response.status === 'approved' ||
        response.status === 'host'
      ) {
        navigate(`/live/${roomId}`);
      } else {
        setError('Failed to join live room.');
      }
    } catch (err) {
      setError(err.message || 'Failed to join live room.');
    }
  };

  return (
    <div className="mobile-container min-h-screen" style={{ background: 'radial-gradient(circle at top, rgba(231, 76, 60, 0.08), transparent 55%), radial-gradient(circle at 20% 20%, rgba(243, 156, 18, 0.08), transparent 50%), radial-gradient(circle at 80% 30%, rgba(39, 174, 96, 0.08), transparent 55%), linear-gradient(135deg, #FFF9F5, #F5FFF9)' }}>
      <StickyNav title="Live Rooms" tokenBalance={tokenBalance} />

      <div className="px-4 py-6 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Connect with others in real-time</p>
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white rounded-full text-sm font-semibold shadow-lg hover:scale-105 transition-transform"
          >
            + Go Live
          </button>
        </div>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-3xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Start Your Live Session</h2>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Let's chat about relationships"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what this live is about..."
                  rows={3}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="w-full py-3 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white rounded-2xl font-semibold shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {creating ? 'Starting Live...' : '🎥 Start Live Now'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Info Card */}
        <div className="bg-gradient-to-br from-orange-50 to-green-50 rounded-3xl p-6 border border-orange-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E74C3C] to-[#F39C12] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">How Live Rooms Work</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Host a live session and invite your followers</li>
                <li>• Join active rooms to connect with others</li>
                <li>• Chat in real-time with participants</li>
                <li>• Build meaningful connections through conversation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Active Rooms */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">🔴 Live Now</h2>
            <button
              type="button"
              onClick={loadRooms}
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: '#E74C3C' }}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Live Rooms Yet</h3>
              <p className="text-sm text-gray-500 mb-4">Be the first to start a live session!</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-2 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white rounded-full text-sm font-semibold shadow-lg hover:scale-105 transition-transform"
              >
                Start Live Room
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-3xl p-5 shadow-xl hover:shadow-2xl transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-semibold text-red-600 uppercase">Live</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{room.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Hosted by {room.host_name || 'Anonymous'}
                      </p>
                    </div>
                  </div>
                  {room.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{room.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        {room.viewer_count ?? 0} watching
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleJoin(room.id)}
                      className="px-6 py-2 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white rounded-full text-sm font-semibold shadow-lg hover:scale-105 transition-transform"
                    >
                      Join Room
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveRooms;
