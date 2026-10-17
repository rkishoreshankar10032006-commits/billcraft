import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BusinessSettings, Customer, Product, Invoice, Payment } from '../types';
import { api, checkServerStatus } from '../services/api';
import { initialSettings } from '../services/mockData';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  settings: BusinessSettings;
  updateSettings: (s: BusinessSettings) => Promise<void>;
  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  products: Product[];
  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  invoices: Invoice[];
  getInvoice: (id: string) => Invoice | undefined;
  createInvoice: (inv: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, inv: Partial<Invoice>) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  duplicateInvoice: (id: string) => Promise<Invoice>;
  payments: Payment[];
  recordPayment: (data: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
  }) => Promise<Payment>;
  resetSampleData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  loading: boolean;
  isServerConnected: boolean;
  refreshData: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BusinessSettings>(initialSettings);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const serverOk = await checkServerStatus();
      setIsServerConnected(serverOk);

      const [s, c, p, i, pay] = await Promise.all([
        api.getSettings(),
        api.getCustomers(),
        api.getProducts(),
        api.getInvoices(),
        api.getPayments(),
      ]);

      setSettings(s);
      setCustomers(c);
      setProducts(p);
      setInvoices(i);
      setPayments(pay);
    } catch (err: any) {
      console.error('Error loading BillCraft data:', err);
      showToast('Error loading data, using offline fallback', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshData();

    const handleDataChanged = () => {
      refreshData();
    };

    window.addEventListener('billcraft_data_changed', handleDataChanged);
    return () => {
      window.removeEventListener('billcraft_data_changed', handleDataChanged);
    };
  }, [refreshData]);

  const handleUpdateSettings = async (s: BusinessSettings) => {
    await api.updateSettings(s);
    setSettings(s);
    showToast('Business settings saved successfully!');
  };

  const handleAddCustomer = async (c: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await api.createCustomer(c);
    setCustomers(prev => [created, ...prev]);
    showToast(`Customer "${created.name}" added successfully!`);
    return created;
  };

  const handleUpdateCustomer = async (id: string, c: Partial<Customer>) => {
    const updated = await api.updateCustomer(id, c);
    setCustomers(prev => prev.map(item => item.id === id ? updated : item));
    showToast(`Customer details updated successfully!`);
    return updated;
  };

  const handleDeleteCustomer = async (id: string) => {
    await api.deleteCustomer(id);
    setCustomers(prev => prev.filter(c => c.id !== id));
    showToast('Customer deleted successfully!');
  };

  const handleAddProduct = async (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await api.createProduct(p);
    setProducts(prev => [...prev, created]);
    showToast(`Item "${created.name}" saved to catalog!`);
    return created;
  };

  const handleUpdateProduct = async (id: string, p: Partial<Product>) => {
    const updated = await api.updateProduct(id, p);
    setProducts(prev => prev.map(item => item.id === id ? updated : item));
    showToast('Item updated successfully!');
    return updated;
  };

  const handleDeleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast('Item removed from catalog!');
  };

  const getInvoice = (id: string) => {
    return invoices.find(inv => inv.id === id);
  };

  const handleCreateInvoice = async (inv: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await api.createInvoice(inv);
    setInvoices(prev => [created, ...prev]);
    showToast(`Invoice ${created.invoiceNumber} created successfully!`);
    return created;
  };

  const handleUpdateInvoice = async (id: string, inv: Partial<Invoice>) => {
    const updated = await api.updateInvoice(id, inv);
    setInvoices(prev => prev.map(item => item.id === id ? updated : item));
    showToast(`Invoice ${updated.invoiceNumber} updated!`);
    return updated;
  };

  const handleDeleteInvoice = async (id: string) => {
    await api.deleteInvoice(id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setPayments(prev => prev.filter(p => p.invoiceId !== id));
    showToast('Invoice deleted successfully!');
  };

  const handleDuplicateInvoice = async (id: string) => {
    const dup = await api.duplicateInvoice(id);
    await refreshData();
    showToast(`Invoice duplicated as ${dup.invoiceNumber}!`);
    return dup;
  };

  const handleRecordPayment = async (data: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
  }) => {
    const recorded = await api.recordPayment(data);
    await refreshData();
    showToast(`Payment of ₹${data.amount.toLocaleString()} recorded successfully!`);
    return recorded;
  };

  const handleResetSampleData = async () => {
    await api.resetToSampleData();
    await refreshData();
    showToast('Sample data reset to default successfully!');
  };

  const handleClearAllData = async () => {
    await api.clearAllData();
    await refreshData();
    showToast('All transaction records cleared.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings: handleUpdateSettings,
        customers,
        addCustomer: handleAddCustomer,
        updateCustomer: handleUpdateCustomer,
        deleteCustomer: handleDeleteCustomer,
        products,
        addProduct: handleAddProduct,
        updateProduct: handleUpdateProduct,
        deleteProduct: handleDeleteProduct,
        invoices,
        getInvoice,
        createInvoice: handleCreateInvoice,
        updateInvoice: handleUpdateInvoice,
        deleteInvoice: handleDeleteInvoice,
        duplicateInvoice: handleDuplicateInvoice,
        payments,
        recordPayment: handleRecordPayment,
        resetSampleData: handleResetSampleData,
        clearAllData: handleClearAllData,
        loading,
        isServerConnected,
        refreshData,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
