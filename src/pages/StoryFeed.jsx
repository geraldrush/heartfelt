// src/pages/StoryFeed.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  <div className="overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-xl">
    <div className="h-56 w-full animate-shimmer bg-gradient-to-r from-rose-100 via-rose-200 to-rose-100 bg-[length:200%_100%]" />
    <div className="space-y-3 p-5">
      <div className="h-4 w-1/2 animate-shimmer rounded bg-gradient-to-r from-rose-100 via-rose-200 to-rose-100 bg-[length:200%_100%]" />
      <div className="h-3 w-2/3 animate-shimmer rounded bg-gradient-to-r from-rose-100 via-rose-200 to-rose-100 bg-[length:200%_100%]" />
      <div className="h-3 w-3/4 animate-shimmer rounded bg-gradient-to-r from-rose-100 via-rose-200 to-rose-100 bg-[length:200%_100%]" />
      <div className="h-10 w-32 animate-shimmer rounded bg-gradient-to-r from-rose-100 via-rose-200 to-rose-100 bg-[length:200%_100%]" />
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

  const fetchStories = async ({ reset = false } = {}) => {
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
  };

  useEffect(() => {
    fetchStories({ reset: true });
  }, [filtersApplied]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    if (stories.length < 5) {
      fetchStories({ reset: false });
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
  }, [hasMore, loadingMore, loading, filtersApplied]);

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
    <svg
      viewBox="0 0 64 64"
      className="h-12 w-12 text-rose-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 20c-4 0-8 3-8 8 0 6 6 12 13 17l7 5 7-5c7-5 13-11 13-17 0-5-4-8-8-8-4 0-7 2-9 5-2-3-5-5-9-5z" />
      <path d="M32 20l8 12-8 10-8-10 8-12z" />
    </svg>
  );

  const renderCard = (story) => (
    <div className="flex h-full flex-col">
      <div className="relative h-64">
        {story.blurred_image_url ? (
          <img
            src={story.blurred_image_url}
            alt="Story"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-rose-100" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-rose-600">
          {story.distance_km && story.distance_km < 999000
            ? `${story.distance_km.toFixed(1)} km away`
            : 'Distance unknown'}
        </span>
        <span className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              story.is_online ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          />
          {story.is_online ? 'Online' : 'Offline'}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {story.age} · {story.gender} · {story.location_city}
            </p>
            <p className="text-xs text-slate-500">{story.location_province}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>{story.religion || '—'}</span>
            <span>{story.race || '—'}</span>
            <span>{story.education || '—'}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span>{story.has_kids ? `Has ${story.num_kids} kids` : 'No kids'}</span>
            <span>{story.smoker ? '🚬 Smoker' : '🚭 Non-smoker'}</span>
            <span>{story.drinks_alcohol ? '🍷 Drinks' : '🚫 No alcohol'}</span>
          </div>
          <p className="text-sm text-slate-600">{truncateText(story.story_text)}</p>
        </div>
        {story.connection_status !== 'none' && (
          <span
            className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              story.connection_status === 'connected'
                ? 'bg-emerald-100 text-emerald-700'
                : story.connection_status === 'pending_sent'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-sky-100 text-sky-700'
            }`}
          >
            {story.connection_status === 'connected'
              ? 'Connected'
              : story.connection_status === 'pending_sent'
              ? 'Request Sent'
              : 'Wants to Connect'}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-pink-50 to-peach-100 px-4 pb-28 pt-8 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Discover Stories</h2>
            <p className="mt-2 text-sm text-slate-600">
              Explore by distance and values.
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 px-5 py-3 text-center shadow">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tokens</p>
            <p className="mt-1 text-2xl font-semibold">
              {tokenBalance === null ? '...' : tokenBalance}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <motion.button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow hover:bg-rose-50"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </motion.button>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600">
            {activeFilterCount} filters
          </span>
        </div>

        {showFilters && (
          <div className="mt-4 rounded-2xl bg-white p-6 text-slate-700 shadow">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Age min</label>
                <input
                  type="number"
                  min="18"
                  value={ageMin}
                  onChange={(event) => setAgeMin(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Age max</label>
                <input
                  type="number"
                  min="18"
                  value={ageMax}
                  onChange={(event) => setAgeMax(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                >
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Religion</label>
                <select
                  value={religion}
                  onChange={(event) => setReligion(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
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
                <label className="text-sm font-medium">Race</label>
                <select
                  value={race}
                  onChange={(event) => setRace(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
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
                <label className="text-sm font-medium">Education</label>
                <select
                  value={education}
                  onChange={(event) => setEducation(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                >
                  <option value="">Any</option>
                  {(referenceData?.education_levels || []).map((option) => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Nationality</label>
                <select
                  value={nationality}
                  onChange={(event) => setNationality(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
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
                <label className="text-sm font-medium">Has Kids</label>
                <select
                  value={hasKids}
                  onChange={(event) => setHasKids(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              {hasKids === 'true' && (
                <div>
                  <label className="text-sm font-medium">Number of Kids</label>
                  <select
                    value={numKids}
                    onChange={(event) => setNumKids(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                  >
                    <option value="">Any</option>
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3+</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Smoker</label>
                <select
                  value={smoker}
                  onChange={(event) => setSmoker(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Drinks Alcohol</label>
                <select
                  value={drinksAlcohol}
                  onChange={(event) => setDrinksAlcohol(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-rose-400 focus:outline-none"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Max Distance</label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={maxDistance}
                  onChange={(event) => setMaxDistance(Number(event.target.value))}
                  className="mt-2 w-full accent-rose-400"
                />
                <p className="mt-1 text-xs text-slate-500">{maxDistance} km</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <motion.button
                type="button"
                onClick={() => setFiltersApplied(filtersDraft)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-rose-500 hover:to-pink-500"
              >
                Apply Filters
              </motion.button>
              <motion.button
                type="button"
                onClick={clearFilters}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Clear All
              </motion.button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
            {error}
            {error.toLowerCase().includes('insufficient') && (
              <span className="ml-2">
                <a href="/tokens" className="font-semibold text-rose-600">
                  Buy tokens
                </a>
              </span>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center">
          {loading ? (
            <div className="grid w-full max-w-md gap-6">
              {Array.from({ length: 2 }).map((_, index) => (
                <StoryCardSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          ) : stories.length > 0 ? (
            <div className="relative">
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
                description="Try adjusting your filters or check back later!"
                actionButton={(
                  <motion.button
                    type="button"
                    onClick={clearFilters}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:from-rose-500 hover:to-pink-500"
                  >
                    Clear Filters
                  </motion.button>
                )}
              />
            </div>
          )}

          {currentStory && (
            <div className="mt-6 hidden w-full max-w-md items-center justify-between gap-4 md:flex">
              <motion.button
                type="button"
                onClick={() => handlePass(currentStory)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-600 shadow"
              >
                Pass
              </motion.button>
              {currentStory.connection_status === 'pending_received' ? (
                <motion.button
                  type="button"
                  onClick={() => handleAccept(currentStory)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow"
                >
                  Accept (3 tokens)
                </motion.button>
              ) : currentStory.connection_status === 'none' ? (
                <motion.button
                  type="button"
                  onClick={() => handleConnect(currentStory)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow"
                >
                  Connect (5 tokens)
                </motion.button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-500"
                >
                  {currentStory.connection_status === 'connected' ? 'Connected' : 'Request Sent'}
                </button>
              )}
            </div>
          )}
        </div>

        {loadingMore && (
          <div className="mt-6 flex justify-center">
            <LoadingSpinner label="Loading more stories..." />
          </div>
        )}

        {!hasMore && stories.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-500">No more stories.</div>
        )}

        <div ref={sentinelRef} className="h-6" />
      </div>

      {swipeHistory.length > 0 && (
        <motion.button
          type="button"
          onClick={handleUndo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-24 left-6 z-40 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-lg md:bottom-10"
        >
          Undo
        </motion.button>
      )}

      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {selectedStory.age} · {selectedStory.gender}
                </h3>
                <p className="text-sm text-slate-500">{selectedStory.location_city}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStory(null)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="h-64 w-full bg-rose-100">
                {selectedStory.blurred_image_url && (
                  <img
                    src={selectedStory.blurred_image_url}
                    alt="Story"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="space-y-4 px-6 py-5 text-sm text-slate-600">
                <p>{selectedStory.story_text}</p>
                <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <span>Religion: {selectedStory.religion || '—'}</span>
                  <span>Race: {selectedStory.race || '—'}</span>
                  <span>Education: {selectedStory.education || '—'}</span>
                  <span>Kids: {selectedStory.has_kids ? selectedStory.num_kids : 'No'}</span>
                  <span>Smoker: {selectedStory.smoker ? 'Yes' : 'No'}</span>
                  <span>Drinks: {selectedStory.drinks_alcohol ? 'Yes' : 'No'}</span>
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
