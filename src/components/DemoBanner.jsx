/**
 * DemoBanner.jsx
 * Sticky "Demo only — no real money" banner shown to all users.
 */
import React, { useState } from 'react';

const DemoBanner = () => {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('oxbank_banner_dismissed') === '1'
  );

  if (dismissed) return null;

  return (
    <div className="demo-banner" role="banner" aria-label="Demo mode notice">
      <span className="demo-banner-icon">🏦</span>
      <span className="demo-banner-text">
        <strong>Demo Mode</strong> — No real money involved. All transactions are simulated.
      </span>
      <button
        className="demo-banner-close"
        onClick={() => {
          sessionStorage.setItem('oxbank_banner_dismissed', '1');
          setDismissed(true);
        }}
        aria-label="Dismiss demo banner"
      >
        ×
      </button>
    </div>
  );
};

export default DemoBanner;
