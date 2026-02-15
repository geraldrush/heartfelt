// src/pages/StoryFeed.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilter } from 'react-icons/fa';
import { NotificationBell } from '../components/NotificationBell.jsx';
import {
  acceptConnectionRequest,
  getReferenceData,
  getStoryFeed,
  getTokenBalance,
  getUserPreferences,
  sendConnectionRequest,
  likeUser,
  unlikeUser,
} from '../utils/api.js';

import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ImageGalleryViewer from '../components/ImageGalleryViewer.jsx';
import Toast from '../components/Toast.jsx';
import FilterDrawer from '../components/FilterDrawer.jsx';
import FilterForm from '../components/FilterForm.jsx';
import ActiveFilters from '../components/ActiveFilters.jsx';
import InsufficientTokensModal from '../components/InsufficientTokensModal.jsx';

import Button from '../components/ui/Button.jsx';
import { triggerHaptic } from '../utils/haptics.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getProfileCompletion } from '../utils/profileCompletion.js';
import StickyNav from '../components/StickyNav.jsx';

const PAGE_SIZE = 20;

const StoryCardSkeleton = () => (
  <div className="glass-card rounded-3xl overflow-hidden shadow-2xl">
    <div className="h-80 w-full animate-shimmer bg-gradient-to-r from-purple-100 via-pink-200 to-purple-100 bg-[length:200%_100%]" />
    <div className="space-y-4 p-6">
      <div className="h-6 w-2/3 animate-shimmer rounded-2xl bg-gradient-to-r from-purple-100 via-pink-200 to-purple-100 bg-[length:200%_100%]" />
      <div className="h-4 w-3/4 animate-shimmer rounded-xl bg-gradient-to-r from-purple-100 via-pink-200 to-purple-100 bg-[length:200%_100%]" />
      <div className="h-4 w-1/2 animate-shimmer rounded-xl bg-gradient-to-r from-purple-100 via-pink-200 to-purple-100 bg-[length:200%_100%]" />
      <div className="h-12 w-40 animate-shimmer rounded-2xl bg-gradient-to-r from-purple-100 via-pink-200 to-purple-100 bg-[length:200%_100%]" />
    </div>
  </div>
);

const StoryFeed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [referenceData, setReferenceData] = useState(null);
  const [selectedStory, setSelectedStory] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerStoryId, setViewerStoryId] = useState(null);
  const [viewerImageUrl, setViewerImageUrl] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [connectingStory, setConnectingStory] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [toast, setToast] = useState(null);
  const [bannerDismissedUntil, setBannerDismissedUntil] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const [filters, setFilters] = useState({
    age_min: '',
    age_max: '',
    gender: '',
    nationality: '',
    race: '',
    religion: '',
    max_distance_km: 100,
  });
  const [filtersApplied, setFiltersApplied] = useState({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const sentinelRef = useRef(null);
  const containerRef = useRef(null);

  const completion = useMemo(() => getProfileCompletion(user), [user]);
  const showCompletionBanner = completion.percent < 100 && Date.now() > bannerDismissedUntil;

  useEffect(() => {
    if (!bannerDismissedUntil) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setBannerDismissedUntil(0);
    }, Math.max(1000, bannerDismissedUntil - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [bannerDismissedUntil]);

  const activeFilterCount = useMemo(() => {
    const entries = Object.entries(filtersApplied).filter(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        return false;
      }
      if (key === 'max_distance_km' && Number(value) === 100) {
        return false;
      }
      return true;
    });
    return entries.length;
  }, [filtersApplied]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { preferences } = await getUserPreferences();
        
        // Only auto-populate if user hasn't manually set filters
        if (!preferencesLoaded && preferences) {
          setFilters((prev) => {
            const newFilters = { ...prev };
            let updated = false;
            if (preferences.seeking_gender && preferences.seeking_gender !== 'any') {
              newFilters.gender = preferences.seeking_gender;
              updated = true;
            } else if (user?.gender === 'male') {
              newFilters.gender = 'female';
              updated = true;
            } else if (user?.gender === 'female') {
              newFilters.gender = 'male';
              updated = true;
            }
            if (preferences.seeking_age_min) {
              newFilters.age_min = String(preferences.seeking_age_min);
              updated = true;
            }
            if (preferences.seeking_age_max) {
              newFilters.age_max = String(preferences.seeking_age_max);
              updated = true;
            }
            if (preferences.seeking_races && preferences.seeking_races.length > 0) {
              newFilters.race = preferences.seeking_races[0];
              updated = true;
            }
            if (updated) {
              return newFilters;
            }
            return prev;
          });
          setPreferencesLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
        // Don't show error to user, just skip auto-population
      }
    };
    
    loadPreferences();
  }, [preferencesLoaded, user?.gender]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('filters') === '1') {
      setShowFilters(true);
      navigate('/stories', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [refs, balance] = await Promise.all([
          getReferenceData(),
          getTokenBalance(),
        ]);
        setReferenceData(refs);
        setTokenBalance(balance.balance);
      } catch (err) {
        setError(err.message || 'Failed to load feed data.');
      }
    };
    fetchMeta();
  }, []);

  // Reset selectedStory when stories change
  useEffect(() => {
    setSelectedStory(null);
  }, [stories]);

  // Only apply filters when user explicitly applies them, not on every change
  // Remove the debounce effect that auto-applies filters

  const fetchStories = useCallback(
    async ({ reset = false } = {}) => {
      const nextOffset = reset ? 0 : offset;
      if (reset) {
        setLoading(true);
        setError('');
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await getStoryFeed({
          ...filtersApplied,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setStories((prev) => (reset ? data.stories : [...prev, ...data.stories]));
        setHasMore(data.has_more);
        setOffset(nextOffset + data.stories.length);
      } catch (err) {
        setError(err.message || 'Unable to load stories.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filtersApplied] // Remove offset dependency to prevent infinite loops
  );

  const fetchStoriesRef = useRef(fetchStories);
  useEffect(() => {
    fetchStoriesRef.current = fetchStories;
  }, [fetchStories]);

  useEffect(() => {
    // Only fetch if we have applied filters and no stories
    if (Object.keys(filtersApplied).length > 0 || stories.length === 0) {
      fetchStoriesRef.current({ reset: true });
    }
  }, [filtersApplied]); // Remove stories dependency to prevent loops



  useEffect(() => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchStoriesRef.current({ reset: false });
        }
      },
      { threshold: 0.4 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore, loading]);

  const clearFilters = useCallback(() => {
    setFilters({
      age_min: '',
      age_max: '',
      gender: '',
      nationality: '',
      race: '',
      religion: '',
      max_distance_km: 100,
    });
  }, []);

  const removeFilter = useCallback((key) => {
    triggerHaptic('light');
    setFilters(prev => ({ ...prev, [key]: key === 'max_distance_km' ? 100 : '' }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setFiltersApplied(filters);
    setShowFilters(false);
  }, [filters]);

  const handleClearAllFilters = useCallback(() => {
    const clearedFilters = {
      age_min: '',
      age_max: '',
      gender: '',
      nationality: '',
      race: '',
      religion: '',
      max_distance_km: 100,
    };
    setFilters(clearedFilters);
    setFiltersApplied(clearedFilters);
    setShowFilters(false);
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };



  const handleConnect = async (story, message = '') => {
    if (tokenBalance !== null && tokenBalance < 5) {
      triggerHaptic('error');
      setShowTopUpModal(true);
      return;
    }

    triggerHaptic('success');
    setTokenBalance((prev) => (prev !== null ? prev - 5 : prev));

    try {
      await sendConnectionRequest({ receiver_id: story.user_id, message });
      showToast('Connection request sent!', 'success');
      // Update story status
      setStories(prev => prev.map(s => 
        s.story_id === story.story_id ? { ...s, connection_status: 'pending_sent' } : s
      ));
    } catch (err) {
      console.error('Connection request failed:', err);
      if (err.status === 402) {
        setShowTopUpModal(true);
      } else {
        showToast(`Failed to send connection request: ${err.message}`);
      }
      setTokenBalance((prev) => (prev !== null ? prev + 5 : prev));
    }
  };

  const handleAccept = async (story) => {
    if (tokenBalance !== null && tokenBalance < 3) {
      triggerHaptic('error');
      setShowTopUpModal(true);
      return;
    }

    triggerHaptic('success');
    setTokenBalance((prev) => (prev !== null ? prev - 3 : prev));

    try {
      await acceptConnectionRequest(story.request_id);
      showToast('Connection request accepted!', 'success');
      // Update story status
      setStories(prev => prev.map(s => 
        s.story_id === story.story_id ? { ...s, connection_status: 'connected' } : s
      ));
    } catch (err) {
      console.error('Accept connection failed:', err);
      if (err.status === 402) {
        setShowTopUpModal(true);
      } else {
        showToast(`Failed to accept connection request: ${err.message}`);
      }
      setTokenBalance((prev) => (prev !== null ? prev + 3 : prev));
    }
  };

  const handleLike = async (story) => {
    triggerHaptic('light');
    try {
      if (story.is_liked) {
        await unlikeUser(story.user_id);
        showToast('Unliked', 'success');
      } else {
        await likeUser(story.user_id);
        showToast('Liked!', 'success');
      }
      // Update story in list
      setStories(prev => prev.map(s => 
        s.story_id === story.story_id ? { ...s, is_liked: !s.is_liked } : s
      ));
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSendMessage = async () => {
    if (!connectingStory) return;
    
    await handleConnect(connectingStory, messageText);
    setShowMessageModal(false);
    setMessageText('');
    setConnectingStory(null);
  };

  const handleCancelMessage = () => {
    setShowMessageModal(false);
    setMessageText('');
    setConnectingStory(null);
  };



  const handleCloseImageViewer = () => {
    setShowImageViewer(false);
    setViewerStoryId(null);
    setViewerImageUrl(null);
  };

  const handleImageClick = (story, e) => {
    e.stopPropagation();
    setShowImageViewer(true);
    setViewerStoryId(story.story_id);
    setViewerImageUrl(story.blurred_image_url);
  };



  const emptyIcon = (
    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>
  );

  const renderStoryCard = (story) => (
    <div key={story.story_id} className="mb-6 w-full max-w-md mx-auto">
      <div className="relative h-[calc(100dvh-200px)] md:h-[600px] overflow-hidden rounded-[32px] bg-white/95 border border-slate-100 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0">
          {story.blurred_image_url ? (
            <img
              src={story.blurred_image_url}
              alt="Story"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-opacity duration-300"
              style={{
                backgroundImage: 'linear-gradient(to bottom right, rgb(255, 238, 230), rgb(231, 250, 244))',
                backgroundSize: 'cover',
              }}
              onLoad={(e) => {
                e.target.style.opacity = '1';
              }}
              onError={(e) => {
                e.target.style.opacity = '0.5';
              }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-200 to-pink-200 animate-pulse" />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/25 to-transparent" />

        <div className="absolute left-4 top-4">
          {story.connection_status === 'pending_received' ? (
            <span className="rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
              New request
            </span>
          ) : (
            <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur-md">
              {story.nationality === 'South Africa' ? '🇿🇦' : 
               story.nationality === 'Zimbabwe' ? '🇿🇼' : 
               story.nationality === 'Namibia' ? '🇳🇦' : 
               story.nationality === 'Botswana' ? '🇧🇼' : 
               story.nationality === 'Mozambique' ? '🇲🇿' : '🌍'}
            </span>
          )}
        </div>

        <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
            story.is_online === true ? 'bg-emerald-500/90 text-white' : 'bg-white/80 text-slate-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              story.is_online === true ? 'bg-white animate-pulse' : 'bg-slate-400'
            }`} />
            {story.is_online === true ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="absolute bottom-24 left-4 right-4 space-y-2">
          <h3 className="text-xl font-semibold text-white mb-1 drop-shadow-lg">
            {story.age} • {story.gender}
          </h3>
          <p className="text-white/90 text-xs drop-shadow-md">
            {story.location_city}, {story.location_province}
          </p>
          <div className="flex flex-wrap gap-2">
            {[story.religion, story.race].filter(Boolean).map((tag, index) => (
              <span key={index} className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
              👶 {story.has_kids ? `${story.num_kids} kids` : 'No kids'}
            </span>
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
              {story.smoker ? '🚬 Smoker' : '🚭 Non-smoker'}
            </span>
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
              {story.drinks_alcohol ? '🍷 Drinks' : '🚫 No alcohol'}
            </span>
          </div>
          {story.connection_status !== 'none' && (
            <div className="flex">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                story.connection_status === 'connected'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : story.connection_status === 'pending_sent'
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {story.connection_status === 'connected'
                  ? '✨ Connected'
                  : story.connection_status === 'pending_sent'
                  ? '⏳ Request Sent'
                  : 'New request'}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex gap-3 justify-center">
            {/* Like Button */}
            <button
              type="button"
              onClick={() => handleLike(story)}
              className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
                story.is_liked 
                  ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white scale-110' 
                  : 'bg-white/95 backdrop-blur text-gray-700 hover:scale-105'
              }`}
            >
              <svg className="w-7 h-7" fill={story.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={story.is_liked ? 0 : 2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {/* Message/Connect Button */}
            {story.connection_status === 'pending_received' ? (
              <button
                type="button"
                onClick={() => handleAccept(story)}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-all"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            ) : story.connection_status === 'connected' ? (
              <button
                type="button"
                onClick={() => navigate(`/chat/${story.user_id}`)}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-all"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            ) : story.connection_status === 'pending_sent' ? (
              <button
                type="button"
                disabled
                className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 shadow-lg flex items-center justify-center opacity-60"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConnectingStory(story);
                  setShowMessageModal(true);
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-all"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="mobile-container relative overflow-y-auto h-screen" style={{ background: 'radial-gradient(circle at top, rgba(231, 76, 60, 0.08), transparent 55%), radial-gradient(circle at 20% 20%, rgba(243, 156, 18, 0.08), transparent 50%), radial-gradient(circle at 80% 30%, rgba(39, 174, 96, 0.08), transparent 55%), linear-gradient(135deg, #FFF9F5, #F5FFF9)' }}>
      <StickyNav title="AfroDate" tokenBalance={tokenBalance} />

      <div className="pt-16 pb-[calc(80px+env(safe-area-inset-bottom,0px))] md:pb-[env(safe-area-inset-bottom,0px)]">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top, rgba(231, 76, 60, 0.05), transparent 55%), radial-gradient(circle at 80% 30%, rgba(39, 174, 96, 0.05), transparent 55%)' }} />
      
      <div className="relative z-10 px-4 py-0 md:px-4 md:pb-28 md:pt-8">
        <div className="w-full md:max-w-6xl mx-auto">
          {showCompletionBanner && (
            <div className="fixed left-0 right-0 z-[80] pointer-events-none px-4" style={{ top: '80px' }}>
              <div className="mx-auto w-full max-w-md rounded-3xl border border-emerald-100/70 bg-white/95 px-4 py-4 shadow-2xl backdrop-blur pointer-events-auto relative mt-2">
                <button
                  type="button"
                  onClick={() => setBannerDismissedUntil(Date.now() + 60000)}
                  className="absolute right-3 top-3 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  aria-label="Dismiss banner"
                >
                  ✕
                </button>
                <div className="pr-10">
                  <p className="text-sm font-semibold text-slate-900">
                    Profile {completion.percent}% complete
                  </p>
                  <p className="text-xs text-slate-500">
                    Add your location and details to get better matches.
                  </p>
                  <div className="mt-2 h-2 w-full max-w-xs rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${completion.percent}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="mt-3 w-full rounded-2xl px-4 py-2 text-xs font-semibold text-white transition hover:scale-105" style={{ background: 'linear-gradient(135deg, #27AE60, #F39C12)' }}
                >
                  Complete profile
                </button>
              </div>
            </div>
          )}
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8"
          >
            <div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-emerald-600 via-rose-500 to-amber-500 bg-clip-text text-transparent mb-1">
                Discover Stories
              </h1>
              <p className="text-sm text-gray-600">
                Find meaningful connections through authentic stories
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="hidden md:block rounded-3xl border border-emerald-100/60 bg-white/90 px-5 py-3 text-center shadow-lg backdrop-blur">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Tokens</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {tokenBalance === null ? '...' : tokenBalance}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Filter Controls */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden md:flex items-center justify-between mb-6"
          >
            <motion.button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            className="rounded-2xl border border-emerald-100/60 bg-white/90 px-6 py-3 font-semibold text-emerald-700 shadow-sm transition-colors hover:text-emerald-800"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </motion.button>
            
            {activeFilterCount > 0 && (
              <span className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                {activeFilterCount} active filters
              </span>
            )}
          </motion.div>

          {/* Desktop Two-Column Layout */}
          <div className="hidden md:grid md:grid-cols-[320px_1fr] md:gap-8 md:items-start">
            {/* Left Column - Filter Sidebar */}
            <div className="sticky top-8">
              <FilterDrawer
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                title="Filters"
                onApply={handleApplyFilters}
                onClear={handleClearAllFilters}
              >
                <FilterForm
                  filters={filters}
                  onChange={setFilters}
                  referenceData={referenceData}
                />
              </FilterDrawer>
            </div>

            {/* Right Column - Story Feed */}
            <div>
              {/* Active Filters */}
              <ActiveFilters
                filters={filtersApplied}
                onRemoveFilter={removeFilter}
                onClearAll={clearFilters}
                count={activeFilterCount}
                floating
                topOffsetClass={
                  showCompletionBanner
                    ? 'top-[calc(env(safe-area-inset-top,0px)+6.5rem)]'
                    : 'top-[calc(env(safe-area-inset-top,0px)+0.75rem)]'
                }
              />

              {/* Stories Content */}
              <div className="flex flex-col items-center">
                {loading ? (
                  <div className="flex items-center justify-center h-full w-full max-w-md">
                    <div className="grid gap-8">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <StoryCardSkeleton key={`skeleton-${index}`} />
                      ))}
                    </div>
                  </div>
                ) : stories.length > 0 ? (
                  <div className="w-full">
                    {stories.map((story) => renderStoryCard(story))}
                    {hasMore && (
                      <div ref={sentinelRef} className="py-8 text-center">
                        {loadingMore && <LoadingSpinner />}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full w-full max-w-md">
                    <EmptyState
                      icon={emptyIcon}
                      title="No Stories Found"
                      description="Try adjusting your filters or check back later for new connections!"
                      actionButton={
                        <motion.button
                          type="button"
                          onClick={clearFilters}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="premium-button"
                        >
                          Clear Filters
                        </motion.button>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Header removed to allow full-bleed card */}
            {/* Active Filters */}
            <ActiveFilters
              filters={filtersApplied}
              onRemoveFilter={removeFilter}
              onClearAll={clearFilters}
              count={activeFilterCount}
              floating
              topOffsetClass={
                showCompletionBanner
                  ? 'top-[calc(env(safe-area-inset-top,0px)+6.5rem)]'
                  : 'top-[calc(env(safe-area-inset-top,0px)+0.75rem)]'
              }
            />

            {/* Mobile Filter Drawer */}
            <FilterDrawer
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              title="Filters"
              onApply={handleApplyFilters}
              onClear={handleClearAllFilters}
            >
              <FilterForm
                filters={filters}
                onChange={setFilters}
                referenceData={referenceData}
              />
            </FilterDrawer>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl px-6 py-4 text-red-600 mb-8 max-w-2xl mx-auto"
              >
                {error}
                {error.toLowerCase().includes('insufficient') && (
                  <span className="ml-2">
                    <a href="/tokens" className="font-semibold text-purple-600 hover:text-purple-700">
                      Buy tokens
                    </a>
                  </span>
                )}
              </motion.div>
            )}

            {/* Stories Content - Mobile Only */}
            <div className="flex flex-col items-center">
              {loading ? (
                <div className="flex items-center justify-center h-full w-full max-w-md">
                  <div className="grid gap-8">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <StoryCardSkeleton key={`skeleton-${index}`} />
                    ))}
                  </div>
                </div>
              ) : stories.length > 0 ? (
                <div className="w-full">
                  {stories.map((story) => renderStoryCard(story))}
                  {hasMore && (
                    <div ref={sentinelRef} className="py-8 text-center">
                      {loadingMore && <LoadingSpinner />}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full w-full max-w-md">
                  <EmptyState
                    icon={emptyIcon}
                    title="No Stories Found"
                    description="Try adjusting your filters or check back later for new connections!"
                    actionButton={
                      <motion.button
                        type="button"
                        onClick={clearFilters}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="premium-button"
                      >
                        Clear Filters
                      </motion.button>
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Story Detail Modal */}
      {!showImageViewer && selectedStory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-full md:max-w-2xl glass-card rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] md:max-h-[70vh]"
          >
            <div className="flex items-center justify-between border-b border-white/20 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedStory.age} • {selectedStory.gender}
                </h3>
                <p className="text-gray-600">{selectedStory.location_city}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStory(null)}
                className="glass-card rounded-full px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            
            <div className="max-h-[70vh] md:max-h-[50vh] overflow-y-auto">
              <div className="h-64 w-full bg-gradient-to-br from-purple-200 to-pink-200">
                {selectedStory.blurred_image_url && (
                  <img
                    src={selectedStory.blurred_image_url}
                    alt="Story"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              
              <div className="space-y-6 px-6 py-6">
                <p className="text-gray-700 leading-relaxed">{selectedStory.story_text}</p>
                
                <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Religion:</span>
                    <span>{selectedStory.religion || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Race:</span>
                    <span>{selectedStory.race || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Kids:</span>
                    <span>{selectedStory.has_kids ? selectedStory.num_kids : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Smoker:</span>
                    <span>{selectedStory.smoker ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Drinks:</span>
                    <span>{selectedStory.drinks_alcohol ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && connectingStory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Send Message to {connectingStory.age} • {connectingStory.gender}
              </h3>
              <button
                type="button"
                onClick={handleCancelMessage}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              {[
                "Hi! Let's connect 😊",
                "You seem interesting, let's chat!",
                "I'd love to get to know you better",
                "Your story caught my attention!"
              ].map((message, index) => (
                <button
                  key={index}
                  onClick={() => setMessageText(message)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    messageText === message
                      ? 'border-rose-400 bg-rose-50 text-rose-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {message}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleCancelMessage} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSendMessage} 
                className="flex-1"
                disabled={!messageText}
              >
                Send (5 tokens)
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image Gallery Viewer */}
      {showImageViewer && (
        <ImageGalleryViewer
          storyId={viewerStoryId}
          initialImageUrl={viewerImageUrl}
          onClose={handleCloseImageViewer}
          isOpen={showImageViewer}
        />
      )}
      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </AnimatePresence>

      {/* Top Up Modal */}
      <InsufficientTokensModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        requiredTokens={5}
        action="send a connection request"
      />
      </div>
    </div>
  );
};

export default StoryFeed;
