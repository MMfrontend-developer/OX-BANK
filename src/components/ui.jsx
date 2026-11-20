/**
 * ui.jsx — shared building blocks for the banking app.
 */
import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import {
  X, AlertCircle, CheckCircle2, Info, ArrowDownLeft, ArrowUpRight, PiggyBank, Repeat, Zap,
  ShoppingBag, Utensils, Car, Smartphone, Tv, Wifi, Banknote, Wallet,
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

/* ---------- Privacy (hide balances) ---------- */
const PrivacyContext = createContext({ hidden: false, toggle: () => {} });

export function PrivacyProvider({ initialHidden = false, children }) {
  const [hidden, setHidden] = useState(initialHidden);
  useEffect(() => setHidden(initialHidden), [initialHidden]);
  return (
    <PrivacyContext.Provider value={{ hidden, toggle: () => setHidden((h) => !h) }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePrivacy = () => useContext(PrivacyContext);

/** Formats kobo; masks when the customer has hidden balances. */
export function Money({ kobo, sign = false, type, mask = true, className = '' }) {
  const { hidden } = usePrivacy();
  if (mask && hidden) return <span className={className} aria-label="Hidden amount">₦ ••••••</span>;
  const prefix = sign ? (type === 'credit' ? '+' : '−') : '';
  return <span className={className}>{prefix}{formatCurrency(kobo)}</span>;
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, wide = false, labelledBy }) {
  const ref = useRef(null);
  const autoId = useId();
  const titleId = labelledBy || autoId;

  useEffect(() => {
    const prev = document.activeElement;
    const node = ref.current;
    const first = node?.querySelector('input, select, textarea, button:not([data-close])');
    (first || node)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && node) {
        const f = node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const a = f[0];
        const z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bk-modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={ref} tabIndex={-1} className={`bk-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {title && (
          <div className="bk-modal-head">
            <h2 id={titleId}>{title}</h2>
            {onClose && (
              <button type="button" className="bk-icon-btn" onClick={onClose} aria-label="Close" data-close>
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------- Alerts ---------- */
export function Alert({ kind = 'error', children }) {
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  return (
    <div className={`bk-alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}

/* ---------- PIN entry ---------- */
export function PinPad({ onComplete, error, disabled }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef([]);

  useEffect(() => {
    if (error) {
      setDigits(['', '', '', '']);
      refs.current[0]?.focus();
    }
  }, [error]);

  const set = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 3) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) onComplete(next.join(''));
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (text.length === 4) {
      e.preventDefault();
      setDigits(text.split(''));
      onComplete(text);
    }
  };

  return (
    <div className="bk-pin" role="group" aria-label="Transaction PIN">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`PIN digit ${i + 1}`}
          onChange={(e) => set(i, e.target.value.slice(-1))}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
          onPaste={onPaste}
        />
      ))}
    </div>
  );
}

/**
 * PIN confirmation modal. `onConfirm(pin)` should return a promise resolving
 * to { ok, error }. Errors (wrong PIN, lockout) are shown inline.
 */
export function PinModal({ title = 'Enter transaction PIN', subtitle, onConfirm, onCancel }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (pin) => {
    setBusy(true);
    setError('');
    const res = await onConfirm(pin);
    setBusy(false);
    if (res && !res.ok) setError(res.error || 'Verification failed.');
  };

  return (
    <Modal title={title} onClose={busy ? undefined : onCancel}>
      {subtitle && <p className="bk-muted bk-center" style={{ marginBottom: 12 }}>{subtitle}</p>}
      <PinPad onComplete={submit} error={error} disabled={busy} />
      <div className="bk-center" style={{ minHeight: 28, marginTop: 10 }}>
        {busy ? <span className="bk-spinner" style={{ color: 'var(--bk-primary)' }} aria-label="Verifying" /> : error ? <p className="bk-hint err" role="alert">{error}</p> : <p className="bk-subtle">Your PIN is never shown or stored in plain text.</p>}
      </div>
    </Modal>
  );
}

/* ---------- Inputs ---------- */
export function AmountInput({ id, value, onChange, placeholder = '0.00', autoFocus, ...rest }) {
  return (
    <div className="bk-amount-input">
      <span aria-hidden="true">₦</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d.]/g, '');
          if (/^\d*\.?\d{0,2}$/.test(v)) onChange(v);
        }}
        {...rest}
      />
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className="bk-switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

export function Empty({ icon: Icon = Wallet, children }) {
  return (
    <div className="bk-empty">
      <Icon size={28} />
      <p>{children}</p>
    </div>
  );
}

export function Spinner() {
  return <span className="bk-spinner" aria-label="Loading" />;
}

/* ---------- Transactions ---------- */
const CATEGORY_ICONS = {
  Savings: PiggyBank,
  'Internal Transfer': Repeat,
  Electricity: Zap,
  Utilities: Zap,
  Shopping: ShoppingBag,
  Groceries: ShoppingBag,
  Dining: Utensils,
  Transport: Car,
  Airtime: Smartphone,
  Data: Smartphone,
  'Cable TV': Tv,
  Netflix: Tv,
  Subscriptions: Tv,
  Internet: Wifi,
  Salary: Banknote,
  Freelance: Banknote,
};

export function TxIcon({ tx }) {
  const Icon = CATEGORY_ICONS[tx.category] || (tx.type === 'credit' ? ArrowDownLeft : ArrowUpRight);
  return (
    <span className={`bk-tx-icon ${tx.type}`} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}

export function TxRow({ tx, onClick, showDate = false }) {
  const when = new Date(tx.createdAt);
  const time = showDate
    ? when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <button type="button" className="bk-item" onClick={() => onClick?.(tx)} aria-label={`${tx.note}, ${tx.type === 'credit' ? 'credit' : 'debit'} ${formatCurrency(tx.amount)}`}>
      <TxIcon tx={tx} />
      <div className="bk-item-main">
        <div className="bk-item-title">{tx.note || tx.category}</div>
        <div className="bk-item-sub">{tx.category} · {tx.accountType} · {time}</div>
      </div>
      <div className="bk-item-end">
        <Money kobo={tx.amount} sign type={tx.type} className={`bk-amt ${tx.type}`} />
      </div>
    </button>
  );
}
