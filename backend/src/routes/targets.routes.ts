import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, requirePermission, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { isNewConnectionCategory, countCompletedConnections, getContributingConnectionsForTarget, syncNewConnectionTargets } from '../services/targetSync.service';

const router = Router();

// GET /api/targets
router.get('/', authenticate, requirePermission('targets.view'), async (req: Request, res: Response) => {
  const { branchId, employeeId, period, category, status, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.roleName === 'Super Admin';
    if (!isSuperAdmin && req.user?.allowedBranches !== 'ALL') {
      if (req.user?.assignedBranchIds && req.user.assignedBranchIds.length > 0) {
        params.push(req.user.assignedBranchIds);
        whereClauses.push(`t.branch_id = ANY($${params.length})`);
      } else if (req.user?.branchId) {
        params.push(req.user.branchId);
        whereClauses.push(`t.branch_id = $${params.length}`);
      }
    } else if (branchId) {
      params.push(branchId);
      whereClauses.push(`t.branch_id = $${params.length}`);
    }

    if (employeeId) {
      params.push(employeeId);
      whereClauses.push(`t.employee_id = $${params.length}`);
    }

    if (period) {
      params.push(period);
      whereClauses.push(`t.period = $${params.length}`);
    }

    if (category) {
      params.push(category);
      whereClauses.push(`t.category = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`t.status = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM targets t ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT t.*,
             b.name as branch_name, b.code as branch_code,
             u.full_name as employee_name, u.employee_id as employee_code,
             a.full_name as assigned_by_name
      FROM targets t
      LEFT JOIN branches b ON t.branch_id = b.id
      LEFT JOIN users u ON t.employee_id = u.id
      LEFT JOIN users a ON t.assigned_by_id = a.id
      ${whereSql}
      ORDER BY t.end_date DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      targets: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/targets/:id/connections - Drill down into contributing connections
router.get('/:id/connections', authenticate, requirePermission('targets.view'), async (req: Request, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  try {
    const result = await getContributingConnectionsForTarget(targetId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Target not found.' });
    }
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/targets
router.post('/', authenticate, requirePermission('targets.create'), async (req: Request, res: Response) => {
  const {
    targetName,
    category,
    description,
    branchId,
    employeeId,
    period = 'Monthly',
    targetValue,
    achievedValue = 0,
    startDate,
    endDate,
    remarks,
  } = req.body;

  if (!targetName || !category || !branchId || !startDate || !endDate || targetValue === undefined) {
    return res.status(400).json({ success: false, message: 'Target name, category, branch, target value, start date, and end date are required.' });
  }

  let finalBranchId = branchId;
  if (req.user?.role === 'BRANCH_MANAGER') {
    finalBranchId = req.user.branchId;
  }

  try {
    const code = `TGT-${Date.now().toString().slice(-6)}`;
    const tVal = Number(targetValue);
    
    // Auto-calculate initial achievement for New Connection targets
    let aVal = Number(achievedValue);
    if (isNewConnectionCategory(category)) {
      aVal = await countCompletedConnections(finalBranchId, startDate, endDate, employeeId || null);
    }

    const achievementPct = tVal > 0 ? Math.round((aVal / tVal) * 100 * 100) / 100 : 0;

    let status = 'In Progress';
    if (achievementPct >= 100) status = 'Achieved';
    else if (achievementPct > 0) status = 'Partially Achieved';
    else if (new Date(endDate) < new Date()) status = 'Missed';

    const result = await db.query(
      `INSERT INTO targets (target_id, target_name, category, description, branch_id, employee_id, period, target_value, achieved_value, achievement_percentage, start_date, end_date, assigned_by_id, status, remarks, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [code, targetName.trim(), category, description || null, finalBranchId, employeeId || null, period, tVal, aVal, achievementPct, startDate, endDate, req.user!.id, status, remarks || null]
    );

    const newTarget = result.rows[0];

    if (employeeId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'TARGET', $4, CURRENT_TIMESTAMP)`,
        [employeeId, 'New Target Assigned', `Target assigned: ${targetName} (${period})`, `/targets`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_TARGET',
      module: 'TARGETS',
      recordId: newTarget.id,
      details: { targetId: code, targetName, targetValue: tVal, achievedValue: aVal, branchId: finalBranchId },
      req,
    });

    return res.status(201).json({ success: true, target: newTarget });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/targets/:id/progress - Update progress only
router.put('/:id/progress', authenticate, requirePermission('targets.edit'), async (req: Request, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  const { achieved_value, achievedValue } = req.body;
  const rawAchieved = achieved_value !== undefined ? achieved_value : achievedValue;

  try {
    const curRes = await db.query('SELECT * FROM targets WHERE id = $1', [targetId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Target not found.' });
    }
    const current = curRes.rows[0];

    // Disallow manual override for New Connection targets
    if (isNewConnectionCategory(current.category)) {
      return res.status(400).json({
        success: false,
        message: 'Progress for New Connection targets is automatically calculated from completed New Connection records and cannot be manually modified.',
      });
    }

    const tVal = Number(current.target_value);
    const aVal = Number(rawAchieved ?? current.achieved_value);
    const achievementPct = tVal > 0 ? Math.round((aVal / tVal) * 100 * 100) / 100 : 0;

    let status = 'In Progress';
    if (achievementPct >= 100) status = 'Achieved';
    else if (achievementPct > 0) status = 'Partially Achieved';
    else if (new Date(current.end_date) < new Date()) status = 'Missed';

    const result = await db.query(
      `UPDATE targets
       SET achieved_value = $1,
           achievement_percentage = $2,
           status = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [aVal, achievementPct, status, targetId]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_TARGET_PROGRESS',
      module: 'TARGETS',
      recordId: targetId,
      details: { achievedValue: aVal, achievementPercentage: achievementPct, status },
      req,
    });

    return res.json({ success: true, target: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/targets/:id - Update target and achievement
router.put('/:id', authenticate, requirePermission('targets.edit'), async (req: Request, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  const {
    targetName,
    category,
    description,
    targetValue,
    achievedValue,
    startDate,
    endDate,
    remarks,
  } = req.body;

  try {
    const curRes = await db.query('SELECT * FROM targets WHERE id = $1', [targetId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Target not found.' });
    }
    const current = curRes.rows[0];

    // Staff can only update if assigned
    if (req.user?.role === 'STAFF' && current.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this target.' });
    }

    const finalCat = category || current.category;
    const sDate = startDate || current.start_date;
    const eDate = endDate || current.end_date;
    const tVal = targetValue !== undefined ? Number(targetValue) : Number(current.target_value);

    let aVal = achievedValue !== undefined ? Number(achievedValue) : Number(current.achieved_value);
    // If New Connection target, always recalculate from source records
    if (isNewConnectionCategory(finalCat)) {
      aVal = await countCompletedConnections(current.branch_id, sDate, eDate, current.employee_id);
    }

    const achievementPct = tVal > 0 ? Math.round((aVal / tVal) * 100 * 100) / 100 : 0;

    let status = 'In Progress';
    if (achievementPct >= 100) status = 'Achieved';
    else if (achievementPct > 0) status = 'Partially Achieved';
    else if (new Date(eDate) < new Date()) status = 'Missed';

    const result = await db.query(
      `UPDATE targets
       SET target_name = COALESCE($1, target_name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           target_value = $4,
           achieved_value = $5,
           achievement_percentage = $6,
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           status = $9,
           remarks = COALESCE($10, remarks),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [targetName, category, description, tVal, aVal, achievementPct, startDate, endDate, status, remarks, targetId]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_TARGET',
      module: 'TARGETS',
      recordId: targetId,
      details: { achievedValue: aVal, achievementPercentage: achievementPct, status },
      req,
    });

    return res.json({ success: true, target: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/targets/:id
router.delete('/:id', authenticate, requirePermission('targets.delete'), async (req: Request, res: Response) => {
  const targetId = parseInt(req.params.id, 10);

  try {
    const result = await db.query('DELETE FROM targets WHERE id = $1 RETURNING *', [targetId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Target not found.' });
    }

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_TARGET',
      module: 'TARGETS',
      recordId: targetId,
      req,
    });

    return res.json({ success: true, message: 'Target deleted.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

