import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CashBank } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cashBanks: CashBank[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cashBanks,
}) => {
  if (!isOpen) return null;

  const [sourceId, setSourceId] = useState(cashBanks[0]?.id || '');
  const [destId, setDestId] = useState(cashBanks[1]?.id || '');
  const [amount, setAmount] = useState<number>(10000);
  const [fee, setFee] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Geçerli bir tutar giriniz.');
      return;
    }
    if (sourceId === destId) {
      setError('Kaynak ve hedef hesap aynı olamaz.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.transferFunds({
        source_account_id: sourceId,
        destination_account_id: destId,
        amount,
        fee,
        description,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Transfer gerçekleştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Varlık Transferi (Kasa ⇄ Banka)
              </h3>
              <p className="text-[11px] text-slate-500">Gelir/Gider sayılmaz, saf varlık transferidir</p>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kaynak Hesap (Para Çıkışı)
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
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
              Hedef Hesap (Para Girişi)
            </label>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
            >
              {cashBanks.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.name} (Bakiye: {formatCurrency(cb.current_balance, cb.currency)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transfer Tutarı
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                İşlem Masrafı (Opsiyonel)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Açıklama
            </label>
            <input
              type="text"
              placeholder="Örn: Kasadan bankaya nakit yatırma"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Aktarılıyor...' : 'Transferi Gerçekleştir'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
