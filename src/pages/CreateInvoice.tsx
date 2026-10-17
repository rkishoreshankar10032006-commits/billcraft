import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Save,
  Send,
  Eye,
  Download,
  Printer,
  UserPlus,
  Building2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Package,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice, InvoiceItem, Customer, Product } from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';
import { CustomerModal } from '../components/customers/CustomerModal';

export const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    settings,
    customers,
    products,
    invoices,
    createInvoice,
    updateInvoice,
    getInvoice,
    showToast,
  } = useApp();

  // Modal triggers
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(settings.defaultPaymentTerms || 'Net 30');

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: `item-${Date.now()}-0`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxRate: settings.defaultTaxRate || 18,
      taxAmount: 0,
      amount: 0,
    },
  ]);

  // Overall Discount
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Notes, terms, bank details
  const [notes, setNotes] = useState(settings.defaultNotes || '');
  const [terms, setTerms] = useState(settings.termsAndConditions || '');
  const [bankDetails, setBankDetails] = useState(settings.bankDetails || '');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [currency, setCurrency] = useState(settings.currency || 'INR');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '₹');

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Populate data when editing or initialize when new
  useEffect(() => {
    if (id) {
      const existing = getInvoice(id);
      if (existing) {
        setInvoiceNumber(existing.invoiceNumber);
        setSelectedCustomerId(existing.customerId);
        setIssueDate(existing.issueDate);
        setDueDate(existing.dueDate);
        setPaymentTerms(existing.paymentTerms);
        setItems(
          existing.items.map(it => ({
            ...it,
            id: it.id || `item-${Date.now()}-${Math.random()}`,
          }))
        );
        setDiscountType(existing.discountType);
        setDiscountValue(existing.discountValue);
        setNotes(existing.notes || '');
        setTerms(existing.terms || '');
        setBankDetails(existing.bankDetails || '');
        setAmountPaid(existing.amountPaid || 0);
        setCurrency(existing.currency || 'INR');
        setCurrencySymbol(existing.currencySymbol || '₹');
        return;
      }
    }

    // Default initialization for new invoice
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    setIssueDate(todayStr);

    // Calculate due date based on terms
    const due = new Date(today);
    if (paymentTerms === 'Net 15') due.setDate(due.getDate() + 15);
    else if (paymentTerms === 'Net 30') due.setDate(due.getDate() + 30);
    else if (paymentTerms === 'Net 60') due.setDate(due.getDate() + 60);
    setDueDate(due.toISOString().slice(0, 10));

    // Generate unique invoice number
    const prefix = settings.invoicePrefix || 'INV-2026-';
    const nextCount = invoices.length + 1;
    setInvoiceNumber(`${prefix}${String(nextCount).padStart(3, '0')}`);

    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [id, invoices.length, settings, customers]);

  // Adjust due date when payment terms change
  const handlePaymentTermsChange = (newTerms: string) => {
    setPaymentTerms(newTerms);
    const baseDate = issueDate ? new Date(issueDate) : new Date();
    const newDue = new Date(baseDate);
    if (newTerms === 'Due on Receipt') newDue.setDate(baseDate.getDate());
    else if (newTerms === 'Net 15') newDue.setDate(baseDate.getDate() + 15);
    else if (newTerms === 'Net 30') newDue.setDate(baseDate.getDate() + 30);
    else if (newTerms === 'Net 60') newDue.setDate(baseDate.getDate() + 60);
    setDueDate(newDue.toISOString().slice(0, 10));
  };

  // Line item change handler
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Recalculate line item amounts immediately
      const qty = Math.max(0, Number(item.quantity) || 0);
      const price = Math.max(0, Number(item.unitPrice) || 0);
      const disc = Math.max(0, Math.min(100, Number(item.discountPercent) || 0));
      const taxRate = Math.max(0, Number(item.taxRate) || 0);

      const baseAmount = qty * price;
      const discountedAmount = baseAmount * (1 - disc / 100);
      const taxAmt = discountedAmount * (taxRate / 100);
      const totalItemAmount = discountedAmount;

      item.quantity = qty;
      item.unitPrice = price;
      item.discountPercent = disc;
      item.taxRate = taxRate;
      item.taxAmount = parseFloat(taxAmt.toFixed(2));
      item.amount = parseFloat(totalItemAmount.toFixed(2));

      updated[index] = item;
      return updated;
    });
  };

  // Populate line item when a catalog product is chosen
  const handleSelectCatalogProduct = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setItems(prev => {
      const updated = [...prev];
      const qty = updated[index]?.quantity || 1;
      const price = prod.unitPrice;
      const taxRate = prod.defaultTaxRate ?? settings.defaultTaxRate ?? 18;
      const amount = qty * price;
      const taxAmount = amount * (taxRate / 100);

      updated[index] = {
        ...updated[index],
        productId: prod.id,
        description: prod.description ? `${prod.name} - ${prod.description}` : prod.name,
        unitPrice: price,
        taxRate,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        amount: parseFloat(amount.toFixed(2)),
      };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: settings.defaultTaxRate || 18,
        taxAmount: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast('An invoice must have at least one line item.', 'error');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Immediate full calculations
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100)), 0);

  const discountTotal =
    discountType === 'percentage'
      ? (subtotal * Math.max(0, Math.min(100, discountValue))) / 100
      : Math.min(subtotal, Math.max(0, discountValue));

  const taxableAmount = Math.max(0, subtotal - discountTotal);

  // Recalculate tax total proportionally if overall discount exists
  const discountRatio = subtotal > 0 ? taxableAmount / subtotal : 1;
  const taxTotal = items.reduce((acc, item) => {
    const itemSub = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
    const itemTaxable = itemSub * discountRatio;
    return acc + itemTaxable * ((item.taxRate || 0) / 100);
  }, 0);

  const grandTotal = parseFloat((taxableAmount + taxTotal).toFixed(2));
  const balanceDue = Math.max(0, parseFloat((grandTotal - amountPaid).toFixed(2)));

  // Selected Customer details
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Build the invoice object structure for preview or saving
  const buildInvoicePayload = (statusOverride?: 'draft' | 'pending' | 'paid'): Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> => {
    const status = statusOverride || (balanceDue <= 0.01 && grandTotal > 0 ? 'paid' : 'pending');

    return {
      invoiceNumber: invoiceNumber.trim(),
      customerId: selectedCustomer?.id || 'guest',
      customerName: selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.companyName ? ` (${selectedCustomer.companyName})` : ''}` : 'Guest Customer',
      customerEmail: selectedCustomer?.email || '',
      customerPhone: selectedCustomer?.phone || '',
      customerBillingAddress: selectedCustomer
        ? `${selectedCustomer.billingAddress}, ${selectedCustomer.city}, ${selectedCustomer.state} ${selectedCustomer.postalCode}`
        : '',
      customerTaxId: selectedCustomer?.taxId || '',
      issueDate,
      dueDate,
      paymentTerms,
      status,
      currency,
      currencySymbol,
      items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountType,
      discountValue,
      discountTotal: parseFloat(discountTotal.toFixed(2)),
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      taxTotal: parseFloat(taxTotal.toFixed(2)),
      grandTotal,
      amountPaid,
      balanceDue,
      notes,
      terms,
      bankDetails,
    };
  };

  const validateForm = (): boolean => {
    if (!invoiceNumber.trim()) {
      setFormError('Please enter a valid invoice number.');
      return false;
    }
    if (!selectedCustomerId) {
      setFormError('Please select or add a customer.');
      return false;
    }
    if (!issueDate || !dueDate) {
      setFormError('Please select both issue date and due date.');
      return false;
    }
    const hasEmptyItem = items.some(it => !it.description.trim() || it.quantity <= 0);
    if (hasEmptyItem) {
      setFormError('All line items must have a description and a quantity greater than zero.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleSave = async (status: 'draft' | 'pending') => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      const payload = buildInvoicePayload(status);

      if (id) {
        await updateInvoice(id, payload);
      } else {
        await createInvoice(payload);
      }

      navigate('/invoices');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickDownload = () => {
    if (!validateForm()) return;
    const inv: Invoice = {
      ...buildInvoicePayload(),
      id: id || `temp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    generateInvoicePDF(inv, settings);
  };

  const handleQuickPrint = () => {
    if (!validateForm()) return;
    setShowPreviewModal(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Temporary invoice object for Live Preview
  const previewInvoiceData: Invoice = {
    ...buildInvoicePayload(),
    id: id || 'preview-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {id ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fill in customer billing details, line items, and taxes
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (validateForm()) setShowPreviewModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={handleQuickDownload}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleQuickPrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('draft')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('pending')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Mark as Sent</span>
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Form Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Invoice Meta & Customer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Invoice Details & Biller */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Invoice Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={e => handlePaymentTermsChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 15">Net 15 (15 days)</option>
                  <option value="Net 30">Net 30 (30 days)</option>
                  <option value="Net 60">Net 60 (60 days)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Billing Currency
                </label>
                <div className="flex gap-2">
                  <select
                    value={currency}
                    onChange={e => {
                      const cur = e.target.value;
                      setCurrency(cur);
                      if (cur === 'INR') setCurrencySymbol('₹');
                      else if (cur === 'USD') setCurrencySymbol('$');
                      else if (cur === 'EUR') setCurrencySymbol('€');
                      else if (cur === 'GBP') setCurrencySymbol('£');
                      else if (cur === 'CAD' || cur === 'AUD') setCurrencySymbol('$');
                      else setCurrencySymbol('₹');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white font-medium"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Customer Selection */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Customer / Client Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New Customer</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Customer *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white font-medium"
                >
                  <option value="">-- Choose a Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.email}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
                      {selectedCustomer.companyName && (
                        <p className="text-slate-600 font-medium">{selectedCustomer.companyName}</p>
                      )}
                    </div>
                    {selectedCustomer.taxId && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                        GST: {selectedCustomer.taxId}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500">
                    {selectedCustomer.billingAddress}, {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.postalCode}
                  </p>
                  <p className="text-slate-500">
                    Email: {selectedCustomer.email} | Phone: {selectedCustomer.phone}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Billed From & Quick Tips */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Billed From (Your Business)
              </h3>
              <Link to="/settings" className="text-[11px] font-semibold text-indigo-600 hover:underline">
                Edit in Settings
              </Link>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{settings.companyName}</p>
              <p className="text-xs text-slate-500 mt-1">{settings.address}</p>
              <p className="text-xs text-slate-500">{settings.city}, {settings.state} - {settings.postalCode}</p>
              <p className="text-xs text-slate-500 mt-1">Email: {settings.email}</p>
              <p className="text-xs text-slate-500">Phone: {settings.phone}</p>
              {settings.taxId && (
                <p className="text-xs font-medium text-slate-700 mt-1">
                  GSTIN / Tax ID: <span className="font-mono">{settings.taxId}</span>
                </p>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Smart Billing Tips</span>
            </h4>
            <ul className="text-xs text-indigo-800/80 space-y-1 list-disc pl-4">
              <li>Choose products from your catalog to auto-fill pricing and tax rates.</li>
              <li>GST rates can be adjusted individually per line item.</li>
              <li>Overdue status triggers automatically once due date passes.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Line Items Table Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-indigo-600 flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Items & Services</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemize products, services, rates, discounts, and GST percentages
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/80">
                <th className="py-2.5 px-3 min-w-[200px]">Item / Description *</th>
                <th className="py-2.5 px-3 w-20 text-center">Qty *</th>
                <th className="py-2.5 px-3 w-28 text-right">Unit Price ({currencySymbol}) *</th>
                <th className="py-2.5 px-3 w-20 text-right">Disc %</th>
                <th className="py-2.5 px-3 w-24 text-right">GST / Tax %</th>
                <th className="py-2.5 px-3 w-28 text-right">Total ({currencySymbol})</th>
                <th className="py-2.5 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item.id} className="align-top hover:bg-slate-50/50">
                  <td className="py-3 px-3 space-y-2">
                    {/* Catalog item picker */}
                    {products.length > 0 && (
                      <select
                        onChange={e => {
                          if (e.target.value) handleSelectCatalogProduct(index, e.target.value);
                        }}
                        defaultValue=""
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 text-slate-600 mb-1"
                      >
                        <option value="">⚡ Quick fill from catalog...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.unitPrice, currencySymbol)})
                          </option>
                        ))}
                      </select>
                    )}
                    <textarea
                      required
                      rows={2}
                      placeholder="Enter description, service details, or scope..."
                      value={item.description}
                      onChange={e => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </td>

                  <td className="py-3 px-3">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs text-center rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-semibold"
                    />
                  </td>

                  <td className="py-3 px-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unitPrice}
                      onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs text-right rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-semibold"
                    />
                  </td>

                  <td className="py-3 px-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={item.discountPercent}
                      onChange={e => handleItemChange(index, 'discountPercent', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs text-right rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </td>

                  <td className="py-3 px-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={item.taxRate}
                      onChange={e => handleItemChange(index, 'taxRate', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs text-right rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </td>

                  <td className="py-3 px-3 text-right font-bold text-slate-900 pt-5">
                    {formatCurrency(item.amount, currencySymbol)}
                  </td>

                  <td className="py-3 px-2 text-center pt-5">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Another Line Item</span>
          </button>
        </div>
      </div>

      {/* Totals & Notes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Notes, Bank Details & Terms */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Notes & Payment Instructions
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank / UPI Payment Details
            </label>
            <textarea
              rows={3}
              value={bankDetails}
              onChange={e => setBankDetails(e.target.value)}
              placeholder="Bank account, IFSC, UPI ID, or remittance details"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Client Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Thank you for your business. Please quote invoice number upon payment."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Terms & Conditions
            </label>
            <textarea
              rows={2}
              value={terms}
              onChange={e => setTerms(e.target.value)}
              placeholder="Payment terms, late fee policies, warranties..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Right: Calculations Summary Box */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Summary & Calculation
          </h3>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900 text-sm">
                {formatCurrency(subtotal, currencySymbol)}
              </span>
            </div>

            {/* Overall Discount Input */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Overall Discount</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      discountType === 'percentage'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      discountType === 'fixed'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {currencySymbol}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={discountValue}
                  onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                />
                <span className="font-semibold text-emerald-600">
                  -{formatCurrency(discountTotal, currencySymbol)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Taxable Amount</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(taxableAmount, currencySymbol)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Tax / GST Total</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(taxTotal, currencySymbol)}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-900">Grand Total</span>
              <span className="text-xl font-extrabold text-indigo-600">
                {formatCurrency(grandTotal, currencySymbol)}
              </span>
            </div>

            {/* Advance Amount Paid */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Amount Paid (Advance / Deposit)</span>
                <span className="text-slate-500 font-medium">{currencySymbol}</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                max={grandTotal}
                value={amountPaid}
                onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
              />
            </div>

            <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between items-center">
              <span className="text-sm font-bold text-rose-700">Balance Due</span>
              <span className="text-lg font-bold text-rose-600">
                {formatCurrency(balanceDue, currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-slate-900/90 text-white backdrop-blur-md shadow-xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <span className="text-slate-400">Total: </span>
            <strong className="text-sm text-white font-bold">
              {formatCurrency(grandTotal, currencySymbol)}
            </strong>
          </div>
          <span className="text-slate-700">•</span>
          <div className="text-xs">
            <span className="text-slate-400">Balance: </span>
            <strong className="text-sm text-rose-400 font-bold">
              {formatCurrency(balanceDue, currencySymbol)}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (validateForm()) setShowPreviewModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-colors"
          >
            Preview
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('draft')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('pending')}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            Mark as Sent
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <InvoicePreviewModal
          invoice={previewInvoiceData}
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <CustomerModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSuccess={newCust => {
            setSelectedCustomerId(newCust.id);
            showToast(`Selected newly created customer: ${newCust.name}`);
          }}
        />
      )}
    </div>
  );
};
