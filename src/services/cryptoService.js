/**
 * cryptoService.js
 * Secure password / PIN hashing using Web Crypto API (PBKDF2 + SHA-256).
 * Stored format: { hash: base64, salt: base64, iterations: number }
 * Never stores plaintext.
 */

const ITERATIONS = 310_000;
const KEY_LENGTH = 32; // 256 bits
const HASH_ALGO = 'SHA-256';

/** Convert ArrayBuffer → base64 string */
function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/** Convert base64 string → Uint8Array */
function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Hash a plaintext string (password or PIN).
 * Returns { hash, salt, iterations } — all base64.
 */
export async function hashPassword(plaintext) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(plaintext),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, hash: HASH_ALGO, iterations: ITERATIONS },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return {
    hash: bufToBase64(derived),
    salt: bufToBase64(salt),
    iterations: ITERATIONS,
  };
}

/**
 * Verify plaintext against a stored { hash, salt, iterations } record.
 * Returns boolean.
 */
export async function verifyPassword(plaintext, stored) {
  const salt = base64ToBuf(stored.salt);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(plaintext),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, hash: HASH_ALGO, iterations: stored.iterations },
    keyMaterial,
    KEY_LENGTH * 8
  );
  const candidate = bufToBase64(derived);
  return candidate === stored.hash;
}

/** Generate a random 4-digit PIN string */
export function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Generate a UUID v4-style idempotency key */
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
