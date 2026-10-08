import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';

export const documentRouter = Router();

documentRouter.use(authMiddleware);

// Uploads directory config
const uploadDir = path.resolve(__dirname, '../../../../storage/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const companyDir = path.join(uploadDir, (req as any).user?.companyId || 'default');
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }
    cb(null, companyDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${uuidv4().substring(0, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// 1. Klasörleri Ağaç Yapısında Listele
documentRouter.get('/folders', (req, res) => {
  const companyId = req.user!.companyId;
  const folders = db.prepare('SELECT * FROM folders WHERE company_id = ? ORDER BY path ASC').all(companyId);

  // Belge sayılarını da ekle
  const foldersWithCounts = folders.map((f: any) => {
    const docCount = db.prepare('SELECT COUNT(*) as count FROM documents WHERE folder_id = ? AND is_deleted = 0').get(f.id) as any;
    return { ...f, documentCount: docCount.count };
  });

  res.json({ success: true, data: foldersWithCounts });
});

// 2. Yeni Klasör Oluştur (Alt klasör veya kök klasör)
documentRouter.post('/folders', (req, res) => {
  const companyId = req.user!.companyId;
  const name = req.body.name;
  const parent_id = req.body.parent_id ?? req.body.parentId;
  const color = req.body.color || '#2563EB';

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: 'Klasör adı zorunludur.' });
  }

  let folderPath = `/${name.trim()}`;
  if (parent_id) {
    const parent = db.prepare('SELECT path FROM folders WHERE id = ? AND company_id = ?').get(parent_id, companyId) as any;
    if (parent) {
      folderPath = `${parent.path}/${name.trim()}`;
    }
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO folders (id, company_id, parent_id, name, path, color)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, companyId, parent_id || null, name.trim(), folderPath, color);

  auditLog(companyId, req.user!.userId, 'CREATE_FOLDER', 'DOCUMENTS', id, { name, path: folderPath });

  const created = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 3. Belgeleri Listele (Klasöre veya İlişkiye göre)
documentRouter.get('/', (req, res) => {
  const companyId = req.user!.companyId;
  const folderId = req.query.folderId as string;
  const linkedType = req.query.linkedType as string;
  const linkedId = req.query.linkedId as string;
  const search = req.query.search ? `%${req.query.search}%` : null;

  let query = 'SELECT * FROM documents WHERE company_id = ? AND is_deleted = 0';
  const params: any[] = [companyId];

  if (folderId) {
    query += ' AND folder_id = ?';
    params.push(folderId);
  }

  if (linkedType && linkedId) {
    query += ' AND linked_entity_type = ? AND linked_entity_id = ?';
    params.push(linkedType, linkedId);
  }

  if (search) {
    query += ' AND name LIKE ?';
    params.push(search);
  }

  query += ' ORDER BY created_at DESC';

  const docs = db.prepare(query).all(...params);
  res.json({ success: true, data: docs });
});

// 4. Belge Yükleme
documentRouter.post('/upload', upload.single('file'), (req, res) => {
  const companyId = req.user!.companyId;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'Yüklenecek dosya seçilmedi.' });
  }

  const folder_id = req.body.folder_id ?? req.body.folderId;
  const linked_entity_type = req.body.linked_entity_type ?? req.body.linkedEntityType;
  const linked_entity_id = req.body.linked_entity_id ?? req.body.linkedEntityId;
  const custom_name = req.body.custom_name ?? req.body.customName;
  const docId = uuidv4();
  const displayName = custom_name || file.originalname;

  db.prepare(`
    INSERT INTO documents (id, company_id, folder_id, name, file_path, file_size, mime_type, linked_entity_type, linked_entity_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    docId,
    companyId,
    folder_id || null,
    displayName,
    file.path,
    file.size,
    file.mimetype,
    linked_entity_type || null,
    linked_entity_id || null
  );

  auditLog(companyId, req.user!.userId, 'UPLOAD_DOC', 'DOCUMENTS', docId, { name: displayName, size: file.size });

  const created = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
  res.json({ success: true, data: created });
});

// 5. Belgeyi Bir Kayıtla İlişkilendirme (Faturaya, Müşteriye vb.)
documentRouter.post('/:id/link', (req, res) => {
  const companyId = req.user!.companyId;
  const linked_entity_type = req.body.linked_entity_type ?? req.body.linkedEntityType;
  const linked_entity_id = req.body.linked_entity_id ?? req.body.linkedEntityId;

  db.prepare(`
    UPDATE documents 
    SET linked_entity_type = ?, linked_entity_id = ?
    WHERE id = ? AND company_id = ?
  `).run(linked_entity_type, linked_entity_id, req.params.id, companyId);

  res.json({ success: true, message: 'Belge başarıyla ilişkilendirildi.' });
});

// 6. Belge İndirme
documentRouter.get('/:id/download', (req, res) => {
  const companyId = req.user!.companyId;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;

  if (!doc || !fs.existsSync(doc.file_path)) {
    return res.status(404).json({ success: false, error: 'Dosya bulunamadı veya diskten silinmiş.' });
  }

  res.download(doc.file_path, doc.name);
});

// 7. Belge Silme (Soft-delete)
documentRouter.delete('/:id', (req, res) => {
  const companyId = req.user!.companyId;
  db.prepare('UPDATE documents SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, companyId);

  auditLog(companyId, req.user!.userId, 'SOFT_DELETE', 'DOCUMENTS', req.params.id, {});
  res.json({ success: true, message: 'Belge silindi.' });
});

// 8. Klasör Silme
documentRouter.delete('/folders/:id', (req, res) => {
  const companyId = req.user!.companyId;
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!folder) return res.status(404).json({ success: false, error: 'Klasör bulunamadı.' });

  // İçindeki belgeleri kök dizine (null) taşı ve klasörü sil
  db.transaction(() => {
    db.prepare('UPDATE documents SET folder_id = NULL WHERE folder_id = ? AND company_id = ?')
      .run(req.params.id, companyId);
    db.prepare('DELETE FROM folders WHERE id = ? AND company_id = ?')
      .run(req.params.id, companyId);
  })();

  auditLog(companyId, req.user!.userId, 'DELETE_FOLDER', 'DOCUMENTS', req.params.id, { name: folder.name });
  res.json({ success: true, message: 'Klasör silindi.' });
});
