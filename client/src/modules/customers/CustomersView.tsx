import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  CreditCard,
  FileText,
  Trash2,
  X,
  Building,
  Phone,
  Mail,
  Receipt,
  AlertCircle,
  Eye,
  Edit2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Customer } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTaxOffice, setNewTaxOffice] = useState('');
  const [newTaxNumber, setNewTaxNumber] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('İstanbul');
  const [newCreditLimit, setNewCreditLimit] = useState(100000);
  const [newPaymentTerm, setNewPaymentTerm] = useState(30);

  // Statement / Ekstre Modal
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<any>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Edit Customer Modal
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // High-Security Delete Customer Modal State
  const [deleteModalCustomer, setDeleteModalCustomer] = useState<Customer | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({ page, search: search || undefined });
      setCustomers(res.data);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
      }
    } catch (err) {
      console.error('Müşteriler alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      await api.createCustomer({
        title: newTitle,
        contact_person: newContact,
        phone: newPhone,
        email: newEmail,
        tax_office: newTaxOffice,
        tax_number: newTaxNumber,
        address: newAddress,
        city: newCity,
        credit_limit: newCreditLimit,
        payment_term_days: newPaymentTerm,
      });

      setIsAddModalOpen(false);
      setNewTitle('');
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Müşteri eklenirken hata oluştu.');
    }
  };

  const handleOpenStatement = async (cust: Customer) => {
    try {
      setStatementLoading(true);
      const res = await api.getCustomer(cust.id);
      setSelectedCustomerForStatement(res.data);
    } catch (err) {
      alert('Cari ekstre yüklenemedi.');
    } finally {
      setStatementLoading(false);
    }
  };

  const handleDelete = (cust: Customer) => {
    setDeleteModalCustomer(cust);
    setDeleteConfirmText('');
    setDeletePassword('');
    setDeleteError(null);
  };

  const handleConfirmDeleteCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalCustomer) return;
    setDeleteError(null);

    const norm = deleteConfirmText.trim().toUpperCase().replace(/İ/g, 'I');
    if (norm !== 'OKUDUM ANLADIM') {
      setDeleteError('Onay metni hatalı. Lütfen kutuya tam olarak "OKUDUM ANLADIM" yazınız.');
      return;
    }

    if (!deletePassword) {
      setDeleteError('Silme işlemini onaylamak için hesap şifrenizi girmeniz zorunludur.');
      return;
    }

    setDeleteLoading(true);
    try {
      await api.deleteCustomer(deleteModalCustomer.id, {
        confirmText: 'OKUDUM ANLADIM',
        password: deletePassword,
      });
      setDeleteModalCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      setDeleteError(err.message || 'Müşteri silme işlemi başarısız.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      await api.updateCustomer(editingCustomer.id, {
        title: editingCustomer.title,
        contact_person: editingCustomer.contact_person,
        phone: editingCustomer.phone,
        email: editingCustomer.email,
        tax_office: editingCustomer.tax_office,
        tax_number: editingCustomer.tax_number,
        address: editingCustomer.address,
        city: editingCustomer.city,
        credit_limit: editingCustomer.credit_limit,
        payment_term_days: editingCustomer.payment_term_days,
        notes: editingCustomer.notes,
      });
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Müşteri güncellenemedi.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Müşteri ve Cari Hesaplar</h2>
          <p className="text-xs text-slate-500">Müşteri kartları, açık bakiyeler ve cari hesap ekstreleri</p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={api.getExcelExportUrl('customers')}
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
            <span>Yeni Müşteri Ekle</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Firma Adı, Cari Kod, Vergi No veya Telefon Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>
      </div>

      {/* Customer Cards & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Cari Kod</th>
                <th className="p-3.5">Firma / Müşteri Ünvanı</th>
                <th className="p-3.5">İletişim & Şehir</th>
                <th className="p-3.5">Vergi Dairesi / No</th>
                <th className="p-3.5">Vade / Risk Limiti</th>
                <th className="p-3.5 text-right">Güncel Bakiye (Alacak)</th>
                <th className="p-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Müşteriler yükleniyor...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    Kayıtlı müşteri bulunamadı.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-brand-600 dark:text-brand-400">
                      {cust.code}
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{cust.title}</div>
                      {cust.contact_person && (
                        <div className="text-[11px] text-slate-400">Yetkili: {cust.contact_person}</div>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div>{cust.phone || '-'}</div>
                      <div className="text-[11px] text-slate-400">{cust.city || 'Belirtilmedi'}</div>
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {cust.tax_office ? `${cust.tax_office} / ${cust.tax_number || '-'}` : '-'}
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-300 text-[11px]">
                      <div>{cust.payment_term_days} Gün Vade</div>
                      <div className="text-slate-400">Risk: {formatCurrency(cust.credit_limit)}</div>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-sm">
                      <span className={cust.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
                        {formatCurrency(cust.balance)}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenStatement(cust)}
                          title="Cari Ekstre Görüntüle"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Ekstre</span>
                        </button>

                        <button
                          onClick={() => setEditingCustomer({ ...cust })}
                          title="Düzenle"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(cust)}
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

      {/* New Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yeni Müşteri (Cari) Tanımla</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Firma / Müşteri Ünvanı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: ABC Lojistik ve Ticaret A.Ş."
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
                    placeholder="Ad Soyad"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                  <input
                    type="text"
                    placeholder="+90 (212) 000 0000"
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
                    placeholder="Maslak V.D."
                    value={newTaxOffice}
                    onChange={(e) => setNewTaxOffice(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vergi Numarası / T.C.</label>
                  <input
                    type="text"
                    placeholder="10 veya 11 haneli"
                    value={newTaxNumber}
                    onChange={(e) => setNewTaxNumber(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Standart Vade (Gün)</label>
                  <input
                    type="number"
                    value={newPaymentTerm}
                    onChange={(e) => setNewPaymentTerm(parseInt(e.target.value) || 30)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Risk Limiti (TL)</label>
                  <input
                    type="number"
                    value={newCreditLimit}
                    onChange={(e) => setNewCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Adres & Şehir</label>
                <input
                  type="text"
                  placeholder="Fatura adresi..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                />
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
                  Müşteriyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement / Cari Ekstre Modal */}
      {selectedCustomerForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cari Hesap Ekstresi: {selectedCustomerForStatement.customer.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cari Kod: {selectedCustomerForStatement.customer.code} • Güncel Bakiye:{' '}
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(selectedCustomerForStatement.customer.balance)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerForStatement(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5">Tarih</th>
                    <th className="p-2.5">İşlem Türü</th>
                    <th className="p-2.5">Belge No</th>
                    <th className="p-2.5">Açıklama</th>
                    <th className="p-2.5 text-right">Borç (Fatura)</th>
                    <th className="p-2.5 text-right">Alacak (Tahsilat)</th>
                    <th className="p-2.5 text-right">Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {selectedCustomerForStatement.ledger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Bu cariye ait henüz bir hareket kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    selectedCustomerForStatement.ledger.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">{formatDate(row.date)}</td>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{row.transaction_type}</td>
                        <td className="p-2.5 font-mono text-brand-600">{row.document_no || '-'}</td>
                        <td className="p-2.5 text-slate-500">{row.description}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {row.debt > 0 ? formatCurrency(row.debt) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                          {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-brand-600">
                          {formatCurrency(row.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Müşteri Bilgilerini Düzenle</h3>
              <button onClick={() => setEditingCustomer(null)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Müşteri / Firma Ünvanı *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.title}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, title: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Yetkili Kişi</label>
                  <input
                    type="text"
                    value={editingCustomer.contact_person || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, contact_person: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">E-Posta</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Şehir</label>
                  <input
                    type="text"
                    value={editingCustomer.city || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={editingCustomer.tax_office || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, tax_office: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vergi No</label>
                  <input
                    type="text"
                    value={editingCustomer.tax_number || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, tax_number: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Risk Limiti (TL)</label>
                  <input
                    type="number"
                    value={editingCustomer.credit_limit || 0}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, credit_limit: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-mono rounded-lg border p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vade (Gün)</label>
                  <input
                    type="number"
                    value={editingCustomer.payment_term_days || 30}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, payment_term_days: parseInt(e.target.value) || 30 })}
                    className="w-full text-xs font-mono rounded-lg border p-2"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HIGH-SECURITY CUSTOMER DELETE MODAL */}
      {deleteModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-rose-600/50 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-rose-200 dark:border-rose-950/80 flex items-center justify-between bg-rose-50 dark:bg-rose-950/40">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Müşteri / Cari Silme Güvenlik Onayı</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteCustomer} className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Kritik İşlem & Veri Silme Uyarısı</span>
                </div>
                <p>
                  <strong>"{deleteModalCustomer.title}"</strong> ({deleteModalCustomer.code}) müşterisini kalıcı olarak silmek üzeresiniz.
                </p>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                  Cari kart silindiğinde ilişkili faturalar ve finansal geçmiş arşivlenecektir. Bu işlem yetkisiz veya kazara silinmeyi engellemek için çift onay gerektirir.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Güvenlik Teyidi: Kutucuğa büyük harflerle <strong>OKUDUM ANLADIM</strong> yazınız *
                </label>
                <input
                  type="text"
                  required
                  placeholder="OKUDUM ANLADIM"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full text-center font-bold tracking-wider text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-rose-600 dark:text-rose-400 py-2.5 px-3 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  2. Son Yetkilendirme: Hesap Şifrenizi Giriniz *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 px-3 outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteModalCustomer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={
                    deleteLoading ||
                    deleteConfirmText.trim().toUpperCase().replace(/İ/g, 'I') !== 'OKUDUM ANLADIM' ||
                    !deletePassword
                  }
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Trash2 className={`w-4 h-4 ${deleteLoading ? 'animate-spin' : ''}`} />
                  <span>{deleteLoading ? 'Siliniyor...' : 'Müşteriyi Sil'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
