import React from 'react'
import "./assets/Style.css/Home.css"
import Footer from './Footer'
import { Link } from 'react-router-dom'
import { 
  ShieldCheck, 
  Zap, 
  BrainCircuit, 
  Globe, 
  ArrowRight,
  TrendingUp
} from 'lucide-react'
 
const Home = () => {
  return (
    <div className="home-page animate-fade-in"> 
      <div className="home-content">
        <section className="hero-modern glass">
          <div className="hero-container">
            <div className="hero-text-content">
              <div className="badge">
                <TrendingUp size={14} style={{ marginRight: '6px' }} />
                New: Intelligent Spending Analytics
              </div>
              <h1 className="hero-title">
                Banking <span className="text-gradient">Redefined</span> for the Next Generation.
              </h1>
              <p className="hero-description">
                Secure, seamless, and stunningly beautiful. Manage your finances with 
                precision using our state-of-the-art interface.
              </p>
              <div className="hero-actions">
                <Link to="/Signup" className="btn btn-primary hero-main-btn flex-center">
                  Start Banking Now <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </Link>
                <Link to="/About" className="btn btn-secondary">Learn More</Link>
              </div>
              <div className="hero-stats">
                <div className="stat">
                  <strong>1M+</strong>
                  <span>Active Users</span>
                </div>
                <div className="stat">
                  <strong>99.9%</strong>
                  <span>Uptime</span>
                </div>
                <div className="stat">
                  <strong>4.9/5</strong>
                  <span>App Rating</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-card glass glass-interactive">
                <div className="card-top">
                  <div className="chip"></div>
                  <div className="ox-logo">OX</div>
                </div>
                <div className="card-number">•••• •••• •••• 8824</div>
                <div className="card-bottom">
                  <div className="card-holder">Muhyideen</div>
                  <div className="card-expiry">12/28</div>
                </div>
              </div>
              <div className="visual-decoration circle-1"></div>
              <div className="visual-decoration circle-2"></div>
            </div>
          </div>
        </section>

        <section className="features-modern">
          <div className="features-container">
            <div className="section-header-modern">
              <h2 className="section-title">Why the world loves OXBANK</h2>
              <p className="section-subtitle">We build for the modern user who demands both security and style.</p>
            </div>
            
            <div className="features-grid">
              <div className="feature-card glass glass-interactive">
                <div className="feature-icon secure">
                  <ShieldCheck size={32} color="var(--primary)" />
                </div>
                <h3>Bank-Grade Security</h3>
                <p>Top-tier encryption and multi-factor authentication to keep your assets untouchable.</p>
              </div>
              <div className="feature-card glass glass-interactive">
                <div className="feature-icon speed">
                  <Zap size={32} color="#ffd700" />
                </div>
                <h3>Instant Transfers</h3>
                <p>Move money across the globe in seconds, not days. Zero hidden fees.</p>
              </div>
              <div className="feature-card glass glass-interactive">
                <div className="feature-icon smart">
                  <BrainCircuit size={32} color="var(--accent)" />
                </div>
                <h3>AI Insights</h3>
                <p>Smart categorisation and spending predictions to help you save more effortlessly.</p>
              </div>
              <div className="feature-card glass glass-interactive">
                <div className="feature-icon globally">
                  <Globe size={32} color="#45aaf2" />
                </div>
                <h3>Global Access</h3>
                <p>One account, multiple currencies. Travel the world with localized banking.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-modern">
          <div className="cta-container glass">
            <h2>Ready to transform your finances?</h2>
            <p>Join over 1 million people who have already switched to the future of banking.</p>
            <Link to="/Signup" className="btn btn-primary">Create Your Free Account</Link>
          </div>
        </section>
      </div>

      <Footer/>
    </div>
  )
}
export default Home
