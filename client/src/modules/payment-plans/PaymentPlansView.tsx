import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Filter,
  DollarSign,
  ArrowRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { PaymentPlan, CashBank } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PaymentPlansViewProps {
  cashBanks: CashBank[];
}

export const PaymentPlansView: React.FC<PaymentPlansViewProps> = ({ cashBanks }) => {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Settle modal
  const [selectedPlanForPay, setSelectedPlanForPay] = useState<PaymentPlan | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(cashBanks[0]?.id || '');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payLoading, setPayLoading] = useState(false);

  // Add plan modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [addEntityType, setAddEntityType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [addEntityId, setAddEntityId] = useState('');
  const [addAmount, setAddAmount] = useState<number>(0);
  const [addDueDate, setAddDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [addNotes, setAddNotes] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const openAddModal = async () => {
    setIsAddOpen(true);
    try {
      const [custRes, suppRes] = await Promise.all([api.getCustomers(), api.getSuppliers()]);
      setCustomers(custRes.data || []);
      setSuppliers(suppRes.data || []);
      if (custRes.data && custRes.data.length > 0 && !addEntityId) {
        setAddEntityId(custRes.data[0].id);
      }
    } catch (e) {
      console.error('Cari listesi yüklenemedi:', e);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEntityId || addAmount <= 0) {
      alert('Lütfen geçerli bir cari ve tutar giriniz.');
      return;
    }
    setAddLoading(true);
    try {
      await api.createPaymentPlan({
        entity_type: addEntityType,
        entity_id: addEntityId,
        amount: addAmount,
        due_date: addDueDate,
        notes: addNotes,
      });
      setIsAddOpen(false);
      setAddAmount(0);
      setAddNotes('');
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Ödeme planı eklenemedi.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Bu ödeme planı kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await api.deletePaymentPlan(id);
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Ödeme planı silinemedi.');
    }
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.getPaymentPlans({ status: statusFilter || undefined });
      setPlans(res.data);
    } catch (err) {
      console.error('Ödeme planları yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [statusFilter]);

  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForPay || !selectedAccountId) return;

    setPayLoading(true);
    try {
      await api.payInstallment(selectedPlanForPay.id, {
        account_id: selectedAccountId,
        payment_date: payDate,
      });
      setSelectedPlanForPay(null);
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Taksit ödemesi kaydedilemedi.');
    } finally {
      setPayLoading(false);
    }
  };

  // Totals
  const totalPending = plans.filter((p) => p.status === 'PENDING').reduce((acc, cur) => acc + cur.amount, 0);
  const totalOverdue = plans.filter((p) => p.isOverdue).reduce((acc, cur) => acc + cur.amount, 0);
  const totalPaid = plans.filter((p) => p.status === 'PAID').reduce((acc, cur) => acc + cur.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Ödeme Planları, Vadeler ve Taksit Takibi
          </h2>
          <p className="text-xs text-slate-500">
            Müşteri tahsilat taksitleri, tedarikçi ödeme vadeleri ve geciken işlemler
          </p>
        </div>

        {/* Quick Metric Chips and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
            <span className="text-slate-500">Bekleyen: </span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(totalPending)}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs">
            <span className="text-slate-500">Geciken: </span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(totalOverdue)}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
            <span className="text-slate-500">Ödenen: </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(totalPaid)}</span>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Taksit / Vade Ekle</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
        {[
          { id: '', label: 'Tüm Taksitler' },
          { id: 'OVERDUE', label: 'Vadesi Geçenler' },
          { id: 'PENDING', label: 'Bekleyenler' },
          { id: 'PAID', label: 'Tamamlananlar' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Installments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Taksit</th>
                <th className="p-3.5">Fatura No</th>
                <th className="p-3.5">Cari / Muhatap</th>
                <th className="p-3.5">Vade Tarihi</th>
                <th className="p-3.5 text-right">Taksit Tutarı</th>
                <th className="p-3.5 text-center">Durum</th>
                <th className="p-3.5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Taksitler yükleniyor...</td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <CalendarDays className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    Kayıtlı taksit veya ödeme planı bulunamadı.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold font-mono text-brand-600 dark:text-brand-400">
                      {plan.installment_no} / {plan.installment_count}
                    </td>

                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {plan.invoice_no || '-'}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {plan.entity_name || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {plan.entity_type === 'CUSTOMER' ? 'Müşteri Tahsilatı' : 'Tedarikçi Ödemesi'}
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">
                      {formatDate(plan.due_date)}
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {formatCurrency(plan.amount)}
                    </td>

                    <td className="p-3.5 flex justify-center">
                      {plan.status === 'PAID' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ödendi
                        </span>
                      ) : plan.isOverdue ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Gecikti
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Bekliyor
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {plan.status !== 'PAID' && (
                          <button
                            onClick={() => setSelectedPlanForPay(plan)}
                            className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow transition-colors"
                          >
                            Öde / Kapat
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          title="Sil"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Installment Modal */}
      {selectedPlanForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Taksit Ödemesini Onayla
              </h3>
              <button onClick={() => setSelectedPlanForPay(null)} className="p-1 rounded-lg text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handlePayInstallment} className="p-5 space-y-4">
              <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-200 dark:border-brand-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Taksit:</span>
                  <span className="font-bold">{selectedPlanForPay.installment_no} / {selectedPlanForPay.installment_count}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Cari:</span>
                  <span className="font-bold">{selectedPlanForPay.entity_name}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-brand-200 dark:border-brand-800">
                  <span>Taksit Tutarı:</span>
                  <span className="text-brand-600 font-mono">{formatCurrency(selectedPlanForPay.amount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ödeme / Tahsilat Hesabı
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
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
                  Ödeme Tarihi
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForPay(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
                >
                  {payLoading ? 'İşleniyor...' : 'Taksiti Kapat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Yeni Taksit / Vade Planı Ekle
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cari Türü</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddEntityType('CUSTOMER');
                      if (customers.length > 0) setAddEntityId(customers[0].id);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      addEntityType === 'CUSTOMER' ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-300'
                    }`}
                  >
                    Müşteri (Tahsilat)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddEntityType('SUPPLIER');
                      if (suppliers.length > 0) setAddEntityId(suppliers[0].id);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      addEntityType === 'SUPPLIER' ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-300'
                    }`}
                  >
                    Tedarikçi (Ödeme)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Muhatap / Cari Hesap *
                </label>
                <select
                  required
                  value={addEntityId}
                  onChange={(e) => setAddEntityId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                >
                  <option value="">Cari Seçiniz...</option>
                  {(addEntityType === 'CUSTOMER' ? customers : suppliers).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Taksit Tutarı (₺) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addAmount || ''}
                    onChange={(e) => setAddAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vade Tarihi *
                  </label>
                  <input
                    type="date"
                    required
                    value={addDueDate}
                    onChange={(e) => setAddDueDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Açıklama / Not
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2026/04 çek vadeli ödeme"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
                >
                  {addLoading ? 'Kaydediliyor...' : 'Vadeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
