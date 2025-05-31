import React from 'react';
// import { Header } from './Header';
import Footer from './Footer';
import './assets/Style.css/Services.css';

const Services = () => (
  <div>
    {/* <Header /> */}
    <section className="services-section">
      <div className="services-content">
        <h1>Our Banking Services</h1>
        <p className="services-intro">
          OXBANK offers a full suite of modern banking services to help you manage your finances with ease and security.
        </p>
        <div className="services-list">
          <div className="service-card">
            <h2>Personal Accounts</h2>
            <p>Open and manage your savings or current accounts with flexible options and zero hidden fees.</p>
          </div>
          <div className="service-card">
            <h2>Online Banking</h2>
            <p>Access your accounts, transfer funds, and pay bills anytime, anywhere with our secure online platform.</p>
          </div>
          <div className="service-card">
            <h2>Mobile Banking</h2>
            <p>Bank on the go with our user-friendly mobile app, available for both Android and iOS devices.</p>
          </div>
          <div className="service-card">
            <h2>Loans & Credit</h2>
            <p>Get quick approval for personal, auto, or home loans with competitive interest rates.</p>
          </div>
          <div className="service-card">
            <h2>Customer Support</h2>
            <p>Our support team is available 24/7 to assist you with any banking needs or questions.</p>
          </div>
          <div className="service-card">
            <h2>Investment Services</h2>
            <p>Grow your wealth with our investment and advisory services tailored to your goals.</p>
          </div>
        </div>
      </div>
    </section>
    <Footer />
  </div>
);

export default Services;