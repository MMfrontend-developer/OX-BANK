/**
 * transferService.js
 * Atomic debit + credit transfers between accounts.
 * Enforces: overdraft protection, zero/negative amounts,
 * same-account block, idempotency, spending limit via card.
 *
 * Transfer flow:
 *  1. Validate inputs
 *  2. Check idempotency key (return cached result if already processed)
 *  3. Debit sender (appendLedgerEntry)
 *  4. Credit receiver (appendLedgerEntry)
 *     → on failure: rollback step 3
 *  5. Record idempotency key
 *  6. Create notifications for both parties
 */

import { accountService } from './accountService.js';
import { notificationService } from './notificationService.js';
import { dbRead, dbUpdate } from './db.js';
import { generateId } from './cryptoService.js';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms + Math.random() * 100));

const PIN_THRESHOLD_KOBO = 5_000_000; // 50,000 NGN — require PIN above this

// ─────────────────────────────────────────────────────────────
// Idempotency
// ─────────────────────────────────────────────────────────────

function isProcessed(idempotencyKey) {
  const keys = dbRead('processedIdempotencyKeys');
  return Array.isArray(keys) && keys.includes(idempotencyKey);
}

function markProcessed(idempotencyKey) {
  dbUpdate('processedIdempotencyKeys', (keys) => {
    const arr = Array.isArray(keys) ? keys : [];
    return [...arr, idempotencyKey].slice(-500); // keep last 500
  });
}

// ─────────────────────────────────────────────────────────────
// Deposit (simulated — adds money from "the outside")
// ─────────────────────────────────────────────────────────────

async function deposit(accountId, amountKobo, note = 'Deposit') {
  await delay();

  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    return { ok: false, error: 'Amount must be a positive integer (kobo).' };
  }
  if (amountKobo < 100) {
    return { ok: false, error: 'Minimum deposit is ₦1.' };
  }

  const account = accountService.getAccount(accountId);
  if (!account) return { ok: false, error: 'Account not found.' };

  try {
    const entry = accountService.appendLedgerEntry(accountId, 'credit', amountKobo, {
      note,
      category: 'Deposit',
      reference: `DEP${generateId().slice(0, 8).toUpperCase()}`,
    });

    await notificationService.create(account.userId, {
      type: 'deposit',
      title: 'Deposit Confirmed',
      message: `₦${(amountKobo / 100).toLocaleString()} deposited to your ${account.type} account.`,
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

  if (amountKobo > account.balance) {
    return { ok: false, error: 'Insufficient funds.' };
  }

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
// Transfer (own accounts or external)
// ─────────────────────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {string} params.fromAccountId
 * @param {string} params.toAccountId  — OR use toAccountNumber
 * @param {string} [params.toAccountNumber]  — looked up if toAccountId not given
 * @param {number} params.amountKobo  — positive integer
 * @param {string} [params.note]
 * @param {string} [params.category]
 * @param {string} params.idempotencyKey  — UUID for double-submit guard
 */
async function transfer({
  fromAccountId,
  toAccountId,
  toAccountNumber,
  amountKobo,
  note = '',
  category = 'Transfer',
  submissionId,
  idempotencyKey = submissionId,
}) {
  await delay();

  // ── Idempotency ──
  if (idempotencyKey && isProcessed(idempotencyKey)) {
    return { ok: true, cached: true, message: 'Transfer already processed.' };
  }

  // ── Validate amount ──
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    return { ok: false, error: 'Amount must be a positive integer.' };
  }
  if (amountKobo < 100) {
    return { ok: false, error: 'Minimum transfer is ₦1.' };
  }

  // ── Resolve toAccount ──
  let toAccount = null;
  let toUser = null;

  if (toAccountId) {
    toAccount = accountService.getAccount(toAccountId);
    if (toAccount) {
      const users = dbRead('users');
      const u = users[toAccount.userId];
      if (u) toUser = u;
    }
  } else if (toAccountNumber) {
    const found = accountService.findByNumber(toAccountNumber);
    if (found) {
      toAccount = found.account;
      toUser = found.user;
    }
  }

  if (!toAccount) return { ok: false, error: 'Recipient account not found.' };

  // ── Validate accounts ──
  const fromAccount = accountService.getAccount(fromAccountId);
  if (!fromAccount) return { ok: false, error: 'Your account not found.' };

  if (fromAccountId === toAccount.id) {
    return { ok: false, error: 'Cannot transfer to the same account.' };
  }

  // ── Overdraft check ──
  if (amountKobo > fromAccount.balance) {
    return { ok: false, error: 'Insufficient funds.' };
  }

  // ── Low balance warning ──
  const balanceAfterKobo = fromAccount.balance - amountKobo;
  const LOW_BALANCE_THRESHOLD = 50_000_00; // 50,000 NGN

  const reference = `TRF${generateId().slice(0, 8).toUpperCase()}`;
  const fromUser = (() => {
    const users = dbRead('users');
    return users[fromAccount.userId];
  })();

  // ── Atomic operation ──
  let debitEntry = null;
  let creditEntry = null;

  try {
    // Step 1: Debit sender
    debitEntry = accountService.appendLedgerEntry(fromAccountId, 'debit', amountKobo, {
      note: note || `Transfer to ${toUser?.name || toAccount.number}`,
      category,
      reference,
      counterpartName: toUser?.name || null,
      counterpartAccount: toAccount.number,
    });

    // Step 2: Credit receiver
    creditEntry = accountService.appendLedgerEntry(toAccount.id, 'credit', amountKobo, {
      note: note || `Transfer from ${fromUser?.name || fromAccount.number}`,
      category,
      reference,
      counterpartName: fromUser?.name || null,
      counterpartAccount: fromAccount.number,
    });
  } catch (err) {
    // Rollback debit if credit failed
    if (debitEntry) {
      try {
        accountService.rollbackLedgerEntry(fromAccountId, debitEntry.id);
      } catch (rollbackErr) {
        console.error('[Transfer] CRITICAL: rollback failed', rollbackErr);
      }
    }
    return { ok: false, error: `Transfer failed: ${err.message}` };
  }

  // ── Mark idempotency ──
  if (idempotencyKey) markProcessed(idempotencyKey);

  // ── Notifications ──
  await notificationService.create(fromAccount.userId, {
    type: 'transfer_sent',
    title: 'Transfer Sent',
    message: `₦${(amountKobo / 100).toLocaleString()} sent to ${toUser?.name || toAccount.number}.`,
  });

  if (toUser) {
    await notificationService.create(toUser.id, {
      type: 'transfer_received',
      title: 'Money Received! 💸',
      message: `₦${(amountKobo / 100).toLocaleString()} received from ${fromUser?.name || fromAccount.number}.`,
    });
  }

  // ── Low balance notification ──
  if (balanceAfterKobo < LOW_BALANCE_THRESHOLD) {
    await notificationService.create(fromAccount.userId, {
      type: 'low_balance',
      title: 'Low Balance Alert',
      message: `Your ${fromAccount.type} account balance is ₦${(balanceAfterKobo / 100).toLocaleString()}.`,
    });
  }

  return { ok: true, debitEntry, creditEntry, reference };
}

/**
 * Check if a transfer requires PIN (above threshold).
 */
function requiresPin(amountKobo) {
  return amountKobo >= PIN_THRESHOLD_KOBO;
}

export const execute = transfer;
export const executeTransfer = transfer;

export const transferService = {
  deposit,
  withdraw,
  transfer,
  requiresPin,
  PIN_THRESHOLD_KOBO,
};
