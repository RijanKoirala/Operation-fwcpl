import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../models/database';
import { authenticate, requirePermission, requireRoles } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// Helper to check if a user is the last active Super Admin
const isLastActiveSuperAdmin = async (userId: number): Promise<boolean> => {
  const res = await db.query(
    `SELECT u.id
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE (u.role = 'SUPER_ADMIN' OR r.name = 'Super Admin')
       AND u.status = 'Active'
       AND u.id != $1`,
    [userId]
  );
  return res.rowCount === 0;
};

// Helper to ensure RBAC roles and permissions exist
let rbacEnsured = false;
async function ensureRbac() {
  if (rbacEnsured) return;
  try {
    const rCheck = await db.query(`SELECT COUNT(*) as count FROM roles`);
    const count = parseInt(rCheck.rows[0]?.count || '0', 10);
    if (count === 0) {
      console.log('⚡ Roles table empty! Auto-running seedRbacData...');
      const { seedRbacData } = await import('../seeds/rbacSeed');
      await seedRbacData();
    }
    rbacEnsured = true;
  } catch (err: any) {
    console.error('ensureRbac error:', err.message);
  }
}

// ============================================================
// 1. ADMIN USERS MANAGEMENT
// ============================================================

// GET /api/admin/admins - List administrators & users
router.get('/admins', requirePermission('admins.view'), async (req: Request, res: Response) => {
  await ensureRbac();
  const { search, departmentId, roleId, status, branchId, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  try {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(u.full_name ILIKE $${params.length} OR u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.employee_id ILIKE $${params.length})`
      );
    }

    if (departmentId) {
      params.push(departmentId);
      whereClauses.push(`u.department_id = $${params.length}`);
    }

    if (roleId) {
      params.push(roleId);
      whereClauses.push(`u.role_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`u.status = $${params.length}`);
    }

    if (branchId) {
      params.push(branchId);
      whereClauses.push(
        `(u.branch_id = $${params.length} OR EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = u.id AND ub.branch_id = $${params.length}))`
      );
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM users u ${whereSql}`, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const query = `
      SELECT u.id, u.employee_id, u.username, u.email, u.full_name, u.phone, u.status,
             u.role, u.role_id, r.name as role_name,
             u.department_id, dep.name as department_name, dep.code as department_code,
             u.branch_id, b.name as primary_branch_name, u.allowed_branches,
             u.last_login, u.created_at, u.updated_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments dep ON u.department_id = dep.id
      LEFT JOIN branches b ON u.branch_id = b.id
      ${whereSql}
      ORDER BY 
        CASE 
          WHEN u.role = 'SUPER_ADMIN' OR r.name = 'Super Admin' THEN 1
          WHEN r.name = 'Operation Manager' THEN 2
          WHEN r.name = 'NOC Manager' THEN 3
          WHEN r.name = 'Branch Manager' THEN 4
          ELSE 5
        END,
        u.id ASC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    // Attach assigned branches array to each user
    const userIds = result.rows.map(r => r.id);
    const branchMap: Record<number, any[]> = {};

    if (userIds.length > 0) {
      try {
        const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
        const ubRes = await db.query(
          `SELECT ub.user_id, ub.branch_id, b.name as branch_name, b.code as branch_code
           FROM user_branches ub
           JOIN branches b ON ub.branch_id = b.id
           WHERE ub.user_id IN (${placeholders})
           ORDER BY b.name ASC`,
          userIds
        );
        for (const row of ubRes.rows) {
          if (!branchMap[row.user_id]) branchMap[row.user_id] = [];
          branchMap[row.user_id].push({
            id: row.branch_id,
            name: row.branch_name,
            code: row.branch_code,
          });
        }
      } catch (ubErr: any) {
        console.warn('Failed to load user_branches in /admins:', ubErr.message);
      }
    }

    const admins = result.rows.map(r => ({
      ...r,
      assigned_branches: branchMap[r.id] || (r.branch_id ? [{ id: r.branch_id, name: r.primary_branch_name }] : []),
    }));

    return res.json({
      success: true,
      admins,
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

// GET /api/admin/admins/:id - Get complete admin profile with role perms, overrides & effective perms
router.get('/admins/:id', requirePermission('admins.view'), async (req: Request, res: Response) => {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) return res.status(400).json({ success: false, message: 'Invalid admin ID' });

  try {
    const userRes = await db.query(
      `SELECT u.id, u.employee_id, u.username, u.email, u.full_name, u.phone, u.status,
              u.role, u.role_id, r.name as role_name, r.description as role_description,
              u.department_id, dep.name as department_name, dep.code as department_code,
              u.branch_id, b.name as primary_branch_name, u.allowed_branches,
              u.last_login, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = $1`,
      [adminId]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    const admin = userRes.rows[0];

    // 1. Fetch assigned branches
    const ubRes = await db.query(
      `SELECT ub.branch_id, b.name, b.code, b.city
       FROM user_branches ub
       JOIN branches b ON ub.branch_id = b.id
       WHERE ub.user_id = $1
       ORDER BY b.name ASC`,
      [adminId]
    );
    const assignedBranches = ubRes.rows;

    // 2. Fetch all permissions catalog
    const allPermsRes = await db.query(`SELECT * FROM permissions ORDER BY module, name`);
    const allPermissions = allPermsRes.rows;

    // 3. Fetch Role Permissions
    const rolePermsMap: Record<string, boolean> = {};
    const isSuperAdmin = admin.role === 'SUPER_ADMIN' || admin.role_name === 'Super Admin';

    if (isSuperAdmin) {
      for (const p of allPermissions) {
        rolePermsMap[p.permission_key] = true;
      }
    } else if (admin.role_id) {
      const rpRes = await db.query(
        `SELECT p.permission_key, rp.allowed
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1`,
        [admin.role_id]
      );
      for (const row of rpRes.rows) {
        rolePermsMap[row.permission_key] = Boolean(row.allowed);
      }
    }

    // 4. Fetch Individual Overrides
    const overridesRes = await db.query(
      `SELECT up.id, up.permission_id, p.permission_key, p.name as permission_name, p.module,
              up.allowed, up.override_type
       FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       WHERE up.user_id = $1`,
      [adminId]
    );
    const overridesMap: Record<string, { allowed: boolean; overrideType: string }> = {};
    for (const row of overridesRes.rows) {
      overridesMap[row.permission_key] = {
        allowed: Boolean(row.allowed),
        overrideType: row.override_type || (row.allowed ? 'ALLOW' : 'DENY'),
      };
    }

    // 5. Calculate Effective Permissions
    const effectivePermissions: Record<string, { allowed: boolean; source: 'ROLE' | 'OVERRIDE'; overrideType?: string }> = {};
    for (const p of allPermissions) {
      const key = p.permission_key;
      if (overridesMap[key]) {
        effectivePermissions[key] = {
          allowed: overridesMap[key].allowed,
          source: 'OVERRIDE',
          overrideType: overridesMap[key].overrideType,
        };
      } else {
        effectivePermissions[key] = {
          allowed: Boolean(rolePermsMap[key]),
          source: 'ROLE',
        };
      }
    }

    return res.json({
      success: true,
      admin: {
        ...admin,
        assigned_branches: assignedBranches,
      },
      rolePermissions: rolePermsMap,
      individualOverrides: overridesMap,
      effectivePermissions,
      allPermissions,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/admins - Create new administrator / user
router.post('/admins', requirePermission('admins.create'), async (req: Request, res: Response) => {
  const {
    fullName,
    username,
    email,
    phone,
    password = 'Password123!',
    departmentId,
    roleId,
    status = 'Active',
    branchScope = 'ALL',
    assignedBranchIds = [],
    individualOverrides = {},
  } = req.body;

  if (!fullName || !username || !email) {
    return res.status(400).json({ success: false, message: 'Full name, username, and email are required.' });
  }

  try {
    // Check duplicates
    const dupCheck = await db.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)`,
      [username.trim(), email.trim()]
    );
    if (dupCheck.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Username or email is already registered.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const employeeId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    // Resolve role name for legacy backwards compatibility
    let legacyRole = 'STAFF';
    let targetRoleId = roleId ? parseInt(String(roleId), 10) : null;
    if (targetRoleId) {
      const roleRow = await db.query(`SELECT name FROM roles WHERE id = $1`, [targetRoleId]);
      if (roleRow.rowCount > 0) {
        const rName = roleRow.rows[0].name.toUpperCase().replace(/\s+/g, '_');
        if (rName.includes('SUPER_ADMIN') || rName === 'SUPER_ADMIN') legacyRole = 'SUPER_ADMIN';
        else if (rName.includes('OPERATION') || rName === 'OPERATION_MANAGER') legacyRole = 'MANAGEMENT';
        else if (rName.includes('BRANCH') || rName === 'BRANCH_MANAGER') legacyRole = 'BRANCH_MANAGER';
        else legacyRole = rName;
      }
    }

    const primaryBranchId = assignedBranchIds.length > 0 ? assignedBranchIds[0] : null;
    const allowedBranchesStr = branchScope === 'ALL' ? 'ALL' : assignedBranchIds.join(',');

    const insertUserRes = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, phone, role, role_id,
                          department_id, branch_id, status, allowed_branches, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, employee_id, username, email, full_name, phone, role, role_id, department_id, branch_id, status`,
      [
        employeeId,
        username.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        fullName.trim(),
        phone ? phone.trim() : null,
        legacyRole,
        targetRoleId,
        departmentId ? parseInt(String(departmentId), 10) : null,
        primaryBranchId,
        status,
        allowedBranchesStr,
      ]
    );

    const newUser = insertUserRes.rows[0];

    // Assign branches to user_branches
    if (branchScope === 'SPECIFIC' && Array.isArray(assignedBranchIds)) {
      for (const bId of assignedBranchIds) {
        await db.query(
          `INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newUser.id, parseInt(String(bId), 10)]
        );
      }
    }

    // Set individual overrides if provided
    if (individualOverrides && typeof individualOverrides === 'object') {
      for (const [permKey, val] of Object.entries(individualOverrides)) {
        if (val === null || val === undefined) continue;
        const pRes = await db.query(`SELECT id FROM permissions WHERE permission_key = $1`, [permKey]);
        if (pRes.rowCount > 0) {
          const pId = pRes.rows[0].id;
          const allowed = Boolean(val);
          const overrideType = allowed ? 'ALLOW' : 'DENY';
          await db.query(
            `INSERT INTO user_permissions (user_id, permission_id, allowed, override_type)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, permission_id) DO UPDATE SET allowed = $3, override_type = $4`,
            [newUser.id, pId, allowed, overrideType]
          );
        }
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'ADMIN_CREATED',
      module: 'ADMINS',
      recordId: newUser.id,
      details: { username: newUser.username, fullName: newUser.full_name, roleId: targetRoleId, departmentId },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Administrator created successfully.',
      admin: newUser,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/admins/:id - Edit administrator / user
router.put('/admins/:id', requirePermission('admins.edit'), async (req: Request, res: Response) => {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) return res.status(400).json({ success: false, message: 'Invalid admin ID' });

  const {
    fullName,
    email,
    phone,
    departmentId,
    roleId,
    status,
    branchScope,
    assignedBranchIds,
    individualOverrides,
    password,
  } = req.body;

  try {
    const existing = await db.query(`SELECT id, role, role_id, status FROM users WHERE id = $1`, [adminId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    const currentAdmin = existing.rows[0];

    // Safeguard: check if changing status or role would remove the last active Super Admin
    if (
      (status && status !== 'Active') ||
      (roleId && parseInt(String(roleId), 10) !== currentAdmin.role_id)
    ) {
      const isSuper = currentAdmin.role === 'SUPER_ADMIN';
      if (isSuper && (await isLastActiveSuperAdmin(adminId))) {
        return res.status(400).json({
          success: false,
          message: 'Cannot disable or change the role of the last active Super Admin account.',
        });
      }
    }

    // Resolve legacy role
    let legacyRole = currentAdmin.role;
    let targetRoleId = roleId !== undefined ? (roleId ? parseInt(String(roleId), 10) : null) : currentAdmin.role_id;
    if (targetRoleId) {
      const roleRow = await db.query(`SELECT name FROM roles WHERE id = $1`, [targetRoleId]);
      if (roleRow.rowCount > 0) {
        const rName = roleRow.rows[0].name.toUpperCase().replace(/\s+/g, '_');
        if (rName.includes('SUPER_ADMIN') || rName === 'SUPER_ADMIN') legacyRole = 'SUPER_ADMIN';
        else if (rName.includes('OPERATION') || rName === 'OPERATION_MANAGER') legacyRole = 'MANAGEMENT';
        else if (rName.includes('BRANCH') || rName === 'BRANCH_MANAGER') legacyRole = 'BRANCH_MANAGER';
        else legacyRole = rName;
      }
    }

    const primaryBranchId =
      assignedBranchIds && assignedBranchIds.length > 0
        ? parseInt(String(assignedBranchIds[0]), 10)
        : null;

    let allowedBranchesStr = currentAdmin.allowed_branches;
    if (branchScope) {
      allowedBranchesStr = branchScope === 'ALL' ? 'ALL' : (assignedBranchIds ? assignedBranchIds.join(',') : 'ALL');
    }

    // Update user record
    await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           phone = $3,
           department_id = $4,
           role_id = $5,
           role = $6,
           status = COALESCE($7, status),
           branch_id = COALESCE($8, branch_id),
           allowed_branches = COALESCE($9, allowed_branches),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        fullName ? fullName.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
        departmentId ? parseInt(String(departmentId), 10) : null,
        targetRoleId,
        legacyRole,
        status || null,
        primaryBranchId,
        allowedBranchesStr,
        adminId,
      ]
    );

    // If password provided, update it
    if (password && password.trim()) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, adminId]);
    }

    // Update assigned branches if provided
    if (Array.isArray(assignedBranchIds)) {
      await db.query(`DELETE FROM user_branches WHERE user_id = $1`, [adminId]);
      if (branchScope !== 'ALL') {
        for (const bId of assignedBranchIds) {
          await db.query(
            `INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [adminId, parseInt(String(bId), 10)]
          );
        }
      }
    }

    // Update individual overrides if provided
    if (individualOverrides && typeof individualOverrides === 'object') {
      for (const [permKey, val] of Object.entries(individualOverrides)) {
        const pRes = await db.query(`SELECT id FROM permissions WHERE permission_key = $1`, [permKey]);
        if (pRes.rowCount > 0) {
          const pId = pRes.rows[0].id;
          if (val === null || val === undefined) {
            // Remove override
            await db.query(`DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = $2`, [adminId, pId]);
          } else {
            const allowed = Boolean(val);
            const overrideType = allowed ? 'ALLOW' : 'DENY';
            await db.query(
              `INSERT INTO user_permissions (user_id, permission_id, allowed, override_type)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (user_id, permission_id) DO UPDATE SET allowed = $3, override_type = $4`,
              [adminId, pId, allowed, overrideType]
            );
          }
        }
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'ADMIN_UPDATED',
      module: 'ADMINS',
      recordId: adminId,
      details: { fullName, email, roleId: targetRoleId, status, branchScope },
      req,
    });

    return res.json({ success: true, message: 'Admin updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/admins/:id/status - Toggle active/disabled status
router.put('/admins/:id/status', requirePermission('admins.disable'), async (req: Request, res: Response) => {
  const adminId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!status || !['Active', 'Disabled', 'Inactive'].includes(status)) {
    return res.status(400).json({ success: false, message: "Valid status ('Active' or 'Disabled') is required." });
  }

  // Prevent disabling self
  if (req.user!.id === adminId && status !== 'Active') {
    return res.status(400).json({ success: false, message: 'You cannot disable your own account.' });
  }

  // Prevent disabling last Super Admin
  if (status !== 'Active' && (await isLastActiveSuperAdmin(adminId))) {
    return res.status(400).json({
      success: false,
      message: 'Cannot disable the last active Super Admin account.',
    });
  }

  try {
    await db.query(`UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, adminId]);

    await logActivity({
      userId: req.user!.id,
      action: 'ADMIN_STATUS_CHANGED',
      module: 'ADMINS',
      recordId: adminId,
      details: { status },
      req,
    });

    return res.json({ success: true, message: `Admin status set to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/admins/:id/reset-password - Reset password
router.post('/admins/:id/reset-password', requirePermission('admins.edit'), async (req: Request, res: Response) => {
  const adminId = parseInt(req.params.id, 10);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [passwordHash, adminId]);

    await logActivity({
      userId: req.user!.id,
      action: 'ADMIN_PASSWORD_RESET',
      module: 'ADMINS',
      recordId: adminId,
      req,
    });

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/admins/:id - Delete admin
router.delete('/admins/:id', requirePermission('admins.delete'), async (req: Request, res: Response) => {
  const adminId = parseInt(req.params.id, 10);

  if (req.user!.id === adminId) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  }

  if (await isLastActiveSuperAdmin(adminId)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete the last active Super Admin account.',
    });
  }

  try {
    // Delete relational references
    await db.query(`DELETE FROM user_permissions WHERE user_id = $1`, [adminId]);
    await db.query(`DELETE FROM user_branches WHERE user_id = $1`, [adminId]);
    await db.query(`DELETE FROM users WHERE id = $1`, [adminId]);

    await logActivity({
      userId: req.user!.id,
      action: 'ADMIN_DELETED',
      module: 'ADMINS',
      recordId: adminId,
      req,
    });

    return res.json({ success: true, message: 'Administrator deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 2. ROLE MANAGEMENT
// ============================================================

// GET /api/admin/roles - List all roles
router.get('/roles', requirePermission('roles.view'), async (req: Request, res: Response) => {
  await ensureRbac();
  try {
    const query = `
      SELECT r.id, r.name, r.description, r.status, r.is_system, r.created_at, r.updated_at,
             r.department_id, dep.name as department_name, dep.code as department_code,
             (SELECT COUNT(*) FROM users WHERE role_id = r.id) as users_count,
             (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id AND (allowed = TRUE OR allowed = 1)) as permissions_count
      FROM roles r
      LEFT JOIN departments dep ON r.department_id = dep.id
      ORDER BY 
        CASE WHEN r.name = 'Super Admin' THEN 1 ELSE 2 END,
        r.id ASC
    `;
    const result = await db.query(query);
    return res.json({ success: true, roles: result.rows });
  } catch (err: any) {
    console.error('Error in GET /api/admin/roles:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/roles/:id - Get role details with permissions
router.get('/roles/:id', requirePermission('roles.view'), async (req: Request, res: Response) => {
  await ensureRbac();
  const roleId = parseInt(req.params.id, 10);
  try {
    const roleRes = await db.query(
      `SELECT r.*, dep.name as department_name, dep.code as department_code
       FROM roles r
       LEFT JOIN departments dep ON r.department_id = dep.id
       WHERE r.id = $1`,
      [roleId]
    );

    if (roleRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const role = roleRes.rows[0];

    // Fetch assigned permission keys
    const rpRes = await db.query(
      `SELECT p.id, p.permission_key, p.name, p.module
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1 AND (rp.allowed = TRUE OR rp.allowed = 1)`,
      [roleId]
    );

    const permissions = rpRes.rows;
    const permissionKeys = permissions.map(p => p.permission_key);

    return res.json({
      success: true,
      role,
      permissions,
      permissionKeys,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/roles - Create new custom role
router.post('/roles', requirePermission('roles.create'), async (req: Request, res: Response) => {
  const { name, description, departmentId, status = 'Active', permissionKeys = [] } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Role name is required.' });
  }

  try {
    const checkDup = await db.query(`SELECT id FROM roles WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    if (checkDup.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'A role with this name already exists.' });
    }

    const insRole = await db.query(
      `INSERT INTO roles (name, description, department_id, status, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name.trim(), description || null, departmentId ? parseInt(String(departmentId), 10) : null, status]
    );

    const newRole = insRole.rows[0];

    // Insert permissions
    if (Array.isArray(permissionKeys) && permissionKeys.length > 0) {
      for (const key of permissionKeys) {
        const pRes = await db.query(`SELECT id FROM permissions WHERE permission_key = $1`, [key]);
        if (pRes.rowCount > 0) {
          await db.query(
            `INSERT INTO role_permissions (role_id, permission_id, allowed) VALUES ($1, $2, TRUE)`,
            [newRole.id, pRes.rows[0].id]
          );
        }
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'ROLE_CREATED',
      module: 'ROLES',
      recordId: newRole.id,
      details: { name: newRole.name, permissionsCount: permissionKeys.length },
      req,
    });

    return res.status(201).json({ success: true, role: newRole });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/roles/:id - Update role and permissions
router.put('/roles/:id', requirePermission('roles.edit'), async (req: Request, res: Response) => {
  const roleId = parseInt(req.params.id, 10);
  const { name, description, departmentId, status, permissionKeys } = req.body;

  try {
    const roleCheck = await db.query(`SELECT * FROM roles WHERE id = $1`, [roleId]);
    if (roleCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const currentRole = roleCheck.rows[0];

    // Protect system role name
    let updatedName = currentRole.name;
    if (name && name.trim()) {
      if (currentRole.is_system && currentRole.name === 'Super Admin' && name.trim() !== 'Super Admin') {
        return res.status(400).json({ success: false, message: 'The Super Admin system role cannot be renamed.' });
      }
      updatedName = name.trim();
    }

    await db.query(
      `UPDATE roles
       SET name = $1,
           description = COALESCE($2, description),
           department_id = $3,
           status = COALESCE($4, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        updatedName,
        description !== undefined ? description : currentRole.description,
        departmentId ? parseInt(String(departmentId), 10) : null,
        status || currentRole.status,
        roleId,
      ]
    );

    // Update permissions if provided
    if (Array.isArray(permissionKeys)) {
      // If Super Admin, prevent removing full permissions
      if (currentRole.name === 'Super Admin') {
        // Super Admin retains all permissions
      } else {
        await db.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
        for (const key of permissionKeys) {
          const pRes = await db.query(`SELECT id FROM permissions WHERE permission_key = $1`, [key]);
          if (pRes.rowCount > 0) {
            await db.query(
              `INSERT INTO role_permissions (role_id, permission_id, allowed) VALUES ($1, $2, TRUE)`,
              [roleId, pRes.rows[0].id]
            );
          }
        }
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'ROLE_UPDATED',
      module: 'ROLES',
      recordId: roleId,
      details: { name: updatedName, permissionsCount: permissionKeys?.length },
      req,
    });

    return res.json({ success: true, message: 'Role updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/roles/:id - Delete role
router.delete('/roles/:id', requirePermission('roles.delete'), async (req: Request, res: Response) => {
  const roleId = parseInt(req.params.id, 10);

  try {
    const roleCheck = await db.query(`SELECT * FROM roles WHERE id = $1`, [roleId]);
    if (roleCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    if (roleCheck.rows[0].is_system || roleCheck.rows[0].name === 'Super Admin') {
      return res.status(400).json({ success: false, message: 'System roles cannot be deleted.' });
    }

    // Check if any users currently have this role
    const userCheck = await db.query(`SELECT COUNT(*) as count FROM users WHERE role_id = $1`, [roleId]);
    if (parseInt(userCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this role because it is currently assigned to ${userCheck.rows[0].count} user(s). Reassign them first.`,
      });
    }

    await db.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
    await db.query(`DELETE FROM roles WHERE id = $1`, [roleId]);

    await logActivity({
      userId: req.user!.id,
      action: 'ROLE_DELETED',
      module: 'ROLES',
      recordId: roleId,
      details: { name: roleCheck.rows[0].name },
      req,
    });

    return res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 3. PERMISSIONS & ROLE-PERMISSION MATRIX
// ============================================================

// GET /api/admin/permissions - List all permissions grouped by module
router.get('/permissions', requirePermission('permissions.view'), async (req: Request, res: Response) => {
  await ensureRbac();
  try {
    const result = await db.query(`SELECT * FROM permissions ORDER BY module, name`);
    return res.json({ success: true, permissions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/permissions - Register new permission
router.post('/permissions', requirePermission('permissions.create'), async (req: Request, res: Response) => {
  const { module, name, permissionKey, description } = req.body;

  if (!module || !name || !permissionKey) {
    return res.status(400).json({ success: false, message: 'Module, Name, and Permission Key are required.' });
  }

  try {
    const checkDup = await db.query(`SELECT id FROM permissions WHERE permission_key = $1`, [permissionKey.trim()]);
    if (checkDup.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Permission key already exists.' });
    }

    const insRes = await db.query(
      `INSERT INTO permissions (module, name, permission_key, description, status, created_at)
       VALUES ($1, $2, $3, $4, 'Active', CURRENT_TIMESTAMP)
       RETURNING *`,
      [module.trim(), name.trim(), permissionKey.trim().toLowerCase(), description || null]
    );

    const newPerm = insRes.rows[0];

    // Grant automatically to Super Admin role
    const superAdminRole = await db.query(`SELECT id FROM roles WHERE name = 'Super Admin'`);
    if (superAdminRole.rowCount > 0) {
      await db.query(
        `INSERT INTO role_permissions (role_id, permission_id, allowed) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING`,
        [superAdminRole.rows[0].id, newPerm.id]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'PERMISSION_CREATED',
      module: 'PERMISSIONS',
      recordId: newPerm.id,
      details: { key: newPerm.permission_key, module: newPerm.module },
      req,
    });

    return res.status(201).json({ success: true, permission: newPerm });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/permissions/matrix - Get live Role-Permission Matrix
router.get('/permissions/matrix', requirePermission('permissions.view'), async (req: Request, res: Response) => {
  await ensureRbac();
  try {
    const rolesRes = await db.query(`SELECT id, name, description, status, is_system FROM roles ORDER BY CASE WHEN name = 'Super Admin' THEN 1 ELSE 2 END, id ASC`);
    const permsRes = await db.query(`SELECT id, module, name, permission_key, description FROM permissions ORDER BY module, name`);

    // Fetch all role_permissions
    const rpRes = await db.query(`SELECT role_id, permission_id, allowed FROM role_permissions WHERE allowed = TRUE OR allowed = 1`);

    // Build matrix: roleId -> Set of permissionIds
    const matrix: Record<number, number[]> = {};
    for (const r of rolesRes.rows) {
      matrix[r.id] = [];
    }
    for (const rp of rpRes.rows) {
      if (matrix[rp.role_id]) {
        matrix[rp.role_id].push(rp.permission_id);
      }
    }

    return res.json({
      success: true,
      roles: rolesRes.rows,
      permissions: permsRes.rows,
      matrix,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/permissions/matrix - Update Role-Permission Matrix in bulk or single cell
router.put('/permissions/matrix', requirePermission('permissions.assign'), async (req: Request, res: Response) => {
  const { updates } = req.body; // Array of { roleId: number, permissionId: number, allowed: boolean }

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ success: false, message: 'Updates array is required.' });
  }

  try {
    const superAdminRole = await db.query(`SELECT id FROM roles WHERE name = 'Super Admin'`);
    const superAdminId = superAdminRole.rows[0]?.id;

    for (const item of updates) {
      const { roleId, permissionId, allowed } = item;

      // Super Admin permissions cannot be turned off
      if (roleId === superAdminId && !allowed) {
        continue;
      }

      if (allowed) {
        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id, allowed)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = TRUE`,
          [roleId, permissionId]
        );
      } else {
        await db.query(
          `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
          [roleId, permissionId]
        );
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'ROLE_PERMISSION_MATRIX_UPDATED',
      module: 'PERMISSIONS',
      details: { updatesCount: updates.length },
      req,
    });

    return res.json({ success: true, message: 'Role permissions updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/permissions/overrides/:userId - Set individual admin overrides
router.put('/permissions/overrides/:userId', requirePermission('permissions.assign'), async (req: Request, res: Response) => {
  const targetUserId = parseInt(req.params.userId, 10);
  const { overrides } = req.body; // Array of { permissionId: number, allowed: boolean | null } (null = remove override)

  if (!Array.isArray(overrides)) {
    return res.status(400).json({ success: false, message: 'Overrides array is required.' });
  }

  try {
    for (const ov of overrides) {
      const { permissionId, allowed } = ov;
      if (allowed === null || allowed === undefined) {
        await db.query(`DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = $2`, [targetUserId, permissionId]);
      } else {
        const overrideType = allowed ? 'ALLOW' : 'DENY';
        await db.query(
          `INSERT INTO user_permissions (user_id, permission_id, allowed, override_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, permission_id) DO UPDATE SET allowed = $3, override_type = $4`,
          [targetUserId, permissionId, Boolean(allowed), overrideType]
        );
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'USER_PERMISSION_OVERRIDES_UPDATED',
      module: 'PERMISSIONS',
      recordId: targetUserId,
      details: { overridesCount: overrides.length },
      req,
    });

    return res.json({ success: true, message: 'Individual permission overrides updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 4. DEPARTMENTS
// ============================================================

// GET /api/admin/departments - List departments with statistics
router.get('/departments', requirePermission('departments.view'), async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT dep.*,
             (SELECT COUNT(*) FROM users WHERE department_id = dep.id AND status = 'Active') as active_users_count,
             (SELECT COUNT(*) FROM roles WHERE department_id = dep.id) as roles_count
      FROM departments dep
      ORDER BY 
        CASE 
          WHEN dep.code = 'OPERATION' THEN 1
          WHEN dep.code = 'NOC' THEN 2
          WHEN dep.code = 'BRANCHES' THEN 3
          ELSE 4
        END,
        dep.id ASC
    `);

    return res.json({ success: true, departments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
