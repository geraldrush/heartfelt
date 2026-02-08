// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCamera,
  FaCloudUploadAlt,
  FaSignOutAlt,
  FaTachometerAlt,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createStory,
  deleteAccount,
  getCurrentUser,
  getReferenceData,
  getTokenBalance,
  updateProfile,
  uploadStoryImage,
} from '../utils/api.js';
import Button from '../components/ui/Button.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { getProfileCompletion } from '../utils/profileCompletion.js';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const NATIONALITIES = [
  'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Ghana', 'Ethiopia', 'Uganda', 'Tanzania',
  'Morocco', 'Algeria', 'Tunisia', 'Angola', 'Mozambique', 'Namibia', 'Botswana',
  'Zimbabwe', 'Zambia', 'Rwanda', 'Senegal', 'Cameroon', 'DR Congo', 'Sudan', 'Somalia',
  'Eritrea', 'South Sudan', 'Libya', 'Mauritius', 'Seychelles', 'Ivory Coast', 'Sierra Leone',
  'Gambia', 'Mali', 'Niger', 'Benin', 'Togo', 'Burkina Faso', 'Guinea', 'Liberia', 'Gabon',
  'Equatorial Guinea', 'Republic of Congo', 'Central African Republic', 'Chad', 'Malawi',
  'Madagascar', 'Comoros', 'Cabo Verde', 'Djibouti', 'Lesotho', 'Eswatini',
  'United Kingdom', 'United States', 'Canada', 'France', 'Germany', 'Netherlands',
  'Portugal', 'Spain', 'Italy', 'Australia', 'United Arab Emirates', 'Qatar',
];

const CITY_SUGGESTIONS = [
  'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Bloemfontein', 'Gqeberha',
  'Nairobi', 'Lagos', 'Abuja', 'Accra', 'Kumasi', 'Addis Ababa', 'Cairo', 'Alexandria',
  'Casablanca', 'Rabat', 'Tunis', 'Algiers', 'Tripoli', 'Khartoum', 'Kampala',
  'Dar es Salaam', 'Zanzibar', 'Maputo', 'Luanda', 'Harare', 'Bulawayo', 'Lusaka',
  'Gaborone', 'Windhoek', 'Kigali', 'Dakar', 'Abidjan', 'Yaounde', 'Douala',
  'Mombasa', 'Port Harcourt', 'Enugu', 'Ibadan',
  'London', 'Paris', 'Berlin', 'Amsterdam', 'Lisbon', 'Madrid', 'Rome',
  'New York', 'Washington', 'Toronto', 'Vancouver', 'Dubai', 'Doha', 'Sydney', 'Melbourne',
];

const PROVINCE_SUGGESTIONS = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State',
  'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape',
  'Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Delta',
  'Nairobi County', 'Mombasa County', 'Kisumu County',
  'Greater Accra', 'Ashanti', 'Western', 'Northern',
  'Cairo Governorate', 'Giza Governorate', 'Alexandria Governorate',
  'Casablanca-Settat', 'Rabat-Salé-Kénitra', 'Tunis', 'Algiers Province',
  'Harare Province', 'Bulawayo Province', 'Lusaka Province', 'Kigali City',
  'Greater London', 'Île-de-France', 'Berlin', 'Madrid', 'Lisbon', 'Rome',
  'New York State', 'California', 'Texas', 'Ontario', 'British Columbia',
  'Dubai', 'Doha', 'New South Wales', 'Victoria',
];

const Profile = () => {
  const navigate = useNavigate();
  const { logout, user: authUser, updateUser } = useAuth();

  const [user, setUser] = useState(null);
  const [referenceData, setReferenceData] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    age: '',
    gender: '',
    nationality: '',
    religion: '',
    race: '',
    has_kids: false,
    num_kids: 0,
    smoker: false,
    drinks_alcohol: false,
    location_city: '',
    location_province: '',
    seeking_gender: 'any',
    seeking_age_min: '',
    seeking_age_max: '',
    seeking_races: [],
  });

  const [storyText, setStoryText] = useState('');
  const [images, setImages] = useState([]);
  const [storyError, setStoryError] = useState('');
  const [storyStatus, setStoryStatus] = useState('');
  const [uploadingStory, setUploadingStory] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userData, balanceData, refs] = await Promise.all([
          getCurrentUser(),
          getTokenBalance(),
          getReferenceData(),
        ]);
        setUser(userData.user);
        setTokenBalance(balanceData.balance);
        setReferenceData(refs);
        setForm((prev) => ({
          ...prev,
          full_name: userData.user?.full_name || '',
          email: userData.user?.email || '',
          age: userData.user?.age ?? '',
          gender: userData.user?.gender || '',
          nationality: userData.user?.nationality || '',
          religion: userData.user?.religion || '',
          race: userData.user?.race || '',
          has_kids: Boolean(userData.user?.has_kids),
          num_kids: userData.user?.num_kids ?? 0,
          smoker: Boolean(userData.user?.smoker),
          drinks_alcohol: Boolean(userData.user?.drinks_alcohol),
          location_city: userData.user?.location_city || '',
          location_province: userData.user?.location_province || '',
          seeking_gender: userData.user?.seeking_gender || 'any',
          seeking_age_min: userData.user?.seeking_age_min ?? '',
          seeking_age_max: userData.user?.seeking_age_max ?? '',
          seeking_races: Array.isArray(userData.user?.seeking_races)
            ? userData.user?.seeking_races
            : userData.user?.seeking_races
              ? JSON.parse(userData.user?.seeking_races)
              : [],
        }));
      } catch (err) {
        setError(err.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const completion = useMemo(() => getProfileCompletion(user || authUser), [user, authUser]);

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/', { replace: true });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      'This will permanently delete your account and profile. This action cannot be undone.'
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteAccount();
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        age: Number(form.age),
        gender: form.gender,
        nationality: form.nationality.trim(),
        religion: form.religion,
        race: form.race,
        has_kids: Boolean(form.has_kids),
        num_kids: form.has_kids ? Number(form.num_kids) : 0,
        smoker: Boolean(form.smoker),
        drinks_alcohol: Boolean(form.drinks_alcohol),
        location_city: form.location_city.trim(),
        location_province: form.location_province.trim(),
        seeking_gender: form.seeking_gender || 'any',
        seeking_age_min: form.seeking_age_min === '' ? undefined : Number(form.seeking_age_min),
        seeking_age_max: form.seeking_age_max === '' ? undefined : Number(form.seeking_age_max),
        seeking_races: Array.isArray(form.seeking_races) ? form.seeking_races : [],
      };

      const data = await updateProfile(payload);
      setUser(data.user);
      updateUser(data.user);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    let fileError = '';
    const nextImages = [...images];

    for (const file of files) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        fileError = 'Only JPG, PNG, or WEBP files are allowed.';
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        fileError = 'Each image must be smaller than 5MB.';
        continue;
      }
      if (nextImages.length >= MAX_IMAGES) {
        fileError = 'You can upload up to 5 photos.';
        break;
      }

      nextImages.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setImages(nextImages);
    setStoryError(fileError);
    event.target.value = '';
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const next = prev.filter((image) => image.id !== id);
      const removed = prev.find((image) => image.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return next;
    });
  };

  const handleCreateStory = async () => {
    setStoryError('');
    setStoryStatus('');

    if (storyText.trim().length < 50) {
      setStoryError('Story must be at least 50 characters.');
      return;
    }
    if (images.length < 1) {
      setStoryError('Please add at least one photo.');
      return;
    }

    setUploadingStory(true);
    setUploadProgress({ current: 0, total: images.length });

    try {
      const uploadedImageIds = [];
      for (let i = 0; i < images.length; i += 1) {
        setUploadProgress({ current: i + 1, total: images.length });
        const formData = new FormData();
        formData.append('image_original', images[i].file);
        formData.append('image_blurred', images[i].file);
        const response = await uploadStoryImage(formData);
        if (response?.image_id) {
          uploadedImageIds.push(response.image_id);
        }
      }

      if (uploadedImageIds.length === 0) {
        throw new Error('Image upload failed.');
      }

      await createStory({
        story_text: storyText.trim(),
        image_ids: uploadedImageIds,
      });

      setStoryStatus('Your story has been updated.');
      setStoryText('');
      images.forEach((image) => URL.revokeObjectURL(image.preview));
      setImages([]);
    } catch (err) {
      setStoryError(err.message || 'Failed to update story.');
    } finally {
      setUploadingStory(false);
    }
  };

  if (loading) {
    return (
      <div className="mobile-container pull-to-refresh bg-premium-mesh flex items-center justify-center">
        <LoadingSpinner label="Loading profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mobile-container pull-to-refresh bg-premium-mesh p-4">
        <div className="text-center text-red-600">Failed to load profile data</div>
      </div>
    );
  }

  const religions = referenceData?.religions || [];
  const races = referenceData?.races || [];

  return (
    <div className="mobile-container pull-to-refresh bg-premium-mesh pb-[calc(110px+env(safe-area-inset-bottom,0px))] md:pb-8">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">My account</p>
              <h1 className="text-3xl font-semibold text-slate-900 mt-2">Profile</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <FaSignOutAlt className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile completion</p>
                  <button
                    type="button"
                    onClick={() => setShowMissing((prev) => !prev)}
                    className="h-5 w-5 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-500"
                    aria-label="Show missing fields"
                  >
                    i
                  </button>
                </div>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{completion.percent}%</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => navigate('/profile/preview')}>
                  Preview
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/stories')}>
                  <FaTachometerAlt className="w-4 h-4 mr-1" />
                  Browse
                </Button>
              </div>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Complete your profile for better matches.
            </p>
            {showMissing && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700 mb-2">Missing details</p>
                {completion.missing.length === 0 ? (
                  <p>All set! Your profile is complete.</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    {completion.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="glass-card rounded-2xl px-4 py-3 text-red-600 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="grid gap-4">
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Story & photos</h2>
                <p className="text-sm text-slate-500">
                  Add your story and photos to appear in the feed.
                </p>
              </div>
              <FaCamera className="text-slate-400" />
            </div>

            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Your Story
            </label>
            <textarea
              value={storyText}
              onChange={(event) => setStoryText(event.target.value)}
              className="mt-2 w-full premium-input min-h-[120px] resize-none"
              placeholder="Share your story (at least 50 characters)."
              maxLength={500}
            />

            <div className="mt-4">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Upload photos
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white/70 px-4 py-6 text-sm text-slate-600 hover:border-emerald-300">
                  <FaCloudUploadAlt className="text-2xl text-emerald-500 mb-2" />
                  <span>Tap to add photos</span>
                  <span className="text-xs text-slate-400 mt-1">Max 5 images</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {images.map((image) => (
                    <div key={image.id} className="relative overflow-hidden rounded-2xl">
                      <img
                        src={image.preview}
                        alt="Preview"
                        className="h-20 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {storyError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {storyError}
              </div>
            )}

            {!storyError && storyStatus && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {storyStatus}
              </div>
            )}

            {uploadingStory && uploadProgress.total > 0 && (
              <div className="mt-3 text-xs text-slate-500">
                Uploading image {uploadProgress.current} of {uploadProgress.total}...
              </div>
            )}

            <button
              type="button"
              onClick={handleCreateStory}
              disabled={uploadingStory}
              className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {uploadingStory ? 'Saving...' : 'Save Story & Photos'}
            </button>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Token balance</h2>
                <p className="text-sm text-slate-500">Use tokens to connect faster.</p>
              </div>
              <Button onClick={() => navigate('/tokens')} size="sm">
                Buy Tokens
              </Button>
            </div>
            <div className="text-3xl font-semibold text-rose-500">
              {tokenBalance === null ? '...' : tokenBalance}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  className="mt-2 w-full premium-input"
                  placeholder="Your name"
                  disabled
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="mt-2 w-full premium-input"
                  placeholder="you@example.com"
                  disabled
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Age</label>
                <input
                  type="number"
                  min="18"
                  value={form.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  className="mt-2 w-full premium-input"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="mt-2 w-full premium-input"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">City</label>
                <input
                  type="text"
                  value={form.location_city}
                  onChange={(e) => updateField('location_city', e.target.value)}
                  className="mt-2 w-full premium-input"
                  placeholder="Search city"
                  list="city-suggestions"
                  required
                />
                <datalist id="city-suggestions">
                  {CITY_SUGGESTIONS.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">State / Province / Region</label>
                <input
                  type="text"
                  value={form.location_province}
                  onChange={(e) => updateField('location_province', e.target.value)}
                  className="mt-2 w-full premium-input"
                  placeholder="Region"
                  list="province-suggestions"
                  required
                />
                <datalist id="province-suggestions">
                  {PROVINCE_SUGGESTIONS.map((province) => (
                    <option key={province} value={province} />
                  ))}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nationality</label>
                <input
                  type="text"
                  value={form.nationality}
                  onChange={(e) => updateField('nationality', e.target.value)}
                  className="mt-2 w-full premium-input"
                  placeholder="Search nationality"
                  list="nationality-suggestions"
                  required
                />
                <datalist id="nationality-suggestions">
                  {NATIONALITIES.map((country) => (
                    <option key={country} value={country} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Personal details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Religion</label>
                <select
                  value={form.religion}
                  onChange={(e) => updateField('religion', e.target.value)}
                  className="mt-2 w-full premium-input"
                  required
                >
                  <option value="">Select religion</option>
                  {religions.map((option) => (
                    <option key={option.id} value={option.name}>{option.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Race</label>
                <select
                  value={form.race}
                  onChange={(e) => updateField('race', e.target.value)}
                  className="mt-2 w-full premium-input"
                  required
                >
                  <option value="">Select race</option>
                  {races.map((option) => (
                    <option key={option.id} value={option.name}>{option.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Lifestyle</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Has kids</label>
                <select
                  value={form.has_kids ? 'yes' : 'no'}
                  onChange={(e) => updateField('has_kids', e.target.value === 'yes')}
                  className="mt-2 w-full premium-input"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Number of kids</label>
                <select
                  value={form.has_kids ? String(form.num_kids) : '0'}
                  onChange={(e) => updateField('num_kids', Number(e.target.value))}
                  className="mt-2 w-full premium-input"
                  disabled={!form.has_kids}
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3+</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Smoker</label>
                <select
                  value={form.smoker ? 'yes' : 'no'}
                  onChange={(e) => updateField('smoker', e.target.value === 'yes')}
                  className="mt-2 w-full premium-input"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Drinks alcohol</label>
                <select
                  value={form.drinks_alcohol ? 'yes' : 'no'}
                  onChange={(e) => updateField('drinks_alcohol', e.target.value === 'yes')}
                  className="mt-2 w-full premium-input"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Preferences</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Seeking</label>
                <select
                  value={form.seeking_gender}
                  onChange={(e) => updateField('seeking_gender', e.target.value)}
                  className="mt-2 w-full premium-input"
                >
                  <option value="any">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Age min</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={form.seeking_age_min}
                  onChange={(e) => updateField('seeking_age_min', e.target.value)}
                  className="mt-2 w-full premium-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Age max</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={form.seeking_age_max}
                  onChange={(e) => updateField('seeking_age_max', e.target.value)}
                  className="mt-2 w-full premium-input"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Seeking races</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {races.map((option) => {
                  const checked = Array.isArray(form.seeking_races) && form.seeking_races.includes(option.name);
                  return (
                    <label key={option.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = checked
                            ? form.seeking_races.filter((race) => race !== option.name)
                            : [...form.seeking_races, option.name];
                          updateField('seeking_races', next);
                        }}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      <span>{option.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Saving changes...' : 'Save Profile Changes'}
            </button>
            <p className="text-xs text-slate-500 text-center">
              Your profile is updated in one submission.
            </p>
          </div>
        </form>

        <div className="glass-card rounded-3xl p-5 border border-red-100 mt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Delete account</h2>
          <p className="text-sm text-slate-500">
            This will permanently remove your profile, story, and connections.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="mt-4 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            {deletingAccount ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
