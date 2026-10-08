# BeeCursor ERP Pro — Kapsamlı Muhasebe, Finans ve Şirket Yönetim Sistemi

BeeCursor ERP Pro; modern işletmelerin, holdinglerin ve SaaS sağlayıcıların günlük tüm ticari, muhasebesel ve finansal operasyonlarını ultra yüksek performansla yönetebilmeleri için geliştirilmiş yeni nesil bir Muhasebe ve ERP SaaS platformudur.

---

## 🌟 Öne Çıkan Özellikler ve Modüller

1. **Çoklu Şirket (Multi-Tenant) Mimarisi**:
   - Tek bir kullanıcı birden fazla şirket tanımlayabilir ve üst bardan anında geçiş yapabilir.
   - Her şirketin müşterileri, tedarikçileri, faturaları, kasaları, bankaları ve belgeleri tamamen izoledir.
2. **Kapsamlı Fatura Yönetimi (Satış & Alış)**:
   - Kalem kalem dinamik KDV (%0, %1, %10, %20), İskonto (yüzde veya tutar) ve Tevkifat / Stopaj (5/10, 7/10, 9/10) hesaplama motoru.
   - Kuruş yuvarlama hatası yapmayan yüksek hassasiyetli decimal matematik altyapısı.
   - Taslak ve Onaylı durum yönetimi.
3. **Sunucu Taraflı A4 PDF Fatura & Makbuz Üretimi**:
   - Kurumsal A4 formatında, şirket logosu, kaşe/imza alanı, IBAN bilgileri ve kalem dökümüyle anında PDF oluşturma, önizleme ve indirme.
4. **Cari Hesap ve Ekstre Sistemi**:
   - Her müşteri ve tedarikçi için otomatik çift taraflı borç/alacak cari defteri (`current_account_transactions`).
   - Tek tıkla kronolojik Cari Hesap Ekstresi görüntüleme.
5. **Ödeme Planları ve Taksit Takip Sistemi**:
   - Faturalara bağlı veya bağımsız taksitlendirme (2 - 12 taksit).
   - Vade tarihi geçmiş gecikmiş taksitlerin dashboard üzerinde anlık tespiti.
   - Tek tıkla taksit ödeme ve kasa/banka bakiyesini güncelleme.
6. **Kasa, Banka ve Varlık Transferi**:
   - Birden fazla nakit kasa (Merkez Kasa vb.) ve banka hesabı (Garanti BBVA, İş Bankası USD vb.).
   - **Varlık Transferi**: Kasa ⇄ Banka arası para aktarımı (kesinlikle gelir/gider sayılmaz, saf varlık transferi olarak işlenir).
7. **Gelir ve Gider Takibi & Tekrarlayan Maliyetler**:
   - Kira, sunucu, personel maaşları, ofis giderleri.
   - Tek seferlik veya tekrarlayan (Aylık/Yıllık) otomatik takip.
8. **Teklif ve Satış Siparişleri**:
   - Müşteriye teklif hazırlama.
   - **Tek Tuşla Faturaya Dönüştür**: Kabul edilen teklifi otomatik satış faturasına dönüştürme ve carisine yansıtma.
9. **Stok, Depolar ve Kritik Eşik Alarmları**:
   - Fiziksel ürün ve hizmet/lisans ayrımı.
   - Kritik stok seviyesinin altına düşen ürünler için otomatik uyarılar.
10. **Ağaç Yapısında Belge ve Klasör Arşivi**:
    - Kullanıcı dilediğince hiyerarşik klasör oluşturabilir (Örn: `/Muhasebe/2026/Satış Faturaları`).
    - Belgeleri fatura, müşteri veya tedarikçi kayıtlarına doğrudan bağlama.
11. **Raporlama ve Yerel Excel (XLSX) Export**:
    - Dönemsel Kar/Zarar Raporu.
    - 30 Günlük Nakit Akışı Projeksiyonu.
    - Tek tıkla native Excel (.xlsx) indirme.
12. **Denetim Günlüğü (Audit Log) & Çöp Kutusu (Soft Delete)**:
    - Kim ne zaman ne yaptı (IP adresi, parametreler ve zaman damgası).
    - Silinen kayıtları kaybetmeden çöp kutusundan tek tuşla geri yükleme (Restore).
13. **Hızlı Global Arama (Ctrl + K) & Kısayollar**:
    - Fatura, müşteri, ürün veya belge aramalarında anlık sonuç.

---

## 🛠️ Teknoloji Yığını (Tech Stack)

- **Backend**:
  - Node.js (v24.x) + Express RESTful API
  - TypeScript & Zod validation
  - SQLite (WAL modu aktif, transactional, sub-millisecond execution)
  - `pdf-lib` (A4 PDF üretim motoru)
  - `xlsx` (Excel tablo üretimi)
  - `bcryptjs` & `jsonwebtoken` (JWT Tenant auth)
- **Frontend**:
  - React 19 + TypeScript + Vite
  - Tailwind CSS + Lucide Icons
  - Responsive Sidebar & Header, Dark Mode desteği
  - Türk Lirası ve Türkiye Tarih formatları (`25.000,50 ₺`, `DD.MM.YYYY`)

---

## 🚀 Kurulum ve Çalıştırma

### 1. Backend Servisini Başlatma
```bash
# Proje kök dizininde:
npx tsx server/src/index.ts
```
API Servisi `http://localhost:5000` portunda çalışacaktır. İlk açılışta veritabanı otomatik kurulur ve **BeeCursor Teknoloji ve ERP A.Ş.** demo verileri yüklenir.

### 2. Frontend İstemcisini Başlatma
```bash
cd client
npm run dev
```
İstemci `http://localhost:5173` adresinde açılacaktır.

### 3. Otomatik Demo Giriş Bilgileri
- **E-Posta**: `admin@beecursor.com`
- **Şifre**: `admin123`

---

## 🧪 Testleri Çalıştırma
```bash
npx tsx server/src/tests/invoice-engine.test.ts
```
