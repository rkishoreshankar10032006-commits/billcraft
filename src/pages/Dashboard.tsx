import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Eye,
  Download,
  CreditCard,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';
import { RecordPaymentModal } from '../components/payments/RecordPaymentModal';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { Invoice } from '../types';

export const Dashboard: React.FC = () => {
  const { invoices, payments, settings, loading } = useApp();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  // Dynamic calculations from underlying invoice data
  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + inv.amountPaid, 0);
  const pendingAmount = invoices
    .filter(inv => inv.status === 'pending')
    .reduce((acc, inv) => acc + inv.balanceDue, 0);
  const overdueAmount = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((acc, inv) => acc + inv.balanceDue, 0);

  // Status breakdown for Pie chart
  const statusCounts = invoices.reduce((acc: Record<string, number>, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  const statusPieData = [
    { name: 'Paid', value: statusCounts['paid'] || 0, color: '#10B981' },
    { name: 'Pending', value: statusCounts['pending'] || 0, color: '#F59E0B' },
    { name: 'Overdue', value: statusCounts['overdue'] || 0, color: '#EF4444' },
    { name: 'Draft', value: statusCounts['draft'] || 0, color: '#94A3B8' },
  ].filter(d => d.value > 0);

  // Monthly revenue trend (last 6 months dynamically derived from invoices)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenueMap: Record<string, { month: string; billed: number; collected: number }> = {};

  // Initialize last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    monthlyRevenueMap[key] = { month: label, billed: 0, collected: 0 };
  }

  // Populate from invoices
  invoices.forEach(inv => {
    const key = inv.issueDate.slice(0, 7);
    if (monthlyRevenueMap[key]) {
      monthlyRevenueMap[key].billed += inv.grandTotal;
    }
  });

  // Populate collected from payments
  payments.forEach(pay => {
    const key = pay.paymentDate.slice(0, 7);
    if (monthlyRevenueMap[key]) {
      monthlyRevenueMap[key].collected += pay.amount;
    }
  });

  const revenueChartData = Object.values(monthlyRevenueMap);

  // Recent Invoices (up to 5)
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 5);

  // Recent Activities
  const recentActivities = [
    ...payments.map(p => ({
      id: `act-pay-${p.id}`,
      type: 'payment',
      title: `Payment received: ${formatCurrency(p.amount, settings.currencySymbol)}`,
      desc: `For #${p.invoiceNumber} from ${p.customerName}`,
      date: p.paymentDate,
      time: p.createdAt,
      icon: CreditCard,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    })),
    ...invoices.slice(0, 4).map(inv => ({
      id: `act-inv-${inv.id}`,
      type: 'invoice',
      title: `Invoice #${inv.invoiceNumber} created`,
      desc: `${inv.customerName} - ${formatCurrency(inv.grandTotal, inv.currencySymbol)}`,
      date: inv.issueDate,
      time: inv.createdAt,
      icon: FileText,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    })),
  ]
    .sort((a, b) => new Date(b.time || b.date).getTime() - new Date(a.time || a.date).getTime())
    .slice(0, 5);

  const handleOpenPreview = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowPreviewModal(true);
  };

  const handleOpenPayment = (inv: Invoice) => {
    setPaymentInvoice(inv);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading BillCraft Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to BillCraft SaaS Billing</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {settings.companyName}
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Track receivables, generate client invoices, automate GST calculations, and manage collections.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Link
            to="/invoices/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </Link>
          <Link
            to="/invoices"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Invoices */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {totalInvoices}
          </div>
          <p className="text-xs text-slate-500 mt-1">Across all clients</p>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(totalRevenue, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Gross invoiced amount</p>
        </div>

        {/* Paid Amount */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paid Amount
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            {formatCurrency(totalPaid, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {totalRevenue > 0 ? `${Math.round((totalPaid / totalRevenue) * 100)}% collected` : 'No revenue yet'}
          </p>
        </div>

        {/* Pending Amount */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight">
            {formatCurrency(pendingAmount, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Due within terms</p>
        </div>

        {/* Overdue Amount */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight">
            {formatCurrency(overdueAmount, settings.currencySymbol)}
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1">
            {overdueAmount > 0 ? 'Requires attention' : 'All clear!'}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Area Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Revenue & Collections Trend
              </h3>
              <p className="text-xs text-slate-500">Monthly invoiced vs actual collected revenue</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <span className="text-slate-600">Billed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Collected</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={val => `₹${val > 999 ? (val / 1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val), settings.currencySymbol)]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="billed"
                  name="Billed"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorBilled)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCollected)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Status Donut Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Invoice Status Breakdown
            </h3>
            <p className="text-xs text-slate-500">Distribution of invoice lifecycles</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">No invoice records yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 cols) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Recent Invoices
              </h3>
              <p className="text-xs text-slate-500">Latest generated client invoices</p>
            </div>
            <Link
              to="/invoices"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-3 pr-4">Invoice</th>
                    <th className="pb-3 pr-4">Customer</th>
                    <th className="pb-3 pr-4">Due Date</th>
                    <th className="pb-3 pr-4 text-right">Amount</th>
                    <th className="pb-3 pr-4 text-center">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pr-4 font-semibold text-indigo-600">
                        <button
                          onClick={() => handleOpenPreview(inv)}
                          className="hover:underline font-mono text-xs"
                        >
                          #{inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-slate-800 font-medium truncate max-w-[150px]">
                        {inv.customerName}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-900">
                        {formatCurrency(inv.grandTotal, inv.currencySymbol)}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${getStatusBadgeClass(
                            inv.status
                          )}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenPreview(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Preview Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => generateInvoicePDF(inv, settings)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {inv.balanceDue > 0 && (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No invoices created yet. Click "Create Invoice" to generate your first invoice!
            </div>
          )}
        </div>

        {/* Recent Activity Timeline (1 col) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Recent Activities
              </h3>
              <p className="text-xs text-slate-500">Live transaction audit log</p>
            </div>
            <Link
              to="/payments"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Payments</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentActivities.map(act => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${act.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{act.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{act.desc}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(act.date)}</p>
                  </div>
                </div>
              );
            })}

            {recentActivities.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No recent activities recorded.</p>
            )}
          </div>
        </div>
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
    </div>
  );
};
