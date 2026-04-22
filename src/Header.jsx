import React, { useState, useEffect } from 'react';
import './assets/Style.css/Header.css';
import { Link, useLocation } from 'react-router-dom';

export const Header = ({ theme, toggleTheme }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const location = useLocation();
  const [user, setUser] = useState({ name: 'User' });

  useEffect(() => {
    try {
      const signupData = JSON.parse(localStorage.getItem('signupData'));
      if (signupData) setUser(signupData);
    } catch (err) {
      console.error("Failed to load user data in Header:", err);
    }
  }, []);

  // Purely based on login status
  const showLogin = !isLoggedIn;

  const renderAuthContent = (isMobileMenu = false) => {
    if (isMobileMenu && isLoggedIn) return null;
    
    return (
      <div className={`btn-log ${isMobileMenu ? 'mobile-menu-auth' : 'header-auth'}`}>
        {showLogin ? (
          <Link to={'/Login'} className="auth-link" onClick={() => setMenuOpen(false)}>
            <button className='btn btn-primary'>Sign In</button>
          </Link>
        ) : (
          <div className="user-profile-dropdown">
            <div className="avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="dropdown-menu glass">
              <div className="dropdown-header">
                <p className="user-name">{user.name}</p>
                <p className="user-email">{user.email}</p>
              </div>
              <hr className="dropdown-divider" />
              <Link to="/Dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Link to="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                Profile Settings
              </Link>
              <Link to="/Logout" className="dropdown-item logout-link" onClick={() => setMenuOpen(false)}>
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
          <Link to={'/'} className={location.pathname === '/' ? 'active' : ''} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to={'/Services'} className={location.pathname === '/Services' ? 'active' : ''} onClick={() => setMenuOpen(false)}>Services</Link>
          <Link to={'/About'} className={location.pathname === '/About' ? 'active' : ''} onClick={() => setMenuOpen(false)}>About</Link>
          {isLoggedIn && (
            <Link 
              to={'/Dashboard'} 
              className={location.pathname === '/Dashboard' ? 'active' : ''} 
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
          )}
          {/* Auth button inside mobile menu - show only if not logged in (avatar is in top bar) */}
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
          
          {/* Auth button for desktop/mobile header - show only avatar on mobile */}
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


