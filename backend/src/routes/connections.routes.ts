import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { getConnectionMetrics } from '../services/calculationService';
import { syncNewConnectionTargets, getTargetContributionForConnection } from '../services/targetSync.service';

const router = Router();

// Helper to attach assigned staff members to a list of connections
async function attachStaffToConnections(connections: any[]): Promise<any[]> {
  if (!connections || connections.length === 0) return connections;

  const connIds = connections.map(c => c.id);
  const placeholders = connIds.map((_, i) => `$${i + 1}`).join(',');
  const staffRes = await db.query(
    `SELECT cs.connection_id, u.id, u.full_name, u.employee_id, u.phone, u.role, d.name as designation_name
     FROM connection_staff cs
     JOIN users u ON cs.staff_id = u.id
     LEFT JOIN designations d ON u.designation_id = d.id
     WHERE cs.connection_id IN (${placeholders})
     ORDER BY cs.id ASC`,
    connIds
  );

  const staffByConn = new Map<number, any[]>();
  for (const s of staffRes.rows) {
    const list = staffByConn.get(s.connection_id) || [];
    list.push({
      id: s.id,
      full_name: s.full_name,
      employee_id: s.employee_id,
      phone: s.phone,
      role: s.role,
      designation_name: s.designation_name,
    });
    staffByConn.set(s.connection_id, list);
  }

  for (const c of connections) {
    let assigned = staffByConn.get(c.id) || [];
    if (assigned.length === 0 && c.assigned_staff_id && c.assigned_staff_name) {
      assigned = [
        {
          id: c.assigned_staff_id,
          full_name: c.assigned_staff_name,
          phone: c.assigned_staff_phone || null,
          employee_id: null,
          role: null,
          designation_name: null,
        },
      ];
    }
    c.assigned_staff = assigned;
    if (assigned.length > 0 && !c.assigned_staff_name) {
      c.assigned_staff_name = assigned[0].full_name;
      c.assigned_staff_id = assigned[0].id;
      c.assigned_staff_phone = assigned[0].phone;
    }
  }

  return connections;
}

// Helper to extract and normalize staff IDs from request body
function parseStaffIds(body: any): number[] {
  let ids: number[] = [];
  if (Array.isArray(body.assignedStaffIds)) {
    ids = body.assignedStaffIds.map(Number);
  } else if (body.assignedStaffIds !== undefined && body.assignedStaffIds !== null && body.assignedStaffIds !== '') {
    ids = [Number(body.assignedStaffIds)];
  } else if (Array.isArray(body.assignedStaff)) {
    ids = body.assignedStaff.map((s: any) => (typeof s === 'object' ? Number(s.id) : Number(s)));
  } else if (body.assignedStaffId !== undefined && body.assignedStaffId !== null && body.assignedStaffId !== '') {
    ids = [Number(body.assignedStaffId)];
  } else if (body.assigned_staff_id !== undefined && body.assigned_staff_id !== null && body.assigned_staff_id !== '') {
    ids = [Number(body.assigned_staff_id)];
  }
  return Array.from(new Set(ids.filter(id => !isNaN(id) && id > 0)));
}

// GET /api/connections
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { branchId, assignedStaffId, staffId, myConnections, status, connectionType, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    // Tenancy
    if (req.user?.role === 'STAFF') {
      params.push(req.user.id);
      whereClauses.push(
        `(c.assigned_staff_id = $${params.length} OR EXISTS (SELECT 1 FROM connection_staff cs WHERE cs.connection_id = c.id AND cs.staff_id = $${params.length}))`
      );
    } else if (req.user?.role === 'BRANCH_MANAGER') {
      if (req.user.branchId) {
        params.push(req.user.branchId);
        whereClauses.push(`c.branch_id = $${params.length}`);
      }
    } else if (branchId) {
      params.push(branchId);
      whereClauses.push(`c.branch_id = $${params.length}`);
    }

    const targetStaffFilter = staffId || assignedStaffId || (myConnections === 'true' ? req.user?.id : null);
    if (targetStaffFilter) {
      params.push(Number(targetStaffFilter));
      whereClauses.push(
        `(c.assigned_staff_id = $${params.length} OR EXISTS (SELECT 1 FROM connection_staff cs WHERE cs.connection_id = c.id AND cs.staff_id = $${params.length}))`
      );
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
      whereClauses.push(
        `(c.customer_name ILIKE $${params.length} OR c.connection_id ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.address ILIKE $${params.length})`
      );
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
    const connsWithStaff = await attachStaffToConnections(result.rows);

    return res.json({
      success: true,
      connections: connsWithStaff,
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

    // Fetch assigned staff members from connection_staff junction table
    const staffRes = await db.query(
      `SELECT u.id, u.full_name, u.employee_id, u.phone, u.role, d.name as designation_name
       FROM connection_staff cs
       JOIN users u ON cs.staff_id = u.id
       LEFT JOIN designations d ON u.designation_id = d.id
       WHERE cs.connection_id = $1
       ORDER BY cs.id ASC`,
      [connectionId]
    );

    let assignedStaff = staffRes.rows;
    if (assignedStaff.length === 0 && conn.assigned_staff_id && conn.assigned_staff_name) {
      assignedStaff = [
        {
          id: conn.assigned_staff_id,
          full_name: conn.assigned_staff_name,
          phone: conn.assigned_staff_phone || null,
          employee_id: null,
          role: null,
          designation_name: null,
        },
      ];
    }
    conn.assigned_staff = assignedStaff;

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, conn.branch_id)) {
      return res.status(403).json({ success: false, message: 'Access denied: record outside your branch.' });
    }

    if (req.user?.role === 'STAFF') {
      const isAssigned =
        conn.assigned_staff_id === req.user.id ||
        assignedStaff.some((s: any) => s.id === req.user!.id);
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Access denied: not assigned to this connection.' });
      }
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
    connectionType = 'Fiber Internet',
    packagePlan,
    requestDate,
    completionDate,
    status = 'New Request',
    remarks,
  } = req.body;

  const staffIds = parseStaffIds(req.body);

  if (!customerName || !phone || !address || !branchId || !packagePlan || !requestDate) {
    return res.status(400).json({ success: false, message: 'Customer name, phone, address, branch, package, and request date are required.' });
  }

  let finalBranchId = branchId;
  if (req.user?.role === 'BRANCH_MANAGER') {
    finalBranchId = req.user.branchId;
  }

  // Branch tenancy check for assigned staff
  if (staffIds.length > 0 && req.user?.role === 'BRANCH_MANAGER') {
    const validStaffRes = await db.query(
      `SELECT id FROM users WHERE id = ANY($1) AND branch_id = $2`,
      [staffIds, finalBranchId]
    );
    const validIds = new Set(validStaffRes.rows.map(r => r.id));
    const invalid = staffIds.filter(id => !validIds.has(id));
    if (invalid.length > 0) {
      return res.status(403).json({ success: false, message: 'You can only assign staff from your branch.' });
    }
  }

  try {
    const code = `CONN-${Date.now().toString().slice(-6)}`;
    const finalCompDate = status === 'Completed' ? (completionDate || requestDate || new Date().toISOString().split('T')[0]) : (completionDate || null);
    const primaryStaffId = staffIds.length > 0 ? staffIds[0] : null;

    const result = await db.query(
      `INSERT INTO connections (connection_id, customer_name, customer_id, phone, email, address, branch_id, assigned_staff_id, connection_type, package_plan, request_date, completion_date, status, remarks, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [code, customerName.trim(), customerId || null, phone.trim(), email || null, address.trim(), finalBranchId, primaryStaffId, connectionType, packagePlan, requestDate, finalCompDate, status, remarks || null]
    );

    const newConn = result.rows[0];

    // Insert all staff into connection_staff junction table
    for (const sId of staffIds) {
      await db.query(
        `INSERT INTO connection_staff (connection_id, staff_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (connection_id, staff_id) DO NOTHING`,
        [newConn.id, sId, req.user!.id]
      );
    }

    // Send notifications to all assigned staff (no duplicates)
    for (const sId of staffIds) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'CONNECTION', $4, CURRENT_TIMESTAMP)`,
        [sId, 'New Connection Assigned', `New connection request for ${customerName} (${phone}) assigned to you.`, `/connections`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_CONNECTION',
      module: 'CONNECTIONS',
      recordId: newConn.id,
      details: {
        connectionId: code,
        customerName,
        phone,
        branchId: finalBranchId,
        status,
        assignedStaffIds: staffIds,
      },
      req,
    });

    // Auto-sync branch targets if marked Completed (Counts distinct rows: 1 completed connection = 1 target achieved)
    if (status === 'Completed') {
      await syncNewConnectionTargets({
        branchIds: [finalBranchId],
        actorUserId: req.user!.id,
        req,
      });
    }

    const [fullConn] = await attachStaffToConnections([newConn]);
    return res.status(201).json({ success: true, connection: fullConn });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/connections/:id - Update connection details & status & assigned staff
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const connectionId = parseInt(req.params.id, 10);
  const {
    customerName,
    customerId,
    phone,
    email,
    address,
    branchId,
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

    const hasStaffUpdate =
      req.body.assignedStaffIds !== undefined ||
      req.body.assignedStaffId !== undefined ||
      req.body.assigned_staff_id !== undefined ||
      req.body.assignedStaff !== undefined;

    let newStaffIds = current.assigned_staff_id ? [current.assigned_staff_id] : [];
    if (hasStaffUpdate) {
      newStaffIds = parseStaffIds(req.body);
    }

    const primaryStaffId = newStaffIds.length > 0 ? newStaffIds[0] : null;

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
        hasStaffUpdate ? primaryStaffId : current.assigned_staff_id,
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

    // If staff was updated, synchronize connection_staff
    if (hasStaffUpdate) {
      const prevRes = await db.query('SELECT staff_id FROM connection_staff WHERE connection_id = $1', [connectionId]);
      const prevStaffIds: number[] = prevRes.rows.map(r => r.staff_id);
      if (prevStaffIds.length === 0 && current.assigned_staff_id) {
        prevStaffIds.push(current.assigned_staff_id);
      }

      const addedStaffIds = newStaffIds.filter(id => !prevStaffIds.includes(id));

      await db.query('DELETE FROM connection_staff WHERE connection_id = $1', [connectionId]);
      for (const sId of newStaffIds) {
        await db.query(
          `INSERT INTO connection_staff (connection_id, staff_id, assigned_by, assigned_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (connection_id, staff_id) DO NOTHING`,
          [connectionId, sId, req.user!.id]
        );
      }

      for (const sId of addedStaffIds) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, link, created_at)
           VALUES ($1, $2, $3, 'CONNECTION', $4, CURRENT_TIMESTAMP)`,
          [sId, 'Connection Assigned to You', `Connection for ${updatedConn.customer_name} assigned to you.`, `/connections`]
        );
      }
    }

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
        assignedStaffIds: hasStaffUpdate ? newStaffIds : undefined,
      },
      req,
    });

    // Auto-recalculate affected targets for old branch and new branch (1 completed connection = 1 target achieved)
    await syncNewConnectionTargets({
      branchIds: [current.branch_id, updatedConn.branch_id],
      actorUserId: req.user!.id,
      req,
    });

    const [fullConn] = await attachStaffToConnections([updatedConn]);
    return res.json({ success: true, connection: fullConn });
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
