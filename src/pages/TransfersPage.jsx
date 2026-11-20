import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowLeftRight, Building2, Search, Trash2, CheckCircle2, Printer, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { transferService, NIGERIAN_BANKS, INTERNAL_BANK, DAILY_LIMIT_KOBO } from '../services/transferService';
import { beneficiaryService } from '../services/beneficiaryService';
import { generateId } from '../services/cryptoService';
import { formatCurrency, nairaToKobo } from '../utils/currency';
import { printReceipt } from '../utils/documents';
import { Alert, AmountInput, Modal, Money, PinModal, Empty } from '../components/ui';

const MODES = [
  { id: 'oxbank', label: 'OXBANK account', icon: Send },
  { id: 'other', label: 'Other banks', icon: Building2 },
  { id: 'own', label: 'My accounts', icon: ArrowLeftRight },
];

const blankForm = (fromAccountId = '') => ({
  fromAccountId,
  toAccountId: '',
  accountNumber: '',
  bank: NIGERIAN_BANKS[1],
  name: '',
  amount: '',
  note: '',
  save: false,
});

export default function TransfersPage() {
  const { user } = useAuth();
  const { accounts, primaryAccount, beneficiaries, refresh } = useData();
  const { toast } = useToast();

  const [mode, setMode] = useState('oxbank');
  const [form, setForm] = useState(() => blankForm(primaryAccount?.id));
  const [lookup, setLookup] = useState(null); // { ok, name, error }
  const [step, setStep] = useState('form'); // form | review | done
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [idemKey, setIdemKey] = useState(generateId);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const source = accounts.find((a) => a.id === form.fromAccountId) || primaryAccount;
  const ownTargets = accounts.filter((a) => a.id !== source?.id);
  const amountKobo = nairaToKobo(form.amount);
  const remaining = user ? transferService.remainingDailyLimit(user.id) : 0;
  const bank = mode === 'other' ? form.bank : INTERNAL_BANK;

  useEffect(() => {
    if (!form.fromAccountId && primaryAccount) setForm((f) => ({ ...f, fromAccountId: primaryAccount.id }));
  }, [primaryAccount, form.fromAccountId]);

  // Live name enquiry for OXBANK numbers
  useEffect(() => {
    if (mode !== 'oxbank') return setLookup(null);
    if (form.accountNumber.length !== 10) return setLookup(null);
    const res = transferService.lookupAccount(form.accountNumber, INTERNAL_BANK);
    setLookup(res);
    if (res.ok) setForm((f) => ({ ...f, name: res.name }));
  }, [form.accountNumber, mode]);

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: typeof v === 'object' && v?.target ? v.target.value : v }));
    setError('');
  };

  const switchMode = (m) => {
    setMode(m);
    setForm(blankForm(form.fromAccountId));
    setError('');
    setLookup(null);
  };

  const pickBeneficiary = (b) => {
    const isInternal = b.bank === INTERNAL_BANK;
    setMode(isInternal ? 'oxbank' : 'other');
    setForm((f) => ({ ...blankForm(f.fromAccountId), accountNumber: b.accountNumber, bank: isInternal ? NIGERIAN_BANKS[1] : b.bank, name: b.name }));
    setError('');
  };

  const filteredBeneficiaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return beneficiaries.filter((b) => !q || b.name.toLowerCase().includes(q) || b.accountNumber.includes(q) || b.bank.toLowerCase().includes(q));
  }, [beneficiaries, search]);

  const recipient = useMemo(() => {
    if (mode === 'own') {
      const t = accounts.find((a) => a.id === (form.toAccountId || ownTargets[0]?.id));
      return t ? { name: `${t.type} account`, accountNumber: t.number, bank: INTERNAL_BANK, id: t.id } : null;
    }
    return { name: form.name.trim(), accountNumber: form.accountNumber, bank };
  }, [mode, accounts, form, ownTargets, bank]);

  const review = (e) => {
    e.preventDefault();
    if (!source) return setError('No source account.');
    if (mode === 'own' && !recipient) return setError('You need a second account to move money between.');
    if (mode !== 'own') {
      if (!/^\d{10}$/.test(form.accountNumber)) return setError('Enter a 10-digit account number.');
      if (mode === 'oxbank' && !lookup?.ok) return setError(lookup?.error || 'We could not verify this account.');
      if (!form.name.trim()) return setError('Enter the recipient name.');
      if (mode === 'oxbank' && source.number === form.accountNumber) return setError('You cannot send money to the same account.');
    }
    if (!amountKobo) return setError('Enter an amount.');
    if (amountKobo > source.balance) return setError(`Insufficient funds. Available: ${formatCurrency(source.balance)}.`);
    if (mode !== 'own' && amountKobo > remaining) return setError(`Exceeds your remaining daily limit of ${formatCurrency(remaining)}.`);
    setStep('review');
  };

  const execute = async (pin) => {
    setBusy(true);
    const res = await transferService.transfer({
      userId: user.id,
      fromAccountId: source.id,
      ...(mode === 'own' ? { toAccountId: recipient.id } : { toAccountNumber: form.accountNumber, toBank: bank, toName: form.name }),
      amountKobo,
      pin,
      note: form.note,
      idempotencyKey: idemKey,
    });
    setBusy(false);

    if (!res.ok) {
      if (res.pinError || res.pinRequired) return res; // shown inside the PIN modal
      setShowPin(false);
      setStep('form');
      setError(res.error);
      return res;
    }

    if (form.save && mode !== 'own' && !beneficiaryService.exists(user.id, form.accountNumber, bank)) {
      await beneficiaryService.add(user.id, { name: form.name, accountNumber: form.accountNumber, bank });
    }
    setShowPin(false);
    setReceipt(res.receipt || null);
    setStep('done');
    refresh();
    toast.success(`${formatCurrency(amountKobo)} sent.`);
    return res;
  };

  const confirm = () => (mode === 'own' ? execute() : setShowPin(true));

  const startOver = () => {
    setStep('form');
    setReceipt(null);
    setIdemKey(generateId());
    setForm(blankForm(form.fromAccountId));
    setLookup(null);
  };

  const removeBeneficiary = async () => {
    await beneficiaryService.remove(user.id, confirmDelete.id);
    toast.info(`${confirmDelete.name} removed.`);
    setConfirmDelete(null);
    refresh();
  };

  const alreadySaved = mode !== 'own' && form.accountNumber.length === 10 && beneficiaries.some((b) => b.accountNumber === form.accountNumber && b.bank === bank);

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>Send money</h1>
          <p>Instant transfers to OXBANK and other Nigerian banks. No transfer fees.</p>
        </div>
        <span className="bk-badge">Daily limit left: <Money kobo={remaining} mask={false} /> of {formatCurrency(DAILY_LIMIT_KOBO)}</span>
      </div>

      <div className="bk-grid">
        <section className="bk-card">
          {step === 'done' ? (
            <div className="bk-center">
              <div className="bk-success-mark"><CheckCircle2 size={34} /></div>
              <h2>Transfer successful</h2>
              <p className="bk-muted" style={{ margin: '6px 0 16px' }}>
                {formatCurrency(amountKobo)} to {recipient?.name}
              </p>
              {receipt && (
                <dl className="bk-summary" style={{ textAlign: 'left', marginBottom: 16 }}>
                  <div><dt>Reference</dt><dd className="bk-mono">{receipt.reference}</dd></div>
                  <div><dt>To</dt><dd>{receipt.to.name} · {receipt.to.bank} · {receipt.to.accountNumber}</dd></div>
                  <div><dt>From</dt><dd>{receipt.from.type} · {receipt.from.accountNumber}</dd></div>
                  <div><dt>Fee</dt><dd>₦0.00</dd></div>
                  <div><dt>Date</dt><dd>{new Date(receipt.createdAt).toLocaleString()}</dd></div>
                </dl>
              )}
              <div className="bk-actions" style={{ justifyContent: 'center' }}>
                {receipt && (
                  <button
                    type="button"
                    className="bk-btn ghost"
                    onClick={() => printReceipt({
                      type: 'debit', amount: receipt.amountKobo, note: receipt.note, category: mode === 'own' ? 'Internal Transfer' : 'Transfer',
                      accountType: receipt.from.type, accountNumber: receipt.from.accountNumber,
                      counterpartName: `${receipt.to.name} · ${receipt.to.bank}`, counterpartAccount: receipt.to.accountNumber,
                      balanceAfter: receipt.balanceAfter, createdAt: receipt.createdAt, reference: receipt.reference,
                    }, user)}
                  >
                    <Printer size={16} /> Download receipt
                  </button>
                )}
                <button type="button" className="bk-btn" onClick={startOver}>Make another transfer</button>
              </div>
            </div>
          ) : step === 'review' ? (
            <div>
              <h2 style={{ marginBottom: 4 }}>Review transfer</h2>
              <p className="bk-muted" style={{ marginBottom: 16 }}>Check the details. Transfers can't be reversed once sent.</p>
              <div className="bk-center" style={{ marginBottom: 16 }}>
                <div className="bk-big-amount">{formatCurrency(amountKobo)}</div>
              </div>
              <dl className="bk-summary">
                <div><dt>To</dt><dd>{recipient.name}</dd></div>
                <div><dt>Account</dt><dd className="bk-mono">{recipient.accountNumber} · {recipient.bank}</dd></div>
                <div><dt>From</dt><dd>{source.type} · {source.number}</dd></div>
                {form.note && <div><dt>Note</dt><dd>{form.note}</dd></div>}
                <div><dt>Fee</dt><dd>₦0.00</dd></div>
                <div><dt>Balance after</dt><dd><Money kobo={source.balance - amountKobo} /></dd></div>
              </dl>
              {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}
              <div className="bk-modal-foot">
                <button type="button" className="bk-btn ghost" onClick={() => setStep('form')} disabled={busy}>Edit</button>
                <button type="button" className="bk-btn" onClick={confirm} disabled={busy}>
                  {busy ? <span className="bk-spinner" /> : mode === 'own' ? 'Move money' : 'Confirm & enter PIN'}
                </button>
              </div>
            </div>
          ) : (
            <form className="bk-form" onSubmit={review} noValidate>
              <div className="bk-tabs" role="tablist" aria-label="Transfer type">
                {MODES.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" role="tab" aria-selected={mode === id} className={mode === id ? 'active' : ''} onClick={() => switchMode(id)}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              {error && <Alert>{error}</Alert>}

              <div className="bk-field">
                <label htmlFor="tf-from">From</label>
                <select id="tf-from" value={form.fromAccountId} onChange={set('fromAccountId')}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.type} · {a.number} — {formatCurrency(a.balance)}</option>
                  ))}
                </select>
              </div>

              {mode === 'own' ? (
                <div className="bk-field">
                  <label htmlFor="tf-to">To</label>
                  {ownTargets.length ? (
                    <select id="tf-to" value={form.toAccountId || ownTargets[0].id} onChange={set('toAccountId')}>
                      {ownTargets.map((a) => <option key={a.id} value={a.id}>{a.type} · {a.number}</option>)}
                    </select>
                  ) : (
                    <p className="bk-hint">You only have one account. Open another in <Link to="/profile">Profile</Link>.</p>
                  )}
                </div>
              ) : (
                <>
                  {mode === 'other' && (
                    <div className="bk-field">
                      <label htmlFor="tf-bank">Bank</label>
                      <select id="tf-bank" value={form.bank} onChange={set('bank')}>
                        {NIGERIAN_BANKS.filter((b) => b !== INTERNAL_BANK).map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="bk-field">
                    <label htmlFor="tf-acct">Account number</label>
                    <input
                      id="tf-acct"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={10}
                      placeholder="10-digit account number"
                      value={form.accountNumber}
                      onChange={(e) => set('accountNumber')(e.target.value.replace(/\D/g, ''))}
                    />
                    {mode === 'oxbank' && lookup && (
                      <span className={`bk-hint ${lookup.ok ? 'ok' : 'err'}`}>
                        {lookup.ok ? `✓ ${lookup.name}` : lookup.error}
                      </span>
                    )}
                  </div>
                  {mode === 'other' && (
                    <div className="bk-field">
                      <label htmlFor="tf-name">Account name</label>
                      <input id="tf-name" placeholder="As it appears on the account" value={form.name} onChange={set('name')} />
                      <span className="bk-hint">Simulated bank — check the name with the recipient.</span>
                    </div>
                  )}
                </>
              )}

              <div className="bk-field">
                <label htmlFor="tf-amt">Amount</label>
                <AmountInput id="tf-amt" value={form.amount} onChange={set('amount')} />
                <span className="bk-hint">Available: <Money kobo={source?.balance || 0} /></span>
              </div>

              <div className="bk-field">
                <label htmlFor="tf-note">Note (optional)</label>
                <input id="tf-note" maxLength={60} placeholder="e.g. Rent, Gift" value={form.note} onChange={set('note')} />
              </div>

              {mode !== 'own' && !alreadySaved && (
                <label className="bk-check">
                  <input type="checkbox" checked={form.save} onChange={(e) => set('save')(e.target.checked)} />
                  Save as beneficiary
                </label>
              )}

              <button type="submit" className="bk-btn block">Continue</button>
            </form>
          )}
        </section>

        <section className="bk-card" aria-labelledby="ben-h">
          <div className="bk-card-head">
            <h2 id="ben-h">Beneficiaries</h2>
            <span className="bk-subtle">{beneficiaries.length} saved</span>
          </div>
          {beneficiaries.length > 3 && (
            <div className="bk-field" style={{ marginBottom: 8 }}>
              <label htmlFor="ben-search" className="bk-sr-only">Search beneficiaries</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bk-text-3)' }} />
                <input id="ben-search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="bk-has-icon" />
              </div>
            </div>
          )}
          {filteredBeneficiaries.length === 0 ? (
            <Empty icon={beneficiaries.length ? Search : Users}>
              {beneficiaries.length ? 'No matches.' : 'People you save will appear here for one-tap transfers.'}
            </Empty>
          ) : (
            <div className="bk-list">
              {filteredBeneficiaries.map((b) => (
                <div key={b.id} className="bk-item">
                  <button type="button" onClick={() => pickBeneficiary(b)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'none', border: 0, padding: 0, color: 'inherit', textAlign: 'left', letterSpacing: 0 }} aria-label={`Send to ${b.name}`}>
                    <span className="bk-avatar sm">{b.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                    <span className="bk-item-main">
                      <span className="bk-item-title" style={{ display: 'block' }}>{b.name}</span>
                      <span className="bk-item-sub" style={{ display: 'block' }}>{b.bank} · {b.accountNumber}</span>
                    </span>
                  </button>
                  <button type="button" className="bk-copy" aria-label={`Remove ${b.name}`} onClick={() => setConfirmDelete(b)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="bk-subtle" style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <UserPlus size={14} /> Tick "Save as beneficiary" when sending to add someone.
          </p>
        </section>
      </div>

      {showPin && (
        <PinModal
          title="Authorize transfer"
          subtitle={`Enter your PIN to send ${formatCurrency(amountKobo)} to ${recipient?.name}`}
          onConfirm={execute}
          onCancel={() => setShowPin(false)}
        />
      )}

      {confirmDelete && (
        <Modal title="Remove beneficiary?" onClose={() => setConfirmDelete(null)}>
          <p className="bk-muted">{confirmDelete.name} ({confirmDelete.bank} · {confirmDelete.accountNumber}) will be removed from your saved list.</p>
          <div className="bk-modal-foot">
            <button type="button" className="bk-btn ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button type="button" className="bk-btn danger" onClick={removeBeneficiary}>Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
