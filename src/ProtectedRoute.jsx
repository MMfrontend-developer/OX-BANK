import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Gate for signed-in pages. Waits for the stored session to be restored first. */
const ProtectedRoute = ({ children, role }) => {
  const { isLoggedIn, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader" aria-busy="true" aria-label="Loading">
        <span className="auth-spinner" />
      </div>
    );
  }

  if (!isLoggedIn) {
    // Preserve where the user was going so login can return them there
    return <Navigate to="/Login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) return <Navigate to="/Dashboard" replace />;

  return children;
};

export default ProtectedRoute;
