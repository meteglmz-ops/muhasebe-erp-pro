import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Key,
  Shield,
} from 'lucide-react';
import { api } from '../../services/api';

interface MasterAdminLoginViewProps {
  onSuccess: (adminUser: any) => void;
  onBackToClientLogin: () => void;
}

export const MasterAdminLoginView: React.FC<MasterAdminLoginViewProps> = ({
  onSuccess,
  onBackToClientLogin,
}) => {
  // Aşama Durumu: 'CREDENTIALS' -> 'MFA_STEP_1' -> 'MFA_STEP_2' -> 'MFA_STEP_3' -> 'SUCCESS'
  const [stage, setStage] = useState<'CREDENTIALS' | 'MFA_STEP_1' | 'MFA_STEP_2' | 'MFA_STEP_3' | 'SUCCESS'>('CREDENTIALS');

  // Kimlik Formu (Tamamen boş, hiçbir ipucu/varsayılan metin yok)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);

  // MFA Durumu
  const [sessionToken, setSessionToken] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [totalSteps, setTotalSteps] = useState<number>(3);
  const [alertSent, setAlertSent] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(300);

  // Geri Sayım Sayacı (5 dakika)
  useEffect(() => {
    if (stage.startsWith('MFA_STEP') && cooldown > 0) {
      const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [stage, cooldown]);

  // 1. Kök Giriş İsteği Gönder (Credentials Submit)
  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim() || !masterKey.trim()) {
      setError('Lütfen tüm güvenlik alanlarını doldurunuz.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.masterAdminInitiate({
        email: email.trim(),
        password: password.trim(),
        masterKey: masterKey.trim(),
      });

      if (res.success && res.data) {
        setSessionToken(res.data.sessionToken);
        setCurrentStep(res.data.currentStep);
        setTotalSteps(res.data.totalSteps);
        setAlertSent(true);
        setCooldown(300);
        setStage('MFA_STEP_1');
      } else {
        setError(res.error || 'Doğrulama başarısız.');
      }
    } catch (err: any) {
      setError(err.message || 'Erişim reddedildi. Sistem sahibi doğrulaması başarısız.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Ardışık 3 Kodu Doğrula (MFA Verify)
  const handleVerifyStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = otpCode.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Lütfen e-postanıza gelen 6 haneli doğrulama kodunu giriniz.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.masterAdminVerifyStep({
        sessionToken,
        code: cleanCode,
      });

      if (res.success && res.data) {
        setOtpCode('');
        setCooldown(300);

        if (res.data.currentStep === 2) {
          // 1. Adım Başarılı -> 2. Adıma Geç
          setSessionToken(res.data.sessionToken);
          setCurrentStep(2);
          setStage('MFA_STEP_2');
        } else if (res.data.currentStep === 3) {
          // 2. Adım Başarılı -> 3. Adıma Geç
          setSessionToken(res.data.sessionToken);
          setCurrentStep(3);
          setStage('MFA_STEP_3');
        } else if (res.data.token) {
          // 3. Adım da Başarılı -> Giriş Tamamlandı!
          setStage('SUCCESS');
          setTimeout(() => {
            onSuccess(res.data.user);
          }, 1500);
        }
      } else {
        setError(res.error || 'Hatalı güvenlik kodu.');
      }
    } catch (err: any) {
      setError(err.message || 'Kod doğrulanamadı.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Koyu Siber Güvenlik Katmanı */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl">
          {/* Logo & Başlık */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 shadow-xl shadow-indigo-600/30 mb-3 ring-4 ring-indigo-500/20">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">BeeCursor Master Control</h1>
            <div className="inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
              Sistem Sahibi Özel Giriş Kapısı
            </div>
          </div>

          {/* Hata Bildirimi */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* ADIM 1: KİMLİK GİRİŞİ (SIFIR İPUCU, TAMAMEN BOŞ ALANLAR) */}
          {/* ============================================================== */}
          {stage === 'CREDENTIALS' && (
            <form onSubmit={handleInitiate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Yönetici E-Postası
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    autoComplete="off"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Güvenlik Anahtarı
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showMasterKey ? 'text' : 'password'}
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder=""
                    autoComplete="off"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterKey(!showMasterKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span>Doğrulanıyor & Güvenlik Uyarısı Gönderiliyor...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Güvenlik Doğrulamasını Başlat</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================== */}
          {/* ADIM 2: ÇOK KATMANLI ARDIŞIK 3 KOD DOĞRULAMASI (3-STAGE MFA) */}
          {/* ============================================================== */}
          {(stage === 'MFA_STEP_1' || stage === 'MFA_STEP_2' || stage === 'MFA_STEP_3') && (
            <div className="space-y-5">
              {/* Acil Uyarı Bildirimi */}
              {alertSent && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="block text-amber-200">Giriş Güvenlik Uyarısı İletildi</strong>
                    E-posta adresinize hesabınıza giriş yapıldığına dair acil güvenlik bildirimi ulaştırıldı.
                  </div>
                </div>
              )}

              {/* İlerleme Çubuğu */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-indigo-300">
                    Aşama {currentStep} / {totalSteps}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5" /> {formatTimer(cooldown)}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex gap-1 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-300 ${currentStep >= 1 ? 'bg-indigo-500 flex-1' : 'bg-slate-700 flex-1'}`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${currentStep >= 2 ? 'bg-indigo-500 flex-1' : 'bg-slate-700 flex-1'}`} />
                  <div className={`h-full rounded-full transition-all duration-300 ${currentStep >= 3 ? 'bg-indigo-500 flex-1' : 'bg-slate-700 flex-1'}`} />
                </div>
              </div>

              {/* Bilgi Başlığı */}
              <div className="text-center p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-400" />
                  <span>
                    {currentStep === 1 && '1. Aşama Kök Doğrulama Kodu'}
                    {currentStep === 2 && '2. Aşama İkinci Kilit Güvenlik Kodu'}
                    {currentStep === 3 && '3. Aşama Son Master Kilit Açma Kodu'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  E-postanıza gönderilen 6 haneli kodu giriniz.
                </p>
              </div>

              {/* Kod Giriş Formu */}
              <form onSubmit={handleVerifyStep} className="space-y-4">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[12px] text-2xl font-mono py-3 bg-slate-800 border border-indigo-500/50 rounded-xl text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Kod Doğrulanıyor...</span>
                  ) : (
                    <>
                      <span>{currentStep === 3 ? 'Son Kilidi Aç ve Giriş Yap' : `Kodu Onayla (${currentStep}/${totalSteps})`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* ADIM 3: BAŞARILI KİLİT AÇILMA */}
          {/* ============================================================== */}
          {stage === 'SUCCESS' && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
              <h2 className="text-base font-bold text-white">3 Aşamalı Kök Doğrulama Başarılı!</h2>
              <p className="text-xs text-slate-300">
                Sistem Sahibi Master Admin Paneli Tam Yetki ile Açılıyor...
              </p>
            </div>
          )}

          {/* Müşteri Girişine Geri Dön */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onBackToClientLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Normal Müşteri Giriş Ekranına Dön</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
