import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// Helper: determine if user is central/management (sees all branches)
function isCentralUser(user: any): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleName = (user.roleName || '').toUpperCase().replace(/\s+/g, '_');
  const dept = (user.departmentCode || user.department_code || '').toUpperCase();
  if (
    role === 'SUPER_ADMIN' ||
    roleName === 'SUPER_ADMIN' ||
    user.username === 'superadmin' ||
    user.permissions?.['assets.view_all'] === true
  ) {
    return true;
  }
  return (
    ((role === 'MANAGEMENT' || roleName === 'MANAGEMENT' || dept === 'EXEC' || dept === 'OPERATION' || dept === 'OPS') &&
      (user.allowedBranches === 'ALL' || user.allowedBranches === '*'))
  );
}

// ============================================================
// GET /api/assets/summary — Overall summary stats
// ============================================================
router.get('/summary', authenticate, requirePermission('assets.view'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);

    let branchFilter = '';
    const params: any[] = [];

    if (!central && user.branchId) {
      params.push(user.branchId);
      branchFilter = `WHERE ba.branch_id = $${params.length}`;
    }

    const totalTypesRes = await db.query(`SELECT COUNT(DISTINCT ba.asset_type_id) as total_types FROM branch_assets ba ${branchFilter}`, params);
    const totalQtyRes = await db.query(`SELECT COALESCE(SUM(ba.quantity), 0) as total_quantity FROM branch_assets ba ${branchFilter}`, params);
    const branchCountRes = await db.query(`SELECT COUNT(DISTINCT ba.branch_id) as branches_with_assets FROM branch_assets ba ${branchFilter}`, params);

    let mostCommonRes: any;
    if (branchFilter) {
      mostCommonRes = await db.query(
        `SELECT at.name, SUM(ba.quantity) as total
         FROM branch_assets ba
         JOIN asset_types at ON ba.asset_type_id = at.id
         ${branchFilter}
         GROUP BY at.name ORDER BY total DESC LIMIT 1`,
        params
      );
    } else {
      mostCommonRes = await db.query(
        `SELECT at.name, SUM(ba.quantity) as total
         FROM branch_assets ba
         JOIN asset_types at ON ba.asset_type_id = at.id
         GROUP BY at.name ORDER BY total DESC LIMIT 1`
      );
    }

    return res.json({
      success: true,
      summary: {
        total_types: parseInt(totalTypesRes.rows[0]?.total_types || '0', 10),
        total_quantity: parseInt(totalQtyRes.rows[0]?.total_quantity || '0', 10),
        branches_with_assets: parseInt(branchCountRes.rows[0]?.branches_with_assets || '0', 10),
        most_common_asset: mostCommonRes.rows[0]?.name || '—',
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/assets/summary:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/assets/types — List all active asset types
// ============================================================
router.get('/types', authenticate, requirePermission('assets.view'), async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM asset_types WHERE is_active = TRUE ORDER BY name ASC`
    );
    return res.json({ success: true, types: result.rows });
  } catch (err: any) {
    console.error('Error in GET /api/assets/types:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// POST /api/assets/types — Create new asset type
// ============================================================
router.post('/types', authenticate, requirePermission('assets.types.manage'), async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Asset type name is required.' });
    }

    const chk = await db.query(`SELECT id FROM asset_types WHERE UPPER(name) = UPPER($1)`, [name.trim()]);
    if (chk.rowCount && chk.rowCount > 0) {
      return res.status(400).json({ success: false, message: `Asset type "${name.trim()}" already exists.` });
    }

    const ins = await db.query(
      `INSERT INTO asset_types (name, description, is_active, created_at, updated_at)
       VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name.trim(), description ? String(description).trim() : null]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_ASSET_TYPE',
      module: 'Assets',
      recordId: String(ins.rows[0].id),
      details: `Created asset type "${ins.rows[0].name}"`,
      req,
    });

    return res.status(201).json({ success: true, message: 'Asset type created.', type: ins.rows[0] });
  } catch (err: any) {
    console.error('Error in POST /api/assets/types:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// PUT /api/assets/types/:id — Update asset type
// ============================================================
router.put('/types/:id', authenticate, requirePermission('assets.types.manage'), async (req: Request, res: Response) => {
  try {
    const typeId = parseInt(req.params.id, 10);
    if (isNaN(typeId)) return res.status(400).json({ success: false, message: 'Invalid type ID.' });

    const existing = await db.query(`SELECT * FROM asset_types WHERE id = $1`, [typeId]);
    if (!existing.rowCount || existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Asset type not found.' });
    }

    const { name, description, is_active } = req.body;
    const cur = existing.rows[0];
    const targetName = name !== undefined ? String(name).trim() : cur.name;
    if (!targetName) return res.status(400).json({ success: false, message: 'Name cannot be empty.' });

    if (targetName.toUpperCase() !== cur.name.toUpperCase()) {
      const chk = await db.query(`SELECT id FROM asset_types WHERE UPPER(name) = UPPER($1) AND id != $2`, [targetName, typeId]);
      if (chk.rowCount && chk.rowCount > 0) {
        return res.status(400).json({ success: false, message: `Asset type "${targetName}" already exists.` });
      }
    }

    const upd = await db.query(
      `UPDATE asset_types SET name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [
        targetName,
        description !== undefined ? (description ? String(description).trim() : null) : cur.description,
        is_active !== undefined ? Boolean(is_active) : cur.is_active,
        typeId,
      ]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_ASSET_TYPE',
      module: 'Assets',
      recordId: String(typeId),
      details: `Updated asset type "${upd.rows[0].name}"`,
      req,
    });

    return res.json({ success: true, message: 'Asset type updated.', type: upd.rows[0] });
  } catch (err: any) {
    console.error('Error in PUT /api/assets/types/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// DELETE /api/assets/types/:id — Deactivate asset type
// ============================================================
router.delete('/types/:id', authenticate, requirePermission('assets.types.manage'), async (req: Request, res: Response) => {
  try {
    const typeId = parseInt(req.params.id, 10);
    if (isNaN(typeId)) return res.status(400).json({ success: false, message: 'Invalid type ID.' });

    const existing = await db.query(`SELECT * FROM asset_types WHERE id = $1`, [typeId]);
    if (!existing.rowCount || existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Asset type not found.' });
    }

    await db.query(`UPDATE asset_types SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [typeId]);

    await logActivity({
      userId: req.user!.id,
      action: 'DEACTIVATE_ASSET_TYPE',
      module: 'Assets',
      recordId: String(typeId),
      details: `Deactivated asset type "${existing.rows[0].name}"`,
      req,
    });

    return res.json({ success: true, message: `Asset type "${existing.rows[0].name}" deactivated.` });
  } catch (err: any) {
    console.error('Error in DELETE /api/assets/types/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/assets — List assets (filtered, RBAC-scoped)
// ============================================================
router.get('/', authenticate, requirePermission('assets.view'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const { branch_id, asset_type_id, search } = req.query;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // RBAC: branch users only see their branch
    if (!central) {
      if (!user.branchId) {
        return res.json({ success: true, assets: [] });
      }
      params.push(user.branchId);
      whereClauses.push(`ba.branch_id = $${params.length}`);
    } else if (branch_id && branch_id !== 'All' && branch_id !== '') {
      params.push(Number(branch_id));
      whereClauses.push(`ba.branch_id = $${params.length}`);
    }

    if (asset_type_id && asset_type_id !== 'All' && asset_type_id !== '') {
      params.push(Number(asset_type_id));
      whereClauses.push(`ba.asset_type_id = $${params.length}`);
    }

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      const idx = params.length;
      whereClauses.push(`(at.name ILIKE $${idx} OR b.name ILIKE $${idx} OR ba.remarks ILIKE $${idx})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT ba.*,
              b.name as branch_name, b.code as branch_code,
              at.name as asset_type_name,
              cb.full_name as created_by_name,
              ub.full_name as updated_by_name
       FROM branch_assets ba
       JOIN branches b ON ba.branch_id = b.id
       JOIN asset_types at ON ba.asset_type_id = at.id
       LEFT JOIN users cb ON ba.created_by_id = cb.id
       LEFT JOIN users ub ON ba.updated_by_id = ub.id
       ${whereSql}
       ORDER BY b.name ASC, at.name ASC`,
      params
    );

    return res.json({ success: true, assets: result.rows });
  } catch (err: any) {
    console.error('Error in GET /api/assets:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/assets/branch/:branchId — Assets for a specific branch
// ============================================================
router.get('/branch/:branchId', authenticate, requirePermission('assets.view'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const branchId = parseInt(req.params.branchId, 10);
    if (isNaN(branchId)) return res.status(400).json({ success: false, message: 'Invalid branch ID.' });

    if (!central) {
      if (!user.branchId || Number(user.branchId) !== branchId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only view assets for your own branch.' });
      }
    }

    const result = await db.query(
      `SELECT ba.*,
              b.name as branch_name, b.code as branch_code,
              at.name as asset_type_name,
              cb.full_name as created_by_name,
              ub.full_name as updated_by_name
       FROM branch_assets ba
       JOIN branches b ON ba.branch_id = b.id
       JOIN asset_types at ON ba.asset_type_id = at.id
       LEFT JOIN users cb ON ba.created_by_id = cb.id
       LEFT JOIN users ub ON ba.updated_by_id = ub.id
       WHERE ba.branch_id = $1
       ORDER BY at.name ASC`,
      [branchId]
    );

    const totalQty = result.rows.reduce((sum: number, r: any) => sum + (parseInt(r.quantity, 10) || 0), 0);

    return res.json({
      success: true,
      branch_id: branchId,
      total_quantity: totalQty,
      assets: result.rows,
    });
  } catch (err: any) {
    console.error('Error in GET /api/assets/branch/:branchId:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/assets/export/csv — CSV export
// ============================================================
router.get('/export/csv', authenticate, requirePermission('assets.view'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const { branch_id } = req.query;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (!central) {
      if (!user.branchId) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="assets.csv"');
        return res.send('Branch,Asset Type,Quantity,Remarks,Updated At\n');
      }
      params.push(user.branchId);
      whereClauses.push(`ba.branch_id = $${params.length}`);
    } else if (branch_id && branch_id !== 'All' && branch_id !== '') {
      params.push(Number(branch_id));
      whereClauses.push(`ba.branch_id = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT b.name as branch_name, at.name as asset_type_name, ba.quantity, ba.remarks, ba.updated_at
       FROM branch_assets ba
       JOIN branches b ON ba.branch_id = b.id
       JOIN asset_types at ON ba.asset_type_id = at.id
       ${whereSql}
       ORDER BY b.name ASC, at.name ASC`,
      params
    );

    const rows = result.rows;
    const header = 'Branch,Asset Type,Quantity,Remarks,Updated At';
    const lines = rows.map((r: any) => {
      const escape = (v: any) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
      return [escape(r.branch_name), escape(r.asset_type_name), r.quantity, escape(r.remarks), escape(r.updated_at)].join(',');
    });

    const csv = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="FWCPL_Assets_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err: any) {
    console.error('Error in GET /api/assets/export/csv:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// POST /api/assets — Create / upsert asset record
// ============================================================
router.post('/', authenticate, requirePermission('assets.create'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);

    let { branch_id, asset_type_id, quantity, remarks } = req.body;

    if (!asset_type_id) {
      return res.status(400).json({ success: false, message: 'Asset type is required.' });
    }

    const qty = parseInt(String(quantity), 10);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a non-negative integer.' });
    }

    // Enforce branch for non-central users
    if (!central) {
      if (!user.branchId) {
        return res.status(403).json({ success: false, message: 'Your account is not associated with a branch.' });
      }
      if (branch_id && Number(branch_id) !== user.branchId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only manage assets for your own branch.' });
      }
      branch_id = user.branchId;
    }

    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'Branch is required.' });
    }

    // Upsert: ON CONFLICT update quantity + remarks
    const ins = await db.query(
      `INSERT INTO branch_assets (branch_id, asset_type_id, quantity, remarks, created_at, updated_at, created_by_id, updated_by_id)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $5)
       ON CONFLICT (branch_id, asset_type_id)
       DO UPDATE SET quantity = EXCLUDED.quantity, remarks = EXCLUDED.remarks, updated_at = CURRENT_TIMESTAMP, updated_by_id = EXCLUDED.updated_by_id
       RETURNING *`,
      [Number(branch_id), Number(asset_type_id), qty, remarks ? String(remarks).trim() : null, user.id]
    );

    const newAsset = ins.rows[0];

    await logActivity({
      userId: user.id,
      action: 'CREATE_ASSET',
      module: 'Assets',
      recordId: String(newAsset.id),
      details: `Upserted asset record for branch_id=${branch_id}, asset_type_id=${asset_type_id}, quantity=${qty}`,
      req,
    });

    // Fetch enriched record
    const full = await db.query(
      `SELECT ba.*, b.name as branch_name, at.name as asset_type_name
       FROM branch_assets ba
       JOIN branches b ON ba.branch_id = b.id
       JOIN asset_types at ON ba.asset_type_id = at.id
       WHERE ba.id = $1`,
      [newAsset.id]
    );

    return res.status(201).json({ success: true, message: 'Asset record saved.', asset: full.rows[0] });
  } catch (err: any) {
    console.error('Error in POST /api/assets:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// PUT /api/assets/:id — Update asset record
// ============================================================
router.put('/:id', authenticate, requirePermission('assets.edit'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const assetId = parseInt(req.params.id, 10);
    if (isNaN(assetId)) return res.status(400).json({ success: false, message: 'Invalid asset ID.' });

    const existing = await db.query(`SELECT * FROM branch_assets WHERE id = $1`, [assetId]);
    if (!existing.rowCount || existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Asset record not found.' });
    }
    const cur = existing.rows[0];

    // Enforce branch access
    if (!central) {
      if (!user.branchId || Number(user.branchId) !== Number(cur.branch_id)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only manage assets for your own branch.' });
      }
    }

    const { quantity, remarks } = req.body;
    const qty = quantity !== undefined ? parseInt(String(quantity), 10) : cur.quantity;
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a non-negative integer.' });
    }
    const targetRemarks = remarks !== undefined ? (remarks ? String(remarks).trim() : null) : cur.remarks;

    const upd = await db.query(
      `UPDATE branch_assets SET quantity = $1, remarks = $2, updated_at = CURRENT_TIMESTAMP, updated_by_id = $3
       WHERE id = $4 RETURNING *`,
      [qty, targetRemarks, user.id, assetId]
    );

    await logActivity({
      userId: user.id,
      action: 'UPDATE_ASSET',
      module: 'Assets',
      recordId: String(assetId),
      details: `Updated asset id=${assetId} quantity=${qty}`,
      req,
    });

    const full = await db.query(
      `SELECT ba.*, b.name as branch_name, at.name as asset_type_name
       FROM branch_assets ba
       JOIN branches b ON ba.branch_id = b.id
       JOIN asset_types at ON ba.asset_type_id = at.id
       WHERE ba.id = $1`,
      [assetId]
    );

    return res.json({ success: true, message: 'Asset updated.', asset: full.rows[0] });
  } catch (err: any) {
    console.error('Error in PUT /api/assets/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// DELETE /api/assets/:id — Delete asset record
// ============================================================
router.delete('/:id', authenticate, requirePermission('assets.delete'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const assetId = parseInt(req.params.id, 10);
    if (isNaN(assetId)) return res.status(400).json({ success: false, message: 'Invalid asset ID.' });

    const existing = await db.query(`SELECT * FROM branch_assets WHERE id = $1`, [assetId]);
    if (!existing.rowCount || existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Asset record not found.' });
    }
    const cur = existing.rows[0];

    if (!central) {
      if (!user.branchId || Number(user.branchId) !== Number(cur.branch_id)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only manage assets for your own branch.' });
      }
    }

    await db.query(`DELETE FROM branch_assets WHERE id = $1`, [assetId]);

    await logActivity({
      userId: user.id,
      action: 'DELETE_ASSET',
      module: 'Assets',
      recordId: String(assetId),
      details: `Deleted asset id=${assetId}, branch_id=${cur.branch_id}, asset_type_id=${cur.asset_type_id}`,
      req,
    });

    return res.json({ success: true, message: 'Asset record deleted.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/assets/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
