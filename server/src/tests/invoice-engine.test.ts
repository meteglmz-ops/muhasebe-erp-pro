import { InvoiceEngine, round2 } from '../services/invoice-engine';
import { db, initDatabase } from '../database/db';

console.log('🧪 ERP Muhasebe ve Finans Hesaplama Motoru Testleri Başlatılıyor...');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASSED: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${msg}`);
    failed++;
  }
}

// Test 1: Basit Fatura Hesaplama (%20 KDV, 2 Kalem)
{
  const items = [
    { name: 'Web Tasarım Hizmeti', quantity: 1, unitPrice: 15000, vatRate: 20 },
    { name: 'Bulut Sunucu Barındırma', quantity: 12, unitPrice: 1000, vatRate: 20 },
  ];

  const result = InvoiceEngine.calculate(items);
  assert(result.subtotal === 27000, 'Ara toplam 27.000 TL olmalı');
  assert(result.vatTotal === 5400, 'Hesaplanan KDV (%20) 5.400 TL olmalı');
  assert(result.grandTotal === 32400, 'Genel toplam 32.400 TL olmalı');
}

// Test 2: İskontolu Fatura Hesaplama (%10 İskonto)
{
  const items = [
    { name: 'Kurumsal Danışmanlık', quantity: 1, unitPrice: 20000, discountPercent: 10, vatRate: 20 },
  ];

  const result = InvoiceEngine.calculate(items);
  assert(result.subtotal === 20000, 'Brüt tutar 20.000 TL olmalı');
  assert(result.discountTotal === 2000, 'İskonto 2.000 TL olmalı');
  assert(result.netTotal === 18000, 'Net matrah 18.000 TL olmalı');
  assert(result.vatTotal === 3600, 'KDV 3.600 TL olmalı');
  assert(result.grandTotal === 21600, 'Genel toplam 21.600 TL olmalı');
}

// Test 3: Tevkifatlı Fatura Hesaplama (5/10 Tevkifat - %50 Stopaj)
{
  const items = [
    { name: 'Yazılım Geliştirme Hizmeti', quantity: 1, unitPrice: 100000, vatRate: 20, withholdingRate: 50 },
  ];

  const result = InvoiceEngine.calculate(items);
  assert(result.subtotal === 100000, 'Ara toplam 100.000 TL olmalı');
  assert(result.vatTotal === 20000, 'KDV 20.000 TL olmalı');
  assert(result.withholdingTotal === 10000, 'Tevkifat (5/10) 10.000 TL kesinti olmalı');
  assert(result.grandTotal === 110000, 'Ödenecek genel toplam 110.000 TL olmalı');
}

// Test 4: Kuruş Yuvarlama ve Precision Testi
{
  const val = round2(1234.5678);
  assert(val === 1234.57, 'Kuruş yuvarlama virgülden sonra 2 hane olmalı');
}

// Test 5: Veritabanı ve Bakiye Tutarlılık Testi
{
  initDatabase();
  const company = db.prepare('SELECT id, name FROM companies LIMIT 1').get() as any;
  assert(company && !!company.id, 'Veritabanı bağlantısı ve şirket kaydı mevcut olmalı');

  const customer = db.prepare('SELECT id, title, balance FROM customers LIMIT 1').get() as any;
  assert(customer && typeof customer.balance === 'number', 'Müşteri cari kaydı ve bakiye alanı sayısal olmalı');
}

console.log(`\n📊 Test Sonuçları: ${passed} Başarılı, ${failed} Hatalı`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 Tüm hesaplama ve veri bütünlüğü testleri başarıyla geçti!\n');
}
