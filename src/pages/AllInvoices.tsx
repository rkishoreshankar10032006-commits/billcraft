import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Download,
  CreditCard,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  MoreVertical,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';
import { RecordPaymentModal } from '../components/payments/RecordPaymentModal';

export const AllInvoices: React.FC = () => {
  const { invoices, deleteInvoice, duplicateInvoice, settings } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const statusFilter = searchParams.get('status') || 'all';
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleStatusFilterChange = (status: string) => {
    if (status === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        // Status match
        if (statusFilter !== 'all' && inv.status !== statusFilter) {
          return false;
        }

        // Search match (invoice number, customer name, email, notes)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNumber = inv.invoiceNumber.toLowerCase().includes(term);
          const matchCust = inv.customerName.toLowerCase().includes(term);
          const matchEmail = (inv.customerEmail || '').toLowerCase().includes(term);
          const matchNotes = (inv.notes || '').toLowerCase().includes(term);
          return matchNumber || matchCust || matchEmail || matchNotes;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'date') {
          diff = new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        } else if (sortBy === 'amount') {
          diff = b.grandTotal - a.grandTotal;
        } else if (sortBy === 'status') {
          diff = a.status.localeCompare(b.status);
        } else if (sortBy === 'number') {
          diff = b.invoiceNumber.localeCompare(a.invoiceNumber);
        }
        return sortOrder === 'asc' ? -diff : diff;
      });
  }, [invoices, statusFilter, searchTerm, sortBy, sortOrder]);

  const handleOpenPreview = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowPreviewModal(true);
  };

  const handleDuplicate = async (inv: Invoice) => {
    await duplicateInvoice(inv.id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteInvoice(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, search, record payments, and export your invoices
          </p>
        </div>

        <Link
          to="/invoices/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="status">Status</option>
                <option value="number">Invoice #</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
              title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              {sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1">
            Status:
          </span>
          {[
            { label: 'All', value: 'all' },
            { label: 'Paid', value: 'paid' },
            { label: 'Pending', value: 'pending' },
            { label: 'Overdue', value: 'overdue' },
            { label: 'Draft', value: 'draft' },
          ].map(tab => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleStatusFilterChange(tab.value)}
                className={`px-3 py-1 rounded-lg transition-colors shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Invoice # */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                      <button
                        onClick={() => handleOpenPreview(inv)}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        #{inv.invoiceNumber}
                      </button>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 truncate max-w-[180px]">
                        {inv.customerName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {inv.customerEmail}
                      </div>
                    </td>

                    {/* Issue Date */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(inv.issueDate)}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4">
                      <span className={inv.status === 'overdue' ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                        {formatDate(inv.dueDate)}
                      </span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal, inv.currencySymbol)}
                    </td>

                    {/* Balance Due */}
                    <td className="py-3.5 px-4 text-right">
                      {inv.balanceDue > 0 ? (
                        <span className="font-semibold text-rose-600">
                          {formatCurrency(inv.balanceDue, inv.currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid</span>
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                          inv.status
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Preview */}
                        <button
                          onClick={() => handleOpenPreview(inv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Preview Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => generateInvoicePDF(inv, settings)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Record Payment (if outstanding balance) */}
                        {inv.balanceDue > 0 && (
                          <button
                            onClick={() => setPaymentInvoice(inv)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}

                        {/* Edit (allowed for draft or pending) */}
                        <Link
                          to={`/invoices/edit/${inv.id}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>

                        {/* Duplicate */}
                        <button
                          onClick={() => handleDuplicate(inv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Duplicate Invoice"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteId(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No invoices match your query</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search keywords, clearing status filters, or create a brand new invoice.
            </p>
            <div className="pt-2">
              <Link
                to="/invoices/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Invoice</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Preview Modal */}
      {showPreviewModal && selectedInvoice && (
        <InvoicePreviewModal
          invoice={selectedInvoice}
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <RecordPaymentModal
          invoice={paymentInvoice}
          isOpen={!!paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Invoice?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete this invoice? All recorded payment
                receipts linked to this invoice will also be removed. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
