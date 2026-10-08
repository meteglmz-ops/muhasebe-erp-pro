import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './db';

export function runSeed() {
  initDatabase();

  const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
  if (companyCount.count > 0) {
    console.log('Veritabanında veriler mevcut, seed atlandı.');
    return;
  }

  console.log('Seed işlemi başlatılıyor: BeeCursor ERP Demo şirketi kuruluyor...');

  const companyId = 'comp-beecursor-01';
  const userId = 'user-admin-01';
  const accountantId = 'user-accountant-01';

  const passwordHash = bcrypt.hashSync('admin123', 10);
  const accountantHash = bcrypt.hashSync('muhasebe123', 10);

  const insertCompany = db.prepare(`
    INSERT INTO companies (id, name, legal_title, tax_office, tax_number, address, city, district, phone, email, website, iban, bank_info, logo_url, invoice_prefix, next_invoice_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCompany.run(
    companyId,
    'BeeCursor Teknoloji ve ERP A.Ş.',
    'BeeCursor Bilişim Yazılım ve Danışmanlık Anonim Şirketi',
    'Maslak V.D.',
    '1234567890',
    'Büyükdere Cad. No: 142 Plaza Kat: 12 Maslak',
    'İstanbul',
    'Sarıyer',
    '+90 (212) 555 0199',
    'info@beecursor.com',
    'https://beecursor.com',
    'TR33 0006 1005 1234 5678 9012 34',
    'Garanti BBVA - Maslak Ticari Şube',
    '/assets/logo.png',
    'BEE2026',
    1001
  );

  // Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(userId, 'admin@beecursor.com', passwordHash, 'Ahmet Yılmaz', '+90 532 111 2233', 'COMPANY_OWNER');
  insertUser.run(accountantId, 'muhasebe@beecursor.com', accountantHash, 'Zeynep Kaya', '+90 533 444 5566', 'ACCOUNTANT');

  // User Company links
  const insertUC = db.prepare(`
    INSERT INTO user_companies (id, user_id, company_id, role, is_default)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertUC.run(uuidv4(), userId, companyId, 'COMPANY_OWNER', 1);
  insertUC.run(uuidv4(), accountantId, companyId, 'ACCOUNTANT', 1);

  // Categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, company_id, type, name, color)
    VALUES (?, ?, ?, ?, ?)
  `);
  const catSoftware = uuidv4();
  const catHardware = uuidv4();
  const catRent = uuidv4();
  const catHosting = uuidv4();
  const catSalary = uuidv4();

  insertCategory.run(catSoftware, companyId, 'PRODUCT', 'Yazılım & Lisans', '#3B82F6');
  insertCategory.run(catHardware, companyId, 'PRODUCT', 'Donanım & Donatım', '#10B981');
  insertCategory.run(catRent, companyId, 'EXPENSE', 'Kira & Ofis Giderleri', '#EF4444');
  insertCategory.run(catHosting, companyId, 'EXPENSE', 'Bulut & Sunucu Giderleri', '#F59E0B');
  insertCategory.run(catSalary, companyId, 'EXPENSE', 'Maaş & Personel Giderleri', '#8B5CF6');

  // Cash / Banks
  const insertCashBank = db.prepare(`
    INSERT INTO cash_banks (id, company_id, type, name, bank_name, branch, account_no, iban, currency, opening_balance, current_balance, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const cashCenterId = 'cash-01';
  const bankGarantiId = 'bank-01';
  const bankUsdId = 'bank-02';

  insertCashBank.run(cashCenterId, companyId, 'CASH', 'Merkez Kasa', null, null, null, null, 'TRY', 25000, 35000, 1);
  insertCashBank.run(bankGarantiId, companyId, 'BANK', 'Garanti BBVA Maslak Ticari', 'Garanti BBVA', 'Maslak', '1005-123456', 'TR33 0006 1005 1234 5678 9012 34', 'TRY', 450000, 520000, 1);
  insertCashBank.run(bankUsdId, companyId, 'BANK', 'İş Bankası USD Hesabı', 'İş Bankası', 'Levent', '4421-998877', 'TR12 0006 4000 4421 9988 7700 01', 'USD', 15000, 15000, 0);

  // Warehouses
  const insertWarehouse = db.prepare(`
    INSERT INTO warehouses (id, company_id, name, code, location, is_default)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const whMain = 'wh-01';
  insertWarehouse.run(whMain, companyId, 'Merkez Ana Depo', 'DEP-01', 'Maslak Plaza B2', 1);

  // Products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, company_id, code, barcode, name, category_id, unit, buy_price, sell_price, vat_rate, min_stock, current_stock, is_service)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const prodCloudErp = 'prod-01';
  const prodTerminal = 'prod-02';
  const prodPrinter = 'prod-03';
  const prodConsulting = 'prod-04';

  insertProduct.run(prodCloudErp, companyId, 'PRD-ERP-01', '8690001001', 'Bulut ERP Yıllık Kurumsal Lisans', catSoftware, 'Adet', 15000, 48000, 20, 0, 999, 1);
  insertProduct.run(prodTerminal, companyId, 'PRD-TERM-02', '8690001002', 'Barkod Okuyucu El Terminali Pro', catHardware, 'Adet', 5200, 8500, 20, 5, 42, 0);
  insertProduct.run(prodPrinter, companyId, 'PRD-PRNT-03', '8690001003', 'Termal Fatura & Fiş Yazıcı Yüksek Hızlı', catHardware, 'Adet', 2600, 4200, 20, 5, 28, 0);
  insertProduct.run(prodConsulting, companyId, 'PRD-CONS-04', '8690001004', 'ERP Entegrasyon ve Eğitim Danışmanlığı (Günlük)', catSoftware, 'Saat', 0, 12000, 20, 0, 999, 1);

  // Customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, company_id, code, title, contact_person, phone, email, tax_office, tax_number, address, city, district, credit_limit, payment_term_days, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const custAkasya = 'cust-01';
  const custMeta = 'cust-02';
  const custAnadolu = 'cust-03';

  insertCustomer.run(custAkasya, companyId, 'CARI-M-001', 'Akasya Lojistik ve Dış Ticaret A.Ş.', 'Burak Akasya', '+90 212 444 8899', 'muhasebe@akasya.com.tr', 'Maslak V.D.', '0239182391', 'Lojistik Vadisi No: 4', 'İstanbul', 'Sarıyer', 500000, 30, 45000);
  insertCustomer.run(custMeta, companyId, 'CARI-M-002', 'Meta Bilişim Yazılım Ltd. Şti.', 'Ebru Şen', '+90 216 333 4455', 'fatura@metabilisim.com', 'Kadıköy V.D.', '8812938120', 'Bağdat Cad. No: 120', 'İstanbul', 'Kadıköy', 300000, 45, 82500);
  insertCustomer.run(custAnadolu, companyId, 'CARI-M-003', 'Anadolu Endüstriyel İmalat San. A.Ş.', 'Kemal Demir', '+90 312 222 1100', 'kemal@anadoluendustri.com', 'Ulus V.D.', '5549102931', 'Organize Sanayi Bölgesi 4. Cad.', 'Ankara', 'Sincan', 750000, 60, 0);

  // Suppliers
  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (id, company_id, code, title, contact_person, phone, email, tax_office, tax_number, address, city, district, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const supTurkcell = 'sup-01';
  const supAws = 'sup-02';

  insertSupplier.run(supTurkcell, companyId, 'CARI-T-001', 'Turkcell İletişim Hizmetleri A.Ş.', 'Kurumsal Müşteri Hizmetleri', '+90 850 222 0000', 'kurumsal@turkcell.com.tr', 'Büyük Mükellefler V.D.', '8790018736', 'Turkcell Küçükyalı Plaza', 'İstanbul', 'Maltepe', 18500);
  insertSupplier.run(supAws, companyId, 'CARI-T-002', 'Amazon Web Services Turkey A.Ş.', 'Finance Desk', '+90 212 999 0011', 'aws-turkey@amazon.com', 'Boğaziçi V.D.', '0681123456', 'Kanyon Ofis Kule Kat: 14', 'İstanbul', 'Şişli', 42000);

  // Invoices & Invoice Items
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, company_id, invoice_type, invoice_no, customer_id, supplier_id, issue_date, due_date, status, currency, exchange_rate, subtotal, discount_total, vat_total, grand_total, paid_amount, remaining_amount, payment_method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInvoiceItem = db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, product_id, item_order, name, description, quantity, unit, unit_price, discount_percent, discount_amount, vat_rate, vat_amount, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inv1Id = 'inv-2026-001';
  insertInvoice.run(
    inv1Id,
    companyId,
    'SALES',
    'BEE2026-001001',
    custAkasya,
    null,
    '2026-09-15',
    '2026-10-15',
    'PARTIAL_PAID',
    'TRY',
    1.0,
    95000,
    5000,
    18000,
    108000,
    63000,
    45000,
    'HAVALE',
    'Yıllık Bulut ERP ve Terminal kurulumu'
  );

  insertInvoiceItem.run(uuidv4(), inv1Id, prodCloudErp, 1, 'Bulut ERP Yıllık Kurumsal Lisans', '2026-2027 Lisans Bedeli', 2, 'Adet', 45000, 5, 4500, 20, 17100, 102600);
  insertInvoiceItem.run(uuidv4(), inv1Id, prodPrinter, 2, 'Termal Fatura & Fiş Yazıcı Yüksek Hızlı', 'Lojistik ofis için', 1, 'Adet', 5000, 10, 500, 20, 900, 5400);

  // Current Account Transaction for inv1
  const insertCurrent = db.prepare(`
    INSERT INTO current_account_transactions (id, company_id, entity_type, entity_id, transaction_type, reference_type, reference_id, date, document_no, debt, credit, balance, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCurrent.run(uuidv4(), companyId, 'CUSTOMER', custAkasya, 'INVOICE', 'INVOICE', inv1Id, '2026-09-15', 'BEE2026-001001', 108000, 0, 108000, 'Satış Faturası: BEE2026-001001');
  insertCurrent.run(uuidv4(), companyId, 'CUSTOMER', custAkasya, 'COLLECTION', 'COLLECTION', uuidv4(), '2026-09-20', 'TAH-001', 0, 63000, 45000, 'Garanti Bankası Havale Tahsilatı');

  // Payment Plan for inv1
  const insertPlan = db.prepare(`
    INSERT INTO payment_plans (id, company_id, invoice_id, entity_type, entity_id, total_amount, installment_count, installment_no, due_date, amount, paid_amount, status, paid_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPlan.run(uuidv4(), companyId, inv1Id, 'CUSTOMER', custAkasya, 108000, 2, 1, '2026-09-20', 63000, 63000, 'PAID', '2026-09-20 11:30:00', '1. Taksit ödendi');
  insertPlan.run(uuidv4(), companyId, inv1Id, 'CUSTOMER', custAkasya, 108000, 2, 2, '2026-10-20', 45000, 0, 'PENDING', null, '2. Taksit bekliyor');

  // Income / Expense sample
  const insertIncExp = db.prepare(`
    INSERT INTO income_expenses (id, company_id, type, category_id, customer_id, supplier_id, account_id, date, amount, vat_rate, vat_amount, total_amount, currency, payment_status, is_recurring, recurrence_interval, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertIncExp.run(uuidv4(), companyId, 'EXPENSE', catRent, null, null, bankGarantiId, '2026-10-01', 25000, 0, 0, 25000, 'TRY', 'PAID', 1, 'MONTHLY', 'Maslak Ofis Kirası - Ekim 2026');
  insertIncExp.run(uuidv4(), companyId, 'EXPENSE', catHosting, null, supAws, bankGarantiId, '2026-10-02', 12500, 20, 2500, 15000, 'TRY', 'PAID', 1, 'MONTHLY', 'AWS Bulut Sunucu Altyapı Bedeli');

  // Folders & Documents
  const insertFolder = db.prepare(`
    INSERT INTO folders (id, company_id, parent_id, name, path, color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const foldMuhasebe = 'fold-01';
  const fold2026 = 'fold-02';
  const foldFaturalar = 'fold-03';
  const foldSozlesmeler = 'fold-04';

  insertFolder.run(foldMuhasebe, companyId, null, 'Muhasebe', '/Muhasebe', '#2563EB');
  insertFolder.run(fold2026, companyId, foldMuhasebe, '2026', '/Muhasebe/2026', '#3B82F6');
  insertFolder.run(foldFaturalar, companyId, fold2026, 'Satış Faturaları', '/Muhasebe/2026/Satış Faturaları', '#10B981');
  insertFolder.run(foldSozlesmeler, companyId, null, 'Sözleşmeler & Protokoller', '/Sözleşmeler & Protokoller', '#8B5CF6');

  // Audit Log
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, company_id, user_id, action, module, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run(uuidv4(), companyId, userId, 'SYSTEM_INIT', 'SETUP', companyId, JSON.stringify({ message: 'BeeCursor ERP Demo şirketi başarıyla kuruldu.' }), '127.0.0.1');

  console.log('Seed işlemi başarıyla tamamlandı!');
}

if (require.main === module) {
  runSeed();
}
