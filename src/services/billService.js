/**
 * billService.js
 * Payees, pay-now, schedule bills, process due bills.
 * Scheduled bills are processed on app load and every 60 s.
 */

import { dbRead, dbUpdate } from './db.js';
import { generateId } from './cryptoService.js';
import { accountService } from './accountService.js';
import { notificationService } from './notificationService.js';
import { formatCurrency } from '../utils/currency.js';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms + Math.random() * 100));

// ─────────────────────────────────────────────────────────────
// Payees
// ─────────────────────────────────────────────────────────────

function getBills(userId) {
  const bills = dbRead('bills');
  return bills[userId] || [];
}

async function addPayee(userId, { payee, amount, category, customerRef = '' }) {
  await delay();

  if (!payee?.trim()) return { ok: false, error: 'Payee name is required.' };
  if (!Number.isInteger(amount) || amount < 100) {
    return { ok: false, error: 'Amount must be at least ₦1.' };
  }

  const bill = {
    id: generateId(),
    userId,
    payee: payee.trim(),
    amount,
    category: category || 'Bills',
    customerRef: customerRef.trim(),
    scheduledDate: null,
    recurring: null,
    lastPaid: null,
    createdAt: new Date().toISOString(),
  };

  dbUpdate('bills', (bills) => {
    const userBills = bills[userId] || [];
    return { ...bills, [userId]: [...userBills, bill] };
  });

  return { ok: true, bill };
}

async function deletePayee(userId, billId) {
  await delay();
  dbUpdate('bills', (bills) => {
    const userBills = bills[userId] || [];
    return { ...bills, [userId]: userBills.filter((b) => b.id !== billId) };
  });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Pay now
// ─────────────────────────────────────────────────────────────

async function payBill(userId, billId, fromAccountId) {
  await delay();

  const bills = dbRead('bills');
  const userBills = bills[userId] || [];
  const bill = userBills.find((b) => b.id === billId);
  if (!bill) return { ok: false, error: 'Bill not found.' };

  const account = accountService.getAccount(fromAccountId);
  if (!account) return { ok: false, error: 'Account not found.' };
  if (account.userId !== userId) return { ok: false, error: 'Unauthorized.' };

  if (bill.amount > account.balance) {
    return { ok: false, error: 'Insufficient funds.' };
  }

  try {
    const entry = accountService.appendLedgerEntry(fromAccountId, 'debit', bill.amount, {
      note: `Bill: ${bill.payee}`,
      category: bill.category,
      reference: `BILL${generateId().slice(0, 8).toUpperCase()}`,
    });

    // Update lastPaid (a paid-now bill keeps any recurring schedule)
    dbUpdate('bills', (bills) => ({
      ...bills,
      [userId]: (bills[userId] || []).map((b) =>
        b.id === billId
          ? { ...b, lastPaid: new Date().toISOString(), scheduledDate: b.recurring ? b.scheduledDate : null }
          : b
      ),
    }));

    await notificationService.create(userId, {
      type: 'bill_paid',
      title: 'Bill Payment Confirmed',
      message: `₦${(bill.amount / 100).toLocaleString()} paid to ${bill.payee}.`,
    });

    return { ok: true, entry };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Schedule
// ─────────────────────────────────────────────────────────────

/**
 * Schedule a payee. Date-only strings ("2026-12-01") run at 09:00 local time.
 * @param {'monthly'|null} recurring — monthly standing order when set
 */
async function scheduleBill(userId, billId, dateISO, recurring = null) {
  await delay();

  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? new Date(`${dateISO}T09:00:00`) : new Date(dateISO);
  if (isNaN(date.getTime())) return { ok: false, error: 'Invalid date.' };
  if (date < new Date()) return { ok: false, error: 'Scheduled date must be in the future.' };
  if (!getBills(userId).some((b) => b.id === billId)) return { ok: false, error: 'Bill not found.' };

  dbUpdate('bills', (bills) => ({
    ...bills,
    [userId]: (bills[userId] || []).map((b) =>
      b.id === billId ? { ...b, scheduledDate: date.toISOString(), recurring: recurring === 'monthly' ? 'monthly' : null } : b
    ),
  }));

  return { ok: true, scheduledDate: date.toISOString() };
}

async function cancelSchedule(userId, billId) {
  await delay();
  dbUpdate('bills', (bills) => ({
    ...bills,
    [userId]: (bills[userId] || []).map((b) => (b.id === billId ? { ...b, scheduledDate: null, recurring: null } : b)),
  }));
  return { ok: true };
}

/**
 * One-off bill payment without a saved payee (airtime, data, electricity token…).
 */
async function quickPay(userId, { biller, category, customerRef, amountKobo, fromAccountId }) {
  await delay();
  if (!biller?.trim()) return { ok: false, error: 'Choose a biller.' };
  if (!customerRef?.trim()) return { ok: false, error: 'Enter the phone/meter/smartcard number.' };
  if (!Number.isInteger(amountKobo) || amountKobo < 50_00) return { ok: false, error: 'Minimum bill payment is ₦50.' };

  const account = accountService.getAccount(fromAccountId);
  if (!account || account.userId !== userId) return { ok: false, error: 'Account not found.' };
  if (amountKobo > account.balance) return { ok: false, error: 'Insufficient funds.' };

  try {
    const reference = `BILL${generateId().slice(0, 8).toUpperCase()}`;
    const entry = accountService.appendLedgerEntry(fromAccountId, 'debit', amountKobo, {
      note: `${biller.trim()} · ${customerRef.trim()}`,
      category,
      reference,
      counterpartName: biller.trim(),
      counterpartAccount: customerRef.trim(),
    });
    await notificationService.create(userId, {
      type: 'bill_paid',
      title: 'Bill payment successful',
      message: `${formatCurrency(amountKobo)} paid to ${biller.trim()} (${customerRef.trim()}).`,
    });
    return { ok: true, entry, reference };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function nextMonth(iso) {
  const d = new Date(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d.toISOString();
}

// ─────────────────────────────────────────────────────────────
// Scheduled bill processor (runs on load + every 60 s)
// ─────────────────────────────────────────────────────────────

async function processDueBills() {
  const bills = dbRead('bills');
  const accounts = dbRead('accounts');
  const now = new Date();

  let processedCount = 0;
  for (const [userId, userBills] of Object.entries(bills)) {
    for (const bill of userBills) {
      if (!bill.scheduledDate) continue;
      if (new Date(bill.scheduledDate) > now) continue;

      // Find default account (first checking, else first account)
      const userAccounts = Object.values(accounts).filter((a) => a.userId === userId);
      const account = userAccounts.find((a) => a.type === 'Checking') || userAccounts[0];
      if (!account) continue;

      if (bill.amount > account.balance) {
        await notificationService.create(userId, {
          type: 'bill_failed',
          title: 'Scheduled Payment Failed',
          message: `Could not pay ₦${(bill.amount / 100).toLocaleString()} to ${bill.payee} — insufficient funds.`,
        });
        // Recurring: try again next cycle. One-off: clear so it doesn't keep retrying.
        dbUpdate('bills', (bills) => ({
          ...bills,
          [userId]: (bills[userId] || []).map((b) =>
            b.id === bill.id ? { ...b, scheduledDate: b.recurring ? nextMonth(b.scheduledDate) : null } : b
          ),
        }));
        continue;
      }

      try {
        accountService.appendLedgerEntry(account.id, 'debit', bill.amount, {
          note: `Scheduled: ${bill.payee}`,
          category: bill.category,
          reference: `SCHD${generateId().slice(0, 8).toUpperCase()}`,
        });

        dbUpdate('bills', (bills) => ({
          ...bills,
          [userId]: (bills[userId] || []).map((b) =>
            b.id === bill.id
              ? {
                  ...b,
                  scheduledDate: b.recurring ? nextMonth(b.scheduledDate) : null,
                  lastPaid: new Date().toISOString(),
                }
              : b
          ),
        }));

        await notificationService.create(userId, {
          type: 'bill_paid',
          title: 'Scheduled Payment Processed',
          message: `₦${(bill.amount / 100).toLocaleString()} paid to ${bill.payee} automatically.`,
        });

        processedCount++;
      } catch (err) {
        console.error('[Bills] Scheduled payment error:', err);
      }
    }
  }

  return { ok: true, processedCount };
}

export async function listPayees(userId) {
  const bills = getBills(userId);
  return bills.map((b) => ({
    id: b.id,
    name: b.payee,
    category: b.category,
    accountNumber: 'REF-' + b.id.slice(0, 6).toUpperCase(),
    amount: b.amount,
  }));
}

export async function getScheduledBills(userId) {
  const bills = getBills(userId);
  return bills.filter((b) => b.scheduledDate !== null).map((b) => ({
    ...b,
    payeeName: b.payee,
    customerRef: 'REF-' + b.id.slice(0, 6).toUpperCase(),
    amountKobo: b.amount,
    status: new Date(b.scheduledDate) < new Date() ? 'executed' : 'pending',
  }));
}

export { payBill, scheduleBill, processDueBills };

export const billService = {
  getBills,
  addPayee,
  deletePayee,
  payBill,
  scheduleBill,
  cancelSchedule,
  quickPay,
  processDueBills,
  listPayees,
  getScheduledBills,
};
