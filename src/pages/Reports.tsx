import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
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
import { formatCurrency, formatDate } from '../utils/formatters';

export const Reports: React.FC = () => {
  const { invoices, payments, customers, settings } = useApp();

  const [dateRange, setDateRange] = useState<'all' | 'this_month' | 'last_month' | 'this_year'>('all');

  // Filter invoices and payments by date range
  const filteredData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return invoices.filter(inv => {
      if (dateRange === 'all') return true;
      const invDate = new Date(inv.issueDate);
      if (isNaN(invDate.getTime())) return true;

      if (dateRange === 'this_month') {
        return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
      }
      if (dateRange === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return invDate.getFullYear() === lastMonthYear && invDate.getMonth() === lastMonth;
      }
      if (dateRange === 'this_year') {
        return invDate.getFullYear() === currentYear;
      }
      return true;
    });
  }, [invoices, dateRange]);

  // Aggregate Metrics
  const totalBilled = filteredData.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const totalCollected = filteredData.reduce((acc, inv) => acc + inv.amountPaid, 0);
  const totalOutstanding = filteredData.reduce((acc, inv) => acc + inv.balanceDue, 0);
  const totalOverdue = filteredData
    .filter(inv => inv.status === 'overdue')
    .reduce((acc, inv) => acc + inv.balanceDue, 0);
  const avgInvoiceValue = filteredData.length > 0 ? totalBilled / filteredData.length : 0;

  // Monthly Revenue Chart Data
  const monthlyData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map: Record<string, { month: string; billed: number; collected: number }> = {};

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      map[key] = { month: label, billed: 0, collected: 0 };
    }

    filteredData.forEach(inv => {
      const key = inv.issueDate.slice(0, 7);
      if (map[key]) {
        map[key].billed += inv.grandTotal;
        map[key].collected += inv.amountPaid;
      }
    });

    return Object.values(map);
  }, [filteredData]);

  // Payment Methods Breakdown
  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => {
      map[p.paymentMethod] = (map[p.paymentMethod] || 0) + p.amount;
    });

    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [payments]);

  // Top Customers Ranking
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; billed: number; paid: number; count: number }> = {};

    filteredData.forEach(inv => {
      if (!map[inv.customerId]) {
        map[inv.customerId] = { name: inv.customerName, billed: 0, paid: 0, count: 0 };
      }
      map[inv.customerId].billed += inv.grandTotal;
      map[inv.customerId].paid += inv.amountPaid;
      map[inv.customerId].count += 1;
    });

    return Object.values(map)
      .sort((a, b) => b.billed - a.billed)
      .slice(0, 5);
  }, [filteredData]);

  // CSV Export Utilities
  const exportInvoicesCSV = () => {
    const headers = [
      'Invoice Number',
      'Customer',
      'Issue Date',
      'Due Date',
      'Status',
      'Subtotal',
      'Discount',
      'Tax Total',
      'Grand Total',
      'Amount Paid',
      'Balance Due',
    ];

    const rows = filteredData.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      inv.issueDate,
      inv.dueDate,
      inv.status,
      inv.subtotal.toFixed(2),
      inv.discountTotal.toFixed(2),
      inv.taxTotal.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.amountPaid.toFixed(2),
      inv.balanceDue.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `BillCraft_Invoices_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportPaymentsCSV = () => {
    const headers = [
      'Payment ID',
      'Payment Date',
      'Invoice Number',
      'Customer',
      'Amount',
      'Method',
      'Reference Number',
      'Notes',
    ];

    const rows = payments.map(p => [
      p.id,
      p.paymentDate,
      `"${p.invoiceNumber}"`,
      `"${p.customerName.replace(/"/g, '""')}"`,
      p.amount.toFixed(2),
      `"${p.paymentMethod}"`,
      `"${(p.referenceNumber || '').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `BillCraft_Payments_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportCustomerSummaryCSV = () => {
    const headers = ['Customer Name', 'Invoices Count', 'Total Invoiced', 'Total Paid', 'Outstanding Balance'];
    const rows = topCustomers.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.count,
      c.billed.toFixed(2),
      c.paid.toFixed(2),
      (c.billed - c.paid).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `BillCraft_Customer_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Financial Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of cash flow, receivables aging, monthly revenues, and CSV export
          </p>
        </div>

        {/* CSV Export Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportInvoicesCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Invoices CSV</span>
          </button>
          <button
            onClick={exportPaymentsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Payments CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500">Filter Range:</span>
          {(['all', 'this_month', 'last_month', 'this_year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors font-medium ${
                dateRange === range
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {range === 'all'
                ? 'All Time'
                : range === 'this_month'
                ? 'This Month'
                : range === 'last_month'
                ? 'Last Month'
                : 'This Year'}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">
          Showing <strong className="text-slate-700 font-semibold">{filteredData.length}</strong> invoices
        </span>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Invoiced
          </span>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalBilled, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Gross billings</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Collected
          </span>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalCollected, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {totalBilled > 0 ? `${Math.round((totalCollected / totalBilled) * 100)}% recovery` : '0%'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Outstanding Due
          </span>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(totalOutstanding, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total pending balances</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Overdue Amount
          </span>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(totalOverdue, settings.currencySymbol)}
          </div>
          <p className="text-xs text-rose-500 font-medium mt-1">Exceeded due dates</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Average Invoice
          </span>
          <div className="text-2xl font-bold text-indigo-600">
            {formatCurrency(avgInvoiceValue, settings.currencySymbol)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Per transaction ticket</p>
        </div>
      </div>

      {/* Visual Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Monthly Invoiced vs Collected
              </h3>
              <p className="text-xs text-slate-500">Comparing billings against collections</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <Legend />
                <Bar dataKey="billed" name="Billed Amount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected Amount" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Channels Pie Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Collections by Payment Method
            </h3>
            <p className="text-xs text-slate-500">Breakdown of inflow payment rails</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
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
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">No payment records yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Clients Revenue Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Top Customer Revenue Leaders
            </h3>
            <p className="text-xs text-slate-500">Key client accounts ranked by total business volume</p>
          </div>
          <button
            onClick={exportCustomerSummaryCSV}
            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <span>Download Summary CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2.5 px-3">Client Account</th>
                <th className="py-2.5 px-3 text-center">Invoices</th>
                <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                <th className="py-2.5 px-3 text-right">Collected</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topCustomers.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-3 px-3 text-center text-slate-600">{c.count}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(c.billed, settings.currencySymbol)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                    {formatCurrency(c.paid, settings.currencySymbol)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-rose-600">
                    {formatCurrency(c.billed - c.paid, settings.currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
