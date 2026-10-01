/**
 * AuthContext.jsx — REPLACES src/AuthContext.jsx
 *
 * Fully rewritten to use authService (PBKDF2, session tokens, multi-user).
 * Exports the same { isLoggedIn, user, login, logout, signup } shape
 * so existing pages that import useAuth() continue to work.
 * Additional exports: { currentToken, refreshUser }
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from './services/authService.js';
import { initDatabase } from './services/db.js';

const AuthContext = createContext(null);

const SESSION_KEY = 'oxbank_session';

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentToken, setCurrentToken] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking stored session

  // ── Boot: init DB then resolve stored session ──
  useEffect(() => {
    async function boot() {
      await initDatabase();

      const token = localStorage.getItem(SESSION_KEY);
      if (token) {
        const resolved = authService.resolveSession(token);
        if (resolved) {
          setUser(resolved);
          setCurrentToken(token);
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    }
    boot();
  }, []);

  const login = useCallback(async (arg1, arg2) => {
    let email = arg1;
    let password = arg2;
    if (typeof arg1 === 'object' && arg1 !== null) {
      email = arg1.email;
      password = arg1.password;
    }
    const result = await authService.login({ email, password });
    if (result.ok) {
      localStorage.setItem(SESSION_KEY, result.sessionToken);
      setUser(result.user);
      setCurrentToken(result.sessionToken);
      setIsLoggedIn(true);
    }
    return result;
  }, []);

  const signup = useCallback(async (data) => {
    const result = await authService.signup(data);
    if (result.ok) {
      localStorage.setItem(SESSION_KEY, result.sessionToken);
      setUser(result.user);
      setCurrentToken(result.sessionToken);
      setIsLoggedIn(true);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) authService.logout(token);
    localStorage.removeItem(SESSION_KEY);
    setIsLoggedIn(false);
    setUser(null);
    setCurrentToken(null);
  }, []);

  /** Re-read user from DB (call after profile update) */
  const refreshUser = useCallback(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) return;
    const resolved = authService.resolveSession(token);
    if (resolved) setUser(resolved);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, signup, currentToken, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
