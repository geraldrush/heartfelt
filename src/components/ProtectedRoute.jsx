import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import { isBasicProfileComplete } from '../utils/profileCompletion.js';

const ProtectedRoute = ({
  children,
  requireIncompleteProfile = false,
  requireBasics = false,
  requireIncompleteBasics = false,
}) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <LoadingSpinner label="Checking credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireBasics && !isBasicProfileComplete(user)) {
    return <Navigate to="/onboarding-basics" replace />;
  }

  if (requireIncompleteBasics && isBasicProfileComplete(user)) {
    return <Navigate to="/stories" replace />;
  }

  // If route requires incomplete profile but user has complete profile, redirect to stories
  if (requireIncompleteProfile && user?.profile_complete) {
    return <Navigate to="/stories" replace />;
  }

  return children;
};

export default ProtectedRoute;
