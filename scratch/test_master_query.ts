import { db } from '../server/src/database/db';

const companies = db.prepare(`
  SELECT 
    c.*,
    u.full_name as owner_name,
    u.email as owner_email,
    u.tc_identity as owner_tc,
    u.phone as owner_phone,
    (SELECT COUNT(*) FROM invoices WHERE company_id = c.id AND is_deleted = 0) as active_invoices_count,
    (SELECT COUNT(*) FROM invoices WHERE company_id = c.id AND is_deleted = 1) as deleted_invoices_count,
    (SELECT COALESCE(SUM(grand_total), 0) FROM invoices WHERE company_id = c.id AND is_deleted = 0) as total_volume,
    (SELECT COUNT(*) FROM customers WHERE company_id = c.id AND is_deleted = 0) as active_customers_count,
    (SELECT COUNT(*) FROM customers WHERE company_id = c.id AND is_deleted = 1) as deleted_customers_count,
    (SELECT COUNT(*) FROM products WHERE company_id = c.id AND is_deleted = 0) as products_count,
    (SELECT COUNT(*) FROM company_snapshots WHERE company_id = c.id) as snapshots_count
  FROM companies c
  LEFT JOIN user_companies uc ON uc.company_id = c.id AND uc.role = 'COMPANY_OWNER'
  LEFT JOIN users u ON u.id = uc.user_id
  GROUP BY c.id
  ORDER BY c.created_at DESC
`).all();

console.log('COMPANIES COUNT:', companies.length);
companies.forEach((c: any) => {
  console.log(`- ${c.name} (ID: ${c.id}) | Owner: ${c.owner_name || 'Yok'} (${c.owner_email || 'Yok'}) | Cariler: ${c.active_customers_count} | Faturalar: ${c.active_invoices_count}`);
});
