import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('isLoggedIn') === 'true'
  );
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('signupData')) || { name: 'User', email: '' };
    } catch {
      return { name: 'User', email: '' };
    }
  });

  const login = useCallback((userData) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('signupData', JSON.stringify(userData));
    setIsLoggedIn(true);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    setUser({ name: 'User', email: '' });
  }, []);

  const signup = useCallback((userData) => {
    localStorage.setItem('signupData', JSON.stringify(userData));
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
