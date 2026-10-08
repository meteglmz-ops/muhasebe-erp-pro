import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';

export const customerRouter = Router();

customerRouter.use(authMiddleware);

// 1. Müşteri Listesi (Sayfalama, Sıralama, Arama)
customerRouter.get('/', (req, res) => {
  const companyId = req.user!.companyId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;

  let query = 'SELECT * FROM customers WHERE company_id = ? AND is_deleted = 0';
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

// 2. Müşteri Detayı (Açık Faturalar, Cari Hareketler, Bakiye)
customerRouter.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND company_id = ? AND is_deleted = 0')
    .get(req.params.id, req.user!.companyId) as any;

  if (!customer) {
    return res.status(404).json({ success: false, error: 'Müşteri bulunamadı.' });
  }

  // Son Cari Hareketler
  const ledger = db.prepare(`
    SELECT * FROM current_account_transactions 
    WHERE company_id = ? AND entity_type = 'CUSTOMER' AND entity_id = ?
    ORDER BY date DESC, created_at DESC LIMIT 50
  `).all(req.user!.companyId, customer.id);

  // Açık ve Bekleyen Faturalar
  const invoices = db.prepare(`
    SELECT id, invoice_no, issue_date, due_date, status, grand_total, paid_amount, remaining_amount
    FROM invoices
    WHERE company_id = ? AND customer_id = ? AND is_deleted = 0
    ORDER BY issue_date DESC LIMIT 20
  `).all(req.user!.companyId, customer.id);

  // İlişkili Belgeler
  const documents = db.prepare(`
    SELECT * FROM documents
    WHERE company_id = ? AND linked_entity_type = 'CUSTOMER' AND linked_entity_id = ? AND is_deleted = 0
  `).all(req.user!.companyId, customer.id);

  res.json({
    success: true,
    data: {
      customer,
      ledger,
      invoices,
      documents,
    },
  });
});

// 3. Müşteri Oluşturma
customerRouter.post('/', (req, res) => {
  const title = req.body.title;
  const contact_person = req.body.contact_person ?? req.body.contactPerson ?? '';
  const phone = req.body.phone ?? '';
  const email = req.body.email ?? '';
  const tax_office = req.body.tax_office ?? req.body.taxOffice ?? '';
  const tax_number = req.body.tax_number ?? req.body.taxNumber ?? '';
  const tc_identity = req.body.tc_identity ?? req.body.tcIdentity ?? '';
  const address = req.body.address ?? '';
  const city = req.body.city ?? '';
  const district = req.body.district ?? '';
  const credit_limit = req.body.credit_limit ?? req.body.creditLimit ?? 0;
  const payment_term_days = req.body.payment_term_days ?? req.body.paymentTerm ?? 30;
  const notes = req.body.notes ?? '';

  if (!title) {
    return res.status(400).json({ success: false, error: 'Müşteri / Firma unvanı zorunludur.' });
  }

  const companyId = req.user!.companyId;
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM customers WHERE company_id = ?').get(companyId) as { cnt: number };
  const code = req.body.code || `CARI-M-${String(countRow.cnt + 1).padStart(3, '0')}`;
  const id = uuidv4();

  db.prepare(`
    INSERT INTO customers (id, company_id, code, title, contact_person, phone, email, tax_office, tax_number, tc_identity, address, city, district, credit_limit, payment_term_days, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, companyId, code, title, contact_person, phone, email, tax_office, tax_number, tc_identity, address, city, district, Number(credit_limit) || 0, Number(payment_term_days) || 30, notes);

  auditLog(companyId, req.user!.userId, 'CREATE', 'CUSTOMER', id, { title, code });

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 4. Müşteri Güncelleme
customerRouter.put('/:id', (req, res) => {
  const title = req.body.title;
  const contact_person = req.body.contact_person ?? req.body.contactPerson;
  const phone = req.body.phone;
  const email = req.body.email;
  const tax_office = req.body.tax_office ?? req.body.taxOffice;
  const tax_number = req.body.tax_number ?? req.body.taxNumber;
  const tc_identity = req.body.tc_identity ?? req.body.tcIdentity;
  const address = req.body.address;
  const city = req.body.city;
  const district = req.body.district;
  const credit_limit = req.body.credit_limit ?? req.body.creditLimit;
  const payment_term_days = req.body.payment_term_days ?? req.body.paymentTerm;
  const notes = req.body.notes;

  db.prepare(`
    UPDATE customers
    SET title = COALESCE(?, title),
        contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        tax_office = COALESCE(?, tax_office),
        tax_number = COALESCE(?, tax_number),
        tc_identity = COALESCE(?, tc_identity),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        credit_limit = COALESCE(?, credit_limit),
        payment_term_days = COALESCE(?, payment_term_days),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).run(title, contact_person, phone, email, tax_office, tax_number, tc_identity, address, city, district, credit_limit, payment_term_days, notes, req.params.id, req.user!.companyId);

  auditLog(req.user!.companyId, req.user!.userId, 'UPDATE', 'CUSTOMER', req.params.id, req.body);
  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// 5. Müşteri Güvenli Soft Delete (Şifre & Onay Metni Teyitli)
customerRouter.delete('/:id', (req, res) => {
  const companyId = req.user!.companyId;
  const { password, confirmText } = req.body || {};

  // 1. Onay metni kontrolü (Varsa doğrula)
  if (confirmText !== undefined) {
    const norm = (confirmText || '').trim().toUpperCase().replace(/İ/g, 'I');
    if (norm !== 'OKUDUM ANLADIM') {
      return res.status(400).json({ success: false, error: 'Onay metni hatalı. Lütfen kutuya "OKUDUM ANLADIM" yazınız.' });
    }
  }

  // 2. Kullanıcı Şifresi Kontrolü
  if (password) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as any;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: 'Hesap şifreniz hatalı. Silme işlemi onaylanmadı.' });
    }
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Müşteri bulunamadı.' });
  }

  db.prepare('UPDATE customers SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, companyId);

  auditLog(companyId, req.user!.userId, 'SOFT_DELETE', 'CUSTOMER', req.params.id, { title: customer.title, code: customer.code });
  res.json({ success: true, message: 'Müşteri başarıyla çöp kutusuna taşındı.' });
});
