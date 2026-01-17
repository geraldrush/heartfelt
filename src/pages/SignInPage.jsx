import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { emailLogin, emailSignup, googleAuth } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const SignInPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('South Africa');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (!age || Number(age) < 18) {
          throw new Error('You must be at least 18 years old.');
        }
        if (!gender || !city || !province || !fullName) {
          throw new Error('Please fill in all required fields.');
        }

        const data = await emailSignup({
          email,
          password,
          full_name: fullName,
          age: Number(age),
          gender,
          nationality,
          location_city: city,
          location_province: province,
        });

        login(data.token, data.user);
        navigate('/create-profile');
      } else {
        const data = await emailLogin({ email, password });
        login(data.token, data.user);
        navigate(data.user.profile_complete ? '/landing' : '/create-profile');
      }
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
      navigate(data.user.profile_complete ? '/landing' : '/create-profile');
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-200 via-sky-100 to-amber-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-2 py-8 sm:px-6 sm:py-12">
        <div className="w-full bg-white/80 p-6 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Heartfelt Connections
              </h1>
              <p className="mt-4 text-base text-slate-600">
                Find love beyond faces, connect through stories, and grow a meaningful
                connection grounded in shared values.
              </p>

              <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {isSignup ? 'Create your account' : 'Welcome back'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsSignup((prev) => !prev)}
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {isSignup ? 'Already have an account?' : 'Need an account?'}
                  </button>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
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
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  {isSignup && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-slate-700">
                          Confirm password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                          placeholder="Re-enter your password"
                          required
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Full name
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                            placeholder="Your name"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Age</label>
                          <input
                            type="number"
                            value={age}
                            onChange={(event) => setAge(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                            placeholder="18+"
                            min="18"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Gender
                          </label>
                          <select
                            value={gender}
                            onChange={(event) => setGender(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                            required
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="non-binary">Non-binary</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Nationality
                          </label>
                          <select
                            value={nationality}
                            onChange={(event) => setNationality(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                            required
                          >
                            <option value="South Africa">South Africa</option>
                            <option value="Zimbabwe">Zimbabwe</option>
                            <option value="Namibia">Namibia</option>
                            <option value="Botswana">Botswana</option>
                            <option value="Mozambique">Mozambique</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-slate-700">City</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(event) => setCity(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                            placeholder="City"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Province
                          </label>
                          <input
                            type="text"
                            value={province}
                            onChange={(event) => setProvince(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                            placeholder="Province"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading
                      ? 'Please wait...'
                      : isSignup
                      ? 'Create account'
                      : 'Sign in'}
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
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
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
                  <li>50 welcome tokens to start connecting.</li>
                  <li>Location-aware matching across Southern Africa.</li>
                  <li>Stories-first profiles that put values upfront.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <footer className="mt-10 text-xs text-slate-500">
          © {new Date().getFullYear()} Heartfelt Connections. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default SignInPage;
