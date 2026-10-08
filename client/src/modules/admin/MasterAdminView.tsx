import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  FileText,
  RefreshCw,
  Search,
  ArrowLeft,
  Lock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Database,
  Calendar,
  Phone,
  Mail,
  Hash,
  Archive,
  History,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { api } from '../../services/api';

export interface MasterAdminViewProps {
  onLogoutMaster?: () => void;
}

interface TenantCompany {
  id: string;
  name: string;
  tax_number: string;
  tax_office?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: string;
  created_at: string;
  owner_name?: string;
  owner_email?: string;
  owner_tc?: string;
  owner_phone?: string;
  active_invoices_count: number;
  deleted_invoices_count: number;
  total_volume: number;
  active_customers_count: number;
  deleted_customers_count: number;
  products_count: number;
  snapshots_count: number;
}

interface OverviewData {
  company: any;
  owner: any;
  invoices: any[];
  customers: any[];
  snapshots: any[];
  auditLogs: any[];
}

export const MasterAdminView: React.FC<MasterAdminViewProps> = ({ onLogoutMaster }) => {
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'customers' | 'invoices' | 'snapshots' | 'logs'>('customers');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminCompanies();
      if (res.success && res.data) {
        setCompanies(res.data);
      }
    } catch (err: any) {
      console.error('Master admin şirketleri yüklenemedi:', err);
      setActionMessage({
        type: 'error',
        text: err.message || 'Müşteri şirketleri listesi alınırken hata oluştu.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyOverview = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setOverviewLoading(true);
    setActionMessage(null);
    try {
      const res = await api.getAdminCompanyOverview(companyId);
      if (res.success && res.data) {
        setOverviewData(res.data);
      }
    } catch (err: any) {
      console.error('Şirket verileri incelenemedi:', err);
      setActionMessage({
        type: 'error',
        text: err.message || 'Şirket detayları yüklenirken hata oluştu.',
      });
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Geri Yükleme Aksiyonları
  const handleRestoreCustomer = async (customerId: string, title: string) => {
    if (!window.confirm(`"${title}" müşterisini geri yüklemek ve müşterinin ekranında tekrar görünür kılmak istediğinize emin misiniz?`)) {
      return;
    }
    setActionLoadingId(`cust-${customerId}`);
    setActionMessage(null);
    try {
      const res = await api.restoreCustomerAdmin(customerId);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message || 'Müşteri başarıyla geri yüklendi!' });
        if (selectedCompanyId) {
          loadCompanyOverview(selectedCompanyId);
          fetchCompanies();
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Müşteri geri yüklenirken hata oluştu.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!window.confirm(`"${invoiceNumber}" numaralı faturayı geri yüklemek istediğinize emin misiniz?`)) {
      return;
    }
    setActionLoadingId(`inv-${invoiceId}`);
    setActionMessage(null);
    try {
      const res = await api.restoreInvoiceAdmin(invoiceId);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message || 'Fatura başarıyla geri yüklendi!' });
        if (selectedCompanyId) {
          loadCompanyOverview(selectedCompanyId);
          fetchCompanies();
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Fatura geri yüklenirken hata oluştu.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string, dateStr: string) => {
    if (!window.confirm(`DİKKAT: ${new Date(dateStr).toLocaleString('tr-TR')} tarihli sistem sıfırlama yedeğindeki TÜM veriler (faturalar, cariler, stok hareketleri) eksiksiz olarak geri yüklenecektir. Onaylıyor musunuz?`)) {
      return;
    }
    setActionLoadingId(`snap-${snapshotId}`);
    setActionMessage(null);
    try {
      const res = await api.restoreSnapshotAdmin(snapshotId);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: res.message || 'Tüm veriler başarıyla geri yüklendi!',
        });
        if (selectedCompanyId) {
          loadCompanyOverview(selectedCompanyId);
          fetchCompanies();
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Geri yükleme sırasında hata oluştu.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Top Metrikler
  const totalCompaniesCount = companies.length;
  const totalVolumeSum = companies.reduce((acc, c) => acc + (Number(c.total_volume) || 0), 0);
  const totalDeletedCustomers = companies.reduce((acc, c) => acc + (Number(c.deleted_customers_count) || 0), 0);
  const totalDeletedInvoices = companies.reduce((acc, c) => acc + (Number(c.deleted_invoices_count) || 0), 0);
  const totalSnapshots = companies.reduce((acc, c) => acc + (Number(c.snapshots_count) || 0), 0);

  const filteredCompanies = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.tax_number?.toLowerCase().includes(q) ||
      c.owner_name?.toLowerCase().includes(q) ||
      c.owner_email?.toLowerCase().includes(q) ||
      c.owner_tc?.includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Üst Master Başlık & Güvenlik Göstergesi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-xl shadow-indigo-950/20 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Master Admin & Müşteri Hesap Yönetimi</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Süper Yönetici Kanalı
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Müşterilerin hesap özelliklerini görüntüleyin, silinen verileri denetleyin ve müşteri talep ettiğinde <span className="text-emerald-400 font-semibold">tek tıkla geri yükleyin</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Veri Müdahale Korumalı (Salt-Okunur)</span>
          </div>
          <button
            onClick={() => {
              fetchCompanies();
              if (selectedCompanyId) loadCompanyOverview(selectedCompanyId);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>

          {onLogoutMaster && (
            <button
              onClick={onLogoutMaster}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold shadow-md transition-all"
              title="Master Admin Oturumunu Kapat ve Kilitle"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Oturumu Kilitle & Çıkış</span>
            </button>
          )}
        </div>
      </div>

      {/* Aksiyon Bildirimi */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Müşteri Şirketleri
          </div>
          <div className="text-2xl font-bold text-white mt-1">{totalCompaniesCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Kayıtlı sistem kiracıları</div>
        </div>

        <div className="bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Silinmiş Cariler
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{totalDeletedCustomers}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Sistemde kurtarılabilir</div>
        </div>

        <div className="bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" /> Silinmiş Faturalar
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{totalDeletedInvoices}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Yedekte korunan</div>
        </div>

        <div className="bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5 text-emerald-400" /> Sistem Yedekleri
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{totalSnapshots}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Fabrika sıfırlama arşivleri</div>
        </div>

        <div className="bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 p-4 rounded-xl col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" /> Toplam Ciro Hacmi
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {totalVolumeSum.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Aktif faturalar toplamı</div>
        </div>
      </div>

      {/* Detay Görüntüleyici veya Şirket Listesi */}
      {!selectedCompanyId ? (
        /* ================= AŞAMA 1: TÜM MÜŞTERİLERİN ŞİRKET LİSTESİ ================= */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Sistemdeki Müşteri Hesapları ({filteredCompanies.length})</h2>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Şirket, vergi no, sahip adı veya e-posta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Müşteri Şirketi</th>
                  <th className="py-3 px-4 font-semibold">Şirket Sahibi / Yetkili</th>
                  <th className="py-3 px-4 font-semibold text-center">Cariler (Aktif / Silinen)</th>
                  <th className="py-3 px-4 font-semibold text-center">Faturalar (Aktif / Silinen)</th>
                  <th className="py-3 px-4 font-semibold text-center">Sıfırlama Yedeği</th>
                  <th className="py-3 px-4 font-semibold text-right">Fatura Hacmi</th>
                  <th className="py-3 px-4 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white text-sm">{c.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Hash className="w-3 h-3 text-slate-500" />
                        <span>VN: {c.tax_number || 'Belirtilmedi'}</span>
                        {c.tax_office && <span>({c.tax_office})</span>}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{c.owner_name || 'Yetkili Belirtilmedi'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{c.owner_email || '-'}</span>
                      </div>
                      {c.owner_tc && (
                        <div className="text-[10px] text-indigo-400/80 font-mono mt-0.5">
                          TC: {c.owner_tc.replace(/(\d{3})\d{5}(\d{3})/, '$1*****$2')}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                          {c.active_customers_count} aktif
                        </span>
                        {c.deleted_customers_count > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" title="Müşteri sildi ama sistemde kurtarılmayı bekliyor">
                            {c.deleted_customers_count} silindi
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold">
                          {c.active_invoices_count} aktif
                        </span>
                        {c.deleted_invoices_count > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" title="Silinen fatura">
                            {c.deleted_invoices_count} silindi
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {c.snapshots_count > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                          {c.snapshots_count} Kurtarma Noktası
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-semibold text-white">
                        {(Number(c.total_volume) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {c.currency || '₺'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => loadCompanyOverview(c.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all inline-flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verileri İncele & Kurtar</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Kayıtlı şirket veya arama kriterine uygun müşteri bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= AŞAMA 2: SEÇİLİ ŞİRKET DETAYI & SALT-OKUNUR VERİLER & GERİ YÜKLEME ================= */
        <div className="space-y-6">
          {/* Geri Dön Butonu & Başlık */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedCompanyId(null);
                setOverviewData(null);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tüm Şirketlere Geri Dön</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Salt-Okunur İnceleme Modu: Müşteri verilerine doğrudan müdahale engellenmiştir. Yalnızca silinen kayıtlar geri yüklenebilir.</span>
            </div>
          </div>

          {overviewLoading || !overviewData ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-400 mb-3" />
              <span>Müşterinin şirket kayıtları ve arşivleri yükleniyor...</span>
            </div>
          ) : (
            <>
              {/* Şirket Profil Özeti (Read-Only) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">{overviewData.company.name}</h2>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Şirket ID: {overviewData.company.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-4">
                      <span>Vergi No: <strong className="text-slate-200">{overviewData.company.tax_number || 'Belirtilmedi'}</strong></span>
                      <span>Vergi Dairesi: <strong className="text-slate-200">{overviewData.company.tax_office || '-'}</strong></span>
                      <span>Para Birimi: <strong className="text-slate-200">{overviewData.company.currency || 'TRY'}</strong></span>
                      <span>Kayıt Tarihi: <strong className="text-slate-200">{new Date(overviewData.company.created_at).toLocaleDateString('tr-TR')}</strong></span>
                    </div>
                  </div>

                  {overviewData.owner && (
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Hesap Sahibi / Yetkili</div>
                      <div className="font-semibold text-white">{overviewData.owner.full_name}</div>
                      <div className="text-slate-400 flex items-center gap-2 mt-0.5">
                        <Mail className="w-3 h-3" /> {overviewData.owner.email}
                      </div>
                      {overviewData.owner.phone && (
                        <div className="text-slate-400 flex items-center gap-2 mt-0.5">
                          <Phone className="w-3 h-3" /> {overviewData.owner.phone}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Alt Tab Seçici */}
                <div className="flex border-b border-slate-800 mt-4 -mb-2 gap-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveDetailTab('customers')}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                      activeDetailTab === 'customers'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Müşteri Carileri ({overviewData.customers.length})</span>
                    {overviewData.customers.some((c: any) => c.is_deleted === 1) && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                        {overviewData.customers.filter((c: any) => c.is_deleted === 1).length} Silinmiş
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('invoices')}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                      activeDetailTab === 'invoices'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Faturalar ({overviewData.invoices.length})</span>
                    {overviewData.invoices.some((i: any) => i.is_deleted === 1) && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                        {overviewData.invoices.filter((i: any) => i.is_deleted === 1).length} Silinmiş
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('snapshots')}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                      activeDetailTab === 'snapshots'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                    <span>Sistem Sıfırlama Yedekleri ({overviewData.snapshots.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('logs')}
                    className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                      activeDetailTab === 'logs'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Güvenlik & Denetim Günlüğü ({overviewData.auditLogs.length})</span>
                  </button>
                </div>
              </div>

              {/* SEÇİLEN ALT SEKMENİN İÇERİĞİ */}

              {/* 1. MÜŞTERİ CARİLERİ (READ-ONLY + RESTORE) */}
              {activeDetailTab === 'customers' && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Cariler ve Müşteri Kartları</h3>
                      <p className="text-[11px] text-slate-400">
                        Müşteri arayüzünde silinen kayıtlar burada sarı renkle işaretlenir. Tek tıkla geri yükleyebilirsiniz.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                          <th className="py-3 px-4 font-semibold">Cari Kodu / Ünvan</th>
                          <th className="py-3 px-4 font-semibold">İletişim / Vergi No</th>
                          <th className="py-3 px-4 font-semibold text-right">Bakiye</th>
                          <th className="py-3 px-4 font-semibold text-center">Durum</th>
                          <th className="py-3 px-4 font-semibold text-right">Kurtarma İşlemi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {overviewData.customers.map((c: any) => {
                          const isDeleted = c.is_deleted === 1;
                          const isRestoring = actionLoadingId === `cust-${c.id}`;

                          return (
                            <tr key={c.id} className={isDeleted ? 'bg-amber-950/20' : 'hover:bg-slate-800/30'}>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-white">{c.title}</div>
                                <div className="text-[11px] text-slate-400">Kod: {c.code || '-'}</div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="text-slate-300">{c.contact_person || c.phone || '-'}</div>
                                <div className="text-[11px] text-slate-400">{c.email || c.tax_number || '-'}</div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <span className={`font-semibold ${Number(c.balance) > 0 ? 'text-emerald-400' : Number(c.balance) < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                                  {Number(c.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </span>
                              </td>

                              <td className="py-3 px-4 text-center">
                                {isDeleted ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                    Müşteri Sildi (Pasif)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                                    Aktif
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                {isDeleted ? (
                                  <button
                                    onClick={() => handleRestoreCustomer(c.id, c.title)}
                                    disabled={isRestoring}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md inline-flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                                    <span>Geri Yükle</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                                    <Lock className="w-3 h-3" /> Müdahale Edilemez
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {overviewData.customers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">
                              Kayıtlı cari bulunmuyor.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. FATURALAR (READ-ONLY + RESTORE) */}
              {activeDetailTab === 'invoices' && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Faturalar (Satış & Alış)</h3>
                      <p className="text-[11px] text-slate-400">
                        Müşterinin kestiği faturalar salt-okunurdur. Silinen faturalar sistemden kaybolmaz ve geri yüklenebilir.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                          <th className="py-3 px-4 font-semibold">Fatura No / Tip</th>
                          <th className="py-3 px-4 font-semibold">Cari</th>
                          <th className="py-3 px-4 font-semibold">Tarih / Vade</th>
                          <th className="py-3 px-4 font-semibold text-right">Genel Toplam</th>
                          <th className="py-3 px-4 font-semibold text-center">Durum</th>
                          <th className="py-3 px-4 font-semibold text-right">Kurtarma İşlemi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {overviewData.invoices.map((inv: any) => {
                          const isDeleted = inv.is_deleted === 1;
                          const isRestoring = actionLoadingId === `inv-${inv.id}`;

                          return (
                            <tr key={inv.id} className={isDeleted ? 'bg-amber-950/20' : 'hover:bg-slate-800/30'}>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-white">{inv.invoice_number}</div>
                                <div className="text-[11px] text-slate-400">
                                  {inv.type === 'SALES' ? 'Satış Faturası' : 'Alış Faturası'}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="text-slate-200">{inv.customer_title || 'Belirtilmedi'}</div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="text-slate-300">{inv.issue_date}</div>
                                <div className="text-[11px] text-slate-400">Vade: {inv.due_date || '-'}</div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <span className="font-semibold text-white">
                                  {Number(inv.grand_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {inv.currency || '₺'}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-center">
                                {isDeleted ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                    Silinmiş Fatura
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                                    {inv.status || 'Aktif'}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                {isDeleted ? (
                                  <button
                                    onClick={() => handleRestoreInvoice(inv.id, inv.invoice_number)}
                                    disabled={isRestoring}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md inline-flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                                    <span>Geri Yükle</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                                    <Lock className="w-3 h-3" /> Müdahale Edilemez
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {overviewData.invoices.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400">
                              Kayıtlı fatura bulunmuyor.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. SİSTEM SIFIRLAMA YEDEKLERİ (SNAPSHOTS - DISASTER RECOVERY) */}
              {activeDetailTab === 'snapshots' && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <Archive className="w-5 h-5 text-emerald-400" />
                        <span>Otomatik Sıfırlama Yedekleri (Disaster Recovery Snapshots)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                        Müşteri hesap ayarlarından "Fabrika Sıfırlaması" yaparak verilerini sıfırlasa bile, sistemimiz sıfırlama anında tüm verilerin 
                        tam JSON anlık görüntüsünü veritabanımıza kaydeder. Müşteri daha sonra aradığında tek tıkla tüm eski verilerini geri yükleyebilirsiniz.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    {overviewData.snapshots.map((snap: any) => {
                      const isRestoring = actionLoadingId === `snap-${snap.id}`;

                      return (
                        <div
                          key={snap.id}
                          className="p-5 rounded-xl bg-slate-800/70 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">
                                {new Date(snap.created_at).toLocaleString('tr-TR')} Tarihli Sistem Yedeği
                              </span>
                              {snap.is_restored === 1 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Daha Önce Geri Yüklendi
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Yedek Dosyası Hazır
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-300">
                              Sebep / İşlem: <strong className="text-white">{snap.reason || 'Fabrika Sıfırlaması Öncesi Güvenlik Yedeği'}</strong>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2 text-[11px]">
                              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
                                📑 {snap.counts?.invoices || 0} Fatura
                              </span>
                              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
                                👥 {snap.counts?.customers || 0} Cari
                              </span>
                              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
                                📦 {snap.counts?.products || 0} Ürün/Stok
                              </span>
                              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
                                💳 {snap.counts?.transactions || 0} Hesap Hareketi
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleRestoreSnapshot(snap.id, snap.created_at)}
                              disabled={isRestoring}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                              <RotateCcw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                              <span>Tüm Verileri Sisteme Geri Yükle</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {overviewData.snapshots.length === 0 && (
                      <div className="py-8 text-center text-slate-400 bg-slate-800/30 rounded-xl border border-slate-800">
                        Bu şirket için henüz bir sıfırlama yedeği bulunmuyor.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. GÜVENLİK VE DENETİM GÜNLÜĞÜ */}
              {activeDetailTab === 'logs' && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-white">Denetim Günlüğü & İşlem İzleri</h3>
                    <p className="text-[11px] text-slate-400">
                      Silme, şifre değişikliği, sıfırlama ve kurtarma işlemlerinin zaman damgalı kayıtları.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                          <th className="py-3 px-4 font-semibold">Tarih / Saat</th>
                          <th className="py-3 px-4 font-semibold">İşlem Türü</th>
                          <th className="py-3 px-4 font-semibold">Varlık</th>
                          <th className="py-3 px-4 font-semibold">Detaylar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {overviewData.auditLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4 text-slate-300 font-mono">
                              {new Date(log.timestamp || log.created_at).toLocaleString('tr-TR')}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                log.action.includes('RESTORE')
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : log.action.includes('DELETE') || log.action.includes('RESET')
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-indigo-500/20 text-indigo-400'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-200 font-medium">
                              {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 6)})` : ''}
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {log.details ? log.details : '-'}
                            </td>
                          </tr>
                        ))}

                        {overviewData.auditLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              Henüz denetim günlüğü kaydı yok.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
