import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';
import { InvoiceEngine, round2 } from '../../services/invoice-engine';

export const quoteOrderRouter = Router();

quoteOrderRouter.use(authMiddleware);

// 1. Teklifleri Listele
quoteOrderRouter.get('/quotes', (req, res) => {
  const companyId = req.user!.companyId;
  const quotes = db.prepare(`
    SELECT q.*, c.title as customer_title, c.code as customer_code
    FROM quotes q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.company_id = ? AND q.is_deleted = 0
    ORDER BY q.issue_date DESC
  `).all(companyId);

  res.json({ success: true, data: quotes });
});

// 2. Yeni Teklif Ekle
quoteOrderRouter.post('/quotes', (req, res) => {
  const companyId = req.user!.companyId;
  const customer_id = req.body.customer_id ?? req.body.customerId;
  const issue_date = req.body.issue_date ?? req.body.issueDate;
  const valid_until = req.body.valid_until ?? req.body.validUntil;
  const notes = req.body.notes;
  const items = req.body.items || [];

  if (!customer_id || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Müşteri ve en az bir kalem zorunludur.' });
  }

  const calculation = InvoiceEngine.calculate(items);
  const company = db.prepare('SELECT quote_prefix, next_quote_number FROM companies WHERE id = ?').get(companyId) as any;
  const prefix = company.quote_prefix || 'TEK';
  const nextNum = company.next_quote_number || 1001;
  const quoteNo = `${prefix}-${String(nextNum).padStart(6, '0')}`;
  const quoteId = uuidv4();

  const tx = db.transaction(() => {
    db.prepare('UPDATE companies SET next_quote_number = next_quote_number + 1 WHERE id = ?').run(companyId);

    db.prepare(`
      INSERT INTO quotes (id, company_id, quote_no, customer_id, issue_date, valid_until, subtotal, discount_total, vat_total, grand_total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      quoteId,
      companyId,
      quoteNo,
      customer_id,
      issue_date || new Date().toISOString().split('T')[0],
      valid_until || new Date().toISOString().split('T')[0],
      calculation.subtotal,
      calculation.discountTotal,
      calculation.vatTotal,
      calculation.grandTotal,
      notes || ''
    );

    const insertItem = db.prepare(`
      INSERT INTO quote_items (id, quote_id, product_id, name, description, quantity, unit, unit_price, discount_percent, vat_rate, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    calculation.items.forEach((it) => {
      insertItem.run(uuidv4(), quoteId, it.productId || null, it.name, it.description || '', it.quantity, it.unit, it.unitPrice, it.discountPercent || 0, it.vatRate, it.totalAmount);
    });
  });

  tx();
  auditLog(companyId, req.user!.userId, 'CREATE', 'QUOTE', quoteId, { quoteNo, grandTotal: calculation.grandTotal });

  const created = db.prepare('SELECT * FROM quotes WHERE id = ?').get(quoteId);
  res.json({ success: true, data: created });
});

// 3. Teklifi Tek Tuşla Faturaya Dönüştürme (Convert to Invoice)
quoteOrderRouter.post('/quotes/:id/convert-to-invoice', (req, res) => {
  const companyId = req.user!.companyId;
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!quote) return res.status(404).json({ success: false, error: 'Teklif bulunamadı.' });

  const quoteItems = db.prepare('SELECT * FROM quote_items WHERE quote_id = ?').all(quote.id) as any[];

  // Fatura oluşturma işlemi
  const company = db.prepare('SELECT invoice_prefix, next_invoice_number FROM companies WHERE id = ?').get(companyId) as any;
  const prefix = company.invoice_prefix || 'FAT';
  const nextNum = company.next_invoice_number || 1001;
  const invoiceNo = `${prefix}-${String(nextNum).padStart(6, '0')}`;
  const invoiceId = uuidv4();
  const today = new Date().toISOString().split('T')[0];

  const convertTx = db.transaction(() => {
    db.prepare('UPDATE companies SET next_invoice_number = next_invoice_number + 1 WHERE id = ?').run(companyId);

    db.prepare(`
      INSERT INTO invoices (
        id, company_id, invoice_type, invoice_no, customer_id, issue_date, due_date,
        status, subtotal, discount_total, vat_total, grand_total, paid_amount, remaining_amount, notes
      ) VALUES (?, ?, 'SALES', ?, ?, ?, ?, 'ISSUED', ?, ?, ?, ?, 0, ?, ?)
    `).run(
      invoiceId,
      companyId,
      invoiceNo,
      quote.customer_id,
      today,
      today,
      quote.subtotal,
      quote.discount_total,
      quote.vat_total,
      quote.grand_total,
      quote.grand_total,
      `Tekliften dönüştürüldü: ${quote.quote_no}`
    );

    const insertInvItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, item_order, name, description, quantity, unit, unit_price, discount_percent, vat_rate, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    quoteItems.forEach((it, index) => {
      insertInvItem.run(uuidv4(), invoiceId, it.product_id, index + 1, it.name, it.description, it.quantity, it.unit, it.unit_price, it.discount_percent, it.vat_rate, it.total_amount);
    });

    // Teklif durumunu güncelle
    db.prepare("UPDATE quotes SET status = 'CONVERTED_TO_INVOICE', converted_invoice_id = ? WHERE id = ?")
      .run(invoiceId, quote.id);

    // Müşteri cari bakiyesini güncelle
    db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(quote.grand_total, quote.customer_id);

    db.prepare(`
      INSERT INTO current_account_transactions (
        id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id, date, document_no, debt, credit, balance, description
      ) VALUES (?, ?, 'CUSTOMER', ?, 'INVOICE', 'INVOICE', ?, ?, ?, ?, 0, 0, ?)
    `).run(uuidv4(), companyId, quote.customer_id, invoiceId, today, invoiceNo, quote.grand_total, `Satış Faturası (Tekliften): ${invoiceNo}`);
  });

  convertTx();
  auditLog(companyId, req.user!.userId, 'CONVERT_QUOTE_TO_INVOICE', 'QUOTE', quote.id, { invoiceId, invoiceNo });

  res.json({ success: true, message: 'Teklif faturaya dönüştürüldü.', invoiceId, invoiceNo });
});

// 4. Teklif Silme (Soft-delete)
quoteOrderRouter.delete('/quotes/:id', (req, res) => {
  const companyId = req.user!.companyId;
  db.prepare('UPDATE quotes SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, companyId);

  auditLog(companyId, req.user!.userId, 'SOFT_DELETE', 'QUOTE', req.params.id, {});
  res.json({ success: true, message: 'Teklif silindi.' });
});

// 5. Siparişler Listesi
quoteOrderRouter.get('/orders', (req, res) => {
  const companyId = req.user!.companyId;
  const orders = db.prepare(`
    SELECT o.*, c.title as customer_title
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.company_id = ? AND o.is_deleted = 0
    ORDER BY o.order_date DESC
  `).all(companyId);

  res.json({ success: true, data: orders });
});

// 6. Yeni Sipariş Oluştur
quoteOrderRouter.post('/orders', (req, res) => {
  const companyId = req.user!.companyId;
  const customer_id = req.body.customer_id ?? req.body.customerId;
  const order_date = req.body.order_date ?? req.body.orderDate ?? new Date().toISOString().split('T')[0];
  const total_amount = req.body.total_amount ?? req.body.totalAmount ?? 0;
  const notes = req.body.notes;

  if (!customer_id) {
    return res.status(400).json({ success: false, error: 'Müşteri seçimi zorunludur.' });
  }

  const id = uuidv4();
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE company_id = ?').get(companyId) as { cnt: number };
  const orderNo = `SIP-${String(countRow.cnt + 1).padStart(5, '0')}`;

  db.prepare(`
    INSERT INTO orders (id, company_id, order_no, customer_id, order_date, status, grand_total, notes)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(id, companyId, orderNo, customer_id, order_date, Number(total_amount) || 0, notes || '');

  auditLog(companyId, req.user!.userId, 'CREATE', 'ORDER', id, { orderNo });
  const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 7. Siparişi Tek Tuşla Faturaya Dönüştürme (Convert Order to Invoice)
quoteOrderRouter.post('/orders/:id/convert-to-invoice', (req, res) => {
  const companyId = req.user!.companyId;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!order) return res.status(404).json({ success: false, error: 'Sipariş bulunamadı.' });

  const company = db.prepare('SELECT invoice_prefix, next_invoice_number FROM companies WHERE id = ?').get(companyId) as any;
  const prefix = company.invoice_prefix || 'FAT';
  const nextNum = company.next_invoice_number || 1001;
  const invoiceNo = `${prefix}-${String(nextNum).padStart(6, '0')}`;
  const invoiceId = uuidv4();
  const today = new Date().toISOString().split('T')[0];

  const subtotal = round2(order.grand_total / 1.2);
  const vatTotal = round2(order.grand_total - subtotal);

  const convertTx = db.transaction(() => {
    db.prepare('UPDATE companies SET next_invoice_number = next_invoice_number + 1 WHERE id = ?').run(companyId);

    db.prepare(`
      INSERT INTO invoices (
        id, company_id, invoice_type, invoice_no, customer_id, issue_date, due_date,
        status, subtotal, discount_total, vat_total, grand_total, paid_amount, remaining_amount, notes
      ) VALUES (?, ?, 'SALES', ?, ?, ?, ?, 'ISSUED', ?, 0, ?, ?, 0, ?, ?)
    `).run(
      invoiceId,
      companyId,
      invoiceNo,
      order.customer_id,
      today,
      today,
      subtotal,
      vatTotal,
      order.grand_total,
      order.grand_total,
      `Siparişten dönüştürüldü: ${order.order_no} - ${order.notes || ''}`
    );

    // Fatura kalemi ekle
    db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, item_order, name, description, quantity, unit, unit_price, vat_rate, total_amount
      ) VALUES (?, ?, 1, ?, ?, 1, 'Adet', ?, 20, ?)
    `).run(
      uuidv4(),
      invoiceId,
      `Sipariş Kalemi (${order.order_no})`,
      order.notes || 'Siparişten otomatik oluşturulan fatura',
      subtotal,
      order.grand_total
    );

    // Sipariş durumunu güncelle
    db.prepare("UPDATE orders SET status = 'COMPLETED', converted_invoice_id = ? WHERE id = ?")
      .run(invoiceId, order.id);

    // Müşteri cari bakiyesini güncelle
    db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(order.grand_total, order.customer_id);

    db.prepare(`
      INSERT INTO current_account_transactions (
        id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id, date, document_no, debt, credit, balance, description
      ) VALUES (?, ?, 'CUSTOMER', ?, 'INVOICE', 'INVOICE', ?, ?, ?, ?, 0, 0, ?)
    `).run(uuidv4(), companyId, order.customer_id, invoiceId, today, invoiceNo, order.grand_total, `Satış Faturası (Siparişten): ${invoiceNo}`);
  });

  convertTx();
  auditLog(companyId, req.user!.userId, 'CONVERT_ORDER_TO_INVOICE', 'ORDER', order.id, { invoiceId, invoiceNo });

  res.json({ success: true, message: 'Sipariş faturaya dönüştürüldü.', invoiceId, invoiceNo });
});

// 8. Sipariş Sil (Soft-delete)
quoteOrderRouter.delete('/orders/:id', (req, res) => {
  const companyId = req.user!.companyId;
  db.prepare('UPDATE orders SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, companyId);

  auditLog(companyId, req.user!.userId, 'SOFT_DELETE', 'ORDER', req.params.id, {});
  res.json({ success: true, message: 'Sipariş silindi.' });
});
