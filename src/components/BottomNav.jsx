/**
 * BottomNav.jsx
 * Mobile bottom navigation for authenticated users.
 * Shown on screens ≤768px.
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  Bell,
  User,
  FileText,
  Shield,
} from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';

const BottomNav = () => {
  const { user } = useAuth();
  const { unreadCount } = useData();

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [
        { to: '/Dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
        { to: '/admin', icon: <Shield size={22} />, label: 'Admin' },
        { to: '/notifications', icon: <Bell size={22} />, label: 'Alerts', badge: unreadCount },
        { to: '/profile', icon: <User size={22} />, label: 'Profile' },
      ]
    : [
        { to: '/Dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
        { to: '/transfers', icon: <ArrowLeftRight size={22} />, label: 'Transfer' },
        { to: '/bills', icon: <Receipt size={22} />, label: 'Bills' },
        { to: '/cards', icon: <CreditCard size={22} />, label: 'Cards' },
        { to: '/notifications', icon: <Bell size={22} />, label: 'Alerts', badge: unreadCount },
      ];

  return (
    <nav className="bottom-nav glass" aria-label="Main navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          aria-label={item.label}
        >
          <div className="bottom-nav-icon-wrap">
            {item.icon}
            {item.badge > 0 && (
              <span className="nav-badge" aria-label={`${item.badge} unread`}>
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </div>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
