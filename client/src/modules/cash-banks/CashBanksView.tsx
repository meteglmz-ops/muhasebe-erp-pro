import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Landmark,
  Plus,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { CashBank } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface CashBanksViewProps {
  cashBanks: CashBank[];
  onRefresh: () => void;
  onOpenTransferModal: () => void;
}

export const CashBanksView: React.FC<CashBanksViewProps> = ({
  cashBanks,
  onRefresh,
  onOpenTransferModal,
}) => {
  const [selectedAccount, setSelectedAccount] = useState<CashBank | null>(cashBanks[0] || null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // New Account Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newType, setNewType] = useState<'CASH' | 'BANK'>('BANK');
  const [newName, setNewName] = useState('');
  const [newBankName, setNewBankName] = useState('Garanti BBVA');
  const [newBranch, setNewBranch] = useState('');
  const [newAccountNo, setNewAccountNo] = useState('');
  const [newIban, setNewIban] = useState('');
  const [newCurrency, setNewCurrency] = useState('TRY');
  const [newOpeningBalance, setNewOpeningBalance] = useState(0);

  // Edit Account Modal
  const [editingAccount, setEditingAccount] = useState<CashBank | null>(null);
  const [editName, setEditName] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editAccountNo, setEditAccountNo] = useState('');
  const [editIban, setEditIban] = useState('');

  useEffect(() => {
    if (cashBanks.length > 0 && !selectedAccount) {
      setSelectedAccount(cashBanks[0]);
    }
  }, [cashBanks]);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions(selectedAccount.id);
    }
  }, [selectedAccount]);

  const fetchTransactions = async (accId: string) => {
    setLoadingTx(true);
    try {
      const res = await api.request<any>(`/cash-banks/${accId}/transactions`);
      setTransactions(res.data);
    } catch (err) {
      console.error('Hareketler yüklenemedi:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleOpenEdit = (e: React.MouseEvent, cb: CashBank) => {
    e.stopPropagation();
    setEditingAccount(cb);
    setEditName(cb.name);
    setEditBankName(cb.bank_name || '');
    setEditBranch(cb.branch || '');
    setEditAccountNo(cb.account_no || '');
    setEditIban(cb.iban || '');
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName) return;

    try {
      await api.updateCashBank(editingAccount.id, {
        name: editName,
        bank_name: editingAccount.type === 'BANK' ? editBankName : null,
        branch: editingAccount.type === 'BANK' ? editBranch : null,
        account_no: editingAccount.type === 'BANK' ? editAccountNo : null,
        iban: editingAccount.type === 'BANK' ? editIban : null,
      });

      setEditingAccount(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Hesap güncellenirken hata oluştu.');
    }
  };

  const handleDeleteAccount = async (e: React.MouseEvent, cb: CashBank) => {
    e.stopPropagation();
    if (!window.confirm(`"${cb.name}" hesabını silmek istediğinize emin misiniz?`)) return;

    try {
      await api.deleteCashBank(cb.id);
      if (selectedAccount?.id === cb.id) {
        setSelectedAccount(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Hesap silinirken hata oluştu.');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    try {
      await api.createCashBank({
        type: newType,
        name: newName,
        bank_name: newType === 'BANK' ? newBankName : null,
        branch: newType === 'BANK' ? newBranch : null,
        account_no: newType === 'BANK' ? newAccountNo : null,
        iban: newType === 'BANK' ? newIban : null,
        currency: newCurrency,
        opening_balance: newOpeningBalance,
      });

      setIsAddModalOpen(false);
      setNewName('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Hesap eklenirken hata oluştu.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Kasa ve Banka Hesapları Yönetimi
          </h2>
          <p className="text-xs text-slate-500">
            Nakit kasalar, banka ticari hesapları ve hesaplar arası varlık transferleri
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenTransferModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-300 dark:border-indigo-800 text-xs font-bold transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Varlık Transferi Yap</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kasa / Banka Hesabı</span>
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cashBanks.map((cb) => {
          const isSelected = selectedAccount?.id === cb.id;
          const isBank = cb.type === 'BANK';

          return (
            <div
              key={cb.id}
              onClick={() => setSelectedAccount(cb)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isBank ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                }`}>
                  {isBank ? <Landmark className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isBank ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  }`}>
                    {isBank ? 'Banka Hesabı' : 'Nakit Kasa'}
                  </span>
                  <button
                    onClick={(e) => handleOpenEdit(e, cb)}
                    title="Düzenle"
                    className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteAccount(e, cb)}
                    title="Sil"
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{cb.name}</h3>
                {cb.iban && (
                  <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{cb.iban}</div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">Mevcut Bakiye:</span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                  {formatCurrency(cb.current_balance, cb.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Account Detail & Transaction History */}
      {selectedAccount && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedAccount.name} — Hesap Hareketleri
              </h3>
              <p className="text-xs text-slate-500">Giriş, çıkış ve transfer kayıtları</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Güncel Bakiye: </span>
              <span className="text-sm font-bold text-brand-600 font-mono">
                {formatCurrency(selectedAccount.current_balance, selectedAccount.currency)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Tarih</th>
                  <th className="p-3">İşlem Türü</th>
                  <th className="p-3">Açıklama</th>
                  <th className="p-3 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {loadingTx ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">Hareketler yükleniyor...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">Bu hesaba ait henüz hareket bulunmuyor.</td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isInflow = tx.type === 'INFLOW';
                    const isTransfer = tx.type === 'TRANSFER';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">{formatDate(tx.date)}</td>
                        <td className="p-3 font-semibold">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                            isTransfer
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                              : isInflow
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {isTransfer ? <ArrowRightLeft className="w-3 h-3" /> : isInflow ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isTransfer ? 'Transfer' : isInflow ? 'Para Girişi (Tahsilat)' : 'Para Çıkışı (Ödeme)'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{tx.description}</td>
                        <td className={`p-3 text-right font-mono font-bold text-sm ${
                          isInflow ? 'text-emerald-600' : isTransfer ? 'text-indigo-600' : 'text-rose-600'
                        }`}>
                          {isInflow ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yeni Kasa veya Banka Hesabı</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hesap Türü</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('BANK')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      newType === 'BANK' ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-300'
                    }`}
                  >
                    Banka Hesabı
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('CASH')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      newType === 'CASH' ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-300'
                    }`}
                  >
                    Nakit Kasa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hesap Adı *</label>
                <input
                  type="text"
                  required
                  placeholder={newType === 'BANK' ? 'Örn: Akbank Maslak Ticari' : 'Örn: Şube Kasası'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                />
              </div>

              {newType === 'BANK' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Banka Adı</label>
                      <input
                        type="text"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Şube</label>
                      <input
                        type="text"
                        placeholder="Maslak"
                        value={newBranch}
                        onChange={(e) => setNewBranch(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">IBAN Numarası</label>
                    <input
                      type="text"
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      value={newIban}
                      onChange={(e) => setNewIban(e.target.value)}
                      className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Para Birimi</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Açılış Bakiyesi</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOpeningBalance}
                    onChange={(e) => setNewOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
                >
                  Hesabı Aç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Hesap Bilgilerini Düzenle ({editingAccount.name})
              </h3>
              <button onClick={() => setEditingAccount(null)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hesap Adı *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                />
              </div>

              {editingAccount.type === 'BANK' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Banka Adı</label>
                      <input
                        type="text"
                        value={editBankName}
                        onChange={(e) => setEditBankName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Şube</label>
                      <input
                        type="text"
                        value={editBranch}
                        onChange={(e) => setEditBranch(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hesap Numarası</label>
                    <input
                      type="text"
                      value={editAccountNo}
                      onChange={(e) => setEditAccountNo(e.target.value)}
                      className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">IBAN Numarası</label>
                    <input
                      type="text"
                      value={editIban}
                      onChange={(e) => setEditIban(e.target.value)}
                      className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
