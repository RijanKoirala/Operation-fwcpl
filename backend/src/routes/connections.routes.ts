import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { getConnectionMetrics } from '../services/calculationService';
import { syncNewConnectionTargets, getTargetContributionForConnection } from '../services/targetSync.service';

const router = Router();

// GET /api/connections
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { branchId, assignedStaffId, status, connectionType, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    // Tenancy
    if (req.user?.role === 'STAFF') {
      params.push(req.user.id);
      whereClauses.push(`c.assigned_staff_id = $${params.length}`);
    } else if (req.user?.role === 'BRANCH_MANAGER') {
      if (req.user.branchId) {
        params.push(req.user.branchId);
        whereClauses.push(`c.branch_id = $${params.length}`);
      }
    } else if (branchId) {
      params.push(branchId);
      whereClauses.push(`c.branch_id = $${params.length}`);
    }

    if (assignedStaffId) {
      params.push(assignedStaffId);
      whereClauses.push(`c.assigned_staff_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`c.status = $${params.length}`);
    }

    if (connectionType) {
      params.push(connectionType);
      whereClauses.push(`c.connection_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(c.customer_name ILIKE $${params.length} OR c.connection_id ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.address ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM connections c ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT c.*,
             b.name as branch_name, b.code as branch_code,
             u.full_name as assigned_staff_name, u.phone as assigned_staff_phone
      FROM connections c
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN users u ON c.assigned_staff_id = u.id
      ${whereSql}
      ORDER BY c.request_date DESC, c.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      connections: result.rows,
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

// GET /api/connections/metrics
router.get('/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const branchId = req.user?.role === 'BRANCH_MANAGER' ? req.user.branchId || undefined : undefined;
    const metrics = await getConnectionMetrics(branchId);
    return res.json({ success: true, metrics });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/connections/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const connectionId = parseInt(req.params.id, 10);

  try {
    const connRes = await db.query(
      `SELECT c.*,
              b.name as branch_name, b.code as branch_code,
              u.full_name as assigned_staff_name, u.phone as assigned_staff_phone
       FROM connections c
       LEFT JOIN branches b ON c.branch_id = b.id
       LEFT JOIN users u ON c.assigned_staff_id = u.id
       WHERE c.id = $1`,
      [connectionId]
    );

    if (connRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Connection record not found.' });
    }

    const conn = connRes.rows[0];

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, conn.branch_id)) {
      return res.status(403).json({ success: false, message: 'Access denied: record outside your branch.' });
    }

    const commentsRes = await db.query(
      `SELECT cc.*, u.full_name as author_name, u.role as author_role
       FROM connection_comments cc
       LEFT JOIN users u ON cc.user_id = u.id
       WHERE cc.connection_id = $1
       ORDER BY cc.created_at ASC`,
      [connectionId]
    );

    return res.json({
      success: true,
      connection: conn,
      comments: commentsRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/connections/:id/target-contribution
router.get('/:id/target-contribution', authenticate, async (req: Request, res: Response) => {
  const connectionId = parseInt(req.params.id, 10);
  try {
    const contribution = await getTargetContributionForConnection(connectionId);
    if (!contribution) {
      return res.status(404).json({ success: false, message: 'Connection record not found.' });
    }
    return res.json({ success: true, contribution });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/connections - Create new connection record
router.post('/', authenticate, async (req: Request, res: Response) => {
  const {
    customerName,
    customerId,
    phone,
    email,
    address,
    branchId,
    assignedStaffId,
    connectionType = 'Fiber Internet',
    packagePlan,
    requestDate,
    completionDate,
    status = 'New Request',
    remarks,
  } = req.body;

  if (!customerName || !phone || !address || !branchId || !packagePlan || !requestDate) {
    return res.status(400).json({ success: false, message: 'Customer name, phone, address, branch, package, and request date are required.' });
  }

  let finalBranchId = branchId;
  if (req.user?.role === 'BRANCH_MANAGER') {
    finalBranchId = req.user.branchId;
  }

  try {
    const code = `CONN-${Date.now().toString().slice(-6)}`;
    const finalCompDate = status === 'Completed' ? (completionDate || requestDate || new Date().toISOString().split('T')[0]) : (completionDate || null);

    const result = await db.query(
      `INSERT INTO connections (connection_id, customer_name, customer_id, phone, email, address, branch_id, assigned_staff_id, connection_type, package_plan, request_date, completion_date, status, remarks, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [code, customerName.trim(), customerId || null, phone.trim(), email || null, address.trim(), finalBranchId, assignedStaffId || null, connectionType, packagePlan, requestDate, finalCompDate, status, remarks || null]
    );

    const newConn = result.rows[0];

    if (assignedStaffId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'CONNECTION', $4, CURRENT_TIMESTAMP)`,
        [assignedStaffId, 'New Connection Assigned', `New connection request for ${customerName} (${phone}) assigned to you.`, `/connections`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_CONNECTION',
      module: 'CONNECTIONS',
      recordId: newConn.id,
      details: { connectionId: code, customerName, phone, branchId: finalBranchId, status },
      req,
    });

    // Auto-sync branch targets if marked Completed
    if (status === 'Completed') {
      await syncNewConnectionTargets({
        branchIds: [finalBranchId],
        actorUserId: req.user!.id,
        req,
      });
    }

    return res.status(201).json({ success: true, connection: newConn });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/connections/:id - Update connection details & status
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const connectionId = parseInt(req.params.id, 10);
  const {
    customerName,
    customerId,
    phone,
    email,
    address,
    branchId,
    assignedStaffId,
    connectionType,
    packagePlan,
    requestDate,
    siteSurveyDate,
    installationDate,
    activationDate,
    completionDate,
    status,
    remarks,
  } = req.body;

  try {
    const curRes = await db.query('SELECT * FROM connections WHERE id = $1', [connectionId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Connection record not found.' });
    }
    const current = curRes.rows[0];

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, current.branch_id)) {
      return res.status(403).json({ success: false, message: 'Cannot modify records outside your branch.' });
    }

    const newBranchId = branchId !== undefined && (req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'MANAGEMENT')
      ? Number(branchId)
      : (branchId !== undefined && req.user?.role === 'BRANCH_MANAGER' && req.user.branchId ? req.user.branchId : current.branch_id);

    const newStatus = status || current.status;
    let finalCompletionDate = current.completion_date;
    if (completionDate !== undefined) {
      finalCompletionDate = completionDate;
    } else if (newStatus === 'Completed') {
      finalCompletionDate = current.completion_date || activationDate || installationDate || new Date().toISOString().split('T')[0];
    }

    const result = await db.query(
      `UPDATE connections
       SET customer_name = COALESCE($1, customer_name),
           customer_id = COALESCE($2, customer_id),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           address = COALESCE($5, address),
           branch_id = $6,
           assigned_staff_id = $7,
           connection_type = COALESCE($8, connection_type),
           package_plan = COALESCE($9, package_plan),
           request_date = COALESCE($10, request_date),
           site_survey_date = COALESCE($11, site_survey_date),
           installation_date = COALESCE($12, installation_date),
           activation_date = COALESCE($13, activation_date),
           completion_date = $14,
           status = COALESCE($15, status),
           remarks = COALESCE($16, remarks),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $17
       RETURNING *`,
      [
        customerName,
        customerId,
        phone,
        email,
        address,
        newBranchId,
        assignedStaffId !== undefined ? assignedStaffId : current.assigned_staff_id,
        connectionType,
        packagePlan,
        requestDate,
        siteSurveyDate,
        installationDate,
        activationDate,
        finalCompletionDate,
        status,
        remarks,
        connectionId,
      ]
    );

    const updatedConn = result.rows[0];

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_CONNECTION',
      module: 'CONNECTIONS',
      recordId: connectionId,
      details: {
        previousStatus: current.status,
        newStatus: updatedConn.status,
        previousBranchId: current.branch_id,
        newBranchId: updatedConn.branch_id,
        previousCompletionDate: current.completion_date,
        newCompletionDate: updatedConn.completion_date,
      },
      req,
    });

    // Auto-recalculate affected targets for old branch and new branch
    await syncNewConnectionTargets({
      branchIds: [current.branch_id, updatedConn.branch_id],
      actorUserId: req.user!.id,
      req,
    });

    return res.json({ success: true, connection: updatedConn });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/connections/:id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const connectionId = parseInt(req.params.id, 10);
  try {
    const curRes = await db.query('SELECT * FROM connections WHERE id = $1', [connectionId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Connection record not found.' });
    }
    const current = curRes.rows[0];

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, current.branch_id)) {
      return res.status(403).json({ success: false, message: 'Cannot delete records outside your branch.' });
    }

    await db.query('DELETE FROM connections WHERE id = $1', [connectionId]);

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_CONNECTION',
      module: 'CONNECTIONS',
      recordId: connectionId,
      details: { connectionId: current.connection_id, customerName: current.customer_name, branchId: current.branch_id },
      req,
    });

    // Recalculate targets for branch
    await syncNewConnectionTargets({
      branchIds: [current.branch_id],
      actorUserId: req.user!.id,
      req,
    });

    return res.json({ success: true, message: 'Connection record deleted.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/connections/:id/comments
router.post('/:id/comments', authenticate, async (req: Request, res: Response) => {
  const connectionId = parseInt(req.params.id, 10);
  const { comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content is required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO connection_comments (connection_id, user_id, comment, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [connectionId, req.user!.id, comment.trim()]
    );

    return res.status(201).json({ success: true, comment: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
