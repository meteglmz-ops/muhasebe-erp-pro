import React from 'react';
import { Search, Plus, Wallet, FileText, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { Company, User } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface HeaderProps {
  currentTab: string;
  currentCompany: Company | null;
  onOpenInvoiceModal: (type: 'SALES' | 'PURCHASE') => void;
  onOpenTransferModal: () => void;
  onGlobalSearchClick: () => void;
  onNavigateToAdmin?: () => void;
  currentUser?: User | null;
  liquidTotal?: number;
}

const tabTitles: Record<string, string> = {
  dashboard: 'Finansal Genel Bakış (Dashboard)',
  invoices: 'Fatura Yönetimi (Satış & Alış)',
  customers: 'Müşteri Yönetimi & Cari Ekstreler',
  suppliers: 'Tedarikçi Yönetimi & Borç Takibi',
  'payment-plans': 'Ödeme Planları, Vadeler ve Taksitler',
  'cash-banks': 'Kasa, Banka ve Varlık Yönetimi',
  'income-expenses': 'Gelir ve Gider Yönetimi',
  'quotes-orders': 'Teklifler ve Satış Siparişleri',
  products: 'Stok, Ürün ve Depo Yönetimi',
  documents: 'Belge ve Klasör Arşivi',
  reports: 'Finansal ve Muhasebe Raporları',
  'audit-trash': 'Denetim Günlüğü & Çöp Kutusu',
  settings: 'Şirket ve Sistem Ayarları',
  'master-admin': 'Master Admin & Müşteri Veri Kurtarma Paneli',
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenInvoiceModal,
  onOpenTransferModal,
  onGlobalSearchClick,
  onNavigateToAdmin,
  currentUser,
  liquidTotal = 570000,
}) => {
  const isMasterAdmin =
    currentUser?.email === 'admin@beecursor.com' ||
    currentUser?.email === 'meteglmez@gmail.com' ||
    currentUser?.email === 'ahmetmit35@gmail.com' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'ADMIN';

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          {tabTitles[currentTab] || 'Muhasebe Sistemi'}
        </h1>
      </div>

      {/* Global Search and Quick Actions */}
      <div className="flex items-center gap-4">
        {/* Quick Liquid Asset Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
          <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Toplam Likit: </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(liquidTotal)}</span>
          </div>
        </div>

        {/* Global Search Trigger (Ctrl+K) */}
        <button
          onClick={onGlobalSearchClick}
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Fatura, cari veya belge ara...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-500 dark:text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTransferModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-brand-500" />
            <span className="hidden sm:inline">Transfer</span>
          </button>

          <button
            onClick={() => onOpenInvoiceModal('SALES')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <FileText className="w-3.5 h-3.5 hidden sm:inline" />
            <span>Yeni Fatura</span>
          </button>
        </div>
      </div>
    </header>
  );
};
