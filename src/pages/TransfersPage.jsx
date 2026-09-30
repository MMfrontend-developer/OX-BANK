import React, { useState } from 'react';
import Footer from '../Footer';
import '../assets/Style.css/Transfers.css';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, nairaToKobo } from '../utils/currency';
import { generateId } from '../services/cryptoService';
import { execute as executeTransfer } from '../services/transferService';
import PinModal from '../components/PinModal';
import { Send, ArrowLeftRight, Building2, User, CheckCircle2, AlertCircle, Clock, Search } from 'lucide-react';

const SAVED_BENEFICIARIES = [
  { id: '1', name: 'Alice Smith', accountNumber: '1000000002', bank: 'OXBANK' },
  { id: '2', name: 'John Doe (Savings)', accountNumber: '1000000001', bank: 'OXBANK' },
  { id: '3', name: 'Tech Solutions Ltd', accountNumber: '2019482941', bank: 'First Tech Bank' },
];

const NIGERIAN_BANKS = [
  'OXBANK (Internal)',
  'Access Bank',
  'First Bank of Nigeria',
  'GTBank',
  'Kuda Bank',
  'Moniepoint',
  'OPay',
  'United Bank for Africa (UBA)',
  'Zenith Bank',
];

const TransfersPage = () => {
  const { user } = useAuth();
  const { accounts, primaryAccount, transactions, refreshData } = useData();
  const { toast } = useToast();

  const [transferType, setTransferType] = useState('oxbank'); // 'oxbank' | 'own' | 'other'
  const [form, setForm] = useState({
    fromAccountId: primaryAccount?.id || '',
    toAccountNumber: '',
    toName: '',
    targetBank: 'OXBANK (Internal)',
    amount: '',
    note: '',
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const selectedSourceAccount = accounts.find((a) => a.id === (form.fromAccountId || primaryAccount?.id)) || primaryAccount;
  const sourceBalanceKobo = selectedSourceAccount?.balance || 0;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const selectBeneficiary = (b) => {
    setForm({
      ...form,
      toAccountNumber: b.accountNumber,
      toName: b.name,
      targetBank: b.bank,
    });
    toast.info(`Selected ${b.name}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const amountNaira = parseFloat(form.amount);
    if (!amountNaira || amountNaira <= 0) {
      setError('Please enter a valid transfer amount.');
      return;
    }

    const amountKobo = nairaToKobo(amountNaira);
    if (amountKobo > sourceBalanceKobo) {
      setError('Insufficient funds in the selected source account.');
      return;
    }

    let recipientAcc = form.toAccountNumber.trim();
    if (transferType === 'own') {
      const otherOwn = accounts.find((a) => a.id !== selectedSourceAccount.id);
      if (!otherOwn) {
        setError('You do not have a second account to transfer between.');
        return;
      }
      recipientAcc = otherOwn.accountNumber;
    }

    if (!recipientAcc) {
      setError('Please enter a destination account number.');
      return;
    }

    const payload = {
      fromAccountId: selectedSourceAccount.id,
      toAccountNumber: recipientAcc,
      toName: form.toName.trim() || (transferType === 'own' ? 'Own Account' : 'Recipient'),
      amountKobo,
      note: form.note.trim() || `Transfer to ${form.toName || recipientAcc}`,
      submissionId: generateId(),
    };

    if (amountNaira >= 50000) {
      setPendingTransfer(payload);
      setShowPinModal(true);
    } else {
      runTransfer(payload);
    }
  };

  const runTransfer = async (payload, pin = null) => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await executeTransfer(user.id, { ...payload, pin });
      if (res.ok) {
        setIsSuccess(true);
        toast.success(`Transferred ${formatCurrency(payload.amountKobo)} successfully!`);
        await refreshData();
        setTimeout(() => {
          setIsSuccess(false);
          setShowPinModal(false);
          setPendingTransfer(null);
          setForm({
            fromAccountId: primaryAccount?.id || '',
            toAccountNumber: '',
            toName: '',
            targetBank: 'OXBANK (Internal)',
            amount: '',
            note: '',
          });
        }, 2200);
      } else {
        setError(res.error || 'Transfer failed.');
        toast.error(res.error || 'Transfer failed');
      }
    } catch (err) {
      setError(err.message || 'Error processing transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = (pin) => {
    if (pendingTransfer) {
      runTransfer(pendingTransfer, pin);
    }
  };

  return (
    <div className="transfers-page animate-fade-in">
      <div className="transfers-container">
        <div className="transfers-header">
          <h1 className="text-gradient">Money Transfers</h1>
          <p className="transfers-subtitle">Send money instantly across accounts or external banks with zero transaction fees.</p>
        </div>

        {/* TYPE SELECTOR TABS */}
        <div className="transfer-type-tabs glass">
          <button
            className={`tab-btn ${transferType === 'oxbank' ? 'active' : ''}`}
            onClick={() => { setTransferType('oxbank'); setError(''); }}
          >
            <Send size={18} /> OXBANK Account
          </button>
          <button
            className={`tab-btn ${transferType === 'own' ? 'active' : ''}`}
            onClick={() => { setTransferType('own'); setError(''); }}
          >
            <ArrowLeftRight size={18} /> Between Own Accounts
          </button>
          <button
            className={`tab-btn ${transferType === 'other' ? 'active' : ''}`}
            onClick={() => { setTransferType('other'); setError(''); }}
          >
            <Building2 size={18} /> Other Banks
          </button>
        </div>

        <div className="transfers-grid">
          {/* TRANSFER FORM */}
          <div className="transfer-form-card glass">
            {isSuccess ? (
              <div className="transfer-success-box">
                <CheckCircle2 size={54} color="#10b981" />
                <h2>Transfer Complete!</h2>
                <p>Funds have been safely dispatched from your account.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="transfers-form">
                <h2>
                  {transferType === 'oxbank'
                    ? 'Transfer to OXBANK User'
                    : transferType === 'own'
                    ? 'Move Money Between Accounts'
                    : 'Other Bank Transfer'}
                </h2>

                {error && (
                  <div className="auth-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {/* SOURCE ACCOUNT */}
                <div className="input-field">
                  <label>Source Account</label>
                  <select
                    name="fromAccountId"
                    value={form.fromAccountId || primaryAccount?.id}
                    onChange={handleChange}
                    className="select-input"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountType.toUpperCase()} ({acc.accountNumber}) — Bal: {formatCurrency(acc.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DESTINATION FIELDS */}
                {transferType === 'own' ? (
                  <div className="own-transfer-info glass">
                    <ArrowLeftRight size={20} />
                    <span>
                      Transferring to your other registered account ({accounts.find((a) => a.id !== selectedSourceAccount?.id)?.accountNumber || 'Checking'})
                    </span>
                  </div>
                ) : (
                  <>
                    {transferType === 'other' && (
                      <div className="input-field">
                        <label>Destination Bank</label>
                        <select
                          name="targetBank"
                          value={form.targetBank}
                          onChange={handleChange}
                          className="select-input"
                        >
                          {NIGERIAN_BANKS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="input-field">
                      <label>Recipient Account Number</label>
                      <input
                        type="text"
                        name="toAccountNumber"
                        placeholder="e.g. 1000000002"
                        value={form.toAccountNumber}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="input-field">
                      <label>Recipient Name</label>
                      <input
                        type="text"
                        name="toName"
                        placeholder="e.g. Alice Smith"
                        value={form.toName}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}

                {/* AMOUNT */}
                <div className="input-field">
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
                  {form.amount && (
                    <p className="available-hint">
                      Available Balance: {formatCurrency(sourceBalanceKobo)}
                    </p>
                  )}
                </div>

                {/* NOTE */}
                <div className="input-field">
                  <label>Remark / Purpose</label>
                  <input
                    type="text"
                    name="note"
                    placeholder="e.g. Rent, Business, Gift"
                    value={form.note}
                    onChange={handleChange}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit flex-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="auth-spinner"></span>
                  ) : (
                    <>
                      <Send size={18} style={{ marginRight: '8px' }} />
                      Transfer Funds Now
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* BENEFICIARIES & RECENT TRANSFERS */}
          <div className="transfers-side-col">
            {/* QUICK BENEFICIARIES */}
            <div className="beneficiaries-card glass">
              <h3>Saved Beneficiaries</h3>
              <div className="beneficiaries-list">
                {SAVED_BENEFICIARIES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="beneficiary-chip"
                    onClick={() => selectBeneficiary(b)}
                  >
                    <div className="avatar-mini">{b.name.charAt(0)}</div>
                    <div className="b-info">
                      <p className="b-name">{b.name}</p>
                      <p className="b-acc">{b.bank} • {b.accountNumber}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* RECENT TRANSFERS LOG */}
            <div className="recent-transfers-card glass">
              <h3><Clock size={16} /> Recent Transfer Ledger</h3>
              <div className="recent-transfers-list">
                {transactions
                  .filter((t) => t.category === 'Transfer')
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t.id} className="mini-transfer-item">
                      <div>
                        <p className="t-note">{t.note}</p>
                        <p className="t-date">{t.date ? new Date(t.date).toLocaleDateString() : 'Today'}</p>
                      </div>
                      <div className={`t-amount ${t.type}`}>
                        {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amountKobo)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* PIN MODAL */}
      {showPinModal && (
        <PinModal
          title="Security PIN Verification"
          subtitle={`Enter 4-digit PIN to authorize transfer of ₦${parseFloat(form.amount).toLocaleString()}`}
          onSubmit={handlePinSubmit}
          onClose={() => setShowPinModal(false)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default TransfersPage;
