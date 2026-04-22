import React from 'react';
import './assets/Style.css/Footer.css';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  MapPin,
} from 'lucide-react';

// Custom Social Icons since Lucide v1 removed brand icons
const XIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.933zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z"/>
  </svg>
);

const LinkedinIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.981 0 1.775-.773 1.775-1.729V1.729C24 .774 23.206 0 22.225 0z"/>
  </svg>
);

const InstagramIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const Footer = () => (
  <footer className="footer-modern glass">
    <div className="footer-container">
      <div className="footer-grid">
        <div className="footer-brand-col">
          <div className="footer-logo-wrapper">
             <img src="/Oxbank.png" alt="OXBANK Logo" className="footer-logo" />
             <span className="logo-text">OXBANK</span>
          </div>
          <p className="brand-pitch">
            Redefining the future of digital banking through innovation, security, and elite design.
          </p>
          <div className="social-links">
            <a href="#" aria-label="X"><XIcon size={18} /></a>
            <a href="#" aria-label="LinkedIn"><LinkedinIcon size={18} /></a>
            <a href="#" aria-label="Instagram"><InstagramIcon size={18} /></a>
          </div>
        </div>

        <div className="footer-links-col">
          <h4>Platform</h4>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/Dashboard">Dashboard</Link>
            <Link to="/Services">Services</Link>
            <Link to="/About">About Us</Link>
          </nav>
        </div>

        <div className="footer-links-col">
          <h4>Legal</h4>
          <nav>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
            <a href="#">Security</a>
          </nav>
        </div>

        <div className="footer-contact-col">
          <h4>Support</h4>
          <div className="contact-info">
            <p><Mail size={16} className="contact-icon" /> support@oxbank.com</p>
            <p><Phone size={16} className="contact-icon" /> +234 708 352 8377</p>
            <p><MapPin size={16} className="contact-icon" /> Victoria Island, Lagos</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom-modern">
        <div className="copyright">
           &copy; {new Date().getFullYear()} OXBANK. All rights reserved.
        </div>
        <div className="designer-credit">
           Designed by <a href="https://github.com/MMfrontend-developer" target="_blank" rel="noopener noreferrer">MM</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;