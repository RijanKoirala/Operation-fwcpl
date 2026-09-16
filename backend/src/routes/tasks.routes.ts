import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, requirePermission, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// GET /api/tasks - List tasks
router.get('/', authenticate, requirePermission('tasks.view'), async (req: Request, res: Response) => {
  const { branchId, assignedToId, status, priority, category, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    // Role and branch-based access control
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

    if (assignedToId) {
      params.push(assignedToId);
      whereClauses.push(`t.assigned_to_id = $${params.length}`);
    }

    if (status) {
      if (status === 'Overdue') {
        whereClauses.push(`t.due_date < CURRENT_TIMESTAMP AND t.status NOT IN ('Completed', 'Closed', 'Cancelled')`);
      } else {
        params.push(status);
        whereClauses.push(`t.status = $${params.length}`);
      }
    }

    if (priority) {
      params.push(priority);
      whereClauses.push(`t.priority = $${params.length}`);
    }

    if (category) {
      params.push(category);
      whereClauses.push(`t.category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(t.title ILIKE $${params.length} OR t.task_id ILIKE $${params.length} OR t.description ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM tasks t ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT t.*,
             b.name as branch_name, b.code as branch_code,
             u.full_name as assigned_to_name, u.employee_id as assigned_to_emp_id, u.email as assigned_to_email,
             c.full_name as created_by_name,
             CASE
               WHEN t.status NOT IN ('Completed', 'Closed', 'Cancelled') AND t.due_date < CURRENT_TIMESTAMP THEN true
               ELSE false
             END as is_overdue,
             (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comments_count
      FROM tasks t
      LEFT JOIN branches b ON t.branch_id = b.id
      LEFT JOIN users u ON t.assigned_to_id = u.id
      LEFT JOIN users c ON t.created_by_id = c.id
      ${whereSql}
      ORDER BY
        CASE t.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          ELSE 4
        END,
        t.due_date ASC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      tasks: result.rows,
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

// GET /api/tasks/:id - Single task with comments & timeline
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.id, 10);

  try {
    const taskRes = await db.query(
      `SELECT t.*,
              b.name as branch_name, b.code as branch_code,
              u.full_name as assigned_to_name, u.employee_id as assigned_to_emp_id,
              c.full_name as created_by_name,
              CASE
                WHEN t.status NOT IN ('Completed', 'Closed', 'Cancelled') AND t.due_date < CURRENT_TIMESTAMP THEN true
                ELSE false
              END as is_overdue
       FROM tasks t
       LEFT JOIN branches b ON t.branch_id = b.id
       LEFT JOIN users u ON t.assigned_to_id = u.id
       LEFT JOIN users c ON t.created_by_id = c.id
       WHERE t.id = $1`,
      [taskId]
    );

    if (taskRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const task = taskRes.rows[0];

    // Branch tenancy check
    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, task.branch_id)) {
      return res.status(403).json({ success: false, message: 'Access denied: task outside your branch.' });
    }
    if (req.user?.role === 'STAFF' && task.assigned_to_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: not assigned to this task.' });
    }

    // Comments
    const commentsRes = await db.query(
      `SELECT tc.*, u.full_name as author_name, u.role as author_role
       FROM task_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    // Status & Assignment history
    const historyRes = await db.query(
      `SELECT tsh.*, u.full_name as user_name
       FROM task_status_history tsh
       LEFT JOIN users u ON tsh.user_id = u.id
       WHERE tsh.task_id = $1
       ORDER BY tsh.created_at ASC`,
      [taskId]
    );

    return res.json({
      success: true,
      task,
      comments: commentsRes.rows,
      history: historyRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks - Create task
router.post('/', authenticate, requirePermission('tasks.create'), async (req: Request, res: Response) => {
  const {
    title,
    description,
    category = 'General',
    branchId,
    assignedToId,
    priority = 'Medium',
    startDate,
    dueDate,
  } = req.body;

  if (!title || !branchId || !startDate || !dueDate) {
    return res.status(400).json({ success: false, message: 'Title, branch, start date, and due date are required.' });
  }

  // Branch manager check
  let finalBranchId = branchId;
  if (req.user?.role === 'BRANCH_MANAGER') {
    finalBranchId = req.user.branchId;
  }

  try {
    const taskCode = `TSK-${Date.now().toString().slice(-6)}`;
    const status = assignedToId ? 'Assigned' : 'New';

    const result = await db.query(
      `INSERT INTO tasks (task_id, title, description, category, branch_id, assigned_to_id, created_by_id, priority, start_date, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [taskCode, title.trim(), description || null, category, finalBranchId, assignedToId || null, req.user!.id, priority, startDate, dueDate, status]
    );

    const newTask = result.rows[0];

    // Status history
    await db.query(
      `INSERT INTO task_status_history (task_id, user_id, from_status, to_status, remarks, created_at)
       VALUES ($1, $2, NULL, $3, 'Task created', CURRENT_TIMESTAMP)`,
      [newTask.id, req.user!.id, status]
    );

    // Notification if assigned
    if (assignedToId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'TASK', $4, CURRENT_TIMESTAMP)`,
        [assignedToId, 'New Task Assigned', `You have been assigned task: "${title}"`, `/tasks`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_TASK',
      module: 'TASKS',
      recordId: newTask.id,
      details: { taskId: taskCode, title, assignedToId, branchId: finalBranchId },
      req,
    });

    return res.status(201).json({ success: true, task: newTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tasks/:id/status - Update task status (Workflow Transition)
router.put('/:id/status', authenticate, async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.id, 10);
  const { status, completionRemarks, attachments } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  try {
    const curRes = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    const current = curRes.rows[0];

    // Permission checks
    if (req.user?.role === 'STAFF') {
      if (current.assigned_to_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this task.' });
      }
      // Staff can only move through workflow: Acknowledged, In Progress, Completed
      const staffAllowed = ['Acknowledged', 'In Progress', 'Completed'];
      if (!staffAllowed.includes(status)) {
        return res.status(403).json({ success: false, message: `Staff cannot set status to ${status}.` });
      }
    } else if (req.user?.role === 'BRANCH_MANAGER') {
      if (!checkBranchAccess(req.user, current.branch_id)) {
        return res.status(403).json({ success: false, message: 'Cannot modify tasks outside your branch.' });
      }
    }

    const isCompleting = status === 'Completed';
    const completionDate = isCompleting ? new Date().toISOString() : current.completion_date;
    const finalRemarks = completionRemarks !== undefined ? completionRemarks : current.completion_remarks;
    const finalAttachments = attachments !== undefined ? JSON.stringify(attachments) : current.attachments;

    const result = await db.query(
      `UPDATE tasks
       SET status = $1,
           completion_date = $2,
           completion_remarks = $3,
           attachments = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status, completionDate, finalRemarks, finalAttachments, taskId]
    );

    const updatedTask = result.rows[0];

    // Record status history
    await db.query(
      `INSERT INTO task_status_history (task_id, user_id, from_status, to_status, remarks, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [taskId, req.user!.id, current.status, status, completionRemarks || `Status changed to ${status}`]
    );

    // Notify creator if completed
    if (isCompleting && current.created_by_id) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'TASK', $4, CURRENT_TIMESTAMP)`,
        [current.created_by_id, 'Task Completed', `Task "${current.title}" was marked as Completed by ${req.user!.fullName}`, `/tasks`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_TASK_STATUS',
      module: 'TASKS',
      recordId: taskId,
      details: { fromStatus: current.status, toStatus: status, completionRemarks },
      req,
    });

    return res.json({ success: true, task: updatedTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/:id/review - Review/Approve or Reject Completion (Admin/Management/Branch Manager)
router.post('/:id/review', authenticate, requireRoles('SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'), async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.id, 10);
  const { action, remarks } = req.body; // action: 'APPROVE' (Closed) or 'REJECT' (In Progress / Rejected)

  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be APPROVE or REJECT.' });
  }

  try {
    const curRes = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    const task = curRes.rows[0];

    const newStatus = action === 'APPROVE' ? 'Closed' : 'Rejected';

    const result = await db.query(
      `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [newStatus, taskId]
    );

    await db.query(
      `INSERT INTO task_status_history (task_id, user_id, from_status, to_status, remarks, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [taskId, req.user!.id, task.status, newStatus, remarks || `Task ${action.toLowerCase()}ed by ${req.user!.fullName}`]
    );

    // If rejected, notify assignee
    if (action === 'REJECT' && task.assigned_to_id) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'TASK', $4, CURRENT_TIMESTAMP)`,
        [task.assigned_to_id, 'Task Completion Rejected', `Your task completion for "${task.title}" was rejected: "${remarks || 'Needs rework'}"`, `/tasks`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: action === 'APPROVE' ? 'APPROVE_TASK' : 'REJECT_TASK',
      module: 'TASKS',
      recordId: taskId,
      details: { action, remarks },
      req,
    });

    return res.json({ success: true, task: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/:id/reassign - Reassign Task
router.post('/:id/reassign', authenticate, requirePermission('tasks.assign'), async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.id, 10);
  const { assignedToId, remarks } = req.body;

  if (!assignedToId) {
    return res.status(400).json({ success: false, message: 'Target assignee is required.' });
  }

  try {
    const curRes = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    const current = curRes.rows[0];

    const result = await db.query(
      `UPDATE tasks SET assigned_to_id = $1, status = 'Assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [assignedToId, taskId]
    );

    await db.query(
      `INSERT INTO task_status_history (task_id, user_id, from_status, to_status, remarks, created_at)
       VALUES ($1, $2, $3, 'Assigned', $4, CURRENT_TIMESTAMP)`,
      [taskId, req.user!.id, current.status, remarks || `Reassigned to staff ID ${assignedToId}`]
    );

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
       VALUES ($1, $2, $3, 'TASK', $4, CURRENT_TIMESTAMP)`,
      [assignedToId, 'Task Reassigned To You', `You have been reassigned task: "${current.title}"`, `/tasks`]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'REASSIGN_TASK',
      module: 'TASKS',
      recordId: taskId,
      details: { previousAssignee: current.assigned_to_id, newAssignee: assignedToId, remarks },
      req,
    });

    return res.json({ success: true, task: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/:id/comments - Add Comment
router.post('/:id/comments', authenticate, async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.id, 10);
  const { comment, isInternal = false } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content is required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO task_comments (task_id, user_id, comment, is_internal, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [taskId, req.user!.id, comment.trim(), isInternal ? 1 : 0]
    );

    return res.status(201).json({ success: true, comment: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
