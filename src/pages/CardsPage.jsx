import React, { useEffect, useMemo, useState } from 'react';
import { Snowflake, Eye, EyeOff, Copy, RefreshCw, Globe, ShoppingCart, Landmark, Wifi, Lock } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { cardService, DEFAULT_CONTROLS } from '../services/cardService';
import { formatCurrency, nairaToKobo } from '../utils/currency';
import { monthRange, inRange } from '../utils/insights';
import { Alert, AmountInput, Modal, Money, PinModal, Switch } from '../components/ui';

const CARD_SPEND_CATEGORIES = new Set(['Groceries', 'Dining', 'Shopping', 'Transport', 'Netflix', 'Subscriptions']);
const REVEAL_SECONDS = 30;

const CONTROL_META = {
  online: { label: 'Online payments', sub: 'Websites and apps', icon: ShoppingCart },
  international: { label: 'International payments', sub: 'Merchants outside Nigeria', icon: Globe },
  atm: { label: 'ATM withdrawals', sub: 'Cash from any ATM', icon: Landmark },
  contactless: { label: 'Contactless', sub: 'Tap to pay in stores', icon: Wifi },
};

export default function CardsPage() {
  const { user } = useAuth();
  const { accounts, transactions, refresh } = useData();
  const { toast } = useToast();

  const [cards, setCards] = useState(() => cardService.getAllUserCards(user.id));
  const [activeId, setActiveId] = useState(null);
  const [revealed, setRevealed] = useState(null); // { accountId, number, cvv, until }
  const [now, setNow] = useState(Date.now());
  const [askPin, setAskPin] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limit, setLimit] = useState('');
  const [limitErr, setLimitErr] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = () => setCards(cardService.getAllUserCards(user.id));
  const card = cards.find((c) => c.accountId === activeId) || cards[0];
  const account = accounts.find((a) => a.id === card?.accountId);
  const controls = { ...DEFAULT_CONTROLS, ...card?.controls };
  const isRevealed = revealed && revealed.accountId === card?.accountId && revealed.until > now;

  // Countdown for revealed details
  useEffect(() => {
    if (!revealed) return undefined;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= revealed.until) setRevealed(null);
    }, 1000);
    return () => clearInterval(t);
  }, [revealed]);

  const spentThisMonth = useMemo(() => {
    if (!card) return 0;
    const range = monthRange(0);
    return transactions
      .filter((t) => t.accountId === card.accountId && t.type === 'debit' && CARD_SPEND_CATEGORIES.has(t.category) && inRange(t, range))
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, card]);

  if (!card) {
    return (
      <div className="bk-page">
        <div className="bk-page-head"><div><h1>Cards</h1><p>No cards on your accounts yet.</p></div></div>
      </div>
    );
  }

  const toggleFreeze = async () => {
    setBusy(true);
    const res = card.frozen ? await cardService.unfreezeCard(card.accountId) : await cardService.freezeCard(card.accountId);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(card.frozen ? 'Card unfrozen. You can use it again.' : 'Card frozen. All payments are blocked.');
    if (!card.frozen) setRevealed(null);
    reload();
  };

  const reveal = async (pin) => {
    const res = await cardService.revealCardDetails(card.accountId, user.id, pin);
    if (!res.ok) return res;
    setAskPin(false);
    setRevealed({ accountId: card.accountId, number: res.card.fullNumber, cvv: res.card.cvv, until: Date.now() + REVEAL_SECONDS * 1000 });
    setNow(Date.now());
    return res;
  };

  const setControl = async (key, value) => {
    const res = await cardService.setControl(card.accountId, key, value);
    if (!res.ok) return toast.error(res.error);
    toast.info(`${CONTROL_META[key].label} ${value ? 'enabled' : 'disabled'}.`);
    reload();
  };

  const saveLimit = async (e) => {
    e.preventDefault();
    const res = await cardService.setSpendingLimit(card.accountId, nairaToKobo(limit));
    if (!res.ok) return setLimitErr(res.error);
    toast.success(`Spending limit set to ${formatCurrency(nairaToKobo(limit))}.`);
    setLimitOpen(false);
    reload();
  };

  const replace = async () => {
    setBusy(true);
    const res = await cardService.replaceCard(card.accountId, user.id);
    setBusy(false);
    setConfirmReplace(false);
    if (!res.ok) return toast.error(res.error);
    setRevealed(null);
    toast.success(`New card issued, ending ${res.card.fullNumber.slice(-4)}. The old card no longer works.`);
    reload();
    refresh();
  };

  const copyNumber = () => {
    navigator.clipboard?.writeText(revealed.number.replace(/\s/g, '')).then(() => toast.info('Card number copied.'));
  };

  const limitPct = Math.min(100, (spentThisMonth / card.spendingLimit) * 100);

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>Cards</h1>
          <p>Virtual debit cards linked to your accounts.</p>
        </div>
        {cards.length > 1 && (
          <div className="bk-tabs" role="tablist" aria-label="Choose card">
            {cards.map((c) => {
              const a = accounts.find((x) => x.id === c.accountId);
              return (
                <button key={c.id} type="button" role="tab" aria-selected={c.id === card.id} className={c.id === card.id ? 'active' : ''} onClick={() => setActiveId(c.accountId)}>
                  {a?.type || 'Card'} ••{c.maskedNumber.slice(-4)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bk-grid">
        <div className="bk-stack">
          <section className="bk-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div className={`bk-vcard${account?.type === 'Savings' ? ' savings' : ''}${card.frozen ? ' frozen' : ''}`} aria-label="Card preview">
              {card.frozen && <span className="bk-frozen-tag"><Snowflake size={12} /> Frozen</span>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '0.04em' }}>OXBANK</strong>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{account?.type} · Debit</span>
              </div>
              <span className="chip" aria-hidden="true" />
              <div className="bk-vcard-num">{isRevealed ? revealed.number : card.maskedNumber}</div>
              <div className="bk-vcard-row">
                <div><span style={{ opacity: 0.75 }}>Card holder</span><b>{user.name.toUpperCase()}</b></div>
                <div><span style={{ opacity: 0.75 }}>Expires</span><b>{card.expiry}</b></div>
                <div><span style={{ opacity: 0.75 }}>CVV</span><b>{isRevealed ? revealed.cvv : '•••'}</b></div>
              </div>
            </div>

            <div className="bk-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="bk-btn ghost" onClick={() => (isRevealed ? setRevealed(null) : setAskPin(true))} disabled={card.frozen}>
                {isRevealed ? <><EyeOff size={16} /> Hide ({Math.max(0, Math.ceil((revealed.until - now) / 1000))}s)</> : <><Eye size={16} /> Show details</>}
              </button>
              {isRevealed && <button type="button" className="bk-btn ghost" onClick={copyNumber}><Copy size={16} /> Copy number</button>}
              <button type="button" className={`bk-btn${card.frozen ? '' : ' ghost'}`} onClick={toggleFreeze} disabled={busy}>
                <Snowflake size={16} /> {card.frozen ? 'Unfreeze card' : 'Freeze card'}
              </button>
            </div>
            {card.frozen && <Alert kind="info">This card is frozen. Payments, withdrawals and detail reveals are blocked until you unfreeze it.</Alert>}
          </section>

          <section className="bk-card" aria-labelledby="ctl-h">
            <div className="bk-card-head"><h2 id="ctl-h">Card controls</h2><Lock size={16} className="bk-muted" /></div>
            {Object.entries(CONTROL_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={key} className="bk-setting">
                  <span className="bk-tx-icon"><Icon size={18} /></span>
                  <div className="bk-setting-main">
                    <div className="bk-setting-title">{meta.label}</div>
                    <div className="bk-setting-sub">{meta.sub}</div>
                  </div>
                  <Switch label={meta.label} checked={controls[key]} disabled={card.frozen} onChange={(v) => setControl(key, v)} />
                </div>
              );
            })}
          </section>
        </div>

        <div className="bk-stack">
          <section className="bk-card" aria-labelledby="lim-h">
            <div className="bk-card-head">
              <h2 id="lim-h">Monthly spending</h2>
              <button type="button" className="bk-link" onClick={() => { setLimit(String(card.spendingLimit / 100)); setLimitErr(''); setLimitOpen(true); }}>Edit limit</button>
            </div>
            <div className="bk-stat" style={{ marginBottom: 10 }}>
              <span className="bk-stat-value"><Money kobo={spentThisMonth} /></span>
              <span className="bk-stat-delta">of <Money kobo={card.spendingLimit} /> limit · resets on the 1st</span>
            </div>
            <div className={`bk-progress ${limitPct >= 100 ? 'critical' : limitPct >= 80 ? 'warning' : ''}`} role="progressbar" aria-valuenow={Math.round(limitPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Card limit used">
              <div style={{ width: `${limitPct}%` }} />
            </div>
          </section>

          <section className="bk-card" aria-labelledby="info-h">
            <div className="bk-card-head"><h2 id="info-h">Card details</h2></div>
            <dl className="bk-summary">
              <div><dt>Linked account</dt><dd>{account?.type} · {account?.number}</dd></div>
              <div><dt>Status</dt><dd>{card.frozen ? <span className="bk-badge">Frozen</span> : <span className="bk-badge good">Active</span>}</dd></div>
              <div><dt>Issued</dt><dd>{new Date(card.createdAt).toLocaleDateString()}</dd></div>
            </dl>
            <button type="button" className="bk-btn danger ghost block" style={{ marginTop: 14 }} onClick={() => setConfirmReplace(true)}>
              <RefreshCw size={16} /> Report lost / replace card
            </button>
          </section>
        </div>
      </div>

      {askPin && (
        <PinModal title="Show card details" subtitle={`Details will be visible for ${REVEAL_SECONDS} seconds.`} onConfirm={reveal} onCancel={() => setAskPin(false)} />
      )}

      {limitOpen && (
        <Modal title="Monthly spending limit" onClose={() => setLimitOpen(false)}>
          <form className="bk-form" onSubmit={saveLimit}>
            {limitErr && <Alert>{limitErr}</Alert>}
            <div className="bk-field">
              <label htmlFor="lim-amt">Limit</label>
              <AmountInput id="lim-amt" value={limit} onChange={(v) => { setLimit(v); setLimitErr(''); }} />
              <div className="bk-presets">
                {[50000, 200000, 500000, 2000000].map((n) => <button type="button" key={n} onClick={() => setLimit(String(n))}>₦{n.toLocaleString()}</button>)}
              </div>
              <span className="bk-hint">Between ₦1,000 and ₦10,000,000.</span>
            </div>
            <div className="bk-modal-foot">
              <button type="button" className="bk-btn ghost" onClick={() => setLimitOpen(false)}>Cancel</button>
              <button type="submit" className="bk-btn">Save limit</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmReplace && (
        <Modal title="Replace this card?" onClose={() => setConfirmReplace(false)}>
          <p className="bk-muted">The current card ending {card.maskedNumber.slice(-4)} will be cancelled immediately and a new number issued. Your limit and controls carry over.</p>
          <div className="bk-modal-foot">
            <button type="button" className="bk-btn ghost" onClick={() => setConfirmReplace(false)}>Keep card</button>
            <button type="button" className="bk-btn danger" onClick={replace} disabled={busy}>{busy ? <span className="bk-spinner" /> : 'Cancel & replace'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
