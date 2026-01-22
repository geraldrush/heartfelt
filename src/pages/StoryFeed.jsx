// src/pages/StoryFeed.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFilter } from 'react-icons/fa';
import {
  acceptConnectionRequest,
  getReferenceData,
  getStoryFeed,
  getTokenBalance,
  getUserPreferences,
  sendConnectionRequest,
} from '../utils/api.js';
import CardStack from '../components/animations/CardStack.jsx';
import HeartAnimation from '../components/animations/HeartAnimation.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ImageGalleryViewer from '../components/ImageGalleryViewer.jsx';
import Toast from '../components/Toast.jsx';
import { usePullToRefresh } from '../hooks/usePullToRefresh.js';
import Button from '../components/ui/Button.jsx';
import { triggerHaptic } from '../utils/haptics.js';

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
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [referenceData, setReferenceData] = useState(null);
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [selectedStory, setSelectedStory] = useState(null);
  const [swipeHistory, setSwipeHistory] = useState([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerStoryId, setViewerStoryId] = useState(null);
  const [viewerImageUrl, setViewerImageUrl] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [connectingStory, setConnectingStory] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [toast, setToast] = useState(null);

  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [gender, setGender] = useState('');
  const [religion, setReligion] = useState('');
  const [race, setRace] = useState('');
  const [education, setEducation] = useState('');
  const [nationality, setNationality] = useState('');
  const [hasKids, setHasKids] = useState('');
  const [numKids, setNumKids] = useState('');
  const [smoker, setSmoker] = useState('');
  const [drinksAlcohol, setDrinksAlcohol] = useState('');
  const [maxDistance, setMaxDistance] = useState(100);
  const [filtersDraft, setFiltersDraft] = useState({});
  const [filtersApplied, setFiltersApplied] = useState({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const sentinelRef = useRef(null);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh(
    () => fetchStories({ reset: true })
  );

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
          if (preferences.seeking_gender && preferences.seeking_gender !== 'any') {
            setGender(preferences.seeking_gender);
          }
          if (preferences.seeking_age_min) {
            setAgeMin(String(preferences.seeking_age_min));
          }
          if (preferences.seeking_age_max) {
            setAgeMax(String(preferences.seeking_age_max));
          }
          if (preferences.seeking_races && preferences.seeking_races.length > 0) {
            // For now, set the first race preference
            // Future enhancement: support multiple race filters
            setRace(preferences.seeking_races[0]);
          }
          setPreferencesLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
        // Don't show error to user, just skip auto-population
      }
    };
    
    loadPreferences();
  }, []); // Run once on mount

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

  useEffect(() => {
    const nextDraft = {
      age_min: ageMin,
      age_max: ageMax,
      gender,
      nationality,
      race,
      religion,
      education,
      has_kids: hasKids,
      num_kids: hasKids === 'true' ? numKids : '',
      smoker,
      drinks_alcohol: drinksAlcohol,
      max_distance_km: maxDistance,
    };
    setFiltersDraft(nextDraft);
  }, [
    ageMin,
    ageMax,
    gender,
    religion,
    race,
    education,
    nationality,
    hasKids,
    numKids,
    smoker,
    drinksAlcohol,
    maxDistance,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setFiltersApplied(filtersDraft);
    }, 500);
    return () => clearTimeout(handler);
  }, [filtersDraft]);

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

  const clearFilters = () => {
    setAgeMin('');
    setAgeMax('');
    setGender('');
    setNationality('');
    setRace('');
    setReligion('');
    setEducation('');
    setHasKids('');
    setNumKids('');
    setSmoker('');
    setDrinksAlcohol('');
    setMaxDistance(100);
  };

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  const removeStory = (story, action) => {
    if (isAnimating) return;
    setStories((prev) => prev.filter((item) => item.story_id !== story.story_id));
    setSwipeHistory((prev) => [{ story, action }, ...prev].slice(0, 5));
  };

  const restoreStory = (story) => {
    setStories((prev) => [story, ...prev]);
  };

  const handleConnect = async (story, message = '') => {
    if (tokenBalance !== null && tokenBalance < 5) {
      triggerHaptic('error');
      setError('You need at least 5 tokens to send a connection request.');
      return;
    }

    triggerHaptic('success');
    setHeartTrigger((prev) => prev + 1);
    removeStory(story, 'connect');
    setTokenBalance((prev) => (prev !== null ? prev - 5 : prev));

    try {
      await sendConnectionRequest({ receiver_id: story.user_id, message });
      showToast('Connection request sent!', 'success');
    } catch (err) {
      console.error('Connection request failed:', err);
      console.error('Error details:', { message: err.message, status: err.status, details: err.details });
      showToast(`Failed to send connection request: ${err.message}`);
      restoreStory(story);
      setSwipeHistory((prev) =>
        prev.filter((entry) => entry.story.story_id !== story.story_id)
      );
      setTokenBalance((prev) => (prev !== null ? prev + 5 : prev));
    }
  };

  const handleAccept = async (story) => {
    if (tokenBalance !== null && tokenBalance < 5) {
      triggerHaptic('error');
      setError('You need at least 5 tokens to accept a connection request.');
      return;
    }

    triggerHaptic('success');
    removeStory(story, 'accept');
    setTokenBalance((prev) => (prev !== null ? prev - 5 : prev));

    try {
      await acceptConnectionRequest(story.request_id);
      showToast('Connection request accepted!', 'success');
    } catch (err) {
      console.error('Accept connection failed:', err);
      console.error('Accept error details:', { message: err.message, status: err.status, details: err.details });
      showToast(`Failed to accept connection request: ${err.message}`);
      restoreStory(story);
      setSwipeHistory((prev) =>
        prev.filter((entry) => entry.story.story_id !== story.story_id)
      );
      setTokenBalance((prev) => (prev !== null ? prev + 5 : prev));
    }
  };

  const handlePass = (story) => {
    if (isAnimating) return; // Prevent multiple rapid passes
    triggerHaptic('light');
    removeStory(story, 'pass');
  };

  const handleSwipeLeft = (story) => {
    handlePass(story);
  };

  const handleSwipeRight = (story) => {
    setConnectingStory(story);
    setShowMessageModal(true);
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

  const handleUndo = () => {
    const [last] = swipeHistory;
    if (!last) {
      return;
    }
    
    triggerHaptic('medium');
    setSwipeHistory((prev) => prev.slice(1));
    restoreStory(last.story);
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

  const truncateText = (text) =>
    text.length > 150 ? `${text.slice(0, 150)}...` : text;

  const currentStory = stories[0];

  const emptyIcon = (
    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>
  );

  const renderCard = (story) => (
    <div className="relative h-full flex flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-purple-50 via-rose-50 to-pink-100 backdrop-blur-sm border border-purple-100/50 shadow-2xl">
      <div className="relative h-[55%] sm:h-[50%] md:h-80">
        {story.blurred_image_url ? (
          <img
            src={story.blurred_image_url}
            alt="Story"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-opacity duration-300"
            style={{
              backgroundImage: 'linear-gradient(to bottom right, rgb(233, 213, 255), rgb(251, 207, 232))',
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
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Nationality flag / Connection status */}
        <div className="absolute left-4 top-4">
          {story.connection_status === 'pending_received' ? (
            <span className="glass-card px-3 py-1.5 text-xs font-semibold bg-blue-100/80 text-blue-700 rounded-full backdrop-blur-md">
              💕 Wants to Connect
            </span>
          ) : (
            <span className="glass-card px-3 py-1.5 text-xs font-semibold text-white rounded-full backdrop-blur-md">
              {story.nationality === 'South Africa' ? '🇿🇦' : 
               story.nationality === 'Zimbabwe' ? '🇿🇼' : 
               story.nationality === 'Namibia' ? '🇳🇦' : 
               story.nationality === 'Botswana' ? '🇧🇼' : 
               story.nationality === 'Mozambique' ? '🇲🇿' : '🌍'}
            </span>
          )}
        </div>
        
        {/* Online status */}
        <div className="absolute right-4 top-4">
          <span className={`glass-card px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-2 backdrop-blur-md ${
            story.is_online === true ? 'text-emerald-400' : 'text-gray-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              story.is_online === true ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
            }`} />
            {story.is_online === true ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Name and age overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-semibold text-white mb-1 drop-shadow-lg">
            {story.age} • {story.gender}
          </h3>
          <p className="text-white/90 text-xs drop-shadow-md">
            {story.location_city}, {story.location_province}
          </p>
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[50%] md:max-h-none bg-gradient-to-b from-transparent via-white/30 to-white/60">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {[story.religion, story.race, story.education].filter(Boolean).map((tag, index) => (
            <span key={index} className="px-3 py-1 bg-gradient-to-r from-purple-100/80 to-pink-100/80 text-purple-700 text-xs font-medium rounded-full border border-purple-200/50 backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>

        {/* Lifestyle info */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-full backdrop-blur-sm">
            👶 {story.has_kids ? `Has ${story.num_kids} kids` : 'No kids'}
          </span>
          <span className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-full backdrop-blur-sm">
            {story.smoker ? '🚬 Smoker' : '🚭 Non-smoker'}
          </span>
          <span className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-full backdrop-blur-sm">
            {story.drinks_alcohol ? '🍷 Drinks' : '🚫 No alcohol'}
          </span>
        </div>

        {/* Story text */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/30">
          <p className="text-gray-700 text-xs leading-relaxed">
            {truncateText(story.story_text)}
          </p>
        </div>

        {/* Connection status */}
        {story.connection_status !== 'none' && (
          <div className="pt-2">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
              story.connection_status === 'connected'
                ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50'
                : story.connection_status === 'pending_sent'
                ? 'bg-amber-100/80 text-amber-700 border border-amber-200/50'
                : 'bg-blue-100/80 text-blue-700 border border-blue-200/50'
            }`}>
              {story.connection_status === 'connected'
                ? '✨ Connected'
                : story.connection_status === 'pending_sent'
                ? '⏳ Request Sent'
                : '💕 Wants to Connect'}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="mobile-container pull-to-refresh bg-premium-mesh relative pt-[env(safe-area-inset-top,0px)] pb-[calc(80px+env(safe-area-inset-bottom,0px))] md:pb-[env(safe-area-inset-bottom,0px)]">
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-[env(safe-area-inset-top,0px)] left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200"
          style={{ transform: `translateX(-50%) translateY(${Math.min(pullDistance / 2, 40)}px)` }}
        >
          {isRefreshing ? '🔄 Refreshing...' : pullDistance > 80 ? '↓ Release to refresh' : '↓ Pull to refresh'}
        </div>
      )}
      {/* Background Elements */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/10 via-pink-900/10 to-rose-900/10" />
      <div className="absolute top-40 left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl md:blur-3xl animate-pulse" />
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-pink-500/5 rounded-full blur-2xl md:blur-3xl animate-pulse" />
      
      <div className="relative z-10 px-4 py-0 md:px-4 md:pb-28 md:pt-8">
        <div className="w-full md:max-w-6xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8"
          >
            <div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 bg-clip-text text-transparent mb-1">
                Discover Stories
              </h1>
              <p className="text-sm text-gray-600">
                Find meaningful connections through authentic stories
              </p>
            </div>
            
            <div className="hidden md:block glass-card rounded-3xl px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Tokens</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                {tokenBalance === null ? '...' : tokenBalance}
              </p>
            </div>
          </motion.div>

          {/* Mobile Token Badge */}
          <div className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 z-40 md:hidden glass-card rounded-full px-4 py-2 flex items-center gap-2">
            <span className="text-lg">🪙</span>
            <span className="text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              {tokenBalance === null ? '...' : tokenBalance}
            </span>
          </div>

          {/* Mobile Filter Icon Button */}
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 z-40 md:hidden glass-card rounded-full w-12 h-12 flex items-center justify-center"
          >
            <FaFilter className="text-purple-600" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

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
              className="glass-card rounded-2xl px-6 py-3 font-semibold text-purple-600 hover:text-purple-700 transition-colors"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </motion.button>
            
            {activeFilterCount > 0 && (
              <span className="glass-card rounded-full px-4 py-2 text-sm font-medium text-gray-600">
                {activeFilterCount} active filters
              </span>
            )}
          </motion.div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto z-50 glass-card rounded-t-3xl md:rounded-3xl p-6 mb-0 md:mb-8 max-h-[70vh] md:max-h-none overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-8"
            >
              <div className="flex justify-between items-center mb-6 md:hidden">
                <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="glass-card rounded-full w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="18"
                      placeholder="Min"
                      value={ageMin}
                      onChange={(e) => setAgeMin(e.target.value)}
                      className="premium-input flex-1"
                    />
                    <input
                      type="number"
                      min="18"
                      placeholder="Max"
                      value={ageMax}
                      onChange={(e) => setAgeMax(e.target.value)}
                      className="premium-input flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="premium-input w-full"
                  >
                    <option value="">Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nationality</label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="premium-input w-full"
                  >
                    <option value="">Any</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Zimbabwe">Zimbabwe</option>
                    <option value="Namibia">Namibia</option>
                    <option value="Botswana">Botswana</option>
                    <option value="Mozambique">Mozambique</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Race</label>
                  <select
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    className="premium-input w-full"
                  >
                    <option value="">Any</option>
                    {(referenceData?.races || []).map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Religion</label>
                  <select
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="premium-input w-full"
                  >
                    <option value="">Any</option>
                    {(referenceData?.religions || []).map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Distance</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(Number(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <p className="text-sm text-gray-600 text-center">{maxDistance} km</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button onClick={() => setFiltersApplied(filtersDraft)} className="flex-1">
                  Apply Filters
                </Button>
                <Button variant="secondary" onClick={clearFilters} className="flex-1">
                  Clear All
                </Button>
              </div>
            </motion.div>
          )}

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

          {/* Stories Content */}
          <div className="flex flex-col items-center h-[calc(100dvh-120px)] sm:h-[calc(100dvh-140px)] md:h-auto pt-16 md:pt-0 stories-container">
            {loading ? (
              <div className="flex items-center justify-center h-full w-full max-w-md">
                <div className="grid gap-8">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <StoryCardSkeleton key={`skeleton-${index}`} />
                  ))}
                </div>
              </div>
            ) : stories.length > 0 ? (
              <div className="relative w-full max-w-md mx-auto h-full flex flex-col items-center justify-center">
                <CardStack
                  items={stories}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onSwipeUp={(story) => setSelectedStory(story)}
                  onCardClick={(story) => setSelectedStory(story)}
                  renderCard={renderCard}
                  disabled={showImageViewer}
                />
                
                {/* Action Buttons Below Card */}
                {currentStory && (
                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => handlePass(currentStory)}
                      className="px-8 py-3 bg-red-500 rounded-full text-sm font-semibold text-white shadow-lg hover:scale-105 transition-transform"
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConnectingStory(currentStory);
                        setShowMessageModal(true);
                      }}
                      className="px-8 py-3 bg-green-500 rounded-full text-sm font-semibold text-white shadow-lg hover:scale-105 transition-transform"
                    >
                      Connect
                    </button>
                  </div>
                )}
                
                <HeartAnimation trigger={heartTrigger} />
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

            {/* Action Buttons */}
            {currentStory && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 hidden w-full max-w-md items-center justify-between gap-4 md:flex"
              >
                <motion.button
                  type="button"
                  onClick={() => handlePass(currentStory)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 glass-card rounded-2xl py-3 font-semibold text-gray-600 hover:text-gray-700 transition-colors"
                >
                  Pass
                </motion.button>
                
                {currentStory.connection_status === 'pending_received' ? (
                  <motion.button
                    type="button"
                    onClick={() => handleAccept(currentStory)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold py-3 rounded-2xl shadow-lg"
                  >
                    Accept (5 tokens)
                  </motion.button>
                ) : currentStory.connection_status === 'none' ? (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setConnectingStory(currentStory);
                      setShowMessageModal(true);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 premium-button"
                  >
                    Connect (5 tokens)
                  </motion.button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 glass-card rounded-2xl py-3 font-semibold text-gray-400"
                  >
                    {currentStory.connection_status === 'connected' ? 'Connected' : 'Request Sent'}
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {loadingMore && (
            <div className="hidden md:flex mt-8 justify-center">
              <LoadingSpinner label="Loading more stories..." />
            </div>
          )}

          {!hasMore && stories.length > 0 && (
            <div className="hidden md:block mt-8 text-center text-gray-500">
              You've seen all available stories. Check back later for more!
            </div>
          )}

          <div ref={sentinelRef} className="hidden md:block h-8" />
        </div>
      </div>

      {/* Undo Button */}
      {swipeHistory.length > 0 && (
        <motion.button
          type="button"
          onClick={handleUndo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-[calc(120px+env(safe-area-inset-bottom,0px))] left-4 z-40 glass-card rounded-full px-4 py-2 text-sm font-semibold text-gray-600 shadow-lg md:bottom-12 md:left-6"
        >
          ↶ Undo
        </motion.button>
      )}

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
                    <span className="font-medium">Education:</span>
                    <span>{selectedStory.education || '—'}</span>
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
    </div>
  );
};

export default StoryFeed;
