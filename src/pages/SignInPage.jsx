import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { emailLogin, googleAuth } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const SignInPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await emailLogin({ email, password });
      login(data.token, data.user);
      navigate(data.user.profile_complete ? '/stories' : '/create-profile');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
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
      navigate(data.user.profile_complete ? '/stories' : '/create-profile');
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFailure = () => {
    setError('Google sign-in failed. Please try again.');
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
                Find love beyond faces, connect through stories, and grow a meaningful
                connection grounded in shared values.
              </p>

              <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Welcome back
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Need an account?
                  </button>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
                      placeholder="Enter your password"
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
                    {loading ? 'Please wait...' : 'Sign in'}
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
                  Your Story Starts Here
                </p>
                <h3 className="mt-4 text-3xl font-semibold">
                  Build trust before you swipe.
                </h3>
                <p className="mt-4 text-sm text-slate-300">
                  Share your story, earn tokens, and connect through meaningful
                  conversations. Verified profiles and thoughtful prompts help you
                  find what matters most.
                </p>
              </div>
              <div className="mt-10 rounded-2xl bg-white/10 p-6 text-sm text-slate-200">
                <p className="font-semibold text-white">What you get</p>
                <ul className="mt-3 space-y-2">
                  <li>10 welcome tokens to start connecting.</li>
                  <li>Location-aware matching across Southern Africa.</li>
                  <li>Stories-first profiles that put values upfront.</li>
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

export default SignInPage;
