import React, { useState, useEffect } from 'react';
import { Printer, Download, X, Check, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PrintInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceIds: string[];
}

export const PrintInvoicesModal: React.FC<PrintInvoicesModalProps> = ({
  isOpen,
  onClose,
  invoiceIds,
}) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || invoiceIds.length === 0) {
      setInvoices([]);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const compRes = await api.getCurrentCompany().catch(() => null);
        if (compRes?.data) setCompany(compRes.data);

        const fetched = await Promise.all(
          invoiceIds.map((id) => api.getInvoice(id).then((r) => r.data).catch(() => null))
        );
        setInvoices(fetched.filter(Boolean));
      } catch (err) {
        console.error('Faturalar yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, invoiceIds]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-5xl my-4 flex flex-col max-h-[95vh] shadow-2xl rounded-sm">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-brand-600 text-white flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Fatura Yazdırma & Önizleme {invoices.length > 1 ? `(${invoices.length} Adet Toplu)` : ''}
              </h2>
              <p className="text-xs text-slate-500">
                A4 standartlarında profesyonel baskı ve arşiv çıktısı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || invoices.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-sm shadow-sm transition-all disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{invoices.length > 1 ? `Tümünü Yazdır (${invoices.length})` : 'Yazdır'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200 dark:bg-slate-950/60 print:bg-white print:p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Fatura detayları hazırlanıyor...
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              Yazdırılacak fatura bulunamadı.
            </div>
          ) : (
            invoices.map((inv, idx) => (
              <div
                key={inv.id}
                className="bg-white text-slate-900 p-8 sm:p-12 mb-8 mx-auto max-w-[210mm] min-h-[297mm] shadow-lg border border-slate-300 print:border-none print:shadow-none print:m-0 print:p-6 print:w-full print:min-h-0 page-break rounded-sm relative flex flex-col justify-between"
                style={{ pageBreakAfter: idx < invoices.length - 1 ? 'always' : 'auto' }}
              >
                <div>
                  {/* Top Bar Accent */}
                  <div className="h-1.5 bg-slate-900 w-full mb-6"></div>

                  {/* Header: Company & Invoice Info */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-6">
                    <div className="max-w-[55%]">
                      <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                        {company?.legal_title || company?.name || 'BEECURSOR TEKNOLOJI LTD.'}
                      </h1>
                      <div className="mt-2 text-xs text-slate-600 space-y-0.5 leading-relaxed">
                        <p>{company?.address || 'İstanbul, Türkiye'}</p>
                        <p>
                          <strong>V.D.:</strong> {company?.tax_office || '-'} &nbsp;|&nbsp;{' '}
                          <strong>V.No:</strong> {company?.tax_number || '-'}
                        </p>
                        <p>
                          <strong>Tel:</strong> {company?.phone || '-'} &nbsp;|&nbsp;{' '}
                          <strong>E-posta:</strong> {company?.email || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-block border border-slate-900 px-3 py-1 font-black text-xs uppercase tracking-widest text-slate-900 mb-2">
                        {inv.invoice_type === 'SALES' ? 'SATIŞ FATURASI' : 'ALIŞ FATURASI'}
                      </div>
                      <h2 className="text-base font-bold font-mono text-slate-900">
                        {inv.invoice_no}
                      </h2>
                      <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                        <p>
                          <strong>Düzenleme Tarihi:</strong> {formatDate(inv.issue_date)}
                        </p>
                        <p>
                          <strong>Vade Tarihi:</strong> {formatDate(inv.due_date)}
                        </p>
                        <p>
                          <strong>Ödeme Şekli:</strong> {inv.payment_method}
                        </p>
                        {inv.gib_invoice_number && (
                          <p className="font-mono text-[10px] text-slate-500">
                            <strong>GİB No:</strong> {inv.gib_invoice_number}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer / Entity Info Card */}
                  <div className="border border-slate-300 p-4 mb-6 bg-slate-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      {inv.invoice_type === 'SALES' ? 'Sayın (Müşteri Bilgileri):' : 'Tedarikçi Bilgileri:'}
                    </div>
                    <div className="text-sm font-bold text-slate-950">
                      {inv.customer_title || inv.supplier_title || 'Perakende Müşteri'}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                      <p>{inv.customer_address || inv.supplier_address || 'Adres bilgisi girilmedi'}</p>
                      <p>
                        <strong>V.D.:</strong> {inv.customer_tax_office || inv.supplier_tax_office || '-'} &nbsp;|&nbsp;{' '}
                        <strong>V.No/TC:</strong> {inv.customer_tax_number || inv.supplier_tax_number || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <table className="w-full text-left text-xs border border-slate-300 mb-6">
                    <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2 border-r border-slate-700 w-8 text-center">#</th>
                        <th className="p-2 border-r border-slate-700">Ürün / Hizmet Açıklaması</th>
                        <th className="p-2 border-r border-slate-700 text-right w-20">Miktar</th>
                        <th className="p-2 border-r border-slate-700 text-right w-24">Birim Fiyat</th>
                        <th className="p-2 border-r border-slate-700 text-center w-16">KDV</th>
                        <th className="p-2 text-right w-28">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(inv.items || []).map((it: any, i: number) => (
                        <tr key={it.id || i} className={i % 2 === 1 ? 'bg-slate-50/50' : ''}>
                          <td className="p-2 border-r border-slate-200 text-center text-slate-500 font-mono">
                            {i + 1}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium">
                            {it.name || it.description}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">
                            {it.quantity} {it.unit}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">
                            {formatCurrency(it.unit_price, inv.currency)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center font-mono">
                            %{it.vat_rate}
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatCurrency(it.total_amount, inv.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals & Notes Section */}
                  <div className="flex justify-between items-start gap-8 mb-8">
                    {/* Notes & Bank Details */}
                    <div className="flex-1 text-xs text-slate-600 space-y-3">
                      {company?.iban && (
                        <div className="border border-slate-200 p-3 bg-slate-50/30">
                          <div className="font-bold text-slate-800 text-[11px] mb-1">
                            Banka & Havale Bilgileri
                          </div>
                          <p><strong>Banka:</strong> {company.bank_info || 'Ticari Hesap'}</p>
                          <p className="font-mono font-bold text-slate-900"><strong>IBAN:</strong> {company.iban}</p>
                        </div>
                      )}

                      {inv.notes && (
                        <div className="text-[11px] text-slate-500 italic">
                          <strong>Not:</strong> {inv.notes}
                        </div>
                      )}
                    </div>

                    {/* Calculation Summary Table */}
                    <div className="w-64 border border-slate-300 divide-y divide-slate-200 text-xs">
                      <div className="flex justify-between p-2">
                        <span className="text-slate-600">Ara Toplam:</span>
                        <span className="font-mono font-medium">{formatCurrency(inv.subtotal, inv.currency)}</span>
                      </div>
                      {inv.discount_total > 0 && (
                        <div className="flex justify-between p-2 text-rose-600">
                          <span>İskonto Toplamı:</span>
                          <span className="font-mono">-{formatCurrency(inv.discount_total, inv.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between p-2">
                        <span className="text-slate-600">KDV Toplamı:</span>
                        <span className="font-mono font-medium">{formatCurrency(inv.vat_total, inv.currency)}</span>
                      </div>
                      {inv.withholding_total > 0 && (
                        <div className="flex justify-between p-2 text-rose-600">
                          <span>Tevkifat / Stopaj:</span>
                          <span className="font-mono">-{formatCurrency(inv.withholding_total, inv.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between p-2.5 bg-slate-900 text-white font-bold text-sm">
                        <span>GENEL TOPLAM:</span>
                        <span className="font-mono">{formatCurrency(inv.grand_total, inv.currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="border-t border-slate-300 pt-6 mt-8 flex justify-between items-end text-xs text-slate-500">
                  <div>
                    <p className="text-[10px]">
                      Bu belge resmi mali kayıt niteliğinde olup sistem tarafından oluşturulmuştur.
                    </p>
                  </div>
                  <div className="text-center w-48 border border-dashed border-slate-400 p-4 min-h-[70px]">
                    <p className="font-bold text-slate-700 text-[10px] uppercase">Kaşe / Yetkili İmza</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
