import React, { useState } from 'react';
import Footer from './Footer';
import './assets/Style.css/Login.css';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const signupData = JSON.parse(localStorage.getItem('signupData'));
    if (
      signupData &&
      signupData.email === form.email &&
      signupData.password === form.password
    ) {
       localStorage.setItem('isLoggedIn', 'true');
       navigate('/Dashboard');
    } else {
      alert('Invalid email or password.');
    }
  };

  return (
    <div className="auth-page animate-fade-in">
      <section className="auth-section">
        <div className="auth-card glass">
          <div className="auth-header">
            <img src="/Oxbank.png" alt="Logo" className="auth-logo" />
            <h2 className="text-gradient">Welcome Back</h2>
            <p className="auth-subtitle">Log in to your secure OXBANK account</p>
          </div>
          
          <form className="auth-form" onSubmit={handleSubmit}>
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
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="auth-options">
               <label className="remember-me">
                  <input type="checkbox" /> 
                  <span>Remember me</span>
               </label>
               <a href="#" className="forgot-pass">Forgot Password?</a>
            </div>

            <button type="submit" className="btn btn-primary auth-submit flex-center">
              <LogIn size={18} style={{ marginRight: '8px' }} />
              Log In
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/Signup">Create one for free</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Login;
