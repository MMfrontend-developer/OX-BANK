/**
 * SessionGuard — signs the customer out after a period of inactivity
 * (configurable in Profile → Preferences), with a 60-second warning.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from './ui';

const WARNING_MS = 60_000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

export default function SessionGuard() {
  const { isLoggedIn, logout, settings } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const timeoutMs = (settings.idleTimeoutMin || 5) * 60_000;

  const lastActive = useRef(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(null);
  const warning = useRef(false);
  warning.current = secondsLeft !== null;

  const signOut = useCallback(() => {
    setSecondsLeft(null);
    logout();
    toast.info('You were signed out after a period of inactivity.');
    navigate('/Login', { replace: true });
  }, [logout, navigate, toast]);

  const stay = () => {
    lastActive.current = Date.now();
    setSecondsLeft(null);
  };

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    lastActive.current = Date.now();
    const mark = () => {
      // Activity only counts before the warning appears; then the user must choose.
      if (!warning.current) lastActive.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const tick = setInterval(() => {
      const idle = Date.now() - lastActive.current;
      if (idle >= timeoutMs) signOut();
      else if (idle >= timeoutMs - WARNING_MS) setSecondsLeft(Math.ceil((timeoutMs - idle) / 1000));
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
      clearInterval(tick);
    };
  }, [isLoggedIn, timeoutMs, signOut]);

  if (secondsLeft === null) return null;

  return (
    <Modal title="Are you still there?" onClose={stay}>
      <div className="bk-center">
        <Clock size={36} style={{ color: 'var(--bk-primary)', marginBottom: 8 }} />
        <p className="bk-muted">
          For your security you'll be signed out in <strong className="bk-mono">{secondsLeft}s</strong>.
        </p>
      </div>
      <div className="bk-modal-foot">
        <button type="button" className="bk-btn ghost" onClick={signOut}>Sign out</button>
        <button type="button" className="bk-btn" onClick={stay}>Stay signed in</button>
      </div>
    </Modal>
  );
}
