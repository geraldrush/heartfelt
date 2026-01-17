// src/App.jsx
import React, { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SignInPage from './pages/SignInPage';
import LandingPage from './pages/LandingPage';
import CreateProfile from './pages/CreateProfile';
import StoryFeed from './pages/StoryFeed';
import Chat from './pages/Chat';
import SentRequests from './pages/SentRequests'; // Import new component
import ReceivedRequests from './pages/ReceivedRequests'; // Import new component
import Connections from './pages/Connections'; // Import new component
import Profile from './pages/Profile'; // Import new component
import TokensPage from './pages/TokensPage';
import { loadBlazeFaceModel } from './utils/faceBlur.js';

const AuthRedirect = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  return children;
};

const App = () => {
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadBlazeFaceModel()
      .catch(() => null)
      .finally(() => {
        if (mounted) {
          setModelReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        {!modelReady && (
          <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
            Loading face detection model...
          </div>
        )}
        <Router>
          <Routes>
          <Route
            path="/"
            element={
              <AuthRedirect>
                <SignInPage />
              </AuthRedirect>
            }
          />
          <Route
            path="/landing"
            element={
              <ProtectedRoute>
                <LandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-profile"
            element={
              <ProtectedRoute>
                <CreateProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stories"
            element={
              <ProtectedRoute>
                <StoryFeed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sent-requests"
            element={
              <ProtectedRoute>
                <SentRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/received-requests"
            element={
              <ProtectedRoute>
                <ReceivedRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connections"
            element={
              <ProtectedRoute>
                <Connections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tokens"
            element={
              <ProtectedRoute>
                <TokensPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
