import React, { useMemo, useState } from 'react';
import { Bell, ShieldAlert, ArrowDownLeft, ArrowUpRight, Receipt, PiggyBank, AlertTriangle, CheckCheck, Trash2, Check } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { notificationService } from '../services/notificationService';
import { timeAgo } from '../utils/insights';
import { Empty } from '../components/ui';

const GROUPS = {
  money: ['transfer_sent', 'transfer_received', 'deposit', 'low_balance', 'goal'],
  bills: ['bill_paid', 'bill_failed'],
  security: ['security'],
};
const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['money', 'Money'],
  ['bills', 'Bills'],
  ['security', 'Security'],
];

const ICONS = {
  transfer_received: ArrowDownLeft,
  deposit: ArrowDownLeft,
  transfer_sent: ArrowUpRight,
  low_balance: AlertTriangle,
  bill_paid: Receipt,
  bill_failed: AlertTriangle,
  goal: PiggyBank,
  security: ShieldAlert,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unreadCount, refresh } = useData();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');

  const shown = useMemo(() => notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return GROUPS[filter]?.includes(n.type);
  }), [notifications, filter]);

  const markRead = (id) => {
    notificationService.markRead(user.id, id);
    refresh();
  };
  const markAll = () => {
    notificationService.markAllRead(user.id);
    refresh();
    toast.success('All notifications marked as read.');
  };
  const remove = (id) => {
    notificationService.deleteNotification(user.id, id);
    refresh();
  };

  return (
    <div className="bk-page">
      <div className="bk-page-head">
        <div>
          <h1>Notifications</h1>
          <p>{unreadCount ? `${unreadCount} unread` : "You're all caught up."} We keep your latest 50 alerts.</p>
        </div>
        <button type="button" className="bk-btn ghost" onClick={markAll} disabled={!unreadCount}><CheckCheck size={16} /> Mark all read</button>
      </div>

      <div className="bk-chips" role="group" aria-label="Filter notifications">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" className={`bk-chip${filter === id ? ' active' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      <section className="bk-card">
        {shown.length === 0 ? (
          <Empty icon={Bell}>Nothing here.</Empty>
        ) : (
          <ul className="bk-list" style={{ listStyle: 'none' }}>
            {shown.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <li key={n.id} className="bk-item" style={{ alignItems: 'flex-start' }}>
                  <span className={`bk-tx-icon${['transfer_received', 'deposit'].includes(n.type) ? ' credit' : ''}`}><Icon size={18} /></span>
                  <div className="bk-item-main">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {!n.read && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bk-primary)', flexShrink: 0 }} />}
                      <span className="bk-item-title" style={{ fontWeight: n.read ? 500 : 700 }}>{n.title}</span>
                    </div>
                    <p className="bk-muted" style={{ fontSize: '0.87rem', margin: '2px 0' }}>{n.message}</p>
                    <span className="bk-subtle" title={new Date(n.createdAt).toLocaleString()}>{timeAgo(n.createdAt)}</span>
                  </div>
                  <div className="bk-actions" style={{ flexWrap: 'nowrap' }}>
                    {!n.read && <button type="button" className="bk-copy" aria-label="Mark as read" onClick={() => markRead(n.id)}><Check size={16} /></button>}
                    <button type="button" className="bk-copy" aria-label="Delete notification" onClick={() => remove(n.id)}><Trash2 size={16} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
