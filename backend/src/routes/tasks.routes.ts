import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, requirePermission, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// Helper to attach assigned staff members to a list of tasks
async function attachStaffToTasks(tasks: any[]): Promise<any[]> {
  if (!tasks || tasks.length === 0) return tasks;

  const taskIds = tasks.map(t => t.id);
  const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(',');
  const staffRes = await db.query(
    `SELECT ts.task_id, u.id, u.full_name, u.employee_id, u.phone, u.role, d.name as designation_name
     FROM task_staff ts
     JOIN users u ON ts.staff_id = u.id
     LEFT JOIN designations d ON u.designation_id = d.id
     WHERE ts.task_id IN (${placeholders})
     ORDER BY ts.id ASC`,
    taskIds
  );

  const staffByTask = new Map<number, any[]>();
  for (const s of staffRes.rows) {
    const list = staffByTask.get(s.task_id) || [];
    list.push({
      id: s.id,
      full_name: s.full_name,
      employee_id: s.employee_id,
      phone: s.phone,
      role: s.role,
      designation_name: s.designation_name,
    });
    staffByTask.set(s.task_id, list);
  }

  for (const t of tasks) {
    let assigned = staffByTask.get(t.id) || [];
    if (assigned.length === 0 && t.assigned_to_id && t.assigned_to_name) {
      assigned = [
        {
          id: t.assigned_to_id,
          full_name: t.assigned_to_name,
          employee_id: t.assigned_to_emp_id,
          phone: null,
          role: null,
          designation_name: null,
        },
      ];
    }
    t.assigned_staff = assigned;
    if (assigned.length > 0 && !t.assigned_to_name) {
      t.assigned_to_name = assigned[0].full_name;
      t.assigned_to_id = assigned[0].id;
      t.assigned_to_emp_id = assigned[0].employee_id;
    }
  }

  return tasks;
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
  } else if (body.assignedToId !== undefined && body.assignedToId !== null && body.assignedToId !== '') {
    ids = [Number(body.assignedToId)];
  } else if (body.assigned_to_id !== undefined && body.assigned_to_id !== null && body.assigned_to_id !== '') {
    ids = [Number(body.assigned_to_id)];
  }
  return Array.from(new Set(ids.filter(id => !isNaN(id) && id > 0)));
}

// GET /api/tasks - List tasks
router.get('/', authenticate, requirePermission('tasks.view'), async (req: Request, res: Response) => {
  const { branchId, assignedToId, staffId, myTasks, status, priority, category, search, page = '1', limit = '50' } = req.query;
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

    // Filter by assigned staff (matches primary or any staff in task_staff)
    const targetStaffFilter = staffId || assignedToId || (myTasks === 'true' ? req.user?.id : null);
    if (targetStaffFilter) {
      params.push(Number(targetStaffFilter));
      whereClauses.push(
        `(t.assigned_to_id = $${params.length} OR EXISTS (SELECT 1 FROM task_staff ts WHERE ts.task_id = t.id AND ts.staff_id = $${params.length}))`
      );
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
      whereClauses.push(
        `(t.title ILIKE $${params.length} OR t.task_id ILIKE $${params.length} OR t.description ILIKE $${params.length})`
      );
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
    const tasksWithStaff = await attachStaffToTasks(result.rows);

    return res.json({
      success: true,
      tasks: tasksWithStaff,
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

// GET /api/tasks/:id - Single task with comments & timeline & assigned staff
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

    // Fetch assigned staff list
    const staffRes = await db.query(
      `SELECT u.id, u.full_name, u.employee_id, u.phone, u.role, d.name as designation_name
       FROM task_staff ts
       JOIN users u ON ts.staff_id = u.id
       LEFT JOIN designations d ON u.designation_id = d.id
       WHERE ts.task_id = $1
       ORDER BY ts.id ASC`,
      [taskId]
    );

    let assignedStaff = staffRes.rows;
    if (assignedStaff.length === 0 && task.assigned_to_id && task.assigned_to_name) {
      assignedStaff = [
        {
          id: task.assigned_to_id,
          full_name: task.assigned_to_name,
          employee_id: task.assigned_to_emp_id,
          phone: null,
          role: null,
          designation_name: null,
        },
      ];
    }
    task.assigned_staff = assignedStaff;

    // Branch tenancy check
    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, task.branch_id)) {
      return res.status(403).json({ success: false, message: 'Access denied: task outside your branch.' });
    }

    // Staff tenancy check: must be assigned or creator
    if (req.user?.role === 'STAFF') {
      const isAssigned =
        task.assigned_to_id === req.user.id ||
        task.created_by_id === req.user.id ||
        assignedStaff.some((s: any) => s.id === req.user!.id);
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Access denied: not assigned to this task.' });
      }
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

// POST /api/tasks - Create task with one or multiple staff
router.post('/', authenticate, requirePermission('tasks.create'), async (req: Request, res: Response) => {
  const {
    title,
    description,
    category = 'General',
    branchId,
    priority = 'Medium',
    startDate,
    dueDate,
  } = req.body;

  const staffIds = parseStaffIds(req.body);

  if (!title || !branchId || !startDate || !dueDate) {
    return res.status(400).json({ success: false, message: 'Title, branch, start date, and due date are required.' });
  }

  // Branch manager check
  let finalBranchId = branchId;
  if (req.user?.role === 'BRANCH_MANAGER') {
    finalBranchId = req.user.branchId;
  }

  // Tenancy check: Ensure assigned staff belong to the branch
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
    const taskCode = `TSK-${Date.now().toString().slice(-6)}`;
    const primaryStaffId = staffIds.length > 0 ? staffIds[0] : null;
    const status = staffIds.length > 0 ? 'Assigned' : 'New';

    const result = await db.query(
      `INSERT INTO tasks (task_id, title, description, category, branch_id, assigned_to_id, created_by_id, priority, start_date, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        taskCode,
        title.trim(),
        description || null,
        category,
        finalBranchId,
        primaryStaffId,
        req.user!.id,
        priority,
        startDate,
        dueDate,
        status,
      ]
    );

    const newTask = result.rows[0];

    // Insert into task_staff junction table for all assigned staff
    for (const sId of staffIds) {
      await db.query(
        `INSERT INTO task_staff (task_id, staff_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (task_id, staff_id) DO NOTHING`,
        [newTask.id, sId, req.user!.id]
      );
    }

    // Status history
    await db.query(
      `INSERT INTO task_status_history (task_id, user_id, from_status, to_status, remarks, created_at)
       VALUES ($1, $2, NULL, $3, $4, CURRENT_TIMESTAMP)`,
      [
        newTask.id,
        req.user!.id,
        status,
        staffIds.length > 1
          ? `Task created and assigned to ${staffIds.length} staff members`
          : staffIds.length === 1
          ? 'Task created and assigned'
          : 'Task created',
      ]
    );

    // Notifications: Notify every assigned staff member (no duplicates)
    for (const sId of staffIds) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'TASK', $4, CURRENT_TIMESTAMP)`,
        [sId, 'New Task Assigned', `You have been assigned to task: "${title}"`, `/tasks`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_TASK',
      module: 'TASKS',
      recordId: newTask.id,
      details: {
        taskId: taskCode,
        title,
        assignedStaffIds: staffIds,
        assignedToId: primaryStaffId,
        branchId: finalBranchId,
      },
      req,
    });

    const [fullTask] = await attachStaffToTasks([newTask]);
    return res.status(201).json({ success: true, task: fullTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tasks/:id - Edit task details and staff assignment
router.put('/:id', authenticate, requirePermission('tasks.create'), async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.id, 10);
  const { title, description, category, priority, startDate, dueDate, branchId } = req.body;

  try {
    const curRes = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    const current = curRes.rows[0];

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, current.branch_id)) {
      return res.status(403).json({ success: false, message: 'Cannot modify tasks outside your branch.' });
    }

    // Check staff updates if provided
    const hasStaffUpdate =
      req.body.assignedStaffIds !== undefined ||
      req.body.assignedToId !== undefined ||
      req.body.assigned_to_id !== undefined ||
      req.body.assignedStaff !== undefined;

    let newStaffIds = current.assigned_to_id ? [current.assigned_to_id] : [];
    if (hasStaffUpdate) {
      newStaffIds = parseStaffIds(req.body);
    }

    const primaryStaffId = newStaffIds.length > 0 ? newStaffIds[0] : null;
    const newStatus =
      current.status === 'New' && newStaffIds.length > 0
        ? 'Assigned'
        : current.status === 'Assigned' && newStaffIds.length === 0
        ? 'New'
        : current.status;

    const result = await db.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           priority = COALESCE($4, priority),
           start_date = COALESCE($5, start_date),
           due_date = COALESCE($6, due_date),
           branch_id = COALESCE($7, branch_id),
           assigned_to_id = $8,
           status = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        title ? title.trim() : null,
        description !== undefined ? description : null,
        category || null,
        priority || null,
        startDate || null,
        dueDate || null,
        branchId || null,
        primaryStaffId,
        newStatus,
        taskId,
      ]
    );

    const updatedTask = result.rows[0];

    // If staff was updated, synchronize junction table
    if (hasStaffUpdate) {
      // Get previous assignees
      const prevStaffRes = await db.query('SELECT staff_id FROM task_staff WHERE task_id = $1', [taskId]);
      const prevStaffIds: number[] = prevStaffRes.rows.map(r => r.staff_id);
      if (prevStaffIds.length === 0 && current.assigned_to_id) {
        prevStaffIds.push(current.assigned_to_id);
      }

      const addedStaffIds = newStaffIds.filter(id => !prevStaffIds.includes(id));
      const removedStaffIds = prevStaffIds.filter(id => !newStaffIds.includes(id));

      await db.query('DELETE FROM task_staff WHERE task_id = $1', [taskId]);
      for (const sId of newStaffIds) {
        await db.query(
          `INSERT INTO task_staff (task_id, staff_id, assigned_by, assigned_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (task_id, staff_id) DO NOTHING`,
          [taskId, sId, req.user!.id]
        );
      }

      // Notify newly assigned staff
      for (const sId of addedStaffIds) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, link, created_at)
           VALUES ($1, $2, $3, 'TASK', $4, CURRENT_TIMESTAMP)`,
          [sId, 'Task Assigned to You', `You were assigned to task: "${updatedTask.title}"`, `/tasks`]
        );
      }

      if (addedStaffIds.length > 0 || removedStaffIds.length > 0) {
        await db.query(
          `INSERT INTO task_status_history (task_id, user_id, from_status, to_status, remarks, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [
            taskId,
            req.user!.id,
            current.status,
            newStatus,
            `Assigned staff updated: ${newStaffIds.length} staff member(s)`,
          ]
        );
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_TASK',
      module: 'TASKS',
      recordId: taskId,
      details: { title: updatedTask.title, assignedStaffIds: newStaffIds },
      req,
    });

    const [fullTask] = await attachStaffToTasks([updatedTask]);
    return res.json({ success: true, task: fullTask });
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

    // Permission checks: allow any assigned staff in task_staff or primary assigned_to_id
    if (req.user?.role === 'STAFF') {
      const staffCheck = await db.query(
        'SELECT 1 FROM task_staff WHERE task_id = $1 AND staff_id = $2',
        [taskId, req.user.id]
      );
      const isAssigned = current.assigned_to_id === req.user.id || staffCheck.rowCount > 0;
      if (!isAssigned) {
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
        [
          current.created_by_id,
          'Task Completed',
          `Task "${current.title}" was marked as Completed by ${req.user!.fullName}`,
          `/tasks`,
        ]
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

    const [fullTask] = await attachStaffToTasks([updatedTask]);
    return res.json({ success: true, task: fullTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/:id/review - Review/Approve or Reject Completion (Admin/Management/Branch Manager)
router.post(
  '/:id/review',
  authenticate,
  requireRoles('SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'),
  async (req: Request, res: Response) => {
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
        [
          taskId,
          req.user!.id,
          task.status,
          newStatus,
          remarks || `Task ${action.toLowerCase()}ed by ${req.user!.fullName}`,
        ]
      );

      // If rejected, notify all assignees
      if (action === 'REJECT') {
        const assigneesRes = await db.query(
          `SELECT staff_id FROM task_staff WHERE task_id = $1
           UNION
           SELECT assigned_to_id FROM tasks WHERE id = $1 AND assigned_to_id IS NOT NULL`,
          [taskId]
        );
        for (const row of assigneesRes.rows) {
          await db.query(
            `INSERT INTO notifications (user_id, title, message, type, link, created_at)
             VALUES ($1, $2, $3, 'TASK', $4, CURRENT_TIMESTAMP)`,
            [
              row.staff_id,
              'Task Completion Rejected',
              `Your task completion for "${task.title}" was rejected: "${remarks || 'Needs rework'}"`,
              `/tasks`,
            ]
          );
        }
      }

      await logActivity({
        userId: req.user!.id,
        action: action === 'APPROVE' ? 'APPROVE_TASK' : 'REJECT_TASK',
        module: 'TASKS',
        recordId: taskId,
        details: { action, remarks },
        req,
      });

      const [fullTask] = await attachStaffToTasks([result.rows[0]]);
      return res.json({ success: true, task: fullTask });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/tasks/:id/reassign - Reassign Task (support single, multiple, or unassigned)
router.post('/:id/reassign', authenticate, requirePermission('tasks.assign'), async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.id, 10);
  const { remarks } = req.body;
  const staffIds = parseStaffIds(req.body);

  try {
    const curRes = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    const current = curRes.rows[0];

    // Branch tenancy validation
    if (req.user?.role === 'BRANCH_MANAGER' && staffIds.length > 0) {
      if (!checkBranchAccess(req.user, current.branch_id)) {
        return res.status(403).json({ success: false, message: 'Cannot reassign tasks outside your branch.' });
      }
      const validStaffRes = await db.query(
        `SELECT id FROM users WHERE id = ANY($1) AND branch_id = $2`,
        [staffIds, current.branch_id]
      );
      const validIds = new Set(validStaffRes.rows.map(r => r.id));
      const invalid = staffIds.filter(id => !validIds.has(id));
      if (invalid.length > 0) {
        return res.status(403).json({ success: false, message: 'Assigned staff must belong to the task branch.' });
      }
    }

    // Previous assignees
    const prevRes = await db.query('SELECT staff_id FROM task_staff WHERE task_id = $1', [taskId]);
    const prevStaffIds: number[] = prevRes.rows.map(r => r.staff_id);
    if (prevStaffIds.length === 0 && current.assigned_to_id) {
      prevStaffIds.push(current.assigned_to_id);
    }

    const addedStaffIds = staffIds.filter(id => !prevStaffIds.includes(id));
    const primaryStaffId = staffIds.length > 0 ? staffIds[0] : null;
    const newStatus =
      staffIds.length === 0
        ? (current.status === 'Assigned' ? 'New' : current.status)
        : (current.status === 'New' ? 'Assigned' : current.status);

    const result = await db.query(
      `UPDATE tasks SET assigned_to_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [primaryStaffId, newStatus, taskId]
    );

    // Sync task_staff table
    await db.query('DELETE FROM task_staff WHERE task_id = $1', [taskId]);
    for (const sId of staffIds) {
      await db.query(
        `INSERT INTO task_staff (task_id, staff_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (task_id, staff_id) DO NOTHING`,
        [taskId, sId, req.user!.id]
      );
    }

    await db.query(
      `INSERT INTO task_status_history (task_id, user_id, from_status, to_status, remarks, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        taskId,
        req.user!.id,
        current.status,
        newStatus,
        remarks || (staffIds.length > 0 ? `Reassigned to ${staffIds.length} staff member(s)` : 'Task unassigned (all assignees removed)'),
      ]
    );

    // Notify newly assigned staff
    for (const sId of addedStaffIds) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'TASK', $4, CURRENT_TIMESTAMP)`,
        [sId, 'Task Reassigned To You', `You have been reassigned task: "${current.title}"`, `/tasks`]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'REASSIGN_TASK',
      module: 'TASKS',
      recordId: taskId,
      details: {
        previousAssignees: prevStaffIds,
        newAssignees: staffIds,
        remarks,
      },
      req,
    });

    const [fullTask] = await attachStaffToTasks([result.rows[0]]);
    return res.json({ success: true, task: fullTask });
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
