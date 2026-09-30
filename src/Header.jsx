import React, { useState } from 'react';
import './assets/Style.css/Header.css';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './context/ThemeContext';
import { useData } from './context/DataContext';
import {
  Bell,
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  User,
  LogOut,
  Shield,
  FileText,
} from 'lucide-react';

export const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isLoggedIn, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);
  const isAdmin = user?.role === 'admin';

  const authenticatedLinks = isAdmin
    ? [
        { to: '/Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { to: '/admin', label: 'Admin', icon: <Shield size={16} /> },
        { to: '/transactions', label: 'Transactions', icon: <FileText size={16} /> },
      ]
    : [
        { to: '/Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { to: '/transfers', label: 'Transfers', icon: <ArrowLeftRight size={16} /> },
        { to: '/bills', label: 'Bills', icon: <Receipt size={16} /> },
        { to: '/cards', label: 'Cards', icon: <CreditCard size={16} /> },
        { to: '/transactions', label: 'History', icon: <FileText size={16} /> },
      ];

  return (
    <header className="header glass">
      <div className="header-container">
        {/* Logo */}
        <div className="logo-hamburger">
          <Link to="/" className="logo-link">
            <img src="/Oxbank.png" className="OXBANK" alt="OXBANK Logo" />
            <span className="logo-text">OXBANK</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          {!isLoggedIn ? (
            <>
              <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Home</NavLink>
              <NavLink to="/Services" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Services</NavLink>
              <NavLink to="/About" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>About</NavLink>
            </>
          ) : (
            authenticatedLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => isActive ? 'active' : ''}
                onClick={closeMenu}
              >
                {link.label}
              </NavLink>
            ))
          )}

          {/* Mobile-only auth link */}
          {!isLoggedIn && (
            <div className="mobile-auth-container">
              <Link to="/Login" className="auth-link" onClick={closeMenu}>
                <button className="btn btn-primary">Sign In</button>
              </Link>
            </div>
          )}
        </nav>

        {/* Right actions */}
        <div className={`header-actions ${menuOpen ? 'open' : ''}`}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-modern"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Notification bell (logged in only) */}
          {isLoggedIn && (
            <Link to="/notifications" className="notif-bell-btn" aria-label={`Notifications, ${unreadCount} unread`}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </Link>
          )}

          {/* User avatar / sign in */}
          <div className="header-auth-container">
            {!isLoggedIn ? (
              <Link to="/Login" className="auth-link">
                <button className="btn btn-primary">Sign In</button>
              </Link>
            ) : (
              <div className="user-profile-dropdown">
                <div className="avatar" aria-label="User menu" tabIndex={0} role="button">
                  {user?.avatar || user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="dropdown-menu glass">
                  <div className="dropdown-header">
                    <p className="user-name">{user?.name}</p>
                    <p className="user-email">{user?.email}</p>
                    {isAdmin && <span className="admin-badge">Admin</span>}
                  </div>
                  <hr className="dropdown-divider" />
                  <Link to="/Dashboard" className="dropdown-item" onClick={closeMenu}>
                    <LayoutDashboard size={14} /> Dashboard
                  </Link>
                  <Link to="/profile" className="dropdown-item" onClick={closeMenu}>
                    <User size={14} /> Profile & Security
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="dropdown-item" onClick={closeMenu}>
                      <Shield size={14} /> Admin Panel
                    </Link>
                  )}
                  <hr className="dropdown-divider" />
                  <Link to="/Logout" className="dropdown-item logout-link" onClick={closeMenu}>
                    <LogOut size={14} /> Log Out
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hamburger */}
        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>
    </header>
  );
};
