import React from 'react';
// import { Header } from './Header';
import Footer from './Footer';
import './assets/Style.css/About.css';

const About = () => (
  <div>
    {/* <Header /> */}
    <section className="about-hero">
      <div className="about-hero-content">
        <h1>About OXBANK</h1>
        <p>
          Empowering your financial journey with trust, innovation, and security.<br />
          Discover the story and values behind OXBANK.
        </p>
      </div>
    </section>
    <section className="about-main">
      <div className="about-main-content">
        <h2>Who We Are</h2>
        <p className="about-intro">
          OXBANK is a modern digital bank dedicated to providing seamless, secure, and innovative banking experiences. 
          Our mission is to make banking simple, accessible, and rewarding for everyone.
        </p>
        <div className="about-highlights">
          <div className="highlight-card">
            <h3>Our Vision</h3>
            <p>To be the most trusted and customer-centric digital bank, leading the way in financial technology and service excellence.</p>
          </div>
          <div className="highlight-card">
            <h3>Our Mission</h3>
            <p>Empowering individuals and businesses with smart, secure, and innovative banking solutions for a brighter financial future.</p>
          </div>
          <div className="highlight-card highlight">
            <h3>Our Values</h3>
            <ul>
              <li>Integrity & Transparency </li>
              <li>Customer First</li>
              <li>Innovation</li>
              <li>Security</li>
              <li>Inclusivity</li>
            </ul>
          </div>
        </div>
        <div className="about-extra">
          <h2>Why Choose OXBANK?</h2>
          <ul>
            <li>24/7 secure online and mobile banking</li>
            <li>Dedicated customer support</li>
            <li>Cutting-edge technology for your safety</li>
            <li>Personalized financial solutions</li>
            <li>Transparent, no hidden fees</li>
          </ul>
        </div>
      </div>
    </section>
    <Footer />
  </div>
);

export default About;