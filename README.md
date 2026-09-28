# Personal Khata — Digital Money Ledger

> **Your simple personal money ledger.**  
> A private, single-owner digital khata and ledger system for tracking money given to and received from customers. Works seamlessly across up to **3 devices**, synchronizes data through a central PostgreSQL database, and provides customer-wise transaction history, running balances, due dates, in-app notifications, interactive analytics, and downloadable PDF reports.

---

## ✨ Key Features & Architecture

### 1. Product Identity & Design
- **Theme:** Clean Light Mode only (Pure white cards, high-contrast typography, neutral slate borders).
- **Brand Accent:** `#EB5E28` (Strategic financial action accents & highlights).
- **Currency & Formatting:** Full Indian Rupee (`₹`) support with authentic Indian numbering:
  - `₹5,000`, `₹50,000`, `₹1,00,000`, `₹10,00,000`.
- **Timezone:** `Asia/Kolkata` with Indian date and time presentation (`26 Sep 2026 • 8:42 PM`).

### 2. Supabase Authentication & Multi-Device Session Control
- **Supabase Authentication:** Secure account registration and login backed by Supabase PostgreSQL.
- **Max 3 Active Devices:** Automatic session tracking with device type, IP address, and last-active timestamps.
- **"Logout All Other Devices":** One-click session invalidation across all other devices except your active one.
- **Credential Management:** Update username, email, and password securely with bcrypt hashing in Settings.

### 3. Core Financial Engine & Balance Calculations
- **Transactions:** `YOU GAVE ₹` (Money lent) vs `YOU GOT ₹` (Repayment received).
- **Formula:**
  $$\text{Total Given} = \sum \text{YOU GAVE}$$
  $$\text{Total Received} = \sum \text{YOU GOT}$$
  $$\text{Pending Amount} = \text{Total Given} - \text{Total Received}$$
- **Negative Balance Protection:** Enforces strictly that customer pending balance cannot drop below `₹0`. Prevents recording `YOU GOT` transactions that exceed the current pending amount.
- **Automatic Settlement & Reopening:**
  - When $\text{Pending Amount} = ₹0$, automatically marks customer as **SETTLED**.
  - When a settled customer receives a new loan, automatically reopens account as **PENDING** with full historic continuity.
- **Running Balance Timeline:** Chronologically computed running balance displayed after each entry.

### 4. Customer Management & Khata Ledgers
- **Full CRUD:** Add, View, Edit, Archive, Restore, and Delete customers.
- **Historical Integrity:** Deleting or archiving a customer preserves all transaction records.
- **Custom Fields:** Dynamic key-value attributes (e.g. Business name, GST, Reference code, City).
- **Repayment Due Dates & Overdue Alerts:** Automatic deadline engine classifying accounts as `PENDING`, `SETTLED`, or `OVERDUE`.

### 5. PDF Reports & WhatsApp Integration
- **Customer Statement PDF:** Detailed customer ledger with transaction table, running balances, and summary cards.
- **Overall Khata Report PDF:** Complete overview table of all customers with aggregated totals.
- **Settlement Receipt PDF:** Formal signed receipt with ₹0 cleared balance badge.
- **Filtered PDFs:** Pending, Settled, Overdue, and Date-filtered reports (Today, This Week, This Month, Last Month, This Year, Custom).
- **One-Click WhatsApp Sharing:** Share customer account summary or send friendly payment reminders directly via WhatsApp.

### 6. Visual Financial Analytics
- **Given vs Received Timeline:** Area chart of lending vs collections over time.
- **Monthly Lending & Collections:** Side-by-side monthly comparison bar charts.
- **Account Status Breakdown:** Interactive donut chart of Pending, Settled, and Overdue accounts.
- **Overdue Account Monitor:** Real-time priority list of overdue customer balances.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.x or later
- npm or yarn

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd personal-khata

# Install dependencies
npm install --legacy-peer-deps
```

### 3. Database Configuration
Copy the environment template:
```bash
cp .env.example .env
```

Configure `DATABASE_URL` for your PostgreSQL instance (e.g. Supabase, Neon, or local PostgreSQL):
```env
DATABASE_URL="postgresql://user:password@host:5432/personal_khata?schema=public"
AUTH_SECRET="your-secure-random-secret-key-32-chars"
```

*Note: For out-of-the-box local testing, the application includes a standalone persistent data layer seeded with sample demo customers.*

### 4. Running the Application
```bash
# Start Next.js development server
npm run dev

# Open in your browser
http://localhost:3000
```

### 5. Running Tests
```bash
npm test
```

---

## 📦 Deployment on Vercel

1. Push your repository to GitHub / GitLab.
2. Import the project into **[Vercel](https://vercel.com)**.
3. Configure the environment variables in Vercel project settings:
   - `DATABASE_URL` (From Supabase / Neon / Vercel Postgres)
   - `AUTH_SECRET` (A strong random string)
4. Deploy! Vercel will automatically build the Next.js production bundle.

---

## 📁 Project Structure

```text
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API endpoints (Auth, Customers, Transactions, Deadlines, Analytics, Reports)
│   ├── login/                # Owner login screen
│   ├── dashboard/            # Main Khata Dashboard
│   ├── customers/            # Customer directory & individual Khata ledgers
│   ├── analytics/            # Recharts financial analytics
│   ├── reports/              # PDF statement and report generator
│   ├── notifications/        # In-app notification center
│   └── settings/             # Credentials & 3-device session manager
├── components/
│   ├── layout/               # Navbar, Sidebar, MobileNav, AppLayout
│   ├── dashboard/            # SummaryCards, CustomerOverviewTable, RecentTransactions
│   ├── customers/            # CustomerList, CustomerDetail, CustomerModal, DeadlineModal
│   ├── transactions/         # TransactionModal (GAVE/GOT quick switch)
│   ├── analytics/            # AnalyticsView
│   ├── reports/              # ReportsView
│   └── ui/                   # Modal, Toast, ConfirmDialog
├── lib/
│   ├── calculations.ts       # Balance engine & negative balance protection
│   ├── formatters.ts         # Indian currency & date/time formatting
│   ├── auth.ts               # Owner authentication & 3-device sessions
│   ├── db.ts                 # Database store with sample demo data
│   ├── reports.ts            # jsPDF & autoTable statement generator
│   ├── whatsapp.ts           # WhatsApp share and reminder generators
│   └── types.ts              # TypeScript models
prisma/
└── schema.prisma             # PostgreSQL schema definition
```

---

## 🔒 Security
- Bcrypt password hashing
- Secure HTTP-only cookies
- Server-side validation of all transactions and customer IDs
- Race-condition safe balance calculations
