import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getConnectionProfile } from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const ConnectionProfile = () => {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getConnectionProfile(connectionId);
        setProfile(data.profile);
      } catch (err) {
        setError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    if (connectionId) {
      loadProfile();
    }
  }, [connectionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-premium-mesh flex items-center justify-center">
        <LoadingSpinner label="Loading profile..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-premium-mesh flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-6 text-center text-sm text-slate-600">
          {error || 'Profile not available.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-premium-mesh pb-[calc(100px+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
        >
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-[28px] border border-white/60 bg-white/90 shadow-xl overflow-hidden"
        >
          <div className="relative h-72">
            {profile.image_url ? (
              <img
                src={profile.image_url}
                alt={profile.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-rose-100 to-emerald-100" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-2xl font-semibold">{profile.full_name}</h1>
              <p className="text-sm text-white/90">
                {profile.age} • {profile.gender} • {profile.location_city}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {[profile.religion, profile.race, profile.education].filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                  {tag}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-50 px-3 py-1">👶 {profile.has_kids ? `${profile.num_kids} kids` : 'No kids'}</span>
              <span className="rounded-full bg-slate-50 px-3 py-1">{profile.smoker ? '🚬 Smoker' : '🚭 Non-smoker'}</span>
              <span className="rounded-full bg-slate-50 px-3 py-1">{profile.drinks_alcohol ? '🍷 Drinks' : '🚫 No alcohol'}</span>
              <span className="rounded-full bg-slate-50 px-3 py-1">{profile.nationality || 'Nationality'}</span>
            </div>

            {profile.story_text && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed">
                {profile.story_text}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConnectionProfile;
