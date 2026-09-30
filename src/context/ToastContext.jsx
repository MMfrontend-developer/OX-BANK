/**
 * ToastContext.jsx
 * Global toast notification system.
 * Toasts are displayed in an aria-live region for accessibility.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success('Transfer complete!');
 *   toast.error('Insufficient funds.');
 *   toast.info('Processing…');
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let _idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_idCounter;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // max 5 toasts
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, dur) => push(msg, 'success', dur),
    error: (msg, dur) => push(msg, 'error', dur || 5000),
    info: (msg, dur) => push(msg, 'info', dur),
    warning: (msg, dur) => push(msg, 'warning', dur),
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// ─── Toast UI ───────────────────────────────────────────────

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

function ToastContainer({ toasts, dismiss }) {
  return (
    <div
      className="toast-container"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-msg">{t.message}</span>
          <button
            className="toast-close"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
