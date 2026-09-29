import React, { useState } from 'react';
import Footer from './Footer';
import './assets/Style.css/Profile.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { User, Mail, Lock, Save, Eye, EyeOff, ShieldCheck, Bell } from 'lucide-react';

const Profile = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    setError('');

    const storedData = JSON.parse(localStorage.getItem('signupData')) || {};

    // If changing password, validate
    if (form.newPassword || form.currentPassword) {
      if (form.currentPassword !== storedData.password) {
        setError('Current password is incorrect.');
        return;
      }
      if (form.newPassword.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setError('New passwords do not match.');
        return;
      }
    }

    const updatedData = {
      ...storedData,
      name: form.name,
      email: form.email,
      password: form.newPassword || storedData.password,
    };
    login(updatedData);
    setSaved(true);
    setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-gradient">{user.name}</h1>
            <p className="profile-email-display">{user.email}</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSave}>
          <section className="profile-section glass">
            <h2><User size={20} /> Personal Info</h2>

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
                  placeholder="Min. 6 characters"
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
          {saved && <p className="profile-success"><ShieldCheck size={16} /> Changes saved successfully!</p>}

          <div className="profile-actions">
            <button type="submit" className="btn btn-primary flex-center" style={{ gap: '8px' }}>
              <Save size={18} /> Save Changes
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/Dashboard')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
