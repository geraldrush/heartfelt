import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { updateOnboardingBasics } from '../utils/api.js';
import { getProfileCompletion, isBasicProfileComplete } from '../utils/profileCompletion.js';

const OnboardingBasics = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const initialAge = user?.age ? String(user.age) : '';
  const initialGender = user?.gender || '';
  const initialSeekingGender = user?.seeking_gender || '';

  const [age, setAge] = useState(initialAge);
  const [gender, setGender] = useState(initialGender);
  const [seekingGender, setSeekingGender] = useState(initialSeekingGender);
  const [confirm18, setConfirm18] = useState(Boolean(Number(initialAge) >= 18));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const completion = useMemo(() => getProfileCompletion(user), [user]);

  useEffect(() => {
    if (isBasicProfileComplete(user)) {
      navigate('/stories', { replace: true });
    }
  }, [navigate, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const numericAge = Number(age);
    if (!confirm18 || !Number.isFinite(numericAge) || numericAge < 18) {
      setError('You must confirm you are 18+ and enter a valid age.');
      return;
    }
    if (!gender) {
      setError('Please select your gender.');
      return;
    }
    if (!seekingGender) {
      setError('Please select who you are looking for.');
      return;
    }

    setSaving(true);
    try {
      const { user: updatedUser } = await updateOnboardingBasics({
        age: numericAge,
        gender,
        seeking_gender: seekingGender,
      });
      updateUser(updatedUser);
      navigate('/stories', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to save your details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-premium-mesh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl glass-card rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-400">Welcome</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-3">Quick confirmation</h1>
          <p className="text-sm text-slate-600 mt-3">
            Confirm your basics so we can show you the right stories.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm text-slate-500">Profile completion</span>
            <span className="text-sm font-semibold text-emerald-600">{completion.percent}%</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="age-input" className="text-sm font-medium text-slate-700">Age</label>
            <input
              id="age-input"
              type="number"
              min="18"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="mt-2 w-full premium-input"
              placeholder="18"
            />
          </div>

          <div>
            <label htmlFor="gender-select" className="text-sm font-medium text-slate-700">Gender</label>
            <select
              id="gender-select"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className="mt-2 w-full premium-input"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="seeking-select" className="text-sm font-medium text-slate-700">Looking for</label>
            <select
              id="seeking-select"
              value={seekingGender}
              onChange={(event) => setSeekingGender(event.target.value)}
              className="mt-2 w-full premium-input"
            >
              <option value="">Select preference</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={confirm18}
              onChange={(event) => setConfirm18(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            I confirm that I am 18 years or older.
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full premium-button"
          >
            {saving ? 'Saving...' : 'Continue to stories'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingBasics;
