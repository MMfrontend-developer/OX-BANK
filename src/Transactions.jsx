import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, FileText, History, SlidersHorizontal } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useData } from './context/DataContext';
import { useToast } from './context/ToastContext';
import { koboToNaira } from './utils/currency';
import { groupByDay, isIncome, isSpending } from './utils/insights';
import { downloadCSV, printStatement } from './utils/documents';
import { Money, TxRow, Empty, Modal } from './components/ui';
import TxDetailModal from './components/TxDetailModal';

const PERIODS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'all', label: 'All time' },
];
const PAGE = 40;

function StatementModal({ accounts, user, onClose }) {
  const { toast } = useToast();
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1));
  const [accountId, setAccountId] = useState(accounts[0]?.id);
  const [month, setMonth] = useState('0');
  const { transactions } = useData();

  const generate = () => {
    const account = accounts.find((a) => a.id === accountId);
    const start = months[Number(month)];
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const ok = printStatement({
      user,
      account,
      entries: transactions.filter((t) => t.accountId === accountId),
      from: start,
      to: end > now ? now : end,
    });
    if (!ok) toast.error('Allow pop-ups to open your statement.');
    else onClose();
  };

  return (
    <Modal title="Account statement" onClose={onClose}>
      <div className="bk-form">
        <div className="bk-field">
          <label htmlFor="st-acc">Account</label>
          <select id="st-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.type} · {a.number}</option>)}
          </select>
        </div>
        <div className="bk-field">
          <label htmlFor="st-month">Period</label>
          <select id="st-month" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m, i) => (
              <option key={i} value={i}>{m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}{i === 0 ? ' (to date)' : ''}</option>
            ))}
          </select>
        </div>
        <p className="bk-hint">Opens a printable statement. Choose "Save as PDF" in the print dialog to keep a copy.</p>
        <div className="bk-modal-foot">
          <button type="button" className="bk-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="bk-btn" onClick={generate}><FileText size={16} /> Generate</button>
        </div>
      </div>
    </Modal>
  );
}

const Transactions = () => {
  const { user } = useAuth();
  const { transactions, accounts } = useData();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('All');
  const [accountId, setAccountId] = useState('all');
  const [period, setPeriod] = useState('30');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState(null);
  const showStatement = params.get('statement') === '1';

  const categories = useMemo(() => ['All', ...[...new Set(transactions.map((t) => t.category))].sort()], [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const since = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
    return transactions.filter((t) =>
      (type === 'all' || t.type === type) &&
      (category === 'All' || t.category === category) &&
      (accountId === 'all' || t.accountId === accountId) &&
      new Date(t.createdAt).getTime() >= since &&
      (!q || [t.note, t.category, t.reference, t.counterpartName].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [transactions, search, type, category, accountId, period]);

  const totals = useMemo(() => ({
    income: filtered.filter(isIncome).reduce((s, t) => s + t.amount, 0),
    spending: filtered.filter(isSpending).reduce((s, t) => s + t.amount, 0),
  }), [filtered]);

  const groups = useMemo(() => groupByDay(filtered.slice(0, limit)), [filtered, limit]);

  const exportCSV = () => {
    if (!filtered.length) return toast.warning('Nothing to export for these filters.');
    downloadCSV(
      `oxbank-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Reference', 'Description', 'Category', 'Account', 'Type', 'Amount (NGN)', 'Balance after (NGN)'],
      filtered.map((t) => [
        new Date(t.createdAt).toLocaleString(), t.reference, t.note, t.category, `${t.accountType} ${t.accountNumber}`,
        t.type, (t.type === 'debit' ? -1 : 1) * koboToNaira(t.amount), koboToNaira(t.balanceAfter),
      ]),
    );
    toast.success(`Exported ${filtered.length} transactions.`);
  };

  const closeStatement = () => {
    params.delete('statement');
    setParams(params, { replace: true });
  };

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>Transactions</h1>
          <p>Every movement across your accounts, searchable and exportable.</p>
        </div>
        <div className="bk-actions">
          <button type="button" className="bk-btn ghost" onClick={exportCSV}><Download size={16} /> CSV</button>
          <button type="button" className="bk-btn" onClick={() => setParams({ statement: '1' })}><FileText size={16} /> Statement</button>
        </div>
      </div>

      <div className="bk-grid-3">
        <div className="bk-card bk-stat"><span className="bk-stat-label">Money in</span><span className="bk-stat-value"><Money kobo={totals.income} /></span></div>
        <div className="bk-card bk-stat"><span className="bk-stat-label">Money out</span><span className="bk-stat-value"><Money kobo={totals.spending} /></span></div>
        <div className="bk-card bk-stat"><span className="bk-stat-label">Transactions</span><span className="bk-stat-value">{filtered.length}</span></div>
      </div>

      <section className="bk-card">
        <div className="bk-stack" style={{ gap: 12, marginBottom: 8 }}>
          <div className="bk-field">
            <label htmlFor="tx-search" className="bk-sr-only">Search transactions</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bk-text-3)' }} />
              <input id="tx-search" placeholder="Search description, reference or name" value={search} onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }} className="bk-has-icon" />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <SlidersHorizontal size={16} className="bk-muted" aria-hidden="true" />
            <div className="bk-chips" role="group" aria-label="Period">
              {PERIODS.map((p) => (
                <button key={p.id} type="button" className={`bk-chip${period === p.id ? ' active' : ''}`} aria-pressed={period === p.id} onClick={() => { setPeriod(p.id); setLimit(PAGE); }}>{p.label}</button>
              ))}
            </div>
            <div className="bk-row-2" style={{ flex: 1, minWidth: 260, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
              <div className="bk-field">
                <label htmlFor="tx-type" className="bk-sr-only">Type</label>
                <select id="tx-type" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">All types</option>
                  <option value="credit">Money in</option>
                  <option value="debit">Money out</option>
                </select>
              </div>
              <div className="bk-field">
                <label htmlFor="tx-cat" className="bk-sr-only">Category</label>
                <select id="tx-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}
                </select>
              </div>
              <div className="bk-field">
                <label htmlFor="tx-acc" className="bk-sr-only">Account</label>
                <select id="tx-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="all">All accounts</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.type}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {groups.length === 0 ? (
          <Empty icon={History}>No transactions match these filters.</Empty>
        ) : (
          <div className="bk-list">
            {groups.map((g) => (
              <React.Fragment key={g.key}>
                <div className="bk-day-label">{g.label}</div>
                {g.items.map((tx) => <TxRow key={tx.id} tx={tx} onClick={setSelected} />)}
              </React.Fragment>
            ))}
          </div>
        )}
        {filtered.length > limit && (
          <div className="bk-center" style={{ marginTop: 12 }}>
            <button type="button" className="bk-btn ghost" onClick={() => setLimit((l) => l + PAGE)}>
              Show more ({filtered.length - limit} remaining)
            </button>
          </div>
        )}
      </section>

      {selected && <TxDetailModal tx={selected} onClose={() => setSelected(null)} />}
      {showStatement && <StatementModal accounts={accounts} user={user} onClose={closeStatement} />}
    </div>
  );
};

export default Transactions;
