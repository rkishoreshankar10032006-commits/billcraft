import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  ArrowUpRight,
  AlertCircle,
  X,
  CreditCard,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer, Invoice } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { CustomerModal } from '../components/customers/CustomerModal';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';

export const Customers: React.FC = () => {
  const { customers, invoices, deleteCustomer, settings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewHistoryCustomer, setViewHistoryCustomer] = useState<Customer | null>(null);
  const [deleteConfirmCust, setDeleteConfirmCust] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Calculate customer financials dynamically
  const customerFinancials = useMemo(() => {
    const map: Record<string, { totalInvoiced: number; totalPaid: number; balanceDue: number; invoiceCount: number }> = {};

    customers.forEach(c => {
      map[c.id] = { totalInvoiced: 0, totalPaid: 0, balanceDue: 0, invoiceCount: 0 };
    });

    invoices.forEach(inv => {
      if (map[inv.customerId]) {
        map[inv.customerId].totalInvoiced += inv.grandTotal;
        map[inv.customerId].totalPaid += inv.amountPaid;
        map[inv.customerId].balanceDue += inv.balanceDue;
        map[inv.customerId].invoiceCount += 1;
      }
    });

    return map;
  }, [customers, invoices]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(term) ||
        (c.companyName || '').toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.city || '').toLowerCase().includes(term) ||
        (c.taxId || '').toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const handleEdit = (c: Customer) => {
    setEditingCustomer(c);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const handleDeleteClick = (c: Customer) => {
    const fin = customerFinancials[c.id];
    setDeleteConfirmCust(c);
    if (fin && fin.invoiceCount > 0) {
      setDeleteError(
        `Customer "${c.name}" has ${fin.invoiceCount} associated invoice(s). To protect billing records, please delete or reassign those invoices first.`
      );
    } else {
      setDeleteError('');
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmCust) return;
    try {
      await deleteCustomer(deleteConfirmCust.id);
      setDeleteConfirmCust(null);
      setDeleteError('');
    } catch (err: any) {
      setDeleteError(err.message || 'Cannot delete customer');
    }
  };

  // Get invoice list for the customer history drawer
  const customerInvoices = useMemo(() => {
    if (!viewHistoryCustomer) return [];
    return invoices.filter(inv => inv.customerId === viewHistoryCustomer.id);
  }, [invoices, viewHistoryCustomer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Customers & Clients
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your customer directory, billing addresses, and historical receivables
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, company, email, or city..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 shrink-0">
          <span>
            Total Clients: <strong className="text-slate-900 font-bold">{customers.length}</strong>
          </span>
          <span>•</span>
          <span>
            With Balance:{' '}
            <strong className="text-rose-600 font-bold">
              {Object.values(customerFinancials).filter(f => f.balanceDue > 0).length}
            </strong>
          </span>
        </div>
      </div>

      {/* Customer Directory Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map(c => {
          const fin = customerFinancials[c.id] || { totalInvoiced: 0, totalPaid: 0, balanceDue: 0, invoiceCount: 0 };

          return (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Header: Name & Options */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{c.name}</h3>
                    {c.companyName && (
                      <p className="text-xs text-indigo-600 font-medium truncate flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 shrink-0" />
                        <span>{c.companyName}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                      title="Edit Customer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 text-xs text-slate-500 mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.city && (
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.city}, {c.state}</span>
                    </div>
                  )}
                  {c.taxId && (
                    <div className="text-[11px] font-mono text-slate-600 font-medium">
                      GST: {c.taxId}
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Invoiced</span>
                    <strong className="text-slate-800 font-semibold block text-[11px] mt-0.5">
                      {formatCurrency(fin.totalInvoiced, settings.currencySymbol)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Paid</span>
                    <strong className="text-emerald-600 font-semibold block text-[11px] mt-0.5">
                      {formatCurrency(fin.totalPaid, settings.currencySymbol)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Balance</span>
                    <strong
                      className={`block text-[11px] font-bold mt-0.5 ${
                        fin.balanceDue > 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {formatCurrency(fin.balanceDue, settings.currencySymbol)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <span className="text-slate-400 text-[11px]">
                  {fin.invoiceCount} {fin.invoiceCount === 1 ? 'Invoice' : 'Invoices'}
                </span>
                <button
                  onClick={() => setViewHistoryCustomer(c)}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Invoice History</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-900">No customers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No clients match your filter. Add a new customer to keep billing organized.
            </p>
          </div>
        )}
      </div>

      {/* Customer Add/Edit Modal */}
      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* Customer Invoice History Drawer / Modal */}
      {viewHistoryCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {viewHistoryCustomer.name} - Billing History
                </h3>
                <p className="text-xs text-slate-500">{viewHistoryCustomer.email}</p>
              </div>
              <button
                onClick={() => setViewHistoryCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {customerInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold pb-2">
                        <th className="pb-2">Invoice #</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2 text-right">Total</th>
                        <th className="pb-2 text-right">Balance Due</th>
                        <th className="pb-2 text-center">Status</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-2.5 font-mono font-semibold text-indigo-600">
                            #{inv.invoiceNumber}
                          </td>
                          <td className="py-2.5 text-slate-600">{formatDate(inv.issueDate)}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-900">
                            {formatCurrency(inv.grandTotal, inv.currencySymbol)}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-rose-600">
                            {formatCurrency(inv.balanceDue, inv.currencySymbol)}
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getStatusBadgeClass(
                                inv.status
                              )}`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => {
                                setPreviewInvoice(inv);
                              }}
                              className="text-xs font-semibold text-indigo-600 hover:underline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No invoices created for this customer yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview inside history view */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {/* Delete Confirmation Safeguard Modal */}
      {deleteConfirmCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Customer "{deleteConfirmCust.name}"?
              </h3>
              {deleteError ? (
                <div className="mt-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {deleteError}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove this client? This client has no active invoices
                  and can be safely deleted.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmCust(null);
                  setDeleteError('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {deleteError ? 'Close' : 'Cancel'}
              </button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
                >
                  Yes, Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
