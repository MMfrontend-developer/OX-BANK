import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import './App.css';

// Contexts
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { DataProvider } from './context/DataContext';

// Public pages (small — not lazy)
import Home from './Home';
import Services from './Services';
import About from './About';
import Logout from './Logout';
import { Header } from './Header';
import ProtectedRoute from './ProtectedRoute';
import DemoBanner from './components/DemoBanner';

// Lazy-load the banking app for a faster first paint on the marketing site
const Login = lazy(() => import('./Login'));
const Signup = lazy(() => import('./Signup'));
const AppLayout = lazy(() => import('./components/AppLayout'));
const Dashboard = lazy(() => import('./Dashboard'));
const Transactions = lazy(() => import('./Transactions'));
const Profile = lazy(() => import('./Profile'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const BillsPage = lazy(() => import('./pages/BillsPage'));
const CardsPage = lazy(() => import('./pages/CardsPage'));
const SavingsPage = lazy(() => import('./pages/SavingsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const PageLoader = () => (
  <div className="page-loader" aria-busy="true" aria-label="Loading page">
    <span className="auth-spinner" />
  </div>
);

/** Marketing / auth pages keep the public header. */
const PublicLayout = () => (
  <>
    <Header />
    <Outlet />
  </>
);

function AppShell() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DemoBanner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/Services" element={<Services />} />
            <Route path="/About" element={<About />} />
            <Route path="/Login" element={<Login />} />
            <Route path="/Signup" element={<Signup />} />
            <Route path="/Logout" element={<Logout />} />
          </Route>

          {/* Signed-in banking app */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <AppShell />
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
