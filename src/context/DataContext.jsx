/**
 * DataContext.jsx
 * Reactive access to the signed-in customer's accounts, ledger, goals,
 * budgets, beneficiaries and notifications. Components call refresh()
 * after any mutation. Changes made in other tabs are picked up via the
 * `storage` event.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { accountService } from '../services/accountService.js';
import { notificationService } from '../services/notificationService.js';
import { billService } from '../services/billService.js';
import { savingsService } from '../services/savingsService.js';
import { budgetService } from '../services/budgetService.js';
import { beneficiaryService } from '../services/beneficiaryService.js';
import { resetDatabase } from '../services/db.js';
import { useAuth } from '../AuthContext.jsx';

const DataContext = createContext(null);

const EMPTY = {
  accounts: [],
  transactions: [],
  notifications: [],
  goals: [],
  budgets: {},
  beneficiaries: [],
  bills: [],
  ledgerValid: true,
};

function loadSnapshot(userId) {
  const accounts = accountService.getUserAccounts(userId).sort((a, b) => (a.type === 'Checking' ? -1 : b.type === 'Checking' ? 1 : 0));
  const byId = Object.fromEntries(accounts.map((a) => [a.id, a]));

  const transactions = accounts
    .flatMap((a) => accountService.getLedger(a.id))
    .map((e) => ({ ...e, accountType: byId[e.accountId]?.type, accountNumber: byId[e.accountId]?.number }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    accounts,
    transactions,
    notifications: notificationService.getAll(userId),
    goals: savingsService.list(userId),
    budgets: budgetService.get(userId),
    beneficiaries: beneficiaryService.list(userId),
    bills: billService.getBills(userId),
    ledgerValid: accounts.every((a) => accountService.verifyLedger(a.id).ok),
  };
}

export const DataProvider = ({ children }) => {
  const { user, isLoggedIn, logout } = useAuth();
  const userId = isLoggedIn ? user?.id : null;

  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(EMPTY);
      return;
    }
    setData(loadSnapshot(userId));
  }, [userId]);

  // Initial load on login / user switch
  useEffect(() => {
    if (!userId) {
      setData(EMPTY);
      return;
    }
    setLoading(true);
    setData(loadSnapshot(userId));
    setLoading(false);
  }, [userId]);

  // Scheduled bills: process on load and every 60 s
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    const run = () =>
      billService.processDueBills().then((res) => {
        if (!cancelled && res.processedCount > 0) refresh();
      });
    run();
    const interval = setInterval(run, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, refresh]);

  // Cross-tab sync (e.g. money received while signed in elsewhere)
  useEffect(() => {
    if (!userId) return undefined;
    const onStorage = (e) => {
      if (e.key === 'oxbank_db') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId, refresh]);

  /** Wipe all local data and re-seed the demo. Signs the user out. */
  const resetDemoData = useCallback(async () => {
    await resetDatabase();
    logout();
  }, [logout]);

  const value = useMemo(() => {
    const primaryAccount = data.accounts.find((a) => a.type === 'Checking') || data.accounts[0] || null;
    const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);
    const totalSaved = data.goals.reduce((s, g) => s + g.savedKobo, 0);
    return {
      ...data,
      primaryAccount,
      totalBalance,
      totalSaved,
      netWorth: totalBalance + totalSaved,
      unreadCount: data.notifications.filter((n) => !n.read).length,
      loading,
      refresh,
      refreshData: refresh,
      resetDemoData,
    };
  }, [data, loading, refresh, resetDemoData]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
