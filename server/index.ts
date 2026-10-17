import express from 'express';
import cors from 'cors';
import { db, initDatabase, seedSampleData } from './db.js';

// Initialize the database tables and seed initial data
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper function to check and update overdue invoices automatically
function refreshInvoiceStatuses() {
  const today = new Date().toISOString().slice(0, 10);
  // Mark as overdue if due_date < today and balance_due > 0 and status is 'pending'
  const updateOverdue = db.prepare(`
    UPDATE invoices
    SET status = 'overdue', updated_at = ?
    WHERE status = 'pending' AND due_date < ? AND balance_due > 0
  `);
  updateOverdue.run(new Date().toISOString(), today);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString(), database: 'SQLite (node:sqlite)' });
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('default') as any;
    if (!row) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    const settings = {
      companyName: row.company_name,
      tagline: row.tagline || '',
      logoUrl: row.logo_url || '',
      email: row.email,
      phone: row.phone,
      website: row.website || '',
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      taxId: row.tax_id || '',
      currency: row.currency,
      currencySymbol: row.currency_symbol,
      defaultTaxRate: Number(row.default_tax_rate),
      invoicePrefix: row.invoice_prefix,
      defaultPaymentTerms: row.default_payment_terms,
      defaultNotes: row.default_notes || '',
      bankDetails: row.bank_details || '',
      termsAndConditions: row.terms_and_conditions || '',
      updatedAt: row.updated_at
    };
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const s = req.body;
    const stmt = db.prepare(`
      UPDATE settings SET
        company_name = ?, tagline = ?, logo_url = ?, email = ?, phone = ?, website = ?,
        address = ?, city = ?, state = ?, postal_code = ?, country = ?, tax_id = ?,
        currency = ?, currency_symbol = ?, default_tax_rate = ?, invoice_prefix = ?,
        default_payment_terms = ?, default_notes = ?, bank_details = ?, terms_and_conditions = ?,
        updated_at = ?
      WHERE id = 'default'
    `);
    const now = new Date().toISOString();
    stmt.run(
      s.companyName, s.tagline || '', s.logoUrl || '', s.email, s.phone, s.website || '',
      s.address, s.city, s.state, s.postalCode, s.country, s.taxId || '',
      s.currency, s.currencySymbol, Number(s.defaultTaxRate), s.invoicePrefix,
      s.defaultPaymentTerms, s.defaultNotes || '', s.bankDetails || '', s.termsAndConditions || '',
      now
    );
    res.json({ message: 'Settings updated successfully', updatedAt: now });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Customers endpoints
app.get('/api/customers', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all() as any[];
    const customers = rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      companyName: r.company_name || '',
      billingAddress: r.billing_address,
      city: r.city,
      state: r.state,
      postalCode: r.postal_code,
      country: r.country,
      taxId: r.tax_id || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const c = req.body;
    if (!c.name || !c.email) {
      return res.status(400).json({ error: 'Customer name and email are required.' });
    }
    const id = c.id || `cust-${Date.now()}`;
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO customers (
        id, name, email, phone, company_name, billing_address,
        city, state, postal_code, country, tax_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, c.name, c.email, c.phone || '', c.companyName || '', c.billingAddress || '',
      c.city || '', c.state || '', c.postalCode || '', c.country || 'India', c.taxId || '',
      now, now
    );
    res.status(201).json({ id, ...c, createdAt: now, updatedAt: now });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const c = req.body;
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE customers SET
        name = ?, email = ?, phone = ?, company_name = ?, billing_address = ?,
        city = ?, state = ?, postal_code = ?, country = ?, tax_id = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      c.name, c.email, c.phone || '', c.companyName || '', c.billingAddress || '',
      c.city || '', c.state || '', c.postalCode || '', c.country || 'India', c.taxId || '',
      now, id
    );
    res.json({ id, ...c, updatedAt: now });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Check if customer has invoices
    const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?').get(id) as { count: number };
    if (invoiceCount && invoiceCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete customer. There are ${invoiceCount.count} invoice(s) associated with this customer. Please delete or reassign those invoices first.`
      });
    }
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Products & Services endpoints
app.get('/api/products', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM products ORDER BY name ASC').all() as any[];
    const products = rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      sku: r.sku || '',
      category: r.category,
      unitPrice: Number(r.unit_price),
      defaultTaxRate: Number(r.default_tax_rate),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const p = req.body;
    if (!p.name || p.unitPrice === undefined) {
      return res.status(400).json({ error: 'Product name and unit price are required.' });
    }
    const id = p.id || `prod-${Date.now()}`;
    const now = new Date().toISOString();
    const sku = p.sku || `SKU-${Date.now().toString().slice(-6)}`;
    const stmt = db.prepare(`
      INSERT INTO products (
        id, name, description, sku, category, unit_price, default_tax_rate, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, p.name, p.description || '', sku, p.category || 'service',
      Number(p.unitPrice), Number(p.defaultTaxRate ?? 18), now, now
    );
    res.status(201).json({ id, ...p, sku, createdAt: now, updatedAt: now });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE products SET
        name = ?, description = ?, sku = ?, category = ?, unit_price = ?,
        default_tax_rate = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      p.name, p.description || '', p.sku, p.category || 'service',
      Number(p.unitPrice), Number(p.defaultTaxRate ?? 18), now, id
    );
    res.json({ id, ...p, updatedAt: now });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Invoices endpoints
app.get('/api/invoices', (req, res) => {
  try {
    refreshInvoiceStatuses();
    const invoices = db.prepare('SELECT * FROM invoices ORDER BY issue_date DESC, created_at DESC').all() as any[];
    const items = db.prepare('SELECT * FROM invoice_items').all() as any[];

    const itemsByInvoice: Record<string, any[]> = {};
    for (const item of items) {
      if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
      itemsByInvoice[item.invoice_id].push({
        id: item.id,
        productId: item.product_id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        discountPercent: Number(item.discount_percent),
        taxRate: Number(item.tax_rate),
        taxAmount: Number(item.tax_amount),
        amount: Number(item.amount)
      });
    }

    const result = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      customerEmail: inv.customer_email,
      customerPhone: inv.customer_phone,
      customerBillingAddress: inv.customer_billing_address,
      customerTaxId: inv.customer_tax_id,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      paymentTerms: inv.payment_terms,
      status: inv.status,
      currency: inv.currency,
      currencySymbol: inv.currency_symbol,
      subtotal: Number(inv.subtotal),
      discountType: inv.discount_type,
      discountValue: Number(inv.discount_value),
      discountTotal: Number(inv.discount_total),
      taxableAmount: Number(inv.taxable_amount),
      taxTotal: Number(inv.tax_total),
      grandTotal: Number(inv.grand_total),
      amountPaid: Number(inv.amount_paid),
      balanceDue: Number(inv.balance_due),
      notes: inv.notes,
      terms: inv.terms,
      bankDetails: inv.bank_details,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
      items: itemsByInvoice[inv.id] || []
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices/:id', (req, res) => {
  try {
    refreshInvoiceStatuses();
    const { id } = req.params;
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!inv) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id) as any[];

    const invoice = {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      customerEmail: inv.customer_email,
      customerPhone: inv.customer_phone,
      customerBillingAddress: inv.customer_billing_address,
      customerTaxId: inv.customer_tax_id,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      paymentTerms: inv.payment_terms,
      status: inv.status,
      currency: inv.currency,
      currencySymbol: inv.currency_symbol,
      subtotal: Number(inv.subtotal),
      discountType: inv.discount_type,
      discountValue: Number(inv.discount_value),
      discountTotal: Number(inv.discount_total),
      taxableAmount: Number(inv.taxable_amount),
      taxTotal: Number(inv.tax_total),
      grandTotal: Number(inv.grand_total),
      amountPaid: Number(inv.amount_paid),
      balanceDue: Number(inv.balance_due),
      notes: inv.notes,
      terms: inv.terms,
      bankDetails: inv.bank_details,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
      items: items.map(item => ({
        id: item.id,
        productId: item.product_id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        discountPercent: Number(item.discount_percent),
        taxRate: Number(item.tax_rate),
        taxAmount: Number(item.tax_amount),
        amount: Number(item.amount)
      }))
    };

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', (req, res) => {
  try {
    const inv = req.body;
    if (!inv.invoiceNumber || !inv.customerId || !inv.items || inv.items.length === 0) {
      return res.status(400).json({ error: 'Invoice number, customer, and at least one item are required.' });
    }

    const id = inv.id || `inv-${Date.now()}`;
    const now = new Date().toISOString();

    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, customer_id, customer_name, customer_email, customer_phone,
        customer_billing_address, customer_tax_id, issue_date, due_date, payment_terms,
        status, currency, currency_symbol, subtotal, discount_type, discount_value,
        discount_total, taxable_amount, tax_total, grand_total, amount_paid, balance_due,
        notes, terms, bank_details, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertInvoice.run(
      id, inv.invoiceNumber, inv.customerId, inv.customerName, inv.customerEmail || '',
      inv.customerPhone || '', inv.customerBillingAddress || '', inv.customerTaxId || '',
      inv.issueDate, inv.dueDate, inv.paymentTerms || 'Net 30', inv.status || 'pending',
      inv.currency || 'INR', inv.currencySymbol || '₹',
      Number(inv.subtotal || 0), inv.discountType || 'percentage', Number(inv.discountValue || 0),
      Number(inv.discountTotal || 0), Number(inv.taxableAmount || 0), Number(inv.taxTotal || 0),
      Number(inv.grandTotal || 0), Number(inv.amountPaid || 0), Number(inv.balanceDue || inv.grandTotal || 0),
      inv.notes || '', inv.terms || '', inv.bankDetails || '', now, now
    );

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, description, quantity, unit_price,
        discount_percent, tax_rate, tax_amount, amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < inv.items.length; i++) {
      const item = inv.items[i];
      const itemId = item.id || `item-${Date.now()}-${i}`;
      insertItem.run(
        itemId, id, item.productId || null, item.description, Number(item.quantity),
        Number(item.unitPrice), Number(item.discountPercent || 0), Number(item.taxRate || 0),
        Number(item.taxAmount || 0), Number(item.amount || 0)
      );
    }

    res.status(201).json({ id, ...inv, createdAt: now, updatedAt: now });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/invoices/:id', (req, res) => {
  try {
    const { id } = req.params;
    const inv = req.body;
    const now = new Date().toISOString();

    const updateInvoice = db.prepare(`
      UPDATE invoices SET
        invoice_number = ?, customer_id = ?, customer_name = ?, customer_email = ?,
        customer_phone = ?, customer_billing_address = ?, customer_tax_id = ?,
        issue_date = ?, due_date = ?, payment_terms = ?, status = ?, currency = ?,
        currency_symbol = ?, subtotal = ?, discount_type = ?, discount_value = ?,
        discount_total = ?, taxable_amount = ?, tax_total = ?, grand_total = ?,
        amount_paid = ?, balance_due = ?, notes = ?, terms = ?, bank_details = ?, updated_at = ?
      WHERE id = ?
    `);

    updateInvoice.run(
      inv.invoiceNumber, inv.customerId, inv.customerName, inv.customerEmail || '',
      inv.customerPhone || '', inv.customerBillingAddress || '', inv.customerTaxId || '',
      inv.issueDate, inv.dueDate, inv.paymentTerms || 'Net 30', inv.status,
      inv.currency || 'INR', inv.currencySymbol || '₹',
      Number(inv.subtotal || 0), inv.discountType || 'percentage', Number(inv.discountValue || 0),
      Number(inv.discountTotal || 0), Number(inv.taxableAmount || 0), Number(inv.taxTotal || 0),
      Number(inv.grandTotal || 0), Number(inv.amountPaid || 0), Number(inv.balanceDue || 0),
      inv.notes || '', inv.terms || '', inv.bankDetails || '', now, id
    );

    // Replace items
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, description, quantity, unit_price,
        discount_percent, tax_rate, tax_amount, amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < (inv.items || []).length; i++) {
      const item = inv.items[i];
      const itemId = item.id || `item-${Date.now()}-${i}`;
      insertItem.run(
        itemId, id, item.productId || null, item.description, Number(item.quantity),
        Number(item.unitPrice), Number(item.discountPercent || 0), Number(item.taxRate || 0),
        Number(item.taxAmount || 0), Number(item.amount || 0)
      );
    }

    res.json({ id, ...inv, updatedAt: now });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/invoices/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Delete items and payments cascade or manual
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
    db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(id);
    db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    res.json({ message: 'Invoice and associated records deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Duplicate invoice endpoint
app.post('/api/invoices/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id) as any[];

    // Generate unique invoice number
    const countRow = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number };
    const newInvNum = `INV-2026-${String(countRow.count + 1).padStart(3, '0')}`;
    const newId = `inv-${Date.now()}`;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // Compute new due date (+30 days)
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const dueDateStr = due.toISOString().slice(0, 10);

    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, customer_id, customer_name, customer_email, customer_phone,
        customer_billing_address, customer_tax_id, issue_date, due_date, payment_terms,
        status, currency, currency_symbol, subtotal, discount_type, discount_value,
        discount_total, taxable_amount, tax_total, grand_total, amount_paid, balance_due,
        notes, terms, bank_details, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertInvoice.run(
      newId, newInvNum, inv.customer_id, inv.customer_name, inv.customer_email,
      inv.customer_phone, inv.customer_billing_address, inv.customer_tax_id,
      today, dueDateStr, inv.payment_terms, 'draft', inv.currency, inv.currency_symbol,
      inv.subtotal, inv.discount_type, inv.discount_value, inv.discount_total,
      inv.taxable_amount, inv.tax_total, inv.grand_total, 0, inv.grand_total,
      inv.notes, inv.terms, inv.bank_details, now, now
    );

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, description, quantity, unit_price,
        discount_percent, tax_rate, tax_amount, amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      insertItem.run(`item-${Date.now()}-${i}`, newId, it.product_id, it.description, it.quantity, it.unit_price, it.discount_percent, it.tax_rate, it.tax_amount, it.amount);
    }

    res.status(201).json({ message: 'Invoice duplicated successfully', newId, invoiceNumber: newInvNum });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Payments endpoints
app.get('/api/payments', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM payments ORDER BY payment_date DESC, created_at DESC').all() as any[];
    const payments = rows.map(r => ({
      id: r.id,
      invoiceId: r.invoice_id,
      invoiceNumber: r.invoice_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      paymentDate: r.payment_date,
      amount: Number(r.amount),
      paymentMethod: r.payment_method,
      referenceNumber: r.reference_number || '',
      notes: r.notes || '',
      createdAt: r.created_at
    }));
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', (req, res) => {
  try {
    const p = req.body;
    const amount = Number(p.amount);
    if (!p.invoiceId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invoice ID and a positive payment amount are required.' });
    }

    // Fetch invoice to update balances
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(p.invoiceId) as any;
    if (!inv) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const currentPaid = Number(inv.amount_paid);
    const grandTotal = Number(inv.grand_total);
    const currentBalance = Number(inv.balance_due);

    // Safeguard: warn if payment exceeds balance
    if (amount > currentBalance + 0.01) {
      return res.status(400).json({
        error: `Payment amount (${amount}) cannot exceed the current balance due (${currentBalance.toFixed(2)}).`
      });
    }

    const newAmountPaid = currentPaid + amount;
    const newBalanceDue = Math.max(0, grandTotal - newAmountPaid);
    const newStatus = newBalanceDue <= 0.01 ? 'paid' : (inv.status === 'draft' ? 'pending' : inv.status);

    const paymentId = p.id || `pay-${Date.now()}`;
    const now = new Date().toISOString();

    const insertPayment = db.prepare(`
      INSERT INTO payments (
        id, invoice_id, invoice_number, customer_id, customer_name,
        payment_date, amount, payment_method, reference_number, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPayment.run(
      paymentId, inv.id, inv.invoice_number, inv.customer_id, inv.customer_name,
      p.paymentDate || now.slice(0, 10), amount, p.paymentMethod || 'Bank Transfer',
      p.referenceNumber || '', p.notes || '', now
    );

    // Update invoice record
    const updateInvoice = db.prepare(`
      UPDATE invoices
      SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);
    updateInvoice.run(newAmountPaid, newBalanceDue, newStatus, now, inv.id);

    res.status(201).json({
      id: paymentId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      customerName: inv.customer_name,
      paymentDate: p.paymentDate || now.slice(0, 10),
      amount,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
      newAmountPaid,
      newBalanceDue,
      invoiceStatus: newStatus,
      createdAt: now
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset and Clear endpoints for sample data management
app.post('/api/reset', (req, res) => {
  try {
    seedSampleData(true);
    res.json({ message: 'Database reset to initial sample demonstration data successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clear', (req, res) => {
  try {
    db.exec(`
      DELETE FROM payments;
      DELETE FROM invoice_items;
      DELETE FROM invoices;
      DELETE FROM products;
      DELETE FROM customers;
    `);
    res.json({ message: 'All transactions, invoices, customers and products cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[BillCraft Server] running at http://localhost:${PORT}`);
});
