import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { authMiddleware, auditLog } from '../../middleware/auth';

export const productRouter = Router();

productRouter.use(authMiddleware);

// 1. Ürün & Hizmet Listesi
productRouter.get('/', (req, res) => {
  const companyId = req.user!.companyId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;
  const categoryId = req.query.categoryId as string;
  const criticalOnly = req.query.critical === 'true';

  let query = `
    SELECT p.*, c.name as category_name, c.color as category_color
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.company_id = ? AND p.is_deleted = 0
  `;
  const params: any[] = [companyId];

  if (search) {
    query += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ?)';
    params.push(search, search, search);
  }

  if (categoryId) {
    query += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (criticalOnly) {
    query += ' AND p.is_service = 0 AND p.current_stock <= p.min_stock';
  }

  const countQuery = query.replace(/SELECT p\.\*, c\.name.*FROM/s, 'SELECT COUNT(*) as total FROM');
  const totalRow = db.prepare(countQuery).get(...params) as { total: number };

  query += ' ORDER BY p.name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);

  res.json({
    success: true,
    data: rows,
    meta: {
      page,
      limit,
      total: totalRow.total,
      totalPages: Math.ceil(totalRow.total / limit),
    },
  });
});

// 2. Kategoriler
productRouter.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE company_id = ? ORDER BY name ASC').all(req.user!.companyId);
  res.json({ success: true, data: categories });
});

productRouter.post('/categories', (req, res) => {
  const { name, type, color } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Kategori adı zorunludur.' });

  const id = uuidv4();
  db.prepare('INSERT INTO categories (id, company_id, type, name, color) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.user!.companyId, type || 'PRODUCT', name, color || '#3B82F6');

  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 3. Ürün Ekleme
productRouter.post('/', (req, res) => {
  const name = req.body.name;
  const categoryId = req.body.category_id ?? req.body.categoryId ?? null;
  const barcode = req.body.barcode ?? null;
  const unit = req.body.unit || 'Adet';
  const buyPrice = Number(req.body.buy_price ?? req.body.buyPrice ?? 0);
  const sellPrice = Number(req.body.sell_price ?? req.body.sellPrice ?? 0);
  const vatRate = req.body.vat_rate !== undefined ? Number(req.body.vat_rate) : (req.body.vatRate !== undefined ? Number(req.body.vatRate) : 20);
  const minStock = Number(req.body.min_stock ?? req.body.minStock ?? 5);
  const currentStock = Number(req.body.current_stock ?? req.body.currentStock ?? 0);
  const isService = (req.body.is_service || req.body.isService) ? 1 : 0;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Ürün adı zorunludur.' });
  }

  const companyId = req.user!.companyId;
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE company_id = ?').get(companyId) as { cnt: number };
  const code = req.body.code || `PRD-${String(countRow.cnt + 1).padStart(4, '0')}`;
  const id = uuidv4();

  db.prepare(`
    INSERT INTO products (id, company_id, code, barcode, name, category_id, unit, buy_price, sell_price, vat_rate, min_stock, current_stock, is_service)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    companyId,
    code,
    barcode,
    name,
    categoryId,
    unit,
    buyPrice,
    sellPrice,
    vatRate,
    minStock,
    currentStock,
    isService
  );

  auditLog(companyId, req.user!.userId, 'CREATE', 'PRODUCT', id, { name, code });
  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ success: true, data: created });
});

// 4. Ürün Güncelleme
productRouter.put('/:id', (req, res) => {
  const name = req.body.name;
  const categoryId = req.body.category_id ?? req.body.categoryId;
  const barcode = req.body.barcode;
  const unit = req.body.unit;
  const buyPrice = req.body.buy_price !== undefined ? Number(req.body.buy_price) : (req.body.buyPrice !== undefined ? Number(req.body.buyPrice) : undefined);
  const sellPrice = req.body.sell_price !== undefined ? Number(req.body.sell_price) : (req.body.sellPrice !== undefined ? Number(req.body.sellPrice) : undefined);
  const vatRate = req.body.vat_rate !== undefined ? Number(req.body.vat_rate) : (req.body.vatRate !== undefined ? Number(req.body.vatRate) : undefined);
  const minStock = req.body.min_stock !== undefined ? Number(req.body.min_stock) : (req.body.minStock !== undefined ? Number(req.body.minStock) : undefined);
  const currentStock = req.body.current_stock !== undefined ? Number(req.body.current_stock) : (req.body.currentStock !== undefined ? Number(req.body.currentStock) : undefined);
  const isService = req.body.is_service !== undefined ? (req.body.is_service ? 1 : 0) : (req.body.isService !== undefined ? (req.body.isService ? 1 : 0) : undefined);

  db.prepare(`
    UPDATE products
    SET name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        barcode = COALESCE(?, barcode),
        unit = COALESCE(?, unit),
        buy_price = COALESCE(?, buy_price),
        sell_price = COALESCE(?, sell_price),
        vat_rate = COALESCE(?, vat_rate),
        min_stock = COALESCE(?, min_stock),
        current_stock = COALESCE(?, current_stock),
        is_service = COALESCE(?, is_service),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).run(name, categoryId, barcode, unit, buyPrice, sellPrice, vatRate, minStock, currentStock, isService, req.params.id, req.user!.companyId);

  auditLog(req.user!.companyId, req.user!.userId, 'UPDATE', 'PRODUCT', req.params.id, req.body);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// 5. Stok Hareketi ve Manuel Düzeltme (Stok Giriş / Çıkış)
productRouter.post('/:id/adjust-stock', (req, res) => {
  const companyId = req.user!.companyId;
  const { type, quantity, reason } = req.body; // type: 'IN' or 'OUT', quantity: number

  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    return res.status(400).json({ success: false, error: 'Geçerli bir miktar giriniz.' });
  }

  const delta = type === 'OUT' ? -qty : qty;

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ? AND is_deleted = 0')
    .get(req.params.id, companyId) as any;

  if (!product) {
    return res.status(404).json({ success: false, error: 'Ürün bulunamadı.' });
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(delta, product.id);

    db.prepare(`
      INSERT INTO stock_transactions (id, company_id, product_id, type, quantity, unit_price, date, reference_type, reference_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      companyId,
      product.id,
      type === 'OUT' ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN',
      qty,
      product.buy_price,
      new Date().toISOString().split('T')[0],
      'MANUAL',
      product.id,
      reason || (type === 'OUT' ? 'Manuel Stok Çıkışı' : 'Manuel Stok Girişi')
    );
  });

  tx();
  auditLog(companyId, req.user!.userId, 'STOCK_ADJUST', 'PRODUCT', product.id, { delta, reason });

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
  res.json({ success: true, message: 'Stok başarıyla güncellendi.', data: updated });
});

// 6. Ürün Silme (Soft-delete)
productRouter.delete('/:id', (req, res) => {
  db.prepare('UPDATE products SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
    .run(req.params.id, req.user!.companyId);

  auditLog(req.user!.companyId, req.user!.userId, 'SOFT_DELETE', 'PRODUCT', req.params.id, {});
  res.json({ success: true, message: 'Ürün silindi.' });
});
