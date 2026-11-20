/**
 * insights.js — pure helpers for spending analytics, budgets and history.
 * Inputs are ledger entries: { type, amount (kobo), category, createdAt, ... }.
 */

/** Movements of the customer's own money that are neither income nor spending. */
export const NON_SPENDING_CATEGORIES = new Set(['Savings', 'Internal Transfer']);
const NON_INCOME_CATEGORIES = new Set(['Savings', 'Internal Transfer', 'Deposit']);

export const BUDGET_CATEGORIES = [
  'Groceries',
  'Dining',
  'Shopping',
  'Transport',
  'Utilities',
  'Electricity',
  'Airtime',
  'Internet',
  'Cable TV',
  'Netflix',
  'Subscriptions',
  'Transfer',
];

export const WARNING_RATIO = 0.8;

export const isSpending = (tx) => tx.type === 'debit' && !NON_SPENDING_CATEGORIES.has(tx.category);
export const isIncome = (tx) => tx.type === 'credit' && !NON_INCOME_CATEGORIES.has(tx.category);

/** [start, end) of the calendar month `offset` months from `now` (0 = this month). */
export function monthRange(offset = 0, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end };
}

export function inRange(tx, { start, end }) {
  const t = new Date(tx.createdAt).getTime();
  return t >= start.getTime() && t < end.getTime();
}

/** Income, spending and per-category spend for one calendar month. */
export function summarizeMonth(transactions, offset = 0, now = new Date()) {
  const range = monthRange(offset, now);
  let income = 0;
  let spending = 0;
  const byCategory = {};
  for (const tx of transactions) {
    if (!inRange(tx, range)) continue;
    if (isIncome(tx)) income += tx.amount;
    if (isSpending(tx)) {
      spending += tx.amount;
      const cat = tx.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + tx.amount;
    }
  }
  return { ...range, income, spending, net: income - spending, byCategory };
}

/** Percent change from `prev` to `curr`; null when there is no baseline. */
export function percentChange(curr, prev) {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * Status of a budget: 'good' (< 80%), 'warning' (80–100%), 'critical' (over).
 */
export function budgetStatus(spentKobo, limitKobo) {
  if (!limitKobo) return 'good';
  const ratio = spentKobo / limitKobo;
  if (ratio > 1) return 'critical';
  if (ratio >= WARNING_RATIO) return 'warning';
  return 'good';
}

/** Budgets joined with this month's spend, sorted by % used (desc). */
export function budgetProgress(budgets, transactions, now = new Date()) {
  const { byCategory } = summarizeMonth(transactions, 0, now);
  return Object.entries(budgets)
    .map(([category, limitKobo]) => {
      const spentKobo = byCategory[category] || 0;
      return {
        category,
        limitKobo,
        spentKobo,
        remainingKobo: limitKobo - spentKobo,
        ratio: limitKobo ? spentKobo / limitKobo : 0,
        status: budgetStatus(spentKobo, limitKobo),
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Group transactions (already newest-first) into [{ key, label, items }] by local day. */
export function groupByDay(transactions, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86400000;
  const groups = [];
  const index = new Map();
  for (const tx of transactions) {
    const d = new Date(tx.createdAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const key = String(dayStart);
    if (!index.has(key)) {
      let label;
      if (dayStart === today) label = 'Today';
      else if (dayStart === today - DAY) label = 'Yesterday';
      else label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      const group = { key, label, items: [] };
      index.set(key, group);
      groups.push(group);
    }
    index.get(key).items.push(tx);
  }
  return groups;
}

/** Human "time ago" for notifications and activity feeds. */
export function timeAgo(iso, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
