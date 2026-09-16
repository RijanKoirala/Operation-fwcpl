import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();
router.use(authenticate);

// GET /api/goods-items - List goods items
router.get('/', requirePermission('goods_items.view', 'goods_requests.view', 'goods_requests.create'), async (req: Request, res: Response) => {
  const { search, category, activeOnly = 'false' } = req.query;

  try {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    if (category) {
      params.push(category);
      whereClauses.push(`category = $${params.length}`);
    }

    if (activeOnly === 'true') {
      whereClauses.push(`active = TRUE`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `
      SELECT * FROM goods_items
      ${whereSql}
      ORDER BY 
        CASE category
          WHEN 'Fiber' THEN 1
          WHEN 'Routers' THEN 2
          WHEN 'Drop Wire' THEN 3
          ELSE 4
        END,
        name ASC
    `;

    const result = await db.query(query, params);
    return res.json({ success: true, goodsItems: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/goods-items - Create new goods item
router.post('/', requirePermission('goods_items.create'), async (req: Request, res: Response) => {
  const { name, category, description, unit, quantityType = 'Integer' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Item name is required.' });
  }
  if (!unit || !unit.trim()) {
    return res.status(400).json({ success: false, message: 'Unit is required.' });
  }
  if (!['Integer', 'Decimal'].includes(quantityType)) {
    return res.status(400).json({ success: false, message: 'Quantity type must be Integer or Decimal.' });
  }

  try {
    const checkDup = await db.query(`SELECT id FROM goods_items WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    if (checkDup.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'A goods item with this name already exists.' });
    }

    const ins = await db.query(
      `INSERT INTO goods_items (name, category, description, unit, quantity_type, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name.trim(), category ? category.trim() : 'Other', description || null, unit.trim(), quantityType]
    );

    const newItem = ins.rows[0];

    await logActivity({
      userId: req.user!.id,
      action: 'GOODS_ITEM_CREATED',
      module: 'GOODS_ITEMS',
      recordId: newItem.id,
      details: { name: newItem.name, unit: newItem.unit, quantityType: newItem.quantity_type },
      req,
    });

    return res.status(201).json({ success: true, goodsItem: newItem });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/goods-items/:id - Update goods item
router.put('/:id', requirePermission('goods_items.edit'), async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.id, 10);
  const { name, category, description, unit, quantityType, active } = req.body;

  try {
    const existing = await db.query(`SELECT * FROM goods_items WHERE id = $1`, [itemId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Goods item not found.' });
    }

    if (name && name.trim().toLowerCase() !== existing.rows[0].name.toLowerCase()) {
      const checkDup = await db.query(`SELECT id FROM goods_items WHERE LOWER(name) = LOWER($1) AND id != $2`, [name.trim(), itemId]);
      if (checkDup.rowCount > 0) {
        return res.status(400).json({ success: false, message: 'A goods item with this name already exists.' });
      }
    }

    await db.query(
      `UPDATE goods_items
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           unit = COALESCE($4, unit),
           quantity_type = COALESCE($5, quantity_type),
           active = COALESCE($6, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        name ? name.trim() : null,
        category ? category.trim() : null,
        description !== undefined ? description : null,
        unit ? unit.trim() : null,
        quantityType || null,
        active !== undefined ? Boolean(active) : null,
        itemId,
      ]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'GOODS_ITEM_UPDATED',
      module: 'GOODS_ITEMS',
      recordId: itemId,
      details: { name, category, unit, quantityType },
      req,
    });

    return res.json({ success: true, message: 'Goods item updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/goods-items/:id/status - Toggle active/inactive
router.put('/:id/status', requirePermission('goods_items.disable'), async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.id, 10);
  const { active } = req.body;

  if (active === undefined) {
    return res.status(400).json({ success: false, message: 'Active boolean is required.' });
  }

  try {
    const existing = await db.query(`SELECT id, name FROM goods_items WHERE id = $1`, [itemId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Goods item not found.' });
    }

    await db.query(`UPDATE goods_items SET active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [Boolean(active), itemId]);

    await logActivity({
      userId: req.user!.id,
      action: 'GOODS_ITEM_STATUS_CHANGED',
      module: 'GOODS_ITEMS',
      recordId: itemId,
      details: { active: Boolean(active) },
      req,
    });

    return res.json({ success: true, message: `Goods item status updated to ${active ? 'Active' : 'Inactive'}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
