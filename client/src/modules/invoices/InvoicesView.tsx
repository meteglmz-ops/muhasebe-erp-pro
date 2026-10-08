import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  CreditCard,
  Trash2,
  ExternalLink,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  CheckCheck,
  X,
  Send,
  RefreshCw,
} from 'lucide-react';
import { Invoice, CashBank } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PaymentModal } from '../../components/modals/PaymentModal';
import { SendInvoiceModal } from '../../components/modals/SendInvoiceModal';
import { PrintInvoicesModal } from '../../components/modals/PrintInvoicesModal';

interface InvoicesViewProps {
  onOpenInvoiceModal: (type: 'SALES' | 'PURCHASE') => void;
  cashBanks: CashBank[];
  refreshTrigger?: number;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onOpenInvoiceModal,
  cashBanks,
  refreshTrigger,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Selection & Bulk Actions
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printInvoiceIds, setPrintInvoiceIds] = useState<string[]>([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Payment modal state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  // Send modal state
  const [selectedInvoiceForSend, setSelectedInvoiceForSend] = useState<Invoice | null>(null);

  // Detail modal state
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleOpenDetail = async (inv: Invoice) => {
    try {
      setDetailLoading(true);
      const res = await api.getInvoice(inv.id);
      setSelectedInvoiceForDetail(res.data);
    } catch (err: any) {
      alert(err.message || 'Fatura detayları yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApproveInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`${invoice.invoice_no} numaralı taslak faturayı onaylayarak carisine ve stoğuna yansıtmak istiyor musunuz?`)) {
      return;
    }
    try {
      await api.approveInvoice(invoice.id);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Fatura onaylanamadı.');
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.getInvoices({
        type: type === 'ALL' ? undefined : type,
        status: status && status !== 'ALL' ? status : undefined,
        search: search.trim() ? search.trim() : undefined,
        page,
      });
      setInvoices(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
      }
    } catch (err) {
      console.error('Faturalar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [type, status, page, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      const blob = await api.downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fatura-${invoice.invoice_no}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('PDF indirilemedi. Lütfen tekrar deneyin.');
    }
  };

  const handlePrintSingle = (id: string) => {
    setPrintInvoiceIds([id]);
    setIsPrintModalOpen(true);
  };

  const handleToggleSelectAll = () => {
    if (selectedInvoiceIds.length === invoices.length && invoices.length > 0) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(invoices.map((i) => i.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkPrint = () => {
    if (selectedInvoiceIds.length === 0) return;
    setPrintInvoiceIds(selectedInvoiceIds);
    setIsPrintModalOpen(true);
  };

  const handleBulkDownload = async () => {
    if (selectedInvoiceIds.length === 0) return;
    setBulkDownloading(true);
    try {
      for (const id of selectedInvoiceIds) {
        const inv = invoices.find((i) => i.id === id);
        if (!inv) continue;
        const blob = await api.downloadInvoicePdf(id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fatura-${inv.invoice_no}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (err) {
      alert('Toplu PDF indirme sırasında bir hata oluştu.');
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoiceIds.length === 0) return;
    if (!window.confirm(`Seçilen ${selectedInvoiceIds.length} faturayı silmek istediğinize emin misiniz?`)) return;
    try {
      await Promise.all(selectedInvoiceIds.map((id) => api.deleteInvoice(id)));
      setSelectedInvoiceIds([]);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Faturalar silinemedi.');
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`${invoice.invoice_no} numaralı faturayı silmek istediğinize emin misiniz? (Çöp kutusuna taşınacaktır)`)) {
      return;
    }
    try {
      await api.deleteInvoice(invoice.id);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Fatura silinemedi.');
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'PAID':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" /> Ödendi
          </span>
        );
      case 'PARTIAL_PAID':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Kısmi Ödendi
          </span>
        );
      case 'ISSUED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300 dark:border-blue-800 flex items-center gap-1 w-fit">
            Onaylandı
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1 w-fit">
            Taslak
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1 w-fit">
            <AlertCircle className="w-3 h-3" /> Vadesi Geçti
          </span>
        );
      default:
        return <span className="text-xs">{st}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 rounded-sm">
          <button
            onClick={() => {
              setType('ALL');
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold transition-all rounded-sm ${
              type === 'ALL' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tüm Faturalar
          </button>
          <button
            onClick={() => {
              setType('SALES');
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold transition-all rounded-sm ${
              type === 'SALES' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Satış Faturaları
          </button>
          <button
            onClick={() => {
              setType('PURCHASE');
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold transition-all rounded-sm ${
              type === 'PURCHASE' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Alış / Tedarik Faturaları
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInvoices()}
            title="Listeyi Yenile"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>

          <a
            href={api.getExcelExportUrl('invoices')}
            download
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 text-xs font-bold rounded-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel Dışa Aktar</span>
          </a>

          <button
            onClick={() => onOpenInvoiceModal(type === 'PURCHASE' ? 'PURCHASE' : 'SALES')}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold border border-brand-700 shadow-sm rounded-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{type === 'PURCHASE' ? 'Yeni Alış Faturası' : 'Yeni Fatura Kes'}</span>
          </button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Actions Bar */}
      {selectedInvoiceIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3 border border-slate-700 shadow-xl flex flex-wrap items-center justify-between gap-3 rounded-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs bg-brand-600 px-2.5 py-1 rounded-sm text-white font-mono">
              {selectedInvoiceIds.length} Fatura Seçildi
            </span>
            <span className="text-xs text-slate-300">
              Toplu İşlemler:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-sm shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Toplu Yazdır ({selectedInvoiceIds.length})</span>
            </button>

            <button
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-sm shadow-sm transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{bulkDownloading ? 'İndiriliyor...' : `Toplu PDF İndir (${selectedInvoiceIds.length})`}</span>
            </button>

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-sm shadow-sm transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Toplu Sil</span>
            </button>

            <button
              onClick={() => setSelectedInvoiceIds([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-slate-800 transition-colors"
              title="Seçimi Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 rounded-sm">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Fatura No veya Müşteri Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {[
            { id: '', label: 'Tümü' },
            { id: 'ISSUED', label: 'Onaylandı' },
            { id: 'PARTIAL_PAID', label: 'Kısmi Ödendi' },
            { id: 'PAID', label: 'Ödendi' },
            { id: 'DRAFT', label: 'Taslak' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setStatus(st.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors ${
                status === st.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden rounded-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedInvoiceIds.length === invoices.length}
                    onChange={handleToggleSelectAll}
                    className="rounded-sm border-slate-400 text-brand-600 cursor-pointer"
                  />
                </th>
                <th className="p-3">Fatura No</th>
                <th className="p-3">Tür</th>
                <th className="p-3">Cari (Müşteri / Tedarikçi)</th>
                <th className="p-3">Düzenleme Tarihi</th>
                <th className="p-3">Vade</th>
                <th className="p-3 text-right">Genel Toplam</th>
                <th className="p-3 text-right">Kalan Bakiye</th>
                <th className="p-3 text-center">Durum</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Faturalar yükleniyor...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    Henüz kayıtlı fatura bulunmuyor. Yeni bir fatura keserek başlayabilirsiniz.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      selectedInvoiceIds.includes(inv.id) ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(inv.id)}
                        onChange={() => handleToggleSelect(inv.id)}
                        className="rounded-sm border-slate-400 text-brand-600 cursor-pointer"
                      />
                    </td>
                    {/* Invoice No */}
                    <td className="p-3.5 font-bold font-mono text-brand-600 dark:text-brand-400">
                      {inv.invoice_no}
                    </td>

                    {/* Invoice Type Badge */}
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.invoice_type === 'SALES'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      }`}>
                        {inv.invoice_type === 'SALES' ? 'SATIŞ' : 'ALIŞ'}
                      </span>
                    </td>

                    {/* Customer or Supplier */}
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {inv.customer_title || inv.supplier_title || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {inv.payment_method}
                      </div>
                    </td>

                    {/* Issue Date */}
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {formatDate(inv.issue_date)}
                    </td>

                    {/* Due Date */}
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {formatDate(inv.due_date)}
                    </td>

                    {/* Grand Total */}
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inv.grand_total, inv.currency)}
                    </td>

                    {/* Remaining */}
                    <td className="p-3.5 text-right font-mono font-bold">
                      <span className={inv.remaining_amount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}>
                        {formatCurrency(inv.remaining_amount, inv.currency)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 flex justify-center">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetail(inv)}
                          title="Fatura Detayı & Kalemler"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Approve Draft */}
                        {inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handleApproveInvoice(inv)}
                            title="Taslağı Onayla ve Kaydet"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold transition-all shadow-sm"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Onayla</span>
                          </button>
                        )}

                        {/* PDF View / Print */}
                        <button
                          onClick={() => handlePrintSingle(inv.id)}
                          title="Faturayı Önizle ve Yazdır"
                          className="p-1.5 rounded-sm text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* PDF Download */}
                        <button
                          onClick={() => handleDownloadPdf(inv)}
                          title="PDF İndir"
                          className="p-1.5 rounded-sm text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Send Invoice (E-Fatura / E-Posta) */}
                        <button
                          onClick={() => setSelectedInvoiceForSend(inv)}
                          title="Faturayı Gönder (GİB E-Fatura veya E-Posta)"
                          className={`p-1.5 rounded-lg transition-colors ${
                            inv.is_einvoice
                              ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40'
                              : 'text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        {/* Make Payment / Collection */}
                        {inv.remaining_amount > 0 && inv.status !== 'DRAFT' && (
                          <button
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            title={type === 'SALES' ? 'Tahsilat Al' : 'Ödeme Yap'}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{type === 'SALES' ? 'Tahsilat' : 'Öde'}</span>
                          </button>
                        )}

                        {/* Soft Delete */}
                        <button
                          onClick={() => handleDeleteInvoice(inv)}
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Sayfa {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-30"
              >
                Önceki
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-30"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedInvoiceForPayment && (
        <PaymentModal
          isOpen={true}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onSuccess={() => {
            fetchInvoices();
          }}
          invoice={selectedInvoiceForPayment}
          cashBanks={cashBanks}
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoiceForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedInvoiceForDetail.invoice.invoice_no}</span>
                    {getStatusBadge(selectedInvoiceForDetail.invoice.status)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedInvoiceForDetail.invoice.customer_title || selectedInvoiceForDetail.invoice.supplier_title} • {formatDate(selectedInvoiceForDetail.invoice.issue_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintSingle(selectedInvoiceForDetail.invoice.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Yazdır</span>
                </button>
                <button
                  onClick={() => handleDownloadPdf(selectedInvoiceForDetail.invoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF İndir</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceForDetail(null)}
                  className="p-1.5 rounded-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[11px] text-slate-500 font-medium">Ara Toplam</div>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {formatCurrency(selectedInvoiceForDetail.invoice.subtotal, selectedInvoiceForDetail.invoice.currency)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[11px] text-slate-500 font-medium">Toplam KDV</div>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {formatCurrency(selectedInvoiceForDetail.invoice.vat_total, selectedInvoiceForDetail.invoice.currency)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[11px] text-slate-500 font-medium">Genel Toplam</div>
                  <div className="text-sm font-black font-mono text-brand-600 dark:text-brand-400 mt-1">
                    {formatCurrency(selectedInvoiceForDetail.invoice.grand_total, selectedInvoiceForDetail.invoice.currency)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[11px] text-slate-500 font-medium">Kalan Bakiye</div>
                  <div className={`text-sm font-black font-mono mt-1 ${
                    selectedInvoiceForDetail.invoice.remaining_amount > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {formatCurrency(selectedInvoiceForDetail.invoice.remaining_amount, selectedInvoiceForDetail.invoice.currency)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Fatura Kalemleri</h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Açıklama</th>
                        <th className="p-3 text-right">Miktar</th>
                        <th className="p-3 text-right">Birim Fiyat</th>
                        <th className="p-3 text-right">KDV %</th>
                        <th className="p-3 text-right">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedInvoiceForDetail.items?.map((it: any, idx: number) => (
                        <tr key={it.id || idx}>
                          <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-medium text-slate-900 dark:text-white">{it.name}</td>
                          <td className="p-3 text-right font-mono">{it.quantity} {it.unit}</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(it.unit_price)}</td>
                          <td className="p-3 text-right font-mono">%{it.vat_rate}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(it.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Installment Plans & Payments if any */}
              {selectedInvoiceForDetail.paymentPlans?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Ödeme Planı ve Taksitler</h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-2.5">Taksit</th>
                          <th className="p-2.5">Vade Tarihi</th>
                          <th className="p-2.5 text-right">Tutar</th>
                          <th className="p-2.5 text-center">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedInvoiceForDetail.paymentPlans.map((pp: any) => (
                          <tr key={pp.id}>
                            <td className="p-2.5 font-bold">{pp.installment_no} / {pp.installment_count}</td>
                            <td className="p-2.5 font-mono">{formatDate(pp.due_date)}</td>
                            <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(pp.amount)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pp.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {pp.status === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Invoice Modal */}
      <SendInvoiceModal
        isOpen={!!selectedInvoiceForSend}
        onClose={() => setSelectedInvoiceForSend(null)}
        invoice={selectedInvoiceForSend}
        onInvoiceSent={fetchInvoices}
      />

      {/* Print Invoices Modal (Single & Bulk) */}
      <PrintInvoicesModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoiceIds={printInvoiceIds}
      />
    </div>
  );
};
