import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Wallet, Activity, ShieldCheck, ShieldAlert, Search, UserX, UserCheck, RefreshCw, PiggyBank } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useToast } from '../context/ToastContext';
import { adminService } from '../services/adminService';
import { formatCurrency } from '../utils/currency';
import { Modal, Empty, Alert } from '../components/ui';

const LEDGER_PAGE = 50;

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(LEDGER_PAGE);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, tx] = await Promise.all([adminService.getAdminStats(user.id), adminService.getAllTransactions(user.id)]);
      setStats(s);
      setLedger(tx);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const users = useMemo(() => (stats?.users || []).filter((u) => !q || [u.name, u.email, u.id].some((v) => v.toLowerCase().includes(q))), [stats, q]);
  const rows = useMemo(() => ledger.filter((t) => !q || [t.userName, t.userEmail, t.reference, t.note, t.accountNumber].some((v) => v?.toLowerCase().includes(q))), [ledger, q]);

  const toggle = async () => {
    const res = await adminService.toggleUserSuspension(user.id, confirm.id);
    setConfirm(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    load();
  };

  if (error) return <div className="bk-page"><Alert>{error}</Alert></div>;

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>Admin console</h1>
          <p>Platform health, customer access and the global ledger.</p>
        </div>
        <button type="button" className="bk-btn ghost" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="bk-grid-4">
        <div className="bk-card bk-stat"><span className="bk-stat-label"><Users size={14} /> Customers</span><span className="bk-stat-value">{stats?.userCount ?? '—'}</span><span className="bk-stat-delta">{stats?.suspendedCount || 0} suspended</span></div>
        <div className="bk-card bk-stat"><span className="bk-stat-label"><Wallet size={14} /> Deposits</span><span className="bk-stat-value">{stats ? formatCurrency(stats.depositsKobo) : '—'}</span><span className="bk-stat-delta">{stats?.accountCount ?? 0} accounts</span></div>
        <div className="bk-card bk-stat"><span className="bk-stat-label"><PiggyBank size={14} /> In savings goals</span><span className="bk-stat-value">{stats ? formatCurrency(stats.goalsKobo) : '—'}</span></div>
        <div className="bk-card bk-stat">
          <span className="bk-stat-label"><Activity size={14} /> Ledger integrity</span>
          <span className="bk-stat-value" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            {stats?.integrity.ok ? <><ShieldCheck size={18} color="var(--bk-good)" /> All balanced</> : stats ? <><ShieldAlert size={18} color="var(--bk-critical)" /> {stats.integrity.failures.length} mismatch</> : '—'}
          </span>
          <span className="bk-stat-delta">{stats?.integrity.checked ?? 0} accounts · {stats?.transactionCount ?? 0} entries</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div className="bk-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Customers</button>
          <button type="button" role="tab" aria-selected={tab === 'ledger'} className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>Global ledger ({ledger.length})</button>
        </div>
        <div className="bk-field" style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="adm-search" className="bk-sr-only">Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bk-text-3)' }} />
            <input id="adm-search" placeholder={tab === 'users' ? 'Search name, email or ID' : 'Search customer, reference, account'} value={search} onChange={(e) => setSearch(e.target.value)} className="bk-has-icon" />
          </div>
        </div>
      </div>

      <section className="bk-card flush">
        {tab === 'users' ? (
          users.length === 0 ? <Empty icon={Users}>No customers match.</Empty> : (
            <div className="bk-table-wrap">
              <table className="bk-table">
                <thead><tr><th>Customer</th><th>Role</th><th className="num">Accounts</th><th className="num">Balance</th><th className="num">Goals</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong><div className="bk-subtle">{u.email}</div></td>
                      <td>{u.role}</td>
                      <td className="num">{u.accounts.length}</td>
                      <td className="num">{formatCurrency(u.totalBalanceKobo)}</td>
                      <td className="num">{formatCurrency(u.goalsKobo)}</td>
                      <td>{u.suspended ? <span className="bk-badge critical">Suspended</span> : <span className="bk-badge good">Active</span>}</td>
                      <td className="num">
                        {u.role !== 'admin' && (
                          <button type="button" className={`bk-btn sm ${u.suspended ? 'ghost' : 'danger ghost'}`} onClick={() => setConfirm(u)}>
                            {u.suspended ? <><UserCheck size={14} /> Restore</> : <><UserX size={14} /> Suspend</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : rows.length === 0 ? <Empty icon={Activity}>No ledger entries match.</Empty> : (
          <>
            <div className="bk-table-wrap">
              <table className="bk-table">
                <thead><tr><th>Date</th><th>Customer</th><th>Account</th><th>Description</th><th>Reference</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {rows.slice(0, limit).map((t) => (
                    <tr key={t.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{t.userName}</td>
                      <td className="bk-mono">{t.accountType} · {t.accountNumber}</td>
                      <td>{t.note}<div className="bk-subtle">{t.category}</div></td>
                      <td className="bk-mono bk-subtle">{t.reference}</td>
                      <td className={`num bk-amt ${t.type}`}>{t.type === 'credit' ? '+' : '−'}{formatCurrency(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > limit && (
              <div className="bk-center" style={{ padding: 16 }}>
                <button type="button" className="bk-btn ghost" onClick={() => setLimit((l) => l + LEDGER_PAGE)}>Show more ({rows.length - limit} remaining)</button>
              </div>
            )}
          </>
        )}
      </section>

      {confirm && (
        <Modal title={confirm.suspended ? `Restore ${confirm.name}?` : `Suspend ${confirm.name}?`} onClose={() => setConfirm(null)}>
          <p className="bk-muted">
            {confirm.suspended
              ? 'They will be able to sign in and move money again.'
              : 'They will be signed out everywhere, blocked from signing in, and unable to send or receive transfers.'}
          </p>
          <div className="bk-modal-foot">
            <button type="button" className="bk-btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
            <button type="button" className={`bk-btn${confirm.suspended ? '' : ' danger'}`} onClick={toggle}>{confirm.suspended ? 'Restore access' : 'Suspend'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
