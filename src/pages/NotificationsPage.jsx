import React, { useState, useEffect } from 'react';
import Footer from '../Footer';
import '../assets/Style.css/Notifications.css';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { list, markRead, markAllRead } from '../services/notificationService';
import { Bell, ShieldAlert, ArrowDownLeft, ArrowUpRight, Zap, Check, CheckCheck, Trash2 } from 'lucide-react';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { refreshData } = useData();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  const loadNotifications = async () => {
    if (!user) return;
    const items = await list(user.id);
    setNotifications(items);
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleMarkRead = async (id) => {
    await markRead(id);
    await loadNotifications();
    await refreshData();
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllRead(user.id);
    await loadNotifications();
    await refreshData();
    toast.success('All notifications marked as read.');
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'security') return n.type === 'security';
    if (filter === 'transfer') return n.type === 'transfer';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'security':
        return <ShieldAlert size={20} color="#ef4444" />;
      case 'transfer':
        return <ArrowDownLeft size={20} color="#10b981" />;
      case 'bill':
        return <Zap size={20} color="#ff6600" />;
      default:
        return <Bell size={20} color="#551A8B" />;
    }
  };

  return (
    <div className="notifications-page animate-fade-in">
      <div className="notifications-container">
        <div className="notifications-header">
          <div>
            <h1 className="text-gradient">Notifications & Alerts</h1>
            <p className="notif-subtitle">Audit log of system alerts, login activity, and financial transactions.</p>
          </div>
          <button className="btn btn-secondary flex-center" onClick={handleMarkAllRead} style={{ gap: '6px' }}>
            <CheckCheck size={16} /> Mark All as Read
          </button>
        </div>

        <div className="notif-filter-bar glass">
          {['all', 'unread', 'security', 'transfer'].map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="notif-list glass">
          {filtered.length === 0 ? (
            <p className="empty-notif">No notifications match this filter.</p>
          ) : (
            filtered.map((n) => (
              <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`}>
                <div className="notif-icon">{getIcon(n.type)}</div>
                <div className="notif-content">
                  <div className="notif-title-row">
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-time">{n.date ? new Date(n.date).toLocaleString() : 'Just now'}</span>
                  </div>
                  <p className="notif-msg">{n.message}</p>
                </div>
                {!n.read && (
                  <button
                    className="mark-read-btn"
                    onClick={() => handleMarkRead(n.id)}
                    title="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotificationsPage;
