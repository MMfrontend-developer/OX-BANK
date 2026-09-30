/**
 * validation.js
 * Shared input validation helpers — all returns { ok, error? }
 */

export function validateEmail(email) {
  if (!email?.trim()) return { ok: false, error: 'Email is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  return { ok: true };
}

export function validatePassword(password) {
  if (!password) return { ok: false, error: 'Password is required.' };
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Must contain an uppercase letter.' };
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Must contain a number.' };
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, error: 'Must contain a special character (!@#$…).' };
  return { ok: true };
}

export function validatePin(pin) {
  if (!pin) return { ok: false, error: 'PIN is required.' };
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'PIN must be exactly 4 digits.' };
  return { ok: true };
}

export function validateAmount(str) {
  const n = parseFloat(String(str).replace(/[^\d.]/g, ''));
  if (isNaN(n) || n <= 0) return { ok: false, error: 'Please enter a valid amount.' };
  if (n < 1) return { ok: false, error: 'Minimum amount is ₦1.' };
  if (n > 10_000_000) return { ok: false, error: 'Maximum amount is ₦10,000,000 per transaction.' };
  return { ok: true, kobo: Math.round(n * 100) };
}

export function validateName(name) {
  if (!name?.trim()) return { ok: false, error: 'Name is required.' };
  if (name.trim().length < 2) return { ok: false, error: 'Name must be at least 2 characters.' };
  if (name.trim().length > 50) return { ok: false, error: 'Name must be under 50 characters.' };
  return { ok: true };
}

export function sanitizeText(str) {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
}
