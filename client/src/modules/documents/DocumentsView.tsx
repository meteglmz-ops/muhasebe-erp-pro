import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Download,
  Search,
  File,
  FileSpreadsheet,
  Image,
  ChevronRight,
  Plus,
  X,
  Link,
  Trash2,
} from 'lucide-react';
import { Folder as FolderType, Document as DocType, Invoice, Customer } from '../../types';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatters';

interface DocumentsViewProps {
  invoices: Invoice[];
  customers: Customer[];
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ invoices, customers }) => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Folder Modal
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#2563EB');

  // Upload Document Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customDocName, setCustomDocName] = useState('');
  const [linkedEntityType, setLinkedEntityType] = useState('');
  const [linkedEntityId, setLinkedEntityId] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchFolders = async () => {
    try {
      const res = await api.getFolders();
      setFolders(res.data);
    } catch (err) {
      console.error('Klasörler yüklenemedi:', err);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments({
        folderId: selectedFolderId || undefined,
        search: search || undefined,
      });
      setDocuments(res.data);
    } catch (err) {
      console.error('Belgeler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedFolderId]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.createFolder({
        name: newFolderName.trim(),
        parent_id: selectedFolderId || undefined,
        color: newFolderColor,
      });
      setIsNewFolderOpen(false);
      setNewFolderName('');
      fetchFolders();
    } catch (err: any) {
      alert(err.message || 'Klasör oluşturulamadı.');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (customDocName) formData.append('custom_name', customDocName);
      if (selectedFolderId) formData.append('folder_id', selectedFolderId);
      if (linkedEntityType) formData.append('linked_entity_type', linkedEntityType);
      if (linkedEntityId) formData.append('linked_entity_id', linkedEntityId);

      await api.uploadDocument(formData);
      setIsUploadOpen(false);
      setSelectedFile(null);
      setCustomDocName('');
      fetchDocuments();
      fetchFolders();
    } catch (err: any) {
      alert(err.message || 'Belge yüklenirken hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: DocType) => {
    if (!window.confirm(`"${doc.name}" belgesini silmek istediğinize emin misiniz?`)) return;
    try {
      await api.deleteDocument(doc.id);
      fetchDocuments();
      fetchFolders();
    } catch (err: any) {
      alert(err.message || 'Belge silinemedi.');
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!window.confirm(`"${folderName}" klasörünü silmek istediğinize emin misiniz? (İçindeki belgeler ana dizine taşınacaktır)`)) return;
    try {
      await api.deleteFolder(folderId);
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      fetchFolders();
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Klasör silinemedi.');
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes('pdf')) return <FileText className="w-8 h-8 text-rose-500" />;
    if (mime.includes('image')) return <Image className="w-8 h-8 text-blue-500" />;
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv'))
      return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    return <File className="w-8 h-8 text-slate-400" />;
  };

  const activeFolder = folders.find((f) => f.id === selectedFolderId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Belge ve Klasör Arşivi (Özel Dizin Sistemi)
          </h2>
          <p className="text-xs text-slate-500">
            Dilediğiniz hiyerarşide klasör oluşturun (/Muhasebe/2026 vb.) ve belgeleri faturalarla eşleştirin
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewFolderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-brand-500" />
            <span>+ Yeni Klasör Oluştur</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Belge Yükle</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Folder Tree Left & Files Right */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: Folder Tree */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <FolderTree className="w-4 h-4" />
            <span>Klasör Ağacı</span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors ${
                selectedFolderId === null
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold border border-brand-200 dark:border-brand-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-500" />
                <span>Tüm Belgeler</span>
              </div>
            </button>

            {folders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors group ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold border border-brand-200 dark:border-brand-800'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="flex items-center gap-2 truncate flex-1 text-left"
                  >
                    <Folder className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                      {folder.documentCount || 0}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id, folder.name);
                      }}
                      title="Klasörü Sil"
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Breadcrumb & Documents Grid */}
        <div className="md:col-span-3 space-y-4">
          {/* Breadcrumb Path & Search */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Folder className="w-4 h-4 text-amber-500" />
              <span>Dizin: </span>
              <span className="font-mono text-brand-600 dark:text-brand-400">
                {activeFolder ? activeFolder.path : '/ (Tüm Belgeler)'}
              </span>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Belge ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Documents Grid */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400">Belgeler yükleniyor...</div>
            ) : documents.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400 space-y-2">
                <Folder className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                <p>Bu klasörde henüz yüklenmiş bir belge yok.</p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
                >
                  İlk belgeyi yükleyin
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-brand-500/50 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        {getFileIcon(doc.mime_type)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={doc.name}>
                          {doc.name}
                        </h4>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {(doc.file_size / 1024).toFixed(1)} KB • {formatDate(doc.created_at)}
                        </div>
                        {doc.linked_entity_type && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                            <Link className="w-3 h-3" />
                            <span>İlişkili: {doc.linked_entity_type}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {doc.mime_type.split('/')[1] || 'DOSYA'}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={api.getDocumentDownloadUrl(doc.id)}
                          download={doc.name}
                          className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>İndir</span>
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          title="Belgeyi Sil"
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yeni Klasör Oluştur</h3>
              <button onClick={() => setIsNewFolderOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Klasör Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 2026 Faturaları veya ABC Ltd. Sözleşmeleri"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Üst Dizin
                </label>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                  {activeFolder ? activeFolder.path : '/ (Kök Dizin)'}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow"
                >
                  Klasörü Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Arşive Belge Yükle</h3>
              <button onClick={() => setIsUploadOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dosya Seçiniz (PDF, JPG, PNG, Excel, Word) *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Belge Özel Adı (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Ekim 2026 Sunucu Sözleşmesi"
                  value={customDocName}
                  onChange={(e) => setCustomDocName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bir Fatura veya Müşteri ile İlişkilendir (Opsiyonel)
                </label>
                <select
                  value={linkedEntityType}
                  onChange={(e) => setLinkedEntityType(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none mb-2"
                >
                  <option value="">İlişkilendirme Yok</option>
                  <option value="INVOICE">Fatura ile Eşleştir</option>
                  <option value="CUSTOMER">Müşteri ile Eşleştir</option>
                </select>

                {linkedEntityType === 'INVOICE' && (
                  <select
                    value={linkedEntityId}
                    onChange={(e) => setLinkedEntityId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  >
                    <option value="">Fatura Seçiniz...</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_no} ({inv.customer_title || inv.supplier_title})
                      </option>
                    ))}
                  </select>
                )}

                {linkedEntityType === 'CUSTOMER' && (
                  <select
                    value={linkedEntityId}
                    onChange={(e) => setLinkedEntityId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 outline-none"
                  >
                    <option value="">Müşteri Seçiniz...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow disabled:opacity-50"
                >
                  {uploading ? 'Yükleniyor...' : 'Belgeyi Yükle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
