// src/App.jsx
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import BottomNavigation from './components/BottomNavigation.jsx';
import { useNotifications } from './hooks/useNotifications.js';
import { ensurePushSubscription } from './utils/push.js';
import Toast from './components/Toast.jsx';
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
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner label="Loading..." />
        </div>
      }
    >
      <Routes location={location} key={location.pathname}>
          <Route path="/" element={<AuthRedirect><SignInPage /></AuthRedirect>} />
          <Route path="/landing" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
          <Route path="/signup" element={<AuthRedirect><SignUpPage /></AuthRedirect>} />
          <Route path="/onboarding-basics" element={<ProtectedRoute requireIncompleteBasics><OnboardingBasics /></ProtectedRoute>} />
          <Route path="/stories" element={<ProtectedRoute requireBasics><StoryFeed /></ProtectedRoute>} />
          <Route path="/live" element={<ProtectedRoute><LiveRooms /></ProtectedRoute>} />
          <Route path="/live/:roomId" element={<ProtectedRoute><LiveRoom /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/sent-requests" element={<ProtectedRoute><SentRequests /></ProtectedRoute>} />
          <Route path="/received-requests" element={<ProtectedRoute><ReceivedRequests /></ProtectedRoute>} />
          <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
          <Route path="/connection/:connectionId" element={<ProtectedRoute><ConnectionProfile /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/preview" element={<ProtectedRoute><ProfilePreview /></ProtectedRoute>} />
          <Route path="/tokens" element={<ProtectedRoute><TokensPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
  );
};

const NotificationsListener = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { notifications, fetchNotifications, fetchUnreadCount, markAsRead } = useNotifications();
  const [toast, setToast] = useState(null);
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    fetchNotifications();
    fetchUnreadCount();
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (publicKey) {
      ensurePushSubscription(publicKey).catch(() => {});
    }
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!notifications.length) return;
    for (const notification of notifications) {
      if (seenIdsRef.current.has(notification.id)) {
        continue;
      }
      seenIdsRef.current.add(notification.id);
      if (notification.read_at) {
        continue;
      }
      let data = null;
      if (notification.data) {
        try {
          data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
        } catch {}
      }
      if (data?.notification_type === 'video_call_request') {
        setToast({
          id: notification.id,
          message: notification.message || 'Incoming video call request',
          connectionId: data.connection_id || null
        });
        break;
      }
    }
  }, [notifications]);

  const handleAnswer = () => {
    if (!toast?.connectionId) {
      setToast(null);
      return;
    }
    markAsRead(toast.id);
    navigate(`/chat?connectionId=${toast.connectionId}&incoming=1`);
    setToast(null);
  };

  const handleDismiss = () => {
    if (toast?.id) {
      markAsRead(toast.id);
    }
    setToast(null);
  };

  if (!toast) return null;

  return (
    <Toast
      message={toast.message}
      type="info"
      onClose={handleDismiss}
      actionLabel="Answer"
      onAction={handleAnswer}
      secondaryLabel="Dismiss"
      onSecondary={handleDismiss}
      duration={120000}
    />
  );
};

const App = () => {
  const location = useLocation();
  
  const showBottomNav = ['/stories', '/connections', '/landing', '/tokens', '/profile', '/live'].includes(location?.pathname);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <div className="pull-to-refresh">
          <NotificationsListener />
          <AnimatedRoutes />
          {showBottomNav && <BottomNavigation />}
        </div>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
// Updated Sat Jan 17 21:03:16 SAST 2026
