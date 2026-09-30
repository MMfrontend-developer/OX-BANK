import React, { useState, useMemo } from 'react';
import Footer from './Footer';
import './assets/Style.css/Transactions.css';
import { useData } from './context/DataContext';
import { useToast } from './context/ToastContext';
import { formatCurrency, koboToNaira } from './utils/currency';
import { ArrowUpRight, ArrowDownLeft, Search, Download, Calendar } from 'lucide-react';

const CATEGORIES = ['All', 'Income', 'Shopping', 'Bills', 'Transfer', 'Subscriptions', 'Refund', 'Other'];

const Transactions = () => {
  const { transactions, loading } = useData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.note?.toLowerCase().includes(search.toLowerCase()) ||
        tx.category?.toLowerCase().includes(search.toLowerCase()) ||
        tx.id?.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === 'All' || tx.category === activeCategory;
      const matchType = typeFilter === 'all' || tx.type === typeFilter;
      return matchSearch && matchCat && matchType;
    });
  }, [transactions, search, activeCategory, typeFilter]);

  const totalIn = filtered.filter((t) => t.type === 'credit').reduce((a, t) => a + t.amountKobo, 0);
  const totalOut = filtered.filter((t) => t.type === 'debit').reduce((a, t) => a + t.amountKobo, 0);
  const net = totalIn - totalOut;

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.warning('No transactions to export.');
      return;
    }

    const headers = ['Date', 'Transaction ID', 'Description', 'Category', 'Type', 'Amount (NGN)', 'Balance After (NGN)'];
    const rows = filtered.map((tx) => [
      tx.date ? new Date(tx.date).toLocaleString() : '',
      `"${tx.id}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
      `"${tx.category || 'General'}"`,
      tx.type.toUpperCase(),
      (tx.type === 'debit' ? -1 : 1) * koboToNaira(tx.amountKobo),
      koboToNaira(tx.balanceAfterKobo || 0),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OXBANK_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Transaction history CSV downloaded!');
  };

  return (
    <div className="transactions-page animate-fade-in">
      <div className="transactions-container">
        <div className="transactions-header">
          <div>
            <h1 className="text-gradient">Transaction Statement</h1>
            <p className="tx-subtitle">A complete audit ledger of all account activity.</p>
          </div>
          <button className="btn btn-primary flex-center" onClick={exportCSV} style={{ gap: '8px' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className="tx-summary-row">
          <div className="tx-summary-card glass">
            <span className="tx-summary-label">Total Inflow</span>
            <span className="tx-summary-amount credit">+{formatCurrency(totalIn)}</span>
          </div>
          <div className="tx-summary-card glass">
            <span className="tx-summary-label">Total Outflow</span>
            <span className="tx-summary-amount debit">-{formatCurrency(totalOut)}</span>
          </div>
          <div className="tx-summary-card glass">
            <span className="tx-summary-label">Net Difference</span>
            <span className={`tx-summary-amount ${net >= 0 ? 'credit' : 'debit'}`}>
              {net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(net))}
            </span>
          </div>
        </div>

        <div className="tx-filters glass">
          <div className="tx-search-wrapper">
            <Search size={18} className="tx-search-icon" />
            <input
              type="text"
              placeholder="Search by note, category, or ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="tx-search-input"
            />
          </div>
          <div className="tx-type-filter">
            {['all', 'credit', 'debit'].map((t) => (
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
          {CATEGORIES.map((cat) => (
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
          {loading ? (
            <p className="tx-empty">Loading transactions...</p>
          ) : filtered.length === 0 ? (
            <p className="tx-empty">No transactions match your filters.</p>
          ) : (
            filtered.map((tx) => (
              <div key={tx.id} className="tx-full-item">
                <div className={`tx-icon ${tx.type}`}>
                  {tx.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div className="tx-details">
                  <p className="tx-note">{tx.note}</p>
                  <p className="tx-category">
                    {tx.category || 'General'} • {tx.date ? new Date(tx.date).toLocaleString() : 'Recent'}
                  </p>
                </div>
                <div className="tx-amount-col">
                  <div className={`tx-amount ${tx.type}`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amountKobo)}
                  </div>
                  <span className="tx-balance-after">
                    Bal: {formatCurrency(tx.balanceAfterKobo || 0)}
                  </span>
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
