import React, { useState, useEffect } from 'react';
import Footer from '../Footer';
import '../assets/Style.css/Cards.css';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, nairaToKobo } from '../utils/currency';
import { getCardsForUser, freezeCard, setSpendingLimit, createVirtualCard } from '../services/cardService';
import PinModal from '../components/PinModal';
import { CreditCard, Lock, Unlock, Eye, EyeOff, ShieldAlert, Plus, Sliders, Cpu, Wifi } from 'lucide-react';

const CardsPage = () => {
  const { user } = useAuth();
  const { primaryAccount } = useData();
  const { toast } = useToast();

  const [cards, setCards] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [limitInput, setLimitInput] = useState('500000');
  const [isLoading, setIsLoading] = useState(false);

  const loadCards = async () => {
    if (!user) return;
    const userCards = await getCardsForUser(user.id);
    setCards(userCards);
    if (userCards.length > 0) {
      setLimitInput(Math.round(userCards[0].monthlyLimitKobo / 100).toString());
    }
  };

  useEffect(() => {
    loadCards();
  }, [user]);

  const card = cards[activeCardIndex] || {
    cardNumber: '4532••••••••8892',
    cvv: '•••',
    expiry: '08/28',
    cardholderName: user?.name || 'Valued Customer',
    cardType: 'VISA PLATINUM',
    isFrozen: false,
    monthlyLimitKobo: 50000000,
    spentThisMonthKobo: 12500000,
  };

  const toggleFreeze = async () => {
    if (!card.id) return;
    const nextState = !card.isFrozen;
    const res = await freezeCard(card.id, nextState);
    if (res.ok) {
      toast.success(`Card ${nextState ? 'frozen' : 'unfrozen'} successfully!`);
      await loadCards();
    }
  };

  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    if (!card.id) return;
    const amountNaira = parseFloat(limitInput);
    if (!amountNaira || amountNaira <= 0) {
      toast.error('Invalid limit amount');
      return;
    }
    const res = await setSpendingLimit(card.id, nairaToKobo(amountNaira));
    if (res.ok) {
      toast.success(`Monthly spending limit updated to ₦${amountNaira.toLocaleString()}`);
      await loadCards();
    }
  };

  const handleRevealClick = () => {
    if (revealed) {
      setRevealed(false);
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSubmit = async (pin) => {
    // In service layer, verifying PIN
    if (pin === (user?.pin || '1234')) {
      setShowPinModal(false);
      setRevealed(true);
      toast.info('Card details revealed for 15 seconds');
      setTimeout(() => {
        setRevealed(false);
      }, 15000);
    } else {
      toast.error('Invalid PIN. Reveal denied.');
    }
  };

  const handleCreateNewCard = async () => {
    if (!primaryAccount) return;
    setIsLoading(true);
    try {
      const res = await createVirtualCard(user.id, primaryAccount.id, 'MASTERCARD');
      if (res.ok) {
        toast.success('New Virtual Mastercard created!');
        await loadCards();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cards-page animate-fade-in">
      <div className="cards-container">
        <div className="cards-header">
          <div>
            <h1 className="text-gradient">Virtual Cards</h1>
            <p className="cards-subtitle">Instantly generate, freeze, and manage secure virtual debit cards for online shopping.</p>
          </div>
          <button className="btn btn-primary flex-center" onClick={handleCreateNewCard} disabled={isLoading} style={{ gap: '8px' }}>
            <Plus size={16} /> New Virtual Card
          </button>
        </div>

        <div className="cards-main-grid">
          {/* VISUAL CARD AREA */}
          <div className="card-visual-column">
            <div className="card-flipper-wrapper">
              <div className={`virtual-card glass-card ${isFlipped ? 'flipped' : ''} ${card.isFrozen ? 'frozen' : ''}`}>
                {!isFlipped ? (
                  /* FRONT OF CARD */
                  <div className="card-front">
                    <div className="card-top-row">
                      <span className="bank-name">OXBANK</span>
                      <span className="card-brand">{card.cardType || 'VISA'}</span>
                    </div>

                    <div className="card-chip-row">
                      <div className="emv-chip"><Cpu size={24} /></div>
                      <Wifi size={24} className="contactless-icon" />
                    </div>

                    <div className="card-number-row">
                      <p className="card-number">
                        {revealed ? card.cardNumber : card.cardNumber?.replace(/(\d{4})/g, '$1 ').trim()}
                      </p>
                    </div>

                    <div className="card-bottom-row">
                      <div>
                        <p className="card-label">CARDHOLDER</p>
                        <p className="card-holder">{card.cardholderName?.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="card-label">EXPIRES</p>
                        <p className="card-expiry">{card.expiry}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* BACK OF CARD */
                  <div className="card-back">
                    <div className="magnetic-strip"></div>
                    <div className="cvv-row">
                      <span className="cvv-label">CVV</span>
                      <div className="cvv-box">{revealed ? card.cvv : '•••'}</div>
                    </div>
                    <p className="card-back-note">Authorized signature. Not valid unless signed. Issued by OXBANK Inc.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card-controls-bar">
              <button className="btn btn-secondary" onClick={() => setIsFlipped(!isFlipped)}>
                Flip Card to {isFlipped ? 'Front' : 'Back'}
              </button>
              <button className="btn btn-secondary flex-center" onClick={handleRevealClick} style={{ gap: '6px' }}>
                {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                {revealed ? 'Hide Details' : 'Reveal Full Card Number'}
              </button>
            </div>
          </div>

          {/* CARD CONTROLS & SETTINGS */}
          <div className="card-settings-column">
            {/* FREEZE TOGGLE */}
            <div className="setting-card glass">
              <div className="setting-header">
                <div>
                  <h3>Card Security Lock</h3>
                  <p className="setting-desc">Freeze card instantly to block any online or ATM authorizations.</p>
                </div>
                <button
                  className={`freeze-btn ${card.isFrozen ? 'is-frozen' : ''}`}
                  onClick={toggleFreeze}
                >
                  {card.isFrozen ? <Lock size={20} /> : <Unlock size={20} />}
                  <span>{card.isFrozen ? 'FROZEN' : 'ACTIVE'}</span>
                </button>
              </div>
            </div>

            {/* SPENDING LIMIT SLIDER */}
            <div className="setting-card glass">
              <h3><Sliders size={18} /> Monthly Spending Limit</h3>
              <p className="setting-desc">
                Current limit: <strong>{formatCurrency(card.monthlyLimitKobo)}</strong>
              </p>

              <form onSubmit={handleUpdateLimit} className="limit-form">
                <div className="input-field">
                  <input
                    type="number"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    min="1000"
                    step="5000"
                    className="limit-input"
                  />
                </div>
                <button type="submit" className="btn btn-primary">Update Limit</button>
              </form>

              <div className="spending-progress-box">
                <div className="progress-info">
                  <span>Spent this month: {formatCurrency(card.spentThisMonthKobo || 0)}</span>
                  <span>{Math.round(((card.spentThisMonthKobo || 0) / card.monthlyLimitKobo) * 100)}%</span>
                </div>
                <div className="progress-bg">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, ((card.spentThisMonthKobo || 0) / card.monthlyLimitKobo) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* PIN REVEAL MODAL */}
      {showPinModal && (
        <PinModal
          title="Verify PIN to Reveal Card Details"
          subtitle="Enter your 4-digit PIN to unmask 16-digit card number and CVV"
          onSubmit={handlePinSubmit}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
};

export default CardsPage;
