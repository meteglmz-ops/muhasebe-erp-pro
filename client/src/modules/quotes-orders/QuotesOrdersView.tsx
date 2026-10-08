import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  ArrowRight,
  CheckCircle,
  FileText,
  Clock,
  X,
  Package,
  Trash2,
  ShoppingCart,
} from 'lucide-react';
import { Customer, Product } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface QuotesOrdersViewProps {
  customers: Customer[];
  products: Product[];
  onNavigateToInvoices: () => void;
}

export const QuotesOrdersView: React.FC<QuotesOrdersViewProps> = ({
  customers,
  products,
  onNavigateToInvoices,
}) => {
  const [activeTab, setActiveTab] = useState<'QUOTES' | 'ORDERS'>('QUOTES');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Quote Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [items, setItems] = useState([
    { productId: products[0]?.id || '', name: products[0]?.name || 'Bulut ERP Kurumsal Lisans', quantity: 1, unit: 'Adet', unitPrice: 48000, vatRate: 20 },
  ]);

  // New Order Modal
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [orderCustomerId, setOrderCustomerId] = useState(customers[0]?.id || '');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await api.getQuotes();
      setQuotes(res.data);
    } catch (err) {
      console.error('Teklifler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders();
      setOrders(res.data);
    } catch (err) {
      console.error('Siparişler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'QUOTES') {
      fetchQuotes();
    } else {
      fetchOrders();
    }
  }, [activeTab]);

  const handleConvertToInvoice = async (quote: any) => {
    if (!window.confirm(`${quote.quote_no} numaralı teklifi resmi satış faturasına dönüştürmek istiyor musunuz?`)) {
      return;
    }

    try {
      await api.convertQuoteToInvoice(quote.id);
      alert('Teklif başarıyla faturaya dönüştürüldü! Fatura numarası oluşturuldu.');
      fetchQuotes();
      onNavigateToInvoices();
    } catch (err: any) {
      alert(err.message || 'Dönüştürme başarısız.');
    }
  };

  const handleConvertOrderToInvoice = async (order: any) => {
    if (!window.confirm(`${order.order_no} numaralı siparişi faturaya dönüştürmek istiyor musunuz?`)) {
      return;
    }
    try {
      await api.convertOrderToInvoice(order.id);
      alert('Sipariş başarıyla faturaya dönüştürüldü! Fatura numarası oluşturuldu.');
      fetchOrders();
      onNavigateToInvoices();
    } catch (err: any) {
      alert(err.message || 'Dönüştürme başarısız.');
    }
  };

  const handleDeleteQuote = async (quote: any) => {
    if (!window.confirm(`${quote.quote_no} numaralı teklifi silmek istediğinize emin misiniz?`)) return;
    try {
      await api.deleteQuote(quote.id);
      fetchQuotes();
    } catch (err: any) {
      alert(err.message || 'Teklif silinemedi.');
    }
  };

  const handleDeleteOrder = async (order: any) => {
    if (!window.confirm(`${order.order_no} numaralı siparişi silmek istediğinize emin misiniz?`)) return;
    try {
      await api.deleteOrder(order.id);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Sipariş silinemedi.');
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    try {
      await api.createQuote({
        customer_id: selectedCustomerId,
        issue_date: issueDate,
        valid_until: validUntil,
        notes: quoteNotes,
        items,
      });

      setIsAddModalOpen(false);
      fetchQuotes();
    } catch (err: any) {
      alert(err.message || 'Teklif oluşturulamadı.');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCustomerId) return;

    try {
      await api.createOrder({
        customer_id: orderCustomerId,
        order_date: orderDate,
        total_amount: orderTotal,
        notes: orderNotes,
      });

      setIsAddOrderOpen(false);
      setOrderTotal(0);
      setOrderNotes('');
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Sipariş oluşturulamadı.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Teklif ve Satış Siparişleri
          </h2>
          <p className="text-xs text-slate-500">
            Hazırlanan fiyat teklifleri, bekleyen siparişler ve tek tuşla faturaya dönüştürme motoru
          </p>
        </div>

        {/* Tab Switcher & Add Button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('QUOTES')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'QUOTES'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Teklifler</span>
            </button>
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ORDERS'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Siparişler</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'QUOTES') {
                setIsAddModalOpen(true);
              } else {
                setIsAddOrderOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'QUOTES' ? 'Yeni Teklif Hazırla' : 'Yeni Sipariş Ekle'}</span>
          </button>
        </div>
      </div>

      {/* Quotes Table */}
      {activeTab === 'QUOTES' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Teklif No</th>
                  <th className="p-3.5">Müşteri</th>
                  <th className="p-3.5">Tarih</th>
                  <th className="p-3.5">Geçerlilik</th>
                  <th className="p-3.5 text-right">Teklif Tutarı</th>
                  <th className="p-3.5 text-center">Durum</th>
                  <th className="p-3.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Teklifler yükleniyor...</td>
                  </tr>
                ) : quotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <FileCheck2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      Henüz oluşturulmuş teklif bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  quotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold font-mono text-brand-600 dark:text-brand-400">
                        {q.quote_no}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {q.customer_title}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">
                        {formatDate(q.issue_date)}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">
                        {formatDate(q.valid_until)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(q.grand_total)}
                      </td>
                      <td className="p-3.5 flex justify-center">
                        {q.status === 'CONVERTED_TO_INVOICE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Faturaya Dönüştü
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Aktif Teklif
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {q.status !== 'CONVERTED_TO_INVOICE' && (
                            <button
                              onClick={() => handleConvertToInvoice(q)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Faturaya Çevir</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteQuote(q)}
                            title="Sil"
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
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
      )}

      {/* Orders Table */}
      {activeTab === 'ORDERS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Sipariş No</th>
                  <th className="p-3.5">Müşteri</th>
                  <th className="p-3.5">Sipariş Tarihi</th>
                  <th className="p-3.5 text-right">Tutar</th>
                  <th className="p-3.5 text-center">Durum</th>
                  <th className="p-3.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Siparişler yükleniyor...</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      Kayıtlı satış siparişi bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold font-mono text-brand-600 dark:text-brand-400">
                        {o.order_no}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {o.customer_title}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">
                        {formatDate(o.order_date)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td className="p-3.5 flex justify-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {o.status === 'PENDING' ? 'Hazırlanıyor' : o.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {o.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleConvertOrderToInvoice(o)}
                              title="Siparişi Satış Faturasına Dönüştür"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-colors"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Faturaya Dönüştür</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(o)}
                            title="Sil"
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
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
      )}

      {/* New Quote Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yeni Teklif Hazırla</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Müşteri Seçiniz</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teklif Tarihi</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Geçerlilik Tarihi</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teklif Edilen Hizmet / Ürün</label>
                <input
                  type="text"
                  value={items[0].name}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[0].name = e.target.value;
                    setItems(newItems);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Birim Fiyat (TL)</label>
                  <input
                    type="number"
                    value={items[0].unitPrice}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[0].unitPrice = parseFloat(e.target.value) || 0;
                      setItems(newItems);
                    }}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Miktar</label>
                  <input
                    type="number"
                    value={items[0].quantity}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[0].quantity = parseFloat(e.target.value) || 1;
                      setItems(newItems);
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teklif Notları</label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                />
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
                  Teklifi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {isAddOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yeni Satış Siparişi Ekle</h3>
              <button onClick={() => setIsAddOrderOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Müşteri Seçiniz *</label>
                <select
                  value={orderCustomerId}
                  onChange={(e) => setOrderCustomerId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sipariş Tarihi</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sipariş Tutarı (TL) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={orderTotal}
                    onChange={(e) => setOrderTotal(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sipariş Notları</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOrderOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
                >
                  Siparişi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
