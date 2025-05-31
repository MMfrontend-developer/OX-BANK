import React, { useState } from 'react'
// import { Header } from './Header'
import "./assets/Style.css/Signup.css"
import Footer from './Footer'

const Signup = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });

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
            <label>
              Password
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
              />
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
