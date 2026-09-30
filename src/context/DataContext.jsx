/**
 * DataContext.jsx
 * Provides reactive access to accounts, ledger entries, notifications.
 * Components call refresh() after any mutation to re-render.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { accountService } from '../services/accountService.js';
import { notificationService } from '../services/notificationService.js';
import { billService } from '../services/billService.js';
import { useAuth } from '../AuthContext.jsx';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { user, isLoggedIn } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !isLoggedIn) {
      setAccounts([]);
      setTransactions([]);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const accts = accountService.getUserAccounts(user.id);
      setAccounts(accts);

      // Merge all ledger entries across accounts, sorted newest first
      const allEntries = accts.flatMap((a) => accountService.getLedger(a.id));
      allEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(allEntries);

      const notifs = notificationService.getAll(user.id);
      setNotifications(notifs);
      setUnreadCount(notificationService.getUnreadCount(user.id));
    } finally {
      setLoading(false);
    }
  }, [user, isLoggedIn]);

  // Refresh on login/logout
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Process scheduled bills on load and every 60 s
  useEffect(() => {
    if (!isLoggedIn) return;
    billService.processDueBills().then(() => refresh());
    const interval = setInterval(() => {
      billService.processDueBills().then(() => refresh());
    }, 60_000);
    return () => clearInterval(interval);
  }, [isLoggedIn, refresh]);

  return (
    <DataContext.Provider value={{ accounts, transactions, notifications, unreadCount, loading, refresh }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
