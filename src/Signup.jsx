import React, { useState } from 'react'
// import { Header } from './Header'
import "./assets/Style.css/Signup.css"
import Footer from './Footer'

const EyeIcon = ({ visible }) => (
  visible ? (
    // Eye open SVG
    <svg width="45" height="25" viewBox="0 0 24 24" fill="none"
      stroke="#551A8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ) : (
    // Eye closed SVG
    <svg width="45" height="25" viewBox="0 0 24 24" fill="none"
      stroke="#551A8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
);

const Signup = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false); // <-- Add this

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save to localStorage
    localStorage.setItem('signupData', JSON.stringify(form));
    alert('Signup successful!');
    setForm({ name: '', email: '', password: '' });
  };

  return (
    <div>
      {/* <Header /> */}
      <section className="signup-section">
        <div className="signup-content">
          <h1>Create Your Account</h1>
          <form className="signup-form" onSubmit={handleSubmit}>
            <label>
              Full Name
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Email Address
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
            <label style={{ position: 'relative' }}>
              Password
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="login-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                style={{ paddingRight: "2.2rem" }}
              />
              <span
                onClick={() => setShowPassword((prev) => !prev)}
                className="password-eye"
                tabIndex={0}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "20px",
                  top: "60px",
                  cursor: "pointer",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  height: "35px",
                   fontSize: "2rem",
                }}
              >
                <EyeIcon visible={showPassword} />
              </span>
            </label>
            <button type="submit" className="primary">Sign Up</button>
          </form>
          <p>Already have an account? <a href="/Login">Login here</a></p>
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default Signup
