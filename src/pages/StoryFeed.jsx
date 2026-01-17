// src/pages/StoryFeed.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getReferenceData,
  getStoryFeed,
  getTokenBalance,
  acceptConnectionRequest,
  sendConnectionRequest,
} from '../utils/api.js';

const PAGE_SIZE = 20;

const StoryCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl bg-white shadow">
    <div className="h-48 w-full animate-pulse bg-slate-200" />
    <div className="space-y-3 p-5">
      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="h-9 w-32 animate-pulse rounded bg-slate-200" />
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

  const handleConnect = async (story) => {
    if (tokenBalance !== null && tokenBalance < 5) {
      setError('You need at least 5 tokens to send a connection request.');
      return;
    }
    const confirmed = window.confirm(
      `Send connection request to ${story.age} from ${story.location_city}? This will cost 5 tokens.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await sendConnectionRequest({ receiver_id: story.user_id, message: '' });
      setStories((prev) =>
        prev.map((item) =>
          item.story_id === story.story_id
            ? { ...item, connection_status: 'pending_sent' }
            : item
        )
      );
      setTokenBalance((prev) => (prev !== null ? prev - 5 : prev));
    } catch (err) {
      setError(err.message || 'Failed to send connection request.');
    }
  };

  const handleAccept = async (story) => {
    if (tokenBalance !== null && tokenBalance < 3) {
      setError('You need at least 3 tokens to accept a connection request.');
      return;
    }
    const confirmed = window.confirm(
      `Accept connection request from ${story.location_city}? This will cost 3 tokens.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await acceptConnectionRequest(story.request_id);
      setStories((prev) =>
        prev.map((item) =>
          item.story_id === story.story_id
            ? { ...item, connection_status: 'connected' }
            : item
        )
      );
      setTokenBalance((prev) => (prev !== null ? prev - 3 : prev));
    } catch (err) {
      setError(err.message || 'Failed to accept connection request.');
    }
  };

  const truncateText = (text) =>
    text.length > 150 ? `${text.slice(0, 150)}...` : text;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Discover Stories</h2>
            <p className="mt-2 text-sm text-white/80">
              Explore by distance and values.
            </p>
          </div>
          <div className="rounded-2xl bg-white/20 px-5 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Tokens</p>
            <p className="mt-1 text-2xl font-semibold">
              {tokenBalance === null ? '...' : tokenBalance}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow hover:bg-blue-50"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <span className="rounded-full bg-white/30 px-3 py-1 text-xs font-semibold">
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Age max</label>
                <input
                  type="number"
                  min="18"
                  value={ageMax}
                  onChange={(event) => setAgeMax(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="mt-2 w-full"
                />
                <p className="mt-1 text-xs text-slate-500">{maxDistance} km</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setFiltersApplied(filtersDraft)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
            {error}
            {error.toLowerCase().includes('insufficient') && (
              <span className="ml-2">
                <a href="/tokens" className="font-semibold text-blue-600">
                  Buy tokens
                </a>
              </span>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <StoryCardSkeleton key={`skeleton-${index}`} />
              ))
            : stories.map((story) => (
                <div key={story.story_id} className="overflow-hidden rounded-2xl bg-white text-slate-700 shadow">
                  <div className="relative">
                    {story.blurred_image_url ? (
                      <img
                        src={story.blurred_image_url}
                        alt="Story"
                        loading="lazy"
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="h-48 w-full bg-slate-200" />
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-600">
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
                  <div className="space-y-3 p-5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {story.age} · {story.gender} · {story.location_city}
                      </p>
                      <p className="text-xs text-slate-500">
                        {story.location_province}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{story.religion || '—'}</span>
                      <span>{story.race || '—'}</span>
                      <span>{story.education || '—'}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>
                        {story.has_kids ? `Has ${story.num_kids} kids` : 'No kids'}
                      </span>
                      <span>{story.smoker ? '🚬 Smoker' : '🚭 Non-smoker'}</span>
                      <span>{story.drinks_alcohol ? '🍷 Drinks' : '🚫 No alcohol'}</span>
                    </div>
                    <p className="text-sm text-slate-600">{truncateText(story.story_text)}</p>
                    {story.connection_status !== 'none' && (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
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
                    {story.connection_status === 'pending_received' && (
                      <button
                        type="button"
                        onClick={() => handleAccept(story)}
                        disabled={tokenBalance !== null && tokenBalance < 3}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {tokenBalance !== null && tokenBalance < 3
                          ? 'Insufficient Tokens'
                          : 'Accept (3 tokens)'}
                      </button>
                    )}
                    {story.connection_status === 'none' && (
                      <button
                        type="button"
                        onClick={() => handleConnect(story)}
                        disabled={tokenBalance !== null && tokenBalance < 5}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {tokenBalance !== null && tokenBalance < 5
                          ? 'Insufficient Tokens'
                          : 'Connect (5 tokens)'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
        </div>

        {!loading && stories.length === 0 && (
          <div className="mt-10 rounded-2xl bg-white/20 px-6 py-8 text-center text-sm text-white/80">
            No stories match your filters. Try adjusting your preferences.
          </div>
        )}

        {loadingMore && (
          <div className="mt-6 text-center text-sm text-white/80">Loading more stories...</div>
        )}

        {!hasMore && stories.length > 0 && (
          <div className="mt-6 text-center text-sm text-white/80">No more stories.</div>
        )}

        <div ref={sentinelRef} className="h-6" />
      </div>
    </div>
  );
};

export default StoryFeed;
