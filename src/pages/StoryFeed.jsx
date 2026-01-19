// src/pages/StoryFeed.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  acceptConnectionRequest,
  getReferenceData,
  getStoryFeed,
  getTokenBalance,
  sendConnectionRequest,
} from '../utils/api.js';
import CardStack from '../components/animations/CardStack.jsx';
import HeartAnimation from '../components/animations/HeartAnimation.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

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

  const sentinelRef = useRef(null);

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

  useEffect(() => {
    const nextDraft = {
      age_min: ageMin,
      age_max: ageMax,
      gender,
      religion,
      race,
      education,
      nationality,
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
    [filtersApplied, offset]
  );

  const fetchStoriesRef = useRef(fetchStories);
  useEffect(() => {
    fetchStoriesRef.current = fetchStories;
  }, [fetchStories]);

  useEffect(() => {
    fetchStoriesRef.current({ reset: true });
  }, [filtersApplied]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    if (stories.length < 5) {
      fetchStoriesRef.current({ reset: false });
    }
  }, [stories.length, hasMore, loading, loadingMore]);

  useEffect(() => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchStories({ reset: false });
        }
      },
      { threshold: 0.4 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMore, loadingMore, loading, fetchStories]);

  const clearFilters = () => {
    setAgeMin('');
    setAgeMax('');
    setGender('');
    setReligion('');
    setRace('');
    setEducation('');
    setNationality('');
    setHasKids('');
    setNumKids('');
    setSmoker('');
    setDrinksAlcohol('');
    setMaxDistance(100);
  };

  const removeStory = (story, action) => {
    setStories((prev) => prev.filter((item) => item.story_id !== story.story_id));
    setSwipeHistory((prev) => [{ story, action }, ...prev].slice(0, 5));
  };

  const restoreStory = (story) => {
    setStories((prev) => [story, ...prev]);
  };

  const handleConnect = async (story) => {
    if (tokenBalance !== null && tokenBalance < 5) {
      setError('You need at least 5 tokens to send a connection request.');
      return;
    }

    setHeartTrigger((prev) => prev + 1);
    removeStory(story, 'connect');
    setTokenBalance((prev) => (prev !== null ? prev - 5 : prev));

    try {
      await sendConnectionRequest({ receiver_id: story.user_id, message: '' });
    } catch (err) {
      setError(err.message || 'Failed to send connection request.');
      restoreStory(story);
      setSwipeHistory((prev) =>
        prev.filter((entry) => entry.story.story_id !== story.story_id)
      );
      setTokenBalance((prev) => (prev !== null ? prev + 5 : prev));
    }
  };

  const handleAccept = async (story) => {
    if (tokenBalance !== null && tokenBalance < 3) {
      setError('You need at least 3 tokens to accept a connection request.');
      return;
    }

    removeStory(story, 'accept');
    setTokenBalance((prev) => (prev !== null ? prev - 3 : prev));

    try {
      await acceptConnectionRequest(story.request_id);
    } catch (err) {
      setError(err.message || 'Failed to accept connection request.');
      restoreStory(story);
      setSwipeHistory((prev) =>
        prev.filter((entry) => entry.story.story_id !== story.story_id)
      );
      setTokenBalance((prev) => (prev !== null ? prev + 3 : prev));
    }
  };

  const handlePass = (story) => {
    removeStory(story, 'pass');
  };

  const handleSwipeRight = (story) => {
    if (story.connection_status === 'pending_received') {
      handleAccept(story);
      return;
    }
    if (story.connection_status === 'none') {
      handleConnect(story);
      return;
    }
    handlePass(story);
  };

  const handleUndo = () => {
    const [last] = swipeHistory;
    if (!last) {
      return;
    }
    setSwipeHistory((prev) => prev.slice(1));
    restoreStory(last.story);
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
    <div className="glass-card rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="relative h-80">
        {story.blurred_image_url ? (
          <img
            src={story.blurred_image_url}
            alt="Story"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple-200 to-pink-200" />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Distance badge */}
        <div className="absolute left-4 top-4">
          <span className="glass-card px-3 py-1.5 text-xs font-semibold text-white rounded-full">
            {story.distance_km && story.distance_km < 999000
              ? `${story.distance_km.toFixed(1)} km away`
              : 'Distance unknown'}
          </span>
        </div>
        
        {/* Online status */}
        <div className="absolute right-4 top-4">
          <span className={`glass-card px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-2 ${
            story.is_online ? 'text-emerald-400' : 'text-gray-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              story.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
            }`} />
            {story.is_online ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Name and age overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white mb-1">
            {story.age} • {story.gender}
          </h3>
          <p className="text-white/90 text-sm">
            {story.location_city}, {story.location_province}
          </p>
        </div>
      </div>
      
      <div className="flex-1 p-6 space-y-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {[story.religion, story.race, story.education].filter(Boolean).map((tag, index) => (
            <span key={index} className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs font-medium rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Lifestyle info */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            👶 {story.has_kids ? `Has ${story.num_kids} kids` : 'No kids'}
          </span>
          <span className="flex items-center gap-1">
            {story.smoker ? '🚬 Smoker' : '🚭 Non-smoker'}
          </span>
          <span className="flex items-center gap-1">
            {story.drinks_alcohol ? '🍷 Drinks' : '🚫 No alcohol'}
          </span>
        </div>

        {/* Story text */}
        <p className="text-gray-700 text-sm leading-relaxed">
          {truncateText(story.story_text)}
        </p>

        {/* Connection status */}
        {story.connection_status !== 'none' && (
          <div className="pt-2">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
              story.connection_status === 'connected'
                ? 'bg-emerald-100 text-emerald-700'
                : story.connection_status === 'pending_sent'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
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
    <div className="min-h-screen bg-premium-mesh relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-pink-900/10 to-rose-900/10" />
      <div className="absolute top-40 left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse" />
      
      <div className="relative z-10 px-4 pb-28 pt-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8"
          >
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 bg-clip-text text-transparent mb-2">
                Discover Stories
              </h1>
              <p className="text-gray-600">
                Find meaningful connections through authentic stories
              </p>
            </div>
            
            <div className="glass-card rounded-3xl px-6 py-4 text-center">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Tokens</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                {tokenBalance === null ? '...' : tokenBalance}
              </p>
            </div>
          </motion.div>

          {/* Filter Controls */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between mb-6"
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
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card rounded-3xl p-8 mb-8"
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

              <div className="flex flex-wrap gap-4 mt-8">
                <motion.button
                  type="button"
                  onClick={() => setFiltersApplied(filtersDraft)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="premium-button"
                >
                  Apply Filters
                </motion.button>
                <motion.button
                  type="button"
                  onClick={clearFilters}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass-card rounded-2xl px-6 py-3 font-semibold text-gray-600 hover:text-gray-700 transition-colors"
                >
                  Clear All
                </motion.button>
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
          <div className="flex flex-col items-center">
            {loading ? (
              <div className="grid w-full max-w-md gap-8">
                {Array.from({ length: 2 }).map((_, index) => (
                  <StoryCardSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            ) : stories.length > 0 ? (
              <div className="relative w-full max-w-md mx-auto">
                <CardStack
                  items={stories}
                  onSwipeLeft={handlePass}
                  onSwipeRight={handleSwipeRight}
                  onSwipeUp={(story) => setSelectedStory(story)}
                  onCardClick={(story) => setSelectedStory(story)}
                  renderCard={renderCard}
                />
                <HeartAnimation trigger={heartTrigger} />
              </div>
            ) : (
              <div className="w-full max-w-md">
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
                    Accept (3 tokens)
                  </motion.button>
                ) : currentStory.connection_status === 'none' ? (
                  <motion.button
                    type="button"
                    onClick={() => handleConnect(currentStory)}
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
            <div className="mt-8 flex justify-center">
              <LoadingSpinner label="Loading more stories..." />
            </div>
          )}

          {!hasMore && stories.length > 0 && (
            <div className="mt-8 text-center text-gray-500">
              You've seen all available stories. Check back later for more!
            </div>
          )}

          <div ref={sentinelRef} className="h-8" />
        </div>
      </div>

      {/* Undo Button */}
      {swipeHistory.length > 0 && (
        <motion.button
          type="button"
          onClick={handleUndo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-32 left-6 z-40 glass-card rounded-full px-4 py-2 text-sm font-semibold text-gray-600 shadow-lg md:bottom-12"
        >
          ↶ Undo
        </motion.button>
      )}

      {/* Story Detail Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl glass-card rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/20 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
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
            
            <div className="max-h-[70vh] overflow-y-auto">
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
    </div>
  );
};

export default StoryFeed;