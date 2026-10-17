# BillCraft - Modern Invoice & Billing Generator Web Application

**BillCraft** is a complete, full-stack, responsive invoicing and billing SaaS application engineered for freelancers, small businesses, shops, and digital agencies. It provides an intuitive workflow to manage customer accounts, build itemized multi-line invoices with configurable GST/VAT rates and discounts, track partial payment receipts, analyze cash flow metrics, and generate vector PDF invoices.

---

## 🌟 Key Features

### 1. 📊 Executive Dashboard
- **Live Summary Metrics**: Real-time cards calculating Total Invoices, Total Revenue, Total Collected, Pending Receivables, and Overdue Balances directly from database records.
- **Revenue & Collections Trend**: Recharts area chart visualizing 6-month billed vs. collected revenue.
- **Invoice Lifecycle Breakdown**: Donut chart tracking distribution of Paid, Pending, Overdue, and Draft invoices.
- **Recent Invoices & Activity Stream**: Instant access to recent invoices with one-click preview, PDF download, and payment actions.

### 2. 🧾 Interactive Invoice Creator
- **Auto-Generated Invoice Numbers**: Uses configurable prefixes (e.g. `INV-2026-001`).
- **Dynamic Payment Terms**: Choose between *Due on Receipt*, *Net 15*, *Net 30*, and *Net 60* with auto-calculated due dates.
- **Customer Picker & Inline Creation**: Select existing clients or instantly add new clients via modal without leaving the invoice creation form.
- **Reusable Product/Service Catalog**: Quick-fill item descriptions, unit prices, and tax rates directly from your catalog.
- **Real-Time Financial Calculations**:
  - Line Item: `Quantity × Unit Price × (1 - Line Discount %)`
  - Subtotal & Configurable Overall Discount (flat or percentage)
  - Taxable Amount & Item-specific Tax / GST calculations
  - Grand Total, Advance / Amount Paid, and Balance Due
- **Multi-Currency Support**: Default Indian Rupees (INR ₹), with instant switching to USD ($), EUR (€), GBP (£), CAD ($), AUD ($).
- **Comprehensive Actions**: Save as Draft, Mark as Sent, Live High-Resolution Preview, Direct Print, and PDF download.

### 3. 📄 High-Fidelity Invoice Preview & PDF Generation
- Vector-rendered, print-styled invoice document matching real corporate invoicing standards.
- Downloadable selectable-text vector PDF generated via `jsPDF`.
- Media print styling (`@media print`) that automatically strips navigation, sidebars, and buttons for clean browser printing.

### 4. 📁 Complete Invoice Management
- Full-text search by invoice number, customer name, email, or notes.
- Lifecycle filtering: **All**, **Paid**, **Pending**, **Overdue**, and **Draft**.
- Sorting by Issue Date, Amount, Status, and Invoice Number (Ascending/Descending).
- Row actions: Interactive Preview, PDF Download, Quick Settlement, Edit Draft, One-Click Duplicate, and Safe Delete with confirmation safeguards.
- Automatic overdue detection based on due date and outstanding balance.

### 5. 👥 Customer Management
- Add, edit, search, and manage clients with company name, billing address, phone, email, and tax identification (GSTIN/VAT).
- Dynamic client financial cards summarizing total billed, total paid, and outstanding balances.
- Comprehensive client invoice history drawer showing past invoices and payment statuses.
- Safe deletion safeguards preventing accidental deletion of customers with linked invoices.

### 6. 📦 Products & Services Catalog
- Manage reusable catalog items with Name, Description, SKU, Category (Product vs. Service), Unit Price, and Default Tax Rate.
- Streamlines invoice creation by auto-populating line items while permitting custom overrides.

### 7. 💳 Payments & Receipts Tracking
- Record offline payment settlements against invoices (NEFT/RTGS, UPI, Credit Card, Debit Card, Cash, Cheque).
- Real-time balance updates: automatically adjusts invoice `amountPaid`, decrements `balanceDue`, and transitions status to **Paid** once cleared.
- Prevents payments exceeding the balance due.
- Detailed receipt history table and chronological audit log.

### 8. 📈 Financial Reports & Analytics
- Date range filtering: All Time, This Month, Last Month, This Year.
- Cash flow comparison chart and payment channels breakdown.
- Top client accounts ranked by revenue volume.
- **One-Click CSV Export**:
  - Export Invoices CSV
  - Export Payments CSV
  - Export Top Customer Summary CSV

### 9. ⚙️ Business & Invoicing Settings
- Company branding: Company Name, Tagline, Address, Contact, and Tax ID / GSTIN.
- Invoicing defaults: Currency, Default Tax Rate, Invoice Prefix, Default Payment Terms, Bank & UPI Instructions, and Terms & Conditions.
- **Demo Data Controls**: One-click "Reset Demo Data" to restore sample records or "Clear All Data" for a clean slate.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19 + TypeScript | Component-driven UI with strong typing |
| **Build Tool** | Vite 8 | Ultra-fast HMR and bundling |
| **Styling** | Tailwind CSS v4 | Clean financial SaaS design with custom print styles |
| **Icons** | Lucide React | Consistent, modern icon set |
| **Routing** | React Router v7 | Seamless SPA client-side routing |
| **Charts** | Recharts | Responsive Area, Bar, and Donut charts |
| **PDF Generation** | jsPDF | Vector-quality PDF documents with pagination |
| **Backend** | Node.js + Express | RESTful API endpoints |
| **Database** | SQLite via Node built-in `node:sqlite` | Persistent database file (`billcraft.db`) with zero external native compilation |
| **Persistence Fallback** | LocalStorage Engine | Automatic dual-mode fallback ensures 100% availability offline or without server |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x or 24.x (uses built-in `node:sqlite`)
- npm 10+

### Installation

1. Navigate to the project directory:
   ```powershell
   cd "d:\pt 2.0"
   ```

2. Dependencies are already installed. If running on a new machine:
   ```powershell
   npm install
   ```

### Running the Application

You can start both the backend server and frontend client concurrently:

```powershell
npm run dev:all
```

Alternatively, you can run them separately in individual terminals:

- **Express SQLite Backend**:
  ```powershell
  npm run server
  ```
  *Server runs at: `http://localhost:5000`*

- **Vite Frontend**:
  ```powershell
  npm run dev
  ```
  *Client runs at: `http://localhost:5173`*

---

## 🗄️ Database Schema & Storage

The application uses an SQLite database (`billcraft.db`) initialized with foreign key constraints:

- `settings`: Company profile, tax ID, currency, bank details, terms.
- `customers`: Client directory, contact info, billing addresses, tax identification.
- `products`: Reusable goods and services catalog with default rates and SKU.
- `invoices`: Master invoice records, customer references, dates, calculated totals, and status.
- `invoice_items`: Line items with quantities, rates, discounts, tax amounts, and cascade deletion.
- `payments`: Payment receipts recorded against invoices with method, reference, and date.

---

## 📁 Project Directory Structure

```
d:\pt 2.0\
├── billcraft.db                # SQLite persistent database file
├── index.html                  # HTML entry point with Jakarta Sans font
├── package.json                # Project dependencies and run scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration with Tailwind v4 & API proxy
├── server/
│   ├── db.ts                   # SQLite schema, tables, and realistic seed data
│   └── index.ts                # Express REST API routes
└── src/
    ├── App.tsx                 # Root router with AppLayout and 8 pages
    ├── index.css               # Tailwind v4 import & print stylesheet
    ├── main.tsx                # React DOM mount
    ├── types/
    │   └── index.ts            # Data models & TypeScript interfaces
    ├── services/
    │   ├── api.ts              # Dual-mode API & LocalStorage synchronization service
    │   └── mockData.ts         # Initial sample demonstration data
    ├── utils/
    │   ├── formatters.ts       # Currency, date, and status badge formatters
    │   └── pdfGenerator.ts     # jsPDF vector invoice document generator
    ├── context/
    │   └── AppContext.tsx      # Global reactive state provider & toast notifications
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx   # Shell layout with toast notifications
    │   │   ├── Header.tsx      # Top bar with company badge and quick actions
    │   │   └── Sidebar.tsx     # Dark navy sidebar with live DB status badge
    │   ├── invoices/
    │   │   └── InvoicePreviewModal.tsx # Invoice preview, print & PDF modal
    │   ├── customers/
    │   │   └── CustomerModal.tsx       # Add/Edit customer dialog
    │   ├── products/
    │   │   └── ProductModal.tsx        # Add/Edit product/service dialog
    │   └── payments/
    │       └── RecordPaymentModal.tsx  # Partial & full payment recording modal
    └── pages/
        ├── Dashboard.tsx       # Summary metrics, charts, recent invoices & activity
        ├── CreateInvoice.tsx   # Multi-line invoice creator & editor with calculations
        ├── AllInvoices.tsx     # Invoice directory with search, filters & actions
        ├── Customers.tsx       # Customer directory, balance summaries & history
        ├── Products.tsx        # Products & services catalog
        ├── Payments.tsx        # Payment records, partial payment tracking & receipts
        ├── Reports.tsx         # Financial analytics, date filters & CSV export
        └── Settings.tsx        # Company identity, defaults, demo reset & clear controls
```

---

## 🧪 Verification & Testing

The application has been verified against:
- Navigation across all 8 functional pages.
- Line item addition, catalog quick-fill, discount calculation, and multi-rate GST tax computation.
- Partial payment recording with automatic balance reduction and status transitions (`pending` -> `paid`).
- Automatic overdue detection for invoices past their due date.
- High-resolution vector PDF generation via jsPDF and clean `@media print` layout.
- Deletion safeguards for customers with associated billing transactions.
- Multi-currency adjustments (INR ₹, USD $, EUR €, GBP £).
- Data persistence via SQLite backend with seamless LocalStorage fallback.
