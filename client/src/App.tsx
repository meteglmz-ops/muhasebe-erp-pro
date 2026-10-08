import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './modules/dashboard/DashboardView';
import { InvoicesView } from './modules/invoices/InvoicesView';
import { CustomersView } from './modules/customers/CustomersView';
import { SuppliersView } from './modules/suppliers/SuppliersView';
import { PaymentPlansView } from './modules/payment-plans/PaymentPlansView';
import { CashBanksView } from './modules/cash-banks/CashBanksView';
import { IncomeExpensesView } from './modules/income-expenses/IncomeExpensesView';
import { QuotesOrdersView } from './modules/quotes-orders/QuotesOrdersView';
import { ProductsStocksView } from './modules/products-stocks/ProductsStocksView';
import { DocumentsView } from './modules/documents/DocumentsView';
import { ReportsView } from './modules/reports/ReportsView';
import { AuditTrashView } from './modules/audit-trash/AuditTrashView';
import { SettingsView } from './modules/settings/SettingsView';
import { MasterAdminView } from './modules/admin/MasterAdminView';
import { MasterAdminLoginView } from './modules/admin/MasterAdminLoginView';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { TransferModal } from './components/modals/TransferModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { Company, User, Customer, Supplier, Product, Invoice, CashBank } from './types';
import { api } from './services/api';
import { LoginView } from './modules/auth/LoginView';

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('erp_dark') === 'true';
  });

  // Dedicated Secret Master Gate State
  const [isMasterGate, setIsMasterGate] = useState<boolean>(() => {
    return window.location.hash === '#/master-admin' || window.location.search.includes('master_gate=true');
  });
  const [isMasterAdminAuthenticated, setIsMasterAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('erp_master_root_auth') === 'true' && !!localStorage.getItem('erp_token');
  });

  useEffect(() => {
    const handleHash = () => {
      const match = window.location.hash === '#/master-admin' || window.location.search.includes('master_gate=true');
      setIsMasterGate(match);
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Core Data Cache
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cashBanks, setCashBanks] = useState<CashBank[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalType, setInvoiceModalType] = useState<'SALES' | 'PURCHASE'>('SALES');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [invoicesRefreshTrigger, setInvoicesRefreshTrigger] = useState(0);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('erp_dark', String(darkMode));
  }, [darkMode]);

  // Keyboard Shortcuts: Ctrl+K, Ctrl+N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setInvoiceModalType('SALES');
        setIsInvoiceModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize Session & Login
  // Initialize Session & Login
  const initApp = async () => {
    setLoadingInitial(true);
    try {
      const token = localStorage.getItem('erp_token');
      if (!token) {
        setLoadingInitial(false);
        return;
      }

      const meRes = await api.getMe();
      if (meRes.success && meRes.data?.user) {
        setCurrentUser(meRes.data.user);
        setCurrentCompany(meRes.data.currentCompany);
        setCompanies(meRes.data.companies || []);
        await refreshAllData();
      } else {
        localStorage.removeItem('erp_token');
        setCurrentUser(null);
      }
    } catch (err) {
      console.warn('Oturum doğrulanamadı, giriş ekranına yönlendiriliyor:', err);
      localStorage.removeItem('erp_token');
      setCurrentUser(null);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleLoginSuccess = async (authData: { user: any; currentCompany: any; companies: any[]; token: string }) => {
    setCurrentUser(authData.user);
    setCurrentCompany(authData.currentCompany);
    setCompanies(authData.companies || []);
    await refreshAllData();
  };

  const refreshAllData = async () => {
    try {
      const [custRes, supRes, prodRes, invRes, cbRes, curCompRes, compsRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getSuppliers({ limit: 100 }),
        api.getProducts({ limit: 100 }),
        api.getInvoices({ limit: 100 }),
        api.getCashBanks(),
        api.getCurrentCompany().catch(() => null),
        api.getCompanies().catch(() => null),
      ]);

      setCustomers(custRes.data || []);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);
      setInvoices(invRes.data || []);
      setCashBanks(cbRes.data || []);
      if (curCompRes?.data) {
        setCurrentCompany(curCompRes.data);
      }
      if (compsRes?.data) {
        setCompanies(compsRes.data);
      }
    } catch (err) {
      console.error('Veriler tazelenemedi:', err);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleCompanyChange = (comp: Company) => {
    setCurrentCompany(comp);
    localStorage.setItem('erp_company_id', comp.id);
    refreshAllData();
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_company_id');
    setCurrentUser(null);
    setCurrentCompany(null);
    setCompanies([]);
  };

  const openInvoiceModal = (type: 'SALES' | 'PURCHASE') => {
    setInvoiceModalType(type);
    setIsInvoiceModalOpen(true);
  };

  // 0. İZOLE SİSTEM SAHİBİ GİRİŞ KAPISI (MÜŞTERİLERDEN TAMAMEN BAĞIMSIZ)
  if (isMasterGate) {
    if (!isMasterAdminAuthenticated) {
      return (
        <MasterAdminLoginView
          onSuccess={() => {
            sessionStorage.setItem('erp_master_root_auth', 'true');
            setIsMasterAdminAuthenticated(true);
          }}
          onBackToClientLogin={() => {
            window.location.hash = '';
            setIsMasterGate(false);
          }}
        />
      );
    }
    return (
      <div className="min-h-screen bg-slate-950 font-sans">
        <MasterAdminView
          onLogoutMaster={() => {
            sessionStorage.removeItem('erp_master_root_auth');
            setIsMasterAdminAuthenticated(false);
            api.clearToken();
            window.location.hash = '';
            setIsMasterGate(false);
          }}
        />
      </div>
    );
  }

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold">BeeCursor ERP & Muhasebe Başlatılıyor...</h2>
          <p className="text-xs text-slate-400">Veritabanı bağlantısı ve şirket modülleri yükleniyor</p>
        </div>
      </div>
    );
  }

  // Not Logged In -> Show Dedicated Modern Login Screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const liquidTotal = cashBanks.reduce((acc, cur) => acc + (cur.current_balance || 0), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentCompany={currentCompany}
        companies={companies}
        onCompanyChange={handleCompanyChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          currentCompany={currentCompany}
          onOpenInvoiceModal={openInvoiceModal}
          onOpenTransferModal={() => setIsTransferModalOpen(true)}
          onGlobalSearchClick={() => setIsSearchModalOpen(true)}
          liquidTotal={liquidTotal}
        />

        {/* Dynamic Module Body */}
        <main key={currentCompany?.id} className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950">
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenInvoiceModal={openInvoiceModal}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesView
              onOpenInvoiceModal={openInvoiceModal}
              cashBanks={cashBanks}
              refreshTrigger={invoicesRefreshTrigger}
            />
          )}

          {currentTab === 'customers' && <CustomersView />}

          {currentTab === 'suppliers' && <SuppliersView />}

          {currentTab === 'payment-plans' && (
            <PaymentPlansView cashBanks={cashBanks} />
          )}

          {currentTab === 'cash-banks' && (
            <CashBanksView
              cashBanks={cashBanks}
              onRefresh={refreshAllData}
              onOpenTransferModal={() => setIsTransferModalOpen(true)}
            />
          )}

          {currentTab === 'income-expenses' && (
            <IncomeExpensesView
              cashBanks={cashBanks}
              onRefreshStats={refreshAllData}
            />
          )}

          {currentTab === 'quotes-orders' && (
            <QuotesOrdersView
              customers={customers}
              products={products}
              onNavigateToInvoices={() => {
                setInvoicesRefreshTrigger((prev) => prev + 1);
                setCurrentTab('invoices');
                refreshAllData();
              }}
            />
          )}

          {currentTab === 'products' && (
            <ProductsStocksView onRefreshProducts={refreshAllData} />
          )}

          {currentTab === 'documents' && (
            <DocumentsView invoices={invoices} customers={customers} />
          )}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'audit-trash' && <AuditTrashView />}

          {currentTab === 'settings' && (
            <SettingsView
              currentCompany={currentCompany}
              companies={companies}
              onCompanyUpdated={refreshAllData}
              onCompanyCreated={(newComp) => {
                setCompanies([...companies, newComp]);
                handleCompanyChange(newComp);
              }}
            />
          )}
        </main>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={() => {
          setInvoicesRefreshTrigger((prev) => prev + 1);
          refreshAllData();
          setCurrentTab('invoices');
        }}
        defaultType={invoiceModalType}
        customers={customers}
        suppliers={suppliers}
        products={products}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={refreshAllData}
        cashBanks={cashBanks}
      />

      {/* Global Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectTab={setCurrentTab}
        customers={customers}
        suppliers={suppliers}
        products={products}
        invoices={invoices}
      />
    </div>
  );
};

export default App;
