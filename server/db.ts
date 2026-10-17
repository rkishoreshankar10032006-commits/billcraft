import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve(process.cwd(), 'billcraft.db');

export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      tagline TEXT,
      logo_url TEXT,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      website TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL,
      tax_id TEXT,
      currency TEXT NOT NULL DEFAULT 'INR',
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      default_tax_rate REAL NOT NULL DEFAULT 18.0,
      invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
      default_payment_terms TEXT NOT NULL DEFAULT 'Net 30',
      default_notes TEXT,
      bank_details TEXT,
      terms_and_conditions TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      company_name TEXT,
      billing_address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'India',
      tax_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Products & Services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT UNIQUE,
      category TEXT NOT NULL CHECK(category IN ('product', 'service')),
      unit_price REAL NOT NULL,
      default_tax_rate REAL NOT NULL DEFAULT 18.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Invoices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_billing_address TEXT,
      customer_tax_id TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      payment_terms TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
      currency TEXT NOT NULL DEFAULT 'INR',
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value REAL NOT NULL DEFAULT 0,
      discount_total REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL DEFAULT 0,
      tax_total REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      notes TEXT,
      terms TEXT,
      bank_details TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    );
  `);

  // Invoice Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
  `);

  // Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
  `);

  // Seed sample data if empty
  seedSampleData();
}

export function seedSampleData(force = false) {
  if (force) {
    db.exec(`
      DELETE FROM payments;
      DELETE FROM invoice_items;
      DELETE FROM invoices;
      DELETE FROM products;
      DELETE FROM customers;
      DELETE FROM settings;
    `);
  }

  // Check if settings already exists
  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (existingSettings.count === 0) {
    const insertSettings = db.prepare(`
      INSERT INTO settings (
        id, company_name, tagline, logo_url, email, phone, website,
        address, city, state, postal_code, country, tax_id,
        currency, currency_symbol, default_tax_rate, invoice_prefix,
        default_payment_terms, default_notes, bank_details, terms_and_conditions, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSettings.run(
      'default',
      'BillCraft Digital Solutions Pvt Ltd',
      'Modern Web, Mobile & Cloud Engineering',
      '',
      'billing@billcraft.in',
      '+91 98765 43210',
      'https://billcraft.in',
      'Level 5, Cyber Park, Outer Ring Road, Bellandur',
      'Bengaluru',
      'Karnataka',
      '560103',
      'India',
      '29AABCU9603R1ZX',
      'INR',
      '₹',
      18.0,
      'INV-2026-',
      'Net 30',
      'Thank you for your business. Please ensure payment is made within the due date.',
      'Bank: HDFC Bank\nA/C Name: BillCraft Digital Solutions Pvt Ltd\nA/C No: 50200049281720\nIFSC: HDFC0000240\nBranch: Bellandur, Bengaluru\nUPI ID: billcraft@hdfcbank',
      '1. Payment is due within the agreed payment terms from invoice date.\n2. In case of late payment, interest @ 1.5% per month will be applicable.\n3. Goods or services once delivered/rendered are non-refundable.',
      new Date().toISOString()
    );
  }

  const existingCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
  if (existingCustomers.count === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (
        id, name, email, phone, company_name, billing_address,
        city, state, postal_code, country, tax_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customers = [
      {
        id: 'cust-1',
        name: 'Aarav Mehta',
        email: 'aarav.mehta@zenithtech.io',
        phone: '+91 98200 12345',
        company_name: 'Zenith Tech Systems LLP',
        billing_address: '402, Trade Tower, Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400051',
        country: 'India',
        tax_id: '27AABCT3912K1Z8',
      },
      {
        id: 'cust-2',
        name: 'Priya Sharma',
        email: 'priya@auradesignstudio.com',
        phone: '+91 99100 87654',
        company_name: 'Aura Creative Studio',
        billing_address: 'Plot 18, Sector 44, Institutional Area',
        city: 'Gurugram',
        state: 'Haryana',
        postal_code: '122003',
        country: 'India',
        tax_id: '06AAHCS8841M1ZY',
      },
      {
        id: 'cust-3',
        name: 'Vikramaditya Rao',
        email: 'v.rao@solarinnovations.in',
        phone: '+91 94480 33445',
        company_name: 'Solaris Clean Energy Pvt Ltd',
        billing_address: 'Survey No 77, HITEC City, Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '500081',
        country: 'India',
        tax_id: '36AAOCS1289P1ZL',
      },
      {
        id: 'cust-4',
        name: 'Neha Kapoor',
        email: 'neha@bloomorganics.co',
        phone: '+91 97110 54321',
        company_name: 'Bloom Organics Retail',
        billing_address: '12/A, Indiranagar 100ft Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: '560038',
        country: 'India',
        tax_id: '29AAFCB7654Q1ZG',
      },
      {
        id: 'cust-5',
        name: 'Rohan Sen',
        email: 'rohan.sen@apexconsulting.in',
        phone: '+91 98300 98765',
        company_name: 'Apex Strategic Advisors',
        billing_address: 'Salt Lake Sector V, Electronics Complex',
        city: 'Kolkata',
        state: 'West Bengal',
        postal_code: '700091',
        country: 'India',
        tax_id: '19AABCA9012R1ZU',
      }
    ];

    for (const c of customers) {
      const now = new Date().toISOString();
      insertCustomer.run(c.id, c.name, c.email, c.phone, c.company_name, c.billing_address, c.city, c.state, c.postal_code, c.country, c.tax_id, now, now);
    }
  }

  const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (existingProducts.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, name, description, sku, category, unit_price, default_tax_rate, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const products = [
      {
        id: 'prod-1',
        name: 'Full-Stack Web Application Development',
        description: 'End-to-end custom application development with React, Node.js & TypeScript',
        sku: 'SRV-DEV-001',
        category: 'service',
        unit_price: 125000,
        default_tax_rate: 18.0,
      },
      {
        id: 'prod-2',
        name: 'UI/UX Design & Prototyping',
        description: 'Comprehensive Figma design system, wireframing, and responsive UI components',
        sku: 'SRV-UI-002',
        category: 'service',
        unit_price: 65000,
        default_tax_rate: 18.0,
      },
      {
        id: 'prod-3',
        name: 'Cloud Infrastructure & DevOps Setup',
        description: 'AWS / Docker / Kubernetes CI/CD automation and secure cloud architecture',
        sku: 'SRV-OPS-003',
        category: 'service',
        unit_price: 85000,
        default_tax_rate: 18.0,
      },
      {
        id: 'prod-4',
        name: 'Monthly Maintenance & Support Retainer',
        description: '24/7 uptime monitoring, security patching, bug fixes and performance audits',
        sku: 'SRV-MNT-004',
        category: 'service',
        unit_price: 45000,
        default_tax_rate: 18.0,
      },
      {
        id: 'prod-5',
        name: 'Enterprise SaaS Starter License',
        description: 'Self-hosted proprietary billing & analytics engine core source code license',
        sku: 'PRD-LIC-005',
        category: 'product',
        unit_price: 250000,
        default_tax_rate: 18.0,
      },
      {
        id: 'prod-6',
        name: 'API Security Audit & Penetration Testing',
        description: 'OWASP vulnerability scanning, token security evaluation, and remediation report',
        sku: 'SRV-SEC-006',
        category: 'service',
        unit_price: 75000,
        default_tax_rate: 18.0,
      }
    ];

    for (const p of products) {
      const now = new Date().toISOString();
      insertProduct.run(p.id, p.name, p.description, p.sku, p.category, p.unit_price, p.default_tax_rate, now, now);
    }
  }

  const existingInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number };
  if (existingInvoices.count === 0) {
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, customer_id, customer_name, customer_email, customer_phone,
        customer_billing_address, customer_tax_id, issue_date, due_date, payment_terms,
        status, currency, currency_symbol, subtotal, discount_type, discount_value,
        discount_total, taxable_amount, tax_total, grand_total, amount_paid, balance_due,
        notes, terms, bank_details, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, description, quantity, unit_price,
        discount_percent, tax_rate, tax_amount, amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPayment = db.prepare(`
      INSERT INTO payments (
        id, invoice_id, invoice_number, customer_id, customer_name,
        payment_date, amount, payment_method, reference_number, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Sample Invoice 1: Paid
    const inv1 = {
      id: 'inv-001',
      invoice_number: 'INV-2026-001',
      customer_id: 'cust-1',
      customer_name: 'Aarav Mehta (Zenith Tech Systems LLP)',
      customer_email: 'aarav.mehta@zenithtech.io',
      customer_phone: '+91 98200 12345',
      customer_billing_address: '402, Trade Tower, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
      customer_tax_id: '27AABCT3912K1Z8',
      issue_date: '2026-09-05',
      due_date: '2026-10-05',
      payment_terms: 'Net 30',
      status: 'paid',
      currency: 'INR',
      currency_symbol: '₹',
      subtotal: 190000,
      discount_type: 'percentage',
      discount_value: 5,
      discount_total: 9500,
      taxable_amount: 180500,
      tax_total: 32490,
      grand_total: 212990,
      amount_paid: 212990,
      balance_due: 0,
      notes: 'Zenith Q3 Digital Platform Milestone 1 deliverables completed.',
      terms: 'Payment received with thanks.',
      bank_details: 'HDFC Bank A/C: 50200049281720 IFSC: HDFC0000240',
      created_at: '2026-09-05T10:00:00Z',
      updated_at: '2026-09-28T14:30:00Z',
    };

    insertInvoice.run(
      inv1.id, inv1.invoice_number, inv1.customer_id, inv1.customer_name, inv1.customer_email,
      inv1.customer_phone, inv1.customer_billing_address, inv1.customer_tax_id, inv1.issue_date,
      inv1.due_date, inv1.payment_terms, inv1.status, inv1.currency, inv1.currency_symbol,
      inv1.subtotal, inv1.discount_type, inv1.discount_value, inv1.discount_total,
      inv1.taxable_amount, inv1.tax_total, inv1.grand_total, inv1.amount_paid, inv1.balance_due,
      inv1.notes, inv1.terms, inv1.bank_details, inv1.created_at, inv1.updated_at
    );

    insertItem.run('item-1-1', inv1.id, 'prod-1', 'Full-Stack Web Application Development - Sprint 1 & 2', 1, 125000, 0, 18, 22500, 125000);
    insertItem.run('item-1-2', inv1.id, 'prod-2', 'UI/UX Design & Prototyping - Design System & Flows', 1, 65000, 0, 18, 11700, 65000);

    insertPayment.run('pay-1', inv1.id, inv1.invoice_number, inv1.customer_id, inv1.customer_name, '2026-09-28', 212990, 'Bank Transfer', 'NEFT-HDFC-982137492', 'Full payment settled via NEFT', '2026-09-28T14:30:00Z');

    // Sample Invoice 2: Pending (Partially Paid)
    const inv2 = {
      id: 'inv-002',
      invoice_number: 'INV-2026-002',
      customer_id: 'cust-2',
      customer_name: 'Priya Sharma (Aura Creative Studio)',
      customer_email: 'priya@auradesignstudio.com',
      customer_phone: '+91 99100 87654',
      customer_billing_address: 'Plot 18, Sector 44, Institutional Area, Gurugram, Haryana 122003',
      customer_tax_id: '06AAHCS8841M1ZY',
      issue_date: '2026-10-01',
      due_date: '2026-10-31',
      payment_terms: 'Net 30',
      status: 'pending',
      currency: 'INR',
      currency_symbol: '₹',
      subtotal: 130000,
      discount_type: 'percentage',
      discount_value: 0,
      discount_total: 0,
      taxable_amount: 130000,
      tax_total: 23400,
      grand_total: 153400,
      amount_paid: 75000,
      balance_due: 78400,
      notes: 'Advance milestone payment received. Remaining balance due by month-end.',
      terms: 'Standard terms apply. Net 30 days.',
      bank_details: 'HDFC Bank A/C: 50200049281720 IFSC: HDFC0000240',
      created_at: '2026-10-01T09:30:00Z',
      updated_at: '2026-10-08T11:00:00Z',
    };

    insertInvoice.run(
      inv2.id, inv2.invoice_number, inv2.customer_id, inv2.customer_name, inv2.customer_email,
      inv2.customer_phone, inv2.customer_billing_address, inv2.customer_tax_id, inv2.issue_date,
      inv2.due_date, inv2.payment_terms, inv2.status, inv2.currency, inv2.currency_symbol,
      inv2.subtotal, inv2.discount_type, inv2.discount_value, inv2.discount_total,
      inv2.taxable_amount, inv2.tax_total, inv2.grand_total, inv2.amount_paid, inv2.balance_due,
      inv2.notes, inv2.terms, inv2.bank_details, inv2.created_at, inv2.updated_at
    );

    insertItem.run('item-2-1', inv2.id, 'prod-3', 'Cloud Infrastructure & DevOps Setup', 1, 85000, 0, 18, 15300, 85000);
    insertItem.run('item-2-2', inv2.id, 'prod-4', 'Monthly Maintenance & Support Retainer', 1, 45000, 0, 18, 8100, 45000);

    insertPayment.run('pay-2', inv2.id, inv2.invoice_number, inv2.customer_id, inv2.customer_name, '2026-10-08', 75000, 'UPI', 'UPI/20261008/94821', '50% advance retainer via UPI', '2026-10-08T11:00:00Z');

    // Sample Invoice 3: Overdue
    const inv3 = {
      id: 'inv-003',
      invoice_number: 'INV-2026-003',
      customer_id: 'cust-3',
      customer_name: 'Vikramaditya Rao (Solaris Clean Energy Pvt Ltd)',
      customer_email: 'v.rao@solarinnovations.in',
      customer_phone: '+91 94480 33445',
      customer_billing_address: 'Survey No 77, HITEC City, Madhapur, Hyderabad, Telangana 500081',
      customer_tax_id: '36AAOCS1289P1ZL',
      issue_date: '2026-08-15',
      due_date: '2026-09-15',
      payment_terms: 'Net 30',
      status: 'overdue',
      currency: 'INR',
      currency_symbol: '₹',
      subtotal: 75000,
      discount_type: 'percentage',
      discount_value: 0,
      discount_total: 0,
      taxable_amount: 75000,
      tax_total: 13500,
      grand_total: 88500,
      amount_paid: 0,
      balance_due: 88500,
      notes: 'Payment reminder sent. Grace period expired on Sept 20, 2026.',
      terms: 'Subject to 1.5% late payment charges per month.',
      bank_details: 'HDFC Bank A/C: 50200049281720 IFSC: HDFC0000240',
      created_at: '2026-08-15T11:15:00Z',
      updated_at: '2026-09-16T09:00:00Z',
    };

    insertInvoice.run(
      inv3.id, inv3.invoice_number, inv3.customer_id, inv3.customer_name, inv3.customer_email,
      inv3.customer_phone, inv3.customer_billing_address, inv3.customer_tax_id, inv3.issue_date,
      inv3.due_date, inv3.payment_terms, inv3.status, inv3.currency, inv3.currency_symbol,
      inv3.subtotal, inv3.discount_type, inv3.discount_value, inv3.discount_total,
      inv3.taxable_amount, inv3.tax_total, inv3.grand_total, inv3.amount_paid, inv3.balance_due,
      inv3.notes, inv3.terms, inv3.bank_details, inv3.created_at, inv3.updated_at
    );

    insertItem.run('item-3-1', inv3.id, 'prod-6', 'API Security Audit & Penetration Testing', 1, 75000, 0, 18, 13500, 75000);

    // Sample Invoice 4: Draft
    const inv4 = {
      id: 'inv-004',
      invoice_number: 'INV-2026-004',
      customer_id: 'cust-4',
      customer_name: 'Neha Kapoor (Bloom Organics Retail)',
      customer_email: 'neha@bloomorganics.co',
      customer_phone: '+91 97110 54321',
      customer_billing_address: '12/A, Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
      customer_tax_id: '29AAFCB7654Q1ZG',
      issue_date: '2026-10-15',
      due_date: '2026-11-14',
      payment_terms: 'Net 30',
      status: 'draft',
      currency: 'INR',
      currency_symbol: '₹',
      subtotal: 250000,
      discount_type: 'percentage',
      discount_value: 10,
      discount_total: 25000,
      taxable_amount: 225000,
      tax_total: 40500,
      grand_total: 265500,
      amount_paid: 0,
      balance_due: 265500,
      notes: 'Draft proposal for Enterprise SaaS Starter License deployment.',
      terms: 'Standard terms and software SLA agreement.',
      bank_details: 'HDFC Bank A/C: 50200049281720 IFSC: HDFC0000240',
      created_at: '2026-10-15T16:00:00Z',
      updated_at: '2026-10-15T16:00:00Z',
    };

    insertInvoice.run(
      inv4.id, inv4.invoice_number, inv4.customer_id, inv4.customer_name, inv4.customer_email,
      inv4.customer_phone, inv4.customer_billing_address, inv4.customer_tax_id, inv4.issue_date,
      inv4.due_date, inv4.payment_terms, inv4.status, inv4.currency, inv4.currency_symbol,
      inv4.subtotal, inv4.discount_type, inv4.discount_value, inv4.discount_total,
      inv4.taxable_amount, inv4.tax_total, inv4.grand_total, inv4.amount_paid, inv4.balance_due,
      inv4.notes, inv4.terms, inv4.bank_details, inv4.created_at, inv4.updated_at
    );

    insertItem.run('item-4-1', inv4.id, 'prod-5', 'Enterprise SaaS Starter License', 1, 250000, 10, 18, 40500, 225000);
  }
}
