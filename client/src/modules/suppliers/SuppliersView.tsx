import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Download,
  Receipt,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { Supplier } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New Supplier Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTaxOffice, setNewTaxOffice] = useState('');
  const [newTaxNumber, setNewTaxNumber] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Statement / Ekstre Modal
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<any>(null);

  // Edit Supplier Modal
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.getSuppliers({ page, search: search || undefined });
      setSuppliers(res.data);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
      }
    } catch (err) {
      console.error('Tedarikçiler alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      await api.createSupplier({
        title: newTitle,
        contact_person: newContact,
        phone: newPhone,
        email: newEmail,
        tax_office: newTaxOffice,
        tax_number: newTaxNumber,
        address: newAddress,
      });

      setIsAddModalOpen(false);
      setNewTitle('');
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Tedarikçi eklenirken hata oluştu.');
    }
  };

  const handleOpenStatement = async (sup: Supplier) => {
    try {
      const res = await api.getSupplier(sup.id);
      setSelectedSupplierForStatement(res.data);
    } catch (err) {
      alert('Tedarikçi ekstresi yüklenemedi.');
    }
  };

  const handleDeleteSupplier = async (sup: Supplier) => {
    if (!window.confirm(`${sup.title} tedarikçisini silmek istediğinize emin misiniz?`)) return;
    try {
      await api.deleteSupplier(sup.id);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Tedarikçi silinemedi.');
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    try {
      await api.updateSupplier(editingSupplier.id, {
        title: editingSupplier.title,
        contact_person: editingSupplier.contact_person,
        phone: editingSupplier.phone,
        email: editingSupplier.email,
        tax_office: editingSupplier.tax_office,
        tax_number: editingSupplier.tax_number,
        address: editingSupplier.address,
        city: editingSupplier.city,
        notes: editingSupplier.notes,
      });
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Tedarikçi güncellenemedi.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Tedarikçi Yönetimi & Borç Takibi</h2>
          <p className="text-xs text-slate-500">Tedarikçi borçları, cari hareketler ve yapılan ödemeler</p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={api.getExcelExportUrl('suppliers')}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel Dışa Aktar</span>
          </a>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Tedarikçi Ekle</span>
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Cari Kod</th>
                <th className="p-3.5">Tedarikçi Ünvanı</th>
                <th className="p-3.5">İletişim & Yetkili</th>
                <th className="p-3.5">Vergi Dairesi / No</th>
                <th className="p-3.5 text-right">Borcumuz (Bakiye)</th>
                <th className="p-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Tedarikçiler yükleniyor...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">Kayıtlı tedarikçi bulunamadı.</td>
                </tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold font-mono text-brand-600 dark:text-brand-400">{sup.code}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{sup.title}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div>{sup.phone || sup.email || '-'}</div>
                      <div className="text-[11px] text-slate-400">{sup.contact_person}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {sup.tax_office ? `${sup.tax_office} / ${sup.tax_number || '-'}` : '-'}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                      {formatCurrency(sup.balance)}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenStatement(sup)}
                          title="Cari Ekstre Görüntüle"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Ekstre</span>
                        </button>

                        <button
                          onClick={() => setEditingSupplier({ ...sup })}
                          title="Düzenle"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteSupplier(sup)}
                          title="Sil"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* New Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yeni Tedarikçi Ekle</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tedarikçi Ünvanı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Turkcell İletişim A.Ş."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Yetkili Kişi</label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={newTaxOffice}
                    onChange={(e) => setNewTaxOffice(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vergi No</label>
                  <input
                    type="text"
                    value={newTaxNumber}
                    onChange={(e) => setNewTaxNumber(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30"
                >
                  Tedarikçiyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Statement Modal */}
      {selectedSupplierForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tedarikçi Cari Ekstresi: {selectedSupplierForStatement.supplier.title}
              </h3>
              <button onClick={() => setSelectedSupplierForStatement(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5">Tarih</th>
                    <th className="p-2.5">Belge No</th>
                    <th className="p-2.5">Açıklama</th>
                    <th className="p-2.5 text-right">Borç (Ödeme)</th>
                    <th className="p-2.5 text-right">Alacak (Fatura)</th>
                    <th className="p-2.5 text-right">Kalan Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {selectedSupplierForStatement.ledger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">Hareket bulunamadı.</td>
                    </tr>
                  ) : (
                    selectedSupplierForStatement.ledger.map((row: any) => (
                      <tr key={row.id}>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">{formatDate(row.date)}</td>
                        <td className="p-2.5 font-mono text-brand-600">{row.document_no || '-'}</td>
                        <td className="p-2.5 text-slate-500">{row.description}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600">{row.debt > 0 ? formatCurrency(row.debt) : '-'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-600">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tedarikçi Bilgilerini Düzenle</h3>
              <button onClick={() => setEditingSupplier(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupplier} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tedarikçi Ünvanı *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.title}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, title: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Yetkili Kişi</label>
                  <input
                    type="text"
                    value={editingSupplier.contact_person || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, contact_person: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">E-Posta</label>
                  <input
                    type="email"
                    value={editingSupplier.email || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Şehir</label>
                  <input
                    type="text"
                    value={editingSupplier.city || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, city: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={editingSupplier.tax_office || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, tax_office: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vergi No</label>
                  <input
                    type="text"
                    value={editingSupplier.tax_number || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, tax_number: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
