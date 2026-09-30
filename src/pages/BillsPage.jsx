import React, { useState, useEffect } from 'react';
import Footer from '../Footer';
import '../assets/Style.css/Bills.css';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, nairaToKobo } from '../utils/currency';
import { listPayees, getScheduledBills, payBill, scheduleBill } from '../services/billService';
import { Zap, Wifi, Tv, Phone, Calendar, CheckCircle2, AlertCircle, Clock, Plus, Trash2 } from 'lucide-react';

const CATEGORY_ICONS = {
  Electricity: Zap,
  Internet: Wifi,
  CableTV: Tv,
  Airtime: Phone,
};

const BillsPage = () => {
  const { user } = useAuth();
  const { primaryAccount, refreshData } = useData();
  const { toast } = useToast();

  const [payees, setPayees] = useState([]);
  const [scheduledBills, setScheduledBills] = useState([]);
  const [activeTab, setActiveTab] = useState('pay'); // 'pay' | 'scheduled' | 'payees'

  const [form, setForm] = useState({
    payeeCategory: 'Electricity',
    billerName: 'EKEDC Electricity',
    customerRef: '',
    amount: '',
    isScheduled: false,
    scheduledDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadBillData = async () => {
    if (!user) return;
    const p = await listPayees(user.id);
    const s = await getScheduledBills(user.id);
    setPayees(p);
    setScheduledBills(s);
  };

  useEffect(() => {
    loadBillData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    setError('');
  };

  const handlePayBill = async (e) => {
    e.preventDefault();
    setError('');

    const amountNaira = parseFloat(form.amount);
    if (!form.customerRef.trim() || !amountNaira || amountNaira <= 0) {
      setError('Please fill in customer reference number and valid amount.');
      return;
    }

    const amountKobo = nairaToKobo(amountNaira);

    if (!primaryAccount || primaryAccount.balance < amountKobo) {
      setError('Insufficient balance to pay this bill.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (form.isScheduled) {
        if (!form.scheduledDate) {
          setError('Please pick a date for the scheduled bill payment.');
          setIsSubmitting(false);
          return;
        }
        const res = await scheduleBill(user.id, {
          payeeName: form.billerName,
          category: form.payeeCategory,
          customerRef: form.customerRef,
          amountKobo,
          scheduledDate: form.scheduledDate,
        });
        if (res.ok) {
          toast.success(`Bill payment of ${formatCurrency(amountKobo)} scheduled for ${form.scheduledDate}!`);
          await loadBillData();
          setForm({
            payeeCategory: 'Electricity',
            billerName: 'EKEDC Electricity',
            customerRef: '',
            amount: '',
            isScheduled: false,
            scheduledDate: '',
          });
        }
      } else {
        const res = await payBill(user.id, {
          payeeName: form.billerName,
          category: form.payeeCategory,
          customerRef: form.customerRef,
          amountKobo,
        });
        if (res.ok) {
          toast.success(`Paid ${formatCurrency(amountKobo)} for ${form.billerName}!`);
          await refreshData();
          await loadBillData();
          setForm({
            payeeCategory: 'Electricity',
            billerName: 'EKEDC Electricity',
            customerRef: '',
            amount: '',
            isScheduled: false,
            scheduledDate: '',
          });
        } else {
          setError(res.error || 'Failed to pay bill.');
        }
      }
    } catch (err) {
      setError(err.message || 'Error executing bill payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bills-page animate-fade-in">
      <div className="bills-container">
        <div className="bills-header">
          <h1 className="text-gradient">Bills & Utilities</h1>
          <p className="bills-subtitle">Pay your electricity, internet, cable TV, and airtime seamlessly with automated scheduler support.</p>
        </div>

        {/* TABS */}
        <div className="bills-tabs glass">
          <button className={`tab-btn ${activeTab === 'pay' ? 'active' : ''}`} onClick={() => setActiveTab('pay')}>
            <Zap size={18} /> Pay a Bill
          </button>
          <button className={`tab-btn ${activeTab === 'scheduled' ? 'active' : ''}`} onClick={() => setActiveTab('scheduled')}>
            <Clock size={18} /> Scheduled Payments ({scheduledBills.filter((b) => b.status === 'pending').length})
          </button>
        </div>

        {activeTab === 'pay' && (
          <div className="bills-content-grid">
            {/* BILL FORM */}
            <div className="bill-form-card glass">
              <h2>Select Biller & Enter Details</h2>

              {error && (
                <div className="auth-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handlePayBill} className="bills-form">
                <div className="input-field">
                  <label>Category</label>
                  <div className="biller-categories">
                    {[
                      { cat: 'Electricity', name: 'EKEDC Electricity', icon: Zap },
                      { cat: 'Internet', name: 'Fiber / Spectranet Internet', icon: Wifi },
                      { cat: 'CableTV', name: 'DSTV / Gotv Cable', icon: Tv },
                      { cat: 'Airtime', name: 'MTN / Airtel Airtime', icon: Phone },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.cat}
                          type="button"
                          className={`cat-btn ${form.payeeCategory === item.cat ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, payeeCategory: item.cat, billerName: item.name })}
                        >
                          <Icon size={20} />
                          <span>{item.cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="input-field">
                  <label>Biller Provider</label>
                  <input type="text" name="billerName" value={form.billerName} onChange={handleChange} required />
                </div>

                <div className="input-field">
                  <label>Customer Account / Meter / Phone Number</label>
                  <input
                    type="text"
                    name="customerRef"
                    placeholder="e.g. 041928374921 or 08012345678"
                    value={form.customerRef}
                    onChange={handleChange}
                    required
                  />
                </div>

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
                  />
                </div>

                <div className="input-field schedule-toggle">
                  <label className="checkbox-label flex-center" style={{ gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="isScheduled"
                      checked={form.isScheduled}
                      onChange={handleChange}
                    />
                    <span>Schedule this bill for a future date</span>
                  </label>
                </div>

                {form.isScheduled && (
                  <div className="input-field">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={form.scheduledDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary auth-submit flex-center" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="auth-spinner"></span>
                  ) : form.isScheduled ? (
                    'Schedule Bill Payment'
                  ) : (
                    'Pay Bill Now'
                  )}
                </button>
              </form>
            </div>

            {/* BILL QUICK SAVED PAYEES */}
            <div className="payees-side-card glass">
              <h3>Saved Biller Templates</h3>
              <div className="biller-templates">
                {payees.map((p) => {
                  const Icon = CATEGORY_ICONS[p.category] || Zap;
                  return (
                    <div
                      key={p.id}
                      className="biller-template-item"
                      onClick={() =>
                        setForm({
                          ...form,
                          payeeCategory: p.category,
                          billerName: p.name,
                          customerRef: p.accountNumber,
                        })
                      }
                    >
                      <div className="biller-icon">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="biller-title">{p.name}</p>
                        <p className="biller-sub">{p.accountNumber}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="scheduled-bills-section glass">
            <h2>Scheduled Utility Payments</h2>
            {scheduledBills.length === 0 ? (
              <p className="empty-state">No scheduled bills yet.</p>
            ) : (
              <table className="scheduled-table">
                <thead>
                  <tr>
                    <th>Biller</th>
                    <th>Category</th>
                    <th>Ref #</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledBills.map((b) => (
                    <tr key={b.id}>
                      <td>{b.payeeName}</td>
                      <td>{b.category}</td>
                      <td>{b.customerRef}</td>
                      <td>{formatCurrency(b.amountKobo)}</td>
                      <td>{b.scheduledDate}</td>
                      <td>
                        <span className={`status-badge ${b.status}`}>{b.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BillsPage;
