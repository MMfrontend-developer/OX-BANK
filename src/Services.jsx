import React from 'react';
import Footer from './Footer';
import './assets/Style.css/Services.css';
import { 
  Building2, 
  Smartphone, 
  ShieldCheck, 
  TrendingUp, 
  CreditCard, 
  MessageSquare,
  CheckCircle2
} from 'lucide-react';

const Services = () => (
  <div className="services-page animate-fade-in">
    <div className="services-container">
      <section className="services-hero-section">
        <div className="services-hero-container">
          <h1 className="text-gradient">Innovating Your Financial Life</h1>
          <p className="services-subtitle">
            OXBANK provides a comprehensive ecosystem of digital tools designed to empower 
            your financial journey with speed, security, and intelligence.
          </p>
        </div>
      </section>

      <section className="services-main-section">
        <div className="services-grid-container">
          <div className="service-card-modern glass glass-interactive">
            <div className="service-icon"><Building2 size={40} color="var(--primary)" /></div>
            <h3>Premium Accounts</h3>
            <p>High-yield savings and current accounts with no maintenance fees and worldwide access.</p>
            <ul className="service-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> Zero hidden fees</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Multi-currency support</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Instant setup</li>
            </ul>
          </div>

          <div className="service-card-modern glass glass-interactive">
            <div className="service-icon"><Smartphone size={40} color="var(--primary)" /></div>
            <h3>Next-Gen App</h3>
            <p>Experience the most intuitive mobile banking interface. Manage wealth on the move with ease.</p>
            <ul className="service-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> Biometric security</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Real-time notifications</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Dark mode support</li>
            </ul>
          </div>

          <div className="service-card-modern glass glass-interactive">
            <div className="service-icon"><ShieldCheck size={40} color="var(--primary)" /></div>
            <h3>Vault Protection</h3>
            <p>Bank-grade encryption and individual insurance on all deposits for absolute peace of mind.</p>
            <ul className="service-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> 2FA everywhere</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Card freezing instantly</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Fraud detection AI</li>
            </ul>
          </div>

          <div className="service-card-modern glass glass-interactive">
            <div className="service-icon"><TrendingUp size={40} color="var(--primary)" /></div>
            <h3>Smart Investments</h3>
            <p>Automated portfolio management and personalized investment advice powered by data.</p>
            <ul className="service-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> Stock trading</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Crypto integration</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Tax optimization</li>
            </ul>
          </div>

          <div className="service-card-modern glass glass-interactive">
            <div className="service-icon"><CreditCard size={40} color="var(--primary)" /></div>
            <h3>Elite Credit</h3>
            <p>Exclusive credit lines with competitive rates and high-tier reward programs for travelers.</p>
            <ul className="service-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> Cashback rewards</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Airport lounge access</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Concierge service</li>
            </ul>
          </div>

          <div className="service-card-modern glass glass-interactive">
            <div className="service-icon"><MessageSquare size={40} color="var(--primary)" /></div>
            <h3>Priority Support</h3>
            <p>Dedicated financial advisors and 24/7 technical support available via chat or phone.</p>
            <ul className="service-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> Under 1 min wait time</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Local experts</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Video consultations</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
    <Footer />
  </div>
);

export default Services;