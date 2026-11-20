import { describe, it, expect, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  globalThis.crypto = webcrypto;
}
if (typeof globalThis.localStorage === 'undefined') {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
}
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { userAgent: 'vitest' };
}

import { resetDatabase, dbRead, dbUpdate, migrate } from '../services/db.js';
import { generateId } from '../services/cryptoService.js';
import { accountService } from '../services/accountService.js';
import { transferService } from '../services/transferService.js';
import { authService } from '../services/authService.js';
import { savingsService } from '../services/savingsService.js';
import { beneficiaryService } from '../services/beneficiaryService.js';
import { budgetService } from '../services/budgetService.js';
import { billService } from '../services/billService.js';
import { cardService } from '../services/cardService.js';
import { adminService } from '../services/adminService.js';
import { summarizeMonth, budgetStatus, budgetProgress, groupByDay } from '../utils/insights.js';

const T = 30_000;
let demo, alice, admin, demoChecking, demoSavings, aliceChecking;

const allLedgersBalanced = () =>
  Object.keys(dbRead('accounts')).every((id) => accountService.verifyLedger(id).ok);

beforeEach(async () => {
  await resetDatabase();
  const users = Object.values(dbRead('users'));
  demo = users.find((u) => u.email === 'demo@oxbank.test');
  alice = users.find((u) => u.email === 'alice@oxbank.test');
  admin = users.find((u) => u.email === 'admin@oxbank.test');
  const accts = (id) => accountService.getUserAccounts(id);
  demoChecking = accts(demo.id).find((a) => a.type === 'Checking');
  demoSavings = accts(demo.id).find((a) => a.type === 'Savings');
  aliceChecking = accts(alice.id).find((a) => a.type === 'Checking');
}, T);

describe('Transfers — security', () => {
  it('rejects debiting an account the caller does not own', async () => {
    const res = await transferService.transfer({
      userId: alice.id, pin: '5678', fromAccountId: demoChecking.id,
      toAccountNumber: aliceChecking.number, amountKobo: 10_000, idempotencyKey: generateId(),
    });
    expect(res.ok).toBe(false);
    expect(accountService.getAccount(demoChecking.id).balance).toBe(demoChecking.balance);
  }, T);

  it('requires a PIN for payments to other people and verifies it server-side', async () => {
    const base = { userId: demo.id, fromAccountId: demoChecking.id, toAccountNumber: aliceChecking.number, amountKobo: 10_000 };
    const noPin = await transferService.transfer({ ...base, idempotencyKey: generateId() });
    expect(noPin.pinRequired).toBe(true);

    const wrong = await transferService.transfer({ ...base, pin: '0000', idempotencyKey: generateId() });
    expect(wrong.ok).toBe(false);
    expect(wrong.pinError).toBe(true);
    expect(accountService.getAccount(demoChecking.id).balance).toBe(demoChecking.balance);

    const ok = await transferService.transfer({ ...base, pin: '1234', idempotencyKey: generateId() });
    expect(ok.ok).toBe(true);
    expect(ok.receipt.to.name).toBe('Alice Johnson');
    expect(accountService.getAccount(aliceChecking.id).balance).toBe(aliceChecking.balance + 10_000);
  }, T);

  it('locks PIN-protected actions after 3 wrong attempts', async () => {
    await authService.checkPin(demo.id, '0000');
    await authService.checkPin(demo.id, '1111');
    const third = await authService.checkPin(demo.id, '2222');
    expect(third.locked).toBe(true);
    const correctButLocked = await authService.checkPin(demo.id, '1234');
    expect(correctButLocked.ok).toBe(false);
    expect(correctButLocked.locked).toBe(true);
  }, T);

  it('moves money between own accounts without a PIN, categorised as Internal Transfer', async () => {
    const res = await transferService.transfer({
      userId: demo.id, fromAccountId: demoChecking.id, toAccountId: demoSavings.id, amountKobo: 50_000, idempotencyKey: generateId(),
    });
    expect(res.ok).toBe(true);
    expect(res.debitEntry.category).toBe('Internal Transfer');
    expect(allLedgersBalanced()).toBe(true);
  }, T);

  it('sends to another bank as a debit only and enforces the daily limit', async () => {
    const ext = await transferService.transfer({
      userId: demo.id, pin: '1234', fromAccountId: demoChecking.id, toAccountNumber: '0123456789',
      toBank: 'GTBank', toName: 'Chidi Okafor', amountKobo: 20_000, idempotencyKey: generateId(),
    });
    expect(ext.ok).toBe(true);
    expect(ext.creditEntry).toBeNull();
    expect(ext.receipt.to.bank).toBe('GTBank');

    dbUpdate('accounts', (a) => ({ ...a, [demoChecking.id]: { ...a[demoChecking.id], balance: a[demoChecking.id].balance + 1_000_000_000 } }));
    dbUpdate('ledger', (l) => ({ ...l, [demoChecking.id]: [{ id: 'x', type: 'credit', amount: 1_000_000_000, category: 'Deposit', createdAt: new Date().toISOString() }, ...l[demoChecking.id]] }));
    const tooBig = await transferService.transfer({
      userId: demo.id, pin: '1234', fromAccountId: demoChecking.id, toAccountNumber: aliceChecking.number,
      amountKobo: transferService.DAILY_LIMIT_KOBO, idempotencyKey: generateId(),
    });
    expect(tooBig.ok).toBe(false);
    expect(tooBig.error).toMatch(/daily/i);
  }, T);

  it('blocks transfers from suspended users and ends their session', async () => {
    const login = await authService.login({ email: 'alice@oxbank.test', password: 'Alice@1234' });
    expect(authService.resolveSession(login.sessionToken)).not.toBeNull();
    const res = await adminService.toggleUserSuspension(admin.id, alice.id);
    expect(res.ok).toBe(true);
    expect(authService.resolveSession(login.sessionToken)).toBeNull();
    const t = await transferService.transfer({
      userId: alice.id, pin: '5678', fromAccountId: aliceChecking.id, toAccountNumber: demoChecking.number, amountKobo: 1000, idempotencyKey: generateId(),
    });
    expect(t.ok).toBe(false);
  }, T);

  it('name enquiry resolves OXBANK account holders', () => {
    expect(transferService.lookupAccount(aliceChecking.number).name).toBe('Alice Johnson');
    expect(transferService.lookupAccount('12345').ok).toBe(false);
    expect(transferService.lookupAccount('0000000000', 'Zenith Bank').external).toBe(true);
  });
});

describe('Admin authorization', () => {
  it('rejects non-admin callers', async () => {
    await expect(adminService.getAdminStats(demo.id)).rejects.toThrow(/Admin/);
    await expect(adminService.toggleUserSuspension(demo.id, alice.id)).rejects.toThrow(/Admin/);
  }, T);

  it('reports platform totals and ledger integrity', async () => {
    const s = await adminService.getAdminStats(admin.id);
    expect(s.integrity.ok).toBe(true);
    expect(s.totalMoneyKobo).toBe(s.depositsKobo + s.goalsKobo);
  }, T);
});

describe('Savings goals', () => {
  it('conserves money when funding, withdrawing and closing a goal', async () => {
    const before = accountService.getAccount(demoChecking.id).balance;
    const { goal } = await savingsService.create(demo.id, { name: 'Holiday', targetKobo: 100_000_00 });
    expect((await savingsService.fund(demo.id, goal.id, demoChecking.id, 30_000_00)).ok).toBe(true);
    expect(accountService.getAccount(demoChecking.id).balance).toBe(before - 30_000_00);
    expect(savingsService.getGoal(demo.id, goal.id).savedKobo).toBe(30_000_00);

    expect((await savingsService.withdraw(demo.id, goal.id, demoChecking.id, 50_000_00)).ok).toBe(false);
    const closed = await savingsService.close(demo.id, goal.id, demoChecking.id);
    expect(closed.returnedKobo).toBe(30_000_00);
    expect(accountService.getAccount(demoChecking.id).balance).toBe(before);
    expect(savingsService.getGoal(demo.id, goal.id)).toBeNull();
    expect(allLedgersBalanced()).toBe(true);
  }, T);

  it('cannot fund a goal from someone else’s account', async () => {
    const { goal } = await savingsService.create(demo.id, { name: 'X', targetKobo: 10_000_00 });
    const res = await savingsService.fund(demo.id, goal.id, aliceChecking.id, 1_000_00);
    expect(res.ok).toBe(false);
  }, T);
});

describe('Beneficiaries, budgets, bills, cards', () => {
  it('saves beneficiaries without duplicates', async () => {
    const before = beneficiaryService.list(alice.id).length;
    expect((await beneficiaryService.add(alice.id, { name: 'Bola', accountNumber: '1234567890', bank: 'Kuda Bank' })).ok).toBe(true);
    expect((await beneficiaryService.add(alice.id, { name: 'Bola', accountNumber: '1234567890', bank: 'Kuda Bank' })).ok).toBe(false);
    expect(beneficiaryService.list(alice.id)).toHaveLength(before + 1);
  });

  it('stores budgets per category', async () => {
    await budgetService.set(alice.id, 'Dining', 20_000_00);
    expect(budgetService.get(alice.id).Dining).toBe(20_000_00);
    await budgetService.remove(alice.id, 'Dining');
    expect(budgetService.get(alice.id).Dining).toBeUndefined();
  }, T);

  it('quick-pays a bill and keeps recurring schedules rolling monthly', async () => {
    const paid = await billService.quickPay(demo.id, { biller: 'MTN', category: 'Airtime', customerRef: '08031234567', amountKobo: 500_00, fromAccountId: demoChecking.id });
    expect(paid.ok).toBe(true);

    const bill = billService.getBills(demo.id)[0];
    const past = new Date(Date.now() - 60_000).toISOString();
    dbUpdate('bills', (b) => ({ ...b, [demo.id]: b[demo.id].map((x) => (x.id === bill.id ? { ...x, scheduledDate: past, recurring: 'monthly' } : x)) }));
    await billService.processDueBills();
    const after = billService.getBills(demo.id).find((x) => x.id === bill.id);
    expect(new Date(after.scheduledDate).getTime()).toBeGreaterThan(Date.now());
    expect(after.recurring).toBe('monthly');
  }, T);

  it('reveals card details only with the right PIN and toggles controls', async () => {
    expect((await cardService.revealCardDetails(demoChecking.id, demo.id, '9999')).ok).toBe(false);
    expect((await cardService.revealCardDetails(demoChecking.id, alice.id, '5678')).ok).toBe(false);
    expect((await cardService.revealCardDetails(demoChecking.id, demo.id, '1234')).ok).toBe(true);
    const c = await cardService.setControl(demoChecking.id, 'international', true);
    expect(c.controls.international).toBe(true);
  }, T);
});

describe('Migration', () => {
  it('upgrades a v1 database in place without touching balances', () => {
    const raw = JSON.parse(localStorage.getItem('oxbank_db'));
    const accountsBefore = JSON.stringify(raw.accounts);
    delete raw.goals;
    delete raw.budgets;
    delete raw.beneficiaries;
    raw._version = 1;
    migrate(raw);
    expect(raw._version).toBe(2);
    expect(raw.goals).toEqual({});
    expect(raw.budgets).toEqual({});
    expect(raw.beneficiaries).toEqual({});
    expect(JSON.stringify(raw.accounts)).toBe(accountsBefore);
  });
});

describe('Insights (pure)', () => {
  const now = new Date(2026, 10, 20, 12);
  const tx = (type, amount, category, d) => ({ type, amount, category, createdAt: new Date(2026, 10, d, 10).toISOString() });
  const ledger = [
    tx('credit', 500_000_00, 'Salary', 1),
    tx('debit', 20_000_00, 'Dining', 3),
    tx('debit', 50_000_00, 'Savings', 4),
    tx('debit', 10_000_00, 'Internal Transfer', 5),
    tx('debit', 30_000_00, 'Dining', 19),
    tx('credit', 10_000_00, 'Internal Transfer', 5),
  ];

  it('excludes savings and own-account moves from income and spending', () => {
    const m = summarizeMonth(ledger, 0, now);
    expect(m.income).toBe(500_000_00);
    expect(m.spending).toBe(50_000_00);
    expect(m.byCategory).toEqual({ Dining: 50_000_00 });
  });

  it('classifies budget status at 80% and over 100%', () => {
    expect(budgetStatus(79, 100)).toBe('good');
    expect(budgetStatus(80, 100)).toBe('warning');
    expect(budgetStatus(101, 100)).toBe('critical');
    const [row] = budgetProgress({ Dining: 40_000_00 }, ledger, now);
    expect(row.status).toBe('critical');
    expect(row.remainingKobo).toBe(-10_000_00);
  });

  it('groups by local day with Today/Yesterday labels', () => {
    const groups = groupByDay([
      { createdAt: new Date(2026, 10, 20, 9).toISOString() },
      { createdAt: new Date(2026, 10, 19, 9).toISOString() },
      { createdAt: new Date(2026, 10, 1, 9).toISOString() },
    ], now);
    expect(groups.map((g) => g.label).slice(0, 2)).toEqual(['Today', 'Yesterday']);
    expect(groups).toHaveLength(3);
  });
});

