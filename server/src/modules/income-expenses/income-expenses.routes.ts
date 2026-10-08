import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';
import { round2 } from '../../services/invoice-engine';

export const incomeExpenseRouter = Router();

incomeExpenseRouter.use(authMiddleware);

// 1. Gelir & Giderleri Listele
incomeExpenseRouter.get('/', (req, res) => {
  const companyId = req.user!.companyId;
  const type = req.query.type as string; // INCOME or EXPENSE
  const recurring = req.query.recurring === 'true';
  const categoryId = req.query.categoryId as string;

  let query = `
    SELECT ie.*, c.name as category_name, c.color as category_color,
           cb.name as account_name
    FROM income_expenses ie
    LEFT JOIN categories c ON c.id = ie.category_id
    LEFT JOIN cash_banks cb ON cb.id = ie.account_id
    WHERE ie.company_id = ? AND ie.is_deleted = 0
  `;
  const params: any[] = [companyId];

  if (type) {
    query += ' AND ie.type = ?';
    params.push(type);
  }

  if (recurring) {
    query += ' AND ie.is_recurring = 1';
  }

  if (categoryId) {
    query += ' AND ie.category_id = ?';
    params.push(categoryId);
  }

  query += ' ORDER BY ie.date DESC, ie.created_at DESC';

  const rows = db.prepare(query).all(...params);
  res.json({ success: true, data: rows });
});

// 2. Yeni Gelir veya Gider Ekle
incomeExpenseRouter.post('/', (req, res) => {
  const companyId = req.user!.companyId;
  const type = req.body.type; // 'INCOME' or 'EXPENSE'
  const category_id = req.body.category_id ?? req.body.categoryId ?? null;
  const customer_id = req.body.customer_id ?? req.body.customerId ?? null;
  const supplier_id = req.body.supplier_id ?? req.body.supplierId ?? null;
  const account_id = req.body.account_id ?? req.body.accountId ?? null;
  const date = req.body.date || new Date().toISOString().split('T')[0];
  const amount = req.body.amount;
  const vat_rate = req.body.vat_rate !== undefined ? req.body.vat_rate : (req.body.vatRate !== undefined ? req.body.vatRate : 0);
  const currency = req.body.currency || 'TRY';
  const payment_status = req.body.payment_status ?? req.body.paymentStatus ?? 'PAID';
  const is_recurring = req.body.is_recurring ?? req.body.isRecurring ?? 0;
  const recurrence_interval = req.body.recurrence_interval ?? req.body.recurrenceInterval ?? null;
  const notes = req.body.notes || '';

  const rawAmount = round2(Number(amount));
  if (!type || !rawAmount || rawAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Tür ve geçerli bir tutar zorunludur.' });
  }

  const vat = round2(rawAmount * ((Number(vat_rate) || 0) / 100));
  const totalAmount = round2(rawAmount + vat);
  const id = uuidv4();

  const recordTx = db.transaction(() => {
    // 1. Gelir/Gider tablosuna yaz
    db.prepare(`
      INSERT INTO income_expenses (
        id, company_id, type, category_id, customer_id, supplier_id, account_id,
        date, amount, vat_rate, vat_amount, total_amount, currency, payment_status,
        is_recurring, recurrence_interval, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      companyId,
      type,
      category_id || null,
      customer_id || null,
      supplier_id || null,
      account_id || null,
      date,
      rawAmount,
      Number(vat_rate) || 0,
      vat,
      totalAmount,
      currency,
      payment_status,
      is_recurring ? 1 : 0,
      recurrence_interval || null,
      notes || ''
    );

    // 2. Eğer ödendi ise ve hesap seçilmişse Kasa/Banka bakiyesini güncelle
    if (payment_status === 'PAID' && account_id) {
      const delta = type === 'INCOME' ? totalAmount : -totalAmount;
      db.prepare('UPDATE cash_banks SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(delta, account_id);

      db.prepare(`
        INSERT INTO financial_transactions (
          id, company_id, account_id, type, amount, currency, amount_try, date, related_type, related_id, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        companyId,
        account_id,
        type === 'INCOME' ? 'INFLOW' : 'OUTFLOW',
        totalAmount,
        currency,
        totalAmount,
        date,
        type,
        id,
        `${type === 'INCOME' ? 'Gelir' : 'Gider'}: ${notes || ''}`
      );
    }
  });

  recordTx();
  auditLog(companyId, req.user!.userId, 'CREATE', type, id, { totalAmount, notes });

  const created = db.prepare('SELECT * FROM income_expenses WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 3. Gelir/Gider Sil (Soft Delete)
incomeExpenseRouter.delete('/:id', (req, res) => {
  db.prepare('UPDATE income_expenses SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, req.user!.companyId);

  auditLog(req.user!.companyId, req.user!.userId, 'SOFT_DELETE', 'INCOME_EXPENSE', req.params.id, {});
  res.json({ success: true, message: 'Kayıt çöp kutusuna taşındı.' });
});
