import React, { useState, useEffect } from 'react';
import Footer from './Footer';
import './assets/Style.css/Dashboard.css';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  Eye,
  EyeOff,
  Send,
  Download,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Copy,
  ChevronRight,
  CircleCheck,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(10000);
  const [showBalance, setShowBalance] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  const [form, setForm] = useState({
    recipientAccount: '',
    recipient: '',
    amount: '',
    note: ''
  });

  useEffect(() => {
    try {
      const savedTransactions = [
        { id: 1, type: 'credit', amount: 500, note: 'Salary', date: '2025-05-28', category: 'Income' },
        { id: 2, type: 'debit', amount: 120, note: 'Groceries', date: '2025-05-27', category: 'Shopping' },
        { id: 3, type: 'debit', amount: 60, note: 'Utilities', date: '2025-05-26', category: 'Bills' },
        { id: 4, type: 'credit', amount: 200, note: 'Transfer', date: '2025-05-25', category: 'Transfer' },
      ];
      setTransactions(savedTransactions);

      let acc = localStorage.getItem('accountNumber');
      if (!acc) {
        acc = 'OX' + Math.floor(1000000000 + Math.random() * 9000000000);
        localStorage.setItem('accountNumber', acc);
      }
      setAccountNumber(acc);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }, []);

  const savingsGoals = [
    { id: 1, name: 'Dream Vacation', target: 5000, current: 3200, color: '#551A8B' },
    { id: 2, name: 'New Laptop', target: 2000, current: 850, color: '#ff6600' },
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTransferError('');
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    setTransferError('');
    const amount = parseFloat(form.amount);

    if (!form.recipientAccount || !form.recipient || !amount || amount <= 0) {
      setTransferError('Please fill in all required fields.');
      return;
    }
    if (amount > balance) {
      setTransferError('Insufficient funds. Please enter a smaller amount.');
      return;
    }

    const newTransaction = {
      id: Date.now(),
      type: 'debit',
      amount,
      note: form.note || `To ${form.recipient}`,
      date: 'Today',
      category: 'Transfer'
    };

    setTransactions(prev => [newTransaction, ...prev]);
    setBalance(prev => prev - amount);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      setShowTransferModal(false);
      setForm({ recipientAccount: '', recipient: '', amount: '', note: '' });
    }, 2500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accountNumber).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    });
  };

  const openModal = () => {
    setTransferError('');
    setIsSuccess(false);
    setShowTransferModal(true);
  };

  const closeModal = () => {
    setShowTransferModal(false);
    setForm({ recipientAccount: '', recipient: '', amount: '', note: '' });
    setTransferError('');
  };

  const totalIn = transactions.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0);

  return (
    <div className="dashboard-page">
      <div className="dashboard-main-content animate-fade-in">
        <div className="dashboard-container">

          {/* HERO SECTION */}
          <div className="dashboard-hero glass">
            <div className="hero-content">
              <div className="balance-info">
                <p className="welcome-text">Welcome back, <span className="text-gradient">{user.name}</span></p>
                <p className="label">Total Balance</p>
                <div className="balance-row">
                  <h1 className="main-balance">
                    {showBalance ? `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "••••••••"}
                  </h1>
                  <button className="icon-btn" onClick={() => setShowBalance(!showBalance)} aria-label="Toggle balance visibility">
                    {showBalance ? <Eye size={24} /> : <EyeOff size={24} />}
                  </button>
                </div>
                <div className="account-tag">
                  <span>{accountNumber || 'OX-LOADING...'}</span>
                  <button onClick={copyToClipboard} className="copy-btn" aria-label="Copy account number">
                    <Copy size={14} />
                    {copiedToast && <span className="copy-toast">Copied!</span>}
                  </button>
                </div>
              </div>

              <div className="quick-actions">
                <button className="action-btn primary" onClick={openModal} aria-label="Send money">
                  <div className="icon"><Send size={24} /></div>
                  <span>Send</span>
                </button>
                <button className="action-btn" aria-label="Request money">
                  <div className="icon"><Download size={24} /></div>
                  <span>Request</span>
                </button>
                <button className="action-btn" aria-label="Pay bills">
                  <div className="icon"><CreditCard size={24} /></div>
                  <span>Bills</span>
                </button>
              </div>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="dashboard-stats-row">
            <div className="stat-mini-card glass">
              <div className="stat-mini-icon income">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="stat-mini-label">Total In</p>
                <p className="stat-mini-value credit">+${totalIn.toLocaleString()}</p>
              </div>
            </div>
            <div className="stat-mini-card glass">
              <div className="stat-mini-icon expense">
                <TrendingDown size={20} />
              </div>
              <div>
                <p className="stat-mini-label">Total Out</p>
                <p className="stat-mini-value debit">-${totalOut.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* LEFT COLUMN: Analytics & Goals */}
            <div className="dashboard-col main-col">

              <section className="dashboard-section-card glass">
                <div className="section-header">
                  <h2>Spending Analytics</h2>
                  <select className="period-select">
                    <option>This Week</option>
                    <option>This Month</option>
                  </select>
                </div>
                <div className="analytics-placeholder">
                  <div className="chart-bar"><div className="fill" style={{ height: '60%' }}></div><span>Mon</span></div>
                  <div className="chart-bar"><div className="fill" style={{ height: '40%' }}></div><span>Tue</span></div>
                  <div className="chart-bar"><div className="fill active" style={{ height: '85%' }}></div><span>Wed</span></div>
                  <div className="chart-bar"><div className="fill" style={{ height: '50%' }}></div><span>Thu</span></div>
                  <div className="chart-bar"><div className="fill" style={{ height: '70%' }}></div><span>Fri</span></div>
                  <div className="chart-bar"><div className="fill" style={{ height: '30%' }}></div><span>Sat</span></div>
                  <div className="chart-bar"><div className="fill" style={{ height: '45%' }}></div><span>Sun</span></div>
                </div>
              </section>

              <section className="dashboard-section-card glass">
                <div className="section-header">
                  <h2>Savings Goals</h2>
                  <button className="text-btn flex-center">
                    <Plus size={16} style={{ marginRight: '4px' }} />
                    New Goal
                  </button>
                </div>
                <div className="goals-list">
                  {savingsGoals.map(goal => (
                    <div key={goal.id} className="goal-item">
                      <div className="goal-info">
                        <span>{goal.name}</span>
                        <span>${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}</span>
                      </div>
                      <div className="progress-bg">
                        <div className="progress-fill" style={{
                          width: `${(goal.current / goal.target) * 100}%`,
                          backgroundColor: goal.color
                        }}></div>
                      </div>
                      <p className="goal-percent">{Math.round((goal.current / goal.target) * 100)}% reached</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Recent Transactions */}
            <div className="dashboard-col side-col">
              <section className="dashboard-section-card glass transactions-card">
                <div className="section-header">
                  <h2>Recent Transactions</h2>
                  <Link to="/transactions" className="text-btn flex-center">
                    View All <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="transactions-list">
                  {transactions.length > 0 ? transactions.map((tx) => (
                    <div key={tx.id} className="tx-item">
                      <div className={`tx-icon ${tx.type}`}>
                        {tx.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div className="tx-details">
                        <p className="tx-note">{tx.note}</p>
                        <p className="tx-category">{tx.category} • {tx.date}</p>
                      </div>
                      <div className={`tx-amount ${tx.type}`}>
                        {tx.type === 'credit' ? '+' : '-'}${tx.amount.toLocaleString()}
                      </div>
                    </div>
                  )) : (
                    <p className="empty-state">No transactions yet.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-content glass">
            {isSuccess ? (
              <div className="success-view">
                <div className="success-icon">
                  <CircleCheck size={48} color="white" />
                </div>
                <h3>Transfer Successful!</h3>
                <p>Your money has been sent to {form.recipient}</p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h2>Transfer Money</h2>
                  <button onClick={closeModal} className="close-btn" aria-label="Close modal">
                    <X size={24} />
                  </button>
                </div>

                {transferError && (
                  <div className="transfer-error">
                    <AlertCircle size={16} />
                    <span>{transferError}</span>
                  </div>
                )}

                <form className="transfer-modal-form" onSubmit={handleTransfer}>
                  <div className="input-group">
                    <label>Recipient Name</label>
                    <input type="text" name="recipient" placeholder="e.g. John Doe" value={form.recipient} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label>Account Number</label>
                    <input type="text" name="recipientAccount" placeholder="e.g. OX1234567890" value={form.recipientAccount} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label>Amount ($)</label>
                    <input type="number" name="amount" placeholder="0.00" value={form.amount} onChange={handleChange} required min="1" step="0.01" />
                    {form.amount && parseFloat(form.amount) > 0 && (
                      <p className="amount-hint">
                        Available: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  <div className="input-group">
                    <label>Note <span className="optional-label">(Optional)</span></label>
                    <input type="text" name="note" placeholder="Rent, Groceries, etc." value={form.note} onChange={handleChange} />
                  </div>
                  <button type="submit" className="btn btn-primary modal-submit flex-center">
                    <Send size={18} style={{ marginRight: '8px' }} />
                    Proceed Transfer
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;