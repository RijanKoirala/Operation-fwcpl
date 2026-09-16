import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../models/database';
import { config } from '../config';
import { authenticate } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
  }

  try {
    const result = await db.query(
      `SELECT u.*, b.name as branch_name, d.name as designation_name,
              dep.name as department_name, dep.code as department_code,
              r.name as role_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       LEFT JOIN designations d ON u.designation_id = d.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1 OR u.email = $1`,
      [username.trim()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact management.`,
      });
    }

    // Update last_login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const isSuperAdmin =
      user.role === 'SUPER_ADMIN' ||
      user.role_name === 'Super Admin' ||
      (user.role && user.role.toUpperCase() === 'SUPER ADMIN');

    // Calculate effective permissions
    const effectivePermissions: Record<string, boolean> = {};

    if (isSuperAdmin) {
      try {
        const allPermsRes = await db.query(`SELECT permission_key FROM permissions`);
        for (const p of allPermsRes.rows) {
          effectivePermissions[p.permission_key] = true;
        }
      } catch (pErr: any) {
        console.warn('Permissions query warning for Super Admin login:', pErr.message);
      }
      [
        'dashboard', 'admins', 'roles', 'permissions', 'departments', 'branches',
        'targets', 'tasks', 'reports', 'commands', 'instructions', 'noc',
        'connections', 'tickets', 'followups', 'settings', 'audit', 'staff',
        'goods_requests', 'goods_items', 'discussions', 'pods'
      ].forEach(m => {
        effectivePermissions[m] = true;
      });
    } else {
      if (user.role_id) {
        try {
          const rpRes = await db.query(
            `SELECT p.permission_key, rp.allowed
             FROM role_permissions rp
             JOIN permissions p ON rp.permission_id = p.id
             WHERE rp.role_id = $1 AND rp.allowed = TRUE`,
            [user.role_id]
          );
          for (const row of rpRes.rows) {
            effectivePermissions[row.permission_key] = true;
          }
        } catch (rpErr: any) {
          console.warn('Role permissions query warning during login:', rpErr.message);
        }
      }

      try {
        const upRes = await db.query(
          `SELECT p.permission_key, up.allowed, up.override_type
           FROM user_permissions up
           JOIN permissions p ON up.permission_id = p.id
           WHERE up.user_id = $1`,
          [user.id]
        );
        for (const row of upRes.rows) {
          if (row.override_type === 'DENY' || row.allowed === false || row.allowed === 0) {
            effectivePermissions[row.permission_key] = false;
          } else {
            effectivePermissions[row.permission_key] = true;
          }
        }
      } catch (upErr: any) {
        console.warn('User permissions query warning during login:', upErr.message);
      }

      for (const key of Object.keys(effectivePermissions)) {
        if (key.includes('.')) {
          const mod = key.split('.')[0];
          if (effectivePermissions[key] && effectivePermissions[mod] === undefined) {
            effectivePermissions[mod] = true;
          }
        }
      }
    }

    // Fetch assigned branches safely
    let assignedBranchIds: number[] = [];
    try {
      const ubRes = await db.query(`SELECT branch_id FROM user_branches WHERE user_id = $1`, [user.id]);
      assignedBranchIds = ubRes.rows.map(r => Number(r.branch_id));
    } catch (ubErr: any) {
      console.warn('user_branches query warning during login:', ubErr.message);
    }
    if (assignedBranchIds.length === 0 && user.branch_id) {
      assignedBranchIds = [Number(user.branch_id)];
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branch_id,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    await logActivity({
      userId: user.id,
      action: 'LOGIN',
      module: 'AUTH',
      recordId: user.id,
      details: { username: user.username, role: user.role_name || user.role },
      req,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        employeeId: user.employee_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        name: user.full_name,
        phone: user.phone,
        role: user.role || user.role_name || 'STAFF',
        roleId: user.role_id,
        roleName: user.role_name,
        branchId: user.branch_id,
        branchName: user.branch_name,
        designationId: user.designation_id,
        designationName: user.designation_name,
        departmentId: user.department_id,
        departmentName: user.department_name,
        departmentCode: user.department_code,
        profilePhoto: user.profile_photo,
        permissions: effectivePermissions,
        assignedBranchIds,
        allowedBranches: user.allowed_branches || (isSuperAdmin ? 'ALL' : assignedBranchIds.join(',')),
        allowed_branches: user.allowed_branches || (isSuperAdmin ? 'ALL' : assignedBranchIds.join(',')),
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  await logActivity({
    userId: req.user!.id,
    action: 'LOGOUT',
    module: 'AUTH',
    recordId: req.user!.id,
    req,
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/demo-users
router.get('/demo-users', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.role, u.employee_id, b.name as branch_name,
              r.name as role_name, dep.name as department_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       WHERE u.status = 'Active'
       ORDER BY CASE u.role
         WHEN 'SUPER_ADMIN' THEN 1
         WHEN 'MANAGEMENT' THEN 2
         WHEN 'BRANCH_MANAGER' THEN 3
         ELSE 4
       END, u.id ASC
       LIMIT 10`
    );
    return res.json({ success: true, demoUsers: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
