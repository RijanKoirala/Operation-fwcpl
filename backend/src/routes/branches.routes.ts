import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, requirePermission, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { calculateBranchPerformance, calculateStaffPerformance } from '../services/calculationService';

const router = Router();

// GET /api/branches
router.get('/', authenticate, requirePermission('branches.view'), async (req: Request, res: Response) => {
  const { search, status, city, province, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    // Branch tenancy scoping:
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.roleName === 'Super Admin';
    if (!isSuperAdmin && req.user?.allowedBranches !== 'ALL') {
      if (req.user?.assignedBranchIds && req.user.assignedBranchIds.length > 0) {
        params.push(req.user.assignedBranchIds);
        whereClauses.push(`b.id = ANY($${params.length})`);
      } else if (req.user?.branchId) {
        params.push(req.user.branchId);
        whereClauses.push(`b.id = $${params.length}`);
      }
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(b.name ILIKE $${params.length} OR b.code ILIKE $${params.length} OR b.city ILIKE $${params.length})`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`b.status = $${params.length}`);
    }

    if (city) {
      params.push(city);
      whereClauses.push(`b.city = $${params.length}`);
    }

    if (province) {
      params.push(province);
      whereClauses.push(`b.province = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM branches b ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataQuery = `
      SELECT b.*, u.full_name as manager_name, u.email as manager_email, u.phone as manager_phone,
             (SELECT COUNT(*) FROM users WHERE branch_id = b.id AND status = 'Active') as active_staff_count,
             (SELECT COUNT(*) FROM tasks WHERE branch_id = b.id AND status NOT IN ('Completed', 'Closed', 'Cancelled')) as open_tasks_count
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      ${whereSql}
      ORDER BY b.id ASC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(dataQuery, params);

    return res.json({
      success: true,
      branches: result.rows,
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

// GET /api/branches/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const branchId = parseInt(req.params.id, 10);

  if (!checkBranchAccess(req.user!, branchId)) {
    return res.status(403).json({ success: false, message: 'Access denied to this branch.' });
  }

  try {
    const result = await db.query(
      `SELECT b.*, u.full_name as manager_name, u.email as manager_email, u.phone as manager_phone
       FROM branches b
       LEFT JOIN users u ON b.manager_id = u.id
       WHERE b.id = $1`,
      [branchId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    return res.json({ success: true, branch: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/branches/:id/dashboard - Detailed Branch Dashboard
router.get('/:id/dashboard', authenticate, async (req: Request, res: Response) => {
  const branchId = parseInt(req.params.id, 10);

  if (!checkBranchAccess(req.user!, branchId)) {
    return res.status(403).json({ success: false, message: 'Access denied to this branch.' });
  }

  try {
    // 1. Branch details
    const branchRes = await db.query(
      `SELECT b.*, u.full_name as manager_name, u.email as manager_email, u.phone as manager_phone
       FROM branches b
       LEFT JOIN users u ON b.manager_id = u.id
       WHERE b.id = $1`,
      [branchId]
    );
    if (branchRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }
    const branch = branchRes.rows[0];

    // 2. Staff metrics & list
    const staffListRes = await db.query(
      `SELECT u.id, u.employee_id, u.username, u.full_name, u.email, u.phone, u.status, u.role,
              d.name as designation_name, dep.name as department_name
       FROM users u
       LEFT JOIN designations d ON u.designation_id = d.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       WHERE u.branch_id = $1
       ORDER BY u.id ASC`,
      [branchId]
    );
    const totalStaff = staffListRes.rowCount;
    const activeStaff = staffListRes.rows.filter(s => s.status === 'Active').length;

    // 3. Task metrics & list
    const tasksRes = await db.query(
      `SELECT t.*, u.full_name as assigned_to_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to_id = u.id
       WHERE t.branch_id = $1
       ORDER BY t.due_date ASC
       LIMIT 20`,
      [branchId]
    );
    const allBranchTasks = await db.query(
      'SELECT status, due_date FROM tasks WHERE branch_id = $1',
      [branchId]
    );

    let openTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    const now = new Date();

    for (const t of allBranchTasks.rows) {
      if (t.status === 'Completed' || t.status === 'Closed') {
        completedTasks++;
      } else if (t.status !== 'Cancelled') {
        openTasks++;
        if (t.due_date && new Date(t.due_date) < now) {
          overdueTasks++;
        }
      }
    }

    // 4. New connections count & list
    const connRes = await db.query('SELECT status FROM connections WHERE branch_id = $1', [branchId]);
    const activeConnections = connRes.rows.filter(c => c.status !== 'Completed' && c.status !== 'Cancelled').length;

    const connListRes = await db.query(
      `SELECT c.*, u.full_name as assigned_to_name
       FROM connections c
       LEFT JOIN users u ON c.assigned_staff_id = u.id
       WHERE c.branch_id = $1
       ORDER BY c.created_at DESC
       LIMIT 25`,
      [branchId]
    );

    // 5. Today's New Connections for this branch
    const todayConnRes = await db.query(
      `SELECT COUNT(*) as count FROM connections WHERE branch_id = $1 AND (DATE(created_at) = CURRENT_DATE OR request_date = CURRENT_DATE)`,
      [branchId]
    );
    const todayNewConnections = parseInt(todayConnRes.rows[0]?.count || '0', 10);

    // 6. Pending Follow-ups
    const followRes = await db.query(
      `SELECT COUNT(*) as count FROM follow_ups WHERE branch_id = $1 AND status IN ('Pending', 'Waiting')`,
      [branchId]
    );
    const pendingFollowUps = parseInt(followRes.rows[0].count, 10);

    // 7. Branch Targets
    const targetsRes = await db.query(
      `SELECT * FROM targets WHERE branch_id = $1 ORDER BY end_date ASC`,
      [branchId]
    );
    let avgTargetAchievement = 0;
    if (targetsRes.rowCount > 0) {
      const sum = targetsRes.rows.reduce((acc, row) => acc + Number(row.achievement_percentage || 0), 0);
      avgTargetAchievement = Math.round(sum / targetsRes.rowCount);
    }

    // 8. Performance score calculation
    const allBranchPerf = await calculateBranchPerformance();
    const branchPerf = allBranchPerf.find(b => b.branchId === branchId) || {
      overallScore: 80,
      taskCompletionRate: 75,
      onTimeRate: 85,
      targetAchievementRate: avgTargetAchievement,
    };

    // 9. Staff rankings within branch
    const branchStaffPerf = await calculateStaffPerformance(branchId);

    // 8. Goods Requisitions Metrics for this branch
    let branchGoodsMetrics = {
      myPending: 0,
      accepted: 0,
      partiallyAccepted: 0,
      denied: 0,
      completed: 0,
    };
    try {
      const bGoodsRes = await db.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
          COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted,
          COUNT(*) FILTER (WHERE status = 'PARTIALLY ACCEPTED') as partially_accepted,
          COUNT(*) FILTER (WHERE status = 'DENIED') as denied,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed
         FROM goods_requests
         WHERE branch_id = $1`,
        [branchId]
      );
      const row = bGoodsRes.rows[0] || {};
      branchGoodsMetrics = {
        myPending: parseInt(row.pending || '0', 10),
        accepted: parseInt(row.accepted || '0', 10),
        partiallyAccepted: parseInt(row.partially_accepted || '0', 10),
        denied: parseInt(row.denied || '0', 10),
        completed: parseInt(row.completed || '0', 10),
      };
    } catch {}

    return res.json({
      success: true,
      branch,
      summary: {
        totalStaff,
        activeStaff,
        openTasks,
        completedTasks,
        overdueTasks,
        todayNewConnections,
        activeConnections,
        pendingFollowUps,
        targetAchievement: avgTargetAchievement,
        overallPerformanceScore: branchPerf.overallScore,
      },
      goodsRequests: branchGoodsMetrics,
      staff: staffListRes.rows,
      tasks: tasksRes.rows,
      connections: connListRes.rows,
      targets: targetsRes.rows,
      performance: branchPerf,
      staffRankings: branchStaffPerf,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/branches
router.post('/', authenticate, requirePermission('branches.create'), async (req: Request, res: Response) => {
  const { code, name, address, city, province, contactNumber, email, managerId, openingDate, description } = req.body;

  if (!code || !name || !address || !city || !province || !contactNumber || !email || !openingDate) {
    return res.status(400).json({ success: false, message: 'All required branch fields must be provided.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO branches (code, name, address, city, province, contact_number, email, manager_id, opening_date, status, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active', $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [code.trim(), name.trim(), address.trim(), city.trim(), province.trim(), contactNumber.trim(), email.trim(), managerId || null, openingDate, description || null]
    );

    const newBranch = result.rows[0];

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_BRANCH',
      module: 'BRANCHES',
      recordId: newBranch.id,
      details: { code, name, city },
      req,
    });

    return res.status(201).json({ success: true, branch: newBranch });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/branches/:id
router.put('/:id', authenticate, requirePermission('branches.edit'), async (req: Request, res: Response) => {
  const branchId = parseInt(req.params.id, 10);
  const { code, name, address, city, province, contactNumber, email, managerId, openingDate, status, description } = req.body;

  try {
    const result = await db.query(
      `UPDATE branches
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           address = COALESCE($3, address),
           city = COALESCE($4, city),
           province = COALESCE($5, province),
           contact_number = COALESCE($6, contact_number),
           email = COALESCE($7, email),
           manager_id = $8,
           opening_date = COALESCE($9, opening_date),
           status = COALESCE($10, status),
           description = COALESCE($11, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [code, name, address, city, province, contactNumber, email, managerId || null, openingDate, status, description, branchId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_BRANCH',
      module: 'BRANCHES',
      recordId: branchId,
      details: req.body,
      req,
    });

    return res.json({ success: true, branch: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/branches/:id
router.delete('/:id', authenticate, requirePermission('branches.delete'), async (req: Request, res: Response) => {
  const branchId = parseInt(req.params.id, 10);

  try {
    // Soft delete / set status to Inactive
    const result = await db.query(
      `UPDATE branches SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [branchId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    await logActivity({
      userId: req.user!.id,
      action: 'DEACTIVATE_BRANCH',
      module: 'BRANCHES',
      recordId: branchId,
      req,
    });

    return res.json({ success: true, message: 'Branch deactivated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
