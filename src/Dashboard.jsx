import React, { useState } from 'react';
import Footer from './Footer';
import './assets/Style.css/Dashboard.css';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useData } from './context/DataContext';
import { useToast } from './context/ToastContext';
import { formatCurrency, formatCompact, nairaToKobo } from './utils/currency';
import { generateId } from './services/cryptoService';
import { execute as executeTransfer } from './services/transferService';
import SpendingChart from './components/SpendingChart';
import BalanceTrend from './components/BalanceTrend';
import PinModal from './components/PinModal';
import { SkeletonLine, SkeletonCard } from './components/Skeleton';
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
  TrendingDown,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Zap,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { accounts, primaryAccount, transactions, ledgerValid, loading, refreshData, resetDemoData } = useData();
  const { toast } = useToast();

  const [showBalance, setShowBalance] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  const [form, setForm] = useState({
    recipientAccount: '',
    recipientName: '',
    amount: '',
    note: '',
  });

  const savingsGoals = [
    { id: 1, name: 'Emergency Fund', target: 50000000, current: 35000000, color: '#551A8B' }, // in kobo
    { id: 2, name: 'New Laptop', target: 120000000, current: 85000000, color: '#ff6600' },
  ];

  const balanceKobo = primaryAccount ? primaryAccount.balance : 0;
  const accountNumber = primaryAccount ? primaryAccount.accountNumber : 'OX-------------';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTransferError('');
  };

  const initiateTransfer = (e) => {
    e.preventDefault();
    setTransferError('');

    const amountNaira = parseFloat(form.amount);
    if (!form.recipientAccount.trim() || !amountNaira || amountNaira <= 0) {
      setTransferError('Please enter a valid recipient account number and amount.');
      return;
    }

    const amountKobo = nairaToKobo(amountNaira);
    if (amountKobo > balanceKobo) {
      setTransferError('Insufficient funds for this transfer.');
      return;
    }

    const payload = {
      fromAccountId: primaryAccount.id,
      toAccountNumber: form.recipientAccount.trim(),
      toName: form.recipientName.trim() || 'Beneficiary',
      amountKobo,
      note: form.note.trim() || 'Transfer via OXBANK',
      submissionId: generateId(),
    };

    // If amount is over N50,000 require PIN verification
    if (amountNaira >= 50000) {
      setPendingTransfer(payload);
      setShowPinModal(true);
    } else {
      processTransfer(payload);
    }
  };

  const processTransfer = async (transferPayload, pin = null) => {
    setIsSubmitting(true);
    setTransferError('');

    try {
      const res = await executeTransfer(user.id, { ...transferPayload, pin });
      if (res.ok) {
        setIsSuccess(true);
        toast.success(`Sent ${formatCurrency(transferPayload.amountKobo)} successfully!`);
        await refreshData();
        setTimeout(() => {
          setIsSuccess(false);
          setShowTransferModal(false);
          setShowPinModal(false);
          setPendingTransfer(null);
          setForm({ recipientAccount: '', recipientName: '', amount: '', note: '' });
        }, 2200);
      } else {
        setTransferError(res.error || 'Transfer failed.');
        toast.error(res.error || 'Transfer error');
      }
    } catch (err) {
      setTransferError(err.message || 'Error executing transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = (pin) => {
    if (pendingTransfer) {
      processTransfer(pendingTransfer, pin);
    }
  };

  const copyToClipboard = () => {
    if (!accountNumber) return;
    navigator.clipboard.writeText(accountNumber).then(() => {
      setCopiedToast(true);
      toast.info('Account number copied!');
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
    setShowPinModal(false);
    setPendingTransfer(null);
    setForm({ recipientAccount: '', recipientName: '', amount: '', note: '' });
    setTransferError('');
  };

  const totalIn = transactions.filter((t) => t.type === 'credit').reduce((a, t) => a + t.amountKobo, 0);
  const totalOut = transactions.filter((t) => t.type === 'debit').reduce((a, t) => a + t.amountKobo, 0);

  return (
    <div className="dashboard-page">
      <div className="dashboard-main-content animate-fade-in">
        <div className="dashboard-container">

          {/* HERO SECTION */}
          <div className="dashboard-hero glass">
            <div className="hero-content">
              <div className="balance-info">
                <p className="welcome-text">
                  Welcome back, <span className="text-gradient">{user.name}</span>
                </p>
                <p className="label">Primary Account Balance ({primaryAccount?.accountType?.toUpperCase() || 'SAVINGS'})</p>
                <div className="balance-row">
                  <h1 className="main-balance">
                    {loading ? (
                      <SkeletonLine width="200px" height="2.5rem" />
                    ) : showBalance ? (
                      formatCurrency(balanceKobo)
                    ) : (
                      '••••••••'
                    )}
                  </h1>
                  <button
                    className="icon-btn"
                    onClick={() => setShowBalance(!showBalance)}
                    aria-label="Toggle balance visibility"
                  >
                    {showBalance ? <Eye size={24} /> : <EyeOff size={24} />}
                  </button>
                </div>
                <div className="account-tag">
                  <span>{accountNumber}</span>
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
                <Link to="/transfers" className="action-btn" aria-label="Transfers page">
                  <div className="icon"><Zap size={24} /></div>
                  <span>Transfers</span>
                </Link>
                <Link to="/bills" className="action-btn" aria-label="Pay bills">
                  <div className="icon"><CreditCard size={24} /></div>
                  <span>Bills</span>
                </Link>
                <Link to="/cards" className="action-btn" aria-label="Manage cards">
                  <div className="icon"><Wallet size={24} /></div>
                  <span>Cards</span>
                </Link>
              </div>
            </div>
          </div>

          {/* SYSTEM INTEGRITY BADGE */}
          <div className="dashboard-system-row">
            <div className="system-status-pill glass">
              <ShieldCheck size={16} color={ledgerValid ? '#10b981' : '#ef4444'} />
              <span>Ledger Verification: <strong>{ledgerValid ? 'Verified (100% Cryptographic Integrity)' : 'Tampered / Invalid'}</strong></span>
            </div>
            <button className="text-btn flex-center reset-demo-btn" onClick={resetDemoData} title="Reset all demo data to initial state">
              <RefreshCw size={14} style={{ marginRight: '4px' }} /> Reset Demo Data
            </button>
          </div>

          {/* STAT CARDS */}
          <div className="dashboard-stats-row">
            <div className="stat-mini-card glass">
              <div className="stat-mini-icon income">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="stat-mini-label">Total Inflow</p>
                <p className="stat-mini-value credit">+{formatCompact(totalIn)}</p>
              </div>
            </div>
            <div className="stat-mini-card glass">
              <div className="stat-mini-icon expense">
                <TrendingDown size={20} />
              </div>
              <div>
                <p className="stat-mini-label">Total Outflow</p>
                <p className="stat-mini-value debit">-{formatCompact(totalOut)}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* LEFT COLUMN: Charts & Goals */}
            <div className="dashboard-col main-col">
              {/* 30-DAY TREND SVG CHART */}
              <section className="dashboard-section-card glass">
                <div className="section-header">
                  <h2>30-Day Balance Trend</h2>
                  <span className="live-indicator"><span className="dot"></span> Live Ledger</span>
                </div>
                <BalanceTrend transactions={transactions} />
              </section>

              {/* SPENDING BY CATEGORY CHART */}
              <section className="dashboard-section-card glass">
                <div className="section-header">
                  <h2>Spending Breakdown</h2>
                </div>
                <SpendingChart transactions={transactions} />
              </section>

              {/* SAVINGS GOALS */}
              <section className="dashboard-section-card glass">
                <div className="section-header">
                  <h2>Savings Goals</h2>
                  <button className="text-btn flex-center" onClick={() => toast.info('Goal creation coming soon!')}>
                    <Plus size={16} style={{ marginRight: '4px' }} />
                    New Goal
                  </button>
                </div>
                <div className="goals-list">
                  {savingsGoals.map((goal) => (
                    <div key={goal.id} className="goal-item">
                      <div className="goal-info">
                        <span>{goal.name}</span>
                        <span>{formatCompact(goal.current)} / {formatCompact(goal.target)}</span>
                      </div>
                      <div className="progress-bg">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, (goal.current / goal.target) * 100)}%`,
                            backgroundColor: goal.color,
                          }}
                        ></div>
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
                  <h2>Recent Activity</h2>
                  <Link to="/transactions" className="text-btn flex-center">
                    View All <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="transactions-list">
                  {loading ? (
                    <SkeletonCard />
                  ) : transactions.length > 0 ? (
                    transactions.slice(0, 6).map((tx) => (
                      <div key={tx.id} className="tx-item">
                        <div className={`tx-icon ${tx.type}`}>
                          {tx.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div className="tx-details">
                          <p className="tx-note">{tx.note}</p>
                          <p className="tx-category">{tx.category} • {tx.date ? new Date(tx.date).toLocaleDateString() : 'Today'}</p>
                        </div>
                        <div className={`tx-amount ${tx.type}`}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountKobo)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No transactions yet.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* QUICK TRANSFER MODAL */}
      {showTransferModal && !showPinModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-content glass">
            {isSuccess ? (
              <div className="success-view">
                <div className="success-icon">
                  <CircleCheck size={48} color="white" />
                </div>
                <h3>Transfer Successful!</h3>
                <p>Your money has been sent cleanly.</p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h2>Send Money</h2>
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

                <form className="transfer-modal-form" onSubmit={initiateTransfer}>
                  <div className="input-group">
                    <label>Recipient Account Number</label>
                    <input
                      type="text"
                      name="recipientAccount"
                      placeholder="e.g. OX1234567890 or 1000000002"
                      value={form.recipientAccount}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Recipient Name (Optional)</label>
                    <input
                      type="text"
                      name="recipientName"
                      placeholder="e.g. Alice Smith"
                      value={form.recipientName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="input-group">
                    <label>Amount (₦)</label>
                    <input
                      type="number"
                      name="amount"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={handleChange}
                      required
                      min="1"
                      step="0.01"
                    />
                    {form.amount && parseFloat(form.amount) > 0 && (
                      <p className="amount-hint">
                        Available: {formatCurrency(balanceKobo)}
                      </p>
                    )}
                  </div>
                  <div className="input-group">
                    <label>Description / Remark</label>
                    <input
                      type="text"
                      name="note"
                      placeholder="e.g. Lunch, Groceries, Rent"
                      value={form.note}
                      onChange={handleChange}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary modal-submit flex-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="auth-spinner"></span>
                    ) : (
                      <>
                        <Send size={18} style={{ marginRight: '8px' }} />
                        Confirm & Send
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* PIN MODAL FOR HIGH VALUE TRANSFERS */}
      {showPinModal && (
        <PinModal
          title="Verify Transaction PIN"
          subtitle={`Enter your 4-digit PIN to authorize ₦${parseFloat(form.amount).toLocaleString()} transfer`}
          onSubmit={handlePinSubmit}
          onClose={() => setShowPinModal(false)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default Dashboard;