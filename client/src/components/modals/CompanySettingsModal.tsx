import React, { useState, useEffect } from 'react';
import {
  Building2,
  Cloud,
  Save,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Shield,
  FileText,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { Company } from '../../types';
import { api } from '../../services/api';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCompany: Company | null;
  onCompanyUpdated: (updated: Company) => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  currentCompany,
  onCompanyUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'FIREBASE'>('PROFILE');

  // Form State: Company Profile
  const [name, setName] = useState(currentCompany?.name || '');
  const [legalTitle, setLegalTitle] = useState(currentCompany?.legal_title || '');
  const [taxOffice, setTaxOffice] = useState(currentCompany?.tax_office || '');
  const [taxNumber, setTaxNumber] = useState(currentCompany?.tax_number || '');
  const [phone, setPhone] = useState(currentCompany?.phone || '');
  const [email, setEmail] = useState(currentCompany?.email || '');
  const [website, setWebsite] = useState(currentCompany?.website || '');
  const [city, setCity] = useState(currentCompany?.city || '');
  const [district, setDistrict] = useState(currentCompany?.district || '');
  const [address, setAddress] = useState(currentCompany?.address || '');
  const [iban, setIban] = useState(currentCompany?.iban || '');
  const [bankInfo, setBankInfo] = useState(currentCompany?.bank_info || '');
  const [invoicePrefix, setInvoicePrefix] = useState(currentCompany?.invoice_prefix || 'FAT');

  // Status & Feedback
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Firebase Status State
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Firebase Config Form
  const [fbProjectId, setFbProjectId] = useState('beecursor-erp-cloud');
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('beecursor-erp-cloud.firebaseapp.com');
  const [fbStorageBucket, setFbStorageBucket] = useState('beecursor-erp-cloud.appspot.com');
  const [fbClientEmail, setFbClientEmail] = useState('');
  const [fbPrivateKey, setFbPrivateKey] = useState('');

  useEffect(() => {
    if (currentCompany) {
      setName(currentCompany.name || '');
      setLegalTitle(currentCompany.legal_title || '');
      setTaxOffice(currentCompany.tax_office || '');
      setTaxNumber(currentCompany.tax_number || '');
      setPhone(currentCompany.phone || '');
      setEmail(currentCompany.email || '');
      setWebsite(currentCompany.website || '');
      setCity(currentCompany.city || '');
      setDistrict(currentCompany.district || '');
      setAddress(currentCompany.address || '');
      setIban(currentCompany.iban || '');
      setBankInfo(currentCompany.bank_info || '');
      setInvoicePrefix(currentCompany.invoice_prefix || 'FAT');
    }
  }, [currentCompany]);

  useEffect(() => {
    if (isOpen) {
      fetchFirebaseStatus();
    }
  }, [isOpen]);

  const fetchFirebaseStatus = async () => {
    setFirebaseLoading(true);
    try {
      const res = await api.getFirebaseStatus();
      setFirebaseStatus(res.data);
      if (res.data?.projectId) setFbProjectId(res.data.projectId);
      if (res.data?.authDomain) setFbAuthDomain(res.data.authDomain);
      if (res.data?.storageBucket) setFbStorageBucket(res.data.storageBucket);
    } catch (e) {
      console.error('Firebase durumu alınamadı:', e);
    } finally {
      setFirebaseLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.updateCurrentCompany({
        name,
        legal_title: legalTitle,
        tax_office: taxOffice,
        tax_number: taxNumber,
        phone,
        email,
        website,
        city,
        district,
        address,
        iban,
        bank_info: bankInfo,
        invoice_prefix: invoicePrefix,
      });

      if (res.success && res.data) {
        setSuccessMsg('Şirket bilgileri başarıyla güncellendi.');
        onCompanyUpdated(res.data);
      } else {
        setErrorMsg(res.error || 'Güncelleme yapılamadı.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Şirket güncellenirken hata oluştu.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveFirebaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirebaseLoading(true);
    setSuccessMsg(null);
    try {
      const res = await api.updateFirebaseConfig({
        projectId: fbProjectId,
        apiKey: fbApiKey,
        authDomain: fbAuthDomain,
        storageBucket: fbStorageBucket,
        clientEmail: fbClientEmail || undefined,
        privateKey: fbPrivateKey || undefined,
      });
      setFirebaseStatus(res.data);
      setSuccessMsg('Firebase bulut ayarları başarıyla kaydedildi.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Firebase ayarları kaydedilemedi.');
    } finally {
      setFirebaseLoading(false);
    }
  };

  const handleSyncToFirebase = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    setErrorMsg(null);
    try {
      const res = await api.syncFirebase();
      setSyncResult(res.data);
      fetchFirebaseStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bulut senkronizasyonu başarısız oldu.');
    } finally {
      setSyncLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Şirket Profili & Bulut Altyapı Yönetimi
              </h2>
              <p className="text-xs text-slate-500">
                Resmi şirket bilgileri, fatura önekleri ve Firebase bulut veri senkronizasyonu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'PROFILE'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Şirket Bilgileri & Fatura Ayarları</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FIREBASE')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'FIREBASE'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Firebase & Bulut Veri Altyapısı</span>
            {firebaseStatus?.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'PROFILE' ? (
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Şirket Kısa Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Resmi Ticari Ünvan
                  </label>
                  <input
                    type="text"
                    value={legalTitle}
                    onChange={(e) => setLegalTitle(e.target.value)}
                    placeholder="Örn: ABC Teknoloji Bilişim San. ve Tic. Ltd. Şti."
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    value={taxOffice}
                    onChange={(e) => setTaxOffice(e.target.value)}
                    placeholder="Maslak Vergi Dairesi"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vergi / TC Kimlik No
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fatura Seri Öneki
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                    placeholder="FAT veya EFT"
                    className="w-full text-xs font-mono uppercase font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefon Numarası
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0212 000 00 00"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kurumsal E-posta
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@sirketiniz.com"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Web Sitesi
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://sirketiniz.com"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    İl / Şehir
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="İstanbul"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    İlçe
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Sarıyer"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Açık Adres (Faturada Yazacak Adres)
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Büyükdere Cad. No: 123 Kat: 4 Maslak / Sarıyer / İstanbul"
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Varsayılan Şirket IBAN'ı
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Banka & Şube Bilgisi
                  </label>
                  <input
                    type="text"
                    value={bankInfo}
                    onChange={(e) => setBankInfo(e.target.value)}
                    placeholder="Garanti BBVA - Maslak Şubesi"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{saveLoading ? 'Kaydediliyor...' : 'Şirket Bilgilerini Kaydet'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* FIREBASE TAB */
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-900/50 text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Firebase Bulut Veritabanı Altyapısı</h3>
                      <p className="text-xs text-indigo-200">
                        Canlı ortam için Google Cloud Firestore yedekleme ve veri güvencesi
                      </p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    firebaseStatus?.connected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${firebaseStatus?.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {firebaseStatus?.connected ? 'Canlı Firestore Bağlı' : 'Yerel Bulut Köprüsü Aktif'}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-indigo-900/40 text-xs">
                  <div>
                    <span className="text-indigo-300 text-[11px] block">Bulut Proje ID:</span>
                    <span className="font-mono font-bold">{firebaseStatus?.projectId || 'beecursor-erp-cloud'}</span>
                  </div>
                  <div>
                    <span className="text-indigo-300 text-[11px] block">Kayıtlı Faturalar:</span>
                    <span className="font-mono font-bold">{firebaseStatus?.stats?.invoices || 0} Adet</span>
                  </div>
                  <div>
                    <span className="text-indigo-300 text-[11px] block">Cari & Müşteriler:</span>
                    <span className="font-mono font-bold">{(firebaseStatus?.stats?.customers || 0) + (firebaseStatus?.stats?.suppliers || 0)} Kart</span>
                  </div>
                  <div>
                    <span className="text-indigo-300 text-[11px] block">Son Bulut Yedek:</span>
                    <span className="font-mono font-bold text-[11px]">
                      {firebaseStatus?.lastSyncAt ? new Date(firebaseStatus.lastSyncAt).toLocaleTimeString() : 'Henüz yapılmadı'}
                    </span>
                  </div>
                </div>

                {/* Sync Action Button */}
                <div className="pt-2 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleSyncToFirebase}
                    disabled={syncLoading}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                    <span>{syncLoading ? 'Buluta Senkronize Ediliyor...' : 'Tüm Verileri Buluta Yedekle (Firebase Sync)'}</span>
                  </button>
                </div>
              </div>

              {/* Sync Result Details */}
              {syncResult && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Bulut Veri Senkronizasyonu Tamamlandı!</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
                    <div>Şirketler: {syncResult.syncedCounts?.companies}</div>
                    <div>Faturalar: {syncResult.syncedCounts?.invoices}</div>
                    <div>Müşteriler: {syncResult.syncedCounts?.customers}</div>
                    <div>Ürünler: {syncResult.syncedCounts?.products}</div>
                  </div>
                </div>
              )}

              {/* Firebase Credentials Form for Live Deployment */}
              <form onSubmit={handleSaveFirebaseConfig} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-500" />
                    Canlı Firebase Servis Hesabı & Proje Ayarları
                  </h4>
                  <span className="text-[10px] text-slate-400">Canlıya alırken girilecek anahtarlar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Firebase Project ID
                    </label>
                    <input
                      type="text"
                      value={fbProjectId}
                      onChange={(e) => setFbProjectId(e.target.value)}
                      placeholder="my-erp-prod"
                      className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Web API Key
                    </label>
                    <input
                      type="text"
                      value={fbApiKey}
                      onChange={(e) => setFbApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Client Email (Service Account)
                    </label>
                    <input
                      type="text"
                      value={fbClientEmail}
                      onChange={(e) => setFbClientEmail(e.target.value)}
                      placeholder="firebase-adminsdk@my-erp-prod.iam.gserviceaccount.com"
                      className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Auth Domain
                    </label>
                    <input
                      type="text"
                      value={fbAuthDomain}
                      onChange={(e) => setFbAuthDomain(e.target.value)}
                      placeholder="my-erp-prod.firebaseapp.com"
                      className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Private Key (Admin SDK Özel Anahtarı)
                  </label>
                  <textarea
                    rows={2}
                    value={fbPrivateKey}
                    onChange={(e) => setFbPrivateKey(e.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={firebaseLoading}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Firebase Yapılandırmasını Kaydet</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
