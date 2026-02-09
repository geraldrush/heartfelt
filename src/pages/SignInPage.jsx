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
        <div className="w-full glass-card p-0 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] px-2 py-8 sm:px-6 sm:py-12">
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
                      <label htmlFor="email-input" className="text-sm font-medium text-slate-700">Email</label>
                      <input
                        id="email-input"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="mt-2 w-full premium-input"
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="password-input" className="text-sm font-medium text-slate-700">Password</label>
                      <input
                        id="password-input"
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

              <div className="mt-8 md:hidden -mx-6 -mt-8 sm:-mx-12 sm:-mt-14">
                <div className="relative overflow-hidden shadow-lg rounded-none">
                  <img
                    src={coupleImage}
                    alt="AfroDate couple"
                    className="absolute inset-0 h-full w-full object-cover opacity-55"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/55 to-black/70" />
                  <div className="relative px-6 py-7 text-white">
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
                          <label htmlFor="mobile-email-input" className="text-sm font-medium text-slate-700">Email</label>
                          <input
                            id="mobile-email-input"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-2 w-full premium-input"
                            placeholder="you@example.com"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="mobile-password-input" className="text-sm font-medium text-slate-700">Password</label>
                          <input
                            id="mobile-password-input"
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

            <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-orange-600 via-red-600 to-yellow-600 p-6 sm:p-10 text-white shadow-2xl">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-yellow-200 font-bold">
                  🌍 Pan-African Connections
                </p>
                <h3 className="mt-4 text-3xl font-bold leading-tight">
                  Find Love Across Africa
                </h3>
                <p className="mt-4 text-sm text-white/90 leading-relaxed">
                  Join thousands of Africans and diaspora members building meaningful relationships. Whether you're in Lagos, Nairobi, Johannesburg, or London - find your match here.
                </p>
                <div className="mt-6 overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur">
                  <div className="relative h-48 w-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 via-orange-400/20 to-red-400/20" />
                    <svg
                      viewBox="0 0 480 280"
                      className="absolute inset-0 h-full w-full"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="afroGlowSignIn" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#F97316" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#DC2626" stopOpacity="0.8" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M40 210 C120 120, 220 80, 300 110 C380 140, 420 210, 460 230"
                        stroke="url(#afroGlowSignIn)"
                        strokeWidth="8"
                        fill="none"
                        opacity="0.9"
                      />
                      <circle cx="120" cy="130" r="28" fill="#FCD34D" opacity="0.9" />
                      <circle cx="240" cy="90" r="20" fill="#F97316" opacity="0.9" />
                      <circle cx="360" cy="150" r="24" fill="#DC2626" opacity="0.9" />
                    </svg>
                    <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-black/40 px-4 py-3 text-sm font-semibold text-white backdrop-blur">
                      ❤️ Real connections. Real love. Real Africa.
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-10 rounded-2xl bg-black/20 border-2 border-white/20 p-6 text-sm text-white backdrop-blur">
                <p className="font-bold text-lg text-yellow-200 mb-3">✨ Why AfroDate?</p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">🌍</span>
                    <span>Connect with Africans across 54 countries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">💬</span>
                    <span>Chat in real-time with verified members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">🔒</span>
                    <span>Safe, secure, and respectful community</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">❤️</span>
                    <span>Build lasting relationships, not just dates</span>
                  </li>
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
