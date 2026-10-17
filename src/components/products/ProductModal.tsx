import React, { useState, useEffect } from 'react';
import { X, Package, Tag, Percent, DollarSign, Layers } from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';

interface ProductModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (savedProduct: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addProduct, updateProduct, settings } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<'product' | 'service'>('service');
  const [unitPrice, setUnitPrice] = useState<number>(1000);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(settings.defaultTaxRate || 18);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setSku(product.sku || '');
      setCategory(product.category);
      setUnitPrice(product.unitPrice);
      setDefaultTaxRate(product.defaultTaxRate ?? settings.defaultTaxRate ?? 18);
    } else {
      setName('');
      setDescription('');
      setSku('');
      setCategory('service');
      setUnitPrice(1000);
      setDefaultTaxRate(settings.defaultTaxRate ?? 18);
    }
    setError('');
  }, [product, isOpen, settings.defaultTaxRate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (unitPrice < 0) {
      setError('Unit price cannot be negative.');
      return;
    }

    try {
      setIsSubmitting(true);
      let result: Product;
      if (product) {
        result = await updateProduct(product.id, {
          name: name.trim(),
          description: description.trim(),
          sku: sku.trim() || undefined,
          category,
          unitPrice,
          defaultTaxRate,
        });
      } else {
        result = await addProduct({
          name: name.trim(),
          description: description.trim(),
          sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
          category,
          unitPrice,
          defaultTaxRate,
        });
      }

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {product ? 'Edit Item' : 'Add Item / Service'}
              </h3>
              <p className="text-xs text-slate-500">
                Manage reusable offerings for fast invoice creation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Item / Service Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Website Redesign & Development"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Detailed description to automatically populate in invoice line items"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as 'product' | 'service')}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-white"
              >
                <option value="service">Service (Consulting, Dev, Retainer)</option>
                <option value="product">Product (Hardware, License, Good)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                SKU / Item Code
              </label>
              <input
                type="text"
                placeholder="e.g. SRV-DEV-001"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unit Price ({settings.currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-semibold text-sm">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitPrice}
                  onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Default Tax Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={defaultTaxRate}
                  onChange={e => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 pr-8 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-medium text-xs">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : product ? 'Update Item' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
