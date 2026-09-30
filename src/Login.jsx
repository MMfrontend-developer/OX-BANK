import React, { useState } from 'react';
import Footer from './Footer';
import './assets/Style.css/Login.css';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from './context/ToastContext';

const DEMO_ACCOUNTS = [
  { label: 'Customer (Default)', email: 'demo@oxbank.test', pass: 'Demo@1234', role: 'User' },
  { label: 'Customer 2', email: 'alice@oxbank.test', pass: 'Alice@1234', role: 'User' },
  { label: 'System Admin', email: 'admin@oxbank.test', pass: 'Admin@1234', role: 'Admin' },
];

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const fillDemo = (acc) => {
    setForm({ email: acc.email, password: acc.pass });
    setError('');
    toast.info(`Filled credentials for ${acc.label}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await login(form.email, form.password);
      if (res.ok) {
        toast.success(`Welcome back, ${res.user.name}!`);
        if (res.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/Dashboard');
        }
      } else {
        setError(res.error || 'Invalid email or password.');
        toast.error(res.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
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
            <h2 className="text-gradient">Welcome Back</h2>
            <p className="auth-subtitle">Log in to your secure OXBANK account</p>
          </div>

          {/* DEMO ACCOUNTS QUICK-FILL PICKER */}
          <div className="demo-credentials-box">
            <p className="demo-cred-title"><UserCheck size={14} /> Quick Demo Logins</p>
            <div className="demo-cred-buttons">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="demo-cred-btn"
                  onClick={() => fillDemo(acc)}
                  title={`Click to fill ${acc.email}`}
                >
                  <span className="demo-cred-label">{acc.label}</span>
                  <span className="demo-cred-role">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-field">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="demo@oxbank.test"
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
                  autoComplete="current-password"
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
                <input type="checkbox" defaultChecked />
                <span>Remember session</span>
              </label>
              <span className="forgot-pass-hint">Demo PIN: 1234</span>
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
                  <LogIn size={18} style={{ marginRight: '8px' }} />
                  Log In
                </>
              )}
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
