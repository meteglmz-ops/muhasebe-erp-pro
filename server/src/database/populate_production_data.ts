import { v4 as uuidv4 } from 'uuid';
import { db } from './db';

export function populateProductionHistory() {
  console.log('🔄 Üretim/Canlı Düzeyi Geçmiş Veri ve Yedekleme Kontrolü Başlatılıyor...');

  const companies = db.prepare('SELECT * FROM companies').all() as any[];
  console.log(`📌 Toplam ${companies.length} Şirket Hesabı İşleniyor...`);

  const runTx = db.transaction(() => {
    for (const comp of companies) {
      const compId = comp.id;
      const compName = comp.name;

      // 1. Kategoriler
      const existingCats = db.prepare('SELECT id FROM categories WHERE company_id = ?').all(compId);
      let catSaleId = existingCats[0]?.id;
      let catExpenseId = existingCats[1]?.id;

      if (existingCats.length === 0) {
        catSaleId = uuidv4();
        catExpenseId = uuidv4();
        db.prepare('INSERT INTO categories (id, company_id, type, name, color) VALUES (?, ?, ?, ?, ?)').run(
          catSaleId, compId, 'PRODUCT', 'Ana Ticari Ürünler', '#3B82F6'
        );
        db.prepare('INSERT INTO categories (id, company_id, type, name, color) VALUES (?, ?, ?, ?, ?)').run(
          catExpenseId, compId, 'EXPENSE', 'Operasyonel Giderler', '#EF4444'
        );
      }

      // 2. Kasa / Banka
      const existingBanks = db.prepare('SELECT id FROM cash_banks WHERE company_id = ?').all(compId);
      let bankId = existingBanks[0]?.id;
      if (existingBanks.length === 0) {
        bankId = uuidv4();
        db.prepare(`
          INSERT INTO cash_banks (id, company_id, type, name, bank_name, branch, account_no, iban, currency, opening_balance, current_balance, is_default)
          VALUES (?, ?, 'BANK', 'Ana Ticari Vadesiz TL', 'Garanti BBVA', 'Merkez', '1001-987654', 'TR33 0006 1005 1234 5678 9012 34', 'TRY', 150000, 248500, 1)
        `).run(bankId, compId);

        db.prepare(`
          INSERT INTO cash_banks (id, company_id, type, name, currency, opening_balance, current_balance, is_default)
          VALUES (?, ?, 'CASH', 'Merkez Kasa TL', 'TRY', 25000, 38500, 0)
        `).run(uuidv4(), compId);
      }

      // 3. Ürünler / Hizmetler
      const existingProds = db.prepare('SELECT id FROM products WHERE company_id = ?').all(compId);
      if (existingProds.length < 3) {
        const p1 = uuidv4();
        const p2 = uuidv4();
        const p3 = uuidv4();

        db.prepare(`
          INSERT INTO products (id, company_id, code, name, category_id, unit, buy_price, sell_price, vat_rate, min_stock, current_stock, is_service)
          VALUES (?, ?, ?, ?, ?, 'Adet', 12000, 28000, 20, 5, 45, 0)
        `).run(p1, compId, `PRD-${compName.slice(0, 3).toUpperCase()}-01`, `${compName} Kurumsal Lisans Paketi`, catSaleId);

        db.prepare(`
          INSERT INTO products (id, company_id, code, name, category_id, unit, buy_price, sell_price, vat_rate, min_stock, current_stock, is_service)
          VALUES (?, ?, ?, ?, ?, 'Saat', 0, 4500, 20, 0, 999, 1)
        `).run(p2, compId, `PRD-${compName.slice(0, 3).toUpperCase()}-02`, 'Teknik Destek ve Danışmanlık Hizmeti', catSaleId);

        db.prepare(`
          INSERT INTO products (id, company_id, code, name, category_id, unit, buy_price, sell_price, vat_rate, min_stock, current_stock, is_service)
          VALUES (?, ?, ?, ?, ?, 'Adet', 3500, 6800, 20, 10, 80, 0)
        `).run(p3, compId, `PRD-${compName.slice(0, 3).toUpperCase()}-03`, 'Donanım Entegrasyon Ünitesi', catSaleId);
      }

      // 4. Müşteriler (Cariler)
      const existingCusts = db.prepare('SELECT id, is_deleted FROM customers WHERE company_id = ?').all(compId);
      if (existingCusts.length < 5) {
        const demoCusts = [
          { title: 'Atlas Uluslararası Lojistik A.Ş.', code: 'CARI-001', contact: 'Serkan Yılmaz', phone: '0532 444 1122', email: 'muhasebe@atlaslojistik.com', tax: '1029384756', balance: 45000, deleted: 0 },
          { title: 'Boğaziçi Endüstri ve Ticaret Ltd.', code: 'CARI-002', contact: 'Merve Demir', phone: '0533 555 2233', email: 'finans@bogaziciendustri.com', tax: '9876543210', balance: 82500, deleted: 0 },
          { title: 'Kuzey Bilişim Teknolojileri A.Ş.', code: 'CARI-003', contact: 'Caner Aydın', phone: '0535 666 3344', email: 'fatura@kuzeybilisim.com', tax: '5544332211', balance: 0, deleted: 0 },
          { title: 'Çözüm Danışmanlık Hizmetleri Ltd.', code: 'CARI-004', contact: 'Elif Kaya', phone: '0542 777 4455', email: 'elif@cozumdanismanlik.com', tax: '7788990011', balance: 19400, deleted: 0 },
          // Silinmiş Cari (Master Admin kurtarma testleri için)
          { title: 'Eski Ortaklık Ticaret A.Ş. (Silinmiş)', code: 'CARI-SIL-01', contact: 'Hakan Çelik', phone: '0555 888 9900', email: 'eski@ortaklik.com', tax: '3322110044', balance: 12500, deleted: 1 },
        ];

        for (const dc of demoCusts) {
          db.prepare(`
            INSERT INTO customers (id, company_id, code, title, contact_person, phone, email, tax_office, tax_number, credit_limit, balance, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Maslak V.D.', ?, 500000, ?, ?)
          `).run(uuidv4(), compId, dc.code, dc.title, dc.contact, dc.phone, dc.email, dc.tax, dc.balance, dc.deleted);
        }
      }

      // 5. Faturalar (Aktif ve Silinmiş Geçmiş Faturalar)
      const existingInvs = db.prepare('SELECT id FROM invoices WHERE company_id = ?').all(compId);
      const activeCustList = db.prepare('SELECT id, title FROM customers WHERE company_id = ? AND is_deleted = 0').all(compId) as any[];

      if (existingInvs.length < 5 && activeCustList.length > 0) {
        const prodList = db.prepare('SELECT id, name, sell_price FROM products WHERE company_id = ?').all(compId) as any[];

        const invConfigs = [
          { no: `FAT-2026-0001`, type: 'SALES', cust: activeCustList[0], total: 33600, status: 'PAID', date: '2026-09-15', due: '2026-10-15', deleted: 0 },
          { no: `FAT-2026-0002`, type: 'SALES', cust: activeCustList[1] || activeCustList[0], total: 54000, status: 'ISSUED', date: '2026-09-22', due: '2026-10-22', deleted: 0 },
          { no: `FAT-2026-0003`, type: 'SALES', cust: activeCustList[2] || activeCustList[0], total: 28800, status: 'PAID', date: '2026-09-28', due: '2026-10-28', deleted: 0 },
          { no: `FAT-2026-0004`, type: 'SALES', cust: activeCustList[0], total: 16200, status: 'ISSUED', date: '2026-10-02', due: '2026-11-02', deleted: 0 },
          // Silinmiş Fatura (Master Admin kurtarma testleri için)
          { no: `FAT-2026-0005`, type: 'SALES', cust: activeCustList[1] || activeCustList[0], total: 42000, status: 'CANCELLED', date: '2026-09-10', due: '2026-10-10', deleted: 1 },
        ];

        for (const ic of invConfigs) {
          const invId = uuidv4();
          const subtotal = ic.total / 1.2;
          const vat = ic.total - subtotal;

          db.prepare(`
            INSERT INTO invoices (
              id, company_id, invoice_type, invoice_no, customer_id, issue_date, due_date,
              status, currency, exchange_rate, subtotal, vat_total, grand_total,
              paid_amount, remaining_amount, payment_method, is_deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'TRY', 1.0, ?, ?, ?, ?, ?, 'HAVALE', ?, ?)
          `).run(
            invId, compId, ic.type, ic.no, ic.cust.id, ic.date, ic.due,
            ic.status, subtotal, vat, ic.total,
            ic.status === 'PAID' ? ic.total : 0,
            ic.status === 'PAID' ? 0 : ic.total,
            ic.deleted,
            ic.date + ' 10:30:00'
          );

          // Fatura Kalemi
          const p = prodList[0];
          db.prepare(`
            INSERT INTO invoice_items (
              id, invoice_id, product_id, item_order, name, description,
              quantity, unit, unit_price, vat_rate, vat_amount, total_amount
            ) VALUES (?, ?, ?, 1, ?, 'Kurumsal Hizmet Faturası', 1, 'Adet', ?, 20, ?, ?)
          `).run(uuidv4(), invId, p?.id || null, p?.name || 'Ana Ürün/Hizmet', subtotal, vat, ic.total);

          // Cari Hesap Hareketi
          db.prepare(`
            INSERT INTO current_account_transactions (
              id, company_id, entity_type, entity_id, transaction_type,
              reference_type, reference_id, date, document_no, debt, credit, balance, description, created_at
            ) VALUES (?, ?, 'CUSTOMER', ?, 'INVOICE', 'INVOICE', ?, ?, ?, ?, 0, ?, 'Fatura Tahakkuku', ?)
          `).run(uuidv4(), compId, ic.cust.id, invId, ic.date, ic.no, ic.total, ic.total, ic.date + ' 10:30:00');
        }
      }

      // 6. Sistem Kurtarma Noktaları (Disaster Recovery Snapshots)
      const existingSnaps = db.prepare('SELECT id FROM company_snapshots WHERE company_id = ?').all(compId);
      if (existingSnaps.length === 0) {
        const snapInvoices = db.prepare('SELECT * FROM invoices WHERE company_id = ?').all(compId);
        const snapCustomers = db.prepare('SELECT * FROM customers WHERE company_id = ?').all(compId);
        const snapProducts = db.prepare('SELECT * FROM products WHERE company_id = ?').all(compId);
        const snapTrans = db.prepare('SELECT * FROM current_account_transactions WHERE company_id = ?').all(compId);

        const snapData = JSON.stringify({
          invoices: snapInvoices,
          customers: snapCustomers,
          products: snapProducts,
          currentAccountTransactions: snapTrans,
        });

        const countsJson = JSON.stringify({
          invoices: snapInvoices.length,
          customers: snapCustomers.length,
          products: snapProducts.length,
          transactions: snapTrans.length,
        });

        db.prepare(`
          INSERT INTO company_snapshots (id, company_id, user_id, reason, snapshot_data, counts_json, is_restored, created_at)
          VALUES (?, ?, NULL, 'Sistem Periyodik Güvenlik Arşivi', ?, ?, 0, datetime('now', '-2 days'))
        `).run(uuidv4(), compId, snapData, countsJson);
      }

      // 7. Denetim Günlüğü Kayıtları (Audit Logs)
      const existingLogs = db.prepare('SELECT id FROM audit_logs WHERE company_id = ?').all(compId);
      if (existingLogs.length < 5) {
        db.prepare(`
          INSERT INTO audit_logs (id, company_id, user_id, action, module, entity_id, details, ip_address, timestamp)
          VALUES (?, ?, NULL, 'CREATE_INVOICE', 'INVOICE', 'FAT-2026-0001', 'Satış faturası onaylandı ve sisteme işlendi.', '127.0.0.1', datetime('now', '-5 days'))
        `).run(uuidv4(), compId);

        db.prepare(`
          INSERT INTO audit_logs (id, company_id, user_id, action, module, entity_id, details, ip_address, timestamp)
          VALUES (?, ?, NULL, 'SOFT_DELETE_CUSTOMER', 'CUSTOMER', 'CARI-SIL-01', 'Müşteri kartı güvenli arşive taşındı.', '127.0.0.1', datetime('now', '-3 days'))
        `).run(uuidv4(), compId);

        db.prepare(`
          INSERT INTO audit_logs (id, company_id, user_id, action, module, entity_id, details, ip_address, timestamp)
          VALUES (?, ?, NULL, 'SYSTEM_BACKUP', 'SECURITY', 'ROOT', 'Otomatik sistem snapshot yedeği oluşturuldu.', '127.0.0.1', datetime('now', '-2 days'))
        `).run(uuidv4(), compId);
      }
    }
  });

  runTx();
  console.log('✅ TÜM ŞİRKETLER İÇİN CANLI/ÜRETİM DÜZEYİ GEÇMİŞ VERİLER VE YEDEKLER EKSİKSİZ KURULDU!');
}
