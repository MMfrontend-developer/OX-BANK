import React, { useState } from 'react';
import { Plus, PiggyBank, ArrowDownToLine, ArrowUpFromLine, Trash2, CalendarDays } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { savingsService } from '../services/savingsService';
import { formatCurrency, nairaToKobo } from '../utils/currency';
import { Alert, AmountInput, Modal, Money, Empty } from '../components/ui';

const ICONS = ['🎯', '🛟', '💻', '🏠', '🚗', '✈️', '🎓', '💍', '👶', '📱', '🏖️', '🎁'];

function monthsUntil(iso) {
  const now = new Date();
  const d = new Date(iso);
  return Math.max(0, (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()));
}

function NewGoalModal({ userId, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', target: '', deadline: '', icon: '🎯' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await savingsService.create(userId, {
      name: form.name, targetKobo: nairaToKobo(form.target), deadline: form.deadline || null, icon: form.icon,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone(res.goal);
  };

  return (
    <Modal title="New savings goal" onClose={onClose}>
      <form className="bk-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="bk-field">
          <span className="bk-label">Icon</span>
          <div className="bk-emoji-pick" role="radiogroup" aria-label="Goal icon">
            {ICONS.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={form.icon === i} className={form.icon === i ? 'active' : ''} onClick={() => setForm({ ...form, icon: i })}>{i}</button>
            ))}
          </div>
        </div>
        <div className="bk-field">
          <label htmlFor="g-name">Goal name</label>
          <input id="g-name" maxLength={40} placeholder="e.g. Rent, Holiday, New phone" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }} />
        </div>
        <div className="bk-row-2">
          <div className="bk-field">
            <label htmlFor="g-target">Target amount</label>
            <AmountInput id="g-target" value={form.target} onChange={(v) => { setForm({ ...form, target: v }); setError(''); }} />
          </div>
          <div className="bk-field">
            <label htmlFor="g-date">Target date (optional)</label>
            <input id="g-date" type="date" min={minDate} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
        <div className="bk-modal-foot">
          <button type="button" className="bk-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="bk-btn" disabled={busy}>{busy ? <span className="bk-spinner" /> : 'Create goal'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MoveModal({ goal, mode, accounts, userId, onClose, onDone }) {
  const [accountId, setAccountId] = useState(accounts.find((a) => a.type === 'Savings')?.id || accounts[0]?.id);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdd = mode === 'add';
  const account = accounts.find((a) => a.id === accountId);
  const remainingToTarget = Math.max(0, goal.targetKobo - goal.savedKobo);

  const submit = async (e) => {
    e.preventDefault();
    const kobo = nairaToKobo(amount);
    if (!kobo) return setError('Enter an amount.');
    setBusy(true);
    const res = isAdd
      ? await savingsService.fund(userId, goal.id, accountId, kobo)
      : await savingsService.withdraw(userId, goal.id, accountId, kobo);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone(kobo);
  };

  return (
    <Modal title={`${isAdd ? 'Add to' : 'Withdraw from'} ${goal.name}`} onClose={onClose}>
      <form className="bk-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="bk-field">
          <label htmlFor="mv-acc">{isAdd ? 'From' : 'To'} account</label>
          <select id="mv-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.type} · {a.number} — {formatCurrency(a.balance)}</option>)}
          </select>
        </div>
        <div className="bk-field">
          <label htmlFor="mv-amt">Amount</label>
          <AmountInput id="mv-amt" value={amount} onChange={(v) => { setAmount(v); setError(''); }} autoFocus />
          <div className="bk-presets">
            {isAdd ? (
              <>
                {[1000, 5000, 20000].map((n) => <button key={n} type="button" onClick={() => setAmount(String(n))}>₦{n.toLocaleString()}</button>)}
                {remainingToTarget > 0 && remainingToTarget <= (account?.balance || 0) && (
                  <button type="button" onClick={() => setAmount(String(remainingToTarget / 100))}>Complete goal</button>
                )}
              </>
            ) : (
              <button type="button" onClick={() => setAmount(String(goal.savedKobo / 100))}>All ({formatCurrency(goal.savedKobo)})</button>
            )}
          </div>
          <span className="bk-hint">{isAdd ? <>Available: <Money kobo={account?.balance || 0} /></> : <>In this goal: <Money kobo={goal.savedKobo} /></>}</span>
        </div>
        <div className="bk-modal-foot">
          <button type="button" className="bk-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="bk-btn" disabled={busy}>{busy ? <span className="bk-spinner" /> : isAdd ? 'Add money' : 'Withdraw'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function SavingsPage() {
  const { user } = useAuth();
  const { goals, accounts, totalSaved, refresh } = useData();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState(null); // { goal, mode }
  const [closing, setClosing] = useState(null);

  const totalTarget = goals.reduce((s, g) => s + g.targetKobo, 0);

  const closeGoal = async () => {
    const dest = accounts.find((a) => a.type === 'Savings') || accounts[0];
    const res = await savingsService.close(user.id, closing.id, dest.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.returnedKobo ? `${closing.name} closed. ${formatCurrency(res.returnedKobo)} returned to ${dest.type}.` : `${closing.name} closed.`);
    setClosing(null);
    refresh();
  };

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>Savings goals</h1>
          <p>Set money aside for the things that matter. Withdraw any time.</p>
        </div>
        <button type="button" className="bk-btn" onClick={() => setCreating(true)}><Plus size={16} /> New goal</button>
      </div>

      <div className="bk-grid-3">
        <div className="bk-card bk-stat"><span className="bk-stat-label"><PiggyBank size={14} /> Total saved</span><span className="bk-stat-value"><Money kobo={totalSaved} /></span></div>
        <div className="bk-card bk-stat"><span className="bk-stat-label">Combined targets</span><span className="bk-stat-value"><Money kobo={totalTarget} /></span></div>
        <div className="bk-card bk-stat"><span className="bk-stat-label">Active goals</span><span className="bk-stat-value">{goals.length}</span></div>
      </div>

      {goals.length === 0 ? (
        <section className="bk-card bk-center">
          <Empty icon={PiggyBank}>You have no savings goals yet. Create one to start putting money aside.</Empty>
          <button type="button" className="bk-btn" onClick={() => setCreating(true)}><Plus size={16} /> Create your first goal</button>
        </section>
      ) : (
        <div className="bk-grid-2">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.savedKobo / g.targetKobo) * 100));
            const done = g.savedKobo >= g.targetKobo;
            const left = Math.max(0, g.targetKobo - g.savedKobo);
            const months = g.deadline ? monthsUntil(g.deadline) : null;
            const perMonth = months ? Math.ceil(left / months) : null;
            return (
              <section key={g.id} className="bk-card bk-goal" aria-label={g.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="bk-goal-icon" aria-hidden="true">{g.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: '1.02rem' }}>{g.name}</h2>
                    <span className="bk-subtle">
                      {g.deadline ? <><CalendarDays size={12} style={{ verticalAlign: '-1px' }} /> by {new Date(g.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</> : 'No deadline'}
                    </span>
                  </div>
                  {done ? <span className="bk-badge good">Reached</span> : <span className="bk-badge primary">{pct}%</span>}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span className="bk-stat-value" style={{ fontSize: '1.25rem' }}><Money kobo={g.savedKobo} /></span>
                    <span className="bk-subtle">of <Money kobo={g.targetKobo} /></span>
                  </div>
                  <div className={`bk-progress${done ? ' good' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name} progress`}>
                    <div style={{ width: `${pct}%` }} />
                  </div>
                  {!done && (
                    <p className="bk-subtle" style={{ marginTop: 8 }}>
                      <Money kobo={left} /> to go{perMonth ? <> · about <Money kobo={perMonth} />/month to hit your date</> : months === 0 && g.deadline ? ' · deadline is this month' : ''}
                    </p>
                  )}
                </div>
                <div className="bk-actions">
                  <button type="button" className="bk-btn sm" onClick={() => setMoving({ goal: g, mode: 'add' })}><ArrowDownToLine size={14} /> Add</button>
                  <button type="button" className="bk-btn sm ghost" disabled={!g.savedKobo} onClick={() => setMoving({ goal: g, mode: 'withdraw' })}><ArrowUpFromLine size={14} /> Withdraw</button>
                  <button type="button" className="bk-btn sm danger ghost" aria-label={`Close ${g.name}`} onClick={() => setClosing(g)} style={{ marginLeft: 'auto' }}><Trash2 size={14} /></button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {creating && (
        <NewGoalModal userId={user.id} onClose={() => setCreating(false)} onDone={(goal) => { setCreating(false); toast.success(`${goal.icon} ${goal.name} created.`); refresh(); }} />
      )}
      {moving && (
        <MoveModal
          goal={moving.goal}
          mode={moving.mode}
          accounts={accounts}
          userId={user.id}
          onClose={() => setMoving(null)}
          onDone={(kobo) => {
            toast.success(`${formatCurrency(kobo)} ${moving.mode === 'add' ? 'added to' : 'withdrawn from'} ${moving.goal.name}.`);
            setMoving(null);
            refresh();
          }}
        />
      )}
      {closing && (
        <Modal title={`Close ${closing.name}?`} onClose={() => setClosing(null)}>
          <p className="bk-muted">
            {closing.savedKobo > 0
              ? `${formatCurrency(closing.savedKobo)} will be returned to your Savings account and the goal deleted.`
              : 'This goal is empty and will be deleted.'}
          </p>
          <div className="bk-modal-foot">
            <button type="button" className="bk-btn ghost" onClick={() => setClosing(null)}>Keep goal</button>
            <button type="button" className="bk-btn danger" onClick={closeGoal}>Close goal</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
