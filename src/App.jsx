// src/App.jsx
import React, { Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import FadeIn from './components/animations/FadeIn.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import BottomNavigation from './components/BottomNavigation.jsx';
const SignInPage = React.lazy(() => import('./pages/SignInPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const SignUpPage = React.lazy(() => import('./pages/SignUpPage.jsx'));
const StoryFeed = React.lazy(() => import('./pages/StoryFeed'));
const Chat = React.lazy(() => import('./pages/Chat'));
const SentRequests = React.lazy(() => import('./pages/SentRequests'));
const ReceivedRequests = React.lazy(() => import('./pages/ReceivedRequests'));
const Connections = React.lazy(() => import('./pages/Connections'));
const Profile = React.lazy(() => import('./pages/Profile'));
const ProfilePreview = React.lazy(() => import('./pages/ProfilePreview.jsx'));
const TokensPage = React.lazy(() => import('./pages/TokensPage'));
const OnboardingBasics = React.lazy(() => import('./pages/OnboardingBasics.jsx'));
const ConnectionProfile = React.lazy(() => import('./pages/ConnectionProfile.jsx'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage.jsx'));
const LiveRooms = React.lazy(() => import('./pages/LiveRooms.jsx'));
const LiveRoom = React.lazy(() => import('./pages/LiveRoom.jsx'));

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
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <LoadingSpinner label="Loading..." />
          </div>
        }
      >
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
            path="/live"
            element={
              <ProtectedRoute>
                <FadeIn>
                  <LiveRooms />
                </FadeIn>
              </ProtectedRoute>
            }
          />
          <Route
            path="/live/:roomId"
            element={
              <ProtectedRoute>
                <FadeIn>
                  <LiveRoom />
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
            path="/connection/:connectionId"
            element={
              <ProtectedRoute>
                <FadeIn>
                  <ConnectionProfile />
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
            path="/profile/preview"
            element={
              <ProtectedRoute>
                <FadeIn>
                  <ProfilePreview />
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
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <FadeIn>
                  <NotificationsPage />
                </FadeIn>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const App = () => {
  const location = useLocation();
  
  const showBottomNav = ['/stories', '/connections', '/landing', '/tokens', '/profile', '/live'].includes(location?.pathname);

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
