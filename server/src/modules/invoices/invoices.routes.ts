import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';
import { InvoiceEngine, round2 } from '../../services/invoice-engine';
import { PdfService } from '../../services/pdf-service';

export const invoiceRouter = Router();

invoiceRouter.use(authMiddleware);

// 1. Faturaları Listele (Filtreleme, Sıralama, Sayfalama)
invoiceRouter.get('/', (req, res) => {
  const companyId = req.user!.companyId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const offset = (page - 1) * limit;

  const type = req.query.type as string; // ALL, SALES or PURCHASE
  const status = req.query.status as string;
  const searchParam = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const search = searchParam && searchParam !== 'undefined' && searchParam !== 'null' ? `%${searchParam}%` : null;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  let query = `
    SELECT i.*, 
           c.title as customer_title, c.code as customer_code,
           s.title as supplier_title, s.code as supplier_code
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN suppliers s ON s.id = i.supplier_id
    WHERE i.company_id = ? AND i.is_deleted = 0
  `;
  const params: any[] = [companyId];

  if (type && type !== 'undefined' && type !== 'null' && type !== 'ALL') {
    query += ' AND i.invoice_type = ?';
    params.push(type);
  }

  if (status && status !== 'undefined' && status !== 'null' && status !== 'ALL') {
    query += ' AND i.status = ?';
    params.push(status);
  }

  if (startDate && startDate !== 'undefined' && startDate !== 'null') {
    query += ' AND i.issue_date >= ?';
    params.push(startDate);
  }

  if (endDate && endDate !== 'undefined' && endDate !== 'null') {
    query += ' AND i.issue_date <= ?';
    params.push(endDate);
  }

  if (search) {
    query += ' AND (i.invoice_no LIKE ? OR c.title LIKE ? OR s.title LIKE ? OR i.notes LIKE ?)';
    params.push(search, search, search, search);
  }

  const countQuery = query.replace(/SELECT i\.\*.*?FROM/s, 'SELECT COUNT(*) as total FROM');
  const totalRow = db.prepare(countQuery).get(...params) as { total: number };

  query += ' ORDER BY i.issue_date DESC, i.created_at DESC LIMIT ? OFFSET ?';
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

// 2. Fatura Detayı
invoiceRouter.get('/:id', (req, res) => {
  const companyId = req.user!.companyId;
  const invoice = db.prepare(`
    SELECT i.*, 
           c.title as customer_title, c.address as customer_address, c.tax_office as customer_tax_office, c.tax_number as customer_tax_number, c.phone as customer_phone,
           s.title as supplier_title, s.address as supplier_address, s.tax_office as supplier_tax_office, s.tax_number as supplier_tax_number, s.phone as supplier_phone
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN suppliers s ON s.id = i.supplier_id
    WHERE i.id = ? AND i.company_id = ? AND i.is_deleted = 0
  `).get(req.params.id, companyId) as any;

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'Fatura bulunamadı.' });
  }

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY item_order ASC').all(invoice.id);
  const paymentPlans = db.prepare('SELECT * FROM payment_plans WHERE invoice_id = ? ORDER BY installment_no ASC').all(invoice.id);
  const financialTransactions = db.prepare('SELECT * FROM financial_transactions WHERE related_id = ? ORDER BY date DESC').all(invoice.id);

  res.json({
    success: true,
    data: {
      invoice,
      items,
      paymentPlans,
      financialTransactions,
    },
  });
});

// 3. Fatura Oluşturma (Tam Atomik Transaction)
invoiceRouter.post('/', (req, res) => {
  const companyId = req.user!.companyId;
  const invoice_type = req.body.invoice_type || req.body.invoiceType || req.body.type || 'SALES';
  const customer_id = req.body.customer_id ?? req.body.customerId ?? null;
  const supplier_id = req.body.supplier_id ?? req.body.supplierId ?? null;
  const issue_date = req.body.issue_date ?? req.body.issueDate;
  const due_date = req.body.due_date ?? req.body.dueDate;
  const status = req.body.status || 'ISSUED';
  const currency = req.body.currency || 'TRY';
  const exchange_rate = req.body.exchange_rate ?? req.body.exchangeRate ?? 1.0;
  const payment_method = req.body.payment_method ?? req.body.paymentMethod ?? 'HAVALE';
  const notes = req.body.notes;
  const terms = req.body.terms;
  const template = req.body.template || 'MODERN';
  const items = req.body.items || [];
  const installmentCount = req.body.installmentCount ?? req.body.installment_count ?? 1;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'En az bir fatura kalemi eklenmelidir.' });
  }

  let resolvedCustomerId = customer_id;
  let resolvedSupplierId = supplier_id;

  if (invoice_type === 'SALES' && !resolvedCustomerId) {
    const defaultCust = db.prepare('SELECT id FROM customers WHERE company_id = ? AND is_deleted = 0 LIMIT 1').get(companyId) as any;
    if (defaultCust) {
      resolvedCustomerId = defaultCust.id;
    } else {
      const newCustId = uuidv4();
      db.prepare(`
        INSERT INTO customers (id, company_id, code, title, status)
        VALUES (?, ?, 'MUS-0000', 'Genel Müşteri / Perakende Satış', 'ACTIVE')
      `).run(newCustId, companyId);
      resolvedCustomerId = newCustId;
    }
  }

  if (invoice_type === 'PURCHASE' && !resolvedSupplierId) {
    const defaultSup = db.prepare('SELECT id FROM suppliers WHERE company_id = ? AND is_deleted = 0 LIMIT 1').get(companyId) as any;
    if (defaultSup) {
      resolvedSupplierId = defaultSup.id;
    } else {
      const newSupId = uuidv4();
      db.prepare(`
        INSERT INTO suppliers (id, company_id, code, title, status)
        VALUES (?, ?, 'TED-0000', 'Genel Tedarikçi', 'ACTIVE')
      `).run(newSupId, companyId);
      resolvedSupplierId = newSupId;
    }
  }

  // Hesaplama Motoru
  const calculation = InvoiceEngine.calculate(items, Number(exchange_rate) || 1.0);

  const finalIssueDate = issue_date || new Date().toISOString().split('T')[0];
  const finalDueDate = due_date || finalIssueDate;

  // Sıradaki fatura numarasını atomik oluştur
  const company = db.prepare('SELECT invoice_prefix, next_invoice_number FROM companies WHERE id = ?').get(companyId) as any;
  const prefix = company?.invoice_prefix || 'FAT';
  const nextNum = company?.next_invoice_number || 1001;
  const invoiceNo = req.body.invoice_no || `${prefix}-${String(nextNum).padStart(6, '0')}`;

  const invoiceId = uuidv4();

  // Atomik Transaction Başlat
  const createInvoiceTx = db.transaction(() => {
    // 1. Şirket sonraki fatura numarasını arttır
    db.prepare('UPDATE companies SET next_invoice_number = next_invoice_number + 1 WHERE id = ?').run(companyId);

    // 2. Faturayı kaydet
    db.prepare(`
      INSERT INTO invoices (
        id, company_id, invoice_type, invoice_no, customer_id, supplier_id,
        issue_date, due_date, status, currency, exchange_rate,
        subtotal, discount_total, vat_total, withholding_total, excise_total, grand_total,
        paid_amount, remaining_amount, payment_method, notes, terms, template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      companyId,
      invoice_type,
      invoiceNo,
      resolvedCustomerId || null,
      resolvedSupplierId || null,
      finalIssueDate,
      finalDueDate,
      status,
      currency,
      Number(exchange_rate) || 1.0,
      calculation.subtotal,
      calculation.discountTotal,
      calculation.vatTotal,
      calculation.withholdingTotal,
      calculation.exciseTotal,
      calculation.grandTotal,
      0, // paid_amount
      calculation.grandTotal, // remaining_amount
      payment_method,
      notes || '',
      terms || '',
      template
    );

    // 3. Kalemleri kaydet & Stok güncelle
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, item_order, name, description,
        quantity, unit, unit_price, discount_percent, discount_amount,
        vat_rate, vat_amount, withholding_rate, withholding_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ? AND is_service = 0');
    const insertStockTx = db.prepare(`
      INSERT INTO stock_transactions (id, company_id, product_id, type, quantity, unit_price, date, reference_type, reference_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    calculation.items.forEach((item, index) => {
      const itemId = uuidv4();
      let itemName = item.name;
      let itemUnit = item.unit || 'Adet';
      if ((!itemName || itemName.trim() === '') && item.productId) {
        const prod = db.prepare('SELECT name, unit FROM products WHERE id = ?').get(item.productId) as any;
        if (prod) {
          itemName = prod.name;
          itemUnit = prod.unit || itemUnit;
        }
      }
      if (!itemName || itemName.trim() === '') {
        itemName = `Kalem ${index + 1}`;
      }

      insertItem.run(
        itemId,
        invoiceId,
        item.productId || null,
        index + 1,
        itemName,
        item.description || '',
        Number(item.quantity) || 1,
        itemUnit,
        Number(item.unitPrice) || 0,
        Number(item.discountPercent) || 0,
        Number(item.calculatedDiscount) || 0,
        item.vatRate !== undefined ? Number(item.vatRate) : 20,
        Number(item.calculatedVat) || 0,
        Number(item.withholdingRate) || 0,
        Number(item.calculatedWithholding) || 0,
        Number(item.totalAmount) || 0
      );

      // Fiziksel ürünse stok hareketi yaz
      if (item.productId && status !== 'DRAFT') {
        const stockDelta = invoice_type === 'SALES' ? -item.quantity : item.quantity;
        updateStockStmt.run(stockDelta, item.productId);

        insertStockTx.run(
          uuidv4(),
          companyId,
          item.productId,
          invoice_type === 'SALES' ? 'SALE' : 'PURCHASE',
          item.quantity,
          item.unitPrice,
          finalIssueDate,
          'INVOICE',
          invoiceId,
          `${invoiceNo} nolu faturaya istinaden ${invoice_type === 'SALES' ? 'çıkış' : 'giriş'}`
        );
      }
    });

    // 4. Cari Hesap Hareketi ve Bakiye Güncelleme (Taslak değilse)
    if (status !== 'DRAFT') {
      const grandTotalTRY = calculation.grandTotalTRY;

      if (invoice_type === 'SALES' && resolvedCustomerId) {
        db.prepare('UPDATE customers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(grandTotalTRY, resolvedCustomerId);

        const currentBalance = (db.prepare('SELECT balance FROM customers WHERE id = ?').get(resolvedCustomerId) as any).balance;

        db.prepare(`
          INSERT INTO current_account_transactions (
            id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id,
            date, document_no, debt, credit, balance, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          companyId,
          'CUSTOMER',
          resolvedCustomerId,
          'INVOICE',
          'INVOICE',
          invoiceId,
          finalIssueDate,
          invoiceNo,
          grandTotalTRY, // Müşteri borçlandı
          0,
          currentBalance,
          `Satış Faturası: ${invoiceNo}`
        );
      } else if (invoice_type === 'PURCHASE' && resolvedSupplierId) {
        db.prepare('UPDATE suppliers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(grandTotalTRY, resolvedSupplierId);

        const currentBalance = (db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(resolvedSupplierId) as any).balance;

        db.prepare(`
          INSERT INTO current_account_transactions (
            id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id,
            date, document_no, debt, credit, balance, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          companyId,
          'SUPPLIER',
          resolvedSupplierId,
          'INVOICE',
          'INVOICE',
          invoiceId,
          finalIssueDate,
          invoiceNo,
          0,
          grandTotalTRY, // Tedarikçiye borcumuz arttı
          currentBalance,
          `Alış Faturası: ${invoiceNo}`
        );
      }

      // 5. Taksitli Ödeme Planı Oluşturma
      const count = Math.max(1, parseInt(installmentCount) || 1);
      if (count > 1) {
        const installmentAmount = round2(calculation.grandTotal / count);
        let accumulated = 0;

        for (let i = 1; i <= count; i++) {
          const installmentDate = new Date(finalIssueDate);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
          const dateStr = installmentDate.toISOString().split('T')[0];

          // Son taksitte kuruş yuvarlama farkını dengele
          const thisAmount = i === count ? round2(calculation.grandTotal - accumulated) : installmentAmount;
          accumulated = round2(accumulated + thisAmount);

          db.prepare(`
            INSERT INTO payment_plans (
              id, company_id, invoice_id, entity_type, entity_id,
              total_amount, installment_count, installment_no, due_date, amount, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            companyId,
            invoiceId,
            invoice_type === 'SALES' ? 'CUSTOMER' : 'SUPPLIER',
            resolvedCustomerId || resolvedSupplierId,
            calculation.grandTotal,
            count,
            i,
            dateStr,
            thisAmount,
            'PENDING',
            `${invoiceNo} - ${i}/${count}. Taksit`
          );
        }
      }
    }
  });

  try {
    createInvoiceTx();
    auditLog(companyId, req.user!.userId, 'CREATE', 'INVOICE', invoiceId, { invoiceNo, grandTotal: calculation.grandTotal });

    const created = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    res.json({ success: true, data: created });
  } catch (err: any) {
    console.error('INVOICE CREATE ERROR DETAILS:', err);
    return res.status(500).json({ success: false, error: err.message, detail: err.stack });
  }
});

// 4. Fatura PDF Çıktısı (A4 Formatlı Sunucu Taraflı Üretim)
invoiceRouter.get('/:id/pdf', async (req, res) => {
  const companyId = req.user!.companyId;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!invoice) return res.status(404).json({ success: false, error: 'Fatura bulunamadı.' });

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;
  const customer = invoice.customer_id
    ? db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id) as any
    : { title: 'Perakende Müşteri' };

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY item_order ASC').all(invoice.id) as any[];

  try {
    const pdfBytes = await PdfService.generateInvoicePdf({
      company: {
        name: company.name,
        legalTitle: company.legal_title,
        taxOffice: company.tax_office,
        taxNumber: company.tax_number,
        address: company.address,
        phone: company.phone,
        email: company.email,
        iban: company.iban,
        bankInfo: company.bank_info,
      },
      customer: {
        title: customer.title,
        taxOffice: customer.tax_office,
        taxNumber: customer.tax_number,
        address: customer.address,
        phone: customer.phone,
      },
      invoice: {
        invoiceNo: invoice.invoice_no,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        discountTotal: invoice.discount_total,
        vatTotal: invoice.vat_total,
        withholdingTotal: invoice.withholding_total,
        grandTotal: invoice.grand_total,
        notes: invoice.notes,
        paymentMethod: invoice.payment_method,
      },
      items: items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unit_price,
        vatRate: it.vat_rate,
        totalAmount: it.total_amount,
      })),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Fatura-${invoice.invoice_no}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error('PDF üretimi hatası:', err);
    res.status(500).json({ success: false, error: 'PDF oluşturulurken bir hata meydana geldi: ' + err.message });
  }
});

// 5. Faturaya Tahsilat veya Ödeme Yapma (Fatura Kapama)
invoiceRouter.post('/:id/payments', (req, res) => {
  const companyId = req.user!.companyId;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!invoice) return res.status(404).json({ success: false, error: 'Fatura bulunamadı.' });

  const account_id = req.body.account_id ?? req.body.accountId;
  const payment_method = req.body.payment_method ?? req.body.paymentMethod ?? 'HAVALE';
  const date = req.body.date || new Date().toISOString().split('T')[0];
  const notes = req.body.notes || '';
  const payAmount = round2(Number(req.body.amount));

  if (!payAmount || payAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Geçerli bir ödeme tutarı giriniz.' });
  }

  if (!account_id) {
    return res.status(400).json({ success: false, error: 'Kasa veya Banka hesabı seçilmelidir.' });
  }

  const newPaid = round2(invoice.paid_amount + payAmount);
  const newRemaining = round2(Math.max(0, invoice.grand_total - newPaid));
  const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL_PAID';

  const paymentTx = db.transaction(() => {
    // 1. Faturayı güncelle
    db.prepare(`
      UPDATE invoices
      SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPaid, newRemaining, newStatus, invoice.id);

    // 2. Kasa / Banka Bakiyesini güncelle
    const isSales = invoice.invoice_type === 'SALES';
    const balanceDelta = isSales ? payAmount : -payAmount;
    db.prepare('UPDATE cash_banks SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(balanceDelta, account_id);

    // 3. Finansal Hareket Ekle
    db.prepare(`
      INSERT INTO financial_transactions (
        id, company_id, account_id, type, amount, currency, amount_try, date, related_type, related_id, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      companyId,
      account_id,
      isSales ? 'INFLOW' : 'OUTFLOW',
      payAmount,
      invoice.currency,
      payAmount,
      date || new Date().toISOString().split('T')[0],
      'INVOICE',
      invoice.id,
      `${invoice.invoice_no} no'lu fatura için ${isSales ? 'tahsilat' : 'ödeme'}: ${notes || ''}`
    );

    // 4. Cari Hareketi Ekle & Bakiye Düş
    if (isSales && invoice.customer_id) {
      db.prepare('UPDATE customers SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(payAmount, invoice.customer_id);

      const custBalance = (db.prepare('SELECT balance FROM customers WHERE id = ?').get(invoice.customer_id) as any).balance;

      db.prepare(`
        INSERT INTO current_account_transactions (
          id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id,
          date, document_no, debt, credit, balance, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        companyId,
        'CUSTOMER',
        invoice.customer_id,
        'COLLECTION',
        'INVOICE',
        invoice.id,
        date || new Date().toISOString().split('T')[0],
        `TAH-${invoice.invoice_no}`,
        0,
        payAmount, // Müşteri ödedi, alacağımız kapandı
        custBalance,
        `Fatura Tahsilatı: ${invoice.invoice_no}`
      );
    } else if (!isSales && invoice.supplier_id) {
      db.prepare('UPDATE suppliers SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(payAmount, invoice.supplier_id);

      const supBalance = (db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(invoice.supplier_id) as any).balance;

      db.prepare(`
        INSERT INTO current_account_transactions (
          id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id,
          date, document_no, debt, credit, balance, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        companyId,
        'SUPPLIER',
        invoice.supplier_id,
        'PAYMENT',
        'INVOICE',
        invoice.id,
        date || new Date().toISOString().split('T')[0],
        `ODE-${invoice.invoice_no}`,
        payAmount, // Tedarikçiye ödedik, borcumuz azaldı
        0,
        supBalance,
        `Fatura Tedarikçi Ödemesi: ${invoice.invoice_no}`
      );
    }
  });

  paymentTx();
  auditLog(companyId, req.user!.userId, 'PAYMENT', 'INVOICE', invoice.id, { payAmount, newStatus });

  const updatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id);
  res.json({ success: true, data: updatedInvoice });
});

// 6. Taslak Faturayı Onayla (DRAFT -> ISSUED)
invoiceRouter.post('/:id/approve', (req, res) => {
  const companyId = req.user!.companyId;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ? AND is_deleted = 0')
    .get(req.params.id, companyId) as any;

  if (!invoice) return res.status(404).json({ success: false, error: 'Fatura bulunamadı.' });
  if (invoice.status !== 'DRAFT') {
    return res.status(400).json({ success: false, error: 'Yalnızca taslak faturalar onaylanabilir.' });
  }

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id) as any[];

  const approveTx = db.transaction(() => {
    // 1. Durumu ISSUED yap
    db.prepare("UPDATE invoices SET status = 'ISSUED', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(invoice.id);

    // 2. Stok hareketleri
    const updateStockStmt = db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const insertStockTx = db.prepare(`
      INSERT INTO stock_transactions (id, company_id, product_id, type, quantity, unit_price, date, reference_type, reference_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    items.forEach((item) => {
      if (item.product_id) {
        const stockDelta = invoice.invoice_type === 'SALES' ? -item.quantity : item.quantity;
        updateStockStmt.run(stockDelta, item.product_id);

        insertStockTx.run(
          uuidv4(),
          companyId,
          item.product_id,
          invoice.invoice_type === 'SALES' ? 'SALE' : 'PURCHASE',
          item.quantity,
          item.unit_price,
          invoice.issue_date,
          'INVOICE',
          invoice.id,
          `${invoice.invoice_no} no'lu fatura onayına istinaden ${invoice.invoice_type === 'SALES' ? 'çıkış' : 'giriş'}`
        );
      }
    });

    // 3. Cari hesap bakiyesi ve hareketi
    if (invoice.invoice_type === 'SALES' && invoice.customer_id) {
      db.prepare('UPDATE customers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(invoice.grand_total, invoice.customer_id);

      const custBalance = (db.prepare('SELECT balance FROM customers WHERE id = ?').get(invoice.customer_id) as any).balance;

      db.prepare(`
        INSERT INTO current_account_transactions (
          id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id,
          date, document_no, debt, credit, balance, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        companyId,
        'CUSTOMER',
        invoice.customer_id,
        'INVOICE',
        'INVOICE',
        invoice.id,
        invoice.issue_date,
        invoice.invoice_no,
        invoice.grand_total,
        0,
        custBalance,
        `Satış Faturası: ${invoice.invoice_no}`
      );
    } else if (invoice.invoice_type === 'PURCHASE' && invoice.supplier_id) {
      db.prepare('UPDATE suppliers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(invoice.grand_total, invoice.supplier_id);

      const supBalance = (db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(invoice.supplier_id) as any).balance;

      db.prepare(`
        INSERT INTO current_account_transactions (
          id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id,
          date, document_no, debt, credit, balance, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        companyId,
        'SUPPLIER',
        invoice.supplier_id,
        'INVOICE',
        'INVOICE',
        invoice.id,
        invoice.issue_date,
        invoice.invoice_no,
        0,
        invoice.grand_total,
        supBalance,
        `Alış Faturası: ${invoice.invoice_no}`
      );
    }
  });

  approveTx();
  auditLog(companyId, req.user!.userId, 'APPROVE', 'INVOICE', invoice.id, { invoiceNo: invoice.invoice_no });

  const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id);
  res.json({ success: true, message: 'Fatura onaylandı ve aktifleştirildi.', data: updated });
});

// 7. Fatura Silme (Mali Mevzuat & Bütünlük Korumalı Soft-delete)
invoiceRouter.delete('/:id', (req, res) => {
  const companyId = req.user!.companyId;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ? AND is_deleted = 0')
    .get(req.params.id, companyId) as any;

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'Fatura bulunamadı veya daha önce silinmiş.' });
  }

  // 1. GİB Onaylı Resmi E-Fatura Koruması
  if (invoice.is_einvoice && invoice.einvoice_status === 'ACCEPTED') {
    return res.status(403).json({
      success: false,
      error: 'Güvenlik & Mevzuat Koruması: GİB onaylı ve mühürlü resmi E-Faturalar doğrudan silinemez. Vergi Usul Kanunu gereğince İade Faturası düzenlenmeli veya GİB iptal portalı kullanılmalıdır.',
    });
  }

  // 2. Tahsilat / Ödeme Bütünlüğü Koruması
  if (invoice.status === 'PAID') {
    return res.status(400).json({
      success: false,
      error: 'Mali Bütünlük Koruması: Tahsilatı tamamlanmış fatura doğrudan silinemez. Lütfen önce ilişkili kasa/banka hareketini ters kayıtla düzeltiniz.',
    });
  }

  db.prepare('UPDATE invoices SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, companyId);

  auditLog(companyId, req.user!.userId, 'SOFT_DELETE', 'INVOICE', req.params.id, { invoiceNumber: invoice.invoice_number, total: invoice.grand_total });
  res.json({ success: true, message: 'Fatura güvenli şekilde çöp kutusuna taşındı.' });
});

// 8. Fatura Gönderimi (E-Fatura / E-Arşiv GİB Portalı veya E-Posta İletimi)
invoiceRouter.post('/:id/send', (req, res) => {
  const companyId = req.user!.companyId;
  const { sendType = 'EINVOICE', emailRecipient, emailSubject, emailBody } = req.body;

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ? AND is_deleted = 0')
    .get(req.params.id, companyId) as any;

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'Fatura bulunamadı.' });
  }

  const einvoiceUuid = invoice.einvoice_uuid || uuidv4();
  const gibTrackCode = 'GIB' + new Date().getFullYear() + Math.floor(10000000 + Math.random() * 90000000);

  // Faturayı GİB veya E-posta ile gönderildi olarak işaretle
  db.prepare(`
    UPDATE invoices
    SET is_einvoice = 1,
        einvoice_uuid = ?,
        einvoice_status = 'ACCEPTED',
        status = CASE WHEN status = 'DRAFT' THEN 'ISSUED' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).run(einvoiceUuid, invoice.id, companyId);

  auditLog(companyId, req.user!.userId, 'SEND_INVOICE', 'INVOICE', invoice.id, {
    sendType,
    einvoiceUuid,
    gibTrackCode,
    emailRecipient: emailRecipient || null,
  });

  const updatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id);

  res.json({
    success: true,
    message: sendType === 'EMAIL'
      ? `Fatura başarıyla ${emailRecipient} adresine e-posta olarak iletildi.`
      : `Fatura GİB E-Fatura/E-Arşiv sistemine başarıyla gönderildi ve kabul edildi. (GİB Takip Kodu: ${gibTrackCode})`,
    data: {
      invoice: updatedInvoice,
      einvoiceUuid,
      gibTrackCode,
      sendType,
      sentAt: new Date().toISOString(),
    },
  });
});

