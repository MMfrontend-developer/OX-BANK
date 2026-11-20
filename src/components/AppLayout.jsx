/**
 * AppLayout — shell for every signed-in page: sidebar (desktop),
 * drawer + bottom navigation (mobile), top bar, inactivity guard.
 */
import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Receipt, CreditCard, PiggyBank, PieChart, History,
  Bell, UserCog, LogOut, Shield, Menu, Moon, Sun, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import SessionGuard from './SessionGuard';
import { PrivacyProvider, usePrivacy } from './ui';
import '../assets/Style.css/Bank.css';

const CUSTOMER_NAV = [
  { group: null, items: [{ to: '/Dashboard', label: 'Overview', icon: LayoutDashboard }] },
  {
    group: 'Payments',
    items: [
      { to: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
      { to: '/bills', label: 'Bills & airtime', icon: Receipt },
    ],
  },
  {
    group: 'Money',
    items: [
      { to: '/cards', label: 'Cards', icon: CreditCard },
      { to: '/savings', label: 'Savings goals', icon: PiggyBank },
      { to: '/budgets', label: 'Budgets & insights', icon: PieChart },
      { to: '/transactions', label: 'Transactions', icon: History },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
      { to: '/profile', label: 'Profile & security', icon: UserCog },
    ],
  },
];

const ADMIN_NAV = [
  {
    group: 'Administration',
    items: [
      { to: '/admin', label: 'Admin console', icon: Shield },
      { to: '/Dashboard', label: 'My overview', icon: LayoutDashboard },
      { to: '/transactions', label: 'My transactions', icon: History },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
      { to: '/profile', label: 'Profile & security', icon: UserCog },
    ],
  },
];

const TITLES = {
  '/dashboard': 'Overview',
  '/transfers': 'Transfers',
  '/bills': 'Bills & airtime',
  '/cards': 'Cards',
  '/savings': 'Savings goals',
  '/budgets': 'Budgets & insights',
  '/transactions': 'Transactions',
  '/notifications': 'Notifications',
  '/profile': 'Profile & security',
  '/admin': 'Admin console',
};

function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy();
  return (
    <button type="button" className="bk-icon-btn" onClick={toggle} aria-label={hidden ? 'Show balances' : 'Hide balances'} title={hidden ? 'Show balances' : 'Hide balances'}>
      {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

export default function AppLayout() {
  const { user, settings } = useAuth();
  const { unreadCount } = useData();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const nav = isAdmin ? ADMIN_NAV : CUSTOMER_NAV;
  const title = TITLES[pathname.toLowerCase()] || 'OXBANK';
  const initials = (user?.name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    document.title = `${title} · OXBANK`;
  }, [title]);

  return (
    <PrivacyProvider initialHidden={settings.hideBalances}>
      <div className="bk-app">
        <aside className={`bk-sidebar${drawerOpen ? ' open' : ''}`} aria-label="Main navigation">
          <Link to="/Dashboard" className="bk-brand">
            <img src="/Oxbank.png" alt="" />
            OXBANK
          </Link>
          {nav.map((section) => (
            <nav key={section.group || 'main'} aria-label={section.group || 'Overview'}>
              {section.group && <div className="bk-nav-label">{section.group}</div>}
              {section.items.map(({ to, label, icon: Icon, badge }) => (
                <NavLink key={to + label} to={to} end className={({ isActive }) => `bk-nav-link${isActive ? ' active' : ''}`}>
                  <Icon size={18} />
                  {label}
                  {badge && unreadCount > 0 && <span className="bk-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </NavLink>
              ))}
            </nav>
          ))}
          <div className="bk-sidebar-foot">
            <NavLink to="/Logout" className="bk-nav-link">
              <LogOut size={18} /> Sign out
            </NavLink>
          </div>
        </aside>
        <div className={`bk-scrim${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />

        <div className="bk-main">
          <header className="bk-topbar">
            <button type="button" className="bk-icon-btn bk-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-expanded={drawerOpen}>
              <Menu size={18} />
            </button>
            <span className="bk-topbar-title">{title}</span>
            <div className="bk-topbar-actions">
              <PrivacyToggle />
              <button type="button" className="bk-icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <Link to="/notifications" className="bk-icon-btn" aria-label={`Notifications, ${unreadCount} unread`}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="bk-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </Link>
              <Link to="/profile" className="bk-avatar sm" aria-label="Profile" style={{ textDecoration: 'none' }}>
                {initials}
              </Link>
            </div>
          </header>

          <main className="bk-content" id="main">
            <Outlet />
          </main>
          <footer className="bk-legal">
            <span>© {new Date().getFullYear()} OXBANK · Demo application — no real money is moved.</span>
            <span>Deposits held in this demo are simulated and not insured.</span>
          </footer>
        </div>

        <nav className="bk-bottom-nav" aria-label="Quick navigation">
          {(isAdmin
            ? [
                { to: '/admin', label: 'Admin', icon: Shield },
                { to: '/Dashboard', label: 'Home', icon: LayoutDashboard },
                { to: '/notifications', label: 'Alerts', icon: Bell },
              ]
            : [
                { to: '/Dashboard', label: 'Home', icon: LayoutDashboard },
                { to: '/transfers', label: 'Pay', icon: ArrowLeftRight },
                { to: '/cards', label: 'Cards', icon: CreditCard },
                { to: '/savings', label: 'Save', icon: PiggyBank },
              ]
          ).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="More">
            <Menu size={20} />
            More
          </button>
        </nav>

        <SessionGuard />
      </div>
    </PrivacyProvider>
  );
}
