import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, PieChart, CircleCheck, TriangleAlert, OctagonAlert, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { budgetService } from '../services/budgetService';
import { formatCurrency, nairaToKobo } from '../utils/currency';
import { summarizeMonth, budgetProgress, percentChange, BUDGET_CATEGORIES } from '../utils/insights';
import { Alert, AmountInput, Modal, Money, Empty, usePrivacy } from '../components/ui';

const STATUS = {
  good: { icon: CircleCheck, label: 'On track' },
  warning: { icon: TriangleAlert, label: 'Near limit' },
  critical: { icon: OctagonAlert, label: 'Over budget' },
};

function BudgetModal({ userId, existing, budgets, onClose, onDone }) {
  const available = BUDGET_CATEGORIES.filter((c) => existing?.category === c || !(c in budgets));
  const [category, setCategory] = useState(existing?.category || available[0] || '');
  const [amount, setAmount] = useState(existing ? String(existing.limitKobo / 100) : '');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const res = await budgetService.set(userId, category, nairaToKobo(amount));
    if (!res.ok) return setError(res.error);
    onDone(category);
  };

  return (
    <Modal title={existing ? `Edit ${existing.category} budget` : 'New budget'} onClose={onClose}>
      <form className="bk-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="bk-field">
          <label htmlFor="bd-cat">Category</label>
          <select id="bd-cat" value={category} disabled={Boolean(existing)} onChange={(e) => setCategory(e.target.value)}>
            {available.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="bk-field">
          <label htmlFor="bd-amt">Monthly limit</label>
          <AmountInput id="bd-amt" value={amount} onChange={(v) => { setAmount(v); setError(''); }} autoFocus />
          <span className="bk-hint">We'll flag this budget at 80% and when you go over.</span>
        </div>
        <div className="bk-modal-foot">
          <button type="button" className="bk-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="bk-btn">Save budget</button>
        </div>
      </form>
    </Modal>
  );
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const { transactions, budgets, refresh } = useData();
  const { toast } = useToast();
  const { hidden } = usePrivacy();
  const [editing, setEditing] = useState(null); // {} for new, row for edit

  const now = new Date();
  const thisMonth = useMemo(() => summarizeMonth(transactions, 0), [transactions]);
  const lastMonth = useMemo(() => summarizeMonth(transactions, -1), [transactions]);
  const rows = useMemo(() => budgetProgress(budgets, transactions), [budgets, transactions]);

  const categories = Object.entries(thisMonth.byCategory).sort((a, b) => b[1] - a[1]);
  const top = categories.slice(0, 7);
  const otherTotal = categories.slice(7).reduce((s, [, v]) => s + v, 0);
  const bars = otherTotal ? [...top, ['Other', otherTotal]] : top;
  const maxBar = Math.max(1, ...bars.map(([, v]) => v));

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const projected = Math.round((thisMonth.spending / dayOfMonth) * daysInMonth);
  const savingsRate = thisMonth.income ? Math.round((thisMonth.net / thisMonth.income) * 100) : null;
  const spendChange = percentChange(thisMonth.spending, lastMonth.spending);

  const budgeted = rows.reduce((s, r) => s + r.limitKobo, 0);
  const spentInBudgets = rows.reduce((s, r) => s + r.spentKobo, 0);
  const unbudgeted = thisMonth.spending - spentInBudgets;

  const remove = async (category) => {
    await budgetService.remove(user.id, category);
    toast.info(`${category} budget removed.`);
    refresh();
  };

  const monthName = now.toLocaleDateString(undefined, { month: 'long' });

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>Budgets & insights</h1>
          <p>{monthName}: day {dayOfMonth} of {daysInMonth}. Savings goals and moves between your own accounts don't count as spending.</p>
        </div>
        <button type="button" className="bk-btn" onClick={() => setEditing({})} disabled={Object.keys(budgets).length >= BUDGET_CATEGORIES.length}>
          <Plus size={16} /> New budget
        </button>
      </div>

      <div className="bk-grid-4">
        <div className="bk-card bk-stat">
          <span className="bk-stat-label">Spent this month</span>
          <span className="bk-stat-value"><Money kobo={thisMonth.spending} /></span>
          <span className="bk-stat-delta">
            {spendChange === null ? '—' : <>{spendChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(spendChange)}% vs last month's total</>}
          </span>
        </div>
        <div className="bk-card bk-stat">
          <span className="bk-stat-label">Projected month-end</span>
          <span className="bk-stat-value"><Money kobo={projected} /></span>
          <span className="bk-stat-delta">At your current daily pace</span>
        </div>
        <div className="bk-card bk-stat">
          <span className="bk-stat-label">Income this month</span>
          <span className="bk-stat-value"><Money kobo={thisMonth.income} /></span>
          <span className="bk-stat-delta">Last month: <Money kobo={lastMonth.income} /></span>
        </div>
        <div className="bk-card bk-stat">
          <span className="bk-stat-label">Savings rate</span>
          <span className="bk-stat-value">{savingsRate === null ? '—' : `${savingsRate}%`}</span>
          <span className="bk-stat-delta">Share of income not spent</span>
        </div>
      </div>

      <div className="bk-grid">
        <section className="bk-card" aria-labelledby="bud-h">
          <div className="bk-card-head">
            <h2 id="bud-h">Monthly budgets</h2>
            {rows.length > 0 && <span className="bk-subtle"><Money kobo={spentInBudgets} /> of <Money kobo={budgeted} /></span>}
          </div>
          {rows.length === 0 ? (
            <div className="bk-center">
              <Empty icon={PieChart}>No budgets yet. Set a monthly limit for a category to track it here.</Empty>
              <button type="button" className="bk-btn" onClick={() => setEditing({})}><Plus size={16} /> Create a budget</button>
            </div>
          ) : (
            <div className="bk-list">
              {rows.map((r) => {
                const S = STATUS[r.status];
                return (
                  <div key={r.category} className="bk-item" style={{ display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <strong style={{ flex: 1 }}>{r.category}</strong>
                      <span className={`bk-badge ${r.status}`}><S.icon size={12} /> {S.label}</span>
                      <button type="button" className="bk-copy" aria-label={`Edit ${r.category} budget`} onClick={() => setEditing(r)}><Pencil size={15} /></button>
                      <button type="button" className="bk-copy" aria-label={`Delete ${r.category} budget`} onClick={() => remove(r.category)}><Trash2 size={15} /></button>
                    </div>
                    <div className={`bk-progress ${r.status}`} role="progressbar" aria-valuenow={Math.round(r.ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.category}: ${Math.round(r.ratio * 100)}% of budget used`}>
                      <div style={{ width: `${Math.min(100, r.ratio * 100)}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.8rem' }} className="bk-muted">
                      <span><Money kobo={r.spentKobo} /> spent · {Math.round(r.ratio * 100)}%</span>
                      <span>
                        {r.remainingKobo >= 0 ? <><Money kobo={r.remainingKobo} /> left</> : <><Money kobo={-r.remainingKobo} /> over</>}
                        {' '}of <Money kobo={r.limitKobo} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {rows.length > 0 && unbudgeted > 0 && (
            <p className="bk-subtle" style={{ marginTop: 12 }}><Money kobo={unbudgeted} /> spent this month in categories without a budget.</p>
          )}
        </section>

        <section className="bk-card" aria-labelledby="cat-h">
          <div className="bk-card-head">
            <h2 id="cat-h">Where your money went</h2>
            <span className="bk-subtle">{monthName}</span>
          </div>
          {bars.length === 0 ? (
            <Empty icon={PieChart}>No spending yet this month.</Empty>
          ) : (
            <>
              <div className="bk-bars" role="list" aria-label={`Spending by category in ${monthName}`}>
                {bars.map(([cat, v]) => {
                  const share = Math.round((v / thisMonth.spending) * 100);
                  return (
                    <div key={cat} className="bk-bar-row" role="listitem" title={`${cat}: ${hidden ? 'hidden' : formatCurrency(v)} (${share}% of spending)`}>
                      <span className="bk-bar-label">{cat}</span>
                      <div className="bk-bar-track" aria-hidden="true"><div className="bk-bar-fill" style={{ width: `${(v / maxBar) * 100}%` }} /></div>
                      <span className="bk-bar-value"><Money kobo={v} /> <span className="bk-subtle">{share}%</span></span>
                    </div>
                  );
                })}
              </div>
              <details style={{ marginTop: 14 }}>
                <summary className="bk-subtle" style={{ cursor: 'pointer' }}>Compare with last month (table)</summary>
                <div className="bk-table-wrap" style={{ marginTop: 8 }}>
                  <table className="bk-table">
                    <thead><tr><th>Category</th><th className="num">This month</th><th className="num">Last month</th></tr></thead>
                    <tbody>
                      {[...new Set([...Object.keys(thisMonth.byCategory), ...Object.keys(lastMonth.byCategory)])].sort().map((c) => (
                        <tr key={c}>
                          <td>{c}</td>
                          <td className="num"><Money kobo={thisMonth.byCategory[c] || 0} /></td>
                          <td className="num"><Money kobo={lastMonth.byCategory[c] || 0} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </section>
      </div>

      {editing && (
        <BudgetModal
          userId={user.id}
          existing={editing.category ? editing : null}
          budgets={budgets}
          onClose={() => setEditing(null)}
          onDone={(cat) => { toast.success(`${cat} budget saved.`); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}
