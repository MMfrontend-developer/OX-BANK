import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, Lock, Clock, Monitor, CheckCircle2, XCircle, RotateCcw, Landmark, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useData } from './context/DataContext';
import { useToast } from './context/ToastContext';
import { authService } from './services/authService';
import { accountService } from './services/accountService';
import { Alert, Modal, Switch, Money } from './components/ui';
import { timeAgo } from './utils/insights';

function PasswordInput({ id, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="bk-has-action" />
      <button type="button" className="bk-copy" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function PersonalSection({ user, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = form.name !== user.name || form.email !== user.email || form.phone !== (user.phone || '');

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid email address.');
    setBusy(true);
    const res = await authService.updateProfile(user.id, form);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success('Profile updated.');
    onSaved();
  };

  return (
    <section className="bk-card" aria-labelledby="pi-h">
      <div className="bk-card-head"><h2 id="pi-h"><User size={18} style={{ verticalAlign: '-3px' }} /> Personal details</h2></div>
      <form className="bk-form" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="bk-field"><label htmlFor="p-name">Full name</label><input id="p-name" autoComplete="name" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }} /></div>
        <div className="bk-row-2">
          <div className="bk-field"><label htmlFor="p-email">Email</label><input id="p-email" type="email" autoComplete="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }} /></div>
          <div className="bk-field"><label htmlFor="p-phone">Phone</label><input id="p-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div><button type="submit" className="bk-btn" disabled={!dirty || busy}>{busy ? <span className="bk-spinner" /> : 'Save changes'}</button></div>
      </form>
    </section>
  );
}

function PasswordSection({ userId }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const checks = [
    [form.next.length >= 8, '8+ characters'],
    [/[A-Z]/.test(form.next), 'Uppercase letter'],
    [/[0-9]/.test(form.next), 'Number'],
    [/[^A-Za-z0-9]/.test(form.next), 'Symbol'],
  ];

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) return setError('New passwords do not match.');
    setBusy(true);
    const res = await authService.changePassword(userId, { currentPassword: form.current, newPassword: form.next });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success('Password changed.');
    setForm({ current: '', next: '', confirm: '' });
  };

  return (
    <form className="bk-form" onSubmit={submit}>
      <h3 style={{ fontSize: '0.95rem' }}><Lock size={16} style={{ verticalAlign: '-3px' }} /> Change password</h3>
      {error && <Alert>{error}</Alert>}
      <div className="bk-field"><label htmlFor="pw-cur">Current password</label><PasswordInput id="pw-cur" autoComplete="current-password" value={form.current} onChange={(v) => { setForm({ ...form, current: v }); setError(''); }} /></div>
      <div className="bk-row-2">
        <div className="bk-field"><label htmlFor="pw-new">New password</label><PasswordInput id="pw-new" autoComplete="new-password" value={form.next} onChange={(v) => { setForm({ ...form, next: v }); setError(''); }} /></div>
        <div className="bk-field"><label htmlFor="pw-conf">Confirm new password</label><PasswordInput id="pw-conf" autoComplete="new-password" value={form.confirm} onChange={(v) => { setForm({ ...form, confirm: v }); setError(''); }} /></div>
      </div>
      {form.next && (
        <div className="bk-chips">
          {checks.map(([ok, label]) => <span key={label} className={`bk-badge ${ok ? 'good' : ''}`}>{ok ? '✓' : '·'} {label}</span>)}
        </div>
      )}
      <div><button type="submit" className="bk-btn" disabled={busy || !form.current || !form.next}>{busy ? <span className="bk-spinner" /> : 'Update password'}</button></div>
    </form>
  );
}

function PinSection({ userId }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = (k) => (e) => { setForm({ ...form, [k]: e.target.value.replace(/\D/g, '').slice(0, 4) }); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) return setError('New PINs do not match.');
    setBusy(true);
    const res = await authService.changePin(userId, { currentPin: form.current, newPin: form.next });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success('Transaction PIN changed.');
    setForm({ current: '', next: '', confirm: '' });
  };

  return (
    <form className="bk-form" onSubmit={submit}>
      <h3 style={{ fontSize: '0.95rem' }}><KeyRound size={16} style={{ verticalAlign: '-3px' }} /> Change transaction PIN</h3>
      <p className="bk-subtle">Used to authorize transfers and reveal card details. New accounts start with 0000 unless a PIN was chosen at sign-up.</p>
      {error && <Alert>{error}</Alert>}
      <div className="bk-grid-3" style={{ gap: 12 }}>
        {[['current', 'Current PIN'], ['next', 'New PIN'], ['confirm', 'Confirm PIN']].map(([k, label]) => (
          <div key={k} className="bk-field">
            <label htmlFor={`pin-${k}`}>{label}</label>
            <input id={`pin-${k}`} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={form[k]} onChange={digits(k)} />
          </div>
        ))}
      </div>
      <div><button type="submit" className="bk-btn" disabled={busy || form.current.length < 4 || form.next.length < 4}>{busy ? <span className="bk-spinner" /> : 'Update PIN'}</button></div>
    </form>
  );
}

export default function Profile() {
  const { user, refreshUser, settings, updateSettings } = useAuth();
  const { accounts, resetDemoData, refresh } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const activity = authService.getLoginActivity(user.id).slice(0, 8);
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const missingTypes = ['Checking', 'Savings'].filter((t) => !accounts.some((a) => a.type === t));

  const saveSetting = async (patch, msg) => {
    const res = await updateSettings(patch);
    if (!res.ok) return toast.error(res.error);
    toast.success(msg);
  };

  const openAccount = async (type) => {
    const res = await accountService.openAccount(user.id, type);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${type} account opened: ${res.account.number}.`);
    refresh();
  };

  const reset = async () => {
    await resetDemoData();
    toast.success('Demo data reset. Sign in again to continue.');
    navigate('/Login', { replace: true });
  };

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="bk-avatar lg">{initials}</span>
          <div>
            <h1>{user.name}</h1>
            <p>{user.email} · {user.role === 'admin' ? 'Administrator' : 'Personal customer'} since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="bk-grid">
        <div className="bk-stack">
          <PersonalSection key={user.email + user.name + (user.phone || '')} user={user} onSaved={refreshUser} />

          <section className="bk-card bk-stack" aria-labelledby="sec-h" style={{ gap: 24 }}>
            <div className="bk-card-head" style={{ marginBottom: 0 }}><h2 id="sec-h">Security</h2></div>
            <PasswordSection userId={user.id} />
            <hr style={{ border: 0, borderTop: '1px solid var(--bk-border)' }} />
            <PinSection userId={user.id} />
          </section>
        </div>

        <div className="bk-stack">
          <section className="bk-card" aria-labelledby="pref-h">
            <div className="bk-card-head"><h2 id="pref-h">Preferences</h2></div>
            <div className="bk-setting">
              <span className="bk-tx-icon"><Clock size={18} /></span>
              <div className="bk-setting-main">
                <div className="bk-setting-title">Auto sign-out</div>
                <div className="bk-setting-sub">After inactivity</div>
              </div>
              <div className="bk-field" style={{ width: 120 }}>
                <label htmlFor="idle" className="bk-sr-only">Auto sign-out time</label>
                <select id="idle" value={settings.idleTimeoutMin} onChange={(e) => saveSetting({ idleTimeoutMin: Number(e.target.value) }, 'Auto sign-out updated.')}>
                  {[2, 5, 10, 15, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
            <div className="bk-setting">
              <span className="bk-tx-icon"><EyeOff size={18} /></span>
              <div className="bk-setting-main">
                <div className="bk-setting-title">Hide balances by default</div>
                <div className="bk-setting-sub">Tap the eye in the top bar to reveal</div>
              </div>
              <Switch label="Hide balances by default" checked={settings.hideBalances} onChange={(v) => saveSetting({ hideBalances: v }, v ? 'Balances will be hidden by default.' : 'Balances will be shown.')} />
            </div>
            <div className="bk-setting">
              <span className="bk-tx-icon"><Lock size={18} /></span>
              <div className="bk-setting-main">
                <div className="bk-setting-title">Sign-in alerts</div>
                <div className="bk-setting-sub">Notify me on every new sign-in</div>
              </div>
              <Switch label="Sign-in alerts" checked={settings.loginAlerts} onChange={(v) => saveSetting({ loginAlerts: v }, `Sign-in alerts ${v ? 'on' : 'off'}.`)} />
            </div>
          </section>

          <section className="bk-card" aria-labelledby="acc-h">
            <div className="bk-card-head"><h2 id="acc-h">Accounts</h2></div>
            <div className="bk-list">
              {accounts.map((a) => (
                <div key={a.id} className="bk-item">
                  <span className="bk-tx-icon"><Landmark size={18} /></span>
                  <div className="bk-item-main">
                    <div className="bk-item-title">{a.type}</div>
                    <div className="bk-item-sub bk-mono">{a.number} · opened {new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Money kobo={a.balance} className="bk-amt" />
                </div>
              ))}
            </div>
            {missingTypes.map((t) => (
              <button key={t} type="button" className="bk-btn ghost block" style={{ marginTop: 10 }} onClick={() => openAccount(t)}>Open a {t} account</button>
            ))}
          </section>

          <section className="bk-card" aria-labelledby="act-h">
            <div className="bk-card-head"><h2 id="act-h">Recent sign-ins</h2></div>
            {activity.length === 0 ? (
              <p className="bk-subtle">No sign-in history yet.</p>
            ) : (
              <div className="bk-list">
                {activity.map((a) => (
                  <div key={a.id} className="bk-item">
                    <span className={`bk-tx-icon${a.success ? ' credit' : ''}`}>{a.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}</span>
                    <div className="bk-item-main">
                      <div className="bk-item-title">{a.success ? 'Successful sign-in' : 'Failed attempt'}</div>
                      <div className="bk-item-sub" title={a.device}><Monitor size={11} style={{ verticalAlign: '-1px' }} /> {a.device?.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/)?.[0] || 'Browser'}</div>
                    </div>
                    <span className="bk-subtle" title={new Date(a.timestamp).toLocaleString()}>{timeAgo(a.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bk-card" aria-labelledby="demo-h">
            <div className="bk-card-head"><h2 id="demo-h">Demo data</h2></div>
            <p className="bk-subtle" style={{ marginBottom: 12 }}>Restore every demo account to its original state. This signs you out and deletes accounts created in this browser.</p>
            <button type="button" className="bk-btn danger ghost block" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> Reset demo data</button>
          </section>
        </div>
      </div>

      {confirmReset && (
        <Modal title="Reset all demo data?" onClose={() => setConfirmReset(false)}>
          <p className="bk-muted">All balances, transactions, goals, payees and any accounts you created will be wiped and re-seeded. You'll be signed out.</p>
          <div className="bk-modal-foot">
            <button type="button" className="bk-btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button type="button" className="bk-btn danger" onClick={reset}>Reset everything</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
