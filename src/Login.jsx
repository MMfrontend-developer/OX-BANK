import React, { useState } from 'react';
// import { Header } from './Header';
import Footer from './Footer';
import './assets/Style.css/Login.css';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
// okay
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
            <label>
              Password
              <input
                type="password"
                name="password"
                className="login-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
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

 

