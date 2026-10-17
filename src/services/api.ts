import { BusinessSettings, Customer, Product, Invoice, Payment } from '../types';
import { initialSettings, initialCustomers, initialProducts, initialInvoices, initialPayments } from './mockData';

const STORAGE_KEYS = {
  SETTINGS: 'billcraft_settings',
  CUSTOMERS: 'billcraft_customers',
  PRODUCTS: 'billcraft_products',
  INVOICES: 'billcraft_invoices',
  PAYMENTS: 'billcraft_payments',
  SERVER_ACTIVE: 'billcraft_server_active',
};

// Check if localStorage has been initialized
function initLocalStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(initialInvoices));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initialPayments));
  }
}

let isServerAvailable: boolean | null = null;

export async function checkServerStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    isServerAvailable = res.ok;
    return res.ok;
  } catch {
    isServerAvailable = false;
    return false;
  }
}

// Auto update invoice statuses for overdue
function refreshLocalInvoiceStatuses(invoices: Invoice[]): Invoice[] {
  const today = new Date().toISOString().slice(0, 10);
  return invoices.map(inv => {
    if (inv.status === 'pending' && inv.dueDate < today && inv.balanceDue > 0) {
      return { ...inv, status: 'overdue' };
    }
    return inv;
  });
}

export const api = {
  async isServerConnected(): Promise<boolean> {
    if (isServerAvailable === null) {
      return await checkServerStatus();
    }
    return isServerAvailable;
  },

  // Settings
  async getSettings(): Promise<BusinessSettings> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Backend error, falling back to local storage', e);
      }
    }
    initLocalStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(initialSettings));
  },

  async updateSettings(settings: BusinessSettings): Promise<BusinessSettings> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        if (res.ok) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return settings;
        }
      } catch (e) {
        console.warn('Backend error updating settings', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
    return settings;
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/customers');
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Backend error fetching customers', e);
      }
    }
    initLocalStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
  },

  async createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer),
        });
        if (res.ok) {
          const created = await res.json();
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return created;
        }
      } catch (e) {
        console.warn('Backend error creating customer', e);
      }
    }
    initLocalStorage();
    const customers: Customer[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    customers.unshift(newCustomer);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
    return newCustomer;
  },

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch(`/api/customers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer),
        });
        if (res.ok) {
          const updated = await res.json();
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return updated;
        }
      } catch (e) {
        console.warn('Backend error updating customer', e);
      }
    }
    initLocalStorage();
    const customers: Customer[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    const updated = { ...customers[index], ...customer, updatedAt: new Date().toISOString() };
    customers[index] = updated;
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
    return updated;
  },

  async deleteCustomer(id: string): Promise<void> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to delete customer');
        }
        window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
        return;
      } catch (e: any) {
        if (e.message.includes('Cannot delete customer')) throw e;
        console.warn('Backend error deleting customer', e);
      }
    }
    initLocalStorage();
    // Check if customer has invoices in local storage
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const associatedInvoices = invoices.filter(inv => inv.customerId === id);
    if (associatedInvoices.length > 0) {
      throw new Error(`Cannot delete customer. There are ${associatedInvoices.length} invoice(s) associated with this customer.`);
    }
    let customers: Customer[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
    customers = customers.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
  },

  // Products
  async getProducts(): Promise<Product[]> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/products');
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Backend error fetching products', e);
      }
    }
    initLocalStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
  },

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        });
        if (res.ok) {
          const created = await res.json();
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return created;
        }
      } catch (e) {
        console.warn('Backend error creating product', e);
      }
    }
    initLocalStorage();
    const products: Product[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      sku: product.sku || `SKU-${Date.now().toString().slice(-6)}`,
      createdAt: now,
      updatedAt: now,
    };
    products.push(newProduct);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
    return newProduct;
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        });
        if (res.ok) {
          const updated = await res.json();
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return updated;
        }
      } catch (e) {
        console.warn('Backend error updating product', e);
      }
    }
    initLocalStorage();
    const products: Product[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');
    const updated = { ...products[index], ...product, updatedAt: new Date().toISOString() };
    products[index] = updated;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
    return updated;
  },

  async deleteProduct(id: string): Promise<void> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return;
        }
      } catch (e) {
        console.warn('Backend error deleting product', e);
      }
    }
    initLocalStorage();
    let products: Product[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    products = products.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
  },

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/invoices');
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Backend error fetching invoices', e);
      }
    }
    initLocalStorage();
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const refreshed = refreshLocalInvoiceStatuses(invoices);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(refreshed));
    return refreshed;
  },

  async getInvoice(id: string): Promise<Invoice | null> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Backend error fetching invoice', e);
      }
    }
    initLocalStorage();
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    return invoices.find(inv => inv.id === id) || null;
  },

  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice),
        });
        if (res.ok) {
          const created = await res.json();
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return created;
        }
      } catch (e) {
        console.warn('Backend error creating invoice', e);
      }
    }
    initLocalStorage();
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    invoices.unshift(newInvoice);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
    return newInvoice;
  },

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch(`/api/invoices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice),
        });
        if (res.ok) {
          const updated = await res.json();
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return updated;
        }
      } catch (e) {
        console.warn('Backend error updating invoice', e);
      }
    }
    initLocalStorage();
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const index = invoices.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Invoice not found');
    const updated = { ...invoices[index], ...invoice, updatedAt: new Date().toISOString() };
    invoices[index] = updated;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
    return updated;
  },

  async deleteInvoice(id: string): Promise<void> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
        if (res.ok) {
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return;
        }
      } catch (e) {
        console.warn('Backend error deleting invoice', e);
      }
    }
    initLocalStorage();
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    invoices = invoices.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    let payments: Payment[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
    payments = payments.filter(p => p.invoiceId !== id);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
  },

  async duplicateInvoice(id: string): Promise<Invoice> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch(`/api/invoices/${id}/duplicate`, { method: 'POST' });
        if (res.ok) {
          const result = await res.json();
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          const created = await this.getInvoice(result.newId);
          if (created) return created;
        }
      } catch (e) {
        console.warn('Backend error duplicating invoice', e);
      }
    }
    initLocalStorage();
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const original = invoices.find(i => i.id === id);
    if (!original) throw new Error('Invoice not found');

    const count = invoices.length + 1;
    const newNumber = `INV-2026-${String(count).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const duplicated: Invoice = {
      ...original,
      id: `inv-${Date.now()}`,
      invoiceNumber: newNumber,
      issueDate: today,
      dueDate: dueDate.toISOString().slice(0, 10),
      status: 'draft',
      amountPaid: 0,
      balanceDue: original.grandTotal,
      createdAt: now,
      updatedAt: now,
      items: original.items.map((it, idx) => ({ ...it, id: `item-${Date.now()}-${idx}` }))
    };

    invoices.unshift(duplicated);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
    return duplicated;
  },

  // Payments
  async getPayments(): Promise<Payment[]> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/payments');
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Backend error fetching payments', e);
      }
    }
    initLocalStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
  },

  async recordPayment(paymentData: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
  }): Promise<Payment> {
    if (await this.isServerConnected()) {
      try {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData),
        });
        if (res.ok) {
          const recorded = await res.json();
          window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
          return recorded;
        } else {
          const err = await res.json();
          throw new Error(err.error || 'Failed to record payment');
        }
      } catch (e: any) {
        if (e.message && e.message.includes('Payment amount')) throw e;
        console.warn('Backend error recording payment', e);
      }
    }

    initLocalStorage();
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const invIndex = invoices.findIndex(i => i.id === paymentData.invoiceId);
    if (invIndex === -1) throw new Error('Invoice not found');

    const inv = invoices[invIndex];
    const amount = Number(paymentData.amount);

    if (amount > inv.balanceDue + 0.01) {
      throw new Error(`Payment amount (${amount}) cannot exceed the balance due (${inv.balanceDue.toFixed(2)}).`);
    }

    const newAmountPaid = inv.amountPaid + amount;
    const newBalanceDue = Math.max(0, inv.grandTotal - newAmountPaid);
    const newStatus = newBalanceDue <= 0.01 ? 'paid' : (inv.status === 'draft' ? 'pending' : inv.status);

    const now = new Date().toISOString();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      paymentDate: paymentData.paymentDate || now.slice(0, 10),
      amount,
      paymentMethod: paymentData.paymentMethod || 'Bank Transfer',
      referenceNumber: paymentData.referenceNumber,
      notes: paymentData.notes,
      createdAt: now,
    };

    invoices[invIndex] = {
      ...inv,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
      updatedAt: now,
    };

    const payments: Payment[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
    payments.unshift(newPayment);

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));

    return newPayment;
  },

  // Reset & Clear
  async resetToSampleData(): Promise<void> {
    if (await this.isServerConnected()) {
      try {
        await fetch('/api/reset', { method: 'POST' });
      } catch (e) {
        console.warn('Backend error during reset', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(initialInvoices));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initialPayments));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
  },

  async clearAllData(): Promise<void> {
    if (await this.isServerConnected()) {
      try {
        await fetch('/api/clear', { method: 'POST' });
      } catch (e) {
        console.warn('Backend error during clear', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('billcraft_data_changed'));
  }
};
