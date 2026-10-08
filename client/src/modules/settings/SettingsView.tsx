import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Plus,
  CheckCircle,
  FileText,
  CreditCard,
  X,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  Mail,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  RotateCcw,
  User,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { Company } from '../../types';
import { api } from '../../services/api';

interface SettingsViewProps {
  currentCompany: Company | null;
  companies: Company[];
  onCompanyUpdated: () => void;
  onCompanyCreated: (newComp: Company) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentCompany,
  companies: _companies,
  onCompanyUpdated,
  onCompanyCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY_PASSWORD' | 'FACTORY_RESET'>('PROFILE');

  // Logged in user info
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Profile Form State
  const [name, setName] = useState(currentCompany?.name || '');
  const [legalTitle, setLegalTitle] = useState(currentCompany?.legal_title || '');
  const [taxOffice, setTaxOffice] = useState(currentCompany?.tax_office || '');
  const [taxNumber, setTaxNumber] = useState(currentCompany?.tax_number || '');
  const [phone, setPhone] = useState(currentCompany?.phone || '');
  const [email, setEmail] = useState(currentCompany?.email || '');
  const [website, setWebsite] = useState(currentCompany?.website || '');
  const [address, setAddress] = useState(currentCompany?.address || '');
  const [city, setCity] = useState(currentCompany?.city || '');
  const [district, setDistrict] = useState(currentCompany?.district || '');
  const [iban, setIban] = useState(currentCompany?.iban || '');
  const [bankInfo, setBankInfo] = useState(currentCompany?.bank_info || '');
  const [invoicePrefix, setInvoicePrefix] = useState(currentCompany?.invoice_prefix || 'FAT');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // New Company Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompTaxOffice, setNewCompTaxOffice] = useState('');
  const [newCompTaxNumber, setNewCompTaxNumber] = useState('');

  // ==========================================
  // MULTI-FACTOR PASSWORD CHANGE STATE
  // ==========================================
  const [pwdCurrentPassword, setPwdCurrentPassword] = useState('');
  const [pwdTcIdentity, setPwdTcIdentity] = useState('');
  const [pwdNewPassword, setPwdNewPassword] = useState('');
  const [pwdNewPasswordConfirm, setPwdNewPasswordConfirm] = useState('');
  const [pwdOtp, setPwdOtp] = useState('');
  const [pwdStep, setPwdStep] = useState<1 | 2>(1);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdMaskedEmail, setPwdMaskedEmail] = useState('');
  const [pwdCooldown, setPwdCooldown] = useState(0);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ==========================================
  // MULTI-FACTOR FACTORY RESET STATE
  // ==========================================
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetAdminPassword, setResetAdminPassword] = useState('');
  const [resetTcIdentity, setResetTcIdentity] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [resetRecheckPassword, setResetRecheckPassword] = useState('');
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(60);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessSummary, setResetSuccessSummary] = useState<any>(null);

  useEffect(() => {
    if (currentCompany) {
      setName(currentCompany.name || '');
      setLegalTitle(currentCompany.legal_title || '');
      setTaxOffice(currentCompany.tax_office || '');
      setTaxNumber(currentCompany.tax_number || '');
      setPhone(currentCompany.phone || '');
      setEmail(currentCompany.email || '');
      setWebsite(currentCompany.website || '');
      setAddress(currentCompany.address || '');
      setCity(currentCompany.city || '');
      setDistrict(currentCompany.district || '');
      setIban(currentCompany.iban || '');
      setBankInfo(currentCompany.bank_info || '');
      setInvoicePrefix(currentCompany.invoice_prefix || 'FAT');
    }
  }, [currentCompany]);

  useEffect(() => {
    api.getMe().then((res: any) => {
      if (res?.data?.user) {
        setCurrentUser(res.data.user);
        // Güvenlik Kuralı: T.C. Kimlik Numarası ASLA otomatik doldurulmaz!
        // Kullanıcı her işlemde 11 haneli T.C. numarasını elle girmek zorundadır.
      }
    }).catch(() => {});
  }, []);

  // Cooldown timer for password OTP
  useEffect(() => {
    if (pwdCooldown <= 0) return;
    const timer = setInterval(() => {
      setPwdCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pwdCooldown]);

  // 60-Second Cooldown timer for Factory Reset / Account Deletion
  useEffect(() => {
    if (!resetModalOpen || resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetModalOpen, resetCooldown]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      await api.updateCurrentCompany({
        name,
        legal_title: legalTitle,
        tax_office: taxOffice,
        tax_number: taxNumber,
        phone,
        email,
        website,
        address,
        city,
        district,
        iban,
        bank_info: bankInfo,
        invoice_prefix: invoicePrefix,
      });

      setSuccessMsg('Şirket ve fatura ayarları başarıyla güncellendi!');
      onCompanyUpdated();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Ayarlar kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;

    try {
      const res = await api.createCompany({
        name: newCompName.trim(),
        taxOffice: newCompTaxOffice,
        taxNumber: newCompTaxNumber,
      });

      setIsAddModalOpen(false);
      setNewCompName('');
      onCompanyCreated(res.data);
      alert('Yeni şirket başarıyla kuruldu!');
    } catch (err: any) {
      alert(err.message || 'Şirket oluşturulamadı.');
    }
  };

  // ==========================================
  // PASSWORD CHANGE HANDLERS (2FA MULTI-FACTOR)
  // ==========================================
  const handleRequestPasswordChangeOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    const cleanTc = pwdTcIdentity.trim().replace(/\D/g, '');
    if (!pwdCurrentPassword) {
      setPwdError('Mevcut şifrenizi girmeniz zorunludur.');
      return;
    }
    if (cleanTc.length !== 11) {
      setPwdError('Lütfen 11 haneli T.C. Kimlik Numaranızı eksiksiz giriniz.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.requestChangePasswordOtp({
        currentPassword: pwdCurrentPassword,
        tcIdentity: cleanTc,
      });
      setPwdMaskedEmail(res.maskedEmail || 'kayıtlı e-posta adresinize');
      setPwdStep(2);
      setPwdCooldown(60);
      setPwdSuccess(`Kimliğiniz doğrulandı! 6 haneli güvenlik onay kodu ${res.maskedEmail || 'e-postanıza'} gönderildi.`);
    } catch (err: any) {
      setPwdError(err.message || 'Güvenlik doğrulaması başarısız oldu.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    const cleanCode = pwdOtp.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setPwdError('Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.');
      return;
    }
    if (pwdNewPassword.length < 6) {
      setPwdError('Yeni şifreniz en az 6 karakterden oluşmalıdır.');
      return;
    }
    if (pwdNewPassword !== pwdNewPasswordConfirm) {
      setPwdError('Yeni şifreler birbiriyle eşleşmiyor. Lütfen kontrol ediniz.');
      return;
    }

    setPwdLoading(true);
    try {
      await api.confirmChangePassword({
        code: cleanCode,
        newPassword: pwdNewPassword,
        tcIdentity: pwdTcIdentity.trim().replace(/\D/g, ''),
      });
      setPwdSuccess('Harika! Şifreniz çok katmanlı kimlik ve OTP doğrulamasıyla başarıyla güncellendi.');
      setPwdCurrentPassword('');
      setPwdNewPassword('');
      setPwdNewPasswordConfirm('');
      setPwdOtp('');
      setPwdStep(1);
    } catch (err: any) {
      setPwdError(err.message || 'Şifre güncellenemedi.');
    } finally {
      setPwdLoading(false);
    }
  };

  // ==========================================
  // FACTORY RESET HANDLERS (MULTI-FACTOR)
  // ==========================================
  const handleStartResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessSummary(null);

    const cleanTc = resetTcIdentity.trim().replace(/\D/g, '');
    if (!resetAdminPassword) {
      setResetError('Güvenlik nedeniyle yönetici şifrenizi girmelisiniz.');
      return;
    }
    if (cleanTc.length !== 11) {
      setResetError('11 haneli T.C. Kimlik Numaranızı girmeniz zorunludur.');
      return;
    }

    setResetLoading(true);
    try {
      await api.requestSystemResetOtp({
        currentPassword: resetAdminPassword,
        tcIdentity: cleanTc,
      });
      setResetCooldown(60); // 60 saniyelik zorunlu güvenlik sayacı başlatılır
      setResetAcknowledged(false);
      setResetConfirmWord('');
      setResetRecheckPassword('');
      setResetOtp('');
      setResetModalOpen(true);
    } catch (err: any) {
      setResetError(err.message || 'Sıfırlama kodu talep edilemedi.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (resetCooldown > 0) {
      setResetError(`Lütfen 60 saniyelik güvenlik düşünme süresinin dolmasını bekleyiniz (${resetCooldown} sn kaldı).`);
      return;
    }
    if (!resetAcknowledged) {
      setResetError('Devam etmek için yasal ve mali uyarı bilgilendirmesini onaylamalısınız.');
      return;
    }
    const norm = resetConfirmWord.trim().toUpperCase().replace(/İ/g, 'I');
    if (norm !== 'OKUDUM ANLADIM' && norm !== 'VERILERI-KALICI-SIL') {
      setResetError('Güvenlik teyidi için onay kutusuna tam olarak "OKUDUM ANLADIM" yazmalısınız.');
      return;
    }
    if (!resetRecheckPassword) {
      setResetError('Lütfen son yetkilendirme için hesap şifrenizi tekrar giriniz.');
      return;
    }
    const cleanCode = resetOtp.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setResetError('Lütfen 6 haneli güvenlik onay kodunu giriniz.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.confirmSystemReset({
        otp: cleanCode,
        currentPassword: resetRecheckPassword,
        tcIdentity: resetTcIdentity.trim().replace(/\D/g, ''),
        confirmWord: 'OKUDUM ANLADIM',
      });
      setResetSuccessSummary(res.data);
      setResetModalOpen(false);
      setResetOtp('');
      setResetConfirmWord('');
      setResetAdminPassword('');
      setResetRecheckPassword('');
      setResetTcIdentity('');
      onCompanyUpdated();
    } catch (err: any) {
      setResetError(err.message || 'Sistem sıfırlanırken hata oluştu.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Şirket & Güvenlik Yönetimi</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-mono font-bold border border-emerald-500/20">
              256-Bit SSL Korumalı
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Resmi şirket unvanı, fatura önekleri ve çok katmanlı 2FA hesap güvenliği
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Şirket Ekle</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Only Business & Security Tabs - Cloud/SMTP Configs are Hidden) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('PROFILE')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'PROFILE'
              ? 'bg-brand-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Şirket Bilgileri</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SECURITY_PASSWORD')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'SECURITY_PASSWORD'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Güvenlik & Şifre Değiştirme</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-200 font-mono">
            2FA
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FACTORY_RESET')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'FACTORY_RESET'
              ? 'bg-rose-600 text-white shadow'
              : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          }`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Hassas Veri Sıfırlama</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ==========================================
          TAB 1: PROFILE & INVOICE SETTINGS
         ========================================== */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fadeIn">
          {/* Registered User Identity Banner */}
          {currentUser && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-sm border border-brand-500/20 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {currentUser.full_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-brand-500/10 text-brand-500 font-semibold">
                      {currentUser.role === 'COMPANY_OWNER' ? 'Şirket Sahibi / Yetkili' : currentUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 mt-0.5">
                    <span>E-Posta: <strong className="text-slate-700 dark:text-slate-300 font-mono">{currentUser.email}</strong></span>
                    {currentUser.tc_identity && (
                      <span>T.C. Kimlik No: <strong className="text-slate-700 dark:text-slate-300 font-mono">
                        {currentUser.tc_identity.slice(0, 3)}•••••{currentUser.tc_identity.slice(-2)}
                      </strong></span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  Doğrulanmış Hesap
                </span>
              </div>
            </div>
          )}

          {/* Company Details */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-500" />
              Şirket Temel Bilgileri
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Fatura ve resmi belgelerde görünecek şirket kimlik bilgileri
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Şirket Kısa Adı *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resmi Ticari Unvan *
                </label>
                <input
                  type="text"
                  required
                  value={legalTitle}
                  onChange={(e) => setLegalTitle(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vergi Numarası / T.C. Kimlik No
                </label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              İletişim & Adres Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telefon
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kurumsal E-Posta
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
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
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Açık Adres
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  İl
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
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
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Financial & Invoice Defaults */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              Fatura & Banka Ayarları
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fatura Seri / Ön Ek
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono uppercase font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banka IBAN (Faturaya Otomatik Basılır)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    className="w-full text-xs font-mono uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 pl-9 pr-3 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banka Hesap Bilgisi / Şube Notu
                </label>
                <input
                  type="text"
                  value={bankInfo}
                  onChange={(e) => setBankInfo(e.target.value)}
                  placeholder="Garanti BBVA - Levent Ticari Şube (TL Hesabı)"
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================
          TAB 2: ULTRA SECURE PASSWORD CHANGE (2FA / T.C. / OTP)
         ======================================================== */}
      {activeTab === 'SECURITY_PASSWORD' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Security Overview Header */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white space-y-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Çok Katmanlı Güvenlik & Şifre Değiştirme</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase tracking-wider">
                    Bank-Grade 2FA
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Mali verilerinizin güvenliği ve yetkisiz erişimlerin engellenmesi için, şifre değişiklikleri <strong>Mevcut Şifre</strong>, <strong>11 Haneli T.C. Kimlik No</strong> ve <strong>Kayıtlı E-Posta OTP Kodu</strong> doğrulama katmanlarıyla korunmaktadır.
                </p>
              </div>
            </div>

            {/* Security Steps Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
              <div className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                pwdStep === 1 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  pwdStep === 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  1
                </div>
                <div>
                  <div className="font-bold text-white">Kimlik & Mevcut Şifre</div>
                  <div className="text-[10px] text-slate-400">Mevcut parola ve T.C. doğrulaması</div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                pwdStep === 2 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  pwdStep === 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  2
                </div>
                <div>
                  <div className="font-bold text-white">E-Posta OTP & Yeni Şifre</div>
                  <div className="text-[10px] text-slate-400">Tek kullanımlık onay ve parola güncelleme</div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {pwdError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-xs text-rose-800 dark:text-rose-300 font-semibold animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          {/* STEP 1: VERIFY CURRENT PASSWORD & TC IDENTITY */}
          {pwdStep === 1 && (
            <form onSubmit={handleRequestPasswordChangeOtp} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  1. Aşama: Mevcut Kimlik ve Parola Teyidi
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lütfen sistemde kayıtlı mevcut şifrenizi ve T.C. Kimlik Numaranızı giriniz.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mevcut Hesap Şifresi *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={pwdCurrentPassword}
                      onChange={(e) => setPwdCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 pl-3 pr-10 outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    11 Haneli T.C. Kimlik Numarası *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={pwdTcIdentity}
                      onChange={(e) => setPwdTcIdentity(e.target.value.replace(/\D/g, ''))}
                      placeholder="11 Haneli T.C. No"
                      className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 px-3 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Kayıt sırasında sisteme bildirilen resmi T.C. Kimlik numaranızla eşleşmelidir.
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Onay kodu kayıtlı e-posta adresinize (<strong>{currentUser?.email || 'e-posta'}</strong>) iletilecektir.</span>
                </div>

                <button
                  type="submit"
                  disabled={pwdLoading || !pwdCurrentPassword || pwdTcIdentity.length !== 11}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  <ShieldCheck className={`w-4 h-4 ${pwdLoading ? 'animate-spin' : ''}`} />
                  <span>{pwdLoading ? 'Doğrulanıyor...' : 'Kimliği Doğrula & E-Posta OTP Kodu Gönder'}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ENTER OTP & NEW PASSWORD */}
          {pwdStep === 2 && (
            <form onSubmit={handleConfirmPasswordChange} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-emerald-500/40 shadow-xl space-y-5 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-500" />
                    2. Aşama: OTP Onayı & Yeni Şifre Belirleme
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <strong>{pwdMaskedEmail}</strong> adresinize gönderilen 6 haneli doğrulama kodunu girip yeni şifrenizi belirleyin.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPwdStep(1)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Geri Dön
                </button>
              </div>

              {/* OTP Code Input */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-emerald-200 text-center">
                  E-Postanıza Gelen 6 Haneli Doğrulama Kodunu Giriniz (OTP) *
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={pwdOtp}
                    onChange={(e) => setPwdOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-48 text-center text-2xl font-mono font-black tracking-widest rounded-2xl border-2 border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2 outline-none shadow-sm"
                  />
                </div>
                <div className="text-center text-[11px] text-slate-400">
                  {pwdCooldown > 0 ? (
                    <span>Yeni kod talep etmek için: <strong>{pwdCooldown} saniye</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPasswordChangeOtp}
                      className="text-emerald-500 hover:underline font-semibold"
                    >
                      Kodu Tekrar Gönder
                    </button>
                  )}
                </div>
              </div>

              {/* New Password Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Yeni Şifre (En Az 6 Karakter) *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={pwdNewPassword}
                      onChange={(e) => setPwdNewPassword(e.target.value)}
                      placeholder="Yeni güçlü şifreniz"
                      className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 pl-3 pr-10 outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Yeni Şifre (Tekrar) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={pwdNewPasswordConfirm}
                    onChange={(e) => setPwdNewPasswordConfirm(e.target.value)}
                    placeholder="Yeni şifrenizi tekrar yazın"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 px-3 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPwdStep(1)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  İptal Et
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading || pwdOtp.length !== 6 || pwdNewPassword.length < 6 || pwdNewPassword !== pwdNewPasswordConfirm}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${pwdLoading ? 'animate-spin' : ''}`} />
                  <span>{pwdLoading ? 'Kaydediliyor...' : 'Şifreyi Güvenli Olarak Güncelle'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: FACTORY RESET (HASSAS VERİ SIFIRLAMA)
         ======================================================== */}
      {activeTab === 'FACTORY_RESET' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-rose-950/40 border-2 border-rose-800/80 text-rose-200 space-y-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Hassas Veri Temizliği & Fabrika Sıfırlaması</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-mono uppercase tracking-wider">
                    Geri Alınamaz
                  </span>
                </h3>
                <p className="text-xs text-rose-300">
                  Bu işlem şirketinizin tüm operasyonel mali hareket verilerini (faturalar, tahsilatlar, stok hareketleri) tek kalemde temizler. Şirket unvanı ve kullanıcı hesabı korunur.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-rose-900/60 text-xs space-y-2">
              <div className="font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Sıfırlanacak Kritik Veri Kümeleri:
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 list-disc list-inside">
                <li>Tüm Satış & Alış Faturaları</li>
                <li>Tüm E-Arşiv ve E-Fatura kayıtları</li>
                <li>Tüm Stok Hareketleri ve Giriş/Çıkış Fişleri</li>
                <li>Tüm Cari Hesap Tahsilat & Tediye Fişleri</li>
                <li>Tüm Gelir & Gider (Kasa/Banka) Fişleri</li>
                <li>Tüm Teklif ve Sipariş Belgeleri</li>
                <li>Cari & Stok bakiyeleri 0.00 TL'ye çekilir</li>
              </ul>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-900/60 border border-rose-700 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccessSummary && (
              <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs space-y-2 animate-fadeIn">
                <div className="font-bold flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Sistem Başarıyla Sıfırlandı! Temizlenen Kayıt Sayıları:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-black/40">Faturalar: {resetSuccessSummary.wipedCounts?.invoices || 0}</div>
                  <div className="p-2 rounded bg-black/40">Stok Hareket: {resetSuccessSummary.wipedCounts?.stockTransactions || 0}</div>
                  <div className="p-2 rounded bg-black/40">Cari Hareket: {resetSuccessSummary.wipedCounts?.currentAccountTransactions || 0}</div>
                  <div className="p-2 rounded bg-black/40">Gelir/Gider: {resetSuccessSummary.wipedCounts?.incomeExpenses || 0}</div>
                </div>
              </div>
            )}

            {/* Credential & TC Pre-Check Form */}
            <form onSubmit={handleStartResetRequest} className="p-4 rounded-2xl bg-black/30 border border-rose-900/40 space-y-3">
              <div className="font-semibold text-xs text-rose-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-400" />
                Güvenlik Ön Doğrulaması (Yönetici Yetki Kontrolü)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Yönetici Şifreniz *
                  </label>
                  <input
                    type="password"
                    required
                    value={resetAdminPassword}
                    onChange={(e) => setResetAdminPassword(e.target.value)}
                    placeholder="Hesap şifreniz"
                    className="w-full text-xs rounded-xl border border-rose-900 bg-slate-950 text-white p-2.5 outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    11 Haneli T.C. Kimlik Numaranız *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={resetTcIdentity}
                    onChange={(e) => setResetTcIdentity(e.target.value.replace(/\D/g, ''))}
                    placeholder="11 Haneli T.C. No"
                    className="w-full text-xs font-mono rounded-xl border border-rose-900 bg-slate-950 text-white p-2.5 outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-rose-400" />
                  <span>Şifre ve T.C. doğrulandıktan sonra yönetici e-postanıza 6 haneli OTP kodu iletilir.</span>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading || !resetAdminPassword || resetTcIdentity.length !== 11}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${resetLoading ? 'animate-spin' : ''}`} />
                  <span>{resetLoading ? 'Kontrol Ediliyor...' : 'Doğrula & Sıfırlama OTP Kodu İste'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FACTORY RESET CONFIRMATION MODAL (FINAL MULTI-FACTOR CONFIRMATION) */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-rose-600/50 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-rose-200 dark:border-rose-950/80 flex items-center justify-between bg-rose-50 dark:bg-rose-950/40">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>Tek Kalemde Sıfırlama Onayı</span>
              </div>
              <button onClick={() => setResetModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReset} className="p-6 space-y-4">
              {resetError && (
                <div className="p-3 bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* 1. E-POSTA OTP KODU */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. E-Posta OTP Onay Kodu (6 Hane) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="••••••"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-xl font-mono tracking-widest rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2 pl-9 pr-3 outline-none focus:border-rose-500 shadow-sm"
                  />
                </div>
              </div>

              {/* 2. GÜVENLİK UYARISI & 60 SANİYE GERİ SAYIM */}
              <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-800/80 text-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Mali Veri İmhası & Güvenlik Uyarısı</span>
                  </div>

                  {resetCooldown > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-600/30 text-rose-300 border border-rose-500/40 animate-pulse">
                      ⏱️ {resetCooldown} sn
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Süre Doldu
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-rose-300/90 leading-relaxed">
                  Vergi Usul Kanunu ve Türk Ticaret Kanunu uyarınca silinen resmi fatura dökümleri, cari hareketler, tahsilat fişleri ve banka/kasa kayıtları <strong>geri getirilemez biçimde imha edilir</strong>. Ani kararları önlemek amacıyla 60 saniyelik güvenlik düşünme süresi işletilmektedir.
                </p>

                {resetCooldown > 0 ? (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-rose-900 text-center text-[11px] font-medium text-rose-300">
                    Kritik Güvenlik Soğuma Süresi: <strong>{resetCooldown} saniye</strong> sonra onay adımı açılacaktır...
                  </div>
                ) : (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/40 border border-emerald-900/60 cursor-pointer text-[11px] text-emerald-200">
                    <input
                      type="checkbox"
                      checked={resetAcknowledged}
                      onChange={(e) => setResetAcknowledged(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>Yukarıdaki yasal ve mali uyarı bilgilendirmesini okudum, anladım ve sorumluluğu kabul ediyorum.</span>
                  </label>
                )}
              </div>

              {/* 3. METİNSEL TEYİT (OKUDUM ANLADIM) & ŞİFRE TEKRARI */}
              {resetCooldown === 0 && (
                <div className="space-y-3 pt-1 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      3. Güvenlik Teyidi: Kutucuğa büyük harflerle <strong>OKUDUM ANLADIM</strong> yazınız *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="OKUDUM ANLADIM"
                      value={resetConfirmWord}
                      onChange={(e) => setResetConfirmWord(e.target.value)}
                      className="w-full text-center font-bold tracking-wider text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-rose-600 dark:text-rose-400 py-2.5 px-3 outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      4. Son Yetkilendirme: Yönetici Şifrenizi Tekrar Giriniz *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={resetRecheckPassword}
                      onChange={(e) => setResetRecheckPassword(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 px-3 outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Vazgeç
                </button>

                <button
                  type="submit"
                  disabled={
                    resetLoading ||
                    resetOtp.length !== 6 ||
                    resetCooldown > 0 ||
                    !resetAcknowledged ||
                    resetConfirmWord.trim().toUpperCase().replace(/İ/g, 'I') !== 'OKUDUM ANLADIM' ||
                    !resetRecheckPassword
                  }
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 active:scale-95 disabled:opacity-40 transition-all"
                >
                  <RotateCcw className={`w-4 h-4 ${resetLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {resetCooldown > 0
                      ? `Bekleyiniz (${resetCooldown} sn)`
                      : resetLoading
                      ? 'Siliniyor...'
                      : 'Tüm Verileri / Hesabı Kalıcı Olarak Sil'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Company Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Building2 className="w-4 h-4 text-brand-500" />
                <span>Yeni Şirket Kur</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Şirket / Firma Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Atlas Teknoloji Ltd. Şti."
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  placeholder="Örn: Maslak V.D."
                  value={newCompTaxOffice}
                  onChange={(e) => setNewCompTaxOffice(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vergi No / T.C. Kimlik No
                </label>
                <input
                  type="text"
                  placeholder="10 veya 11 haneli"
                  value={newCompTaxNumber}
                  onChange={(e) => setNewCompTaxNumber(e.target.value)}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/20 active:scale-95"
                >
                  Şirketi Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
