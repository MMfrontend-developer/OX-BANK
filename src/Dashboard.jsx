import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Send, Plus, Receipt, PiggyBank, CreditCard, FileText, Copy, Check, ChevronRight,
  ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, CalendarClock, History, OctagonAlert, TriangleAlert,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useData } from './context/DataContext';
import { useToast } from './context/ToastContext';
import { transferService } from './services/transferService';
import { formatCurrency, nairaToKobo } from './utils/currency';
import { summarizeMonth, percentChange, budgetProgress, greeting } from './utils/insights';
import { Money, Modal, AmountInput, Alert, TxRow, Empty } from './components/ui';
import TxDetailModal from './components/TxDetailModal';
import BalanceTrend from './components/BalanceTrend';

function CopyNumber({ number }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="bk-account-num">
      {number}
      <button
        type="button"
        className="bk-copy"
        aria-label={`Copy account number ${number}`}
        onClick={() => navigator.clipboard?.writeText(number).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </span>
  );
}

function AddMoneyModal({ accounts, userId, onClose, onDone }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const kobo = nairaToKobo(amount);
    if (!kobo) return setError('Enter an amount.');
    setBusy(true);
    const res = await transferService.deposit(accountId, kobo, 'Top-up from linked debit card', userId);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(`${formatCurrency(kobo)} added to your account.`);
    onDone();
    onClose();
  };

  return (
    <Modal title="Add money" onClose={onClose}>
      <form className="bk-form" onSubmit={submit}>
        <Alert kind="info">Simulated top-up from a linked debit card. No real card is charged.</Alert>
        {error && <Alert>{error}</Alert>}
        <div className="bk-field">
          <label htmlFor="am-acc">To account</label>
          <select id="am-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.type} · {a.number}</option>)}
          </select>
        </div>
        <div className="bk-field">
          <label htmlFor="am-amt">Amount</label>
          <AmountInput id="am-amt" value={amount} onChange={(v) => { setAmount(v); setError(''); }} autoFocus />
          <div className="bk-presets">
            {[5000, 10000, 50000, 100000].map((n) => (
              <button type="button" key={n} onClick={() => setAmount(String(n))}>₦{n.toLocaleString()}</button>
            ))}
          </div>
        </div>
        <div className="bk-modal-foot">
          <button type="button" className="bk-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="bk-btn" disabled={busy}>{busy ? <span className="bk-spinner" /> : 'Add money'}</button>
        </div>
      </form>
    </Modal>
  );
}

const Dashboard = () => {
  const { user } = useAuth();
  const { accounts, transactions, goals, budgets, bills, totalBalance, totalSaved, netWorth, ledgerValid, refresh } = useData();
  const navigate = useNavigate();
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const thisMonth = useMemo(() => summarizeMonth(transactions, 0), [transactions]);
  const lastMonth = useMemo(() => summarizeMonth(transactions, -1), [transactions]);
  const spendDelta = percentChange(thisMonth.spending, lastMonth.spending);
  const budgetRows = useMemo(() => budgetProgress(budgets, transactions).slice(0, 3), [budgets, transactions]);
  const upcoming = useMemo(
    () => bills.filter((b) => b.scheduledDate).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).slice(0, 3),
    [bills],
  );
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>{greeting()}, {firstName}</h1>
          <p>Here's where your money stands today.</p>
        </div>
        <span className={`bk-badge ${ledgerValid ? 'good' : 'critical'}`} title="Every balance is checked against its ledger history">
          {ledgerValid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          {ledgerValid ? 'Ledger verified' : 'Ledger mismatch — contact support'}
        </span>
      </div>

      {/* Balance hero */}
      <section className="bk-hero" aria-label="Balance summary">
        <div className="bk-hero-label">Total balance</div>
        <div className="bk-hero-amount"><Money kobo={netWorth} /></div>
        <div className="bk-hero-sub">
          <Money kobo={totalBalance} /> in accounts · <Money kobo={totalSaved} /> in savings goals
        </div>
        <div className="bk-quick">
          <Link to="/transfers"><Send size={20} />Send</Link>
          <button type="button" onClick={() => setShowAddMoney(true)}><Plus size={20} />Add money</button>
          <Link to="/bills"><Receipt size={20} />Pay bills</Link>
          <Link to="/savings"><PiggyBank size={20} />Save</Link>
          <Link to="/cards"><CreditCard size={20} />Cards</Link>
          <Link to="/transactions?statement=1"><FileText size={20} />Statement</Link>
        </div>
      </section>

      {/* Accounts */}
      <div className="bk-grid-2">
        {accounts.map((a) => (
          <div key={a.id} className="bk-account">
            <div className="bk-account-top">
              <strong>{a.type} account</strong>
              <span className="bk-badge">{a.currency}</span>
            </div>
            <div className="bk-stat-value"><Money kobo={a.balance} /></div>
            <CopyNumber number={a.number} />
          </div>
        ))}
      </div>

      <div className="bk-grid">
        <div className="bk-stack">
          {/* This month */}
          <section className="bk-card" aria-labelledby="month-h">
            <div className="bk-card-head">
              <h2 id="month-h">{new Date().toLocaleDateString(undefined, { month: 'long' })} so far</h2>
              <Link to="/budgets" className="bk-link">Insights <ChevronRight size={14} /></Link>
            </div>
            <div className="bk-grid-3">
              <div className="bk-stat">
                <span className="bk-stat-label"><TrendingUp size={14} /> Money in</span>
                <span className="bk-stat-value"><Money kobo={thisMonth.income} /></span>
              </div>
              <div className="bk-stat">
                <span className="bk-stat-label"><TrendingDown size={14} /> Spent</span>
                <span className="bk-stat-value"><Money kobo={thisMonth.spending} /></span>
                <span className="bk-stat-delta">
                  {spendDelta === null ? 'No data for last month' : `${spendDelta > 0 ? '▲' : '▼'} ${Math.abs(spendDelta)}% vs all of last month`}
                </span>
              </div>
              <div className="bk-stat">
                <span className="bk-stat-label">Net</span>
                <span className="bk-stat-value"><Money kobo={thisMonth.net} /></span>
              </div>
            </div>
          </section>

          <section className="bk-card" aria-labelledby="trend-h">
            <div className="bk-card-head">
              <h2 id="trend-h">Balance, last 30 days</h2>
              <span className="bk-subtle">All accounts</span>
            </div>
            <BalanceTrend transactions={transactions} currentBalance={totalBalance} />
          </section>

          <section className="bk-card" aria-labelledby="recent-h">
            <div className="bk-card-head">
              <h2 id="recent-h">Recent activity</h2>
              <Link to="/transactions" className="bk-link">See all <ChevronRight size={14} /></Link>
            </div>
            <div className="bk-list">
              {transactions.length === 0 ? (
                <Empty icon={History}>No transactions yet.</Empty>
              ) : (
                transactions.slice(0, 6).map((tx) => <TxRow key={tx.id} tx={tx} onClick={setSelectedTx} showDate />)
              )}
            </div>
          </section>
        </div>

        <div className="bk-stack">
          <section className="bk-card" aria-labelledby="budgets-h">
            <div className="bk-card-head">
              <h2 id="budgets-h">Budgets</h2>
              <Link to="/budgets" className="bk-link">Manage <ChevronRight size={14} /></Link>
            </div>
            {budgetRows.length === 0 ? (
              <Empty icon={TrendingDown}>Set monthly budgets to keep spending on track.</Empty>
            ) : (
              <div className="bk-stack" style={{ gap: 14 }}>
                {budgetRows.map((b) => (
                  <div key={b.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.87rem', marginBottom: 6 }}>
                      <span>
                        {b.category}
                        {b.status !== 'good' && (
                          <span className={`bk-badge ${b.status}`} style={{ marginLeft: 6 }}>
                            {b.status === 'critical' ? <><OctagonAlert size={11} /> Over</> : <><TriangleAlert size={11} /> Near limit</>}
                          </span>
                        )}
                      </span>
                      <span className="bk-mono bk-muted" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}><Money kobo={b.spentKobo} /> / <Money kobo={b.limitKobo} /></span>
                    </div>
                    <div className={`bk-progress ${b.status}`} role="progressbar" aria-valuenow={Math.round(b.ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.category} budget used`}>
                      <div style={{ width: `${Math.min(100, b.ratio * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bk-card" aria-labelledby="goals-h">
            <div className="bk-card-head">
              <h2 id="goals-h">Savings goals</h2>
              <Link to="/savings" className="bk-link">View <ChevronRight size={14} /></Link>
            </div>
            {goals.length === 0 ? (
              <div className="bk-center">
                <Empty icon={PiggyBank}>Start a goal and watch it grow.</Empty>
                <button type="button" className="bk-btn sm" onClick={() => navigate('/savings')}><Plus size={14} /> New goal</button>
              </div>
            ) : (
              <div className="bk-list">
                {goals.slice(0, 3).map((g) => {
                  const pct = Math.min(100, Math.round((g.savedKobo / g.targetKobo) * 100));
                  return (
                    <div key={g.id} className="bk-item" style={{ flexWrap: 'wrap' }}>
                      <span className="bk-goal-icon" aria-hidden="true">{g.icon}</span>
                      <div className="bk-item-main">
                        <div className="bk-item-title">{g.name}</div>
                        <div className="bk-item-sub"><Money kobo={g.savedKobo} /> of <Money kobo={g.targetKobo} /> · {pct}%</div>
                        <div className="bk-progress" style={{ marginTop: 6 }}><div style={{ width: `${pct}%` }} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bk-card" aria-labelledby="upcoming-h">
            <div className="bk-card-head">
              <h2 id="upcoming-h">Upcoming payments</h2>
              <Link to="/bills" className="bk-link">Bills <ChevronRight size={14} /></Link>
            </div>
            {upcoming.length === 0 ? (
              <Empty icon={CalendarClock}>No scheduled payments.</Empty>
            ) : (
              <div className="bk-list">
                {upcoming.map((b) => (
                  <div key={b.id} className="bk-item">
                    <span className="bk-tx-icon"><CalendarClock size={18} /></span>
                    <div className="bk-item-main">
                      <div className="bk-item-title">{b.payee}</div>
                      <div className="bk-item-sub">
                        {new Date(b.scheduledDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        {b.recurring ? ' · Monthly' : ''}
                      </div>
                    </div>
                    <Money kobo={b.amount} className="bk-amt" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showAddMoney && <AddMoneyModal accounts={accounts} userId={user.id} onClose={() => setShowAddMoney(false)} onDone={refresh} />}
      {selectedTx && <TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  );
};

export default Dashboard;
