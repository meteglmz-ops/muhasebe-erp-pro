import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase, backupDatabase } from './database/db';
import { runSeed } from './database/seed';
import { populateProductionHistory } from './database/populate_production_data';
import { authRouter } from './modules/auth/auth.routes';
import { companyRouter } from './modules/company/company.routes';
import { customerRouter } from './modules/customers/customers.routes';
import { supplierRouter } from './modules/suppliers/suppliers.routes';
import { productRouter } from './modules/products/products.routes';
import { invoiceRouter } from './modules/invoices/invoices.routes';
import { paymentPlanRouter } from './modules/payment-plans/payment-plans.routes';
import { cashBankRouter } from './modules/cash-banks/cash-banks.routes';
import { incomeExpenseRouter } from './modules/income-expenses/income-expenses.routes';
import { quoteOrderRouter } from './modules/quotes-orders/quotes-orders.routes';
import { documentRouter } from './modules/documents/documents.routes';
import { reportRouter } from './modules/reports/reports.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { firebaseRouter } from './modules/firebase/firebase.routes';
import { adminRouter } from './modules/admin/admin.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static Document Files
const storageDir = path.resolve(__dirname, '../../storage');
app.use('/storage', express.static(storageDir));

// Initialize DB & Seed demo data
initDatabase();
runSeed();
populateProductionHistory();
backupDatabase();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'BeeCursor ERP Pro Engine',
    version: '2.0.0',
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companyRouter);
app.use('/api/company', companyRouter);
app.use('/api/customers', customerRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/products', productRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/payment-plans', paymentPlanRouter);
app.use('/api/cash-banks', cashBankRouter);
app.use('/api/income-expenses', incomeExpenseRouter);
app.use('/api/quotes-orders', quoteOrderRouter);
app.use('/api/documents', documentRouter);
app.use('/api/reports', reportRouter);
app.use('/api/audit', auditRouter);
app.use('/api/firebase', firebaseRouter);
app.use('/api/admin', adminRouter);

// Frontend Client Production Static Hosting (SPA)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/storage')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Sunucu Hatası:', err);
  res.status(500).json({
    success: false,
    error: 'İşlem gerçekleştirilirken bir sunucu hatası oluştu. Lütfen tekrar deneyin.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 BeeCursor ERP & Muhasebe API Servisi Başlatıldı!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`⚡ Veritabanı: SQLite WAL Modu Aktif`);
  console.log(`====================================================`);
});
