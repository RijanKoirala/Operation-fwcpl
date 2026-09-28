import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
    console.log(`[AUTH] Login attempt for user/email: "${username.trim()}"`);
    const result = await db.query(
      `SELECT u.*, b.name as branch_name, d.name as designation_name,
              dep.name as department_name, dep.code as department_code,
              r.name as role_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       LEFT JOIN designations d ON u.designation_id = d.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)`,
      [username.trim()]
    );

    if (result.rowCount === 0) {
      console.warn(`[AUTH] Login failed: User "${username.trim()}" not found in database.`);
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.warn(`[AUTH] Login failed: Password mismatch for "${user.username}".`);
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
      let roleId = user.role_id;
      if (!roleId && user.role) {
        const upperRole = String(user.role).toUpperCase().replace(/\s+/g, '_');
        try {
          let rRes = await db.query(
            `SELECT id FROM roles WHERE UPPER(REPLACE(name, ' ', '_')) = $1 OR UPPER(name) = $1 LIMIT 1`,
            [upperRole]
          );
          if (rRes.rowCount === 0 && (upperRole.includes('BRANCH') || user.branch_id)) {
            rRes = await db.query(
              `SELECT id FROM roles WHERE UPPER(name) LIKE '%BRANCH%' ORDER BY id ASC LIMIT 1`
            );
          }
          if (rRes.rowCount > 0) {
            roleId = rRes.rows[0].id;
            db.query(`UPDATE users SET role_id = $1 WHERE id = $2 AND role_id IS NULL`, [roleId, user.id]).catch(() => {});
          }
        } catch (rErr: any) {
          console.warn('Role fallback warning in auth login:', rErr.message);
        }
      }

      if (roleId) {
        try {
          const rpRes = await db.query(
            `SELECT p.permission_key, rp.allowed
             FROM role_permissions rp
             JOIN permissions p ON rp.permission_id = p.id
             WHERE rp.role_id = $1 AND rp.allowed = TRUE`,
            [roleId]
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
          if (mod === 'pods') {
            if (effectivePermissions['pods.view'] === true) {
              effectivePermissions['pods'] = true;
            } else {
              effectivePermissions['pods'] = false;
            }
          } else if (effectivePermissions[key] && effectivePermissions[mod] === undefined) {
            effectivePermissions[mod] = true;
          }
        }
      }
      if (effectivePermissions['pods.view'] !== true) {
        effectivePermissions['pods'] = false;
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
        tokenVersion: user.token_version || 1,
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
        branchCode: user.branch_code,
        branch_code: user.branch_code,
        designationId: user.designation_id,
        designationName: user.designation_name,
        departmentId: user.department_id,
        departmentName: user.department_name,
        departmentCode: user.department_code,
        department_code: user.department_code,
        profilePhoto: user.profile_photo,
        permissions: effectivePermissions,
        assignedBranchIds,
        allowedBranches: user.allowed_branches || (isSuperAdmin ? 'ALL' : assignedBranchIds.join(',')),
        allowed_branches: user.allowed_branches || (isSuperAdmin ? 'ALL' : assignedBranchIds.join(',')),
        tokenVersion: user.token_version || 1,
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
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      let expiresAt: Date | null = null;
      try {
        const decoded: any = jwt.decode(token);
        if (decoded && decoded.exp) {
          expiresAt = new Date(decoded.exp * 1000);
        }
      } catch {}
      if (!expiresAt || isNaN(expiresAt.getTime())) {
        expiresAt = new Date(Date.now() + 8 * 3600 * 1000);
      }

      await db.query(
        `INSERT INTO invalidated_tokens (token_hash, user_id, invalidated_at, expires_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
         ON CONFLICT (token_hash) DO NOTHING`,
        [tokenHash, req.user!.id, expiresAt]
      );
    }

    // Increment token_version on user to invalidate any concurrent sessions
    await db.query(
      `UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1`,
      [req.user!.id]
    );

    // Clean up expired invalidated tokens lazily
    db.query(`DELETE FROM invalidated_tokens WHERE expires_at < CURRENT_TIMESTAMP`).catch(() => {});

    await logActivity({
      userId: req.user!.id,
      action: 'LOGOUT',
      module: 'AUTH',
      recordId: req.user!.id,
      req,
    });
  } catch (err: any) {
    console.error('Logout error:', err);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/refresh - Secure session extension for active users
router.post('/refresh', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
        tokenVersion: user.tokenVersion || 1,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to refresh authentication session.' });
  }
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
