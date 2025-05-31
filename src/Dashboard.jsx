import React, { useState } from 'react';
import Footer from './Footer';
import './assets/Style.css/Dashboard.css';
import { Link } from 'react-router-dom';

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
  const [form, setForm] = useState({ recipient: '', amount: '', note: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.recipient || !amount || amount <= 0) {
      alert('Please enter a valid recipient and amount.');
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
    setForm({ recipient: '', amount: '', note: '' });
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
              <h2>Account Balance</h2>
              <p className="balance">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="dashboard-card">
              <h2>Transfer Money</h2>
              <form className="transfer-form" onSubmit={handleTransfer}>
                <input
                  type="text"
                  name="recipient"
                  placeholder="Recipient"
                  value={form.recipient}
                  onChange={handleChange}
                  required
                />
                <input
                  type="number"
                  name="amount"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  min="1"
                />
                <input
                  type="text"
                  name="note"
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
                      {tx.type === 'credit' ? '+' : '-'}${tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
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