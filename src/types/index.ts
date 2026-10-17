export interface BusinessSettings {
  companyName: string;
  tagline: string;
  logoUrl: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId: string; // GSTIN / VAT / PAN
  currency: string; // e.g. 'INR', 'USD', 'EUR', 'GBP'
  currencySymbol: string; // e.g. '₹', '$', '€'
  defaultTaxRate: number; // e.g. 18
  invoicePrefix: string; // e.g. 'INV-2026-'
  defaultPaymentTerms: string; // 'Due on Receipt' | 'Net 15' | 'Net 30' | 'Net 60'
  defaultNotes: string;
  bankDetails: string;
  termsAndConditions: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  billingAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: 'product' | 'service';
  unitPrice: number;
  defaultTaxRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
}

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerBillingAddress?: string;
  customerTaxId?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  paymentTerms: string;
  status: InvoiceStatus;
  currency: string;
  currencySymbol: string;
  items: InvoiceItem[];
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  notes: string;
  terms: string;
  bankDetails: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}
