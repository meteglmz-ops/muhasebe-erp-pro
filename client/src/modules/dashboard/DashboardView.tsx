import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  Package,
  Calendar,
  CreditCard,
  Plus,
  FileText,
} from 'lucide-react';
import { DashboardStats } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface DashboardViewProps {
  onOpenInvoiceModal: (type: 'SALES' | 'PURCHASE') => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenInvoiceModal,
  onNavigateTab,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setStats(res.data);
    } catch (err) {
      console.error('Dashboard yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Finansal veriler ve raporlar hesaplanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Alacak */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-brand-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Toplam Müşteri Alacağı</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {formatCurrency(stats.totalReceivable)}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <span>Açık müşteri carileri toplamı</span>
            </div>
          </div>
        </div>

        {/* Toplam Tedarikçi Borcu */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-brand-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Toplam Tedarikçi Borcu</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {formatCurrency(stats.totalPayable)}
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
              <span>Ödenecek faturalar ve borçlar</span>
            </div>
          </div>
        </div>

        {/* Kasa & Banka Likit Varlıklar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-brand-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Toplam Likit Varlık</span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 font-mono">
              {formatCurrency(stats.totalLiquidAssets)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
              <span>Kasa: {formatCurrency(stats.totalCashTRY)}</span>
              <span>Banka: {formatCurrency(stats.totalBankTRY)}</span>
            </div>
          </div>
        </div>

        {/* Bu Ay Net Kar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-brand-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bu Ayki Net Durum</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              stats.netProfitThisMonth >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
            }`}>
              {stats.netProfitThisMonth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold font-mono ${
              stats.netProfitThisMonth >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {formatCurrency(stats.netProfitThisMonth)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
              <span>Gelir: {formatCurrency(stats.totalIncomeThisMonth)}</span>
              <span>Gider: {formatCurrency(stats.totalExpenseThisMonth)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Monthly Trend Chart & Quick Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Aylık Finansal Trend (Son 6 Ay)</h2>
              <p className="text-xs text-slate-500">Gelir, Gider ve Net Kar Karşılaştırması</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Gelir</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Gider</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500 inline-block" /> Net Kar</span>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="h-64 flex items-end justify-between gap-4 pt-8 pb-2 border-b border-slate-100 dark:border-slate-800">
            {stats.monthlyTrends.map((trend, i) => {
              const maxVal = 160000;
              const hGelir = Math.min(100, Math.round((trend.gelir / maxVal) * 100));
              const hGider = Math.min(100, Math.round((trend.gider / maxVal) * 100));
              const hKar = Math.max(5, Math.min(100, Math.round((trend.kar / maxVal) * 100)));

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    {/* Gelir Bar */}
                    <div
                      style={{ height: `${hGelir}%` }}
                      className="w-1/3 bg-emerald-500 rounded-t-sm transition-all group-hover:brightness-110"
                      title={`Gelir: ${formatCurrency(trend.gelir)}`}
                    />
                    {/* Gider Bar */}
                    <div
                      style={{ height: `${hGider}%` }}
                      className="w-1/3 bg-rose-400 rounded-t-sm transition-all group-hover:brightness-110"
                      title={`Gider: ${formatCurrency(trend.gider)}`}
                    />
                    {/* Kar Bar */}
                    <div
                      style={{ height: `${hKar}%` }}
                      className="w-1/3 bg-brand-500 rounded-t-sm transition-all group-hover:brightness-110"
                      title={`Net Kar: ${formatCurrency(trend.kar)}`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {trend.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Operations & Monthly In/Out */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Hızlı İşlemler</h2>
            <p className="text-xs text-slate-500 mb-4">Sık kullanılan muhasebe eylemleri</p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onOpenInvoiceModal('SALES')}
                className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 hover:bg-brand-100 text-left transition-colors"
              >
                <FileText className="w-5 h-5 text-brand-600 mb-1" />
                <div className="text-xs font-bold text-slate-900 dark:text-white">Satış Faturası</div>
                <div className="text-[10px] text-slate-500">Müşteriye fatura kes</div>
              </button>

              <button
                onClick={() => onOpenInvoiceModal('PURCHASE')}
                className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 text-left transition-colors"
              >
                <Package className="w-5 h-5 text-amber-600 mb-1" />
                <div className="text-xs font-bold text-slate-900 dark:text-white">Alış Faturası</div>
                <div className="text-[10px] text-slate-500">Gider veya mal girişi</div>
              </button>

              <button
                onClick={() => onNavigateTab('payment-plans')}
                className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 hover:bg-purple-100 text-left transition-colors"
              >
                <Calendar className="w-5 h-5 text-purple-600 mb-1" />
                <div className="text-xs font-bold text-slate-900 dark:text-white">Ödeme Takvimi</div>
                <div className="text-[10px] text-slate-500">Vadeleri incele</div>
              </button>

              <button
                onClick={() => onNavigateTab('documents')}
                className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 text-left transition-colors"
              >
                <CreditCard className="w-5 h-5 text-blue-600 mb-1" />
                <div className="text-xs font-bold text-slate-900 dark:text-white">Belge Arşivi</div>
                <div className="text-[10px] text-slate-500">Klasörlere eriş</div>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Bu Ay Gerçekleşen Tahsilat:</span>
              <span className="font-mono font-bold text-emerald-600">{formatCurrency(stats.collectionsThisMonth)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Bu Ay Yapılan Ödeme:</span>
              <span className="font-mono font-bold text-rose-600">{formatCurrency(stats.paymentsThisMonth)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Overdue Receivables & Critical Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vadesi Geçen Alacaklar Paneli */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Vadesi Geçen Alacaklar</h2>
            </div>
            <button
              onClick={() => onNavigateTab('payment-plans')}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
            >
              Tümünü Gör
            </button>
          </div>

          {stats.overdueReceivables.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Vadesi geçmiş geciken alacak faturası bulunmuyor. Tebrikler!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.overdueReceivables.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{inv.customer_title}</div>
                    <div className="text-[11px] text-slate-400">
                      {inv.invoice_no} • Vade: {formatDate(inv.due_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-rose-600">
                      {formatCurrency(inv.remaining_amount)}
                    </div>
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 px-1.5 py-0.5 rounded font-semibold">
                      Gecikmiş
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kritik Stok Uyarıları */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Kritik Stok Seviyeleri</h2>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
            >
              Tüm Stoklar
            </button>
          </div>

          {stats.criticalStock.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Stok seviyeleri güvenli eşiğin üzerinde.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.criticalStock.map((prod) => (
                <div key={prod.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{prod.name}</div>
                    <div className="text-[11px] text-slate-400">Kod: {prod.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-rose-600">
                      {prod.current_stock} {prod.unit}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Min: {prod.min_stock} {prod.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
