/**
 * accountService.js
 * Accounts: create, list, get balance, open extra account.
 * Ledger: write entries, verify integrity.
 * All amounts in kobo (integer).
 */

import { dbRead, dbUpdate } from './db.js';
import { generateId } from './cryptoService.js';

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 150));

// ─────────────────────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────────────────────

function genAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

function ensureUniqueNumber(proposed) {
  const accounts = dbRead('accounts');
  const used = new Set(Object.values(accounts).map((a) => a.number));
  if (!used.has(proposed)) return proposed;
  // Retry
  return ensureUniqueNumber(genAccountNumber());
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Create a new account for a user.
 * @param {string} userId
 * @param {'Checking'|'Savings'} type
 * @returns {Object} account
 */
async function createAccount(userId, type) {
  const accountId = generateId();
  const number = ensureUniqueNumber(genAccountNumber());
  const account = {
    id: accountId,
    userId,
    type,
    number,
    balance: 0, // starts at 0 kobo
    currency: 'NGN',
    createdAt: new Date().toISOString(),
  };

  dbUpdate('accounts', (accounts) => ({ ...accounts, [accountId]: account }));
  dbUpdate('ledger', (ledger) => ({ ...ledger, [accountId]: [] }));

  // Also create a virtual card for this account
  const { buildCard } = await import('./cardService.js');
  const card = buildCard(accountId, userId);
  dbUpdate('cards', (cards) => ({ ...cards, [accountId]: card }));

  return account;
}

/**
 * List all accounts belonging to a user.
 */
function getUserAccounts(userId) {
  const accounts = dbRead('accounts');
  return Object.values(accounts)
    .filter((a) => a.userId === userId)
    .map((a) => ({ ...a, accountNumber: a.accountNumber || a.number }));
}

/**
 * Get a single account by ID.
 */
function getAccount(accountId) {
  const accounts = dbRead('accounts');
  const account = accounts[accountId] || null;
  if (!account) return null;
  return { ...account, accountNumber: account.accountNumber || account.number };
}

/**
 * Find an account by account number (for external transfers).
 * Returns { account, user } or null.
 */
function findByNumber(accountNumber) {
  const accounts = dbRead('accounts');
  const account = Object.values(accounts).find(
    (a) => a.number === accountNumber || a.accountNumber === accountNumber
  );
  if (!account) return null;
  const users = dbRead('users');
  const user = users[account.userId];
  if (!user) return null;
  const { passwordHash, pinHash, ...safeUser } = user;
  return { account: { ...account, accountNumber: account.accountNumber || account.number }, user: safeUser };
}

/**
 * Get all ledger entries for an account.
 */
function getLedger(accountId) {
  const ledger = dbRead('ledger');
  return ledger[accountId] || [];
}

/**
 * Verify that the account balance equals the sum of its ledger.
 * Returns { ok: boolean, computed: number, stored: number }
 */
function verifyLedger(accountId) {
  const account = getAccount(accountId);
  if (!account) return { ok: false, computed: 0, stored: 0 };

  const entries = getLedger(accountId);
  const computed = entries.reduce((sum, e) => {
    return e.type === 'credit' ? sum + e.amount : sum - e.amount;
  }, 0);

  return {
    ok: computed === account.balance,
    computed,
    stored: account.balance,
  };
}

/**
 * Append a ledger entry and update the account balance atomically.
 * Used internally by transferService.
 * @param {string} accountId
 * @param {'credit'|'debit'} type
 * @param {number} amount  — kobo, positive integer
 * @param {Object} meta — { note, category, reference, userId, counterpartName }
 * @returns {Object} entry
 */
function appendLedgerEntry(accountId, type, amount, meta) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Amount must be a positive integer (kobo).');
  }

  const accounts = dbRead('accounts');
  const account = accounts[accountId];
  if (!account) throw new Error(`Account ${accountId} not found.`);

  const newBalance = type === 'credit'
    ? account.balance + amount
    : account.balance - amount;

  if (newBalance < 0) {
    throw new Error('Insufficient funds.');
  }

  const entry = {
    id: generateId(),
    accountId,
    userId: account.userId,
    type,
    amount,
    balanceAfter: newBalance,
    note: meta.note || '',
    category: meta.category || 'Transfer',
    reference: meta.reference || generateId(),
    counterpartName: meta.counterpartName || null,
    counterpartAccount: meta.counterpartAccount || null,
    createdAt: new Date().toISOString(),
  };

  // Update ledger
  dbUpdate('ledger', (ledger) => ({
    ...ledger,
    [accountId]: [entry, ...(ledger[accountId] || [])],
  }));

  // Update account balance
  dbUpdate('accounts', (accounts) => ({
    ...accounts,
    [accountId]: { ...accounts[accountId], balance: newBalance },
  }));

  return entry;
}

/**
 * Rollback a ledger entry (reverse a previously appended entry).
 * Used by transferService on failure.
 */
function rollbackLedgerEntry(accountId, entryId) {
  const accounts = dbRead('accounts');
  const account = accounts[accountId];
  const ledger = dbRead('ledger');
  const entries = ledger[accountId] || [];

  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return; // Nothing to roll back

  // Reverse the balance change
  const reversedBalance = entry.type === 'credit'
    ? account.balance - entry.amount
    : account.balance + entry.amount;

  // Remove the entry from ledger
  dbUpdate('ledger', (ledger) => ({
    ...ledger,
    [accountId]: (ledger[accountId] || []).filter((e) => e.id !== entryId),
  }));

  // Restore account balance
  dbUpdate('accounts', (accounts) => ({
    ...accounts,
    [accountId]: { ...accounts[accountId], balance: reversedBalance },
  }));
}

/**
 * Open an additional account for a user.
 */
async function openAccount(userId, type) {
  await delay();
  const existing = getUserAccounts(userId);
  const alreadyHas = existing.find((a) => a.type === type);
  if (alreadyHas) {
    return { ok: false, error: `You already have a ${type} account.` };
  }
  const account = await createAccount(userId, type);
  return { ok: true, account };
}

/**
 * Get all accounts (admin use).
 */
function getAllAccounts() {
  return dbRead('accounts');
}

export const accountService = {
  createAccount,
  getUserAccounts,
  getAccount,
  findByNumber,
  getLedger,
  verifyLedger,
  appendLedgerEntry,
  rollbackLedgerEntry,
  openAccount,
  getAllAccounts,
};
