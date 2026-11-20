/**
 * transferService.js
 * Atomic debit + credit transfers between accounts.
 *
 * Enforces: account ownership, server-side PIN verification, overdraft
 * protection, minimum amount, daily outbound limit, same-account block,
 * suspended-user block and idempotency.
 *
 * Transfer flow:
 *  1. Validate inputs + idempotency key (return cached result if already processed)
 *  2. Verify the caller owns the source account and (if required) the PIN
 *  3. Debit sender (appendLedgerEntry)
 *  4. Credit receiver for OXBANK accounts (appendLedgerEntry)
 *     → on failure: rollback step 3
 *  5. Record idempotency key, notify both parties, return a receipt
 */

import { accountService } from './accountService.js';
import { notificationService } from './notificationService.js';
import { authService } from './authService.js';
import { dbRead, dbUpdate } from './db.js';
import { generateId } from './cryptoService.js';
import { formatCurrency } from '../utils/currency.js';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms + Math.random() * 100));

export const INTERNAL_BANK = 'OXBANK';
export const DAILY_LIMIT_KOBO = 500_000_000; // ₦5,000,000 per user per day (outbound)
const LOW_BALANCE_THRESHOLD = 5_000_000; // ₦50,000
const MIN_AMOUNT_KOBO = 100; // ₦1
const OUTBOUND_CATEGORIES = new Set(['Transfer']);

export const NIGERIAN_BANKS = [
  INTERNAL_BANK,
  'Access Bank',
  'First Bank of Nigeria',
  'GTBank',
  'Kuda Bank',
  'Moniepoint',
  'OPay',
  'Palmpay',
  'Stanbic IBTC',
  'United Bank for Africa (UBA)',
  'Wema Bank',
  'Zenith Bank',
];

// ─────────────────────────────────────────────────────────────
// Idempotency
// ─────────────────────────────────────────────────────────────

function processedResult(idempotencyKey) {
  const keys = dbRead('processedIdempotencyKeys');
  if (!Array.isArray(keys)) return null;
  const hit = keys.find((k) => (typeof k === 'string' ? k : k.key) === idempotencyKey);
  if (!hit) return null;
  return typeof hit === 'string' ? {} : hit;
}

function markProcessed(idempotencyKey, reference) {
  dbUpdate('processedIdempotencyKeys', (keys) => {
    const arr = Array.isArray(keys) ? keys : [];
    return [...arr, { key: idempotencyKey, reference }].slice(-500);
  });
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getUser(userId) {
  return dbRead('users')[userId] || null;
}

/** Sum of outbound transfers (to other people) a user made today. */
function sentToday(userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return accountService
    .getUserAccounts(userId)
    .flatMap((a) => accountService.getLedger(a.id))
    .filter((e) => e.type === 'debit' && OUTBOUND_CATEGORIES.has(e.category) && new Date(e.createdAt) >= start)
    .reduce((sum, e) => sum + e.amount, 0);
}

function remainingDailyLimit(userId) {
  return Math.max(0, DAILY_LIMIT_KOBO - sentToday(userId));
}

/**
 * "Name enquiry" — resolve the holder of an account number.
 * OXBANK accounts resolve to the real holder; other banks are simulated
 * and require the sender to type the name.
 */
function lookupAccount(accountNumber, bank = INTERNAL_BANK) {
  const number = String(accountNumber || '').trim();
  if (!/^\d{10}$/.test(number)) return { ok: false, error: 'Account number must be 10 digits.' };
  if (bank !== INTERNAL_BANK) return { ok: true, external: true, name: null, bank };
  const found = accountService.findByNumber(number);
  if (!found) return { ok: false, error: 'No OXBANK account with this number.' };
  return { ok: true, external: false, name: found.user.name, accountType: found.account.type, bank };
}

/** Own-account moves never need a PIN; payments to anyone else always do. */
function requiresPin(_amountKobo, isOwnAccount = false) {
  return !isOwnAccount;
}

// ─────────────────────────────────────────────────────────────
// Deposit (simulated — "add money" from an external card/bank)
// ─────────────────────────────────────────────────────────────

async function deposit(accountId, amountKobo, note = 'Deposit', userId = null) {
  await delay();

  if (!Number.isInteger(amountKobo) || amountKobo < MIN_AMOUNT_KOBO) {
    return { ok: false, error: 'Minimum deposit is ₦1.' };
  }
  if (amountKobo > 100_000_000) return { ok: false, error: 'Maximum single top-up is ₦1,000,000.' };

  const account = accountService.getAccount(accountId);
  if (!account) return { ok: false, error: 'Account not found.' };
  if (userId && account.userId !== userId) return { ok: false, error: 'Account not found.' };

  try {
    const entry = accountService.appendLedgerEntry(accountId, 'credit', amountKobo, {
      note,
      category: 'Deposit',
      reference: `DEP${generateId().slice(0, 8).toUpperCase()}`,
    });

    await notificationService.create(account.userId, {
      type: 'deposit',
      title: 'Deposit confirmed',
      message: `${formatCurrency(amountKobo)} added to your ${account.type} account.`,
    });

    return { ok: true, entry };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Withdrawal
// ─────────────────────────────────────────────────────────────

async function withdraw(accountId, amountKobo, note = 'Withdrawal') {
  await delay();

  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    return { ok: false, error: 'Amount must be a positive integer (kobo).' };
  }

  const account = accountService.getAccount(accountId);
  if (!account) return { ok: false, error: 'Account not found.' };
  if (amountKobo > account.balance) return { ok: false, error: 'Insufficient funds.' };

  try {
    const entry = accountService.appendLedgerEntry(accountId, 'debit', amountKobo, {
      note,
      category: 'Withdrawal',
      reference: `WDR${generateId().slice(0, 8).toUpperCase()}`,
    });
    return { ok: true, entry };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Transfer
// ─────────────────────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {string} params.userId            — the authenticated caller (must own fromAccountId)
 * @param {string} params.fromAccountId
 * @param {string} [params.toAccountId]     — own-account / internal by id
 * @param {string} [params.toAccountNumber] — 10-digit account number
 * @param {string} [params.toBank]          — defaults to OXBANK; other banks are debit-only
 * @param {string} [params.toName]          — required for other banks
 * @param {number} params.amountKobo        — positive integer
 * @param {string} [params.pin]             — required unless moving between own accounts
 * @param {string} [params.note]
 * @param {string} params.idempotencyKey    — UUID for double-submit guard (alias: submissionId)
 * @returns {Promise<{ok: boolean, error?: string, receipt?: Object, pinRequired?: boolean}>}
 */
async function transfer({
  userId,
  fromAccountId,
  toAccountId,
  toAccountNumber,
  toBank = INTERNAL_BANK,
  toName = '',
  amountKobo,
  pin,
  note = '',
  submissionId,
  idempotencyKey = submissionId,
}) {
  await delay();

  // ── Idempotency ──
  if (idempotencyKey) {
    const prior = processedResult(idempotencyKey);
    if (prior) return { ok: true, cached: true, reference: prior.reference, message: 'Transfer already processed.' };
  }

  // ── Caller & source account ──
  if (!userId) return { ok: false, error: 'Not authenticated.' };
  const fromUser = getUser(userId);
  if (!fromUser) return { ok: false, error: 'Not authenticated.' };
  if (fromUser.suspended) return { ok: false, error: 'Your account is suspended. Contact support.' };

  const fromAccount = accountService.getAccount(fromAccountId);
  if (!fromAccount || fromAccount.userId !== userId) return { ok: false, error: 'Source account not found.' };

  // ── Amount ──
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) return { ok: false, error: 'Enter a valid amount.' };
  if (amountKobo < MIN_AMOUNT_KOBO) return { ok: false, error: 'Minimum transfer is ₦1.' };

  // ── Resolve destination ──
  const isExternal = !toAccountId && toBank && toBank !== INTERNAL_BANK;
  let toAccount = null;
  let toUser = null;

  if (isExternal) {
    if (!/^\d{10}$/.test(String(toAccountNumber || ''))) return { ok: false, error: 'Account number must be 10 digits.' };
    if (!toName.trim()) return { ok: false, error: 'Enter the recipient name for other-bank transfers.' };
  } else {
    if (toAccountId) toAccount = accountService.getAccount(toAccountId);
    else if (toAccountNumber) toAccount = accountService.findByNumber(String(toAccountNumber).trim())?.account || null;
    if (!toAccount) return { ok: false, error: 'Recipient account not found.' };
    toUser = getUser(toAccount.userId);
    if (fromAccount.id === toAccount.id) return { ok: false, error: 'Cannot transfer to the same account.' };
    if (toUser?.suspended) return { ok: false, error: 'Recipient account cannot receive funds.' };
  }

  const isOwn = !isExternal && toAccount.userId === userId;
  const category = isOwn ? 'Internal Transfer' : 'Transfer';
  const recipientName = isExternal ? toName.trim() : toUser?.name || toAccount.number;
  const recipientNumber = isExternal ? String(toAccountNumber) : toAccount.number;

  // ── Balance & limits ──
  if (amountKobo > fromAccount.balance) return { ok: false, error: 'Insufficient funds.' };
  if (!isOwn && amountKobo > remainingDailyLimit(userId)) {
    return {
      ok: false,
      error: `This exceeds your daily transfer limit. Remaining today: ${formatCurrency(remainingDailyLimit(userId))}.`,
    };
  }

  // ── PIN (verified here, not in the UI) ──
  if (requiresPin(amountKobo, isOwn)) {
    if (!pin) return { ok: false, pinRequired: true, error: 'Transaction PIN required.' };
    const pinCheck = await authService.checkPin(userId, pin);
    if (!pinCheck.ok) return { ok: false, pinError: true, locked: pinCheck.locked, error: pinCheck.error };
  }

  const reference = `TRF${generateId().slice(0, 10).toUpperCase().replace(/-/g, '')}`;
  const debitNote = note.trim() || `Transfer to ${recipientName}`;

  // ── Atomic operation ──
  let debitEntry = null;
  let creditEntry = null;
  try {
    debitEntry = accountService.appendLedgerEntry(fromAccount.id, 'debit', amountKobo, {
      note: debitNote,
      category,
      reference,
      counterpartName: isExternal ? `${recipientName} · ${toBank}` : recipientName,
      counterpartAccount: recipientNumber,
    });

    if (!isExternal) {
      creditEntry = accountService.appendLedgerEntry(toAccount.id, 'credit', amountKobo, {
        note: note.trim() || `Transfer from ${fromUser.name}`,
        category: isOwn ? 'Internal Transfer' : 'Transfer In',
        reference,
        counterpartName: fromUser.name,
        counterpartAccount: fromAccount.number,
      });
    }
  } catch (err) {
    if (debitEntry) {
      try {
        accountService.rollbackLedgerEntry(fromAccount.id, debitEntry.id);
      } catch (rollbackErr) {
        console.error('[Transfer] CRITICAL: rollback failed', rollbackErr);
      }
    }
    return { ok: false, error: `Transfer failed: ${err.message}` };
  }

  if (idempotencyKey) markProcessed(idempotencyKey, reference);

  // ── Notifications ──
  if (!isOwn) {
    await notificationService.create(userId, {
      type: 'transfer_sent',
      title: 'Transfer sent',
      message: `${formatCurrency(amountKobo)} sent to ${recipientName}${isExternal ? ` (${toBank})` : ''}. Ref ${reference}.`,
    });
    if (toUser) {
      await notificationService.create(toUser.id, {
        type: 'transfer_received',
        title: 'Money received 💸',
        message: `${formatCurrency(amountKobo)} received from ${fromUser.name}.`,
      });
    }
  }

  const balanceAfter = debitEntry.balanceAfter;
  if (balanceAfter < LOW_BALANCE_THRESHOLD) {
    await notificationService.create(userId, {
      type: 'low_balance',
      title: 'Low balance alert',
      message: `Your ${fromAccount.type} account balance is ${formatCurrency(balanceAfter)}.`,
    });
  }

  const receipt = {
    reference,
    status: 'Successful',
    amountKobo,
    fee: 0,
    createdAt: debitEntry.createdAt,
    note: debitNote,
    from: { name: fromUser.name, accountNumber: fromAccount.number, type: fromAccount.type, bank: INTERNAL_BANK },
    to: { name: recipientName, accountNumber: recipientNumber, bank: isExternal ? toBank : INTERNAL_BANK },
    balanceAfter,
  };

  return { ok: true, debitEntry, creditEntry, reference, receipt };
}

export const execute = transfer;
export const executeTransfer = transfer;

export const transferService = {
  deposit,
  withdraw,
  transfer,
  lookupAccount,
  requiresPin,
  sentToday,
  remainingDailyLimit,
  DAILY_LIMIT_KOBO,
};
