import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import Navbar from './Navbar.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

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

  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

export default ProtectedRoute;
