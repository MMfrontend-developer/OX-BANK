import React, { useState } from 'react';
import './assets/Style.css/Header.css';
import { Link, useLocation } from 'react-router-dom';

export const Header = ({ theme, toggleTheme }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const location = useLocation();
  const onDashboard = location.pathname === '/Dashboard';

  // Only show Login if NOT (logged in AND on dashboard)
  const showLogin = !(isLoggedIn && onDashboard);

  return (
    <header className="header">
      <div className="logo-hamburger">
        <img src="/Oxbank.png" className='OXBANK' alt="OXBANK Logo" />
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
      <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <Link to={'/'} onClick={() => setMenuOpen(false)}>Home</Link>
        <Link to={'/Services'} onClick={() => setMenuOpen(false)}>Services</Link>
        <Link to={'/About'} onClick={() => setMenuOpen(false)}>About</Link>
      </nav>
      <div className={`header-actions ${menuOpen ? 'open' : ''}`}>
        <div className='btn-log'>
          {showLogin && (
            <Link to={'/Login'} onClick={() => setMenuOpen(false)}>
              <button className='btn'>Login</button>
            </Link>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          style={{
            background: theme === 'light' ? '#551A8B' : '#fff',
            color: theme === 'light' ? '#fff' : '#551A8B',
            borderRadius: '8px',
            border: 'none',
            fontWeight: "700",
            fontSize: '1rem',
            padding: '10px 10px',
            cursor: 'pointer',
            marginRight: "5px",
          }}
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>
    </header>
  );
};


