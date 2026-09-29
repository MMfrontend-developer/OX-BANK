import React, { useState, useMemo } from 'react';
import Footer from './Footer';
import './assets/Style.css/Transactions.css';
import { ArrowUpRight, ArrowDownLeft, Search, Filter, Download } from 'lucide-react';

const ALL_TRANSACTIONS = [
  { id: 1, type: 'credit', amount: 500, note: 'Salary', date: '2025-05-28', category: 'Income' },
  { id: 2, type: 'debit', amount: 120, note: 'Groceries', date: '2025-05-27', category: 'Shopping' },
  { id: 3, type: 'debit', amount: 60, note: 'Utilities', date: '2025-05-26', category: 'Bills' },
  { id: 4, type: 'credit', amount: 200, note: 'Transfer', date: '2025-05-25', category: 'Transfer' },
  { id: 5, type: 'debit', amount: 35, note: 'Netflix', date: '2025-05-24', category: 'Subscriptions' },
  { id: 6, type: 'debit', amount: 89, note: 'Electricity Bill', date: '2025-05-23', category: 'Bills' },
  { id: 7, type: 'credit', amount: 1500, note: 'Freelance Payment', date: '2025-05-22', category: 'Income' },
  { id: 8, type: 'debit', amount: 250, note: 'Online Shopping', date: '2025-05-21', category: 'Shopping' },
  { id: 9, type: 'debit', amount: 15, note: 'Spotify', date: '2025-05-20', category: 'Subscriptions' },
  { id: 10, type: 'credit', amount: 75, note: 'Refund', date: '2025-05-19', category: 'Refund' },
];

const CATEGORIES = ['All', 'Income', 'Shopping', 'Bills', 'Transfer', 'Subscriptions', 'Refund'];

const Transactions = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return ALL_TRANSACTIONS.filter(tx => {
      const matchSearch = tx.note.toLowerCase().includes(search.toLowerCase()) ||
        tx.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === 'All' || tx.category === activeCategory;
      const matchType = typeFilter === 'all' || tx.type === typeFilter;
      return matchSearch && matchCat && matchType;
    });
  }, [search, activeCategory, typeFilter]);

  const totalIn = filtered.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
  const totalOut = filtered.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0);

  return (
    <div className="transactions-page animate-fade-in">
      <div className="transactions-container">
        <div className="transactions-header">
          <div>
            <h1 className="text-gradient">Transaction History</h1>
            <p className="tx-subtitle">A complete record of all your account activity.</p>
          </div>
          <button className="btn btn-primary flex-center" style={{ gap: '8px' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className="tx-summary-row">
          <div className="tx-summary-card glass">
            <span className="tx-summary-label">Money In</span>
            <span className="tx-summary-amount credit">+${totalIn.toLocaleString()}</span>
          </div>
          <div className="tx-summary-card glass">
            <span className="tx-summary-label">Money Out</span>
            <span className="tx-summary-amount debit">-${totalOut.toLocaleString()}</span>
          </div>
          <div className="tx-summary-card glass">
            <span className="tx-summary-label">Net</span>
            <span className={`tx-summary-amount ${totalIn - totalOut >= 0 ? 'credit' : 'debit'}`}>
              {totalIn - totalOut >= 0 ? '+' : '-'}${Math.abs(totalIn - totalOut).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="tx-filters glass">
          <div className="tx-search-wrapper">
            <Search size={18} className="tx-search-icon" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="tx-search-input"
            />
          </div>
          <div className="tx-type-filter">
            {['all', 'credit', 'debit'].map(t => (
              <button
                key={t}
                className={`type-pill ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All' : t === 'credit' ? 'Money In' : 'Money Out'}
              </button>
            ))}
          </div>
        </div>

        <div className="category-pills">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="tx-full-list glass">
          {filtered.length === 0 ? (
            <p className="tx-empty">No transactions match your filters.</p>
          ) : (
            filtered.map(tx => (
              <div key={tx.id} className="tx-full-item">
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
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Transactions;
