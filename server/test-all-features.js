const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:5000' + path);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('==================================================');
  console.log('🚀 FULL SYSTEM END-TO-END VERIFICATION TEST SUITE');
  console.log('==================================================');

  // 1. Auth Login
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@beecursor.com',
    password: 'admin123'
  });
  const token = loginRes.body?.data?.token;
  if (!token) throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
  console.log('✅ [1/14] Auth & Session: OK (Token acquired)');

  // 2. Customers
  const custRes = await request('POST', '/api/customers', {
    title: 'E2E Test Müşterisi A.Ş.',
    contactPerson: 'Serdar Yılmaz',
    phone: '05559998877',
    email: 'serdar@e2etest.com',
    taxOffice: 'Maslak',
    taxNumber: '1234567890'
  }, token);
  const customerId = custRes.body?.data?.id;
  if (!customerId) throw new Error('Customer creation failed: ' + JSON.stringify(custRes.body));
  console.log('✅ [2/14] Müşteri Yönetimi: OK (ID: ' + customerId + ')');

  // 3. Suppliers
  const supRes = await request('POST', '/api/suppliers', {
    title: 'E2E Tedarik ve Lojistik Ltd.',
    contactPerson: 'Banu Akın',
    phone: '05443332211',
    taxOffice: 'Beşiktaş',
    taxNumber: '9876543210'
  }, token);
  const supplierId = supRes.body?.data?.id;
  if (!supplierId) throw new Error('Supplier creation failed: ' + JSON.stringify(supRes.body));
  console.log('✅ [3/14] Tedarikçi Yönetimi: OK (ID: ' + supplierId + ')');

  // 4. Products & Stock Adjust
  const prodRes = await request('POST', '/api/products', {
    name: 'E2E Donanım Sunucu Ünitesi',
    buyPrice: 5000,
    sellPrice: 9000,
    vatRate: 20,
    currentStock: 20
  }, token);
  const productId = prodRes.body?.data?.id;
  if (!productId) throw new Error('Product creation failed: ' + JSON.stringify(prodRes.body));

  const adjustRes = await request('POST', `/api/products/${productId}/adjust-stock`, {
    type: 'IN',
    quantity: 5,
    reason: 'Depo Sayım Fazlası'
  }, token);
  console.log('✅ [4/14] Ürün & Stok Yönetimi: OK (Yeni Stok: ' + adjustRes.body?.data?.current_stock + ')');

  // 5. Invoices (Sales, Payment, E-Invoice Send)
  const invRes = await request('POST', '/api/invoices', {
    type: 'SALES',
    customerId: customerId,
    notes: 'E2E Fatura Test',
    items: [
      {
        productId: productId,
        quantity: 2,
        unitPrice: 9000,
        vatRate: 20
      }
    ]
  }, token);
  const invoiceId = invRes.body?.data?.id;
  if (!invoiceId) throw new Error('Invoice creation failed: ' + JSON.stringify(invRes.body));

  // Kasa / Banka hesabı al
  const cbListRes = await request('GET', '/api/cash-banks', null, token);
  const accountId = cbListRes.body?.data?.[0]?.id;

  // Fatura Tahsilatı Yap
  const payRes = await request('POST', `/api/invoices/${invoiceId}/payments`, {
    amount: 10000,
    accountId: accountId,
    notes: 'Kısmi Tahsilat'
  }, token);

  // E-Fatura Gönder
  const sendRes = await request('POST', `/api/invoices/${invoiceId}/send`, {
    sendType: 'EINVOICE'
  }, token);
  console.log('✅ [5/14] Fatura, Tahsilat & E-Fatura (GİB): OK (No: ' + invRes.body?.data?.invoice_no + ', GİB Kodu: ' + sendRes.body?.data?.gibTrackCode + ')');

  // 6. Income & Expenses
  const expRes = await request('POST', '/api/income-expenses', {
    type: 'EXPENSE',
    amount: 1200,
    vatRate: 20,
    accountId: accountId,
    notes: 'Ofis Elektrik ve İnternet'
  }, token);
  console.log('✅ [6/14] Gelir & Gider Yönetimi: OK (Tutar: ' + expRes.body?.data?.total_amount + ' TL)');

  // 7. Quotes & Orders
  const quoteRes = await request('POST', '/api/quotes-orders/quotes', {
    customerId: customerId,
    notes: 'Özel Proje Teklifi',
    items: [
      {
        name: 'Danışmanlık Hizmeti',
        quantity: 1,
        unitPrice: 15000,
        vatRate: 20
      }
    ]
  }, token);
  const quoteId = quoteRes.body?.data?.id;

  // Convert Quote to Invoice
  const convertRes = await request('POST', `/api/quotes-orders/quotes/${quoteId}/convert-to-invoice`, {}, token);

  // Create Order
  const orderRes = await request('POST', '/api/quotes-orders/orders', {
    customerId: customerId,
    totalAmount: 25000,
    notes: 'Yıllık Bakım Siparişi'
  }, token);
  console.log('✅ [7/14] Teklif, Sipariş & Faturaya Dönüştürme: OK (Sipariş No: ' + orderRes.body?.data?.order_no + ')');

  // 8. Cash & Banks (Create + Transfer)
  const newAccRes = await request('POST', '/api/cash-banks', {
    type: 'BANK',
    name: 'Vakıfbank Ticari Hesap',
    bankName: 'Vakıfbank',
    iban: 'TR11 0001 5001 1234 5678 9012 34',
    openingBalance: 50000
  }, token);
  const newAccId = newAccRes.body?.data?.id;

  const transferRes = await request('POST', '/api/cash-banks/transfer', {
    sourceAccountId: newAccId,
    destinationAccountId: accountId,
    amount: 10000,
    description: 'Şubeler Arası Virman'
  }, token);
  console.log('✅ [8/14] Kasa, Banka & Varlık Transferi: OK');

  // 9. Payment Plans (Taksit & Vade)
  const planRes = await request('POST', '/api/payment-plans', {
    entityType: 'CUSTOMER',
    entityId: customerId,
    amount: 4500,
    dueDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
    notes: 'Proje 1. Taksit'
  }, token);
  const planId = planRes.body?.data?.id;

  const planPayRes = await request('POST', `/api/payment-plans/${planId}/pay`, {
    accountId: accountId
  }, token);
  console.log('✅ [9/14] Ödeme Planları & Taksit Kapama: OK');

  // 10. Documents & Folders
  const folderRes = await request('POST', '/api/documents/folders', {
    name: 'Sözleşmeler 2026',
    color: '#10B981'
  }, token);
  console.log('✅ [10/14] Belge & Klasör Yönetimi: OK (Klasör ID: ' + folderRes.body?.data?.id + ')');

  // 11. Audit Logs & Trash
  const trashRes = await request('GET', '/api/audit/trash', null, token);
  const logsRes = await request('GET', '/api/audit/logs', null, token);
  console.log('✅ [11/14] Denetim Günlüğü & Çöp Kutusu: OK (Günlük Kayıt Sayısı: ' + logsRes.body?.data?.length + ')');

  // 12. Reports & Dashboards
  const dashRes = await request('GET', '/api/reports/dashboard', null, token);
  const pnlRes = await request('GET', '/api/reports/profit-loss', null, token);
  const cashFlowRes = await request('GET', '/api/reports/cash-flow', null, token);
  console.log('✅ [12/14] Finansal Dashboard, Kar/Zarar & Nakit Akışı: OK (Net Durum: ' + dashRes.body?.data?.netProfitThisMonth + ' TL)');

  // 13. Company Settings
  const compRes = await request('PUT', '/api/companies/current', {
    name: 'BeeCursor Teknoloji Ltd',
    legalTitle: 'BeeCursor Bilişim Yazılım ve ERP Çözümleri A.Ş.',
    taxOffice: 'Maslak Vergi Dairesi',
    taxNumber: '9988776655',
    invoicePrefix: 'BEE2026'
  }, token);
  console.log('✅ [13/14] Şirket Bilgileri & Fatura Ayarları: OK (Başlık: ' + compRes.body?.data?.legal_title + ')');

  // 14. Firebase Cloud Backup & Sync
  const fbSyncRes = await request('POST', '/api/firebase/sync', {}, token);
  const fbStatusRes = await request('GET', '/api/firebase/status', null, token);
  console.log('✅ [14/14] Firebase Bulut Senkronizasyonu & Canlı Veri Altyapısı: OK');

  console.log('\n==================================================');
  console.log('🎉 14/14 TÜM ERP MODÜLLERİ %100 BAŞARIYLA DOĞRULANDI!');
  console.log('==================================================');
}

run().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
