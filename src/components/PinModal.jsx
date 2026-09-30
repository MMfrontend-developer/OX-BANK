/**
 * PinModal.jsx
 * Overlay that prompts for a 4-digit transaction PIN.
 * Used before high-value transfers and card detail reveals.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Lock, X } from 'lucide-react';

const PinModal = ({ onConfirm, onCancel, loading = false, title = 'Enter Transaction PIN' }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = pin.join('');
    if (code.length !== 4) {
      setError('Please enter all 4 digits.');
      return;
    }
    onConfirm(code);
  };

  const handleError = (msg) => {
    setError(msg);
    setPin(['', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-content glass pin-modal" role="dialog" aria-modal="true" aria-labelledby="pin-modal-title">
        <div className="modal-header">
          <h2 id="pin-modal-title" className="flex-center" style={{ gap: '8px' }}>
            <Lock size={20} color="var(--primary)" /> {title}
          </h2>
          <button onClick={onCancel} className="close-btn" aria-label="Cancel">
            <X size={20} />
          </button>
        </div>

        <p className="pin-hint">Enter your 4-digit transaction PIN to continue.</p>

        <form onSubmit={handleSubmit} className="pin-form">
          <div className="pin-inputs" role="group" aria-label="PIN digits">
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="pin-digit"
                aria-label={`PIN digit ${i + 1}`}
                autoComplete="off"
              />
            ))}
          </div>

          {error && (
            <p className="pin-error" role="alert">{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary modal-submit flex-center"
            disabled={loading || pin.join('').length < 4}
          >
            {loading ? <span className="auth-spinner" /> : 'Confirm'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PinModal;
