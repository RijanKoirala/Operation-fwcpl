import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { upload } from '../middleware/upload';

const router = Router();

export const OPERATION_CATEGORIES = [
  'HR / ADMIN',
  'Technical / Network Issue',
  'Revenue',
  'Sales',
  'Billing',
  'Customer Complain',
  'Hardware and Equipment',
  'Maintenance',
  'Others',
] as const;

export const OPERATION_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export const OPERATION_STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;

// Helper: determine if user is central/management (sees all branches and can process/close tickets)
function isCentralUser(user: any): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleName = (user.roleName || user.role_name || '').toUpperCase().replace(/\s+/g, '_');
  const dept = (user.departmentCode || user.department_code || '').toUpperCase();
  if (
    role === 'SUPER_ADMIN' ||
    roleName === 'SUPER_ADMIN' ||
    user.username === 'superadmin' ||
    user.permissions?.['operation_center.view_all'] === true
  ) {
    return true;
  }
  return (
    (role === 'MANAGEMENT' || roleName === 'MANAGEMENT' || dept === 'EXEC' || dept === 'OPERATION' || dept === 'OPS' || dept === 'NOC') &&
    (user.allowedBranches === 'ALL' || user.allowedBranches === '*' || !user.branchId)
  );
}

// Helper: send in-app notification to users
async function sendNotification(userIds: number[], title: string, message: string, link: string) {
  if (!userIds || userIds.length === 0) return;
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  for (const uid of uniqueIds) {
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at)
         VALUES ($1, $2, $3, 'INFO', $4, FALSE, CURRENT_TIMESTAMP)`,
        [uid, title, message, link]
      );
    } catch (e: any) {
      console.warn('Notification insert error:', e.message);
    }
  }
}

// Helper: get central operation staff user IDs for alerts
async function getOperationStaffIds(): Promise<number[]> {
  try {
    const res = await db.query(
      `SELECT u.id FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.role IN ('SUPER_ADMIN', 'MANAGEMENT')
          OR UPPER(d.code) IN ('OPERATION', 'OPS', 'EXEC')
          OR u.permissions->>'operation_center.view_all' = 'true'`
    );
    return res.rows.map(r => r.id);
  } catch {
    return [];
  }
}

// Helper: generate next unique ticket ID OP-XXXXX
async function generateNextTicketId(): Promise<string> {
  try {
    const isPg = db.getIsPostgres();
    if (isPg) {
      const res = await db.query(`SELECT ('OP-' || LPAD(nextval('operation_ticket_seq')::text, 5, '0')) as next_id`);
      if (res.rows[0]?.next_id) {
        return res.rows[0].next_id;
      }
    }
  } catch (err: any) {
    console.warn('Failed to get from sequence, falling back to max ID:', err.message);
  }

  // Fallback
  const res = await db.query(`SELECT COALESCE(MAX(id), 0) + 1 as max_id FROM operation_tickets`);
  const num = parseInt(res.rows[0]?.max_id || '1', 10);
  return `OP-${String(num).padStart(5, '0')}`;
}

// ============================================================
// 1. GET /api/operation-tickets/stats - Dashboard summary counts
// ============================================================
router.get('/stats', authenticate, requirePermission('operation_center.view'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const { branchId, startDate, endDate, period } = req.query;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Branch scoping
    if (!central && user.branchId) {
      params.push(user.branchId);
      whereClauses.push(`t.branch_id = $${params.length}`);
    } else if (branchId && branchId !== 'all' && branchId !== 'ALL') {
      params.push(Number(branchId));
      whereClauses.push(`t.branch_id = $${params.length}`);
    }

    // Optional date filters
    if (startDate && endDate) {
      params.push(startDate);
      whereClauses.push(`DATE(t.created_at) >= $${params.length}`);
      params.push(endDate);
      whereClauses.push(`DATE(t.created_at) <= $${params.length}`);
    } else if (period && period !== 'all') {
      if (period === 'today') {
        whereClauses.push(`DATE(t.created_at) = CURRENT_DATE`);
      } else if (period === 'yesterday') {
        whereClauses.push(`DATE(t.created_at) = CURRENT_DATE - INTERVAL '1 day'`);
      } else if (period === 'this_week') {
        whereClauses.push(`DATE(t.created_at) >= date_trunc('week', CURRENT_DATE)::date AND DATE(t.created_at) <= (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date`);
      } else if (period === 'this_month') {
        whereClauses.push(`DATE(t.created_at) >= date_trunc('month', CURRENT_DATE)::date AND DATE(t.created_at) <= (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN UPPER(t.status) = 'OPEN' THEN 1 END) as open,
        COUNT(CASE WHEN UPPER(t.status) = 'IN_PROGRESS' THEN 1 END) as in_progress,
        COUNT(CASE WHEN UPPER(t.status) = 'CLOSED' THEN 1 END) as closed
      FROM operation_tickets t
      ${whereSql}
    `;

    const result = await db.query(query, params);
    const row = result.rows[0] || {};

    return res.json({
      success: true,
      stats: {
        total: parseInt(row.total || '0', 10),
        open: parseInt(row.open || '0', 10),
        inProgress: parseInt(row.in_progress || '0', 10),
        closed: parseInt(row.closed || '0', 10),
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/operation-tickets/stats:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 2. GET /api/operation-tickets - List tickets with filters & pagination
// ============================================================
router.get('/', authenticate, requirePermission('operation_center.view'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);

    const {
      branchId,
      status,
      priority,
      category,
      search,
      period,
      startDate,
      endDate,
      date,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Branch filter
    if (!central && user.branchId) {
      params.push(user.branchId);
      whereClauses.push(`t.branch_id = $${params.length}`);
    } else if (branchId && branchId !== 'all' && branchId !== 'ALL') {
      params.push(Number(branchId));
      whereClauses.push(`t.branch_id = $${params.length}`);
    }

    // Status filter
    if (status && status !== 'all' && status !== 'ALL') {
      const normalizedStatus = String(status).toUpperCase().replace(/\s+/g, '_');
      params.push(normalizedStatus);
      whereClauses.push(`UPPER(t.status) = $${params.length}`);
    }

    // Priority filter
    if (priority && priority !== 'all' && priority !== 'ALL') {
      params.push(priority);
      whereClauses.push(`t.priority = $${params.length}`);
    }

    // Category filter
    if (category && category !== 'all' && category !== 'ALL') {
      params.push(category);
      whereClauses.push(`t.category = $${params.length}`);
    }

    // Date filters on created_at
    if (date) {
      params.push(date);
      whereClauses.push(`DATE(t.created_at) = $${params.length}`);
    } else if (startDate && endDate) {
      params.push(startDate);
      whereClauses.push(`DATE(t.created_at) >= $${params.length}`);
      params.push(endDate);
      whereClauses.push(`DATE(t.created_at) <= $${params.length}`);
    } else if (startDate) {
      params.push(startDate);
      whereClauses.push(`DATE(t.created_at) >= $${params.length}`);
    } else if (endDate) {
      params.push(endDate);
      whereClauses.push(`DATE(t.created_at) <= $${params.length}`);
    } else if (period && period !== 'all') {
      if (period === 'today') {
        whereClauses.push(`DATE(t.created_at) = CURRENT_DATE`);
      } else if (period === 'yesterday') {
        whereClauses.push(`DATE(t.created_at) = CURRENT_DATE - INTERVAL '1 day'`);
      } else if (period === 'this_week') {
        whereClauses.push(`DATE(t.created_at) >= date_trunc('week', CURRENT_DATE)::date AND DATE(t.created_at) <= (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date`);
      } else if (period === 'this_month') {
        whereClauses.push(`DATE(t.created_at) >= date_trunc('month', CURRENT_DATE)::date AND DATE(t.created_at) <= (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date`);
      }
    }

    // Search query
    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      whereClauses.push(
        `(t.ticket_id ILIKE $${params.length} OR t.subject ILIKE $${params.length} OR t.description ILIKE $${params.length} OR b.name ILIKE $${params.length})`
      );
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as count
      FROM operation_tickets t
      LEFT JOIN branches b ON t.branch_id = b.id
      ${whereSql}
    `;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Fetch tickets with branch info, user info and attachment count
    const query = `
      SELECT
        t.*,
        b.name as branch_name,
        b.code as branch_code,
        u.full_name as created_by_name,
        u.username as created_by_username,
        c.full_name as closed_by_name,
        (SELECT COUNT(*) FROM operation_ticket_attachments ota WHERE ota.ticket_id = t.id) as attachments_count,
        (SELECT COUNT(*) FROM operation_ticket_updates otu WHERE otu.ticket_id = t.id) as updates_count
      FROM operation_tickets t
      LEFT JOIN branches b ON t.branch_id = b.id
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users c ON t.closed_by = c.id
      ${whereSql}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      tickets: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/operation-tickets:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 3. GET /api/operation-tickets/:id - Full details + attachments + updates
// ============================================================
router.get('/:id', authenticate, requirePermission('operation_center.view'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });
    }

    const tRes = await db.query(
      `SELECT
        t.*,
        b.name as branch_name,
        b.code as branch_code,
        u.full_name as created_by_name,
        u.username as created_by_username,
        u.phone as created_by_phone,
        c.full_name as closed_by_name
       FROM operation_tickets t
       LEFT JOIN branches b ON t.branch_id = b.id
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN users c ON t.closed_by = c.id
       WHERE t.id = $1`,
      [ticketId]
    );

    if (tRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const ticket = tRes.rows[0];

    // Branch security check
    const central = isCentralUser(user);
    if (!central && user.branchId && Number(ticket.branch_id) !== Number(user.branchId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot view tickets for another branch.' });
    }

    // Fetch attachments
    const aRes = await db.query(
      `SELECT ota.*, u.full_name as uploaded_by_name
       FROM operation_ticket_attachments ota
       LEFT JOIN users u ON ota.uploaded_by = u.id
       WHERE ota.ticket_id = $1
       ORDER BY ota.created_at ASC`,
      [ticketId]
    );

    // Fetch updates / activity timeline
    const uRes = await db.query(
      `SELECT otu.*, u.full_name as user_name, u.role as user_role
       FROM operation_ticket_updates otu
       LEFT JOIN users u ON otu.user_id = u.id
       WHERE otu.ticket_id = $1
       ORDER BY otu.created_at ASC`,
      [ticketId]
    );

    return res.json({
      success: true,
      ticket: {
        ...ticket,
        attachments: aRes.rows,
        updates: uRes.rows,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/operation-tickets/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 4. POST /api/operation-tickets - Create ticket (with optional image uploads)
// ============================================================
router.post(
  '/',
  authenticate,
  requirePermission('operation_center.create', 'operation_center.view'),
  upload.array('attachments', 5),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const central = isCentralUser(user);
      const { subject, description, category, priority = 'Medium', branchId } = req.body;

      if (!subject || !String(subject).trim()) {
        return res.status(400).json({ success: false, message: 'Subject / Title is required.' });
      }

      if (!description || !String(description).trim()) {
        return res.status(400).json({ success: false, message: 'Problem description is required.' });
      }

      if (!category || !OPERATION_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Category must be one of: ${OPERATION_CATEGORIES.join(', ')}`,
        });
      }

      // Branch assignment: strictly locked to user's branch for branch users
      let effectiveBranchId: number | null = null;
      if (!central && user.branchId) {
        effectiveBranchId = Number(user.branchId);
      } else if (branchId) {
        effectiveBranchId = Number(branchId);
      } else if (user.branchId) {
        effectiveBranchId = Number(user.branchId);
      }

      if (!effectiveBranchId) {
        return res.status(400).json({ success: false, message: 'Branch must be selected.' });
      }

      // Validate priority
      const cleanPriority = OPERATION_PRIORITIES.includes(priority) ? priority : 'Medium';

      // Generate Ticket ID
      const newTicketId = await generateNextTicketId();

      // Insert ticket
      const insertRes = await db.query(
        `INSERT INTO operation_tickets (
           ticket_id, branch_id, created_by, category, priority, subject, description, status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [newTicketId, effectiveBranchId, user.id, category, cleanPriority, String(subject).trim(), String(description).trim()]
      );

      const createdTicket = insertRes.rows[0];

      // Handle file attachments if any
      const files = req.files as Express.Multer.File[];
      const savedAttachments: any[] = [];
      if (files && Array.isArray(files) && files.length > 0) {
        for (const f of files) {
          const fileUrl = `/uploads/${f.filename}`;
          const attRes = await db.query(
            `INSERT INTO operation_ticket_attachments (ticket_id, file_url, file_name, mime_type, file_size, uploaded_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             RETURNING *`,
            [createdTicket.id, fileUrl, f.originalname, f.mimetype, f.size, user.id]
          );
          savedAttachments.push(attRes.rows[0]);
        }
      }

      // Log initial update timeline
      await db.query(
        `INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, new_status, created_at)
         VALUES ($1, $2, 'CREATED', $3, 'OPEN', CURRENT_TIMESTAMP)`,
        [createdTicket.id, user.id, `Ticket created by ${user.fullName || user.username}`]
      );

      // Audit log
      await logActivity({
        userId: user.id,
        action: 'CREATE_OPERATION_TICKET',
        module: 'Operation Center',
        recordId: createdTicket.id,
        details: { ticket_id: createdTicket.ticket_id, subject, category, priority: cleanPriority, branchId: effectiveBranchId },
        req,
      });

      // Get branch name for alert
      const bRes = await db.query('SELECT name FROM branches WHERE id = $1', [effectiveBranchId]);
      const branchName = bRes.rows[0]?.name || 'Branch';

      // Notify central Operation team
      const opUserIds = await getOperationStaffIds();
      await sendNotification(
        opUserIds,
        `New Operation Ticket ${createdTicket.ticket_id}`,
        `New ticket from ${branchName}: "${subject}" (${category})`,
        `/operation-center`
      );

      return res.status(201).json({
        success: true,
        message: 'Ticket created successfully.',
        ticket: {
          ...createdTicket,
          branch_name: branchName,
          attachments: savedAttachments,
        },
      });
    } catch (err: any) {
      console.error('Error in POST /api/operation-tickets:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================
// 5. PUT /api/operation-tickets/:id - Edit ticket content (Branch users while OPEN, Operation anytime)
// ============================================================
router.put(
  '/:id',
  authenticate,
  requirePermission('operation_center.edit', 'operation_center.view'),
  upload.array('attachments', 5),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const central = isCentralUser(user);
      const ticketId = parseInt(req.params.id, 10);

      const chk = await db.query('SELECT * FROM operation_tickets WHERE id = $1', [ticketId]);
      if (chk.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Ticket not found.' });
      }

      const current = chk.rows[0];

      // Branch security & status check
      if (!central) {
        if (user.branchId && Number(current.branch_id) !== Number(user.branchId)) {
          return res.status(403).json({ success: false, message: 'Access denied: You cannot edit tickets of another branch.' });
        }
        if (current.status !== 'OPEN') {
          return res.status(400).json({ success: false, message: 'Branch users can only edit tickets while they are in OPEN status.' });
        }
      }

      const { subject, description, category, priority } = req.body;

      const newSubject = subject !== undefined ? String(subject).trim() : current.subject;
      const newDescription = description !== undefined ? String(description).trim() : current.description;
      const newCategory = category !== undefined ? category : current.category;
      const newPriority = priority !== undefined ? priority : current.priority;

      if (!newSubject) return res.status(400).json({ success: false, message: 'Subject cannot be empty.' });
      if (!newDescription) return res.status(400).json({ success: false, message: 'Description cannot be empty.' });

      await db.query(
        `UPDATE operation_tickets
         SET subject = $1, description = $2, category = $3, priority = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [newSubject, newDescription, newCategory, newPriority, ticketId]
      );

      // Handle additional file attachments if any
      const files = req.files as Express.Multer.File[];
      if (files && Array.isArray(files) && files.length > 0) {
        for (const f of files) {
          const fileUrl = `/uploads/${f.filename}`;
          await db.query(
            `INSERT INTO operation_ticket_attachments (ticket_id, file_url, file_name, mime_type, file_size, uploaded_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [ticketId, fileUrl, f.originalname, f.mimetype, f.size, user.id]
          );
        }
      }

      // Log update in timeline
      await db.query(
        `INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, created_at)
         VALUES ($1, $2, 'EDIT', $3, CURRENT_TIMESTAMP)`,
        [ticketId, user.id, `Ticket details updated by ${user.fullName || user.username}`]
      );

      // Audit log
      await logActivity({
        userId: user.id,
        action: 'UPDATE_OPERATION_TICKET',
        module: 'Operation Center',
        recordId: ticketId,
        details: { ticket_id: current.ticket_id, subject: newSubject, category: newCategory, priority: newPriority },
        req,
      });

      return res.json({ success: true, message: 'Ticket updated successfully.' });
    } catch (err: any) {
      console.error('Error in PUT /api/operation-tickets/:id:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================
// 6. PATCH / PUT /api/operation-tickets/:id/status - Change status / Close ticket / Reopen
// ============================================================
const handleStatusUpdate = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const ticketId = parseInt(req.params.id, 10);

    const chk = await db.query(
      `SELECT t.*, b.name as branch_name FROM operation_tickets t LEFT JOIN branches b ON t.branch_id = b.id WHERE t.id = $1`,
      [ticketId]
    );

    if (chk.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const current = chk.rows[0];

    // Branch users cannot change status or close tickets unless explicitly authorized
    const canChangeStatus =
      central ||
      user.permissions?.['operation_center.update_status'] === true ||
      user.permissions?.['operation_center.close'] === true;

    if (!canChangeStatus) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Operation / Management can change ticket status or close tickets.' });
    }

    const { status, remark, resolution, actionTaken } = req.body;
    const targetStatus = String(status || '').toUpperCase().replace(/\s+/g, '_');

    if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(targetStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be OPEN, IN_PROGRESS, or CLOSED.' });
    }

    const oldStatus = current.status;
    const finalResolutionNote = resolution || actionTaken || remark || null;

    let updateSql = '';
    const params: any[] = [targetStatus, ticketId];

    if (targetStatus === 'CLOSED') {
      params.push(user.id);
      params.push(finalResolutionNote || current.resolution || 'Ticket marked as Closed by Operation.');
      updateSql = `
        UPDATE operation_tickets
        SET status = $1, closed_by = $3, closed_at = CURRENT_TIMESTAMP, resolution = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
    } else {
      // If reopening or changing to IN_PROGRESS
      params.push(finalResolutionNote || current.resolution);
      updateSql = `
        UPDATE operation_tickets
        SET status = $1, closed_by = NULL, closed_at = NULL, resolution = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
    }

    const updatedRes = await db.query(updateSql, params);
    const updatedTicket = updatedRes.rows[0];

    // Log update timeline
    let updateType = 'STATUS_CHANGE';
    let timelineMessage = `Status changed from ${oldStatus} to ${targetStatus}`;

    if (targetStatus === 'CLOSED') {
      updateType = 'CLOSED';
      timelineMessage = finalResolutionNote
        ? `Ticket closed: ${finalResolutionNote}`
        : 'Ticket closed by Operation team';
    } else if (oldStatus === 'CLOSED') {
      updateType = 'REOPENED';
      timelineMessage = `Ticket reopened to ${targetStatus}${finalResolutionNote ? ': ' + finalResolutionNote : ''}`;
    } else if (finalResolutionNote) {
      timelineMessage = `${timelineMessage} • Note: ${finalResolutionNote}`;
    }

    await db.query(
      `INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [ticketId, user.id, updateType, timelineMessage, oldStatus, targetStatus]
    );

    // Audit log
    await logActivity({
      userId: user.id,
      action: targetStatus === 'CLOSED' ? 'CLOSE_OPERATION_TICKET' : 'CHANGE_STATUS_OPERATION_TICKET',
      module: 'Operation Center',
      recordId: ticketId,
      details: {
        ticket_id: current.ticket_id,
        old_status: oldStatus,
        new_status: targetStatus,
        resolution: finalResolutionNote,
      },
      req,
    });

    // Notify ticket creator & branch staff
    const notifyUserIds = [current.created_by];
    const friendlyStatus = targetStatus === 'IN_PROGRESS' ? 'In Progress' : targetStatus === 'CLOSED' ? 'Closed' : 'Open';
    await sendNotification(
      notifyUserIds,
      `Operation Ticket ${current.ticket_id} is now ${friendlyStatus}`,
      `Status updated to ${friendlyStatus}.${finalResolutionNote ? ' ' + finalResolutionNote : ''}`,
      `/operation-center`
    );

    return res.json({
      success: true,
      message: `Ticket status updated to ${friendlyStatus}.`,
      ticket: updatedTicket,
    });
  } catch (err: any) {
    console.error('Error in status update /api/operation-tickets/:id/status:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.patch('/:id/status', authenticate, handleStatusUpdate);
router.put('/:id/status', authenticate, handleStatusUpdate);

// ============================================================
// 7. POST /api/operation-tickets/:id/updates - Post Operation Remark / Action Taken / Note
// ============================================================
router.post('/:id/updates', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const ticketId = parseInt(req.params.id, 10);
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message / Remark is required.' });
    }

    const tRes = await db.query('SELECT * FROM operation_tickets WHERE id = $1', [ticketId]);
    if (tRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const ticket = tRes.rows[0];

    // Branch ownership check
    if (!central && user.branchId && Number(ticket.branch_id) !== Number(user.branchId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot comment on tickets of another branch.' });
    }

    const cleanMsg = String(message).trim();

    const ins = await db.query(
      `INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, created_at)
       VALUES ($1, $2, 'REMARK', $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [ticketId, user.id, cleanMsg]
    );

    // Update updated_at timestamp on ticket
    await db.query(`UPDATE operation_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [ticketId]);

    // Audit log
    await logActivity({
      userId: user.id,
      action: 'ADD_OPERATION_TICKET_UPDATE',
      module: 'Operation Center',
      recordId: ticketId,
      details: { ticket_id: ticket.ticket_id, message: cleanMsg },
      req,
    });

    // Notify counterpart
    if (central) {
      // Operation commented -> notify branch creator
      await sendNotification(
        [ticket.created_by],
        `Update on Ticket ${ticket.ticket_id}`,
        `Operation update: "${cleanMsg}"`,
        `/operation-center`
      );
    } else {
      // Branch commented -> notify Operation team
      const opIds = await getOperationStaffIds();
      await sendNotification(
        opIds,
        `Branch Note on Ticket ${ticket.ticket_id}`,
        `Branch posted an update: "${cleanMsg}"`,
        `/operation-center`
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Update posted successfully.',
      update: {
        ...ins.rows[0],
        user_name: user.fullName || user.username,
        user_role: user.role,
      },
    });
  } catch (err: any) {
    console.error('Error in POST /api/operation-tickets/:id/updates:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 8. POST /api/operation-tickets/:id/attachments - Add images to ticket
// ============================================================
router.post(
  '/:id/attachments',
  authenticate,
  upload.array('attachments', 5),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const central = isCentralUser(user);
      const ticketId = parseInt(req.params.id, 10);

      const tRes = await db.query('SELECT * FROM operation_tickets WHERE id = $1', [ticketId]);
      if (tRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Ticket not found.' });
      }

      const ticket = tRes.rows[0];
      if (!central && user.branchId && Number(ticket.branch_id) !== Number(user.branchId)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No image files provided.' });
      }

      const saved: any[] = [];
      for (const f of files) {
        const fileUrl = `/uploads/${f.filename}`;
        const ins = await db.query(
          `INSERT INTO operation_ticket_attachments (ticket_id, file_url, file_name, mime_type, file_size, uploaded_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           RETURNING *`,
          [ticketId, fileUrl, f.originalname, f.mimetype, f.size, user.id]
        );
        saved.push({
          ...ins.rows[0],
          uploaded_by_name: user.fullName || user.username,
        });
      }

      await db.query(`UPDATE operation_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [ticketId]);

      await logActivity({
        userId: user.id,
        action: 'ADD_OPERATION_TICKET_ATTACHMENTS',
        module: 'Operation Center',
        recordId: ticketId,
        details: { count: saved.length },
        req,
      });

      return res.status(201).json({
        success: true,
        message: `${saved.length} attachment(s) added successfully.`,
        attachments: saved,
      });
    } catch (err: any) {
      console.error('Error in POST /api/operation-tickets/:id/attachments:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================
// 9. DELETE /api/operation-tickets/:id/attachments/:attachmentId
// ============================================================
router.delete('/:id/attachments/:attachmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const central = isCentralUser(user);
    const ticketId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);

    const aRes = await db.query(
      `SELECT ota.*, t.branch_id
       FROM operation_ticket_attachments ota
       JOIN operation_tickets t ON ota.ticket_id = t.id
       WHERE ota.id = $1 AND ota.ticket_id = $2`,
      [attachmentId, ticketId]
    );

    if (aRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    const att = aRes.rows[0];
    if (!central && user.branchId && Number(att.branch_id) !== Number(user.branchId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await db.query('DELETE FROM operation_ticket_attachments WHERE id = $1', [attachmentId]);

    return res.json({ success: true, message: 'Attachment removed.' });
  } catch (err: any) {
    console.error('Error in DELETE attachment:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
