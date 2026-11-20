import React, { useMemo, useState } from 'react';
import { Smartphone, Wifi, Zap, Tv, Globe, Plus, CalendarClock, Trash2, Repeat, Receipt, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { billService } from '../services/billService';
import { formatCurrency, nairaToKobo } from '../utils/currency';
import { Alert, AmountInput, Modal, Money, Empty } from '../components/ui';

const BILL_TYPES = [
  { id: 'Airtime', icon: Smartphone, billers: ['MTN', 'Airtel', 'Glo', '9mobile'], refLabel: 'Phone number', refPattern: /^0\d{10}$/, refHint: '11-digit number, e.g. 08031234567', presets: [200, 500, 1000, 2000] },
  { id: 'Data', icon: Wifi, billers: ['MTN Data', 'Airtel Data', 'Glo Data', '9mobile Data'], refLabel: 'Phone number', refPattern: /^0\d{10}$/, refHint: '11-digit number', presets: [1000, 2500, 5000, 10000] },
  { id: 'Electricity', icon: Zap, billers: ['IKEDC (Ikeja Electric)', 'EKEDC (Eko Electric)', 'AEDC (Abuja Electric)', 'PHED (Port Harcourt)'], refLabel: 'Meter number', refPattern: /^\d{11,13}$/, refHint: '11–13 digit prepaid meter number', presets: [5000, 10000, 20000] },
  { id: 'Cable TV', icon: Tv, billers: ['DStv', 'GOtv', 'StarTimes', 'Showmax'], refLabel: 'Smartcard / IUC number', refPattern: /^\d{10,11}$/, refHint: '10–11 digits', presets: [3500, 9000, 15000] },
  { id: 'Internet', icon: Globe, billers: ['Spectranet', 'Smile', 'ipNX', 'Starlink'], refLabel: 'Customer ID', refPattern: /^[A-Za-z0-9-]{4,20}$/, refHint: 'As shown on your bill', presets: [10000, 20000, 38000] },
];

function QuickPay({ accounts, primaryAccount, userId, onPaid }) {
  const { toast } = useToast();
  const [typeId, setTypeId] = useState('Airtime');
  const type = BILL_TYPES.find((t) => t.id === typeId);
  const [form, setForm] = useState({ biller: type.billers[0], ref: '', amount: '', accountId: primaryAccount?.id || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const chooseType = (t) => {
    setTypeId(t.id);
    setForm((f) => ({ ...f, biller: t.billers[0], ref: '', amount: '' }));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!type.refPattern.test(form.ref.trim())) return setError(`Check the ${type.refLabel.toLowerCase()}: ${type.refHint}.`);
    const kobo = nairaToKobo(form.amount);
    if (!kobo) return setError('Enter an amount.');
    setBusy(true);
    const res = await billService.quickPay(userId, {
      biller: form.biller, category: typeId, customerRef: form.ref.trim(), amountKobo: kobo, fromAccountId: form.accountId || primaryAccount?.id,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(`${formatCurrency(kobo)} paid to ${form.biller}.`);
    setDone({ ...res, amount: kobo, biller: form.biller, ref: form.ref });
    setForm((f) => ({ ...f, ref: '', amount: '' }));
    onPaid();
  };

  if (done) {
    return (
      <div className="bk-center">
        <div className="bk-success-mark"><CheckCircle2 size={34} /></div>
        <h2>Payment successful</h2>
        <p className="bk-muted" style={{ margin: '6px 0 14px' }}>{formatCurrency(done.amount)} to {done.biller} · {done.ref}</p>
        <p className="bk-subtle" style={{ marginBottom: 16 }}>Reference <span className="bk-mono">{done.reference}</span></p>
        <button type="button" className="bk-btn" onClick={() => setDone(null)}>Pay another bill</button>
      </div>
    );
  }

  return (
    <form className="bk-form" onSubmit={submit} noValidate>
      <div className="bk-grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
        {BILL_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={typeId === t.id}
              onClick={() => chooseType(t)}
              className={`bk-chip${typeId === t.id ? ' active' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: '12px' }}
            >
              <Icon size={20} /> {t.id}
            </button>
          );
        })}
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="bk-row-2">
        <div className="bk-field">
          <label htmlFor="qp-biller">Provider</label>
          <select id="qp-biller" value={form.biller} onChange={(e) => setForm({ ...form, biller: e.target.value })}>
            {type.billers.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="bk-field">
          <label htmlFor="qp-ref">{type.refLabel}</label>
          <input id="qp-ref" autoComplete="off" value={form.ref} placeholder={type.refHint} onChange={(e) => { setForm({ ...form, ref: e.target.value }); setError(''); }} />
        </div>
      </div>
      <div className="bk-field">
        <label htmlFor="qp-amt">Amount</label>
        <AmountInput id="qp-amt" value={form.amount} onChange={(v) => { setForm({ ...form, amount: v }); setError(''); }} />
        <div className="bk-presets">
          {type.presets.map((p) => <button type="button" key={p} onClick={() => setForm({ ...form, amount: String(p) })}>₦{p.toLocaleString()}</button>)}
        </div>
      </div>
      <div className="bk-field">
        <label htmlFor="qp-acc">Pay from</label>
        <select id="qp-acc" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.type} · {a.number} — {formatCurrency(a.balance)}</option>)}
        </select>
      </div>
      <button type="submit" className="bk-btn block" disabled={busy}>{busy ? <span className="bk-spinner" /> : 'Pay now'}</button>
    </form>
  );
}

function AddPayeeModal({ userId, onClose, onDone }) {
  const [form, setForm] = useState({ payee: '', category: 'Electricity', ref: '', amount: '' });
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const res = await billService.addPayee(userId, { payee: form.payee, category: form.category, customerRef: form.ref, amount: nairaToKobo(form.amount) });
    if (!res.ok) return setError(res.error);
    onDone(res.bill);
  };
  return (
    <Modal title="Add payee" onClose={onClose}>
      <form className="bk-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="bk-field"><label htmlFor="ap-name">Payee name</label><input id="ap-name" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} placeholder="e.g. Landlord, IKEDC Home" /></div>
        <div className="bk-row-2">
          <div className="bk-field">
            <label htmlFor="ap-cat">Category</label>
            <select id="ap-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {[...BILL_TYPES.map((t) => t.id), 'Subscriptions', 'Utilities', 'Rent', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="bk-field"><label htmlFor="ap-ref">Customer ref (optional)</label><input id="ap-ref" value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} /></div>
        </div>
        <div className="bk-field"><label htmlFor="ap-amt">Usual amount</label><AmountInput id="ap-amt" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} /></div>
        <div className="bk-modal-foot">
          <button type="button" className="bk-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="bk-btn">Save payee</button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleModal({ bill, userId, onClose, onDone }) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [date, setDate] = useState(tomorrow);
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const res = await billService.scheduleBill(userId, bill.id, date, recurring ? 'monthly' : null);
    if (!res.ok) return setError(res.error);
    onDone(res.scheduledDate, recurring);
  };
  return (
    <Modal title={`Schedule ${bill.payee}`} onClose={onClose}>
      <form className="bk-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <p className="bk-muted">{formatCurrency(bill.amount)} will be paid from your Checking account at 09:00 on the chosen date.</p>
        <div className="bk-field"><label htmlFor="sc-date">Payment date</label><input id="sc-date" type="date" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <label className="bk-check"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Repeat every month (standing order)</label>
        <div className="bk-modal-foot">
          <button type="button" className="bk-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="bk-btn">Schedule</button>
        </div>
      </form>
    </Modal>
  );
}

export default function BillsPage() {
  const { user } = useAuth();
  const { accounts, primaryAccount, bills, refresh } = useData();
  const { toast } = useToast();
  const [tab, setTab] = useState('pay');
  const [adding, setAdding] = useState(false);
  const [scheduling, setScheduling] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [confirmPay, setConfirmPay] = useState(null);

  const scheduled = useMemo(() => bills.filter((b) => b.scheduledDate).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)), [bills]);

  const payNow = async (bill) => {
    setPayingId(bill.id);
    const res = await billService.payBill(user.id, bill.id, primaryAccount.id);
    setPayingId(null);
    setConfirmPay(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${formatCurrency(bill.amount)} paid to ${bill.payee}.`);
    refresh();
  };

  const remove = async (bill) => {
    await billService.deletePayee(user.id, bill.id);
    toast.info(`${bill.payee} removed.`);
    refresh();
  };

  const cancel = async (bill) => {
    await billService.cancelSchedule(user.id, bill.id);
    toast.info(`Scheduled payment to ${bill.payee} cancelled.`);
    refresh();
  };

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>Bills & airtime</h1>
          <p>Pay instantly, save payees and set up standing orders.</p>
        </div>
        <button type="button" className="bk-btn" onClick={() => setAdding(true)}><Plus size={16} /> Add payee</button>
      </div>

      <div className="bk-tabs" role="tablist">
        {[['pay', 'Pay a bill'], ['payees', `Saved payees (${bills.length})`], ['scheduled', `Scheduled (${scheduled.length})`]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'pay' && (
        <section className="bk-card" style={{ maxWidth: 640 }}>
          <QuickPay accounts={accounts} primaryAccount={primaryAccount} userId={user.id} onPaid={refresh} />
        </section>
      )}

      {tab === 'payees' && (
        <section className="bk-card">
          {bills.length === 0 ? (
            <Empty icon={Receipt}>No saved payees yet. Add one to pay it in a tap or schedule it.</Empty>
          ) : (
            <div className="bk-list">
              {bills.map((b) => (
                <div key={b.id} className="bk-item" style={{ flexWrap: 'wrap' }}>
                  <span className="bk-tx-icon"><Receipt size={18} /></span>
                  <div className="bk-item-main">
                    <div className="bk-item-title">{b.payee}</div>
                    <div className="bk-item-sub">
                      {b.category}{b.customerRef ? ` · ${b.customerRef}` : ''} · {b.lastPaid ? `Last paid ${new Date(b.lastPaid).toLocaleDateString()}` : 'Never paid'}
                    </div>
                  </div>
                  <Money kobo={b.amount} className="bk-amt" />
                  <div className="bk-actions">
                    <button type="button" className="bk-btn sm" disabled={payingId === b.id} onClick={() => setConfirmPay(b)}>Pay</button>
                    <button type="button" className="bk-btn sm ghost" onClick={() => setScheduling(b)}><CalendarClock size={14} /> Schedule</button>
                    <button type="button" className="bk-btn sm danger ghost" aria-label={`Delete ${b.payee}`} onClick={() => remove(b)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'scheduled' && (
        <section className="bk-card">
          {scheduled.length === 0 ? (
            <Empty icon={CalendarClock}>Nothing scheduled. Schedule a saved payee to pay it automatically.</Empty>
          ) : (
            <div className="bk-list">
              {scheduled.map((b) => (
                <div key={b.id} className="bk-item">
                  <span className="bk-tx-icon">{b.recurring ? <Repeat size={18} /> : <CalendarClock size={18} />}</span>
                  <div className="bk-item-main">
                    <div className="bk-item-title">{b.payee}</div>
                    <div className="bk-item-sub">
                      {new Date(b.scheduledDate).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {b.recurring ? ' · Repeats monthly' : ' · One-off'}
                    </div>
                  </div>
                  <Money kobo={b.amount} className="bk-amt" />
                  <button type="button" className="bk-btn sm ghost" onClick={() => cancel(b)}>Cancel</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {adding && (
        <AddPayeeModal userId={user.id} onClose={() => setAdding(false)} onDone={(bill) => { setAdding(false); toast.success(`${bill.payee} saved.`); refresh(); setTab('payees'); }} />
      )}
      {scheduling && (
        <ScheduleModal
          bill={scheduling}
          userId={user.id}
          onClose={() => setScheduling(null)}
          onDone={(when, rec) => {
            toast.success(`${scheduling.payee} scheduled for ${new Date(when).toLocaleDateString()}${rec ? ', monthly' : ''}.`);
            setScheduling(null);
            refresh();
          }}
        />
      )}
      {confirmPay && (
        <Modal title="Confirm payment" onClose={() => setConfirmPay(null)}>
          <dl className="bk-summary">
            <div><dt>Payee</dt><dd>{confirmPay.payee}</dd></div>
            <div><dt>Amount</dt><dd>{formatCurrency(confirmPay.amount)}</dd></div>
            <div><dt>From</dt><dd>{primaryAccount?.type} · {primaryAccount?.number}</dd></div>
          </dl>
          <div className="bk-modal-foot">
            <button type="button" className="bk-btn ghost" onClick={() => setConfirmPay(null)}>Cancel</button>
            <button type="button" className="bk-btn" disabled={payingId === confirmPay.id} onClick={() => payNow(confirmPay)}>
              {payingId === confirmPay.id ? <span className="bk-spinner" /> : 'Pay now'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
