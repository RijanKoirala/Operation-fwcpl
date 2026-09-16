import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../models/database';
import { authenticate, requireRoles, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { calculateStaffPerformance } from '../services/calculationService';

const router = Router();

// GET /api/staff - List staff
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { branchId, departmentId, designationId, status, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    // Role-based branch scoping
    if (req.user?.role === 'BRANCH_MANAGER') {
      if (req.user.branchId) {
        params.push(req.user.branchId);
        whereClauses.push(`u.branch_id = $${params.length}`);
      }
    } else if (branchId) {
      params.push(branchId);
      whereClauses.push(`u.branch_id = $${params.length}`);
    }

    if (departmentId) {
      params.push(departmentId);
      whereClauses.push(`u.department_id = $${params.length}`);
    }

    if (designationId) {
      params.push(designationId);
      whereClauses.push(`u.designation_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`u.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(u.full_name ILIKE $${params.length} OR u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.employee_id ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM users u ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT u.id, u.employee_id, u.username, u.email, u.full_name, u.phone, u.role, u.status,
             u.branch_id, b.name as branch_name, b.code as branch_code,
             u.designation_id, d.name as designation_name,
             u.department_id, dep.name as department_name,
             u.supervisor_id, sup.full_name as supervisor_name,
             u.permissions, u.allowed_branches,
             u.profile_photo, u.notes, u.created_at
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN designations d ON u.designation_id = d.id
      LEFT JOIN departments dep ON u.department_id = dep.id
      LEFT JOIN users sup ON u.supervisor_id = sup.id
      ${whereSql}
      ORDER BY u.id ASC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      staff: result.rows,
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

// GET /api/staff/meta/designations
router.get('/meta/designations', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT * FROM designations ORDER BY name ASC');
    return res.json({ success: true, designations: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/staff/meta/designations (SUPER_ADMIN only)
router.post('/meta/designations', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const { name, code, departmentId, description } = req.body;
  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Name and code are required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO designations (name, code, department_id, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), code.trim().toUpperCase(), departmentId || null, description || null]
    );
    return res.status(201).json({ success: true, designation: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/staff/meta/departments
router.get('/meta/departments', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT * FROM departments ORDER BY name ASC');
    return res.json({ success: true, departments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/staff/meta/departments (SUPER_ADMIN only)
router.post('/meta/departments', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const { name, code, description } = req.body;
  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Name and code are required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO departments (name, code, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), code.trim().toUpperCase(), description || null]
    );
    return res.status(201).json({ success: true, department: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/staff/admins/list - List all administrators and managers (SUPER_ADMIN only)
router.get('/admins/list', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.employee_id, u.username, u.email, u.full_name, u.phone, u.role, u.status,
             u.branch_id, b.name as branch_name, b.code as branch_code,
             u.designation_id, d.name as designation_name,
             u.department_id, dep.name as department_name,
             u.permissions, u.allowed_branches, u.created_at
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN designations d ON u.designation_id = d.id
      LEFT JOIN departments dep ON u.department_id = dep.id
      ORDER BY 
        CASE u.role 
          WHEN 'SUPER_ADMIN' THEN 1 
          WHEN 'MANAGEMENT' THEN 2 
          WHEN 'BRANCH_MANAGER' THEN 3 
          ELSE 4 
        END, 
        u.id ASC
    `);
    return res.json({ success: true, admins: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/staff/:id - Detailed Staff Profile
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const staffId = parseInt(req.params.id, 10);

  try {
    const userRes = await db.query(
      `SELECT u.id, u.employee_id, u.username, u.email, u.full_name, u.phone, u.role, u.status,
              u.branch_id, b.name as branch_name, b.code as branch_code,
              u.designation_id, d.name as designation_name,
              u.department_id, dep.name as department_name,
              u.supervisor_id, sup.full_name as supervisor_name,
              u.profile_photo, u.notes, u.created_at
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       LEFT JOIN designations d ON u.designation_id = d.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       LEFT JOIN users sup ON u.supervisor_id = sup.id
       WHERE u.id = $1`,
      [staffId]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const staffUser = userRes.rows[0];

    // Branch tenancy check
    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, staffUser.branch_id)) {
      return res.status(403).json({ success: false, message: 'Access denied: staff outside your branch.' });
    }

    // Tasks overview
    const tasksRes = await db.query(
      `SELECT t.*, b.name as branch_name
       FROM tasks t
       LEFT JOIN branches b ON t.branch_id = b.id
       WHERE t.assigned_to_id = $1
       ORDER BY t.due_date ASC`,
      [staffId]
    );

    // Targets overview
    const targetsRes = await db.query(
      `SELECT * FROM targets WHERE employee_id = $1 ORDER BY end_date DESC`,
      [staffId]
    );

    // Support tickets overview
    const ticketsRes = await db.query(
      `SELECT * FROM support_tickets WHERE assigned_staff_id = $1 ORDER BY due_date ASC`,
      [staffId]
    );

    // Follow-ups overview
    const followupsRes = await db.query(
      `SELECT * FROM follow_ups WHERE assigned_staff_id = $1 ORDER BY follow_up_date ASC`,
      [staffId]
    );

    // New connections overview
    const connectionsRes = await db.query(
      `SELECT * FROM connections WHERE assigned_staff_id = $1 ORDER BY request_date DESC`,
      [staffId]
    );

    // Performance ranking
    const allStaffPerf = await calculateStaffPerformance();
    const rankIndex = allStaffPerf.findIndex(s => s.staffId === staffId);
    const companyRank = rankIndex !== -1 ? rankIndex + 1 : 1;
    const branchStaffPerf = await calculateStaffPerformance(staffUser.branch_id);
    const branchRankIndex = branchStaffPerf.findIndex(s => s.staffId === staffId);
    const branchRank = branchRankIndex !== -1 ? branchRankIndex + 1 : 1;
    const performance = allStaffPerf.find(s => s.staffId === staffId) || null;

    // Recent activity history
    const activityRes = await db.query(
      `SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [staffId]
    );

    return res.json({
      success: true,
      staff: staffUser,
      tasks: tasksRes.rows,
      targets: targetsRes.rows,
      tickets: ticketsRes.rows,
      followups: followupsRes.rows,
      connections: connectionsRes.rows,
      performance,
      ranking: {
        companyRank,
        totalCompanyStaff: allStaffPerf.length,
        branchRank,
        totalBranchStaff: branchStaffPerf.length,
      },
      activityHistory: activityRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/staff - Create new staff or admin (SUPER_ADMIN, MANAGEMENT, BRANCH_MANAGER)
router.post('/', authenticate, requireRoles('SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'), async (req: Request, res: Response) => {
  const {
    employeeId,
    username,
    email,
    password = 'Password123!',
    fullName,
    phone,
    branchId,
    allowedBranches,
    permissions,
    designationId,
    departmentId,
    supervisorId,
    role = 'STAFF',
    status = 'Active',
    notes,
  } = req.body;

  if (!employeeId || !username || !email || !fullName) {
    return res.status(400).json({ success: false, message: 'Employee ID, username, email, and full name are required.' });
  }

  // Branch Manager can only create staff for their own branch
  let targetBranchId = branchId ? parseInt(String(branchId), 10) : null;
  if (req.user?.role === 'BRANCH_MANAGER') {
    targetBranchId = req.user.branchId;
    if (role === 'SUPER_ADMIN' || role === 'MANAGEMENT') {
      return res.status(403).json({ success: false, message: 'Branch managers cannot create admin accounts.' });
    }
  }

  // Only SUPER_ADMIN can create another SUPER_ADMIN or MANAGEMENT
  if ((role === 'SUPER_ADMIN' || role === 'MANAGEMENT') && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can create admin accounts.' });
  }

  let finalAllowedBranches = allowedBranches ? String(allowedBranches).trim() : (role === 'SUPER_ADMIN' ? 'ALL' : (targetBranchId ? String(targetBranchId) : 'ALL'));

  // Default full permissions if not specified
  let finalPermissions = permissions;
  if (!finalPermissions || typeof finalPermissions !== 'object') {
    finalPermissions = {
      tasks: true,
      connections: true,
      tickets: true,
      followups: true,
      staff: true,
      instructions: true,
      targets: true,
      noc: true,
      reports: true,
    };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, phone, branch_id, designation_id, department_id, supervisor_id, role, status, notes, permissions, allowed_branches, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, employee_id, username, email, full_name, role, status, branch_id, permissions, allowed_branches`,
      [
        employeeId.trim(),
        username.trim(),
        email.trim(),
        passwordHash,
        fullName.trim(),
        phone || null,
        targetBranchId,
        designationId || null,
        departmentId || null,
        supervisorId || null,
        role,
        status,
        notes || null,
        JSON.stringify(finalPermissions),
        finalAllowedBranches,
      ]
    );

    const newStaff = result.rows[0];

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_STAFF',
      module: 'STAFF',
      recordId: newStaff.id,
      details: { username, fullName, role, branchId: targetBranchId, allowedBranches: finalAllowedBranches },
      req,
    });

    return res.status(201).json({ success: true, staff: newStaff });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/staff/:id - Update staff or admin
router.put('/:id', authenticate, requireRoles('SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER'), async (req: Request, res: Response) => {
  const staffId = parseInt(req.params.id, 10);
  const {
    employeeId,
    email,
    fullName,
    phone,
    branchId,
    allowedBranches,
    permissions,
    designationId,
    departmentId,
    supervisorId,
    role,
    status,
    notes,
    password,
  } = req.body;

  try {
    const curRes = await db.query('SELECT * FROM users WHERE id = $1', [staffId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }
    const current = curRes.rows[0];

    if (req.user?.role === 'BRANCH_MANAGER' && !checkBranchAccess(req.user, current.branch_id)) {
      return res.status(403).json({ success: false, message: 'Cannot modify staff outside your branch.' });
    }

    if ((role === 'SUPER_ADMIN' || role === 'MANAGEMENT') && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Only Super Admin can assign admin roles.' });
    }

    let passwordHash = current.password_hash;
    if (password && String(password).trim().length > 0) {
      passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    let finalPermissions = current.permissions;
    if (permissions !== undefined) {
      finalPermissions = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
    }

    let finalAllowedBranches = allowedBranches !== undefined ? (allowedBranches ? String(allowedBranches).trim() : null) : current.allowed_branches;
    let targetBranchId = branchId !== undefined ? (branchId ? parseInt(String(branchId), 10) : null) : current.branch_id;

    const result = await db.query(
      `UPDATE users
       SET employee_id = COALESCE($1, employee_id),
           email = COALESCE($2, email),
           full_name = COALESCE($3, full_name),
           phone = COALESCE($4, phone),
           branch_id = $5,
           designation_id = COALESCE($6, designation_id),
           department_id = COALESCE($7, department_id),
           supervisor_id = $8,
           role = COALESCE($9, role),
           status = COALESCE($10, status),
           notes = COALESCE($11, notes),
           permissions = $12,
           allowed_branches = $13,
           password_hash = $14,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING id, employee_id, username, email, full_name, role, status, branch_id, permissions, allowed_branches`,
      [
        employeeId || null,
        email || null,
        fullName || null,
        phone || null,
        targetBranchId,
        designationId || null,
        departmentId || null,
        supervisorId || null,
        role || null,
        status || null,
        notes || null,
        finalPermissions,
        finalAllowedBranches,
        passwordHash,
        staffId,
      ]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_STAFF',
      module: 'STAFF',
      recordId: staffId,
      details: req.body,
      req,
    });

    return res.json({ success: true, staff: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/staff/:id (SUPER_ADMIN only)
router.delete('/:id', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const staffId = parseInt(req.params.id, 10);

  try {
    const result = await db.query(
      `UPDATE users SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [staffId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    await logActivity({
      userId: req.user!.id,
      action: 'DEACTIVATE_STAFF',
      module: 'STAFF',
      recordId: staffId,
      req,
    });

    return res.json({ success: true, message: 'Staff deactivated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
