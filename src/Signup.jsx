import React, { useState } from 'react';
import './assets/Style.css/Signup.css';
import Footer from './Footer';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from './context/ToastContext';

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

const Signup = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { toast } = useToast();

  const strength = getStrength(form.password);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signup({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      if (res.ok) {
        toast.success('Account created successfully! Welcome to OXBANK.');
        navigate('/Dashboard');
      } else {
        setError(res.error || 'Failed to create account.');
        toast.error(res.error || 'Signup failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
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

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

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
                  autoComplete="name"
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
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="input-field">
              <label>Password</label>
              <div className="password-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
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
              {form.password && (
                <div className="password-strength">
                  <div className="strength-bars">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="strength-bar"
                        style={{ background: strength >= i ? strengthColor[strength] : 'var(--border-glass)' }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: strengthColor[strength] }}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>
            <div className="input-field">
              <label>Confirm Password</label>
              <div className="password-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="eye-btn"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.confirmPassword && form.password === form.confirmPassword && (
                <p className="pw-match"><CheckCircle2 size={14} /> Passwords match</p>
              )}
            </div>

            <div className="auth-terms">
              <label className="terms-check">
                <input type="checkbox" required />
                <span>
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit flex-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-spinner"></span>
              ) : (
                <>
                  <UserPlus size={18} style={{ marginRight: '8px' }} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/Login">Sign in instead</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Signup;
