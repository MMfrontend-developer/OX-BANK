import React, { useState } from 'react';
// import { Header } from './Header';
import Footer from './Footer';
import './assets/Style.css/Login.css';
import { useNavigate } from 'react-router';

const EyeIcon = ({ visible }) => (
  visible ? (
    // Eye open SVG
    <svg width="36" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#551A8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ) : (
    // Eye closed SVG
    <svg width="32" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#551A8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
);

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
      alert('Login successful!');
      navigate('/Dashboard'); // Redirect to dashboard
    } else {
      alert('Invalid email or password.');
    }
  };

  return (
    <div>
      {/* <Header /> */}
      <section className="login-section">
        <div className="login-content">
          <h2>Login to OXBANK</h2>
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Email Address
              <input
                type="email"
                name="email"
                className="login-input"
                placeholder="Enter your email"
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
              style={{ paddingRight: "2.2rem" }} // just enough for the icon
               />
              <span
              onClick={() => setShowPassword((prev) => !prev)}
               className="password-eye"
               tabIndex={0}
               aria-label={showPassword ? "Hide password" : "Show password"}
               >
              <EyeIcon visible={showPassword} />
              </span>
            </label>
            <button type="submit" className="login-btn">Login</button>
          </form>
          <p>
            Don't have an account? <a href="/Signup">Sign up here</a>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Login;

 

