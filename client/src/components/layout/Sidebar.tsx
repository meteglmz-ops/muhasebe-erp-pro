import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  CalendarDays,
  Wallet,
  ArrowUpDown,
  FileCheck2,
  Package,
  FolderTree,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Company, User } from '../../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentCompany: Company | null;
  companies: Company[];
  onCompanyChange: (company: Company) => void;
  currentUser: User | null;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  currentCompany,
  companies,
  onCompanyChange,
  currentUser,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  const [showCompanyMenu, setShowCompanyMenu] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'invoices', label: 'Faturalar', icon: FileText, badge: null },
    { id: 'customers', label: 'Müşteriler (Cariler)', icon: Users, badge: null },
    { id: 'suppliers', label: 'Tedarikçiler', icon: Building2, badge: null },
    { id: 'payment-plans', label: 'Ödeme Planı & Taksit', icon: CalendarDays, badge: 'Vade' },
    { id: 'cash-banks', label: 'Kasa & Bankalar', icon: Wallet, badge: null },
    { id: 'income-expenses', label: 'Gelir & Gider', icon: ArrowUpDown, badge: null },
    { id: 'quotes-orders', label: 'Teklif & Sipariş', icon: FileCheck2, badge: null },
    { id: 'products', label: 'Stok & Depolar', icon: Package, badge: null },
    { id: 'documents', label: 'Belge & Klasörler', icon: FolderTree, badge: 'Arşiv' },
    { id: 'reports', label: 'Finansal Raporlar', icon: BarChart3, badge: 'Excel/PDF' },
    { id: 'audit-trash', label: 'Denetim & Çöp Kutusu', icon: ShieldAlert, badge: null },
    { id: 'settings', label: 'Şirket Ayarları', icon: Settings, badge: null },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen select-none border-r border-slate-800 transition-all duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-base tracking-wide flex items-center gap-1.5">
              BeeCursor <span className="text-xs bg-brand-500/20 text-brand-400 font-semibold px-1.5 py-0.5 rounded border border-brand-500/30">ERP</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Muhasebe & Finans SaaS</div>
          </div>
        </div>
      </div>

      {/* Multi-Company Selector */}
      <div className="p-3 border-b border-slate-800 relative">
        <button
          onClick={() => setShowCompanyMenu(!showCompanyMenu)}
          className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition-all"
        >
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Aktif Şirket</div>
            <div className="text-xs font-semibold text-white truncate max-w-[170px]">
              {currentCompany ? currentCompany.name : 'Şirket Seçiniz'}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </button>

        {showCompanyMenu && (
          <div className="absolute left-3 right-3 top-16 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-700">Şirketleriniz</div>
            {companies.map((comp) => (
              <button
                key={comp.id}
                onClick={() => {
                  onCompanyChange(comp);
                  setShowCompanyMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 ${
                  currentCompany?.id === comp.id ? 'text-brand-400 font-semibold bg-brand-500/10' : 'text-slate-300'
                }`}
              >
                <span className="truncate">{comp.name}</span>
                {currentCompany?.id === comp.id && <span className="text-[10px] bg-brand-500 text-white px-1.5 rounded">Aktif</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-brand-400 border border-brand-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile & Actions */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-xs text-slate-400">
            <span className="text-slate-200 font-medium">{currentUser?.fullName || 'Kullanıcı'}</span>
            <div className="text-[10px] text-slate-500">{currentUser?.email}</div>
          </div>
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Açık Mod' : 'Karanlık Mod'}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Güvenli Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
};
