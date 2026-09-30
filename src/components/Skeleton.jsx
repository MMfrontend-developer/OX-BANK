/**
 * Skeleton.jsx
 * Loading skeleton components for various sections.
 */
import React from 'react';

export function SkeletonLine({ width = '100%', height = '1rem', rounded = false }) {
  return (
    <div
      className="skeleton-line"
      style={{ width, height, borderRadius: rounded ? '50px' : '6px' }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card glass" aria-hidden="true">
      <SkeletonLine width="40%" height="0.8rem" />
      <SkeletonLine width="60%" height="2rem" />
      <SkeletonLine width="35%" height="0.75rem" />
    </div>
  );
}

export function SkeletonTxItem() {
  return (
    <div className="skeleton-tx-item" aria-hidden="true">
      <div className="skeleton-tx-icon skeleton-line" />
      <div style={{ flex: 1 }}>
        <SkeletonLine width="55%" height="0.85rem" />
        <SkeletonLine width="35%" height="0.7rem" />
      </div>
      <SkeletonLine width="80px" height="0.9rem" />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading…">
      <SkeletonCard />
      <SkeletonCard />
      {[1, 2, 3, 4].map((i) => <SkeletonTxItem key={i} />)}
    </div>
  );
}
