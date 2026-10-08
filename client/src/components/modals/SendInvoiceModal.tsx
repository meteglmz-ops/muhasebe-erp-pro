import React, { useState } from 'react';
import {
  Send,
  Mail,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Invoice } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onInvoiceSent: () => void;
}

export const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onInvoiceSent,
}) => {
  const [sendType, setSendType] = useState<'EINVOICE' | 'EMAIL'>('EINVOICE');
  const [recipientEmail, setRecipientEmail] = useState(invoice?.customer_email || '');
  const [subject, setSubject] = useState(
    invoice ? `${invoice.invoice_no} Nolu Faturanız Hakkında` : ''
  );
  const [message, setMessage] = useState(
    invoice
      ? `Sayın Yetkili,\n\n${formatDate(invoice.issue_date)} tarihli ve ${invoice.invoice_no} numaralı faturanız ekte bilgilerinize sunulmuştur.\n\nİyi çalışmalar dileriz.`
      : ''
  );

  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update fields when invoice changes
  React.useEffect(() => {
    if (invoice) {
      setRecipientEmail(invoice.customer_email || '');
      setSubject(`${invoice.invoice_no} Nolu Faturanız`);
      setMessage(
        `Sayın ${invoice.customer_name || 'Yetkili'},\n\n${invoice.invoice_no} numaralı faturanız oluşturulmuştur. Toplam Tutar: ${formatCurrency(invoice.grand_total, invoice.currency)}.\n\nBilgilerinize sunarız.`
      );
      setSuccessInfo(null);
      setErrorMsg(null);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessInfo(null);

    try {
      const res = await api.sendInvoice(invoice.id, {
        sendType,
        emailRecipient: sendType === 'EMAIL' ? recipientEmail : undefined,
        emailSubject: sendType === 'EMAIL' ? subject : undefined,
        emailBody: sendType === 'EMAIL' ? message : undefined,
      });

      if (res.success) {
        setSuccessInfo(res.data);
        onInvoiceSent();
      } else {
        setErrorMsg(res.error || 'Fatura iletilemedi.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gönderim sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Fatura Gönderimi ({invoice.invoice_no})
              </h2>
              <p className="text-xs text-slate-500">
                GİB E-Fatura/E-Arşiv entegrasyonu veya e-posta ile resmi iletim
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

        {/* Invoice Summary Card */}
        <div className="p-5 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Muhatap:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {invoice.customer_title || invoice.customer_name || invoice.supplier_title || invoice.supplier_name || '-'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Fatura Tutarı:</span>
              <span className="font-mono font-extrabold text-brand-600 dark:text-brand-400 text-sm">
                {formatCurrency(invoice.grand_total, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {successInfo ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Fatura Başarıyla Gönderildi!</h3>
              <p className="text-xs text-slate-500 mt-1">
                {sendType === 'EINVOICE'
                  ? 'Fatura GİB sistemine başarıyla iletildi ve onay kodu üretildi.'
                  : `${recipientEmail} adresine bilgilendirme e-postası gönderildi.`}
              </p>
            </div>

            {successInfo.gibTrackCode && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <span className="text-slate-400 block text-[10px]">GİB Takip Numarası:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">{successInfo.gibTrackCode}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
            >
              Tamam
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Delivery Method Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Gönderim Kanalı Seçiniz
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSendType('EINVOICE')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    sendType === 'EINVOICE'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <FileCheck2 className="w-4 h-4 text-brand-600" />
                    <span>GİB E-Fatura / E-Arşiv</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Resmi Gelir İdaresi Başkanlığı portalına XML gönderimi</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSendType('EMAIL')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    sendType === 'EMAIL'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Mail className="w-4 h-4 text-brand-600" />
                    <span>Müşteriye E-Posta</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Fatura PDF formatında alıcı adresine iletilir</p>
                </button>
              </div>
            </div>

            {sendType === 'EINVOICE' ? (
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>E-Fatura / E-Arşiv Otomatik İletimi</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Bu işlem faturayı resmi UBL-TR formatında paketleyerek GİB entegratörüne iletir.
                  Faturaya benzersiz E-Fatura UUID atanır ve durumu "Kabul Edildi / İletildi" statüsüne güncellenir.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alıcı E-posta Adresi *
                  </label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="alici@musteri.com"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Konu
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mesaj Metni
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md flex items-center gap-2 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'İletiliyor...' : 'Faturayı Gönder'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
