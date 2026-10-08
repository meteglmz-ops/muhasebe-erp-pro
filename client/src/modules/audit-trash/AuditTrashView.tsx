import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Trash2,
  RotateCcw,
  Clock,
  User,
  History,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatters';

export const AuditTrashView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'TRASH'>('AUDIT');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, trashRes] = await Promise.all([api.getAuditLogs(), api.getTrash()]);
      setAuditLogs(logsRes.data);
      setTrashItems(trashRes.data);
    } catch (err) {
      console.error('Denetim verileri alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRestore = async (id: string, entityType: string) => {
    try {
      await api.restoreTrash(id, entityType);
      alert('Kayıt başarıyla geri yüklendi!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Geri yükleme başarısız.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Denetim Kayıtları (Audit Log) ve Çöp Kutusu
          </h2>
          <p className="text-xs text-slate-500">
            Sistemde kim ne zaman hangi işlemi yaptı ve silinen kayıtları güvenle geri alma merkezi
          </p>
        </div>

        {/* Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Denetim Günlüğü</span>
          </button>
          <button
            onClick={() => setActiveTab('TRASH')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'TRASH'
                ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Çöp Kutusu ({trashItems.length})</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Zaman</th>
                  <th className="p-3.5">Kullanıcı</th>
                  <th className="p-3.5">Modül</th>
                  <th className="p-3.5">İşlem Türü</th>
                  <th className="p-3.5">İşlem Detayları</th>
                  <th className="p-3.5 font-mono">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Loglar yükleniyor...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">Henüz denetim kaydı bulunmuyor.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {log.timestamp}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.user_name || 'Sistem'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{log.user_email}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.module}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action.includes('DELETE') ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px] truncate max-w-xs">
                        {log.details}
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono text-[10px]">
                        {log.ip_address}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trash Bin Table */}
      {activeTab === 'TRASH' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Silinen Kayıt</th>
                  <th className="p-3.5">Kayıt Türü</th>
                  <th className="p-3.5">Silinme Tarihi</th>
                  <th className="p-3.5 text-right">Geri Yükle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {trashItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400">
                      Çöp kutusu boş. Silinmiş kayıt bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  trashItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.entityType}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">
                        {item.deletedAt}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleRestore(item.id, item.entityType)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Geri Yükle</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
