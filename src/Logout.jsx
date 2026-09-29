import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './assets/Style.css/Logout.css';

const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  return (
    <div className="logout-page">
      <p>Logging you out...</p>
    </div>
  );
};

export default Logout;
