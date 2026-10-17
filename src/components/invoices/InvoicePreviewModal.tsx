import React, { useState } from 'react';
import { X, Printer, Download, CreditCard, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Invoice } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../utils/formatters';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { settings } = useApp();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    generateInvoicePDF(invoice, settings);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Action Bar (Not visible in Print) */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 no-print shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">
                Invoice Preview
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {invoice.balanceDue > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-2"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Document Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 print-area bg-white">
            <div className="max-w-3xl mx-auto border border-slate-200 rounded-xl p-8 shadow-xs">
              {/* Header: Company & Invoice Identity */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-2xl tracking-tight mb-1">
                    <Building2 className="w-7 h-7" />
                    <span>{settings.companyName}</span>
                  </div>
                  {settings.tagline && (
                    <p className="text-xs text-slate-500 font-medium mb-2">{settings.tagline}</p>
                  )}
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p>{settings.address}</p>
                    <p>{settings.city}, {settings.state} - {settings.postalCode}, {settings.country}</p>
                    <p>Email: {settings.email} | Phone: {settings.phone}</p>
                    {settings.taxId && (
                      <p className="font-medium text-slate-700">GSTIN / Tax ID: {settings.taxId}</p>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight block">
                    INVOICE
                  </span>
                  <span className="text-sm font-semibold text-indigo-600 block mt-0.5">
                    #{invoice.invoiceNumber}
                  </span>
                  <div className="mt-3 text-xs space-y-1">
                    <div className="flex sm:justify-end gap-2 text-slate-500">
                      <span>Issue Date:</span>
                      <strong className="text-slate-800">{formatDate(invoice.issueDate)}</strong>
                    </div>
                    <div className="flex sm:justify-end gap-2 text-slate-500">
                      <span>Due Date:</span>
                      <strong className="text-slate-800">{formatDate(invoice.dueDate)}</strong>
                    </div>
                    <div className="flex sm:justify-end gap-2 text-slate-500">
                      <span>Terms:</span>
                      <strong className="text-slate-800">{invoice.paymentTerms || 'Net 30'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To Customer Card */}
              <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1 block">
                  Billed To
                </span>
                <p className="text-base font-bold text-slate-900">{invoice.customerName}</p>
                <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                  {invoice.customerBillingAddress && <p>{invoice.customerBillingAddress}</p>}
                  <p>Email: {invoice.customerEmail} {invoice.customerPhone && `| Phone: ${invoice.customerPhone}`}</p>
                  {invoice.customerTaxId && (
                    <p className="font-medium text-slate-700">GSTIN / Tax ID: {invoice.customerTaxId}</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Item & Description</th>
                      <th className="py-2.5 px-3 text-center w-16">Qty</th>
                      <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                      <th className="py-2.5 px-3 text-right w-16">Disc%</th>
                      <th className="py-2.5 px-3 text-right w-16">Tax%</th>
                      <th className="py-2.5 px-3 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {invoice.items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center text-slate-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          {item.description}
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {formatCurrency(item.unitPrice, invoice.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {item.discountPercent ? `${item.discountPercent}%` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {item.taxRate}%
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">
                          {formatCurrency(item.amount, invoice.currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Notes Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Bank / Payment Instructions & Notes */}
                <div className="space-y-4 text-xs">
                  {(invoice.bankDetails || settings.bankDetails) && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Payment Instructions</span>
                      </p>
                      <pre className="font-sans whitespace-pre-wrap text-[11px] text-slate-600 leading-relaxed">
                        {invoice.bankDetails || settings.bankDetails}
                      </pre>
                    </div>
                  )}

                  {invoice.notes && (
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Notes</p>
                      <p className="text-slate-600 text-xs leading-relaxed">{invoice.notes}</p>
                    </div>
                  )}

                  {(invoice.terms || settings.termsAndConditions) && (
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Terms & Conditions</p>
                      <pre className="font-sans whitespace-pre-wrap text-[11px] text-slate-500 leading-relaxed">
                        {invoice.terms || settings.termsAndConditions}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Calculation Summary Box */}
                <div className="space-y-2 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(invoice.subtotal, invoice.currencySymbol)}
                      </span>
                    </div>

                    {invoice.discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount ({invoice.discountValue}{invoice.discountType === 'percentage' ? '%' : ''})</span>
                        <span className="font-medium">
                          -{formatCurrency(invoice.discountTotal, invoice.currencySymbol)}
                        </span>
                      </div>
                    )}

                    {invoice.taxTotal > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax / GST</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(invoice.taxTotal, invoice.currencySymbol)}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                      <span>Grand Total</span>
                      <span className="text-base text-indigo-600">
                        {formatCurrency(invoice.grandTotal, invoice.currencySymbol)}
                      </span>
                    </div>

                    {invoice.amountPaid > 0 && (
                      <>
                        <div className="flex justify-between text-emerald-700 pt-1 font-medium">
                          <span>Amount Paid</span>
                          <span>{formatCurrency(invoice.amountPaid, invoice.currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between text-rose-700 font-bold border-t border-dashed border-slate-200 pt-1.5">
                          <span>Balance Due</span>
                          <span>{formatCurrency(invoice.balanceDue, invoice.currencySymbol)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payment status stamp */}
                  {invoice.status === 'paid' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>PAID IN FULL</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Document footer */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
                Thank you for choosing {settings.companyName}.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Sub-Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          invoice={invoice}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
};
