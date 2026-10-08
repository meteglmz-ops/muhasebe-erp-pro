import React, { useState } from 'react';
import { X, CheckCircle2, Wallet, AlertCircle } from 'lucide-react';
import { Invoice, CashBank } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: Invoice | null;
  cashBanks: CashBank[];
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  cashBanks,
}) => {
  if (!isOpen || !invoice) return null;

  const isSales = invoice.invoice_type === 'SALES';
  const [amount, setAmount] = useState<number>(invoice.remaining_amount || 0);
  const [accountId, setAccountId] = useState(cashBanks[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Geçerli bir tutar giriniz.');
      return;
    }
    if (!accountId) {
      setError('Lütfen bir kasa veya banka hesabı seçiniz.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.payInvoice(invoice.id, {
        amount,
        account_id: accountId,
        date,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ödeme kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSales ? 'bg-emerald-500/10 text-emerald-600' : 'bg-brand-500/10 text-brand-600'}`}>
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isSales ? 'Fatura Tahsilatı Yap' : 'Tedarikçi Ödemesi Yap'}
              </h3>
              <p className="text-[11px] text-slate-500">{invoice.invoice_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Toplam Tutar:</span>
              <span className="font-mono font-medium">{formatCurrency(invoice.grand_total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Şimdiye Kadar Ödenen:</span>
              <span className="font-mono font-medium text-emerald-600">{formatCurrency(invoice.paid_amount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Kalan Tutar:</span>
              <span className="font-mono text-brand-600">{formatCurrency(invoice.remaining_amount, invoice.currency)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              İşlem Tutarı
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.remaining_amount}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isSales ? 'Tahsil Edilecek Kasa / Banka' : 'Ödeme Yapılacak Kasa / Banka'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
            >
              {cashBanks.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.name} (Bakiye: {formatCurrency(cb.current_balance, cb.currency)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              İşlem Tarihi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Açıklama / Dekont No
            </label>
            <input
              type="text"
              placeholder="Dekont veya makbuz bilgisi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Kaydediliyor...' : 'İşlemi Tamamla'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
