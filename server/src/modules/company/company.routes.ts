import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';

export const companyRouter = Router();

companyRouter.use(authMiddleware);

companyRouter.get('/', (req, res) => {
  const companies = db.prepare(`
    SELECT c.*, uc.role as user_role
    FROM user_companies uc
    JOIN companies c ON c.id = uc.company_id
    WHERE uc.user_id = ? AND c.is_deleted = 0
    ORDER BY c.name ASC
  `).all(req.user!.userId);

  res.json({ success: true, data: companies });
});

companyRouter.post('/', (req, res) => {
  const { name, legalTitle, taxOffice, taxNumber, address, city, district, phone, email, iban, bankInfo } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Şirket adı zorunludur.' });
  }

  const companyId = `comp-${uuidv4().substring(0, 8)}`;

  const insertCompany = db.prepare(`
    INSERT INTO companies (id, name, legal_title, tax_office, tax_number, address, city, district, phone, email, iban, bank_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUC = db.prepare(`
    INSERT INTO user_companies (id, user_id, company_id, role, is_default)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Default cash and bank accounts for the new company
  const insertCash = db.prepare(`
    INSERT INTO cash_banks (id, company_id, type, name, currency, opening_balance, current_balance, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertCompany.run(companyId, name, legalTitle || name, taxOffice || '', taxNumber || '', address || '', city || '', district || '', phone || '', email || '', iban || '', bankInfo || '');
    insertUC.run(uuidv4(), req.user!.userId, companyId, 'COMPANY_OWNER', 0);
    insertCash.run(uuidv4(), companyId, 'CASH', 'Merkez Kasa', 'TRY', 0, 0, 1);
  });

  transaction();
  auditLog(companyId, req.user!.userId, 'CREATE', 'COMPANY', companyId, { name });

  const newCompany = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  res.json({ success: true, data: newCompany });
});

companyRouter.get('/current', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user!.companyId);
  if (!company) {
    return res.status(404).json({ success: false, error: 'Şirket bulunamadı.' });
  }
  res.json({ success: true, data: company });
});

companyRouter.put('/current', (req, res) => {
  const name = req.body.name;
  const legal_title = req.body.legal_title ?? req.body.legalTitle;
  const tax_office = req.body.tax_office ?? req.body.taxOffice;
  const tax_number = req.body.tax_number ?? req.body.taxNumber;
  const address = req.body.address;
  const city = req.body.city;
  const district = req.body.district;
  const phone = req.body.phone;
  const email = req.body.email;
  const website = req.body.website;
  const iban = req.body.iban;
  const bank_info = req.body.bank_info ?? req.body.bankInfo;
  const invoice_prefix = req.body.invoice_prefix ?? req.body.invoicePrefix;
  const logo_url = req.body.logo_url ?? req.body.logoUrl;

  db.prepare(`
    UPDATE companies
    SET name = COALESCE(?, name),
        legal_title = COALESCE(?, legal_title),
        tax_office = COALESCE(?, tax_office),
        tax_number = COALESCE(?, tax_number),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        website = COALESCE(?, website),
        iban = COALESCE(?, iban),
        bank_info = COALESCE(?, bank_info),
        invoice_prefix = COALESCE(?, invoice_prefix),
        logo_url = COALESCE(?, logo_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, legal_title, tax_office, tax_number, address, city, district, phone, email, website, iban, bank_info, invoice_prefix, logo_url, req.user!.companyId);

  auditLog(req.user!.companyId, req.user!.userId, 'UPDATE', 'COMPANY', req.user!.companyId, req.body);
  const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user!.companyId);
  res.json({ success: true, data: updated });
});
