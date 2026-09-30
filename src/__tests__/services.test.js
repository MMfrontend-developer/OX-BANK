import { describe, it, expect, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  globalThis.crypto = webcrypto;
}

if (typeof globalThis.localStorage === 'undefined') {
  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
    setItem: (key, value) => storageMap.set(key, String(value)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };
}

import { resetDatabase, dbRead } from '../services/db.js';
import { hashPassword, verifyPassword, generateId } from '../services/cryptoService.js';
import { accountService } from '../services/accountService.js';
import { execute as executeTransfer } from '../services/transferService.js';
import { cardService } from '../services/cardService.js';
import { getScheduledBills, processDueBills } from '../services/billService.js';

describe('OXBANK Backend Architecture Unit Tests', () => {
  let demoUser, aliceUser;

  beforeEach(async () => {
    await resetDatabase();
    const users = dbRead('users');
    demoUser = Object.values(users).find((u) => u.email === 'demo@oxbank.test');
    aliceUser = Object.values(users).find((u) => u.email === 'alice@oxbank.test');
  });

  it('S1: Password Hash & Verification using Web Crypto PBKDF2', async () => {
    const password = 'TestSecretPassword@123';
    const hashData = await hashPassword(password);

    expect(hashData).toHaveProperty('hash');
    expect(hashData).toHaveProperty('salt');
    expect(hashData.iterations).toBe(310000);

    const isValid = await verifyPassword(password, hashData);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword', hashData);
    expect(isInvalid).toBe(false);
  });

  it('S3: Cryptographic Ledger Integrity Check', async () => {
    const accounts = accountService.getUserAccounts(demoUser.id);
    expect(accounts.length).toBeGreaterThan(0);

    const check = accountService.verifyLedger(accounts[0].id);
    expect(check.ok).toBe(true);
    expect(check.stored).toBe(accounts[0].balance);
  });

  it('S3: Overdraft Protection Blocks Invalid Transfers', async () => {
    const accounts = accountService.getUserAccounts(demoUser.id);
    const sender = accounts[0];
    const aliceAccount = accountService.getUserAccounts(aliceUser.id)[0];

    const result = await executeTransfer({
      fromAccountId: sender.id,
      toAccountNumber: aliceAccount.number,
      toName: 'Alice',
      amountKobo: sender.balance + 10000000, // Amount > balance
      note: 'Overdraft Test',
      submissionId: generateId(),
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Insufficient/i);
  });

  it('S3: Transfer Idempotency Prevents Double-Debit', async () => {
    const accounts = accountService.getUserAccounts(demoUser.id);
    const sender = accounts[0];
    const initialBalance = sender.balance;
    const aliceAccount = accountService.getUserAccounts(aliceUser.id)[0];
    const submissionId = generateId();

    const transferPayload = {
      fromAccountId: sender.id,
      toAccountNumber: aliceAccount.number,
      toName: 'Alice',
      amountKobo: 50000, // N500
      note: 'Idempotency Test',
      submissionId,
    };

    // First call
    const res1 = await executeTransfer(transferPayload);
    expect(res1.ok).toBe(true);

    const senderAfter1 = accountService.getAccount(sender.id);
    expect(senderAfter1.balance).toBe(initialBalance - 50000);

    // Re-submit identical submissionId
    const res2 = await executeTransfer(transferPayload);
    expect(res2.ok).toBe(true);

    // Balance should remain unchanged after 2nd submit
    const senderAfter2 = accountService.getAccount(sender.id);
    expect(senderAfter2.balance).toBe(initialBalance - 50000);
  });

  it('S4: Card Freeze Prevents Authorizations', async () => {
    const cards = cardService.getAllUserCards(demoUser.id);
    expect(cards.length).toBeGreaterThan(0);

    const card = cards[0];
    const freezeRes = await cardService.freezeCard(card.accountId);
    expect(freezeRes.ok).toBe(true);

    const updatedCard = cardService.getCard(card.accountId);
    expect(updatedCard.frozen).toBe(true);

    const chargeCheck = cardService.canCharge(card.accountId, 1000);
    expect(chargeCheck.ok).toBe(false);
    expect(chargeCheck.error).toMatch(/frozen/i);
  });

  it('S4: Scheduled Bills Processing', async () => {
    const scheduled = await getScheduledBills(demoUser.id);
    expect(Array.isArray(scheduled)).toBe(true);

    const processRes = await processDueBills();
    expect(processRes.processedCount).toBeGreaterThanOrEqual(0);
  });
});
