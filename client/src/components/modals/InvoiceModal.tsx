import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, FileCheck, Sparkles, AlertCircle } from 'lucide-react';
import { Customer, Supplier, Product } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: any) => void;
  defaultType?: 'SALES' | 'PURCHASE';
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
}

interface ModalItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  vatRate: number;
  withholdingRate: number;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'SALES',
  customers,
  suppliers,
  products,
}) => {
  if (!isOpen) return null;

  const [invoiceType, setInvoiceType] = useState<'SALES' | 'PURCHASE'>(defaultType);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [isQuickEntity, setIsQuickEntity] = useState(false);
  const [quickEntityTitle, setQuickEntityTitle] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState('TRY');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [paymentMethod, setPaymentMethod] = useState('HAVALE');
  const [notes, setNotes] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [isInstallmentEnabled, setIsInstallmentEnabled] = useState(false);
  const [status, setStatus] = useState<'ISSUED' | 'DRAFT'>('ISSUED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<ModalItem[]>([
    {
      id: '1',
      name: '',
      quantity: 1,
      unit: 'Adet',
      unitPrice: 0,
      discountPercent: 0,
      vatRate: 20,
      withholdingRate: 0,
    },
  ]);

  // Set default entity
  useEffect(() => {
    if (invoiceType === 'SALES' && customers.length > 0 && !selectedEntityId) {
      setSelectedEntityId(customers[0].id);
    } else if (invoiceType === 'PURCHASE' && suppliers.length > 0 && !selectedEntityId) {
      setSelectedEntityId(suppliers[0].id);
    }
  }, [invoiceType, customers, suppliers]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: String(Date.now()),
        name: '',
        quantity: 1,
        unit: 'Adet',
        unitPrice: 0,
        discountPercent: 0,
        vatRate: 20,
        withholdingRate: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: prod.id,
      name: prod.name,
      unit: prod.unit,
      unitPrice: invoiceType === 'SALES' ? prod.sell_price : prod.buy_price,
      vatRate: prod.vat_rate,
    };
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof ModalItem, val: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: val };
    setItems(newItems);
  };

  // Live Calculations
  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;
  let withholdingTotal = 0;

  const calculatedItems = items.map((it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const gross = qty * price;
    const disc = gross * ((Number(it.discountPercent) || 0) / 100);
    const net = gross - disc;
    const vat = net * ((Number(it.vatRate) || 0) / 100);
    const withh = vat * ((Number(it.withholdingRate) || 0) / 100);
    const total = net + vat - withh;

    subtotal += gross;
    discountTotal += disc;
    vatTotal += vat;
    withholdingTotal += withh;

    return { ...it, total };
  });

  const netTotal = subtotal - discountTotal;
  const grandTotal = netTotal + vatTotal - withholdingTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let entityIdToUse = selectedEntityId;

      // Hızlı cari oluşturma veya otomatik cari ataması
      if (isQuickEntity && quickEntityTitle.trim()) {
        if (invoiceType === 'SALES') {
          const newCust = await api.createCustomer({ title: quickEntityTitle.trim() });
          entityIdToUse = newCust.data.id;
        } else {
          const newSup = await api.createSupplier({ title: quickEntityTitle.trim() });
          entityIdToUse = newSup.data.id;
        }
      } else if (!entityIdToUse) {
        if (invoiceType === 'SALES') {
          if (customers.length > 0) {
            entityIdToUse = customers[0].id;
          } else {
            const newCust = await api.createCustomer({ title: 'Genel Müşteri / Perakende Satış' });
            entityIdToUse = newCust.data.id;
          }
        } else {
          if (suppliers.length > 0) {
            entityIdToUse = suppliers[0].id;
          } else {
            const newSup = await api.createSupplier({ title: 'Genel Tedarikçi' });
            entityIdToUse = newSup.data.id;
          }
        }
      }

      // Boş bırakılmış ekstra satırları otomatik temizle
      let validItems = items.filter(
        (it) => it.name.trim() !== '' || Boolean(it.productId) || Number(it.unitPrice) > 0
      );

      if (validItems.length === 0) {
        validItems = [
          {
            id: '1',
            name: 'Hizmet / Ürün',
            quantity: 1,
            unit: 'Adet',
            unitPrice: Number(items[0]?.unitPrice) || 100,
            discountPercent: 0,
            vatRate: 20,
            withholdingRate: 0,
          },
        ];
      }

      const payload = {
        invoice_type: invoiceType,
        customer_id: invoiceType === 'SALES' ? entityIdToUse : null,
        supplier_id: invoiceType === 'PURCHASE' ? entityIdToUse : null,
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        exchange_rate: exchangeRate,
        payment_method: paymentMethod,
        notes,
        status,
        installmentCount: isInstallmentEnabled ? installmentCount : 1,
        items: validItems.map((it, idx) => ({
          productId: it.productId || null,
          name: it.name.trim() || products.find((p) => p.id === it.productId)?.name || `Kalem ${idx + 1}`,
          quantity: Math.max(0.01, Number(it.quantity) || 1),
          unit: it.unit || 'Adet',
          unitPrice: Math.max(0, Number(it.unitPrice) || 0),
          discountPercent: Math.max(0, Number(it.discountPercent) || 0),
          vatRate: Number(it.vatRate) !== undefined ? Number(it.vatRate) : 20,
          withholdingRate: Math.max(0, Number(it.withholdingRate) || 0),
        })),
      };

      const res = await api.createInvoice(payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fatura oluşturulurken hata meydana geldi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Yeni Fatura Oluştur
              </h2>
              <p className="text-xs text-slate-500">
                Kalem kalem KDV, iskonto ve tevkifat hesaplama motoru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Options Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
            {/* Invoice Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fatura Türü
              </label>
              <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 p-0.5 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setInvoiceType('SALES')}
                  className={`flex-1 py-1 text-xs font-semibold rounded ${
                    invoiceType === 'SALES' ? 'bg-brand-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Satış Faturası
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType('PURCHASE')}
                  className={`flex-1 py-1 text-xs font-semibold rounded ${
                    invoiceType === 'PURCHASE' ? 'bg-brand-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Alış Faturası
                </button>
              </div>
            </div>

            {/* Entity Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {invoiceType === 'SALES' ? 'Müşteri (Cari)' : 'Tedarikçi (Cari)'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickEntity(!isQuickEntity)}
                  className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {isQuickEntity ? 'Listeden Seç' : '+ Yeni Yaz'}
                </button>
              </div>
              {isQuickEntity ? (
                <input
                  type="text"
                  placeholder={invoiceType === 'SALES' ? 'Yeni Müşteri Ünvanı...' : 'Yeni Tedarikçi Ünvanı...'}
                  value={quickEntityTitle}
                  onChange={(e) => setQuickEntityTitle(e.target.value)}
                  className="w-full text-xs rounded-lg border border-brand-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  autoFocus
                />
              ) : (
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="">Seçiniz...</option>
                  {invoiceType === 'SALES'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.code})
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.code})
                        </option>
                      ))}
                </select>
              )}
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fatura Tarihi
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vade Tarihi
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Fatura Kalemleri & Hizmetler
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5 w-1/4">Ürün / Hizmet</th>
                    <th className="p-2.5 w-20">Miktar</th>
                    <th className="p-2.5 w-20">Birim</th>
                    <th className="p-2.5 w-28">Birim Fiyat</th>
                    <th className="p-2.5 w-20">İsk. %</th>
                    <th className="p-2.5 w-20">KDV</th>
                    <th className="p-2.5 w-24">Tevkifat</th>
                    <th className="p-2.5 w-28 text-right">Tutar</th>
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculatedItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {/* Product select & name */}
                      <td className="p-2">
                        <div className="space-y-1">
                          <select
                            value={item.productId || ''}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1 outline-none"
                          >
                            <option value="">Katalogdan Ürün Seç...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatCurrency(invoiceType === 'SALES' ? p.sell_price : p.buy_price)})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Ürün / Hizmet Açıklaması"
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1.5 outline-none font-medium"
                          />
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1.5 outline-none"
                        />
                      </td>

                      {/* Unit */}
                      <td className="p-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1.5 outline-none"
                        >
                          <option value="Adet">Adet</option>
                          <option value="Saat">Saat</option>
                          <option value="Ay">Ay</option>
                          <option value="Kg">Kg</option>
                          <option value="Metre">Metre</option>
                        </select>
                      </td>

                      {/* Unit Price */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1.5 outline-none font-mono"
                        />
                      </td>

                      {/* Discount % */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => handleItemChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1.5 outline-none"
                        />
                      </td>

                      {/* VAT % */}
                      <td className="p-2">
                        <select
                          value={item.vatRate}
                          onChange={(e) => handleItemChange(idx, 'vatRate', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1.5 outline-none"
                        >
                          <option value="0">%0</option>
                          <option value="1">%1</option>
                          <option value="10">%10</option>
                          <option value="20">%20</option>
                        </select>
                      </td>

                      {/* Withholding % */}
                      <td className="p-2">
                        <select
                          value={item.withholdingRate}
                          onChange={(e) => handleItemChange(idx, 'withholdingRate', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-1.5 outline-none"
                        >
                          <option value="0">Yok</option>
                          <option value="50">5/10 (%50)</option>
                          <option value="70">7/10 (%70)</option>
                          <option value="90">9/10 (%90)</option>
                        </select>
                      </td>

                      {/* Total */}
                      <td className="p-2 text-right font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(item.total, currency)}
                      </td>

                      {/* Remove */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Grid: Options + Calculations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left: Notes, Payment Method & Installment Plan */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ödeme Yöntemi
                </label>
                <div className="flex gap-2">
                  {['HAVALE', 'NAKIT', 'KREDI_KARTI', 'CEK'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        paymentMethod === m
                          ? 'bg-brand-600 text-white border-brand-600 shadow'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m === 'HAVALE' ? 'Banka / EFT' : m === 'NAKIT' ? 'Nakit' : m === 'KREDI_KARTI' ? 'Kredi Kartı' : 'Çek/Senet'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Installments Option */}
              <div className="p-3 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-brand-900 dark:text-brand-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInstallmentEnabled}
                      onChange={(e) => setIsInstallmentEnabled(e.target.checked)}
                      className="w-4 h-4 text-brand-600 rounded"
                    />
                    <span>Ödeme Planı Oluştur (Taksitlendir)</span>
                  </label>
                  {isInstallmentEnabled && (
                    <select
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 1)}
                      className="text-xs rounded border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-900 text-brand-900 dark:text-brand-100 p-1"
                    >
                      {[2, 3, 4, 6, 9, 12].map((cnt) => (
                        <option key={cnt} value={cnt}>
                          {cnt} Taksit
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {isInstallmentEnabled && (
                  <div className="text-[11px] text-brand-700 dark:text-brand-400">
                    Aylık periyotlarla <span className="font-bold">{installmentCount}</span> eşit taksite bölünecektir:
                    <span className="font-bold ml-1">{formatCurrency(grandTotal / installmentCount, currency)} / ay</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fatura Notları & Açıklama
                </label>
                <textarea
                  rows={2}
                  placeholder="İrsaliye no, banka notları veya sipariş detayları..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                />
              </div>
            </div>

            {/* Right: Financial Totals Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Ara Toplam:</span>
                <span className="font-mono font-medium">{formatCurrency(subtotal, currency)}</span>
              </div>

              {discountTotal > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>İskonto Toplamı:</span>
                  <span className="font-mono font-medium">-{formatCurrency(discountTotal, currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Hesaplanan KDV:</span>
                <span className="font-mono font-medium">{formatCurrency(vatTotal, currency)}</span>
              </div>

              {withholdingTotal > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Tevkifat / Stopaj:</span>
                  <span className="font-mono font-medium">-{formatCurrency(withholdingTotal, currency)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900 dark:text-white">GENEL TOPLAM:</span>
                <span className="text-base font-extrabold text-brand-600 dark:text-brand-400 font-mono">
                  {formatCurrency(grandTotal, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={status === 'DRAFT'}
                  onChange={(e) => setStatus(e.target.checked ? 'DRAFT' : 'ISSUED')}
                  className="rounded text-brand-600"
                />
                <span>Taslak Olarak Kaydet (Cari ve stoka yansıtma)</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                <span>{loading ? 'Fatura Kesiliyor...' : 'Faturayı Onayla & Kaydet'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
