import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';
import { round2 } from '../../services/invoice-engine';

export const paymentPlanRouter = Router();

paymentPlanRouter.use(authMiddleware);

// 1. Ödeme Planları & Taksitleri Listele
paymentPlanRouter.get('/', (req, res) => {
  const companyId = req.user!.companyId;
  const status = req.query.status as string; // PENDING, PAID, OVERDUE
  const invoiceId = req.query.invoiceId as string;
  const today = new Date().toISOString().split('T')[0];

  let query = `
    SELECT pp.*, 
           i.invoice_no,
           CASE WHEN pp.entity_type = 'CUSTOMER' THEN c.title ELSE s.title END as entity_name
    FROM payment_plans pp
    LEFT JOIN invoices i ON i.id = pp.invoice_id
    LEFT JOIN customers c ON c.id = pp.entity_id AND pp.entity_type = 'CUSTOMER'
    LEFT JOIN suppliers s ON s.id = pp.entity_id AND pp.entity_type = 'SUPPLIER'
    WHERE pp.company_id = ?
  `;
  const params: any[] = [companyId];

  if (invoiceId) {
    query += ' AND pp.invoice_id = ?';
    params.push(invoiceId);
  }

  if (status === 'OVERDUE') {
    query += ' AND pp.status = "PENDING" AND pp.due_date < ?';
    params.push(today);
  } else if (status) {
    query += ' AND pp.status = ?';
    params.push(status);
  }

  query += ' ORDER BY pp.due_date ASC';

  const rows = db.prepare(query).all(...params);

  // Otomatik gecikme kontrolü
  const updatedRows = rows.map((r: any) => {
    if (r.status === 'PENDING' && r.due_date < today) {
      return { ...r, isOverdue: true };
    }
    return { ...r, isOverdue: false };
  });

  res.json({ success: true, data: updatedRows });
});

// 2. Yeni Manuel Taksit / Ödeme Planı Ekle
paymentPlanRouter.post('/', (req, res) => {
  const companyId = req.user!.companyId;
  const entity_type = req.body.entity_type ?? req.body.entityType ?? 'CUSTOMER';
  const entity_id = req.body.entity_id ?? req.body.entityId;
  const amount = req.body.amount;
  const due_date = req.body.due_date ?? req.body.dueDate;
  const notes = req.body.notes;

  const numAmount = round2(Number(amount));
  if (!entity_id || !numAmount || numAmount <= 0 || !due_date) {
    return res.status(400).json({ success: false, error: 'Cari seçimi, tutar ve vade tarihi zorunludur.' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO payment_plans (id, company_id, entity_type, entity_id, total_amount, installment_no, installment_count, due_date, amount, paid_amount, status, notes)
    VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, 0, 'PENDING', ?)
  `).run(id, companyId, entity_type, entity_id, numAmount, due_date, numAmount, notes || 'Manuel Vade Planı');

  auditLog(companyId, req.user!.userId, 'CREATE', 'PAYMENT_PLAN', id, { numAmount, due_date });
  const created = db.prepare('SELECT * FROM payment_plans WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 3. Taksit Ödemesi Kaydetme
paymentPlanRouter.post('/:id/pay', (req, res) => {
  const companyId = req.user!.companyId;
  const account_id = req.body.account_id ?? req.body.accountId;
  const payment_date = req.body.payment_date ?? req.body.paymentDate ?? new Date().toISOString().split('T')[0];

  const plan = db.prepare('SELECT * FROM payment_plans WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!plan) {
    return res.status(404).json({ success: false, error: 'Ödeme taksidi bulunamadı.' });
  }

  if (plan.status === 'PAID') {
    return res.status(400).json({ success: false, error: 'Bu taksit zaten ödenmiş.' });
  }

  if (!account_id) {
    return res.status(400).json({ success: false, error: 'Tahsilat/Ödeme yapılacak kasa veya banka seçilmelidir.' });
  }

  const payTx = db.transaction(() => {
    // 1. Taksiti güncelle
    db.prepare(`
      UPDATE payment_plans 
      SET status = 'PAID', paid_amount = amount, paid_at = ?
      WHERE id = ?
    `).run(payment_date, plan.id);

    // 2. Kasa/Banka hareketini yap
    const isCustomer = plan.entity_type === 'CUSTOMER';
    const delta = isCustomer ? plan.amount : -plan.amount;

    db.prepare('UPDATE cash_banks SET current_balance = current_balance + ? WHERE id = ?')
      .run(delta, account_id);

    db.prepare(`
      INSERT INTO financial_transactions (
        id, company_id, account_id, type, amount, currency, amount_try, date, related_type, related_id, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      companyId,
      account_id,
      isCustomer ? 'INFLOW' : 'OUTFLOW',
      plan.amount,
      'TRY',
      plan.amount,
      payment_date,
      'PAYMENT_PLAN',
      plan.id,
      `${plan.installment_no}/${plan.installment_count}. Taksit Ödemesi`
    );

    // 3. Fatura varsa faturanın ödenen tutarını arttır
    if (plan.invoice_id) {
      const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(plan.invoice_id) as any;
      if (inv) {
        const newPaid = round2(inv.paid_amount + plan.amount);
        const newRemaining = round2(Math.max(0, inv.grand_total - newPaid));
        const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL_PAID';
        db.prepare('UPDATE invoices SET paid_amount = ?, remaining_amount = ?, status = ? WHERE id = ?')
          .run(newPaid, newRemaining, newStatus, inv.id);
      }
    }
  });

  payTx();
  auditLog(companyId, req.user!.userId, 'PAY_INSTALLMENT', 'PAYMENT_PLAN', plan.id, { amount: plan.amount });

  const updated = db.prepare('SELECT * FROM payment_plans WHERE id = ?').get(plan.id);
  res.json({ success: true, data: updated });
});

// 4. Ödeme Planını Sil
paymentPlanRouter.delete('/:id', (req, res) => {
  const companyId = req.user!.companyId;
  db.prepare('DELETE FROM payment_plans WHERE id = ? AND company_id = ?').run(req.params.id, companyId);
  auditLog(companyId, req.user!.userId, 'DELETE', 'PAYMENT_PLAN', req.params.id, {});
  res.json({ success: true, message: 'Ödeme planı kaydı silindi.' });
});
