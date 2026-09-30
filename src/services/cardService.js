/**
 * cardService.js
 * Virtual debit cards: create, freeze/unfreeze, spending limit,
 * PIN-protected card detail reveal.
 */

import { dbRead, dbUpdate } from './db.js';
import { generateId, verifyPassword } from './cryptoService.js';

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
    expiry: '12/29',
    frozen: false,
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
  if (!Number.isInteger(limitKobo) || limitKobo <= 0) {
    return { ok: false, error: 'Limit must be a positive integer (kobo).' };
  }
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
  const users = dbRead('users');
  const user = users[userId];
  if (!user) return { ok: false, error: 'User not found.' };

  const valid = await verifyPassword(pin, user.pinHash);
  if (!valid) return { ok: false, error: 'Incorrect PIN.' };

  const card = getCard(accountId);
  if (!card) return { ok: false, error: 'Card not found.' };

  return { ok: true, card };
}

export const cardService = {
  buildCard,
  getCard,
  getAllUserCards,
  freezeCard,
  unfreezeCard,
  setSpendingLimit,
  canCharge,
  revealCardDetails,
};
