import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';
import { round2 } from '../../services/invoice-engine';

export const cashBankRouter = Router();

cashBankRouter.use(authMiddleware);

// 1. Kasa ve Bankaları Listele
cashBankRouter.get('/', (req, res) => {
  const accounts = db.prepare('SELECT * FROM cash_banks WHERE company_id = ? AND is_deleted = 0 ORDER BY type ASC, name ASC')
    .all(req.user!.companyId);

  res.json({ success: true, data: accounts });
});

// 2. Yeni Kasa veya Banka Hesabı Ekle
cashBankRouter.post('/', (req, res) => {
  const type = req.body.type;
  const name = req.body.name;
  const bank_name = req.body.bank_name ?? req.body.bankName;
  const branch = req.body.branch;
  const account_no = req.body.account_no ?? req.body.accountNo;
  const iban = req.body.iban;
  const currency = req.body.currency || 'TRY';
  const opening_balance = req.body.opening_balance ?? req.body.openingBalance ?? 0;

  if (!type || !name) {
    return res.status(400).json({ success: false, error: 'Hesap türü (Kasa/Banka) ve adı zorunludur.' });
  }

  const id = uuidv4();
  const initBal = round2(Number(opening_balance) || 0);

  db.prepare(`
    INSERT INTO cash_banks (id, company_id, type, name, bank_name, branch, account_no, iban, currency, opening_balance, current_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user!.companyId, type, name, bank_name || null, branch || null, account_no || null, iban || null, currency, initBal, initBal);

  auditLog(req.user!.companyId, req.user!.userId, 'CREATE', 'CASH_BANK', id, { name, type, initBal });

  const created = db.prepare('SELECT * FROM cash_banks WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 3. Hesap Hareketleri
cashBankRouter.get('/:id/transactions', (req, res) => {
  const transactions = db.prepare(`
    SELECT * FROM financial_transactions 
    WHERE company_id = ? AND account_id = ?
    ORDER BY date DESC, created_at DESC LIMIT 100
  `).all(req.user!.companyId, req.params.id);

  res.json({ success: true, data: transactions });
});

// 4. Kasa <-> Banka Varlık Transferi (Gelir/Gider Değildir!)
cashBankRouter.post('/transfer', (req, res) => {
  const companyId = req.user!.companyId;
  const source_account_id = req.body.source_account_id ?? req.body.sourceAccountId;
  const destination_account_id = req.body.destination_account_id ?? req.body.destinationAccountId;
  const amount = req.body.amount;
  const fee = req.body.fee ?? 0;
  const date = req.body.date || new Date().toISOString().split('T')[0];
  const description = req.body.description;

  const transAmount = round2(Number(amount));
  const transferFee = round2(Number(fee) || 0);

  if (!source_account_id || !destination_account_id) {
    return res.status(400).json({ success: false, error: 'Kaynak ve hedef hesap seçilmelidir.' });
  }

  if (source_account_id === destination_account_id) {
    return res.status(400).json({ success: false, error: 'Kaynak ve hedef hesap aynı olamaz.' });
  }

  if (!transAmount || transAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Geçerli bir transfer tutarı giriniz.' });
  }

  const source = db.prepare('SELECT * FROM cash_banks WHERE id = ? AND company_id = ?').get(source_account_id, companyId) as any;
  const destination = db.prepare('SELECT * FROM cash_banks WHERE id = ? AND company_id = ?').get(destination_account_id, companyId) as any;

  if (!source || !destination) {
    return res.status(404).json({ success: false, error: 'Hesaplardan biri veya her ikisi bulunamadı.' });
  }

  const transferId = uuidv4();

  const transferTx = db.transaction(() => {
    // 1. Kaynak hesaptan düş (Tutar + Masraf)
    const sourceDeduction = round2(transAmount + transferFee);
    db.prepare('UPDATE cash_banks SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(sourceDeduction, source.id);

    // 2. Hedef hesaba ekle
    db.prepare('UPDATE cash_banks SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(transAmount, destination.id);

    // 3. Transfer kaydı
    db.prepare(`
      INSERT INTO transfers (id, company_id, source_account_id, destination_account_id, amount, fee, date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(transferId, companyId, source.id, destination.id, transAmount, transferFee, date, description || 'Hesaplar arası varlık transferi');

    // 4. Finansal hareketler
    db.prepare(`
      INSERT INTO financial_transactions (id, company_id, account_id, type, amount, currency, amount_try, date, related_type, related_id, description)
      VALUES (?, ?, ?, 'TRANSFER', ?, ?, ?, ?, 'TRANSFER', ?, ?)
    `).run(uuidv4(), companyId, source.id, sourceDeduction, source.currency, sourceDeduction, date, transferId, `${destination.name} hesabına transfer`);

    db.prepare(`
      INSERT INTO financial_transactions (id, company_id, account_id, type, amount, currency, amount_try, date, related_type, related_id, description)
      VALUES (?, ?, ?, 'TRANSFER', ?, ?, ?, ?, 'TRANSFER', ?, ?)
    `).run(uuidv4(), companyId, destination.id, transAmount, destination.currency, transAmount, date, transferId, `${source.name} hesabından gelen transfer`);
  });

  transferTx();
  auditLog(companyId, req.user!.userId, 'TRANSFER', 'CASH_BANK', transferId, { from: source.name, to: destination.name, transAmount });

  res.json({ success: true, message: 'Transfer başarıyla gerçekleştirildi.' });
});

// 5. Hesap Güncelleme
cashBankRouter.put('/:id', (req, res) => {
  const companyId = req.user!.companyId;
  const { name, bank_name, branch, account_no, iban } = req.body;

  db.prepare(`
    UPDATE cash_banks
    SET name = COALESCE(?, name),
        bank_name = COALESCE(?, bank_name),
        branch = COALESCE(?, branch),
        account_no = COALESCE(?, account_no),
        iban = COALESCE(?, iban),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).run(name, bank_name, branch, account_no, iban, req.params.id, companyId);

  auditLog(companyId, req.user!.userId, 'UPDATE', 'CASH_BANK', req.params.id, req.body);
  const updated = db.prepare('SELECT * FROM cash_banks WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// 6. Hesap Silme (Soft-delete)
cashBankRouter.delete('/:id', (req, res) => {
  const companyId = req.user!.companyId;
  db.prepare('UPDATE cash_banks SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, companyId);

  auditLog(companyId, req.user!.userId, 'SOFT_DELETE', 'CASH_BANK', req.params.id, {});
  res.json({ success: true, message: 'Hesap silindi.' });
});
