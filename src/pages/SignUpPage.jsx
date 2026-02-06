import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { emailSignup, googleAuth } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isBasicProfileComplete } from '../utils/profileCompletion.js';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await emailSignup({ email, password, full_name: fullName.trim() });
      login(data.token, data.user);
      navigate(isBasicProfileComplete(data.user) ? '/stories' : '/onboarding-basics');
    } catch (err) {
      setError(err.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const data = await googleAuth(credentialResponse.credential);
      login(data.token, data.user);
      navigate(isBasicProfileComplete(data.user) ? '/stories' : '/onboarding-basics');
    } catch (err) {
      setError(err.message || 'Google sign-up failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFailure = () => {
    setError('Google sign-up failed. Please try again.');
  };

  return (
    <div className="min-h-screen bg-premium-mesh">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-2 py-8 sm:px-6 sm:py-12">
        <div className="w-full glass-card p-6 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                AfroDate
              </h1>
              <p className="mt-4 text-base text-slate-600">
                Create your account and start connecting through stories and shared values.
              </p>

              <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Create account
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Already have one?
                  </button>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Full name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="mt-2 w-full premium-input"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-2 w-full premium-input"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 w-full premium-input"
                      placeholder="At least 8 characters"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Confirm password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="mt-2 w-full premium-input"
                      placeholder="Re-enter your password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full premium-button"
                  >
                    {loading ? 'Please wait...' : 'Create account'}
                  </button>
                </form>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Or
                  </span>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleFailure}
                    type="standard"
                    shape="pill"
                    theme="filled_blue"
                    text="continue_with"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-slate-900 p-6 sm:p-10 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-rose-300">
                  Heart-first dating
                </p>
                <h3 className="mt-4 text-3xl font-semibold">
                  Build trust before you reveal.
                </h3>
                <p className="mt-4 text-sm text-slate-300">
                  Tell your story, set your preferences, and connect with people who share your values.
                </p>
              </div>
              <div className="mt-10 rounded-2xl bg-white/10 p-6 text-sm text-slate-200">
                <p className="font-semibold text-white">Getting started</p>
                <ul className="mt-3 space-y-2">
                  <li>Confirm you’re 18+.</li>
                  <li>Set who you’re looking for.</li>
                  <li>Complete your profile on your schedule.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <footer className="mt-10 text-xs text-slate-500">
          © {new Date().getFullYear()} AfroDate. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default SignUpPage;
