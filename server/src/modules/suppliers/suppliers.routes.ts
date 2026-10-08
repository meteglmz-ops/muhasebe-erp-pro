import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';

export const supplierRouter = Router();

supplierRouter.use(authMiddleware);

// 1. Tedarikçi Listesi
supplierRouter.get('/', (req, res) => {
  const companyId = req.user!.companyId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;

  let query = 'SELECT * FROM suppliers WHERE company_id = ? AND is_deleted = 0';
  const params: any[] = [companyId];

  if (search) {
    query += ' AND (title LIKE ? OR code LIKE ? OR phone LIKE ? OR email LIKE ? OR tax_number LIKE ?)';
    params.push(search, search, search, search, search);
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const totalRow = db.prepare(countQuery).get(...params) as { total: number };

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);

  res.json({
    success: true,
    data: rows,
    meta: {
      page,
      limit,
      total: totalRow.total,
      totalPages: Math.ceil(totalRow.total / limit),
    },
  });
});

// 2. Tedarikçi Detayı
supplierRouter.get('/:id', (req, res) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ? AND company_id = ? AND is_deleted = 0')
    .get(req.params.id, req.user!.companyId) as any;

  if (!supplier) {
    return res.status(404).json({ success: false, error: 'Tedarikçi bulunamadı.' });
  }

  const ledger = db.prepare(`
    SELECT * FROM current_account_transactions 
    WHERE company_id = ? AND entity_type = 'SUPPLIER' AND entity_id = ?
    ORDER BY date DESC, created_at DESC LIMIT 50
  `).all(req.user!.companyId, supplier.id);

  const invoices = db.prepare(`
    SELECT id, invoice_no, issue_date, due_date, status, grand_total, paid_amount, remaining_amount
    FROM invoices
    WHERE company_id = ? AND supplier_id = ? AND is_deleted = 0
    ORDER BY issue_date DESC LIMIT 20
  `).all(req.user!.companyId, supplier.id);

  res.json({
    success: true,
    data: {
      supplier,
      ledger,
      invoices,
    },
  });
});

// 3. Tedarikçi Ekleme
supplierRouter.post('/', (req, res) => {
  const title = req.body.title;
  const contactPerson = req.body.contact_person ?? req.body.contactPerson ?? '';
  const phone = req.body.phone ?? '';
  const email = req.body.email ?? '';
  const taxOffice = req.body.tax_office ?? req.body.taxOffice ?? '';
  const taxNumber = req.body.tax_number ?? req.body.taxNumber ?? '';
  const address = req.body.address ?? '';
  const city = req.body.city ?? '';
  const district = req.body.district ?? '';
  const notes = req.body.notes ?? '';

  if (!title) {
    return res.status(400).json({ success: false, error: 'Tedarikçi unvanı zorunludur.' });
  }

  const companyId = req.user!.companyId;
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM suppliers WHERE company_id = ?').get(companyId) as { cnt: number };
  const code = req.body.code || `CARI-T-${String(countRow.cnt + 1).padStart(3, '0')}`;
  const id = uuidv4();

  db.prepare(`
    INSERT INTO suppliers (id, company_id, code, title, contact_person, phone, email, tax_office, tax_number, address, city, district, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, companyId, code, title, contactPerson, phone, email, taxOffice, taxNumber, address, city, district, notes);

  auditLog(companyId, req.user!.userId, 'CREATE', 'SUPPLIER', id, { title, code });

  const created = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 4. Tedarikçi Güncelleme
supplierRouter.put('/:id', (req, res) => {
  const title = req.body.title;
  const contactPerson = req.body.contact_person ?? req.body.contactPerson;
  const phone = req.body.phone;
  const email = req.body.email;
  const taxOffice = req.body.tax_office ?? req.body.taxOffice;
  const taxNumber = req.body.tax_number ?? req.body.taxNumber;
  const address = req.body.address;
  const city = req.body.city;
  const district = req.body.district;
  const notes = req.body.notes;

  db.prepare(`
    UPDATE suppliers
    SET title = COALESCE(?, title),
        contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        tax_office = COALESCE(?, tax_office),
        tax_number = COALESCE(?, tax_number),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).run(title, contactPerson, phone, email, taxOffice, taxNumber, address, city, district, notes, req.params.id, req.user!.companyId);

  auditLog(req.user!.companyId, req.user!.userId, 'UPDATE', 'SUPPLIER', req.params.id, req.body);
  const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// 5. Tedarikçi Soft Delete
supplierRouter.delete('/:id', (req, res) => {
  db.prepare('UPDATE suppliers SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, req.user!.companyId);

  auditLog(req.user!.companyId, req.user!.userId, 'SOFT_DELETE', 'SUPPLIER', req.params.id, {});
  res.json({ success: true, message: 'Tedarikçi silindi.' });
});
