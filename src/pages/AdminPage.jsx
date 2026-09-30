import React, { useState, useEffect } from 'react';
import Footer from '../Footer';
import '../assets/Style.css/Admin.css';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { getAdminStats, toggleUserSuspension, getAllTransactions } from '../services/adminService';
import { ShieldCheck, Users, Wallet, Activity, UserX, UserCheck, Search, Database } from 'lucide-react';

const AdminPage = () => {
  const { user } = useAuth();
  const { ledgerValid } = useData();
  const { toast } = useToast();

  const [stats, setStats] = useState(null);
  const [allTx, setAllTx] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'ledger'
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const data = await getAdminStats();
      const tx = await getAllTransactions();
      setStats(data);
      setAllTx(tx);
    } catch (err) {
      toast.error('Failed to load admin metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleSuspend = async (userId) => {
    const res = await toggleUserSuspension(userId);
    if (res.ok) {
      toast.success(res.message);
      await loadAdminData();
    }
  };

  const filteredUsers = stats?.users?.filter((u) => {
    return (
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
    );
  }) || [];

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="text-gradient">System Administration</h1>
            <p className="admin-subtitle">Platform overview, user access control, and cryptographic ledger inspection.</p>
          </div>
          <div className="admin-badge flex-center" style={{ gap: '6px' }}>
            <ShieldCheck size={18} color="#10b981" /> System Admin Access
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="admin-metrics-row">
          <div className="metric-card glass">
            <div className="metric-icon"><Users size={22} /></div>
            <div>
              <p className="metric-label">Total Users</p>
              <p className="metric-val">{stats?.userCount || 0}</p>
            </div>
          </div>
          <div className="metric-card glass">
            <div className="metric-icon"><Wallet size={22} /></div>
            <div>
              <p className="metric-label">Circulating Demo Money</p>
              <p className="metric-val">{formatCurrency(stats?.totalMoneyKobo || 0)}</p>
            </div>
          </div>
          <div className="metric-card glass">
            <div className="metric-icon"><Activity size={22} /></div>
            <div>
              <p className="metric-label">Total Accounts</p>
              <p className="metric-val">{stats?.accountCount || 0}</p>
            </div>
          </div>
          <div className="metric-card glass">
            <div className="metric-icon"><Database size={22} /></div>
            <div>
              <p className="metric-label">Ledger State</p>
              <p className="metric-val" style={{ color: ledgerValid ? '#10b981' : '#ef4444' }}>
                {ledgerValid ? 'INTECT (Valid)' : 'TAMPERED'}
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="admin-tabs glass">
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={18} /> User Accounts
          </button>
          <button className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
            <Database size={18} /> Global System Ledger ({allTx.length})
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="admin-section-card glass">
            <div className="section-header">
              <h2>Registered Platform Users</h2>
              <div className="admin-search-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Accounts</th>
                  <th>Total Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar">{u.name.charAt(0)}</span>
                        <div>
                          <p className="user-name">{u.name}</p>
                          <p className="user-email">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="role-badge">{u.role}</span></td>
                    <td>{u.accounts.map((a) => a.accountNumber).join(', ')}</td>
                    <td>{formatCurrency(u.totalBalanceKobo)}</td>
                    <td>
                      <span className={`status-badge ${u.suspended ? 'suspended' : 'active'}`}>
                        {u.suspended ? 'SUSPENDED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          className={`btn-action ${u.suspended ? 'unsuspend' : 'suspend'}`}
                          onClick={() => handleToggleSuspend(u.id)}
                        >
                          {u.suspended ? <UserCheck size={14} /> : <UserX size={14} />}
                          {u.suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="admin-section-card glass">
            <h2>Global Transaction Audit Log</h2>
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tx ID</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {allTx.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.date ? new Date(tx.date).toLocaleString() : 'N/A'}</td>
                    <td className="code-text">{tx.id}</td>
                    <td>{tx.note}</td>
                    <td>
                      <span className={`type-badge ${tx.type}`}>{tx.type.toUpperCase()}</span>
                    </td>
                    <td className={tx.type === 'credit' ? 'credit-text' : 'debit-text'}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountKobo)}
                    </td>
                    <td>{formatCurrency(tx.balanceAfterKobo || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AdminPage;
