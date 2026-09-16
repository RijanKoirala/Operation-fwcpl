import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// GET /api/tickets
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { branchId, assignedStaffId, status, priority, category, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (req.user?.role === 'STAFF') {
      params.push(req.user.id);
      whereClauses.push(`st.assigned_staff_id = $${params.length}`);
    } else if (req.user?.role === 'BRANCH_MANAGER') {
      if (req.user.branchId) {
        params.push(req.user.branchId);
        whereClauses.push(`st.branch_id = $${params.length}`);
      }
    } else if (branchId) {
      params.push(branchId);
      whereClauses.push(`st.branch_id = $${params.length}`);
    }

    if (assignedStaffId) {
      params.push(assignedStaffId);
      whereClauses.push(`st.assigned_staff_id = $${params.length}`);
    }

    if (status) {
      if (status === 'Overdue') {
        whereClauses.push(`st.due_date < CURRENT_TIMESTAMP AND st.status NOT IN ('Resolved', 'Closed', 'Cancelled')`);
      } else {
        params.push(status);
        whereClauses.push(`st.status = $${params.length}`);
      }
    }

    if (priority) {
      params.push(priority);
      whereClauses.push(`st.priority = $${params.length}`);
    }

    if (category) {
      params.push(category);
      whereClauses.push(`st.issue_category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(st.ticket_id ILIKE $${params.length} OR st.customer_name ILIKE $${params.length} OR st.customer_phone ILIKE $${params.length} OR st.description ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM support_tickets st ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT st.*,
             b.name as branch_name, b.code as branch_code,
             u.full_name as assigned_staff_name, u.phone as assigned_staff_phone,
             CASE
               WHEN st.status NOT IN ('Resolved', 'Closed', 'Cancelled') AND st.due_date < CURRENT_TIMESTAMP THEN true
               ELSE false
             END as is_overdue,
             (SELECT COUNT(*) FROM support_comments WHERE ticket_id = st.id) as comments_count
      FROM support_tickets st
      LEFT JOIN branches b ON st.branch_id = b.id
      LEFT JOIN users u ON st.assigned_staff_id = u.id
      ${whereSql}
      ORDER BY
        CASE st.priority
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          ELSE 4
        END,
        st.created_date DESC
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
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tickets/metrics
router.get('/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    let whereClause = '';
    const params: any[] = [];
    if (req.user?.role === 'BRANCH_MANAGER' && req.user.branchId) {
      params.push(req.user.branchId);
      whereClause = 'WHERE branch_id = $1';
    }

    const resAll = await db.query(`SELECT status, priority, due_date, created_date, closing_date, resolution_time_minutes FROM support_tickets ${whereClause}`, params);
    const rows = resAll.rows;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let newCount = 0;
    let openCount = 0;
    let criticalCount = 0;
    let overdueCount = 0;
    let resolvedToday = 0;
    let closedToday = 0;
    let totalResolutionMinutes = 0;
    let resolvedCount = 0;

    for (const r of rows) {
      if (r.status === 'New') newCount++;
      if (!['Resolved', 'Closed', 'Cancelled'].includes(r.status)) {
        openCount++;
        if (r.priority === 'Critical') criticalCount++;
        if (r.due_date && new Date(r.due_date) < now) overdueCount++;
      }
      if (r.status === 'Resolved' && r.closing_date && String(r.closing_date).startsWith(todayStr)) {
        resolvedToday++;
      }
      if (r.status === 'Closed' && r.closing_date && String(r.closing_date).startsWith(todayStr)) {
        closedToday++;
      }
      if (r.resolution_time_minutes) {
        totalResolutionMinutes += r.resolution_time_minutes;
        resolvedCount++;
      }
    }

    const avgResolutionHours = resolvedCount > 0 ? (totalResolutionMinutes / (resolvedCount * 60)).toFixed(1) : '3.5';

    return res.json({
      success: true,
      metrics: {
        totalTickets: rows.length,
        newTickets: newCount,
        openTickets: openCount,
        criticalTickets: criticalCount,
        overdueTickets: overdueCount,
        resolvedToday,
        closedToday,
        avgResolutionHours,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id, 10);

  try {
    const ticketRes = await db.query(
      `SELECT st.*,
              b.name as branch_name, b.code as branch_code,
              u.full_name as assigned_staff_name, u.phone as assigned_staff_phone, u.email as assigned_staff_email,
              CASE
                WHEN st.status NOT IN ('Resolved', 'Closed', 'Cancelled') AND st.due_date < CURRENT_TIMESTAMP THEN true
                ELSE false
              END as is_overdue
       FROM support_tickets st
       LEFT JOIN branches b ON st.branch_id = b.id
       LEFT JOIN users u ON st.assigned_staff_id = u.id
       WHERE st.id = $1`,
      [ticketId]
    );

    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    }

    const ticket = ticketRes.rows[0];

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, ticket.branch_id)) {
      return res.status(403).json({ success: false, message: 'Access denied: ticket outside your branch.' });
    }

    const commentsRes = await db.query(
      `SELECT sc.*, u.full_name as author_name, u.role as author_role
       FROM support_comments sc
       LEFT JOIN users u ON sc.user_id = u.id
       WHERE sc.ticket_id = $1
       ORDER BY sc.created_at ASC`,
      [ticketId]
    );

    return res.json({
      success: true,
      ticket,
      comments: commentsRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tickets - Create support ticket
router.post('/', authenticate, async (req: Request, res: Response) => {
  const {
    customerName,
    customerId,
    customerPhone,
    branchId,
    issueCategory,
    description,
    assignedStaffId,
    priority = 'Medium',
    dueDate,
  } = req.body;

  if (!customerName || !customerPhone || !branchId || !issueCategory || !description) {
    return res.status(400).json({ success: false, message: 'Customer name, phone, branch, category, and description are required.' });
  }

  let finalBranchId = branchId;
  if (req.user?.role === 'BRANCH_MANAGER') {
    finalBranchId = req.user.branchId;
  }

  try {
    const code = `TKT-${Date.now().toString().slice(-6)}`;
    const status = assignedStaffId ? 'Assigned' : 'New';

    // Calculate default SLA due date if not provided (e.g. Critical 4 hours, High 12 hours, Medium 24 hours, Low 48 hours)
    let calculatedDueDate = dueDate;
    if (!calculatedDueDate) {
      const hoursMap: Record<string, number> = { Critical: 4, High: 12, Medium: 24, Low: 48 };
      const hours = hoursMap[priority] || 24;
      calculatedDueDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }

    const result = await db.query(
      `INSERT INTO support_tickets (ticket_id, customer_id, customer_name, customer_phone, branch_id, issue_category, description, assigned_staff_id, priority, status, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [code, customerId || null, customerName.trim(), customerPhone.trim(), finalBranchId, issueCategory, description.trim(), assignedStaffId || null, priority, status, calculatedDueDate]
    );

    const newTicket = result.rows[0];

    if (assignedStaffId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'TICKET', $4, CURRENT_TIMESTAMP)`,
        [assignedStaffId, 'New Support Ticket Assigned', `Ticket ${code} (${issueCategory}) for ${customerName} assigned to you.`, `/tickets`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_TICKET',
      module: 'TICKETS',
      recordId: newTicket.id,
      details: { ticketId: code, customerName, category: issueCategory, priority },
      req,
    });

    return res.status(201).json({ success: true, ticket: newTicket });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tickets/:id - Update ticket & resolution
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id, 10);
  const {
    assignedStaffId,
    priority,
    status,
    resolution,
    dueDate,
  } = req.body;

  try {
    const curRes = await db.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }
    const current = curRes.rows[0];

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, current.branch_id)) {
      return res.status(403).json({ success: false, message: 'Cannot modify tickets outside your branch.' });
    }

    const isResolving = status === 'Resolved' || status === 'Closed';
    const closingDate = isResolving ? new Date().toISOString() : current.closing_date;

    let resTimeMinutes = current.resolution_time_minutes;
    if (isResolving && !resTimeMinutes && current.created_date) {
      const createdMs = new Date(current.created_date).getTime();
      resTimeMinutes = Math.round((Date.now() - createdMs) / (1000 * 60));
    }

    const result = await db.query(
      `UPDATE support_tickets
       SET assigned_staff_id = $1,
           priority = COALESCE($2, priority),
           status = COALESCE($3, status),
           resolution = COALESCE($4, resolution),
           closing_date = $5,
           resolution_time_minutes = $6,
           due_date = COALESCE($7, due_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [assignedStaffId !== undefined ? assignedStaffId : current.assigned_staff_id, priority, status, resolution, closingDate, resTimeMinutes, dueDate, ticketId]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_TICKET',
      module: 'TICKETS',
      recordId: ticketId,
      details: { fromStatus: current.status, toStatus: status || current.status, resolution },
      req,
    });

    return res.json({ success: true, ticket: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tickets/:id/comments
router.post('/:id/comments', authenticate, async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id, 10);
  const { comment, isInternal = false } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content is required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO support_comments (ticket_id, user_id, comment, is_internal, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [ticketId, req.user!.id, comment.trim(), isInternal ? 1 : 0]
    );

    return res.status(201).json({ success: true, comment: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
