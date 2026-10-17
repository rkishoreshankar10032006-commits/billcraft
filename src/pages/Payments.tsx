import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Building,
  ArrowUpRight,
  Filter,
  DollarSign,
  Printer,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice, Payment } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { RecordPaymentModal } from '../components/payments/RecordPaymentModal';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';

export const Payments: React.FC = () => {
  const { payments, invoices, settings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Invoices that have an outstanding balance
  const unpaidInvoices = useMemo(() => {
    return invoices.filter(inv => inv.balanceDue > 0);
  }, [invoices]);

  // Total collected calculation
  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          p.invoiceNumber.toLowerCase().includes(term) ||
          p.customerName.toLowerCase().includes(term) ||
          (p.referenceNumber || '').toLowerCase().includes(term) ||
          (p.notes || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [payments, methodFilter, searchTerm]);

  const handleStartPayment = (inv?: Invoice) => {
    if (inv) {
      setSelectedInvoiceForPayment(inv);
      setShowRecordModal(true);
    } else if (unpaidInvoices.length > 0) {
      setSelectedInvoiceForPayment(unpaidInvoices[0]);
      setShowRecordModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Payments & Collections
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log manual settlements, bank transfers, UPI receipts, and track invoice balance clearance
          </p>
        </div>

        <button
          onClick={() => handleStartPayment()}
          disabled={unpaidInvoices.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Offline Payment Tracking Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 flex items-start gap-3 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <strong className="font-semibold block text-amber-950">Manual Payment Recording</strong>
          <span>
            This module records payment receipts (NEFT, UPI, Cheques, Cash) to update ledger balances.
            BillCraft does not connect directly to mock or live payment gateways, ensuring 100% truthful accounting.
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Collections
          </span>
          <div className="text-2xl font-extrabold text-emerald-600">
            {formatCurrency(totalCollected, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Across {payments.length} transactions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Invoices Awaiting Payment
          </span>
          <div className="text-2xl font-extrabold text-amber-600">
            {unpaidInvoices.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Outstanding balance:{' '}
            <strong className="text-slate-800">
              {formatCurrency(
                unpaidInvoices.reduce((a, b) => a + b.balanceDue, 0),
                settings.currencySymbol
              )}
            </strong>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Recent Average Collection
          </span>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(
              payments.length > 0 ? totalCollected / payments.length : 0,
              settings.currencySymbol
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Per recorded receipt</p>
        </div>
      </div>

      {/* Outstanding Invoices Quick Settlement Bar */}
      {unpaidInvoices.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Invoices Ready for Payment Recording
            </h3>
            <span className="text-xs text-indigo-600 font-semibold">
              {unpaidInvoices.length} pending
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unpaidInvoices.slice(0, 3).map(inv => (
              <div
                key={inv.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-indigo-600">
                    #{inv.invoiceNumber}
                  </div>
                  <p className="text-xs font-medium text-slate-800 truncate max-w-[140px]">
                    {inv.customerName}
                  </p>
                  <p className="text-xs text-rose-600 font-semibold mt-0.5">
                    Due: {formatCurrency(inv.balanceDue, inv.currencySymbol)}
                  </p>
                </div>
                <button
                  onClick={() => handleStartPayment(inv)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors shrink-0"
                >
                  Record
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name, or transaction ref..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full md:w-auto">
          <span className="text-slate-400 font-medium">Method:</span>
          {['all', 'Bank Transfer', 'UPI', 'Credit Card', 'Cash'].map(method => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0 ${
                methodFilter === method
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {method === 'all' ? 'All Methods' : method}
            </button>
          ))}
        </div>
      </div>

      {/* Payments History Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">Invoice View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map(p => {
                  const inv = invoices.find(i => i.id === p.invoiceId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                        #{p.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {p.customerName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {p.referenceNumber || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 text-sm">
                        +{formatCurrency(p.amount, settings.currencySymbol)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {inv && (
                          <button
                            onClick={() => setPreviewInvoice(inv)}
                            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center justify-end gap-1"
                          >
                            <span>Receipt</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">No payment receipts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Payments recorded against customer invoices will appear here in chronological order.
            </p>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showRecordModal && selectedInvoiceForPayment && (
        <RecordPaymentModal
          invoice={selectedInvoiceForPayment}
          isOpen={showRecordModal}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedInvoiceForPayment(null);
          }}
        />
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
    </div>
  );
};
