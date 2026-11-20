/**
 * cardService.js
 * Virtual debit cards: create, freeze/unfreeze, spending limit,
 * PIN-protected card detail reveal.
 */

import { dbRead, dbUpdate } from './db.js';
import { generateId } from './cryptoService.js';
import { authService } from './authService.js';

export const DEFAULT_CONTROLS = { online: true, international: false, atm: true, contactless: true };

function defaultExpiry() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String((d.getFullYear() + 4) % 100).padStart(2, '0')}`;
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 100));

/**
 * Build a new virtual card for an account.
 * Exported so db.js seed can call it synchronously.
 */
export function buildCard(accountId, userId) {
  const num = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));
  const groups = num.match(/.{1,4}/g) || [];
  const fullNumber = groups.join(' ');
  const masked = `•••• •••• •••• ${groups[3] || num.slice(-4)}`;

  return {
    id: generateId(),
    accountId,
    userId,
    maskedNumber: masked,
    fullNumber,
    cvv: String(Math.floor(100 + Math.random() * 900)),
    expiry: defaultExpiry(),
    frozen: false,
    controls: { ...DEFAULT_CONTROLS },
    spendingLimit: 200_000_000, // 2,000,000 NGN default (in kobo)
    totalSpentThisCycle: 0,
    createdAt: new Date().toISOString(),
  };
}

function getCard(accountId) {
  const cards = dbRead('cards');
  return cards[accountId] || null;
}

function getAllUserCards(userId) {
  const cards = dbRead('cards');
  return Object.values(cards).filter((c) => c.userId === userId);
}

async function freezeCard(accountId) {
  await delay();
  const cards = dbRead('cards');
  if (!cards[accountId]) return { ok: false, error: 'Card not found.' };
  dbUpdate('cards', (cards) => ({
    ...cards,
    [accountId]: { ...cards[accountId], frozen: true },
  }));
  return { ok: true };
}

async function unfreezeCard(accountId) {
  await delay();
  const cards = dbRead('cards');
  if (!cards[accountId]) return { ok: false, error: 'Card not found.' };
  dbUpdate('cards', (cards) => ({
    ...cards,
    [accountId]: { ...cards[accountId], frozen: false },
  }));
  return { ok: true };
}

async function setSpendingLimit(accountId, limitKobo) {
  await delay();
  if (!Number.isInteger(limitKobo) || limitKobo < 1_000_00) {
    return { ok: false, error: 'Limit must be at least ₦1,000.' };
  }
  if (limitKobo > 1_000_000_000) return { ok: false, error: 'Limit cannot exceed ₦10,000,000.' };
  if (!getCard(accountId)) return { ok: false, error: 'Card not found.' };
  dbUpdate('cards', (cards) => ({
    ...cards,
    [accountId]: { ...cards[accountId], spendingLimit: limitKobo },
  }));
  return { ok: true };
}

/**
 * Check if a card can be used for a given amount.
 * Returns { ok, error? }
 */
function canCharge(accountId, amountKobo) {
  const card = getCard(accountId);
  if (!card) return { ok: false, error: 'No card found for this account.' };
  if (card.frozen) return { ok: false, error: 'Card is frozen.' };
  if (amountKobo > card.spendingLimit) {
    return {
      ok: false,
      error: `Amount exceeds card spending limit of ₦${(card.spendingLimit / 100).toLocaleString()}.`,
    };
  }
  return { ok: true };
}

/**
 * Reveal full card details after PIN verification.
 * Returns the card with fullNumber and cvv, or error.
 */
async function revealCardDetails(accountId, userId, pin) {
  await delay();
  const card = getCard(accountId);
  if (!card || card.userId !== userId) return { ok: false, error: 'Card not found.' };

  const check = await authService.checkPin(userId, pin);
  if (!check.ok) return { ok: false, error: check.error, locked: check.locked };

  return { ok: true, card };
}

/** Toggle a card control (online, international, atm, contactless). */
async function setControl(accountId, control, enabled) {
  await delay(120);
  if (!(control in DEFAULT_CONTROLS)) return { ok: false, error: 'Unknown card control.' };
  const card = getCard(accountId);
  if (!card) return { ok: false, error: 'Card not found.' };
  const controls = { ...DEFAULT_CONTROLS, ...card.controls, [control]: Boolean(enabled) };
  dbUpdate('cards', (cards) => ({ ...cards, [accountId]: { ...cards[accountId], controls } }));
  return { ok: true, controls };
}

/** Cancel the current card and issue a new number (e.g. lost/compromised). */
async function replaceCard(accountId, userId) {
  await delay();
  const old = getCard(accountId);
  if (!old || old.userId !== userId) return { ok: false, error: 'Card not found.' };
  const card = {
    ...buildCard(accountId, userId),
    spendingLimit: old.spendingLimit,
    controls: { ...DEFAULT_CONTROLS, ...old.controls },
  };
  dbUpdate('cards', (cards) => ({ ...cards, [accountId]: card }));
  return { ok: true, card };
}

export async function createVirtualCard(userId, accountId, cardType = 'MASTERCARD') {
  await delay();
  const card = buildCard(accountId, userId);
  card.cardType = cardType;
  dbUpdate('cards', (cards) => ({ ...cards, [accountId]: card }));
  return { ok: true, card };
}

export const getCardsForUser = async (userId) => {
  const cards = getAllUserCards(userId);
  return cards.map((c) => ({
    ...c,
    cardNumber: c.maskedNumber || c.fullNumber,
    isFrozen: c.frozen,
    monthlyLimitKobo: c.spendingLimit || 50000000,
    spentThisMonthKobo: c.totalSpentThisCycle || 0,
  }));
};

export {
  getCard,
  getAllUserCards,
  freezeCard,
  unfreezeCard,
  setSpendingLimit,
  canCharge,
  revealCardDetails,
  setControl,
  replaceCard,
};

export const cardService = {
  setControl,
  replaceCard,
  buildCard,
  getCard,
  getAllUserCards,
  getCardsForUser,
  createVirtualCard,
  freezeCard,
  unfreezeCard,
  setSpendingLimit,
  canCharge,
  revealCardDetails,
};
