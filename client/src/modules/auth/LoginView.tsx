import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  FileText,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Inbox,
  ExternalLink,
  Copy,
  RefreshCw,
  X,
  Send,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';

interface LoginViewProps {
  onLoginSuccess: (authData: { user: any; currentCompany: any; companies: any[]; token: string }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regTcIdentity, setRegTcIdentity] = useState('');
  const [regTaxNumber, setRegTaxNumber] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Register OTP step
  const [regStep, setRegStep] = useState<'FORM' | 'OTP'>('FORM');
  const [regOtpCode, setRegOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'RESET'>('REQUEST');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status & error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Standard Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await api.login(loginEmail.trim(), loginPassword);
      if (res.success && res.data) {
        localStorage.setItem('erp_token', res.data.token);
        if (res.data.currentCompany?.id) {
          localStorage.setItem('erp_company_id', res.data.currentCompany.id);
        }
        onLoginSuccess(res.data);
      } else {
        setErrorMsg(res.error || 'Giriş yapılamadı.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Giriş yapılırken sunucu hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Request OTP for Register (TC is strictly mandatory)
  const handleRegisterRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanTc = regTcIdentity.trim().replace(/\D/g, '');
    if (!cleanTc || cleanTc.length !== 11) {
      setErrorMsg('T.C. Kimlik Numarası zorunludur ve tam olarak 11 haneli rakamlardan oluşmalıdır.');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.requestRegisterOtp({
        email: cleanEmail,
        password: regPassword,
        fullName: regFullName.trim(),
        companyName: regCompanyName.trim(),
        tcIdentity: cleanTc,
        taxNumber: regTaxNumber ? regTaxNumber.trim() : cleanTc,
        phone: regPhone.trim(),
      });

      if (res.success) {
        setRegStep('OTP');
        setResendCooldown(60);
        setSuccessMsg(res.message || `Doğrulama kodu ${cleanEmail} adresine gönderildi.`);
      } else {
        setErrorMsg(res.error || 'Doğrulama kodu gönderilemedi.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Kayıt kodu istenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP and finalize Registration
  const handleRegisterVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = regOtpCode.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setErrorMsg('Lütfen e-postanıza gönderilen 6 haneli OTP kodunu eksiksiz giriniz.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.verifyRegisterOtp(regEmail.trim().toLowerCase(), cleanCode);
      if (res.success && res.data) {
        localStorage.setItem('erp_token', res.data.token);
        if (res.data.currentCompany?.id) {
          localStorage.setItem('erp_company_id', res.data.currentCompany.id);
        }
        onLoginSuccess(res.data);
      } else {
        setErrorMsg(res.error || 'Doğrulama kodu onaylanamadı.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Doğrulama işlemi sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password request OTP
  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    setLoading(true);

    try {
      const res = await api.requestForgotPasswordOtp(forgotEmail.trim().toLowerCase());
      if (res.success) {
        setForgotStep('RESET');
        setForgotMsg({ type: 'success', text: res.message || 'Sıfırlama kodu e-postanıza iletildi.' });
      } else {
        setForgotMsg({ type: 'error', text: res.error || 'İşlem başarısız.' });
      }
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err.message || 'Hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  // Forgot password confirm reset
  const handleForgotConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    setLoading(true);

    try {
      const res = await api.resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim().replace(/\D/g, ''),
        newPassword: forgotNewPass,
      });

      if (res.success) {
        setForgotMsg({ type: 'success', text: 'Şifreniz başarıyla yenilendi! Yeni şifrenizle giriş yapabilirsiniz.' });
        setTimeout(() => {
          setForgotModalOpen(false);
          setForgotStep('REQUEST');
          setForgotMsg(null);
          setLoginEmail(forgotEmail);
          setLoginPassword('');
          setMode('LOGIN');
        }, 1500);
      } else {
        setForgotMsg({ type: 'error', text: res.error || 'Şifre sıfırlanamadı.' });
      }
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err.message || 'Sıfırlama sırasında hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden font-sans selection:bg-brand-500 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-brand-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[650px] h-[650px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[15%] w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[140px] pointer-events-none" />

      {/* Top Header Status Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 font-black text-sm">
            B
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-tight">BeeCursor</span>
            <span className="text-brand-400 font-extrabold text-sm ml-1">ERP Pro</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>256-Bit SSL Şifreli Giriş</span>
        </div>
      </header>

      {/* Center Authentication Card */}
      <main className="w-full max-w-xl mx-auto my-auto z-10 py-6">
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/70 relative">
          
          {/* Card Header & Brand */}
          <div className="text-center space-y-3 mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-emerald-500 text-white shadow-xl shadow-brand-500/25">
              <Building2 className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                BeeCursor <span className="text-brand-500">ERP & Muhasebe</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
                <Cloud className="w-3.5 h-3.5 text-brand-400" />
                T.C. Kimlik & OTP Doğrulamalı Kurumsal ERP Portalı
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800/80 max-w-sm mx-auto mt-4">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'LOGIN'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'REGISTER'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yeni Şirket Hesabı Aç
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: LOGIN FORM                                              */}
          {/* ============================================================== */}
          {mode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-Posta Adresi
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="ornek@beecursor.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Giriş Şifresi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-0"
                  />
                  <span>Beni Hatırla</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setForgotStep('REQUEST');
                    setForgotMsg(null);
                    setForgotEmail(loginEmail);
                  }}
                  className="text-brand-400 hover:underline cursor-pointer text-[11px] font-semibold"
                >
                  Şifremi Unuttum
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Güvenli Giriş Yap</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Fast 1-Click Demo Accounts */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                  <span>Hızlı Demo Giriş Hesapları:</span>
                  <span className="text-[10px] text-brand-400 font-mono">1-Tıkla Doldur</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin@beecursor.com', 'admin123')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-slate-200 group-hover:text-brand-400">Yönetici (Admin)</div>
                      <div className="text-[10px] text-slate-500 font-mono">admin@beecursor.com</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('muhasebe@beecursor.com', 'muhasebe123')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-slate-200 group-hover:text-brand-400">Mali Müşavir</div>
                      <div className="text-[10px] text-slate-500 font-mono">muhasebe@beecursor.com</div>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ============================================================== */
            /* TAB 2: REGISTER FLOW WITH MANDATORY TC & OTP                   */
            /* ============================================================== */
            regStep === 'FORM' ? (
              <form onSubmit={handleRegisterRequestOtp} className="space-y-3.5 animate-fadeIn">
                {/* Şirket Adı */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Şirket / Firma Ünvanı *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Örn: Anadolu Bilişim ve Danışmanlık A.Ş."
                      value={regCompanyName}
                      onChange={(e) => setRegCompanyName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Yetkili Ad Soyad */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Yetkili Adı Soyadı *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="Örn: Hakan Yılmaz"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* T.C. Kimlik No (ZORUNLU) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-amber-300">
                        Yetkili T.C. Kimlik No *
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {regTcIdentity.length}/11 Hane
                      </span>
                    </div>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        maxLength={11}
                        placeholder="11 Haneli T.C. Kimlik No"
                        value={regTcIdentity}
                        onChange={(e) => setRegTcIdentity(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border-2 border-amber-500/60 focus:border-amber-400 rounded-xl py-2 pl-9 pr-3 text-xs text-white font-mono placeholder-slate-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Vergi No (Opsiyonel) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Vergi Numarası (Varsa)
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="Kurumsal Vergi No"
                        value={regTaxNumber}
                        onChange={(e) => setRegTaxNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Telefon */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Yetkili Cep Telefonu
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="0532 000 00 00"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* E-Posta Adresi (OTP Bu Adrese Gönderilir) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Aktivasyon E-Posta Adresi *
                    </label>
                    <span className="text-[10px] text-brand-400 font-semibold">
                      OTP Doğrulama Kodu Buraya Gelecek
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-brand-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="yonetim@sirketim.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-950 border-2 border-brand-500/60 focus:border-brand-400 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Giriş Şifresi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Giriş Şifresi *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="En az 6 karakter"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2 pl-9 pr-10 text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* OTP Bilgilendirme Kartı */}
                <div className="p-3 bg-brand-950/40 border border-brand-800/50 rounded-2xl text-[11px] text-brand-300 flex items-start gap-2.5">
                  <KeyRound className="w-4 h-4 shrink-0 text-brand-400 mt-0.5" />
                  <div className="leading-relaxed">
                    Güvenliğiniz ve resmi mevzuat gereği <strong>{regEmail || 'belirttiğiniz e-postaya'}</strong> 6 haneli OTP kodu iletilecek ve T.C. kimlik bilgileriniz kayıt altına alınacaktır.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Doğrulama Kodu Gönder & İlerle</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* REGISTER STEP 2: ENTER OTP */
              <form onSubmit={handleRegisterVerifyOtp} className="space-y-4 animate-fadeIn">
                <div className="text-center p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">E-Posta Doğrulama Kodu (OTP)</h3>
                  <p className="text-xs text-slate-400">
                    Kod şu adrese gönderildi: <br />
                    <strong className="text-brand-300 font-mono text-xs">{regEmail}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 text-center">
                    6 Haneli OTP Kodunu Giriniz
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="------"
                    value={regOtpCode}
                    onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950 border-2 border-brand-500 focus:border-brand-400 rounded-2xl py-3.5 text-center text-2xl font-mono tracking-[0.6em] text-white placeholder-slate-600 outline-none shadow-inner"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setRegStep('FORM')}
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Bilgileri Düzenle</span>
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleRegisterRequestOtp}
                    className="text-brand-400 hover:text-brand-300 font-semibold disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Tekrar Kod (${resendCooldown}s)` : 'Kodu Tekrar Gönder'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || regOtpCode.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-3"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Kodu Doğrula ve Şirketi Başlat</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )
          )}


          {/* Security & Compliance Badges */}
          <div className="mt-5 text-center text-[10px] text-slate-500 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              256-bit SSL & OTP
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
              GİB & E-Fatura Uyumlu
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
              Firebase Canlı Altyapı
            </span>
          </div>
        </div>
      </main>

      {/* Footer Copyright */}
      <footer className="w-full text-center py-2 text-[11px] text-slate-500 z-10">
        © 2026 BeeCursor ERP Pro Enterprise • Tüm hakları saklıdır.
      </footer>

      {/* ============================================================== */}
      {/* FORGOT PASSWORD MODAL                                          */}
      {/* ============================================================== */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setForgotModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Şifre Sıfırlama</h3>
                <p className="text-xs text-slate-400">E-Posta OTP doğrulama ile şifrenizi yenileyin</p>
              </div>
            </div>

            {forgotMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  forgotMsg.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800/60 text-rose-300'
                }`}
              >
                {forgotMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{forgotMsg.text}</span>
              </div>
            )}

            {forgotStep === 'REQUEST' ? (
              <form onSubmit={handleForgotRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kayıtlı E-Posta Adresiniz
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="admin@beecursor.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Kod Gönderiliyor...' : 'Sıfırlama Kodu Gönder'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotConfirmReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-Posta OTP Kodu (6 Hane)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950 border border-brand-500/80 rounded-xl py-2 px-3 text-center text-lg font-mono tracking-widest text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Yeni Şifreniz</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showForgotPass ? 'text' : 'password'}
                      required
                      placeholder="En az 6 karakter"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-2 pl-9 pr-10 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPass(!showForgotPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showForgotPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setForgotStep('REQUEST')}
                    className="text-slate-400 hover:text-white"
                  >
                    ← Geri Dön
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || forgotOtp.length !== 6 || forgotNewPass.length < 6}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Şifre Güncelleniyor...' : 'Şifreyi Onayla ve Değiştir'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
