export function formatCurrency(amount: number | undefined | null, symbol: string = '₹'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `${symbol}0.00`;
  }
  // Standard format with commas and 2 decimals
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/20';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/20';
    case 'overdue':
      return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-600/20';
    case 'draft':
      return 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-600/20';
    case 'cancelled':
      return 'bg-gray-100 text-gray-500 border-gray-200';
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

export function getStatusDotClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-emerald-500';
    case 'pending':
      return 'bg-amber-500';
    case 'overdue':
      return 'bg-rose-500';
    case 'draft':
      return 'bg-slate-400';
    case 'cancelled':
      return 'bg-gray-400';
    default:
      return 'bg-blue-500';
  }
}
