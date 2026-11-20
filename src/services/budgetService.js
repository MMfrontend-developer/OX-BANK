/**
 * budgetService.js
 * Monthly spending limits per category. Limits are stored in kobo;
 * spend against them is computed from the ledger (see utils/insights.js).
 */

import { dbRead, dbUpdate } from './db.js';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms + Math.random() * 100));

function get(userId) {
  const budgets = dbRead('budgets');
  return { ...(budgets[userId] || {}) };
}

async function set(userId, category, limitKobo) {
  await delay();
  if (!category?.trim()) return { ok: false, error: 'Choose a category.' };
  if (!Number.isInteger(limitKobo) || limitKobo < 100_00) {
    return { ok: false, error: 'Budget must be at least ₦100.' };
  }
  dbUpdate('budgets', (budgets) => ({
    ...budgets,
    [userId]: { ...(budgets[userId] || {}), [category.trim()]: limitKobo },
  }));
  return { ok: true };
}

async function remove(userId, category) {
  await delay();
  dbUpdate('budgets', (budgets) => {
    const mine = { ...(budgets[userId] || {}) };
    delete mine[category];
    return { ...budgets, [userId]: mine };
  });
  return { ok: true };
}

export const budgetService = { get, set, remove };
