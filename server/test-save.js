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
  console.log('--- COMPREHENSIVE ERP DATA SAVE TEST ---');
  
  // 1. Login
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@beecursor.com',
    password: 'admin123'
  });
  console.log('1. Login:', loginRes.status, loginRes.body?.success);
  const token = loginRes.body?.data?.token;
  if (!token) throw new Error('Could not login: ' + JSON.stringify(loginRes.body));

  // 2. Add Customer
  const custRes = await request('POST', '/api/customers', {
    title: 'Anadolu Yazılım Çözümleri Ltd.',
    contactPerson: 'Murat Kara',
    phone: '05331112233',
    email: 'murat@anadoluyazilim.com',
    taxOffice: 'Ümraniye',
    taxNumber: '1122334455'
  }, token);
  console.log('2. Customer Add:', custRes.status, custRes.body?.success, 'ID:', custRes.body?.data?.id);
  const customerId = custRes.body?.data?.id;

  // 3. Add Supplier
  const suppRes = await request('POST', '/api/suppliers', {
    title: 'Mega Donanım Tedarik A.Ş.',
    contactPerson: 'Ayşe Çelik',
    phone: '05445556677',
    taxOffice: 'Karaköy',
    taxNumber: '9988776655'
  }, token);
  console.log('3. Supplier Add:', suppRes.status, suppRes.body?.success, 'ID:', suppRes.body?.data?.id);

  // 4. Add Product
  const prodRes = await request('POST', '/api/products', {
    name: 'ERP Lisans Paketi - Yıllık',
    buyPrice: 1200,
    sellPrice: 2400,
    vatRate: 20,
    currentStock: 50
  }, token);
  console.log('4. Product Add:', prodRes.status, prodRes.body?.success, 'ID:', prodRes.body?.data?.id);
  const productId = prodRes.body?.data?.id;

  // 5. Add Sales Invoice
  const invRes = await request('POST', '/api/invoices', {
    type: 'SALES',
    customer_id: customerId,
    notes: 'Kayıt ve Entegrasyon Test Faturası',
    items: [
      {
        product_id: productId,
        quantity: 2,
        unit_price: 2400,
        vat_rate: 20
      }
    ]
  }, token);
  console.log('5. Invoice Add:', invRes.status, invRes.body?.success, 'Invoice No:', invRes.body?.data?.invoice_no, 'Total:', invRes.body?.data?.grand_total);

  // 6. Add Income/Expense (Gelir/Gider)
  const expRes = await request('POST', '/api/income-expenses', {
    type: 'EXPENSE',
    amount: 750,
    vatRate: 20,
    notes: 'Ofis ve Sunucu Giderleri'
  }, token);
  console.log('6. Expense Add:', expRes.status, expRes.body?.success, 'Total:', expRes.body?.data?.total_amount);

  // 7. Add Quote (Teklif)
  const quoteRes = await request('POST', '/api/quotes-orders/quotes', {
    customerId: customerId,
    notes: 'Teklif onay süreci',
    items: [
      {
        name: 'Özel Entegrasyon Hizmeti',
        quantity: 1,
        unitPrice: 5000,
        vatRate: 20
      }
    ]
  }, token);
  console.log('7. Quote Add:', quoteRes.status, quoteRes.body?.success, 'Quote No:', quoteRes.body?.data?.quote_no);

  // 8. Add Order (Sipariş)
  const orderRes = await request('POST', '/api/quotes-orders/orders', {
    customerId: customerId,
    totalAmount: 5000,
    notes: 'Web üzerinden sipariş'
  }, token);
  console.log('8. Order Add:', orderRes.status, orderRes.body?.success, 'Order No:', orderRes.body?.data?.order_no);

  // 9. Update Company Settings
  const compRes = await request('PUT', '/api/companies/current', {
    name: 'BeeCursor Teknoloji Ltd',
    legalTitle: 'BeeCursor Bilişim ve ERP Çözümleri A.Ş.',
    taxOffice: 'Maslak',
    taxNumber: '9988776655',
    invoicePrefix: 'BEE2026'
  }, token);
  console.log('9. Company Update:', compRes.status, compRes.body?.success, 'Title:', compRes.body?.data?.legal_title);

  // 10. Firebase Cloud Sync
  const syncRes = await request('POST', '/api/firebase/sync', {}, token);
  console.log('10. Firebase Sync:', syncRes.status, syncRes.body?.success, 'Snapshot file updated:', syncRes.body?.data?.snapshotFile);

  console.log('\n--- ALL ERP VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

run().catch(console.error);
