import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Boxes,
  Barcode,
  X,
  Filter,
  Edit2,
  Trash2,
  ArrowDownUp,
  Download,
} from 'lucide-react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

interface ProductsStocksViewProps {
  onRefreshProducts: () => void;
}

export const ProductsStocksView: React.FC<ProductsStocksViewProps> = ({ onRefreshProducts }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // New Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newUnit, setNewUnit] = useState('Adet');
  const [newBuyPrice, setNewBuyPrice] = useState(0);
  const [newSellPrice, setNewSellPrice] = useState(0);
  const [newVatRate, setNewVatRate] = useState(20);
  const [newMinStock, setNewMinStock] = useState(5);
  const [newCurrentStock, setNewCurrentStock] = useState(10);
  const [newIsService, setNewIsService] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryId, setNewCategoryId] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getProducts({
        search: search || undefined,
        critical: criticalOnly || undefined,
      });
      setProducts(res.data);
    } catch (err) {
      console.error('Ürünler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      setCategories(res.data);
    } catch (err) {
      console.error('Kategoriler alınamadı:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [criticalOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    try {
      await api.createProduct({
        name: newName,
        code: newCode,
        barcode: newBarcode,
        unit: newUnit,
        buy_price: newBuyPrice,
        sell_price: newSellPrice,
        vat_rate: newVatRate,
        min_stock: newMinStock,
        current_stock: newIsService ? 999 : newCurrentStock,
        is_service: newIsService,
        category_id: newCategoryId || null,
      });

      setIsAddModalOpen(false);
      setNewName('');
      fetchProducts();
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message || 'Ürün eklenemedi.');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!window.confirm(`${prod.name} ürününü silmek istediğinize emin misiniz?`)) return;
    try {
      await api.deleteProduct(prod.id);
      fetchProducts();
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message || 'Ürün silinemedi.');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await api.updateProduct(editingProduct.id, {
        name: editingProduct.name,
        code: editingProduct.code,
        barcode: editingProduct.barcode,
        unit: editingProduct.unit,
        buy_price: editingProduct.buy_price,
        sell_price: editingProduct.sell_price,
        vat_rate: editingProduct.vat_rate,
        min_stock: editingProduct.min_stock,
        category_id: editingProduct.category_id || null,
      });
      setEditingProduct(null);
      fetchProducts();
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message || 'Ürün güncellenemedi.');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || !adjustQty) return;
    try {
      await api.adjustProductStock(adjustingProduct.id, {
        type: adjustType,
        quantity: adjustQty,
        reason: adjustReason,
      });
      setAdjustingProduct(null);
      setAdjustQty(1);
      setAdjustReason('');
      fetchProducts();
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message || 'Stok güncellenemedi.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Ürün, Hizmet ve Stok Yönetimi
          </h2>
          <p className="text-xs text-slate-500">
            Fiziksel ürünler, hizmetler, barkodlar, kritik stok alarmları ve depo seviyeleri
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={api.getExcelExportUrl('products')}
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
            <span>Yeni Ürün / Hizmet Ekle</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Ürün Adı, Ürün Kodu veya Barkod Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(e) => setCriticalOnly(e.target.checked)}
            className="rounded text-rose-600"
          />
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Sadece Kritik Stok Seviyesindekileri Göster</span>
        </label>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Ürün Kodu / Barkod</th>
                <th className="p-3.5">Ürün / Hizmet Adı</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5 text-right">Alış Fiyatı</th>
                <th className="p-3.5 text-right">Satış Fiyatı</th>
                <th className="p-3.5">KDV</th>
                <th className="p-3.5 text-right">Mevcut Stok</th>
                <th className="p-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Ürünler yükleniyor...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">Kayıtlı ürün bulunamadı.</td>
                </tr>
              ) : (
                products.map((prod) => {
                  const isCritical = !prod.is_service && prod.current_stock <= prod.min_stock;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold font-mono text-brand-600 dark:text-brand-400">{prod.code}</div>
                        {prod.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Barcode className="w-3 h-3" /> {prod.barcode}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{prod.name}</div>
                        {prod.is_service === 1 && (
                          <span className="text-[10px] text-blue-500 font-semibold">Hizmet / Lisans</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {prod.category_name || 'Genel'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(prod.buy_price)}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(prod.sell_price)}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">
                        %{prod.vat_rate}
                      </td>

                      <td className="p-3.5 text-right">
                        {prod.is_service === 1 ? (
                          <span className="text-slate-400 font-semibold text-[11px]">Sınırsız (Hizmet)</span>
                        ) : (
                          <div>
                            <span className={`font-mono font-bold text-sm ${isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                              {prod.current_stock} {prod.unit}
                            </span>
                            {isCritical && (
                              <div className="text-[10px] text-rose-500 font-bold flex items-center justify-end gap-1">
                                <AlertTriangle className="w-3 h-3" /> Kritik Eşik (Min: {prod.min_stock})
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stock In/Out */}
                          {prod.is_service !== 1 && (
                            <button
                              onClick={() => {
                                setAdjustingProduct(prod);
                                setAdjustType('IN');
                                setAdjustQty(1);
                                setAdjustReason('');
                              }}
                              title="Stok Giriş / Çıkış Hareketi"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            >
                              <ArrowDownUp className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => setEditingProduct({ ...prod })}
                            title="Düzenle"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            title="Sil"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yeni Ürün veya Hizmet Tanımla</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ürün / Hizmet Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Barkod Okuyucu El Terminali"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Barkod (Opsiyonel)</label>
                  <input
                    type="text"
                    placeholder="8690..."
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Birim</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Saat">Saat</option>
                    <option value="Ay">Ay</option>
                    <option value="Kg">Kg</option>
                    <option value="Metre">Metre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alış Fiyatı (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBuyPrice}
                    onChange={(e) => setNewBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Satış Fiyatı (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSellPrice}
                    onChange={(e) => setNewSellPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">KDV Oranı</label>
                  <select
                    value={newVatRate}
                    onChange={(e) => setNewVatRate(parseInt(e.target.value) || 0)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  >
                    <option value="0">%0</option>
                    <option value="1">%1</option>
                    <option value="10">%10</option>
                    <option value="20">%20</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  >
                    <option value="">Kategori Seçiniz...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsService}
                    onChange={(e) => setNewIsService(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Bu bir Hizmet veya Dijital Lisans (Fiziksel stok takibi yapılmaz)</span>
                </label>

                {!newIsService && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Başlangıç Stok Miktarı</label>
                      <input
                        type="number"
                        value={newCurrentStock}
                        onChange={(e) => setNewCurrentStock(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono rounded border p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Kritik Stok Uyarısı</label>
                      <input
                        type="number"
                        value={newMinStock}
                        onChange={(e) => setNewMinStock(parseFloat(e.target.value) || 5)}
                        className="w-full text-xs font-mono rounded border p-1.5"
                      />
                    </div>
                  </div>
                )}
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
                  Ürünü Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ürün / Hizmet Bilgilerini Düzenle</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ürün Adı *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ürün Kodu</label>
                  <input
                    type="text"
                    value={editingProduct.code}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Barkod</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alış Fiyatı (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.buy_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, buy_price: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-mono rounded-lg border p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Satış Fiyatı (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.sell_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sell_price: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-mono font-bold rounded-lg border p-2 text-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">KDV %</label>
                  <select
                    value={editingProduct.vat_rate}
                    onChange={(e) => setEditingProduct({ ...editingProduct, vat_rate: parseInt(e.target.value) || 20 })}
                    className="w-full text-xs rounded-lg border p-2"
                  >
                    <option value={0}>%0</option>
                    <option value={1}>%1</option>
                    <option value={10}>%10</option>
                    <option value={20}>%20</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Birim</label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full text-xs rounded-lg border p-2"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Kg">Kg</option>
                    <option value="Metre">Metre</option>
                    <option value="Paket">Paket</option>
                    <option value="Kutu">Kutu</option>
                    <option value="Hizmet">Hizmet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kritik Stok Eşiği</label>
                  <input
                    type="number"
                    value={editingProduct.min_stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, min_stock: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs font-mono rounded-lg border p-2"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
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

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stok Hareketi (Giriş / Çıkış)</h3>
                <p className="text-xs text-slate-500">{adjustingProduct.name} (Mevcut: {adjustingProduct.current_stock} {adjustingProduct.unit})</p>
              </div>
              <button onClick={() => setAdjustingProduct(null)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">İşlem Türü</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('IN')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      adjustType === 'IN'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    + Stok Girişi (Ekle)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('OUT')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      adjustType === 'OUT'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    - Stok Çıkışı (Azalt)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Miktar ({adjustingProduct.unit}) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 1)}
                  className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Açıklama / Sebep</label>
                <input
                  type="text"
                  placeholder="Örn: Sayım farkı, depo transferi, hasarlı ürün vb."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
                >
                  Hareketi Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
