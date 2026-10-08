import React, { useState, useEffect } from 'react';
import {
  ArrowUpDown,
  Plus,
  TrendingUp,
  TrendingDown,
  Repeat,
  Trash2,
  X,
  Filter,
  CreditCard,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { IncomeExpense, CashBank } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface IncomeExpensesViewProps {
  cashBanks: CashBank[];
  onRefreshStats: () => void;
}

export const IncomeExpensesView: React.FC<IncomeExpensesViewProps> = ({
  cashBanks,
  onRefreshStats,
}) => {
  const [items, setItems] = useState<IncomeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // New Income/Expense Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newType, setNewType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newVatRate, setNewVatRate] = useState<number>(20);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');
  const [newAccountId, setNewAccountId] = useState(cashBanks[0]?.id || '');
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newRecurrence, setNewRecurrence] = useState('MONTHLY');
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryId, setNewCategoryId] = useState('');

  // Quick preset shortcuts for fast accounting entry
  const QUICK_PRESETS = [
    { title: 'Ofis Kirası', type: 'EXPENSE', vatRate: 20, isRecurring: true, recurrence: 'MONTHLY', notes: 'Aylık Ofis / İşyeri Kirası' },
    { title: 'Personel Maaş', type: 'EXPENSE', vatRate: 0, isRecurring: true, recurrence: 'MONTHLY', notes: 'Personel Net Maaş Ödemesi' },
    { title: 'Elektrik & Su', type: 'EXPENSE', vatRate: 20, isRecurring: false, recurrence: 'MONTHLY', notes: 'Ofis Elektrik / Su Faturası' },
    { title: 'İnternet & Tel', type: 'EXPENSE', vatRate: 20, isRecurring: true, recurrence: 'MONTHLY', notes: 'Kurumsal İnternet ve İletişim' },
    { title: 'Yemek & Temsil', type: 'EXPENSE', vatRate: 10, isRecurring: false, recurrence: 'MONTHLY', notes: 'Yemek ve Temsil Giderleri' },
    { title: 'Hizmet Geliri', type: 'INCOME', vatRate: 20, isRecurring: false, recurrence: 'MONTHLY', notes: 'Danışmanlık ve Hizmet Tahsilatı' },
    { title: 'Yazılım & Lisans', type: 'EXPENSE', vatRate: 20, isRecurring: true, recurrence: 'MONTHLY', notes: 'Bulut Altyapı ve Lisanslama' },
  ];

  const handleApplyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setNewType(preset.type as any);
    setNewVatRate(preset.vatRate);
    setNewIsRecurring(preset.isRecurring);
    setNewRecurrence(preset.recurrence);
    setNewNotes(preset.notes);
    setNewAmount(0);
    setIsAddModalOpen(true);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.getIncomeExpenses({
        type,
        recurring: recurringOnly ? true : undefined,
      });
      setItems(res.data || []);
    } catch (err) {
      console.error('Kayıtlar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error('Kategoriler alınamadı:', err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [type, recurringOnly]);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Seçilen ${selectedIds.length} kaydı silmek istediğinize emin misiniz?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => api.request(`/income-expenses/${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      fetchItems();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Kayıtlar silinemedi.');
    }
  };

  const handleBulkExportCsv = () => {
    const selectedItems = items.filter((it) => selectedIds.includes(it.id));
    if (selectedItems.length === 0) return;
    let csv = 'Tarih,Tür,Kategori,Açıklama,Tutar,KDV,Periyot\n';
    selectedItems.forEach((it) => {
      csv += `"${it.date}","${it.type}","${it.category_name || '-'}","${it.notes || '-'}","${it.total_amount}","%${it.vat_rate}","${it.is_recurring ? it.recurrence_interval : 'Tek Seferlik'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gelir-Gider-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || newAmount <= 0) return;

    try {
      await api.createIncomeExpense({
        type: newType,
        category_id: newCategoryId || null,
        account_id: newAccountId || null,
        date: newDate,
        amount: newAmount,
        vat_rate: newVatRate,
        is_recurring: newIsRecurring ? 1 : 0,
        recurrence_interval: newIsRecurring ? newRecurrence : null,
        notes: newNotes,
        payment_status: 'PAID',
      });

      setIsAddModalOpen(false);
      setNewAmount(0);
      setNewNotes('');
      fetchItems();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Kayıt eklenemedi.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    try {
      await api.request(`/income-expenses/${id}`, { method: 'DELETE' });
      fetchItems();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Silinemedi.');
    }
  };

  const filteredItems = items.filter((it) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (it.notes && it.notes.toLowerCase().includes(s)) ||
      (it.category_name && it.category_name.toLowerCase().includes(s)) ||
      (it.account_name && it.account_name.toLowerCase().includes(s))
    );
  });

  const totalAmount = filteredItems.reduce((acc, cur) => acc + cur.total_amount, 0);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white uppercase tracking-wider">
            Gelir ve Gider Yönetimi
          </h2>
          <p className="text-xs text-slate-500">
            Kira, personel, ofis ve operasyonel harcamalar ile tekrarlayan maliyetler
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-sm">
            <span className="text-slate-500">Listelenen Toplam: </span>
            <span className={`font-bold font-mono ${type === 'EXPENSE' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <button
            onClick={() => {
              setNewType(type);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold border border-brand-700 shadow-sm rounded-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{type === 'EXPENSE' ? 'Yeni Gider Ekle' : 'Yeni Gelir Ekle'}</span>
          </button>
        </div>
      </div>

      {/* Quick Presets Bar (Hızlı İşlem Şablonları) */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 rounded-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>Hızlı Gider / Gelir Şablonları:</span>
          <span className="text-[10px] text-slate-400 font-normal">(Tek tıkla otomatik doldur)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p)}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 rounded-sm transition-colors shadow-2xs"
            >
              + {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 border border-slate-300 dark:border-slate-800 rounded-sm shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Type Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-0.5 rounded-sm">
            <button
              onClick={() => {
                setType('EXPENSE');
                setSelectedIds([]);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${
                type === 'EXPENSE' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Giderler</span>
            </button>
            <button
              onClick={() => {
                setType('INCOME');
                setSelectedIds([]);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${
                type === 'INCOME' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Gelirler</span>
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={recurringOnly}
              onChange={(e) => setRecurringOnly(e.target.checked)}
              className="rounded-sm border-slate-400 text-brand-600 cursor-pointer"
            />
            <Repeat className="w-3 h-3 text-brand-500" />
            <span>Tekrarlayanlar</span>
          </label>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Açıklama veya Kategori Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3 border border-slate-700 shadow-xl flex flex-wrap items-center justify-between gap-3 rounded-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs bg-brand-600 px-2.5 py-1 rounded-sm text-white font-mono">
              {selectedIds.length} Kayıt Seçildi
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Seçilen Tutar:{' '}
              {formatCurrency(
                items
                  .filter((it) => selectedIds.includes(it.id))
                  .reduce((acc, cur) => acc + cur.total_amount, 0)
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-sm shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Olarak İndir</span>
            </button>

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-sm shadow-sm transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Toplu Sil ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-slate-800 transition-colors"
              title="Seçimi Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden rounded-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                    onChange={handleToggleSelectAll}
                    className="rounded-sm border-slate-400 text-brand-600 cursor-pointer"
                  />
                </th>
                <th className="p-3">Tarih</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Açıklama & Detay</th>
                <th className="p-3">Ödeme Hesabı</th>
                <th className="p-3">Periyot</th>
                <th className="p-3 text-right">Tutar (KDV Dahil)</th>
                <th className="p-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Kayıtlar yükleniyor...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filteredItems.map((it) => (
                  <tr
                    key={it.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      selectedIds.includes(it.id) ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''
                    }`}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(it.id)}
                        onChange={() => handleToggleSelect(it.id)}
                        className="rounded-sm border-slate-400 text-brand-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{formatDate(it.date)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {it.category_name || 'Genel'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-900 dark:text-white font-medium">{it.notes || '-'}</td>
                    <td className="p-3 text-slate-500 font-medium">{it.account_name || 'Nakit'}</td>
                    <td className="p-3">
                      {it.is_recurring ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-sm border border-brand-200 dark:border-brand-800">
                          <Repeat className="w-3 h-3" />
                          {it.recurrence_interval === 'MONTHLY' ? 'Aylık' : 'Yıllık'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Tek Seferlik</span>
                      )}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${it.type === 'EXPENSE' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {it.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(it.total_amount)}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDelete(it.id)}
                        title="Sil"
                        className="p-1 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {newType === 'EXPENSE' ? 'Yeni Gider Kaydı' : 'Yeni Gelir Kaydı'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ofis Kira Ödemesi, Yemek Masrafı..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tutar</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    placeholder="0.00"
                    value={newAmount || ''}
                    onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">KDV Oranı (%)</label>
                  <select
                    value={newVatRate}
                    onChange={(e) => setNewVatRate(parseInt(e.target.value))}
                    className="w-full text-xs rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                  >
                    <option value={0}>%0 (Muaf)</option>
                    <option value={1}>%1</option>
                    <option value={10}>%10</option>
                    <option value={20}>%20</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full text-xs rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                  >
                    <option value="">Kategori Seçiniz...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ödeme Hesabı</label>
                  <select
                    value={newAccountId}
                    onChange={(e) => setNewAccountId(e.target.value)}
                    className="w-full text-xs rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                  >
                    {cashBanks.map((cb) => (
                      <option key={cb.id} value={cb.id}>
                        {cb.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tarih</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-xs rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                />
              </div>

              {/* Recurring Option */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-sm space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsRecurring}
                    onChange={(e) => setNewIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded-sm"
                  />
                  <span>Tekrarlayan İşlem (Her ay / Her yıl otomatik takip)</span>
                </label>
                {newIsRecurring && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setNewRecurrence('MONTHLY')}
                      className={`px-3 py-1 rounded-sm text-xs font-bold ${
                        newRecurrence === 'MONTHLY' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border text-slate-600'
                      }`}
                    >
                      Aylık
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRecurrence('YEARLY')}
                      className={`px-3 py-1 rounded-sm text-xs font-bold ${
                        newRecurrence === 'YEARLY' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border text-slate-600'
                      }`}
                    >
                      Yıllık
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-sm text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-sm bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
