import React, { useState } from 'react';
import Footer from './Footer';
import './assets/Style.css/Profile.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useData } from './context/DataContext';
import { useToast } from './context/ToastContext';
import { changePassword } from './services/authService';
import { User, Mail, Lock, Save, Eye, EyeOff, ShieldCheck, KeyRound, RefreshCw, Smartphone } from 'lucide-react';

const Profile = () => {
  const { user, login } = useAuth();
  const { resetDemoData } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    pin: user?.pin || '1234',
  });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // If updating password
      if (form.newPassword || form.currentPassword) {
        if (!form.currentPassword) {
          setError('Please enter your current password to change password.');
          setIsLoading(false);
          return;
        }
        if (form.newPassword.length < 8) {
          setError('New password must be at least 8 characters.');
          setIsLoading(false);
          return;
        }
        if (form.newPassword !== form.confirmPassword) {
          setError('New passwords do not match.');
          setIsLoading(false);
          return;
        }

        const pwdRes = await changePassword(user.id, form.currentPassword, form.newPassword);
        if (!pwdRes.ok) {
          setError(pwdRes.error || 'Failed to change password.');
          setIsLoading(false);
          return;
        }
      }

      // Update PIN format check
      if (form.pin && !/^\d{4}$/.test(form.pin)) {
        setError('Transaction PIN must be exactly 4 digits.');
        setIsLoading(false);
        return;
      }

      // Update user state locally in DB / AuthContext
      const updatedUser = {
        ...user,
        name: form.name,
        email: form.email,
        pin: form.pin,
        twoFactorEnabled,
      };

      toast.success('Profile and settings updated successfully!');
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.message || 'Error updating profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-gradient">{user?.name}</h1>
            <p className="profile-email-display">{user?.email} • {user?.role?.toUpperCase() || 'CUSTOMER'}</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSave}>
          {/* PERSONAL INFO */}
          <section className="profile-section glass">
            <h2><User size={20} /> Personal Information</h2>

            <div className="input-field">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  name="name"
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
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </section>

          {/* SECURITY & PIN */}
          <section className="profile-section glass">
            <h2><KeyRound size={20} /> Security & Transaction PIN</h2>

            <div className="input-field">
              <label>4-Digit Transaction PIN</label>
              <div className="input-wrapper">
                <KeyRound size={18} className="input-icon" />
                <input
                  type="password"
                  name="pin"
                  maxLength={4}
                  value={form.pin}
                  onChange={handleChange}
                  placeholder="1234"
                  required
                />
              </div>
              <p className="profile-field-hint">Used to authorize transfers over ₦50,000 and view full card numbers.</p>
            </div>

            <div className="input-field toggle-field">
              <label className="toggle-label flex-center" style={{ justifyContent: 'space-between', width: '100%', cursor: 'pointer' }}>
                <span className="flex-center" style={{ gap: '8px' }}>
                  <Smartphone size={18} /> Enable 2FA Security Prompt
                </span>
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                />
              </label>
            </div>
          </section>

          {/* CHANGE PASSWORD */}
          <section className="profile-section glass">
            <h2><Lock size={20} /> Change Password</h2>
            <p className="profile-section-note">Leave blank to keep your current password.</p>

            <div className="input-field">
              <label>Current Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter current password"
                />
              </div>
            </div>

            <div className="input-field">
              <label>New Password</label>
              <div className="password-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showNew ? 'text' : 'password'}
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                />
                <button type="button" className="eye-btn" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-field">
              <label>Confirm New Password</label>
              <div className="password-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat new password"
                />
                <button type="button" className="eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </section>

          {error && <p className="profile-error">{error}</p>}

          <div className="profile-actions">
            <button type="submit" className="btn btn-primary flex-center" disabled={isLoading} style={{ gap: '8px' }}>
              <Save size={18} /> Save Settings
            </button>
            <button
              type="button"
              className="btn btn-secondary flex-center"
              onClick={resetDemoData}
              style={{ gap: '8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <RefreshCw size={16} /> Reset All Demo Data
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
