/**
 * BalanceTrend.jsx
 * Combined end-of-day balance across all accounts for the last 30 days.
 * Reconstructed by walking backwards from today's total through the ledger,
 * so it is correct for any number of accounts. Single series → no legend;
 * hover/focus shows a crosshair + tooltip.
 */
import React, { useMemo, useState } from 'react';
import { formatCompact, formatCurrency } from '../utils/currency.js';
import { usePrivacy } from './ui';

const DAYS = 30;
const W = 600;
const H = 160;
const PAD_X = 8;
const PAD_Y = 14;

const BalanceTrend = ({ transactions = [], currentBalance = 0 }) => {
  const { hidden } = usePrivacy();
  const [hover, setHover] = useState(null);

  const points = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    let balance = currentBalance; // end of today
    let i = 0;
    const sorted = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    for (let d = 0; d <= DAYS; d++) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - d);
      result.unshift({ date: dayStart, balance });
      // undo this day's movements to get the previous day's closing balance
      while (i < sorted.length && new Date(sorted[i].createdAt) >= dayStart) {
        const t = sorted[i];
        balance += t.type === 'credit' ? -t.amount : t.amount;
        i++;
      }
    }
    return result;
  }, [transactions, currentBalance]);

  const values = points.map((p) => p.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const y = (v) => H - PAD_Y - ((v - min) / range) * (H - PAD_Y * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H} L${x(0)},${H} Z`;

  const first = points[0].balance;
  const last = points[points.length - 1].balance;
  const change = last - first;
  const fmt = (v) => (hidden ? '₦ ••••' : formatCompact(v));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? points.length - 1) - 1));
    if (e.key === 'ArrowRight') setHover((h) => Math.min(points.length - 1, (h ?? 0) + 1));
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <span className="bk-subtle">30 days ago: <strong className="bk-mono">{fmt(first)}</strong></span>
        <span className="bk-subtle">
          {change >= 0 ? '▲' : '▼'} <strong className="bk-mono">{fmt(Math.abs(change))}</strong> {change >= 0 ? 'up' : 'down'}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: 160, display: 'block', overflow: 'visible', cursor: 'crosshair', outline: 'none' }}
          role="img"
          tabIndex={0}
          aria-label={`Combined balance over the last 30 days, from ${fmt(first)} to ${fmt(last)}. Use arrow keys to inspect days.`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <defs>
            <linearGradient id="bkTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--bk-bar)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--bk-bar)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={0} x2={W} y1={H - PAD_Y} y2={H - PAD_Y} stroke="var(--bk-border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={area} fill="url(#bkTrendFill)" />
          <path d={line} fill="none" stroke="var(--bk-bar)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {hp && (
            <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--bk-text-3)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {hp && (
          <>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: 'var(--bk-bar)',
                border: '2px solid var(--bk-surface)', left: `${(x(hover) / W) * 100}%`, top: y(hp.balance),
                transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              }}
            />
            <div
              role="status"
              style={{
                position: 'absolute', top: 0, left: `${(x(hover) / W) * 100}%`,
                transform: `translateX(${hover > points.length / 2 ? 'calc(-100% - 10px)' : '10px'})`,
                background: 'var(--bk-surface)', border: '1px solid var(--bk-border-strong)', borderRadius: 10,
                padding: '6px 10px', fontSize: '0.8rem', boxShadow: 'var(--bk-shadow)', pointerEvents: 'none', whiteSpace: 'nowrap',
              }}
            >
              <div className="bk-subtle">{hp.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
              <strong className="bk-mono">{hidden ? '₦ ••••••' : formatCurrency(hp.balance)}</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BalanceTrend;
