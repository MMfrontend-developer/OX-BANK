import React, { useState } from 'react';
import './assets/Style.css/Header.css';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const Header = ({ theme, toggleTheme }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  const renderAuthContent = (isMobileMenu = false) => {
    if (isMobileMenu && isLoggedIn) return null;

    return (
      <div className={`btn-log ${isMobileMenu ? 'mobile-menu-auth' : 'header-auth'}`}>
        {!isLoggedIn ? (
          <Link to={'/Login'} className="auth-link" onClick={closeMenu}>
            <button className='btn btn-primary'>Sign In</button>
          </Link>
        ) : (
          <div className="user-profile-dropdown">
            <div className="avatar" aria-label="User menu">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="dropdown-menu glass">
              <div className="dropdown-header">
                <p className="user-name">{user.name}</p>
                <p className="user-email">{user.email}</p>
              </div>
              <hr className="dropdown-divider" />
              <Link to="/Dashboard" className="dropdown-item" onClick={closeMenu}>
                Dashboard
              </Link>
              <Link to="/profile" className="dropdown-item" onClick={closeMenu}>
                Profile Settings
              </Link>
              <Link to="/Logout" className="dropdown-item logout-link" onClick={closeMenu}>
                Log Out
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="header glass">
      <div className="header-container">
        <div className="logo-hamburger">
          <Link to="/" className="logo-link">
            <img src="/Oxbank.png" className='OXBANK' alt="OXBANK Logo" />
            <span className="logo-text">OXBANK</span>
          </Link>
        </div>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <Link to={'/'} className={location.pathname === '/' ? 'active' : ''} onClick={closeMenu}>Home</Link>
          <Link to={'/Services'} className={location.pathname === '/Services' ? 'active' : ''} onClick={closeMenu}>Services</Link>
          <Link to={'/About'} className={location.pathname === '/About' ? 'active' : ''} onClick={closeMenu}>About</Link>
          {isLoggedIn && (
            <Link
              to={'/Dashboard'}
              className={location.pathname === '/Dashboard' ? 'active' : ''}
              onClick={closeMenu}
            >
              Dashboard
            </Link>
          )}
          {!isLoggedIn && (
            <div className="mobile-auth-container">
              {renderAuthContent(true)}
            </div>
          )}
        </nav>

        <div className={`header-actions ${menuOpen ? 'open' : ''}`}>
          <button
            onClick={toggleTheme}
            className="theme-toggle-modern"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <div className="header-auth-container">
            {renderAuthContent(false)}
          </div>
        </div>

        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
    </header>
  );
};
