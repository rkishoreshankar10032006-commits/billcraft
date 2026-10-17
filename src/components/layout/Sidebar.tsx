import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Receipt,
  Database,
  X,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { settings, isServerConnected, invoices } = useApp();

  const navItems = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Create Invoice', to: '/invoices/new', icon: FilePlus2 },
    {
      name: 'All Invoices',
      to: '/invoices',
      icon: FileText,
      badge: invoices.length > 0 ? invoices.length : undefined,
    },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Products & Services', to: '/products', icon: Package },
    { name: 'Payments', to: '/payments', icon: CreditCard },
    { name: 'Reports', to: '/reports', icon: BarChart3 },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-18 px-5 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                BillCraft
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  v2.0
                </span>
              </span>
              <p className="text-xs text-slate-400 truncate max-w-[140px]">
                {settings.companyName || 'Billing & Invoicing'}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-4 border-b border-slate-800/80">
          <Link
            to="/invoices/new"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-sm shadow-indigo-600/30 transition-all hover:shadow-indigo-600/50 hover:translate-y-[-1px] active:translate-y-[0px]"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Create Invoice</span>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      item.badge > 0
                        ? 'bg-slate-800 text-indigo-300'
                        : 'bg-slate-800/40 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info & DB status */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-medium">Storage Engine</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isServerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span
                className={`font-semibold ${
                  isServerConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isServerConnected ? 'SQLite Active' : 'Local Storage'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>BillCraft Database</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Currency: <strong className="text-slate-200">{settings.currency} ({settings.currencySymbol})</strong>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
