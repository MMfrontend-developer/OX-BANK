/**
 * TxDetailModal — full details for one ledger entry, with a printable receipt.
 */
import React, { useState } from 'react';
import { Copy, Printer, Check } from 'lucide-react';
import { Modal, TxIcon } from './ui';
import { formatCurrency } from '../utils/currency';
import { printReceipt } from '../utils/documents';
import { useAuth } from '../AuthContext';
import { useToast } from '../context/ToastContext';

export default function TxDetailModal({ tx, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyRef = () => {
    navigator.clipboard?.writeText(tx.reference).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const rows = [
    ['Status', <span className="bk-badge good" key="s"><Check size={12} /> Successful</span>],
    ['Date', new Date(tx.createdAt).toLocaleString()],
    ['Category', tx.category],
    ['Account', `${tx.accountType || ''} · ${tx.accountNumber || ''}`],
    tx.counterpartName && [tx.type === 'credit' ? 'From' : 'To', `${tx.counterpartName}${tx.counterpartAccount ? ` · ${tx.counterpartAccount}` : ''}`],
    ['Balance after', formatCurrency(tx.balanceAfter)],
    ['Reference', (
      <span key="r" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="bk-mono">{tx.reference}</span>
        <button type="button" className="bk-copy" onClick={copyRef} aria-label="Copy reference">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </span>
    )],
  ].filter(Boolean);

  return (
    <Modal title="Transaction details" onClose={onClose}>
      <div className="bk-center" style={{ marginBottom: 16 }}>
        <div style={{ display: 'inline-block', marginBottom: 8 }}><TxIcon tx={tx} /></div>
        <div className={`bk-big-amount bk-amt ${tx.type}`}>
          {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
        </div>
        <p className="bk-muted">{tx.note || tx.category}</p>
      </div>
      <dl className="bk-summary">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <div className="bk-modal-foot">
        <button type="button" className="bk-btn ghost" onClick={onClose}>Close</button>
        <button
          type="button"
          className="bk-btn"
          onClick={() => { if (!printReceipt(tx, user)) toast.error('Allow pop-ups to download the receipt.'); }}
        >
          <Printer size={16} /> Receipt
        </button>
      </div>
    </Modal>
  );
}
