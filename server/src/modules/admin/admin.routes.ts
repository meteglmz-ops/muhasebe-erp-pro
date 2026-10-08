import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'beecursor_super_secret_jwt_key_2026';
const MASTER_SECRET_KEY = process.env.MASTER_SECRET_KEY || 'ROOT-MASTER-777';

export const adminRouter = Router();

import { emailService } from '../../services/email-service';

// ==============================================================
// 0. BAĞIMSIZ GİZLİ MASTER ADMİN GİRİŞİ: 3 AŞAMALI ARDIŞIK E-POSTA KORUMASI
// ==============================================================

// Aşama 0: Bilgileri Doğrula, Güvenlik Uyarısı Gönder & 1. Kodu İlet
adminRouter.post('/auth/initiate', async (req, res) => {
  const { email, password, masterKey } = req.body;
  if (!email || !password || !masterKey) {
    return res.status(400).json({
      success: false,
      error: 'Tüm alanların eksiksiz doldurulması zorunludur.',
    });
  }

  // 1. Sistem Sahibi Gizli Anahtarı (Kök Kilit)
  if (masterKey.trim() !== MASTER_SECRET_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Geçersiz Master Güvenlik Anahtarı! Erişim reddedildi.',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Kayıtlı sistem yöneticisi bulunamadı.' });
  }

  // 2. Yalnızca Yetkili Sistem Sahibi E-Postaları Erişebilir
  const isSuperAdminEmail =
    user.email === 'admin@beecursor.com' ||
    user.email === 'meteglmez@gmail.com' ||
    user.email === 'ahmetmit35@gmail.com' ||
    user.role === 'SUPER_ADMIN' ||
    user.role === 'ADMIN';

  if (!isSuperAdminEmail) {
    return res.status(403).json({
      success: false,
      error: 'Bu hesap Sistem Sahibi (Root) yetkisine sahip değildir.',
    });
  }

  // 3. Şifre Doğrulama
  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ success: false, error: 'Yönetici şifresi geçersiz.' });
  }

  // 4. İLK İŞLEM: ACİL GİRİŞ UYARI E-POSTASI GÖNDER
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  await emailService.sendMasterLoginAlert(cleanEmail, clientIp);

  // 5. 1. AŞAMA OTP KODU ÜRET VE GÖNDER
  db.prepare(`UPDATE otp_codes SET used = 1 WHERE email = ? AND action LIKE 'MASTER_OTP_STEP_%'`).run(cleanEmail);
  const code1 = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO otp_codes (id, email, code, action, expires_at, used, attempts)
    VALUES (?, ?, ?, 'MASTER_OTP_STEP_1', ?, 0, 0)
  `).run(uuidv4(), cleanEmail, code1, expiresAt);

  await emailService.sendMasterOtpStep(cleanEmail, 1, 3, code1);

  // 6. Oturum Tokeni (Step 1)
  const sessionToken = jwt.sign(
    { email: cleanEmail, currentStep: 1, type: 'MASTER_MFA_SESSION' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return res.json({
    success: true,
    message: 'Master Root giriş uyarısı ve 1. Aşama Doğrulama Kodu e-postanıza iletildi.',
    data: {
      sessionToken,
      currentStep: 1,
      totalSteps: 3,
    },
  });
});

// Aşama 1, 2, 3: Ardışık Kodları Doğrula ve Sıradaki Kodu Gönder / Tamamla
adminRouter.post('/auth/verify-step', async (req, res) => {
  const { sessionToken, code } = req.body;
  if (!sessionToken || !code) {
    return res.status(400).json({ success: false, error: 'Doğrulama kodu ve oturum zorunludur.' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(sessionToken, JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, error: 'Güvenlik oturumunun süresi dolmuş. Lütfen baştan başlayınız.' });
  }

  if (decoded.type !== 'MASTER_MFA_SESSION') {
    return res.status(403).json({ success: false, error: 'Geçersiz güvenlik oturumu.' });
  }

  const { email, currentStep } = decoded;
  const targetAction = `MASTER_OTP_STEP_${currentStep}`;

  const otpRecord = db.prepare(`
    SELECT * FROM otp_codes 
    WHERE email = ? AND action = ? AND used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(email, targetAction) as any;

  if (!otpRecord) {
    return res.status(400).json({ success: false, error: 'Aktif doğrulama kodu bulunamadı veya süresi dolmuş.' });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);
    return res.status(400).json({ success: false, error: 'Kodun 5 dakikalık süresi dolmuş. Lütfen baştan başlayınız.' });
  }

  const cleanCode = code.toString().trim().replace(/\D/g, '');
  if (otpRecord.code !== cleanCode) {
    const attempts = (otpRecord.attempts || 0) + 1;
    if (attempts >= 5) {
      db.prepare('UPDATE otp_codes SET used = 1, attempts = ? WHERE id = ?').run(attempts, otpRecord.id);
      return res.status(403).json({ success: false, error: '5 kez hatalı kod girildiği için güvenlik kilitlendi.' });
    }
    db.prepare('UPDATE otp_codes SET attempts = ? WHERE id = ?').run(attempts, otpRecord.id);
    return res.status(400).json({ success: false, error: `Hatalı kod. Kalan deneme hakkınız: ${5 - attempts}` });
  }

  // Kodu kullanıldı yap
  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // ADIM 1 TAMAMLANDI -> 2. KODU GÖNDER
  if (currentStep === 1) {
    const code2 = Math.floor(100000 + Math.random() * 900000).toString();
    db.prepare(`
      INSERT INTO otp_codes (id, email, code, action, expires_at, used, attempts)
      VALUES (?, ?, ?, 'MASTER_OTP_STEP_2', ?, 0, 0)
    `).run(uuidv4(), email, code2, expiresAt);

    await emailService.sendMasterOtpStep(email, 2, 3, code2);

    const nextSessionToken = jwt.sign(
      { email, currentStep: 2, type: 'MASTER_MFA_SESSION' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({
      success: true,
      message: '1. Aşama başarıyla doğrulandı! 2. Aşama Güvenlik Kodu e-postanıza gönderildi.',
      data: {
        sessionToken: nextSessionToken,
        currentStep: 2,
        totalSteps: 3,
      },
    });
  }

  // ADIM 2 TAMAMLANDI -> 3. KODU GÖNDER
  if (currentStep === 2) {
    const code3 = Math.floor(100000 + Math.random() * 900000).toString();
    db.prepare(`
      INSERT INTO otp_codes (id, email, code, action, expires_at, used, attempts)
      VALUES (?, ?, ?, 'MASTER_OTP_STEP_3', ?, 0, 0)
    `).run(uuidv4(), email, code3, expiresAt);

    await emailService.sendMasterOtpStep(email, 3, 3, code3);

    const nextSessionToken = jwt.sign(
      { email, currentStep: 3, type: 'MASTER_MFA_SESSION' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({
      success: true,
      message: '2. Aşama başarıyla doğrulandı! Son 3. Aşama Kilit Açma Kodu e-postanıza gönderildi.',
      data: {
        sessionToken: nextSessionToken,
        currentStep: 3,
        totalSteps: 3,
      },
    });
  }

  // ADIM 3 TAMAMLANDI -> TAM YETKİLİ KÖK TOKEN ÜRET VE AÇ!
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  const masterToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: 'SUPER_ADMIN',
      companyId: 'SYSTEM_ROOT',
      isMasterRoot: true,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    success: true,
    message: '3 Aşamalı Kök Doğrulama Başarılı! Master Admin Paneli Açılıyor...',
    data: {
      token: masterToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: 'SUPER_ADMIN',
      },
      currentStep: 4,
      totalSteps: 3,
    },
  });
});

// ==============================================================
// GÜVENLİK KAPISI: AŞAĞIDAKİ TÜM ROTALAR YALNIZCA SÜPER YÖNETİCİYE AÇIKTIR
// ==============================================================
adminRouter.use(authMiddleware);

adminRouter.use((req, res, next) => {
  const user = req.user!;
  const userRecord = db.prepare('SELECT role, email FROM users WHERE id = ?').get(user.userId) as any;
  const isSuperAdmin = 
    userRecord?.role === 'SUPER_ADMIN' || 
    userRecord?.role === 'ADMIN' || 
    userRecord?.email === 'admin@beecursor.com' ||
    userRecord?.email === 'meteglmez@gmail.com' ||
    userRecord?.email === 'ahmetmit35@gmail.com' ||
    user.role === 'SUPER_ADMIN';

  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Erişim Reddedildi: Bu panel yalnızca Master Sistem Yöneticisi erişimine açıktır.',
    });
  }
  next();
});

// 1. Tüm Şirketleri / Müşteri Hesaplarını ve İstatistiklerini Listele
adminRouter.get('/companies', (req, res) => {
  const companies = db.prepare(`
    SELECT 
      c.*,
      u.full_name as owner_name,
      u.email as owner_email,
      u.tc_identity as owner_tc,
      u.phone as owner_phone,
      (SELECT COUNT(*) FROM invoices WHERE company_id = c.id AND is_deleted = 0) as active_invoices_count,
      (SELECT COUNT(*) FROM invoices WHERE company_id = c.id AND is_deleted = 1) as deleted_invoices_count,
      (SELECT COALESCE(SUM(grand_total), 0) FROM invoices WHERE company_id = c.id AND is_deleted = 0) as total_volume,
      (SELECT COUNT(*) FROM customers WHERE company_id = c.id AND is_deleted = 0) as active_customers_count,
      (SELECT COUNT(*) FROM customers WHERE company_id = c.id AND is_deleted = 1) as deleted_customers_count,
      (SELECT COUNT(*) FROM products WHERE company_id = c.id AND is_deleted = 0) as products_count,
      (SELECT COUNT(*) FROM company_snapshots WHERE company_id = c.id) as snapshots_count
    FROM companies c
    LEFT JOIN user_companies uc ON uc.company_id = c.id AND uc.role = 'COMPANY_OWNER'
    LEFT JOIN users u ON u.id = uc.user_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all() as any[];

  res.json({
    success: true,
    data: companies,
  });
});

// 2. Belirli Bir Şirketin Detaylı Salt-Okunur Veri İncelemesi (Read-Only Viewer)
adminRouter.get('/companies/:id/overview', (req, res) => {
  const companyId = req.params.id;

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;
  if (!company) {
    return res.status(404).json({ success: false, error: 'Şirket bulunamadı.' });
  }

  // Şirket Sahibi / Yetkilisi
  const owner = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.tc_identity, u.phone, u.role, u.is_active, u.created_at
    FROM users u
    JOIN user_companies uc ON uc.user_id = u.id
    WHERE uc.company_id = ?
    ORDER BY uc.role = 'COMPANY_OWNER' DESC LIMIT 1
  `).get(companyId) as any;

  // Salt-Okunur Faturalar (Hem aktifler hem silinmişler)
  const invoices = db.prepare(`
    SELECT 
      i.id, 
      i.invoice_no, 
      i.invoice_type, 
      i.issue_date, 
      i.due_date, 
      i.status, 
      i.grand_total, 
      i.currency, 
      i.is_einvoice, 
      i.einvoice_status, 
      i.is_deleted, 
      i.created_at,
      c.title as customer_title
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.company_id = ?
    ORDER BY i.created_at DESC
    LIMIT 100
  `).all(companyId) as any[];

  // Salt-Okunur Cariler (Hem aktifler hem silinmişler)
  const customers = db.prepare(`
    SELECT id, code, title, contact_person, phone, email, tax_number, tc_identity, balance, is_deleted, created_at
    FROM customers
    WHERE company_id = ?
    ORDER BY title ASC
    LIMIT 100
  `).all(companyId) as any[];

  // Sistem Yedekleme Noktaları (Snapshots)
  const snapshots = db.prepare(`
    SELECT id, reason, counts_json, is_restored, created_at, restored_at
    FROM company_snapshots
    WHERE company_id = ?
    ORDER BY created_at DESC
  `).all(companyId) as any[];

  // Son Denetim Günlüğü Kayıtları
  const auditLogs = db.prepare(`
    SELECT * FROM audit_logs
    WHERE company_id = ?
    ORDER BY timestamp DESC
    LIMIT 30
  `).all(companyId) as any[];

  res.json({
    success: true,
    data: {
      company,
      owner,
      invoices,
      customers,
      snapshots: snapshots.map((s: any) => ({
        ...s,
        counts: JSON.parse(s.counts_json || '{}'),
      })),
      auditLogs,
    },
  });
});

// 3. Silinmiş Müşteriyi / Cariyi Geri Yükle (Restore Customer)
adminRouter.post('/restore/customer/:id', (req, res) => {
  const customerId = req.params.id;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Müşteri kartı bulunamadı.' });
  }

  db.prepare('UPDATE customers SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(customerId);

  auditLog(customer.company_id, req.user!.userId, 'ADMIN_RESTORE', 'CUSTOMER', customerId, {
    title: customer.title,
    restoredBy: req.user!.email,
  });

  res.json({
    success: true,
    message: `"${customer.title}" müşterisi başarıyla geri yüklendi ve aktif cariler listesine eklendi.`,
  });
});

// 4. Silinmiş Faturayı Geri Yükle (Restore Invoice)
adminRouter.post('/restore/invoice/:id', (req, res) => {
  const invoiceId = req.params.id;

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
  if (!invoice) {
    return res.status(404).json({ success: false, error: 'Fatura kaydı bulunamadı.' });
  }

  db.prepare('UPDATE invoices SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(invoiceId);

  auditLog(invoice.company_id, req.user!.userId, 'ADMIN_RESTORE', 'INVOICE', invoiceId, {
    invoiceNo: invoice.invoice_no,
    restoredBy: req.user!.email,
  });

  res.json({
    success: true,
    message: `"${invoice.invoice_no}" numaralı fatura başarıyla geri yüklendi.`,
  });
});

// 5. Fabrika Sıfırlaması Yedeğinden TAM SİSTEM GERİ YÜKLEMESİ (Restore Entire Snapshot)
adminRouter.post('/restore/snapshot/:snapshotId', (req, res) => {
  const snapshotId = req.params.snapshotId;

  const snapshot = db.prepare('SELECT * FROM company_snapshots WHERE id = ?').get(snapshotId) as any;
  if (!snapshot) {
    return res.status(404).json({ success: false, error: 'Sistem kurtarma noktası (snapshot) bulunamadı.' });
  }

  const companyId = snapshot.company_id;
  const data = JSON.parse(snapshot.snapshot_data);

  // Atomik Geri Yükleme Transaction
  const restoreTx = db.transaction(() => {
    // 1. Faturaları Geri Yükle
    if (data.invoices && data.invoices.length > 0) {
      for (const inv of data.invoices) {
        db.prepare(`
          INSERT OR REPLACE INTO invoices (
            id, company_id, invoice_type, invoice_no, customer_id, supplier_id, issue_date, due_date,
            status, currency, exchange_rate, subtotal, discount_total, vat_total, withholding_total, excise_total,
            grand_total, paid_amount, remaining_amount, payment_method, notes, terms, template,
            is_einvoice, einvoice_uuid, einvoice_status, is_deleted, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).run(
          inv.id, inv.company_id, inv.invoice_type || 'SALES', inv.invoice_no, inv.customer_id, inv.supplier_id, inv.issue_date, inv.due_date,
          inv.status, inv.currency, inv.exchange_rate, inv.subtotal, inv.discount_total, inv.vat_total, inv.withholding_total, inv.excise_total,
          inv.grand_total, inv.paid_amount, inv.remaining_amount, inv.payment_method, inv.notes, inv.terms, inv.template,
          inv.is_einvoice, inv.einvoice_uuid, inv.einvoice_status, inv.created_at, new Date().toISOString()
        );
      }
    }

    // 2. Fatura Kalemlerini Geri Yükle
    if (data.invoiceItems && data.invoiceItems.length > 0) {
      for (const item of data.invoiceItems) {
        db.prepare(`
          INSERT OR REPLACE INTO invoice_items (
            id, invoice_id, product_id, item_order, name, description, quantity, unit,
            unit_price, discount_percent, discount_amount, vat_rate, vat_amount,
            withholding_rate, withholding_amount, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.id, item.invoice_id, item.product_id, item.item_order || 1, item.name || 'Ürün/Hizmet', item.description, item.quantity, item.unit || 'Adet',
          item.unit_price, item.discount_percent || 0, item.discount_amount || 0, item.vat_rate || 20, item.vat_amount || 0,
          item.withholding_rate || 0, item.withholding_amount || 0, item.total_amount || 0
        );
      }
    }

    // 3. Stok Hareketlerini Geri Yükle
    if (data.stockTransactions && data.stockTransactions.length > 0) {
      for (const st of data.stockTransactions) {
        db.prepare(`
          INSERT OR REPLACE INTO stock_transactions (
            id, company_id, warehouse_id, product_id, type, quantity, unit_price,
            date, reference_type, reference_id, description, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          st.id, st.company_id, st.warehouse_id, st.product_id, st.type, st.quantity, st.unit_price,
          st.date, st.reference_type, st.reference_id, st.description, st.created_at
        );
      }
    }

    // 4. Cari Hareketlerini Geri Yükle
    if (data.currentAccountTransactions && data.currentAccountTransactions.length > 0) {
      for (const cat of data.currentAccountTransactions) {
        db.prepare(`
          INSERT OR REPLACE INTO current_account_transactions (
            id, company_id, entity_type, entity_id, transaction_type, reference_type,
            reference_id, date, document_no, debt, credit, balance, description, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          cat.id, cat.company_id, cat.entity_type, cat.entity_id, cat.transaction_type, cat.reference_type,
          cat.reference_id, cat.date, cat.document_no, cat.debt, cat.credit, cat.balance, cat.description, cat.created_at
        );
      }
    }

    // 5. Müşteri & Tedarikçi Bakiyelerini Tekrar Hesapla
    const customersToRecalc = db.prepare('SELECT id FROM customers WHERE company_id = ?').all(companyId) as any[];
    for (const cust of customersToRecalc) {
      const sum = db.prepare(`
        SELECT COALESCE(SUM(debt - credit), 0) as calculated_balance 
        FROM current_account_transactions 
        WHERE company_id = ? AND entity_type = 'CUSTOMER' AND entity_id = ?
      `).get(companyId, cust.id) as any;
      db.prepare('UPDATE customers SET balance = ? WHERE id = ?').run(sum.calculated_balance, cust.id);
    }

    // 6. Snapshot durumunu "Geri Yüklendi" olarak işaretle
    db.prepare('UPDATE company_snapshots SET is_restored = 1, restored_at = CURRENT_TIMESTAMP WHERE id = ?').run(snapshotId);

    // 7. Audit log
    auditLog(companyId, req.user!.userId, 'ADMIN_RESTORE', 'SNAPSHOT', snapshotId, {
      restoredBy: req.user!.email,
      snapshotDate: snapshot.created_at,
    });
  });

  restoreTx();

  res.json({
    success: true,
    message: `${new Date(snapshot.created_at).toLocaleString('tr-TR')} tarihli sistem güvenlik yedeği eksiksiz olarak geri yüklendi.`,
  });
});
