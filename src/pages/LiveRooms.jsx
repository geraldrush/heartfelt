import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLiveRoom, getLiveRooms, joinLiveRoom } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const LiveRooms = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

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
      navigate(`/live/${room.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create live room.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (roomId) => {
    try {
      await joinLiveRoom(roomId);
      navigate(`/live/${roomId}`);
    } catch (err) {
      setError(err.message || 'Failed to join live room.');
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-premium-mesh px-4 pb-24 pt-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Live Rooms</p>
            <h1 className="text-2xl font-semibold text-slate-900">Join a live moment</h1>
          </div>
          <button
            type="button"
            onClick={loadRooms}
            className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-white/90 px-4 py-3 text-xs text-red-600 shadow">
            {error}
          </div>
        )}

        <div className="glass-card rounded-3xl p-5 shadow-xl">
          <p className="text-sm font-semibold text-slate-900">Host a live room</p>
          <p className="mt-1 text-xs text-slate-500">Start a live session and let viewers join.</p>
          <div className="mt-4 grid gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Live room title"
              className="premium-input"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What’s this live about?"
              className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="premium-button w-full disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Go Live'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Live right now</h2>
          {loading ? (
            <LoadingSpinner label="Loading rooms..." />
          ) : rooms.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-8 text-center text-sm text-slate-600 shadow">
              No live rooms yet. Start one and invite others to join.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rooms.map((room) => (
                <div key={room.id} className="glass-card rounded-3xl p-5 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{room.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Hosted by {room.host_name || 'Host'}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Live
                    </span>
                  </div>
                  {room.description && (
                    <p className="mt-3 text-sm text-slate-600">{room.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      👥 {room.viewer_count ?? 0} watching
                    </span>
                    <button
                      type="button"
                      onClick={() => handleJoin(room.id)}
                      className="premium-button px-4 py-2 text-xs"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveRooms;
