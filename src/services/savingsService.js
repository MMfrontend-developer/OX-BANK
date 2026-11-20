/**
 * savingsService.js
 * Savings goals ("vaults"): money moved into a goal is debited from a
 * customer account via the ledger and held on the goal until withdrawn.
 * All amounts in kobo (integer).
 */

import { dbRead, dbUpdate } from './db.js';
import { generateId } from './cryptoService.js';
import { accountService } from './accountService.js';
import { notificationService } from './notificationService.js';
import { formatCurrency } from '../utils/currency.js';

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms + Math.random() * 100));

const MAX_GOALS = 10;

function list(userId) {
  const goals = dbRead('goals');
  return [...(goals[userId] || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function getGoal(userId, goalId) {
  return list(userId).find((g) => g.id === goalId) || null;
}

function totalSaved(userId) {
  return list(userId).reduce((sum, g) => sum + g.savedKobo, 0);
}

function writeGoal(userId, goalId, patch) {
  dbUpdate('goals', (goals) => ({
    ...goals,
    [userId]: (goals[userId] || []).map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
  }));
}

function ownedAccount(userId, accountId) {
  const account = accountService.getAccount(accountId);
  if (!account || account.userId !== userId) return null;
  return account;
}

async function create(userId, { name, targetKobo, deadline = null, icon = '🎯' }) {
  await delay();
  if (!name?.trim()) return { ok: false, error: 'Give your goal a name.' };
  if (name.trim().length > 40) return { ok: false, error: 'Goal name must be 40 characters or fewer.' };
  if (!Number.isInteger(targetKobo) || targetKobo < 100_00) {
    return { ok: false, error: 'Target must be at least ₦100.' };
  }
  if (deadline && Number.isNaN(new Date(deadline).getTime())) {
    return { ok: false, error: 'Invalid target date.' };
  }
  if (list(userId).length >= MAX_GOALS) {
    return { ok: false, error: `You can have up to ${MAX_GOALS} goals.` };
  }

  const goal = {
    id: generateId(),
    userId,
    name: name.trim(),
    icon,
    targetKobo,
    savedKobo: 0,
    deadline: deadline ? new Date(deadline).toISOString() : null,
    createdAt: new Date().toISOString(),
  };
  dbUpdate('goals', (goals) => ({ ...goals, [userId]: [...(goals[userId] || []), goal] }));
  return { ok: true, goal };
}

async function fund(userId, goalId, fromAccountId, amountKobo) {
  await delay();
  if (!Number.isInteger(amountKobo) || amountKobo < 100) {
    return { ok: false, error: 'Minimum amount is ₦1.' };
  }
  const goal = getGoal(userId, goalId);
  if (!goal) return { ok: false, error: 'Goal not found.' };
  const account = ownedAccount(userId, fromAccountId);
  if (!account) return { ok: false, error: 'Account not found.' };
  if (amountKobo > account.balance) return { ok: false, error: 'Insufficient funds.' };

  try {
    const entry = accountService.appendLedgerEntry(fromAccountId, 'debit', amountKobo, {
      note: `Saved to goal: ${goal.name}`,
      category: 'Savings',
      reference: `SAV${generateId().slice(0, 8).toUpperCase()}`,
    });
    const savedKobo = goal.savedKobo + amountKobo;
    writeGoal(userId, goalId, { savedKobo });

    if (goal.savedKobo < goal.targetKobo && savedKobo >= goal.targetKobo) {
      await notificationService.create(userId, {
        type: 'goal',
        title: 'Goal reached! 🎉',
        message: `You hit your ${goal.name} target of ${formatCurrency(goal.targetKobo)}.`,
      });
    }
    return { ok: true, entry, savedKobo };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function withdraw(userId, goalId, toAccountId, amountKobo) {
  await delay();
  if (!Number.isInteger(amountKobo) || amountKobo < 100) {
    return { ok: false, error: 'Minimum amount is ₦1.' };
  }
  const goal = getGoal(userId, goalId);
  if (!goal) return { ok: false, error: 'Goal not found.' };
  if (amountKobo > goal.savedKobo) return { ok: false, error: 'Amount exceeds what is saved in this goal.' };
  if (!ownedAccount(userId, toAccountId)) return { ok: false, error: 'Account not found.' };

  try {
    const entry = accountService.appendLedgerEntry(toAccountId, 'credit', amountKobo, {
      note: `Withdrawn from goal: ${goal.name}`,
      category: 'Savings',
      reference: `SAV${generateId().slice(0, 8).toUpperCase()}`,
    });
    writeGoal(userId, goalId, { savedKobo: goal.savedKobo - amountKobo });
    return { ok: true, entry };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Close a goal, returning any saved money to the given account. */
async function close(userId, goalId, toAccountId) {
  const goal = getGoal(userId, goalId);
  if (!goal) return { ok: false, error: 'Goal not found.' };
  if (goal.savedKobo > 0) {
    const res = await withdraw(userId, goalId, toAccountId, goal.savedKobo);
    if (!res.ok) return res;
  } else {
    await delay();
  }
  dbUpdate('goals', (goals) => ({
    ...goals,
    [userId]: (goals[userId] || []).filter((g) => g.id !== goalId),
  }));
  return { ok: true, returnedKobo: goal.savedKobo };
}

/** Total held in goals across all users (admin metrics). */
function totalHeldAllUsers() {
  const goals = dbRead('goals');
  return Object.values(goals).flat().reduce((sum, g) => sum + (g.savedKobo || 0), 0);
}

export const savingsService = {
  list,
  getGoal,
  totalSaved,
  create,
  fund,
  withdraw,
  close,
  totalHeldAllUsers,
};
