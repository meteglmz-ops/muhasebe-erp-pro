import { Router } from 'express';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';

export const auditRouter = Router();

auditRouter.use(authMiddleware);

// 1. Denetim Kayıtlarını Listele
auditRouter.get('/logs', (req, res) => {
  const companyId = req.user!.companyId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
  const offset = (page - 1) * limit;

  const logs = db.prepare(`
    SELECT a.*, u.full_name as user_name, u.email as user_email
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.company_id = ?
    ORDER BY a.timestamp DESC LIMIT ? OFFSET ?
  `).all(companyId, limit, offset);

  res.json({ success: true, data: logs });
});

// 2. Çöp Kutusu (Soft Delete Edilmiş Kayıtlar)
auditRouter.get('/trash', (req, res) => {
  const companyId = req.user!.companyId;

  const deletedInvoices = db.prepare("SELECT id, invoice_no as title, 'INVOICE' as entityType, updated_at as deletedAt FROM invoices WHERE company_id = ? AND is_deleted = 1").all(companyId);
  const deletedCustomers = db.prepare("SELECT id, title, 'CUSTOMER' as entityType, updated_at as deletedAt FROM customers WHERE company_id = ? AND is_deleted = 1").all(companyId);
  const deletedSuppliers = db.prepare("SELECT id, title, 'SUPPLIER' as entityType, updated_at as deletedAt FROM suppliers WHERE company_id = ? AND is_deleted = 1").all(companyId);
  const deletedProducts = db.prepare("SELECT id, name as title, 'PRODUCT' as entityType, updated_at as deletedAt FROM products WHERE company_id = ? AND is_deleted = 1").all(companyId);

  res.json({
    success: true,
    data: [...deletedInvoices, ...deletedCustomers, ...deletedSuppliers, ...deletedProducts],
  });
});

// 3. Çöp Kutusundan Geri Yükle (Restore)
auditRouter.post('/trash/restore', (req, res) => {
  const companyId = req.user!.companyId;
  const { id, entityType } = req.body;

  if (entityType === 'INVOICE') {
    db.prepare('UPDATE invoices SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?').run(id, companyId);
  } else if (entityType === 'CUSTOMER') {
    db.prepare('UPDATE customers SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?').run(id, companyId);
  } else if (entityType === 'SUPPLIER') {
    db.prepare('UPDATE suppliers SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?').run(id, companyId);
  } else if (entityType === 'PRODUCT') {
    db.prepare('UPDATE products SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?').run(id, companyId);
  }

  auditLog(companyId, req.user!.userId, 'RESTORE', entityType, id, {});
  res.json({ success: true, message: 'Kayıt başarıyla geri yüklendi.' });
});
