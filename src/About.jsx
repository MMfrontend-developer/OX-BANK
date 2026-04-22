import React from 'react';
import Footer from './Footer';
import './assets/Style.css/About.css';
import { 
  Handshake, 
  Target, 
  Lightbulb, 
  Globe2,
  Calendar
} from 'lucide-react';

const About = () => (
  <div className="about-page animate-fade-in">
    <div className="about-container">
      <section className="about-hero-modern">
        <div className="about-hero-container">
          <div className="badge">
            <Calendar size={14} style={{ marginRight: '6px' }} />
            Established 2024
          </div>
          <h1 className="text-gradient">Human-Centric Banking</h1>
          <p>
            At OXBANK, we believe technology should empower people, not replace them. 
            We're building the future of finance with a heart.
          </p>
        </div>
      </section>

      <section className="about-content-section">
        <div className="about-grid">
          <div className="about-text-card glass">
            <h2>Our DNA</h2>
            <p>
              OXBANK was born from a simple observation: banking was too slow, too complicated, 
              and too impersonal. We set out to change that by combining cutting-edge technology 
              with a deep understanding of what people actually need from their money.
            </p>
            <div className="about-values-grid">
              <div className="value-item">
                <span className="value-icon"><Handshake size={28} color="var(--primary)" /></span>
                <div>
                  <strong>Trust</strong>
                  <p>We are transparent in everything we do.</p>
                </div>
              </div>
              <div className="value-item">
                <span className="value-icon"><Lightbulb size={28} color="var(--primary)" /></span>
                <div>
                  <strong>Innovation</strong>
                  <p>Always pushing the boundaries of what's possible.</p>
                </div>
              </div>
              <div className="value-item">
                <span className="value-icon"><Globe2 size={28} color="var(--primary)" /></span>
                <div>
                  <strong>Inclusion</strong>
                  <p>Banking that belongs to everyone.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="about-mission-card glass glass-interactive">
            <div className="mission-content">
              <h3>Our Mission</h3>
              <div className="mission-icon-wrapper">
                <Target size={40} color="white" />
              </div>
              <p className="mission-statement">
                "To create a world where financial freedom is accessible to everyone, 
                powered by safe, intelligent, and beautiful technology."
              </p>
              <div className="mission-stats">
                <div className="mission-stat">
                  <strong>10+</strong>
                  <span>Countries</span>
                </div>
                <div className="mission-stat">
                  <strong>250+</strong>
                  <span>Engineers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-timeline-section">
          <div className="timeline-container">
              <h2 className="section-title text-center">Our Journey</h2>
              <div className="timeline">
                  <div className="timeline-item glass">
                      <span className="year">2024</span>
                      <h3>The Spark</h3>
                      <p>OXBANK was founded in a small studio in London with a vision to simplify banking.</p>
                  </div>
                  <div className="timeline-item glass">
                      <span className="year">2025</span>
                      <h3>Global Expansion</h3>
                      <p>We reached our first 100,000 users and expanded to 3 new countries.</p>
                  </div>
                  <div className="timeline-item glass">
                      <span className="year">2026</span>
                      <h3>The Future</h3>
                      <p>Re-launching with a new AI-driven platform and premium design system.</p>
                  </div>
              </div>
          </div>
      </section>
    </div>
    <Footer />
  </div>
);

export default About;