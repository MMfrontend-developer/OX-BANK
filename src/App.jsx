import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Home from './Home';
import Services from './Services';
import Login from './Login';
import Logout from './Logout';
import About from './About';
import Signup from './Signup';
import Dashboard from './Dashboard';
import { Header } from './Header';
import ProtectedRoute from './ProtectedRoute';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <BrowserRouter>
      <Header theme={theme} toggleTheme={toggleTheme} />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/Services" element={<Services/>} />
        <Route path="/Login" element={<Login/>} />
        <Route path="/Logout" element={<Logout/>} />
        <Route path="/About" element={<About/>} />
        <Route path="/Signup" element={<Signup/>} />
        <Route path="/Dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


