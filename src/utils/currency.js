/**
 * currency.js
 * Format / parse NGN (Naira) values.
 * Money is stored as kobo (integer). 1 NGN = 100 kobo.
 */

const formatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format kobo amount → "₦50,000.00"
 * @param {number} kobo — integer
 */
export function formatCurrency(kobo) {
  if (typeof kobo !== 'number') return '₦0.00';
  return formatter.format(kobo / 100);
}

/**
 * Format kobo amount with compact suffix (e.g. "₦1.2M")
 */
export function formatCompact(kobo) {
  const ngn = kobo / 100;
  if (ngn >= 1_000_000) return `₦${(ngn / 1_000_000).toFixed(1)}M`;
  if (ngn >= 1_000) return `₦${(ngn / 1_000).toFixed(1)}K`;
  return formatCurrency(kobo);
}

/**
 * Parse a string input (user typed "500.50") → kobo integer (50050).
 * Returns NaN if invalid.
 */
export function parseToKobo(str) {
  const n = parseFloat(String(str).replace(/[^\d.]/g, ''));
  if (isNaN(n) || n <= 0) return NaN;
  return Math.round(n * 100);
}

/**
 * Convert kobo to NGN display string (no currency symbol).
 */
export function koboToNGN(kobo) {
  return (kobo / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
