/**
 * SpendingChart.jsx
 * SVG bar chart showing spending by category.
 * Hand-built — no external chart library needed.
 */
import React, { useMemo } from 'react';
import { formatCompact } from '../utils/currency.js';

const CATEGORY_COLORS = {
  Groceries: '#551A8B',
  Transport: '#ff6600',
  Dining: '#f59e0b',
  Shopping: '#3b82f6',
  Bills: '#ef4444',
  Utilities: '#8b5cf6',
  Subscriptions: '#06b6d4',
  Freelance: '#10b981',
  Income: '#10b981',
  Transfer: '#94a3b8',
  Airtime: '#f97316',
  Deposit: '#059669',
  Withdrawal: '#dc2626',
  Refund: '#14b8a6',
};

const DEFAULT_COLOR = '#94a3b8';

const SpendingChart = ({ transactions = [] }) => {
  const data = useMemo(() => {
    const map = {};
    transactions
      .filter((t) => t.type === 'debit')
      .forEach((t) => {
        const cat = t.category || 'Other';
        map[cat] = (map[cat] || 0) + t.amount;
      });

    const entries = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6); // top 6 categories

    return entries;
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No spending data yet.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d[1]));
  const BAR_HEIGHT = 140;

  return (
    <div className="spending-chart">
      <svg
        viewBox={`0 0 ${data.length * 60} ${BAR_HEIGHT + 40}`}
        className="spending-chart-svg"
        role="img"
        aria-label="Spending by category bar chart"
      >
        {data.map(([cat, amount], i) => {
          const barH = (amount / max) * BAR_HEIGHT;
          const x = i * 60 + 10;
          const y = BAR_HEIGHT - barH;
          const color = CATEGORY_COLORS[cat] || DEFAULT_COLOR;

          return (
            <g key={cat}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={40}
                height={barH}
                rx={6}
                fill={color}
                opacity={0.85}
                className="chart-rect"
              />
              {/* Amount label */}
              <text
                x={x + 20}
                y={y - 6}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-muted)"
                className="chart-label-top"
              >
                {formatCompact(amount)}
              </text>
              {/* Category label */}
              <text
                x={x + 20}
                y={BAR_HEIGHT + 16}
                textAnchor="middle"
                fontSize="8.5"
                fill="var(--text-muted)"
                className="chart-label-bottom"
              >
                {cat.length > 8 ? cat.slice(0, 7) + '…' : cat}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="chart-legend">
        {data.map(([cat]) => (
          <div key={cat} className="legend-item">
            <span
              className="legend-dot"
              style={{ background: CATEGORY_COLORS[cat] || DEFAULT_COLOR }}
            />
            <span>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpendingChart;
