# 🏛️ OXBANK — Full Digital Banking Web Application Demo

> **Disclaimer:** Demo mode only. All money, transactions, and account details are simulated 100% in-browser. No real funds are accessed or transferred.

OXBANK is a complete, state-of-the-art browser-based digital banking web application demo built with **React 19**, **Vite**, **React Router v7**, **Lucide Icons**, and custom **Glassmorphism CSS**. It runs fully client-side using a robust local ledger DB and Web Crypto API.

---

## 🔑 Quick Demo Login Credentials

The login page features 1-click credential auto-filling:

| Role | Email | Password | Transaction PIN |
|---|---|---|---|
| **Customer (Default)** | `demo@oxbank.test` | `Demo@1234` | `1234` |
| **Customer 2** | `alice@oxbank.test` | `Alice@1234` | `5678` |
| **System Admin** | `admin@oxbank.test` | `Admin@1234` | `9012` |

---

## ✨ Key Features & Capabilities

- **🔐 Web Crypto PBKDF2 Authentication & Session Tokens**
  - PBKDF2 password hashing (310,000 iterations SHA-256 with unique 16-byte salts).
  - Account lockout protection after 5 failed login attempts.
  - Multi-user support with isolated account ledgers.

- **💸 Double-Entry Cryptographic Ledger & Transfers**
  - All financial values stored as integer **kobo** (1 NGN = 100 kobo) for accurate math without floating-point errors.
  - Internal OXBANK transfers and external Nigerian bank simulation.
  - Atomic double-entry ledger debit & credit operations with automatic rollback on error.
  - Idempotency key tracking to prevent accidental double-debits.
  - Overdraft protection & 4-digit PIN verification overlay for transfers over ₦50,000.

- **📊 Dynamic Charts & Financial Analytics**
  - Hand-crafted SVG **30-Day Balance Trend** line chart with direction-aware gradient fills.
  - SVG **Spending Breakdown** category bar chart.
  - Instant statement export to downloadable **CSV files**.

- **💳 Virtual Cards Engine**
  - 3D Glassmorphism Virtual Debit Cards with realistic front/back flip animation.
  - Instant Freeze / Unfreeze security lock toggle.
  - PIN-protected 16-digit card detail reveal (auto-masks after 15 seconds).
  - Custom monthly spending limit adjustment & spending progress bar.

- **⚡ Bills & Utility Scheduler**
  - Instant utility bill payments (Electricity, Internet, Cable TV, Airtime).
  - Scheduled future bill payments with automated background runner processing.

- **🛡️ Admin Dashboard & Security Center**
  - System metrics (circulating money, user counts, account counts).
  - User access management (suspend/unsuspend accounts).
  - Real-time cryptographic ledger integrity verification check.

- **📱 Responsive & Accessible UI**
  - Glassmorphism design system supporting dynamic Light & Dark themes.
  - Mobile bottom navigation bar (≤768px).
  - Accessible Toast notification container with `aria-live` screen-reader region.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 19, React Router 7, Lucide React
- **Build Tool:** Vite 6
- **Styling:** Vanilla Glassmorphism CSS Architecture
- **State & Storage:** React Context (`AuthContext`, `DataContext`, `ThemeContext`, `ToastContext`), `localStorage` persistence layer
- **Security:** Web Crypto API (`crypto.subtle.deriveBits`, PBKDF2 SHA-256)
- **Testing:** Vitest

---

## 🚀 Running Locally & Testing

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Run Unit & Integration Test Suite:**
   ```bash
   npm run test
   ```

---

## 🌐 Deploying to Vercel

The application includes a `vercel.json` rewrite configuration for SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Simply connect the GitHub repository to Vercel and deploy.