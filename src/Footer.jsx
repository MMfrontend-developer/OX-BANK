import React from 'react';
import './assets/Style.css/Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <div className="footer-brand">
        <img src="/OXBANKFOOTER2.png" alt="OXBANK Logo" className="footer-logo" />
        <span>OXBANK</span>
      </div>
      <nav className="footer-nav">
        <a href="/">Home</a>
        <a href="/Services">Services</a>
        <a href="/About">About</a>
      </nav>
      <div className="footer-contact">
        <span>Email: support@oxbank.com</span>
        <span>Phone: +234-7083-5283-77</span>
        <p className="footer-credit">
        <a href="https://github.com/MMfrontend-developer" target="_blank" rel="noopener noreferrer">Designed by M-M</a>
      </p>
      </div>
    </div>
    <div className="footer-bottom">
      &copy; {new Date().getFullYear()} OXBANK. All rights reserved.
    </div>
  </footer>
);

export default Footer;