import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';

// Contexts
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { DataProvider } from './context/DataContext';

// Existing pages (not lazy — small)
import Home from './Home';
import Services from './Services';
import About from './About';
import Logout from './Logout';
import { Header } from './Header';
import ProtectedRoute from './ProtectedRoute';
import DemoBanner from './components/DemoBanner';

// Lazy-load heavier pages for faster initial load
const Login = lazy(() => import('./Login'));
const Signup = lazy(() => import('./Signup'));
const Dashboard = lazy(() => import('./Dashboard'));
const Transactions = lazy(() => import('./Transactions'));
const Profile = lazy(() => import('./Profile'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const BillsPage = lazy(() => import('./pages/BillsPage'));
const CardsPage = lazy(() => import('./pages/CardsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

// ─────────────────────────────────────────────────────────────
// Admin Route Guard
// ─────────────────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
  const { isLoggedIn, user, loading } = useAuth();
  if (loading) return null;
  if (!isLoggedIn) return <Navigate to="/Login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/Dashboard" replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────
// Loading fallback
// ─────────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="page-loader" aria-busy="true" aria-label="Loading page">
    <span className="auth-spinner" />
  </div>
);

// ─────────────────────────────────────────────────────────────
// App Shell (inside providers, has access to Auth)
// ─────────────────────────────────────────────────────────────
function AppShell() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DemoBanner />
      <Header />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/Services" element={<Services />} />
          <Route path="/About" element={<About />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Signup" element={<Signup />} />
          <Route path="/Logout" element={<Logout />} />

          {/* Protected — customer */}
          <Route path="/Dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/transfers" element={<ProtectedRoute><TransfersPage /></ProtectedRoute>} />
          <Route path="/bills" element={<ProtectedRoute><BillsPage /></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><CardsPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

          {/* Admin only */}
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Root with providers
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
