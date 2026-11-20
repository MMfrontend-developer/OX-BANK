# 🏛️ OXBANK — Digital Banking Web App (Demo)

> **Disclaimer:** Demo only. All money, accounts and transactions are simulated in your browser (localStorage). No real funds are accessed or moved.

OXBANK is a browser-based digital bank built with **React 19**, **Vite**, **React Router 7** and **Lucide icons**. It runs fully client-side on a double-entry ledger with Web Crypto password/PIN hashing.

---

## 🔑 Demo logins

The login page has one-click credential buttons.

| Role | Email | Password | Transaction PIN |
|---|---|---|---|
| **Customer** | `demo@oxbank.test` | `Demo@1234` | `1234` |
| **Customer 2** | `alice@oxbank.test` | `Alice@1234` | `5678` |
| **Admin** | `admin@oxbank.test` | `Admin@1234` | `9012` |

New sign-ups choose their own PIN and get a Checking and Savings account.

---

## ✨ Features

**Everyday banking**
- **Overview**: total balance (accounts + savings goals), per-account tiles with copyable account numbers, month-to-date in/out, a 30-day balance chart, budgets, goals, upcoming payments and recent activity
- **Add money**: simulated top-up from a linked card
- **Hide balances**: privacy toggle in the top bar (optionally on by default)

**Payments**
- **Transfers** to OXBANK accounts (live name lookup), **other Nigerian banks**, or **between your own accounts**
- Review step → **transaction PIN** (verified server-side) → success screen with a **downloadable receipt**
- **Saved beneficiaries** with search; save new ones while sending
- **Daily outbound limit** (₦5,000,000) and idempotent submissions (no double debits)
- **Bills & airtime**: airtime, data, electricity, cable TV and internet with input validation; saved payees; **one-off or monthly standing orders**; cancel schedules

**Money management**
- **Savings goals**: create goals with icon, target and date; add/withdraw funds (real ledger moves); suggested monthly amount; close a goal to return funds
- **Budgets & insights**: monthly limits per category with on-track / near-limit / over-budget status, spending by category, projected month-end spend, savings rate, month-over-month comparison
- **Transactions**: search, filter by period/type/category/account, grouped by day, transaction details, **printable receipts**, **CSV export** and **monthly PDF statements** (via print)

**Cards**
- Virtual debit card per account: freeze/unfreeze, **PIN-protected detail reveal** (auto-hides after 30 s), monthly limit with usage, card controls (online, international, ATM, contactless), report lost / replace card

**Security**
- PBKDF2-SHA-256 (310k iterations) password and PIN hashing via Web Crypto
- Login lockout after 5 failed attempts; **PIN lockout after 3 wrong attempts** (5 minutes)
- **Auto sign-out after inactivity** with a 60-second warning (2–30 min, configurable)
- Sign-in, password-change and PIN-change alerts; recent sign-in history
- Ownership checks on every money movement; suspended users are signed out and blocked
- Sessions sync across tabs

**Admin console**
- Customers, deposits, money held in goals, and a **ledger integrity check across every account**
- Suspend / restore customers; searchable global ledger

**UX**
- Sidebar app shell on desktop; drawer + bottom navigation on mobile
- Light and dark themes, accessible modals (focus trap, Escape), keyboard-navigable chart, reduced-motion support

---

## 🛠️ Architecture

```
src/
  services/          business logic (no React): db, auth, accounts, transfers,
                     bills, cards, savings, budgets, beneficiaries, admin
  context/           Auth, Data (reactive snapshot of the signed-in customer), Theme, Toast
  components/        AppLayout, SessionGuard, ui (Modal, PinModal, Money…), TxDetailModal, BalanceTrend
  pages/ + *.jsx     screens
  utils/             currency, insights (pure analytics), documents (receipts/statements/CSV)
  assets/Style.css/Bank.css   design system for the signed-in app
```

- Money is stored as integer **kobo** (₦1 = 100 kobo).
- Every balance change goes through `accountService.appendLedgerEntry`; balances can always be re-derived from the ledger.
- The local DB is versioned (`_version: 2`) and migrates older saved data automatically.

---

## 🚀 Run locally

```bash
npm install
npm run dev      # start the dev server
npm test         # unit & integration tests (Vitest)
npm run lint
npm run build
```

Use **Profile → Reset demo data** to restore the seeded demo at any time.

## 🌐 Deploy (Vercel)

`vercel.json` rewrites all routes to the SPA:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```
