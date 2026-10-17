import React from 'react';
import { Menu, Plus, Building2, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { settings, invoices } = useApp();
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname === '/') return 'Dashboard';
    if (pathname === '/invoices/new') return 'Create New Invoice';
    if (pathname.startsWith('/invoices/edit/')) return 'Edit Invoice';
    if (pathname.startsWith('/invoices/')) return 'Invoice Details';
    if (pathname === '/invoices') return 'All Invoices';
    if (pathname === '/customers') return 'Customer Management';
    if (pathname === '/products') return 'Products & Services Catalog';
    if (pathname === '/payments') return 'Payments & Receipts';
    if (pathname === '/reports') return 'Financial Reports & Analytics';
    if (pathname === '/settings') return 'Business & Invoicing Settings';
    return 'BillCraft';
  };

  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-18 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {getPageTitle(location.pathname)}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {settings.companyName}
          </p>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Overdue alert indicator */}
        {overdueCount > 0 && (
          <Link
            to="/invoices?status=overdue"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
            title={`${overdueCount} invoice(s) overdue`}
          >
            <Bell className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
            <span className="hidden md:inline">{overdueCount} Overdue</span>
            <span className="md:hidden">{overdueCount}</span>
          </Link>
        )}

        {/* Currency badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
          <span className="text-indigo-600 font-bold">{settings.currencySymbol}</span>
          <span>{settings.currency}</span>
        </div>

        {/* Business quick info */}
        <Link
          to="/settings"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="max-w-[130px] truncate">{settings.companyName}</span>
        </Link>

        {/* Quick Create Invoice CTA */}
        {location.pathname !== '/invoices/new' && (
          <Link
            to="/invoices/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">New Invoice</span>
          </Link>
        )}
      </div>
    </header>
  );
};
