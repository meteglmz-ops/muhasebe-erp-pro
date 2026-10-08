import { db } from '../server/src/database/db';

console.log('=== 1. COMPANIES TABLE ===');
const companies = db.prepare('SELECT id, name, legal_title, tax_number, email FROM companies').all();
console.log(JSON.stringify(companies, null, 2));

console.log('=== 2. USERS TABLE ===');
const users = db.prepare('SELECT id, email, full_name, role FROM users').all();
console.log(JSON.stringify(users, null, 2));

console.log('=== 3. USER_COMPANIES TABLE ===');
const userCompanies = db.prepare('SELECT * FROM user_companies').all();
console.log(JSON.stringify(userCompanies, null, 2));

console.log('=== 4. INVOICES TABLE ===');
const invoices = db.prepare('SELECT id, company_id, invoice_no, invoice_type, grand_total, is_deleted FROM invoices').all();
console.log(JSON.stringify(invoices, null, 2));

console.log('=== 5. CUSTOMERS TABLE ===');
const customers = db.prepare('SELECT id, company_id, title, code, balance, is_deleted FROM customers').all();
console.log('Total customers:', customers.length);
console.log(JSON.stringify(customers.slice(0, 5), null, 2));

console.log('=== 6. COMPANY_SNAPSHOTS TABLE ===');
const snapshots = db.prepare('SELECT id, company_id, reason, counts_json, is_restored, created_at FROM company_snapshots').all();
console.log(JSON.stringify(snapshots, null, 2));
