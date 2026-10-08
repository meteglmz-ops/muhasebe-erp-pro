import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const storageDir = path.resolve(__dirname, '../../../storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const dbPath = path.join(storageDir, 'erp_system.sqlite');
export const db = new Database(dbPath);

// Performans ve Bütünlük PRAGMA ayarları (Ultra Hızlı WAL Mode)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('temp_store = MEMORY');
db.pragma('cache_size = -64000'); // 64MB cache

export function initDatabase() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Migration: Add tc_identity column to users if not present
  try {
    const userColumns = db.prepare('PRAGMA table_info(users)').all() as any[];
    if (!userColumns.some((col: any) => col.name === 'tc_identity')) {
      db.exec('ALTER TABLE users ADD COLUMN tc_identity TEXT');
    }
  } catch (err) {
    console.warn('users migration note:', err);
  }

  // Migration: Add updated_at column to documents if not present
  try {
    const docCols = db.prepare('PRAGMA table_info(documents)').all() as any[];
    if (docCols.length > 0 && !docCols.some((col: any) => col.name === 'updated_at')) {
      db.exec('ALTER TABLE documents ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
  } catch (err) {
    console.warn('documents migration note:', err);
  }

  // Email and OTP tables initialization
  try {
    const { initEmailAndOtpSchema } = require('../services/email-service');
    initEmailAndOtpSchema();
  } catch (err) {
    console.warn('initEmailAndOtpSchema init note:', err);
  }

  // Snapshots & Master Backup Table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_snapshots (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        user_id TEXT,
        reason TEXT DEFAULT 'FACTORY_RESET',
        snapshot_data TEXT NOT NULL,
        counts_json TEXT NOT NULL,
        is_restored INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        restored_at DATETIME,
        FOREIGN KEY(company_id) REFERENCES companies(id)
      );
      CREATE INDEX IF NOT EXISTS idx_snapshot_company ON company_snapshots(company_id, created_at DESC);
    `);
  } catch (err) {
    console.warn('company_snapshots migration note:', err);
  }
}

export function backupDatabase(): string | null {
  try {
    const backupDir = path.join(storageDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(backupDir, `erp_backup_${timestamp}.sqlite`);
    db.backup(backupFile);
    console.log(`💾 Güvenli Otomatik Veritabanı Yedeği Alındı: ${backupFile}`);
    return backupFile;
  } catch (err) {
    console.warn('Veritabanı yedekleme uyarısı:', err);
    return null;
  }
}
