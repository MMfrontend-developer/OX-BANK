/**
 * db.js — Persistence layer over localStorage.
 *
 * Design:
 *  - All data is stored under a single key "oxbank_db" as a versioned JSON object.
 *  - read(path) / write(path, val) / update(path, fn) helpers.
 *  - Migrations run on boot when schema version changes.
 *  - seed() builds the demo dataset (called by migrations when version === 0).
 *
 * Schema (V1):
 * {
 *   _version: 1,
 *   users: { [userId]: UserRecord },
 *   accounts: { [accountId]: AccountRecord },
 *   ledger: { [accountId]: LedgerEntry[] },
 *   cards: { [accountId]: CardRecord },
 *   bills: { [userId]: BillRecord[] },
 *   notifications: { [userId]: Notification[] },
 *   loginAttempts: { [email]: { count, lockedUntil } },
 *   loginActivity: { [userId]: LoginActivity[] },
 *   processedIdempotencyKeys: string[],
 * }
 *
 * Money: all amounts in KOBO (integer). 1 NGN = 100 kobo.
 */

import { hashPassword, generateId } from './cryptoService.js';

const DB_KEY = 'oxbank_db';
const CURRENT_VERSION = 1;

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/** Read the full DB or a top-level collection */
export function dbRead(collection) {
  const db = load();
  if (!db) return collection ? {} : {};
  return collection ? (db[collection] ?? {}) : db;
}

/** Write a whole collection */
export function dbWrite(collection, value) {
  const db = load() || { _version: CURRENT_VERSION };
  db[collection] = value;
  save(db);
}

/**
 * Atomically update a top-level collection.
 * fn receives the current value and must return the new value.
 */
export function dbUpdate(collection, fn) {
  const db = load() || { _version: CURRENT_VERSION };
  const current = db[collection] ?? (Array.isArray(db[collection]) ? [] : {});
  const updated = fn(current);
  db[collection] = updated;
  save(db);
  return updated;
}

/** Hard reset — wipes everything and re-seeds */
export async function resetDatabase() {
  localStorage.removeItem(DB_KEY);
  _initialized = false;
  await seed();
}

// ─────────────────────────────────────────────────────────────
// Seeding
// ─────────────────────────────────────────────────────────────

/**
 * Generate a realistic 10-digit account number string.
 */
function genAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

/**
 * Generate ~60 days of realistic ledger entries for a given account.
 * Returns { entries: LedgerEntry[], finalBalance: number (kobo) }
 */
function generateHistory(accountId, startingBalanceKobo, userId) {
  const entries = [];
  const categories = [
    { label: 'Groceries', type: 'debit', range: [500000, 2500000] },
    { label: 'Salary', type: 'credit', range: [25000000, 45000000] },
    { label: 'Utilities', type: 'debit', range: [800000, 2000000] },
    { label: 'Transport', type: 'debit', range: [200000, 800000] },
    { label: 'Dining', type: 'debit', range: [300000, 1500000] },
    { label: 'Shopping', type: 'debit', range: [1000000, 5000000] },
    { label: 'Freelance', type: 'credit', range: [5000000, 15000000] },
    { label: 'Netflix', type: 'debit', range: [390000, 390000] },
    { label: 'Electricity', type: 'debit', range: [600000, 1800000] },
    { label: 'Transfer In', type: 'credit', range: [1000000, 10000000] },
    { label: 'Refund', type: 'credit', range: [200000, 2000000] },
    { label: 'Airtime', type: 'debit', range: [100000, 500000] },
  ];

  let balance = startingBalanceKobo;
  const now = Date.now();
  const DAY = 86400000;

  // Add initial opening balance entry
  entries.push({
    id: generateId(),
    accountId,
    userId,
    type: 'credit',
    amount: startingBalanceKobo,
    balanceAfter: startingBalanceKobo,
    note: 'Initial Opening Balance',
    category: 'Deposit',
    createdAt: new Date(now - 61 * DAY).toISOString(),
    reference: `OPEN${generateId().slice(0, 8).toUpperCase()}`,
  });

  // Go back 60 days, generate 1-3 transactions per day
  for (let d = 60; d >= 0; d--) {
    const date = new Date(now - d * DAY);
    const txCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < txCount; i++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const amount = Math.floor(
        cat.range[0] + Math.random() * (cat.range[1] - cat.range[0])
      );
      if (cat.type === 'debit' && balance - amount < 0) continue; // skip to avoid negative

      balance = cat.type === 'credit' ? balance + amount : balance - amount;

      entries.push({
        id: generateId(),
        accountId,
        userId,
        type: cat.type,
        amount,
        balanceAfter: balance,
        note: cat.label,
        category: cat.label,
        createdAt: date.toISOString(),
        reference: `OXB${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      });
    }
  }

  return { entries, finalBalance: balance };
}

/**
 * Build a virtual card for an account.
 */
function buildCard(accountId, userId) {
  const num = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));
  return {
    id: generateId(),
    accountId,
    userId,
    maskedNumber: `•••• •••• •••• ${num.slice(-4)}`,
    fullNumber: num.replace(/(\d{4})/g, '$1 ').trim(),
    cvv: String(Math.floor(100 + Math.random() * 900)),
    expiry: '12/29',
    frozen: false,
    spendingLimit: 500000000, // 5,000,000 NGN in kobo
    createdAt: new Date().toISOString(),
  };
}

/**
 * Seed the database with demo users and realistic data.
 * Called async because it hashes passwords.
 */
async function seed() {
  console.log('[OxBank] Seeding demo data…');

  const demoHash = await hashPassword('Demo@1234');
  const aliceHash = await hashPassword('Alice@1234');
  const adminHash = await hashPassword('Admin@1234');

  const demoPinHash = await hashPassword('1234');
  const alicePinHash = await hashPassword('5678');
  const adminPinHash = await hashPassword('9012');

  // ── User IDs ──
  const demoId = generateId();
  const aliceId = generateId();
  const adminId = generateId();

  // ── Account IDs ──
  const demoCheckingId = generateId();
  const demoSavingsId = generateId();
  const aliceCheckingId = generateId();
  const aliceSavingsId = generateId();
  const adminCheckingId = generateId();

  // ── Account Numbers ──
  const demoCheckingNo = genAccountNumber();
  const demoSavingsNo = genAccountNumber();
  const aliceCheckingNo = genAccountNumber();
  const aliceSavingsNo = genAccountNumber();
  const adminCheckingNo = genAccountNumber();

  // ── Generate history for demo Checking ──
  const { entries: demoCheckingEntries, finalBalance: demoCheckingBal } =
    generateHistory(demoCheckingId, 5000000000, demoId); // start ~50,000 NGN

  const { entries: demoSavingsEntries, finalBalance: demoSavingsBal } =
    generateHistory(demoSavingsId, 2000000000, demoId); // start ~20,000 NGN

  const { entries: aliceCheckingEntries, finalBalance: aliceCheckingBal } =
    generateHistory(aliceCheckingId, 3000000000, aliceId);

  const { entries: aliceSavingsEntries, finalBalance: aliceSavingsBal } =
    generateHistory(aliceSavingsId, 1000000000, aliceId);

  const { entries: adminCheckingEntries, finalBalance: adminCheckingBal } =
    generateHistory(adminCheckingId, 8000000000, adminId);

  const users = {
    [demoId]: {
      id: demoId,
      name: 'Demo User',
      email: 'demo@oxbank.test',
      phone: '+234 800 000 0001',
      passwordHash: demoHash,
      pinHash: demoPinHash,
      role: 'customer',
      suspended: false,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      avatar: 'D',
    },
    [aliceId]: {
      id: aliceId,
      name: 'Alice Johnson',
      email: 'alice@oxbank.test',
      phone: '+234 800 000 0002',
      passwordHash: aliceHash,
      pinHash: alicePinHash,
      role: 'customer',
      suspended: false,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      avatar: 'A',
    },
    [adminId]: {
      id: adminId,
      name: 'Admin OxBank',
      email: 'admin@oxbank.test',
      phone: '+234 800 000 0099',
      passwordHash: adminHash,
      pinHash: adminPinHash,
      role: 'admin',
      suspended: false,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      avatar: 'AD',
    },
  };

  const accounts = {
    [demoCheckingId]: {
      id: demoCheckingId,
      userId: demoId,
      type: 'Checking',
      number: demoCheckingNo,
      balance: demoCheckingBal,
      currency: 'NGN',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    [demoSavingsId]: {
      id: demoSavingsId,
      userId: demoId,
      type: 'Savings',
      number: demoSavingsNo,
      balance: demoSavingsBal,
      currency: 'NGN',
      createdAt: new Date(Date.now() - 55 * 86400000).toISOString(),
    },
    [aliceCheckingId]: {
      id: aliceCheckingId,
      userId: aliceId,
      type: 'Checking',
      number: aliceCheckingNo,
      balance: aliceCheckingBal,
      currency: 'NGN',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    [aliceSavingsId]: {
      id: aliceSavingsId,
      userId: aliceId,
      type: 'Savings',
      number: aliceSavingsNo,
      balance: aliceSavingsBal,
      currency: 'NGN',
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
    [adminCheckingId]: {
      id: adminCheckingId,
      userId: adminId,
      type: 'Checking',
      number: adminCheckingNo,
      balance: adminCheckingBal,
      currency: 'NGN',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
  };

  const ledger = {
    [demoCheckingId]: demoCheckingEntries,
    [demoSavingsId]: demoSavingsEntries,
    [aliceCheckingId]: aliceCheckingEntries,
    [aliceSavingsId]: aliceSavingsEntries,
    [adminCheckingId]: adminCheckingEntries,
  };

  const cards = {
    [demoCheckingId]: buildCard(demoCheckingId, demoId),
    [demoSavingsId]: buildCard(demoSavingsId, demoId),
    [aliceCheckingId]: buildCard(aliceCheckingId, aliceId),
    [aliceSavingsId]: buildCard(aliceSavingsId, aliceId),
    [adminCheckingId]: buildCard(adminCheckingId, adminId),
  };

  const bills = {
    [demoId]: [
      {
        id: generateId(),
        userId: demoId,
        payee: 'IKEDC Electricity',
        amount: 1500000, // 15,000 NGN
        category: 'Utilities',
        scheduledDate: null,
        lastPaid: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: generateId(),
        userId: demoId,
        payee: 'MTN Airtime',
        amount: 500000, // 5,000 NGN
        category: 'Telecom',
        scheduledDate: null,
        lastPaid: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: generateId(),
        userId: demoId,
        payee: 'Netflix',
        amount: 390000, // 3,900 NGN
        category: 'Subscriptions',
        scheduledDate: new Date(Date.now() + 5 * 86400000).toISOString(), // due in 5 days
        lastPaid: new Date(Date.now() - 25 * 86400000).toISOString(),
      },
    ],
    [aliceId]: [],
    [adminId]: [],
  };

  const notifications = {
    [demoId]: [
      {
        id: generateId(),
        userId: demoId,
        type: 'welcome',
        title: 'Welcome to OxBank!',
        message: 'Your demo account is ready. Explore all features.',
        read: false,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
    ],
    [aliceId]: [],
    [adminId]: [],
  };

  const db = {
    _version: CURRENT_VERSION,
    users,
    accounts,
    ledger,
    cards,
    bills,
    notifications,
    loginAttempts: {},
    loginActivity: { [demoId]: [], [aliceId]: [], [adminId]: [] },
    processedIdempotencyKeys: [],
    sessions: {},
  };

  save(db);
  console.log('[OxBank] Demo data seeded successfully.');
}

// ─────────────────────────────────────────────────────────────
// Init (run on app boot)
// ─────────────────────────────────────────────────────────────

let _initialized = false;

export async function initDatabase() {
  if (_initialized) return;
  _initialized = true;

  const db = load();

  if (!db || !db._version) {
    // First run — seed
    await seed();
    return;
  }

  if (db._version < CURRENT_VERSION) {
    // Future migrations go here
    db._version = CURRENT_VERSION;
    save(db);
  }
}
