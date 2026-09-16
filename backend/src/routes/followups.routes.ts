import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// GET /api/follow-ups
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { branchId, assignedStaffId, type, status, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    if (req.user?.role === 'STAFF') {
      params.push(req.user.id);
      whereClauses.push(`f.assigned_staff_id = $${params.length}`);
    } else if (req.user?.role === 'BRANCH_MANAGER') {
      if (req.user.branchId) {
        params.push(req.user.branchId);
        whereClauses.push(`f.branch_id = $${params.length}`);
      }
    } else if (branchId) {
      params.push(branchId);
      whereClauses.push(`f.branch_id = $${params.length}`);
    }

    if (assignedStaffId) {
      params.push(assignedStaffId);
      whereClauses.push(`f.assigned_staff_id = $${params.length}`);
    }

    if (type) {
      params.push(type);
      whereClauses.push(`f.type = $${params.length}`);
    }

    if (status) {
      if (status === 'Overdue') {
        whereClauses.push(`f.follow_up_date < '${todayStr}' AND f.status IN ('Pending', 'Waiting')`);
      } else if (status === 'Today') {
        whereClauses.push(`f.follow_up_date = '${todayStr}'`);
      } else if (status === 'Upcoming') {
        whereClauses.push(`f.follow_up_date > '${todayStr}' AND f.status IN ('Pending', 'Waiting')`);
      } else {
        params.push(status);
        whereClauses.push(`f.status = $${params.length}`);
      }
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(f.related_customer_case ILIKE $${params.length} OR f.description ILIKE $${params.length} OR f.follow_up_id ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM follow_ups f ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT f.*,
             b.name as branch_name, b.code as branch_code,
             u.full_name as assigned_staff_name, u.phone as assigned_staff_phone,
             CASE
               WHEN f.status IN ('Pending', 'Waiting') AND f.follow_up_date < '${todayStr}' THEN true
               ELSE false
             END as is_overdue
      FROM follow_ups f
      LEFT JOIN branches b ON f.branch_id = b.id
      LEFT JOIN users u ON f.assigned_staff_id = u.id
      ${whereSql}
      ORDER BY f.follow_up_date ASC, f.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      followUps: result.rows,
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

// GET /api/follow-ups/summary
router.get('/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    let whereSql = '';
    const params: any[] = [];
    if (req.user?.role === 'BRANCH_MANAGER' && req.user.branchId) {
      params.push(req.user.branchId);
      whereSql = 'WHERE branch_id = $1';
    }

    const resAll = await db.query(`SELECT status, follow_up_date FROM follow_ups ${whereSql}`, params);
    const rows = resAll.rows;

    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (const r of rows) {
      const d = String(r.follow_up_date);
      if (d === todayStr && ['Pending', 'Waiting'].includes(r.status)) todayCount++;
      if (d < todayStr && ['Pending', 'Waiting'].includes(r.status)) overdueCount++;
      if (d > todayStr && ['Pending', 'Waiting'].includes(r.status)) upcomingCount++;
      if (r.status === 'Completed') completedCount++;
      if (r.status === 'Failed') failedCount++;
    }

    return res.json({
      success: true,
      summary: {
        today: todayCount,
        overdue: overdueCount,
        upcoming: upcomingCount,
        completed: completedCount,
        failed: failedCount,
        total: rows.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/follow-ups
router.post('/', authenticate, async (req: Request, res: Response) => {
  const {
    branchId,
    relatedCustomerCase,
    assignedStaffId,
    type,
    description,
    followUpDate,
    priority = 'Medium',
    notes,
  } = req.body;

  if (!branchId || !type || !description || !followUpDate) {
    return res.status(400).json({ success: false, message: 'Branch, type, description, and follow-up date are required.' });
  }

  let finalBranchId = branchId;
  if (req.user?.role === 'BRANCH_MANAGER') {
    finalBranchId = req.user.branchId;
  }

  try {
    const code = `FLW-${Date.now().toString().slice(-6)}`;

    const result = await db.query(
      `INSERT INTO follow_ups (follow_up_id, branch_id, related_customer_case, assigned_staff_id, type, description, follow_up_date, priority, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [code, finalBranchId, relatedCustomerCase || null, assignedStaffId || null, type, description.trim(), followUpDate, priority, notes || null]
    );

    const newFollowUp = result.rows[0];

    if (assignedStaffId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'FOLLOW_UP', $4, CURRENT_TIMESTAMP)`,
        [assignedStaffId, 'New Follow-up Scheduled', `Follow-up on ${relatedCustomerCase || type} assigned for ${followUpDate}.`, `/follow-ups`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_FOLLOW_UP',
      module: 'FOLLOW_UPS',
      recordId: newFollowUp.id,
      details: { followUpId: code, type, date: followUpDate },
      req,
    });

    return res.status(201).json({ success: true, followUp: newFollowUp });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/follow-ups/:id
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const followUpId = parseInt(req.params.id, 10);
  const {
    assignedStaffId,
    followUpDate,
    priority,
    status,
    result,
    nextFollowUpDate,
    notes,
  } = req.body;

  try {
    const curRes = await db.query('SELECT * FROM follow_ups WHERE id = $1', [followUpId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Follow-up not found.' });
    }
    const current = curRes.rows[0];

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, current.branch_id)) {
      return res.status(403).json({ success: false, message: 'Cannot modify follow-ups outside your branch.' });
    }

    const updateRes = await db.query(
      `UPDATE follow_ups
       SET assigned_staff_id = $1,
           follow_up_date = COALESCE($2, follow_up_date),
           priority = COALESCE($3, priority),
           status = COALESCE($4, status),
           result = COALESCE($5, result),
           next_follow_up_date = $6,
           notes = COALESCE($7, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [assignedStaffId !== undefined ? assignedStaffId : current.assigned_staff_id, followUpDate, priority, status, result, nextFollowUpDate || null, notes, followUpId]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_FOLLOW_UP',
      module: 'FOLLOW_UPS',
      recordId: followUpId,
      details: { fromStatus: current.status, toStatus: status || current.status, result },
      req,
    });

    return res.json({ success: true, followUp: updateRes.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
