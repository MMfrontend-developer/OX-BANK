import React, { useState } from 'react';
import Footer from './Footer';
import './assets/Style.css/Dashboard.css';
import { Link } from 'react-router-dom';

const EyeIcon = ({ visible }) => (
  visible ? (
    <svg width="32" height="38" viewBox="0 0 24 24" fill="none"
      stroke="#551A8B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ) : (
    <svg width="32" height="38" viewBox="0 0 24 24" fill="none"
      stroke="#551A8B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
);

const user = JSON.parse(localStorage.getItem('signupData')) || { name: 'User' };

const initialTransactions = [
  { id: 1, type: 'credit', amount: 500, note: 'Salary', date: '2025-05-28' },
  { id: 2, type: 'debit', amount: 120, note: 'Groceries', date: '2025-05-27' },
  { id: 3, type: 'debit', amount: 60, note: 'Utilities', date: '2025-05-26' },
  { id: 4, type: 'credit', amount: 200, note: 'Transfer', date: '2025-05-25' },
];

const Dashboard = () => {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [balance, setBalance] = useState(10000);
  const [form, setForm] = useState({
    recipientAccount: '',
    recipient: '',
    amount: '',
    note: ''
  });
  const [showBalance, setShowBalance] = useState(true);

  // Generate or retrieve account number
  const [accountNumber] = useState(() => {
    let acc = localStorage.getItem('accountNumber');
    if (!acc) {
      acc = '23' + Math.floor(100000000 + Math.random() * 900000000); // 10-digit number starting with 23
      localStorage.setItem('accountNumber', acc);
    }
    return acc;
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.recipientAccount || !form.recipient || !amount || amount <= 0) {
      alert('Please enter a valid recipient account, name, and amount.');
      return;
    }
    if (amount > balance) {
      alert('Insufficient balance.');
      return;
    }
    const newTransaction = {
      id: transactions.length + 1,
      type: 'debit',
      amount,
      note: form.note || 'Transfer',
      date: new Date().toISOString().slice(0, 10),
    };
    setTransactions([newTransaction, ...transactions]);
    setBalance(balance - amount);
    setForm({
      recipientAccount: '',
      recipient: '',
      amount: '',
      note: ''
    });
  };

  return (
    <div>
      <section className="dashboard-section">
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Welcome, {user.name}!</h1>
            <Link to={'/Logout'}>
              <button className="bttn logout-btn">Logout</button>
            </Link>
          </div>
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h2 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                Account Balance
                <span
                  onClick={() => setShowBalance((prev) => !prev)}
                  style={{
                    cursor: "pointer",
                    marginLeft: "10px",
                    display: "flex",
                    alignItems: "center"
                  }}
                  tabIndex={0}
                  aria-label={showBalance ? "Hide balance" : "Show balance"}
                >
                  <EyeIcon visible={showBalance} />
                </span>
              </h2>
              <p className="balance">
                {showBalance ? `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "••••••••"}
              </p>
              <div className="account-number">
                <strong>Account Number:</strong> {accountNumber}
              </div>
            </div>
            <div className="dashboard-card">
              <h2>Transfer Money</h2>
              <form className="transfer-form" onSubmit={handleTransfer}>
                <input
                  type="text"
                  name="recipientAccount"
                  className="dashboard-input"
                  placeholder="Recipient Account Number"
                  value={form.recipientAccount}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="recipient"
                  className="dashboard-input"
                  placeholder="Recipient Name"
                  value={form.recipient}
                  onChange={handleChange}
                  required
                />
                <input
                  type="number"
                  name="amount"
                  className="dashboard-input"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  min="1"
                />
                <input
                  type="text"
                  name="note"
                  className="dashboard-input"
                  placeholder="Note (optional)"
                  value={form.note}
                  onChange={handleChange}
                />
                <button type="submit">Send</button>
              </form>
            </div>
            <div className="dashboard-card">
              <h2>Recent Transactions</h2>
              <ul className="transactions">
                {transactions.map((tx) => (
                  <li key={tx.id} className={tx.type}>
                    <span>
                      {tx.type === 'credit' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span>{tx.note}</span>
                    <span className="date">{tx.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Dashboard;