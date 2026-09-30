/**
 * BalanceTrend.jsx
 * SVG line chart showing 30-day balance trend.
 * Uses the last balanceAfter of each day.
 */
import React, { useMemo } from 'react';
import { formatCompact } from '../utils/currency.js';

const BalanceTrend = ({ transactions = [], currentBalance = 0 }) => {
  const points = useMemo(() => {
    const DAY = 86400000;
    const now = Date.now();
    const days = 30;

    // Group transactions by day (UTC date string)
    const byDay = {};
    transactions.forEach((t) => {
      const d = new Date(t.createdAt).toISOString().slice(0, 10);
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(t);
    });

    // For each of the past 30 days, find the last balanceAfter
    const result = [];
    let lastKnown = currentBalance;

    for (let d = days; d >= 0; d--) {
      const date = new Date(now - d * DAY).toISOString().slice(0, 10);
      const dayTx = byDay[date];
      if (dayTx && dayTx.length > 0) {
        // Sort by time, take the last balanceAfter
        const sorted = dayTx.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        lastKnown = sorted[sorted.length - 1].balanceAfter;
      }
      result.push({ date, balance: lastKnown });
    }

    return result;
  }, [transactions, currentBalance]);

  if (points.length === 0) return null;

  const balances = points.map((p) => p.balance);
  const minB = Math.min(...balances);
  const maxB = Math.max(...balances);
  const range = maxB - minB || 1;

  const W = 340;
  const H = 100;
  const PAD = 10;

  const toX = (i) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const toY = (b) => H - PAD - ((b - minB) / range) * (H - PAD * 2);

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.balance).toFixed(1)}`)
    .join(' ');

  // Fill area under the curve
  const fillD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${H} L ${toX(0).toFixed(1)} ${H} Z`;

  const lastBalance = points[points.length - 1]?.balance || 0;
  const firstBalance = points[0]?.balance || 0;
  const isUp = lastBalance >= firstBalance;

  return (
    <div className="balance-trend">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="trend-svg"
        role="img"
        aria-label="30-day balance trend chart"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#trendGrad)" />
        <path
          d={pathD}
          fill="none"
          stroke={isUp ? '#10b981' : '#ef4444'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="trend-labels">
        <span className="trend-label-left">30d ago: {formatCompact(firstBalance)}</span>
        <span className="trend-label-right" style={{ color: isUp ? '#10b981' : '#ef4444' }}>
          Now: {formatCompact(lastBalance)}
        </span>
      </div>
    </div>
  );
};

export default BalanceTrend;
