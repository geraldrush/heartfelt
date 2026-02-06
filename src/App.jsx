// src/App.jsx
import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import FadeIn from './components/animations/FadeIn.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import BottomNavigation from './components/BottomNavigation.jsx';
import SignInPage from './pages/SignInPage';
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage.jsx';
import StoryFeed from './pages/StoryFeed';
import Chat from './pages/Chat';
import SentRequests from './pages/SentRequests'; // Import new component
import ReceivedRequests from './pages/ReceivedRequests'; // Import new component
import Connections from './pages/Connections'; // Import new component
import Profile from './pages/Profile'; // Import new component
import TokensPage from './pages/TokensPage';
import OnboardingBasics from './pages/OnboardingBasics.jsx';

const AuthRedirect = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/stories" replace />;
  }

  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <AuthRedirect>
              <FadeIn>
                <SignInPage />
              </FadeIn>
            </AuthRedirect>
          }
        />
        <Route
          path="/landing"
          element={
            <ProtectedRoute>
              <FadeIn>
                <LandingPage />
              </FadeIn>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <AuthRedirect>
              <FadeIn>
                <SignUpPage />
              </FadeIn>
            </AuthRedirect>
          }
        />
        <Route
          path="/onboarding-basics"
          element={
            <ProtectedRoute requireIncompleteBasics>
              <FadeIn>
                <OnboardingBasics />
              </FadeIn>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stories"
          element={
            <ProtectedRoute requireBasics>
              <FadeIn>
                <StoryFeed />
              </FadeIn>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <FadeIn>
                <Chat />
              </FadeIn>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sent-requests"
          element={
            <ProtectedRoute>
              <FadeIn>
                <SentRequests />
              </FadeIn>
            </ProtectedRoute>
          }
        />
        <Route
          path="/received-requests"
          element={
            <ProtectedRoute>
              <FadeIn>
                <ReceivedRequests />
              </FadeIn>
            </ProtectedRoute>
          }
        />
        <Route
          path="/connections"
          element={
            <ProtectedRoute>
              <FadeIn>
                <Connections />
              </FadeIn>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <FadeIn>
                <Profile />
              </FadeIn>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tokens"
          element={
            <ProtectedRoute>
              <FadeIn>
                <TokensPage />
              </FadeIn>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  const location = useLocation();
  
  const showBottomNav = ['/stories', '/connections', '/landing', '/tokens', '/profile'].includes(location?.pathname);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <div className="pull-to-refresh">
          <AnimatedRoutes />
          {showBottomNav && <BottomNavigation />}
        </div>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
// Updated Sat Jan 17 21:03:16 SAST 2026
