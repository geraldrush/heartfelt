// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { FaPen, FaSignOutAlt, FaTachometerAlt, FaCamera, FaSave, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrentUser, updateProfile, getTokenBalance } from '../utils/api.js';
import Button from '../components/ui/Button.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

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
      await updateProfile(updateData);
      
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
      <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
        <div className="flex-grow">
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
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
            <p className="text-gray-900">{value || 'Not set'}</p>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => startEdit(field, value)}
            className="ml-3 text-rose-500 hover:text-rose-600"
          >
            <FaPen className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="mobile-container pull-to-refresh bg-premium-mesh p-4 pb-[calc(100px+env(safe-area-inset-bottom,0px))] md:pb-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 bg-clip-text text-transparent">Profile</h1>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/landing')}>
              <FaTachometerAlt className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <FaSignOutAlt className="w-4 h-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>

        {error && (
          <div className="glass-card rounded-2xl px-4 py-3 text-red-600 mb-6">
            {error}
          </div>
        )}

        {/* Token Balance */}
        <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Token Balance</h2>
              <p className="text-3xl font-bold text-rose-600 mt-2">
                {tokenBalance === null ? '...' : tokenBalance} Tokens
              </p>
            </div>
            <Button onClick={() => navigate('/tokens')} size="sm">
              Buy Tokens
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
          <div className="space-y-1">
            {renderField('Full Name', 'full_name', user.full_name)}
            {renderField('Email', 'email', user.email)}
            {renderField('Age', 'age', user.age, 'number')}
            {renderField('Gender', 'gender', user.gender, 'select')}
          </div>
        </div>

        {/* Location */}
        <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Location</h3>
          <div className="space-y-1">
            {renderField('City', 'location_city', user.location_city)}
            {renderField('Province', 'location_province', user.location_province)}
            {renderField('Nationality', 'nationality', user.nationality)}
          </div>
        </div>

        {/* Personal Details */}
        <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Details</h3>
          <div className="space-y-1">
            {renderField('Religion', 'religion', user.religion)}
            {renderField('Race', 'race', user.race)}
            {renderField('Education', 'education', user.education)}
          </div>
        </div>

        {/* Lifestyle */}
        <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Lifestyle</h3>
          <div className="space-y-1">
            {renderField('Has Kids', 'has_kids', user.has_kids ? 'Yes' : 'No')}
            {user.has_kids && renderField('Number of Kids', 'num_kids', user.num_kids, 'number')}
            {renderField('Smoker', 'smoker', user.smoker ? 'Yes' : 'No')}
            {renderField('Drinks Alcohol', 'drinks_alcohol', user.drinks_alcohol ? 'Yes' : 'No')}
          </div>
        </div>

        {/* Story */}
        <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">My Story</h3>
          {renderField('Story', 'story_text', user.story_text, 'textarea')}
        </div>

        {/* Profile Status */}
        <div className="glass-card p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Profile Status</h3>
              <p className={`text-sm mt-1 ${
                user.profile_complete ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {user.profile_complete ? '✅ Complete' : '⚠️ Incomplete'}
              </p>
            </div>
            {!user.profile_complete && (
              <Button onClick={() => navigate('/create-profile')} size="sm">
                Complete Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
