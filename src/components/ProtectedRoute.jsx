import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import Navbar from './Navbar.jsx';

const ProtectedRoute = ({ children, requireIncompleteProfile = false }) => {
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

  // If route requires incomplete profile but user has complete profile, redirect to stories
  if (requireIncompleteProfile && user?.profile_complete) {
    return <Navigate to="/stories" replace />;
  }

  // If route doesn't allow incomplete profile but user has incomplete profile, redirect to create-profile
  if (!requireIncompleteProfile && !user?.profile_complete) {
    return <Navigate to="/create-profile" replace />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

export default ProtectedRoute;
