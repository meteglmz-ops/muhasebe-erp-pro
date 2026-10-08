import React, { useState, useEffect } from 'react';
import { Search, X, FileText, Users, Building2, Package, Folder } from 'lucide-react';
import { Customer, Supplier, Product, Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  invoices: Invoice[];
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  customers,
  suppliers,
  products,
  invoices,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // Toggle or open
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredCustomers = q ? customers.filter((c) => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : [];
  const filteredSuppliers = q ? suppliers.filter((s) => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) : [];
  const filteredInvoices = q ? invoices.filter((i) => i.invoice_no.toLowerCase().includes(q) || i.customer_title?.toLowerCase().includes(q)) : [];
  const filteredProducts = q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) : [];

  const hasResults = filteredCustomers.length > 0 || filteredSuppliers.length > 0 || filteredInvoices.length > 0 || filteredProducts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Fatura no, müşteri adı, ürün veya tedarikçi ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          <kbd className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-400">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {!q && (
            <div className="py-10 text-center text-xs text-slate-400">
              Aramak istediğiniz fatura, müşteri, ürün veya tedarikçi bilgisini yazın.
            </div>
          )}

          {q && !hasResults && (
            <div className="py-10 text-center text-xs text-slate-400">
              "{query}" ile eşleşen bir kayıt bulunamadı.
            </div>
          )}

          {/* Invoices */}
          {filteredInvoices.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Faturalar ({filteredInvoices.length})</span>
              </div>
              <div className="space-y-1">
                {filteredInvoices.slice(0, 5).map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      onSelectTab('invoices');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white mr-2">{inv.invoice_no}</span>
                      <span className="text-slate-500">{inv.customer_title || inv.supplier_title}</span>
                    </div>
                    <div className="font-mono font-bold text-brand-600">{formatCurrency(inv.grand_total, inv.currency)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {filteredCustomers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Müşteriler ({filteredCustomers.length})</span>
              </div>
              <div className="space-y-1">
                {filteredCustomers.slice(0, 5).map((cust) => (
                  <button
                    key={cust.id}
                    onClick={() => {
                      onSelectTab('customers');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white mr-2">{cust.title}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{cust.code}</span>
                    </div>
                    <div className="font-mono text-emerald-600">Bakiye: {formatCurrency(cust.balance)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {filteredProducts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Ürün ve Stok ({filteredProducts.length})</span>
              </div>
              <div className="space-y-1">
                {filteredProducts.slice(0, 5).map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => {
                      onSelectTab('products');
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white mr-2">{prod.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">Stok: {prod.current_stock} {prod.unit}</span>
                    </div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(prod.sell_price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
