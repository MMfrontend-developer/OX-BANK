import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear login status
    localStorage.removeItem('isLoggedIn');
    // Optional: Keep signupData so they can log in again easily
    // localStorage.removeItem('signupData'); 
    
    // Redirect to home or login
    navigate('/');
    // Force a page reload to update Header state (if not using centralized state)
    window.location.reload();
  }, [navigate]);

  return (
    <div className="logout-page">
      <p>Logging you out...</p>
    </div>
  );
};

export default Logout;
