// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { FaPen, FaSignOutAlt, FaTachometerAlt, FaCamera, FaSave, FaTimes, FaCloudUploadAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createStory, getCurrentUser, updateProfilePartial, getTokenBalance, uploadStoryImage } from '../utils/api.js';
import Button from '../components/ui/Button.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { getProfileCompletion } from '../utils/profileCompletion.js';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const Profile = () => {
  const navigate = useNavigate();
  const { logout, user: authUser, updateUser } = useAuth();
  
  const [user, setUser] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [storyText, setStoryText] = useState('');
  const [images, setImages] = useState([]);
  const [storyError, setStoryError] = useState('');
  const [storyStatus, setStoryStatus] = useState('');
  const [uploadingStory, setUploadingStory] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userData, balanceData] = await Promise.all([
          getCurrentUser(),
          getTokenBalance()
        ]);
        setUser(userData.user);
        setTokenBalance(balanceData.balance);
      } catch (err) {
        setError(err.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);


  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/', { replace: true });
    }
  };

  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async () => {
    if (!editingField || !user) return;
    
    setSaving(true);
    setError('');
    
    try {
      const updateData = { [editingField]: editValue };
      await updateProfilePartial(updateData);
      
      const updatedUser = { ...user, [editingField]: editValue };
      setUser(updatedUser);
      updateUser(updatedUser);
      
      setEditingField(null);
      setEditValue('');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
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

  const renderField = (label, field, value, type = 'text') => {
    const isEditing = editingField === field;
    
    return (
      <div className="flex items-center justify-between gap-3 py-3 border-b border-white/60 last:border-b-0">
        <div className="flex-grow">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              {type === 'select' ? (
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="premium-input flex-1"
                >
                  <option value="">Select {label.toLowerCase()}</option>
                  {field === 'gender' && (
                    <>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
              ) : type === 'textarea' ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="premium-input flex-1 h-20 resize-none"
                  maxLength={500}
                />
              ) : (
                <input
                  type={type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="premium-input flex-1"
                  min={type === 'number' ? '18' : undefined}
                />
              )}
              <Button size="sm" onClick={saveField} disabled={saving}>
                <FaSave className="w-3 h-3" />
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEdit}>
                <FaTimes className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <p className="text-slate-900 font-medium">{value || 'Not set'}</p>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => startEdit(field, value)}
            className="ml-3 text-slate-400 hover:text-slate-600"
          >
            <FaPen className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  const completion = getProfileCompletion(user);

  return (
    <div className="mobile-container pull-to-refresh bg-premium-mesh pb-[calc(110px+env(safe-area-inset-bottom,0px))] md:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">My account</p>
              <h1 className="text-3xl font-semibold text-slate-900 mt-2">Profile</h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <FaSignOutAlt className="w-4 h-4 mr-1" />
              Sign Out
            </Button>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile completion</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{completion.percent}%</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/stories')}>
                <FaTachometerAlt className="w-4 h-4 mr-1" />
                Browse
              </Button>
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
          </div>
        </div>

        {error && (
          <div className="glass-card rounded-2xl px-4 py-3 text-red-600 mb-6">
            {error}
          </div>
        )}

        <div className="grid gap-4">
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
            <div className="space-y-1">
              {renderField('Full Name', 'full_name', user.full_name)}
              {renderField('Email', 'email', user.email)}
              {renderField('Age', 'age', user.age, 'number')}
              {renderField('Gender', 'gender', user.gender, 'select')}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
            <div className="space-y-1">
              {renderField('City', 'location_city', user.location_city)}
              {renderField('Province', 'location_province', user.location_province)}
              {renderField('Nationality', 'nationality', user.nationality)}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Personal details</h2>
            <div className="space-y-1">
              {renderField('Religion', 'religion', user.religion)}
              {renderField('Race', 'race', user.race)}
              {renderField('Education', 'education', user.education)}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Lifestyle</h2>
            <div className="space-y-1">
              {renderField('Has Kids', 'has_kids', user.has_kids ? 'Yes' : 'No')}
              {user.has_kids && renderField('Number of Kids', 'num_kids', user.num_kids, 'number')}
              {renderField('Smoker', 'smoker', user.smoker ? 'Yes' : 'No')}
              {renderField('Drinks Alcohol', 'drinks_alcohol', user.drinks_alcohol ? 'Yes' : 'No')}
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default Profile;
