/**
 * AuthContext.jsx
 * Session state backed by authService (PBKDF2, session tokens, multi-user).
 * Exposes { isLoggedIn, user, login, logout, signup, currentToken,
 *           refreshUser, loading, settings, updateSettings }.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService, DEFAULT_SETTINGS } from './services/authService.js';
import { initDatabase } from './services/db.js';

const AuthContext = createContext(null);

const SESSION_KEY = 'oxbank_session';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [currentToken, setCurrentToken] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking stored session
  const isLoggedIn = Boolean(user);

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
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    }
    boot();
  }, []);

  const startSession = useCallback((result) => {
    if (result.ok) {
      localStorage.setItem(SESSION_KEY, result.sessionToken);
      setUser(result.user);
      setCurrentToken(result.sessionToken);
    }
    return result;
  }, []);

  const login = useCallback(async (arg1, arg2) => {
    const creds = typeof arg1 === 'object' && arg1 !== null ? arg1 : { email: arg1, password: arg2 };
    return startSession(await authService.login(creds));
  }, [startSession]);

  const signup = useCallback(async (data) => startSession(await authService.signup(data)), [startSession]);

  const logout = useCallback(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) authService.logout(token);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setCurrentToken(null);
  }, []);

  /** Re-read user from DB (call after profile/settings update). Signs out if the session is gone. */
  const refreshUser = useCallback(() => {
    const token = localStorage.getItem(SESSION_KEY);
    const resolved = token ? authService.resolveSession(token) : null;
    if (resolved) setUser(resolved);
    else logout();
  }, [logout]);

  const updateSettings = useCallback(async (patch) => {
    if (!user) return { ok: false, error: 'Not signed in.' };
    const res = await authService.updateSettings(user.id, patch);
    if (res.ok) refreshUser();
    return res;
  }, [user, refreshUser]);

  // Another tab signed out or the account was suspended → end this session too.
  useEffect(() => {
    if (!user) return undefined;
    const onStorage = (e) => {
      if (e.key === SESSION_KEY || e.key === 'oxbank_db') refreshUser();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user, refreshUser]);

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(user?.settings || {}) }), [user]);

  const value = useMemo(
    () => ({ isLoggedIn, user, login, logout, signup, currentToken, refreshUser, loading, settings, updateSettings }),
    [isLoggedIn, user, login, logout, signup, currentToken, refreshUser, loading, settings, updateSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
