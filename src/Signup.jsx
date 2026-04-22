import React, { useState } from 'react'
import "./assets/Style.css/Signup.css"
import Footer from './Footer'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, UserPlus, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const Signup = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('signupData', JSON.stringify(form));
    alert('Account created successfully!');
    navigate('/Login');
  };

  return (
    <div className="auth-page animate-fade-in">
      <section className="auth-section">
        <div className="auth-card glass">
          <div className="auth-header">
            <img src="/Oxbank.png" alt="Logo" className="auth-logo" />
            <h2 className="text-gradient">Get Started</h2>
            <p className="auth-subtitle">Join OXBANK and manage your wealth elegantly</p>
          </div>
          
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-field">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Nathan Drake"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="input-field">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="nathan@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="input-field">
              <label>Password</label>
              <div className="password-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="eye-btn"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="auth-terms">
               <label className="terms-check">
                  <input type="checkbox" required /> 
                  <span>
                    I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                  </span>
               </label>
            </div>

            <button type="submit" className="btn btn-primary auth-submit flex-center">
              <UserPlus size={18} style={{ marginRight: '8px' }} />
              Create Account
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/Login">Sign in instead</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default Signup
