/**
 * beneficiaryService.js
 * Saved transfer recipients per user.
 */

import { dbRead, dbUpdate } from './db.js';
import { generateId } from './cryptoService.js';

export const INTERNAL_BANK = 'OXBANK';
const MAX_BENEFICIARIES = 50;

function list(userId) {
  const all = dbRead('beneficiaries');
  return [...(all[userId] || [])].sort((a, b) => a.name.localeCompare(b.name));
}

function exists(userId, accountNumber, bank) {
  return list(userId).some((b) => b.accountNumber === accountNumber && b.bank === bank);
}

async function add(userId, { name, accountNumber, bank = INTERNAL_BANK }) {
  if (!name?.trim()) return { ok: false, error: 'Beneficiary name is required.' };
  if (!/^\d{10}$/.test(accountNumber || '')) return { ok: false, error: 'Account number must be 10 digits.' };
  if (exists(userId, accountNumber, bank)) return { ok: false, error: 'This beneficiary is already saved.' };
  if (list(userId).length >= MAX_BENEFICIARIES) {
    return { ok: false, error: `You can save up to ${MAX_BENEFICIARIES} beneficiaries.` };
  }

  const beneficiary = {
    id: generateId(),
    name: name.trim(),
    accountNumber,
    bank,
    createdAt: new Date().toISOString(),
  };
  dbUpdate('beneficiaries', (all) => ({ ...all, [userId]: [...(all[userId] || []), beneficiary] }));
  return { ok: true, beneficiary };
}

async function remove(userId, beneficiaryId) {
  dbUpdate('beneficiaries', (all) => ({
    ...all,
    [userId]: (all[userId] || []).filter((b) => b.id !== beneficiaryId),
  }));
  return { ok: true };
}

export const beneficiaryService = { list, exists, add, remove };
