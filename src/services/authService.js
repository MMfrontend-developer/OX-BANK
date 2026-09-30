/**
 * authService.js
 * All authentication business logic — login, signup, logout, lockout, activity log.
 * Uses cryptoService for password hashing. Reads/writes via db.js.
 * Never touches React state directly.
 */

import { hashPassword, verifyPassword, generateId } from './cryptoService.js';
import { dbRead, dbUpdate, dbWrite } from './db.js';
import { accountService } from './accountService.js';
import { notificationService } from './notificationService.js';

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000; // 30 seconds
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Artificial delay to make loading states real
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 150));

// ─────────────────────────────────────────────────────────────
// Type helpers (JSDoc only)
// ─────────────────────────────────────────────────────────────
/**
 * @typedef {Object} AuthResult
 * @property {boolean} ok
 * @property {Object} [user]
 * @property {string} [sessionToken]
 * @property {string} [error]
 */

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

function getLockout(email) {
  const attempts = dbRead('loginAttempts');
  return attempts[email] || { count: 0, lockedUntil: null };
}

function setLockout(email, data) {
  dbUpdate('loginAttempts', (attempts) => ({
    ...attempts,
    [email]: data,
  }));
}

function createSession(userId) {
  const token = generateId();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  dbUpdate('sessions', (sessions) => ({
    ...sessions,
    [token]: { userId, expiresAt },
  }));
  return token;
}

function validateSession(token) {
  const sessions = dbRead('sessions');
  const session = sessions[token];
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    // Expired — clean up
    dbUpdate('sessions', (sessions) => {
      const copy = { ...sessions };
      delete copy[token];
      return copy;
    });
    return null;
  }
  return session.userId;
}

function findUserByEmail(email) {
  const users = dbRead('users');
  return Object.values(users).find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function recordLoginActivity(userId, success, ip = 'browser') {
  dbUpdate('loginActivity', (activity) => {
    const userActivity = activity[userId] || [];
    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      success,
      device: navigator.userAgent.slice(0, 80),
      ip,
    };
    return {
      ...activity,
      [userId]: [entry, ...userActivity].slice(0, 20), // keep last 20
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Sign up a new user.
 * Creates user record + Checking + Savings accounts.
 * @returns {AuthResult}
 */
async function signup({ name, email, password, phone = '' }) {
  await delay();

  if (!name?.trim()) return { ok: false, error: 'Name is required.' };
  if (!email?.trim()) return { ok: false, error: 'Email is required.' };
  if (!password) return { ok: false, error: 'Password is required.' };
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Password must contain an uppercase letter.' };
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Password must contain a number.' };
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, error: 'Password must contain a special character.' };

  const existing = findUserByEmail(email);
  if (existing) return { ok: false, error: 'An account with this email already exists.' };

  const passwordHash = await hashPassword(password);
  const pinHash = await hashPassword('0000'); // default PIN, user can change

  const userId = generateId();
  const user = {
    id: userId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    passwordHash,
    pinHash,
    role: 'customer',
    suspended: false,
    createdAt: new Date().toISOString(),
    avatar: name.trim().charAt(0).toUpperCase(),
  };

  dbUpdate('users', (users) => ({ ...users, [userId]: user }));
  dbUpdate('loginActivity', (activity) => ({ ...activity, [userId]: [] }));
  dbUpdate('notifications', (notifs) => ({ ...notifs, [userId]: [] }));
  dbUpdate('bills', (bills) => ({ ...bills, [userId]: [] }));

  // Create Checking + Savings accounts
  await accountService.createAccount(userId, 'Checking');
  await accountService.createAccount(userId, 'Savings');

  // Welcome notification
  await notificationService.create(userId, {
    type: 'welcome',
    title: 'Welcome to OxBank! 🎉',
    message: `Hi ${user.name}, your account is ready. Your default PIN is 0000 — please change it in Profile > Security.`,
  });

  const sessionToken = createSession(userId);
  const safeUser = sanitizeUser(user);

  return { ok: true, user: safeUser, sessionToken };
}

/**
 * Log in an existing user.
 * Enforces lockout after 5 failed attempts (30 s).
 * @returns {AuthResult}
 */
async function login({ email, password }) {
  await delay();

  if (!email?.trim() || !password) {
    return { ok: false, error: 'Email and password are required.' };
  }

  const lockout = getLockout(email.toLowerCase());
  if (lockout.lockedUntil && Date.now() < lockout.lockedUntil) {
    const remaining = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
    return { ok: false, error: `Too many attempts. Try again in ${remaining}s.`, locked: true };
  }

  const user = findUserByEmail(email);
  if (!user) {
    // Don't reveal whether email exists
    incrementFailedAttempts(email.toLowerCase(), lockout);
    return { ok: false, error: 'Invalid email or password.' };
  }

  if (user.suspended) {
    return { ok: false, error: 'This account has been suspended. Please contact support.' };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    incrementFailedAttempts(email.toLowerCase(), lockout);
    recordLoginActivity(user.id, false);
    const newLockout = getLockout(email.toLowerCase());
    const remaining = LOCKOUT_MAX_ATTEMPTS - newLockout.count;
    if (remaining <= 0) {
      return { ok: false, error: `Account locked for 30 seconds.`, locked: true };
    }
    return { ok: false, error: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
  }

  // Success — reset lockout
  setLockout(email.toLowerCase(), { count: 0, lockedUntil: null });
  recordLoginActivity(user.id, true);

  const sessionToken = createSession(user.id);
  return { ok: true, user: sanitizeUser(user), sessionToken };
}

function incrementFailedAttempts(email, current) {
  const count = (current.count || 0) + 1;
  const lockedUntil = count >= LOCKOUT_MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null;
  setLockout(email, { count, lockedUntil });
}

/**
 * Resolve a session token → user (or null).
 */
function resolveSession(token) {
  if (!token) return null;
  const userId = validateSession(token);
  if (!userId) return null;
  const users = dbRead('users');
  const user = users[userId];
  if (!user) return null;
  return sanitizeUser(user);
}

/**
 * Log out — invalidates the session token.
 */
function logout(token) {
  if (!token) return;
  dbUpdate('sessions', (sessions) => {
    const copy = { ...sessions };
    delete copy[token];
    return copy;
  });
}

/**
 * Change password for a user.
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  await delay();

  const users = dbRead('users');
  const user = users[userId];
  if (!user) return { ok: false, error: 'User not found.' };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: 'Current password is incorrect.' };

  if (newPassword.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' };
  if (!/[A-Z]/.test(newPassword)) return { ok: false, error: 'Must contain an uppercase letter.' };
  if (!/[0-9]/.test(newPassword)) return { ok: false, error: 'Must contain a number.' };
  if (!/[^A-Za-z0-9]/.test(newPassword)) return { ok: false, error: 'Must contain a special character.' };

  const passwordHash = await hashPassword(newPassword);
  dbUpdate('users', (users) => ({
    ...users,
    [userId]: { ...users[userId], passwordHash },
  }));

  return { ok: true };
}

/**
 * Change transaction PIN.
 */
async function changePin(userId, { currentPin, newPin }) {
  await delay();

  const users = dbRead('users');
  const user = users[userId];
  if (!user) return { ok: false, error: 'User not found.' };

  const valid = await verifyPassword(currentPin, user.pinHash);
  if (!valid) return { ok: false, error: 'Current PIN is incorrect.' };

  if (!/^\d{4}$/.test(newPin)) return { ok: false, error: 'PIN must be exactly 4 digits.' };

  const pinHash = await hashPassword(newPin);
  dbUpdate('users', (users) => ({
    ...users,
    [userId]: { ...users[userId], pinHash },
  }));

  return { ok: true };
}

/**
 * Verify a transaction PIN (used before high-value operations).
 */
async function verifyPin(userId, pin) {
  const users = dbRead('users');
  const user = users[userId];
  if (!user) return false;
  return verifyPassword(pin, user.pinHash);
}

/**
 * Update profile (name, email, phone).
 */
async function updateProfile(userId, { name, email, phone }) {
  await delay();

  if (!name?.trim()) return { ok: false, error: 'Name is required.' };
  if (!email?.trim()) return { ok: false, error: 'Email is required.' };

  const existing = findUserByEmail(email);
  if (existing && existing.id !== userId) {
    return { ok: false, error: 'Email already used by another account.' };
  }

  dbUpdate('users', (users) => ({
    ...users,
    [userId]: {
      ...users[userId],
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      avatar: name.trim().charAt(0).toUpperCase(),
    },
  }));

  const users = dbRead('users');
  return { ok: true, user: sanitizeUser(users[userId]) };
}

/**
 * Get login activity for a user.
 */
function getLoginActivity(userId) {
  const activity = dbRead('loginActivity');
  return activity[userId] || [];
}

/**
 * Strip sensitive fields from a user record for the client.
 */
function sanitizeUser(user) {
  const { passwordHash, pinHash, ...safe } = user;
  return safe;
}

export const authService = {
  signup,
  login,
  logout,
  resolveSession,
  changePassword,
  changePin,
  verifyPin,
  updateProfile,
  getLoginActivity,
  sanitizeUser,
};
