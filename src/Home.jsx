import React from 'react'
// import { Header } from './Header'
import "./assets/Style.css/Home.css"
import Footer from './Footer'
import { Link } from 'react-router'

const Home = () => {
 return (
    <div> 
        {/* <Header /> */}
     <section className="hero">
    <div className="hero-content">
      <img src="/Oxbank.png" alt="OXBANK Logo" className="hero-logo" />
      <h1>Welcome to OXBANK
        fghfg
      </h1>
      <p>Your trusted partner for secure,<span className='hero-down-text'> easy, and modern banking.</span></p>
            <Link to="/Signup" className="hero-btn">Get Started</Link>
    </div>
  </section>
  <section className="features">
  <h2>Why Choose OXBANK?</h2>
  <div className="features-list">
    <div className="feature-item">
      <h3>Secure</h3>
      <p>Your data and money are protected with top-level security.</p>
    </div>
    <div className="feature-item">
      <h3>Easy to Use</h3>
      <p>Simple, intuitive interface for all your banking needs.</p>
    </div>
    <div className="feature-item">
      <h3>Mobile Friendly</h3>
      <p>Bank anytime, anywhere with our mobile app.</p>
    </div>
    <div className="feature-item">
      <h3>24/7 Support</h3>
      <p>We’re here to help, day or night.</p>
    </div>
  </div>
</section>
<Footer/>
    </div>
  )
}
export default Home


 {/* <p>
            Open an account in minutes and take control of your finances with our secure and smart banking solutions.
          </p> */}

           {/* <h1> Bank Smarter, Live Better</h1> */}