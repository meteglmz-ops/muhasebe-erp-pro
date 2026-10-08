import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export const ReportsView: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'PROFIT_LOSS' | 'CASH_FLOW'>('PROFIT_LOSS');
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [plRes, cfRes] = await Promise.all([api.getProfitLoss(), api.getCashFlow()]);
      setProfitLoss(plRes.data);
      setCashFlow(cfRes.data);
    } catch (err) {
      console.error('Raporlar alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Finansal Raporlama ve Analitik
          </h2>
          <p className="text-xs text-slate-500">
            Dönemsel Kar/Zarar tabloları, 30 günlük nakit akış projeksiyonu ve Excel dökümleri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExcelExportUrl('invoices')}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Fatura Raporunu Excel Olarak İndir</span>
          </a>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveReportTab('PROFIT_LOSS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeReportTab === 'PROFIT_LOSS'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Kar / Zarar Raporu</span>
        </button>

        <button
          onClick={() => setActiveReportTab('CASH_FLOW')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeReportTab === 'CASH_FLOW'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Nakit Akış Projeksiyonu</span>
        </button>
      </div>

      {/* Profit & Loss Report View */}
      {activeReportTab === 'PROFIT_LOSS' && (
        <div className="space-y-6">
          {loading || !profitLoss ? (
            <div className="py-20 text-center text-xs text-slate-400">Rapor hesaplanıyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Summary Cards */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toplam Gelirler</span>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  {formatCurrency(profitLoss.totalIncome)}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Satış Faturaları:</span>
                    <span className="font-mono font-medium">{formatCurrency(profitLoss.salesRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diğer Gelirler:</span>
                    <span className="font-mono font-medium">{formatCurrency(profitLoss.otherIncome)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toplam Giderler</span>
                <div className="text-2xl font-black font-mono text-rose-600">
                  {formatCurrency(profitLoss.totalExpense)}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Harcama Kalemleri:</span>
                    <span className="font-mono font-medium">{profitLoss.expenseBreakdown?.length || 0} Kategori</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Kar / Zarar</span>
                <div className={`text-2xl font-black font-mono ${profitLoss.netProfit >= 0 ? 'text-brand-600' : 'text-rose-600'}`}>
                  {formatCurrency(profitLoss.netProfit)}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span>Dönem: {profitLoss.period.startDate} - {profitLoss.period.endDate}</span>
                </div>
              </div>

              {/* Expense Breakdown Table */}
              <div className="md:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gider Kategorileri Dağılımı</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {profitLoss.expenseBreakdown?.map((cat: any, idx: number) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.category_name || 'Diğer'}</span>
                      <span className="font-mono font-bold text-rose-600">{formatCurrency(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cash Flow Forecast View */}
      {activeReportTab === 'CASH_FLOW' && (
        <div className="space-y-6">
          {loading || !cashFlow ? (
            <div className="py-20 text-center text-xs text-slate-400">Projeksiyon hesaplanıyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">30 Günlük Beklenen Tahsilat</span>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  {formatCurrency(cashFlow.expectedCollections)}
                </div>
                <p className="text-[11px] text-slate-500">Önümüzdeki 30 gün içinde vadesi dolacak satış faturaları</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">30 Günlük Beklenen Ödeme</span>
                <div className="text-2xl font-black font-mono text-rose-600">
                  {formatCurrency(cashFlow.expectedPayments)}
                </div>
                <p className="text-[11px] text-slate-500">Önümüzdeki 30 gün içinde vadesi gelecek tedarikçi borçları</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Beklenen Nakit Değişimi</span>
                <div className={`text-2xl font-black font-mono ${cashFlow.projectedNetChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(cashFlow.projectedNetChange)}
                </div>
                <p className="text-[11px] text-slate-500">Tahsilat - Ödeme projeksiyon net fazlası</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
