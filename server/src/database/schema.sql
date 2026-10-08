-- =========================================================================
-- Kapsamlı Muhasebe, Finans & ERP Çok Şirketli (Multi-Tenant) Veritabanı Şeması
-- SQLite / PostgreSQL Uyumlu SQL Tasarımı
-- =========================================================================

-- 1. Şirketler (Multi-Tenant Core)
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_title TEXT,
    tax_office TEXT,
    tax_number TEXT,
    tc_identity TEXT,
    address TEXT,
    city TEXT,
    district TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    iban TEXT,
    bank_info TEXT,
    logo_url TEXT,
    invoice_prefix TEXT DEFAULT 'FAT',
    next_invoice_number INTEGER DEFAULT 1,
    quote_prefix TEXT DEFAULT 'TEK',
    next_quote_number INTEGER DEFAULT 1,
    order_prefix TEXT DEFAULT 'SIP',
    next_order_number INTEGER DEFAULT 1,
    default_currency TEXT DEFAULT 'TRY',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
);

-- 2. Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    tc_identity TEXT,
    phone TEXT,
    role TEXT DEFAULT 'USER', -- SUPER_ADMIN, COMPANY_OWNER, ACCOUNTANT, FINANCE, SALES, WAREHOUSE, VIEWER
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Kullanıcı - Şirket İlişkisi ve Rol İzinleri
CREATE TABLE IF NOT EXISTS user_companies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'ACCOUNTANT',
    permissions TEXT, -- JSON: ['invoices.*', 'customers.*', etc.]
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 4. Özel Roller ve İzin Tanımları
CREATE TABLE IF NOT EXISTS custom_roles (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL, -- JSON array of permission strings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 5. Müşteriler (Cariler - Müşteri)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    tax_office TEXT,
    tax_number TEXT,
    tc_identity TEXT,
    address TEXT,
    city TEXT,
    district TEXT,
    website TEXT,
    notes TEXT,
    tags TEXT, -- JSON array
    credit_limit REAL DEFAULT 0.0,
    payment_term_days INTEGER DEFAULT 30,
    balance REAL DEFAULT 0.0, -- Pozitif: Müşteri borçlu (alacağımız var), Negatif: Fazla ödeme
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_title ON customers(title);

-- 6. Tedarikçiler (Cariler - Tedarikçi)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    tax_office TEXT,
    tax_number TEXT,
    address TEXT,
    city TEXT,
    district TEXT,
    notes TEXT,
    tags TEXT,
    balance REAL DEFAULT 0.0, -- Pozitif: Biz tedarikçiye borçluyuz
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);

-- 7. Kategoriler (Ürün, Gelir, Gider)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    type TEXT NOT NULL, -- PRODUCT, EXPENSE, INCOME
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 8. Ürün ve Hizmetler
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    category_id TEXT,
    unit TEXT DEFAULT 'Adet', -- Adet, Kg, Metre, Saat, Ay vb.
    buy_price REAL DEFAULT 0.0,
    sell_price REAL DEFAULT 0.0,
    vat_rate REAL DEFAULT 20.0, -- %0, %1, %10, %20
    min_stock REAL DEFAULT 5.0,
    current_stock REAL DEFAULT 0.0,
    is_service INTEGER DEFAULT 0, -- 1: Hizmet (stoksuz), 0: Fiziksel Ürün
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);

-- 9. Depolar
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    location TEXT,
    is_default INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 10. Stok Hareketleri
CREATE TABLE IF NOT EXISTS stock_transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    warehouse_id TEXT,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL, -- PURCHASE, SALE, TRANSFER, ADJUSTMENT
    quantity REAL NOT NULL,
    unit_price REAL DEFAULT 0.0,
    date DATETIME NOT NULL,
    reference_type TEXT, -- INVOICE, MANUAL, ORDER
    reference_id TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_stock_trans_company ON stock_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_trans_product ON stock_transactions(product_id);

-- 11. Faturalar (Satış ve Alış Faturaları)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    invoice_type TEXT NOT NULL, -- SALES (Satış), PURCHASE (Alış)
    invoice_no TEXT NOT NULL,
    customer_id TEXT,
    supplier_id TEXT,
    issue_date TEXT NOT NULL, -- YYYY-MM-DD
    due_date TEXT NOT NULL,   -- YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ISSUED, PARTIAL_PAID, PAID, OVERDUE, CANCELLED
    currency TEXT DEFAULT 'TRY',
    exchange_rate REAL DEFAULT 1.0,
    subtotal REAL NOT NULL DEFAULT 0.0,
    discount_total REAL NOT NULL DEFAULT 0.0,
    vat_total REAL NOT NULL DEFAULT 0.0,
    withholding_total REAL NOT NULL DEFAULT 0.0, -- Stopaj
    excise_total REAL NOT NULL DEFAULT 0.0,      -- ÖTV
    grand_total REAL NOT NULL DEFAULT 0.0,
    paid_amount REAL NOT NULL DEFAULT 0.0,
    remaining_amount REAL NOT NULL DEFAULT 0.0,
    payment_method TEXT DEFAULT 'HAVALE', -- NAKIT, HAVALE, KREDI_KARTI, CEK
    notes TEXT,
    terms TEXT,
    template TEXT DEFAULT 'MODERN', -- MODERN, CLASSIC, MINIMAL, CORPORATE
    is_einvoice INTEGER DEFAULT 0,
    einvoice_uuid TEXT,
    einvoice_status TEXT, -- NOT_SENT, PENDING, ACCEPTED, REJECTED
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

-- 12. Fatura Kalemleri
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    product_id TEXT,
    item_order INTEGER DEFAULT 1,
    name TEXT NOT NULL,
    description TEXT,
    quantity REAL NOT NULL DEFAULT 1.0,
    unit TEXT DEFAULT 'Adet',
    unit_price REAL NOT NULL DEFAULT 0.0,
    discount_percent REAL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    vat_rate REAL NOT NULL DEFAULT 20.0,
    vat_amount REAL NOT NULL DEFAULT 0.0,
    withholding_rate REAL DEFAULT 0.0,
    withholding_amount REAL DEFAULT 0.0,
    total_amount REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- 13. Cari Hesap Hareketleri (Current Account Ledger)
CREATE TABLE IF NOT EXISTS current_account_transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- CUSTOMER, SUPPLIER
    entity_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- INVOICE, COLLECTION, PAYMENT, OPENING_BALANCE, NOTE
    reference_type TEXT,
    reference_id TEXT,
    date TEXT NOT NULL,
    document_no TEXT,
    debt REAL DEFAULT 0.0,   -- Borç (Müşteri için alacağımız artar)
    credit REAL DEFAULT 0.0, -- Alacak (Müşteri ödeme yaptıysa)
    balance REAL DEFAULT 0.0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_current_account_entity ON current_account_transactions(company_id, entity_type, entity_id);

-- 14. Kasalar ve Banka Hesapları
CREATE TABLE IF NOT EXISTS cash_banks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    type TEXT NOT NULL, -- CASH, BANK
    name TEXT NOT NULL,
    bank_name TEXT,
    branch TEXT,
    account_no TEXT,
    iban TEXT,
    currency TEXT DEFAULT 'TRY',
    opening_balance REAL DEFAULT 0.0,
    current_balance REAL DEFAULT 0.0,
    is_default INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cash_banks_company ON cash_banks(company_id);

-- 15. Kasa/Banka Finansal Hareketleri
CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    type TEXT NOT NULL, -- INFLOW (Giriş), OUTFLOW (Çıkış), TRANSFER
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'TRY',
    exchange_rate REAL DEFAULT 1.0,
    amount_try REAL NOT NULL,
    date TEXT NOT NULL,
    category_id TEXT,
    related_type TEXT, -- INVOICE, CUSTOMER, SUPPLIER, EXPENSE, INCOME, TRANSFER
    related_id TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES cash_banks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_financial_trans_company ON financial_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_trans_account ON financial_transactions(account_id);

-- 16. Kasa / Banka Varlık Transferleri
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    source_account_id TEXT NOT NULL,
    destination_account_id TEXT NOT NULL,
    amount REAL NOT NULL,
    fee REAL DEFAULT 0.0,
    date TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(source_account_id) REFERENCES cash_banks(id) ON DELETE RESTRICT,
    FOREIGN KEY(destination_account_id) REFERENCES cash_banks(id) ON DELETE RESTRICT
);

-- 17. Ödeme Planları ve Taksitler
CREATE TABLE IF NOT EXISTS payment_plans (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    invoice_id TEXT,
    entity_type TEXT NOT NULL, -- CUSTOMER, SUPPLIER
    entity_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    installment_count INTEGER NOT NULL,
    installment_no INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, PARTIAL, OVERDUE, CANCELLED
    paid_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payment_plans_due ON payment_plans(company_id, due_date, status);

-- 18. Gelir ve Giderler
CREATE TABLE IF NOT EXISTS income_expenses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    type TEXT NOT NULL, -- INCOME (Gelir), EXPENSE (Gider)
    category_id TEXT,
    customer_id TEXT,
    supplier_id TEXT,
    account_id TEXT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    vat_rate REAL DEFAULT 0.0,
    vat_amount REAL DEFAULT 0.0,
    total_amount REAL NOT NULL,
    currency TEXT DEFAULT 'TRY',
    payment_status TEXT DEFAULT 'PAID', -- PAID, PENDING
    is_recurring INTEGER DEFAULT 0,
    recurrence_interval TEXT, -- MONTHLY, QUARTERLY, YEARLY
    notes TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY(account_id) REFERENCES cash_banks(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_inc_exp_company ON income_expenses(company_id, type, date);

-- 19. Teklifler
CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    quote_no TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED, CONVERTED_TO_INVOICE
    subtotal REAL DEFAULT 0.0,
    discount_total REAL DEFAULT 0.0,
    vat_total REAL DEFAULT 0.0,
    grand_total REAL DEFAULT 0.0,
    notes TEXT,
    converted_invoice_id TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quote_items (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL,
    product_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    quantity REAL NOT NULL DEFAULT 1.0,
    unit TEXT DEFAULT 'Adet',
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0.0,
    vat_rate REAL DEFAULT 20.0,
    total_amount REAL NOT NULL,
    FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- 20. Siparişler
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    order_no TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    order_date TEXT NOT NULL,
    delivery_date TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, PREPARING, COMPLETED, CANCELLED
    grand_total REAL DEFAULT 0.0,
    converted_invoice_id TEXT,
    notes TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,
    unit_price REAL NOT NULL,
    vat_rate REAL DEFAULT 20.0,
    total_amount REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 21. Klasörler ve Belge Yönetimi
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    parent_id TEXT, -- NULL ise kök dizin
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    color TEXT DEFAULT '#64748B',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(parent_id) REFERENCES folders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_folders_company ON folders(company_id, parent_id);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    folder_id TEXT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    linked_entity_type TEXT, -- INVOICE, CUSTOMER, SUPPLIER, EXPENSE
    linked_entity_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_linked ON documents(linked_entity_type, linked_entity_id);

-- 22. Denetim Günlüğü (Audit Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, RESTORE, LOGIN, EXPORT
    module TEXT NOT NULL, -- INVOICE, CUSTOMER, PAYMENT, CASH, SETTINGS
    entity_id TEXT,
    details TEXT, -- JSON özet
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, timestamp);

-- 23. Hatırlatıcılar ve Bildirimler
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'INFO', -- INFO, WARNING, DANGER, SUCCESS
    link TEXT,
    due_date TEXT,
    is_read INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);
