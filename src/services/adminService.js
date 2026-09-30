/**
 * adminService.js
 * Admin-only operations: list users, view all transactions, suspend/unsuspend.
 */

import { dbRead, dbUpdate } from './db.js';

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms + Math.random() * 100));

function requireAdmin(userId) {
  const users = dbRead('users');
  const user = users[userId];
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required.');
  }
}

function sanitize(user) {
  const { passwordHash, pinHash, ...safe } = user;
  return safe;
}

async function listUsers(adminId) {
  await delay();
  requireAdmin(adminId);

  const users = dbRead('users');
  const accounts = dbRead('accounts');

  return Object.values(users).map((u) => {
    const { passwordHash, pinHash, ...safe } = u;
    const userAccounts = Object.values(accounts).filter((a) => a.userId === u.id);
    const totalBalance = userAccounts.reduce((sum, a) => sum + a.balance, 0);
    return { ...safe, accountCount: userAccounts.length, totalBalance };
  });
}

async function getAllTransactions(adminId) {
  await delay();
  requireAdmin(adminId);

  const ledger = dbRead('ledger');
  const users = dbRead('users');
  const accounts = dbRead('accounts');

  const all = [];
  for (const [accountId, entries] of Object.entries(ledger)) {
    const account = accounts[accountId];
    const user = account ? users[account.userId] : null;
    for (const entry of entries) {
      all.push({
        ...entry,
        accountType: account?.type || 'Unknown',
        accountNumber: account?.number || 'N/A',
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown',
      });
    }
  }

  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function suspendUser(adminId, targetUserId) {
  await delay();
  requireAdmin(adminId);

  if (adminId === targetUserId) {
    return { ok: false, error: 'Cannot suspend yourself.' };
  }

  dbUpdate('users', (users) => ({
    ...users,
    [targetUserId]: { ...users[targetUserId], suspended: true },
  }));

  return { ok: true };
}

async function unsuspendUser(adminId, targetUserId) {
  await delay();
  requireAdmin(adminId);

  dbUpdate('users', (users) => ({
    ...users,
    [targetUserId]: { ...users[targetUserId], suspended: false },
  }));

  return { ok: true };
}

async function getStats(adminId) {
  await delay();
  requireAdmin(adminId);

  const users = dbRead('users');
  const accounts = dbRead('accounts');
  const ledger = dbRead('ledger');

  const totalUsers = Object.keys(users).length;
  const totalAccounts = Object.keys(accounts).length;
  const totalBalance = Object.values(accounts).reduce((s, a) => s + a.balance, 0);
  let totalTransactions = 0;
  for (const entries of Object.values(ledger)) {
    totalTransactions += entries.length;
  }

  return { totalUsers, totalAccounts, totalBalance, totalTransactions };
}

export const adminService = {
  listUsers,
  getAllTransactions,
  suspendUser,
  unsuspendUser,
  getStats,
};
