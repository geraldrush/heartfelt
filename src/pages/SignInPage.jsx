import React, { useState } from 'react';
import logo from '../assets/afrodate_logo.png';
import coupleImage from '../assets/couple.png';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { emailLogin, googleAuth } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isBasicProfileComplete } from '../utils/profileCompletion.js';

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
      navigate(isBasicProfileComplete(data.user) ? '/stories' : '/onboarding-basics');
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
      navigate(isBasicProfileComplete(data.user) ? '/stories' : '/onboarding-basics');
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
              <div className="hidden md:block">
                <div className="flex items-center gap-3">
                  <img
                    src={logo}
                    alt="AfroDate"
                    className="h-12 w-auto"
                  />
                  <span className="text-3xl font-bold text-slate-900">AfroDate</span>
                </div>
                <p className="mt-4 text-base text-slate-600">
                  Connect with Africans and people who love African culture. Build genuine, respectful connections with people who value community and long‑term relationships.
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Today, migration and busy lives make it harder to meet people who understand your background and values. AfroDate bridges those distances, bringing people together across cultures to build relationships that feel like home.
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

              <div className="mt-8 md:hidden">
                <div className="relative overflow-hidden rounded-3xl border border-white/60 shadow-lg">
                  <img
                    src={coupleImage}
                    alt="AfroDate couple"
                    className="absolute inset-0 h-full w-full object-cover opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50" />
                  <div className="relative px-6 py-8 text-white">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src={logo}
                        alt="AfroDate"
                        className="h-16 w-auto"
                      />
                      <span className="mt-3 text-3xl font-bold">AfroDate</span>
                    </div>
                    <div className="mt-6 space-y-3 text-sm text-white/90">
                      <p>
                        Meet Africans across the continent and the diaspora, and connect with people who love African culture.
                      </p>
                      <p>
                        Migration and busy lives can make it hard to meet people who understand your background. AfroDate bridges those distances.
                      </p>
                    </div>
                    <div className="mt-6 rounded-2xl bg-white/95 p-5 text-slate-900 shadow-lg">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">
                          Welcome back
                        </h2>
                        <button
                          type="button"
                          onClick={() => navigate('/signup')}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Need an account?
                        </button>
                      </div>
                      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
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
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-slate-900 p-6 sm:p-10 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-rose-300">
                  Pan‑African connections
                </p>
                <h3 className="mt-4 text-3xl font-semibold">
                  Connect with Africans everywhere.
                </h3>
                <p className="mt-4 text-sm text-slate-300">
                  AfroDate brings together diverse people across Africa and beyond,
                  making it easier to meet, connect, and build relationships grounded
                  in shared values and real conversation.
                </p>
                <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="relative h-48 w-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/30 via-amber-400/20 to-emerald-400/20" />
                    <svg
                      viewBox="0 0 480 280"
                      className="absolute inset-0 h-full w-full"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="afroGlowSignIn" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#F97316" stopOpacity="0.7" />
                          <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M40 210 C120 120, 220 80, 300 110 C380 140, 420 210, 460 230"
                        stroke="url(#afroGlowSignIn)"
                        strokeWidth="6"
                        fill="none"
                        opacity="0.8"
                      />
                      <circle cx="120" cy="130" r="26" fill="#F97316" opacity="0.8" />
                      <circle cx="240" cy="90" r="18" fill="#EC4899" opacity="0.8" />
                      <circle cx="360" cy="150" r="22" fill="#10B981" opacity="0.8" />
                    </svg>
                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/30 px-4 py-3 text-xs text-white/90 backdrop-blur">
                      Discover new perspectives. Build lasting bonds.
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-10 rounded-2xl bg-white/10 p-6 text-sm text-slate-200">
                <p className="font-semibold text-white">What you get</p>
                <ul className="mt-3 space-y-2">
                  <li>Respectful, diverse community across the continent.</li>
                  <li>Discover people from different cultures and cities.</li>
                  <li>Legal‑age members (18+) for safe, mature connections.</li>
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
