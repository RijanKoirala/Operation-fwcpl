import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { db } from '../models/database';

export interface AuthUser {
  id: number;
  employeeId: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  roleId: number | null;
  roleName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  departmentCode?: string | null;
  department_code?: string | null;
  branchId: number | null;
  branch_id?: number | null;
  branchName?: string | null;
  branch_name?: string | null;
  branchCode?: string | null;
  branch_code?: string | null;
  designationId: number | null;
  permissions: Record<string, boolean>;
  assignedBranchIds: number[];
  allowedBranches: string;
  tokenVersion?: number;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: any;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch (jwtErr: any) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }

  try {
    // Check if token was explicitly invalidated / logged out
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invalidChk = await db.query(
      `SELECT 1 FROM invalidated_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    if (invalidChk.rowCount && invalidChk.rowCount > 0) {
      return res.status(401).json({ success: false, message: 'Authentication session has expired or was terminated. Please sign in again.' });
    }

    // Fetch user details including role, department, and branch info
    const result = await db.query(
      `SELECT u.*,
              b.name as branch_name, b.code as branch_code,
              r.name as role_name, dep.name as department_name, dep.code as department_code
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    const userRow = result.rows[0];
    if (userRow.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${userRow.status ? userRow.status.toLowerCase() : 'inactive'}. Contact system administrator.`,
      });
    }

    // Verify token version (if user logged out everywhere or password changed)
    if (decoded.tokenVersion && userRow.token_version && decoded.tokenVersion < userRow.token_version) {
      return res.status(401).json({ success: false, message: 'Authentication session has expired. Please sign in again.' });
    }

    const isSuperAdmin =
      userRow.role === 'SUPER_ADMIN' ||
      userRow.role_name === 'Super Admin' ||
      (userRow.role && userRow.role.toUpperCase().replace(/\s+/g, '_') === 'SUPER_ADMIN') ||
      userRow.username === 'superadmin';

    // 1. Calculate effective permissions strictly from database RBAC
    const effectivePermissions: Record<string, boolean> = {};

    if (isSuperAdmin) {
      // Super admin has every permission
      try {
        const allPermsRes = await db.query(`SELECT permission_key FROM permissions`);
        for (const p of allPermsRes.rows) {
          effectivePermissions[p.permission_key] = true;
        }
      } catch (pErr: any) {
        console.warn('Permissions query warning for Super Admin:', pErr.message);
      }
      // Also map module keys for legacy checks
      [
        'dashboard', 'admins', 'roles', 'permissions', 'departments', 'branches',
        'targets', 'tasks', 'reports', 'commands', 'instructions', 'noc',
        'connections', 'tickets', 'followups', 'settings', 'audit', 'staff',
        'goods_requests', 'goods_items', 'discussions', 'pods', 'electricity', 'information', 'assets', 'operation_center'
      ].forEach(m => {
        effectivePermissions[m] = true;
      });
    } else {
      // Start with role permissions
      let roleId = userRow.role_id;
      if (!roleId && userRow.role) {
        const upperRole = String(userRow.role).toUpperCase().replace(/\s+/g, '_');
        try {
          let rRes = await db.query(
            `SELECT id FROM roles WHERE UPPER(REPLACE(name, ' ', '_')) = $1 OR UPPER(name) = $1 LIMIT 1`,
            [upperRole]
          );
          if (rRes.rowCount === 0 && (upperRole.includes('BRANCH') || userRow.branch_id)) {
            rRes = await db.query(
              `SELECT id FROM roles WHERE UPPER(name) LIKE '%BRANCH%' ORDER BY id ASC LIMIT 1`
            );
          }
          if (rRes.rowCount > 0) {
            roleId = rRes.rows[0].id;
            db.query(`UPDATE users SET role_id = $1 WHERE id = $2 AND role_id IS NULL`, [roleId, userRow.id]).catch(() => {});
          }
        } catch (rErr: any) {
          console.warn('Role fallback warning in auth middleware:', rErr.message);
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
          console.warn('Role permissions query warning:', rpErr.message);
        }
      }

      // Apply individual user overrides from user_permissions
      try {
        const upRes = await db.query(
          `SELECT p.permission_key, up.allowed, up.override_type
           FROM user_permissions up
           JOIN permissions p ON up.permission_id = p.id
           WHERE up.user_id = $1`,
          [userRow.id]
        );
        for (const row of upRes.rows) {
          if (row.override_type === 'DENY' || row.allowed === false || row.allowed === 0) {
            effectivePermissions[row.permission_key] = false;
          } else {
            effectivePermissions[row.permission_key] = true;
          }
        }
      } catch (upErr: any) {
        console.warn('User permissions query warning:', upErr.message);
      }

      // Map module-level keys (e.g. 'tasks' = true if 'tasks.view' is true)
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

    // 2. Fetch assigned branches from user_branches safely
    let assignedBranchIds: number[] = [];
    try {
      const ubRes = await db.query(
        `SELECT branch_id FROM user_branches WHERE user_id = $1`,
        [userRow.id]
      );
      assignedBranchIds = ubRes.rows.map(r => Number(r.branch_id));
    } catch (ubErr: any) {
      console.warn('user_branches query warning:', ubErr.message);
    }
    if (assignedBranchIds.length === 0 && userRow.branch_id) {
      assignedBranchIds = [Number(userRow.branch_id)];
    }

    req.user = {
      id: userRow.id,
      employeeId: userRow.employee_id,
      username: userRow.username,
      email: userRow.email,
      fullName: userRow.full_name,
      phone: userRow.phone || null,
      role: userRow.role || userRow.role_name || 'STAFF',
      roleId: userRow.role_id,
      roleName: userRow.role_name,
      departmentId: userRow.department_id,
      departmentName: userRow.department_name,
      departmentCode: userRow.department_code || null,
      department_code: userRow.department_code || null,
      branchId: userRow.branch_id,
      branch_id: userRow.branch_id,
      branchName: userRow.branch_name || null,
      branch_name: userRow.branch_name || null,
      branchCode: userRow.branch_code || null,
      branch_code: userRow.branch_code || null,
      designationId: userRow.designation_id,
      permissions: effectivePermissions,
      assignedBranchIds,
      allowedBranches: userRow.allowed_branches || (isSuperAdmin ? 'ALL' : assignedBranchIds.join(',')),
      tokenVersion: userRow.token_version || 1,
      status: userRow.status,
    };

    next();
  } catch (err: any) {
    console.error('Database error in authenticate middleware:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
};

export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const currentRole = (req.user.role || '').toUpperCase().replace(/\s+/g, '_');
    const currentRoleName = (req.user.roleName || '').toUpperCase().replace(/\s+/g, '_');
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase().replace(/\s+/g, '_'));

    if (
      currentRole === 'SUPER_ADMIN' ||
      currentRoleName === 'SUPER_ADMIN' ||
      normalizedAllowed.includes(currentRole) ||
      normalizedAllowed.includes(currentRoleName)
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Access restricted to roles: ${allowedRoles.join(', ')}. Current role: ${req.user.roleName || req.user.role}`,
    });
  };
};

export const requirePermission = (...permKeys: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const isSuperAdmin =
      req.user.role === 'SUPER_ADMIN' ||
      req.user.roleName === 'Super Admin' ||
      (req.user.role && req.user.role.toUpperCase().replace(/\s+/g, '_') === 'SUPER_ADMIN') ||
      req.user.username === 'superadmin';

    if (isSuperAdmin) {
      return next();
    }

    const hasAny = permKeys.some(k => req.user?.permissions && req.user.permissions[k] === true);
    if (hasAny) {
      return next();
    }

    const isPodPerm = permKeys.some(k => k.startsWith('pods'));
    const message = isPodPerm
      ? 'You do not have permission to access PODs.'
      : `Forbidden: You do not have permission for '${permKeys.join(' or ')}'.`;

    return res.status(403).json({
      success: false,
      message,
    });
  };
};

export const checkBranchAccess = (
  user: AuthUser,
  targetBranchId: number | string | null | undefined
): boolean => {
  if (!targetBranchId) return true;

  const isSuperAdmin =
    user.role === 'SUPER_ADMIN' ||
    user.roleName === 'Super Admin' ||
    (user.role && user.role.toUpperCase().replace(/\s+/g, '_') === 'SUPER_ADMIN') ||
    user.username === 'superadmin';

  if (isSuperAdmin) {
    return true;
  }

  const roleUpper = (user.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleNameUpper = (user.roleName || '').toUpperCase().replace(/\s+/g, '_');
  const deptUpper = (user.departmentCode || user.department_code || '').toUpperCase();

  const isCentralManagement =
    roleUpper === 'MANAGEMENT' ||
    roleNameUpper === 'MANAGEMENT' ||
    deptUpper === 'EXEC' ||
    deptUpper === 'OPERATION' ||
    deptUpper === 'OPS';

  // Only central leadership/management can use ALL allowed branches
  if (isCentralManagement && (user.allowedBranches === 'ALL' || user.allowedBranches === '*')) {
    return true;
  }

  const targetIdNum = Number(targetBranchId);

  // Branch users are strictly locked to their assigned branch IDs or branchId
  if (user.assignedBranchIds && user.assignedBranchIds.includes(targetIdNum)) {
    return true;
  }

  if (user.branchId && Number(user.branchId) === targetIdNum) {
    return true;
  }

  // Explicit comma-separated allowed_branches (e.g. '2,3')
  if (user.allowedBranches && user.allowedBranches !== 'ALL' && user.allowedBranches !== '*') {
    const list = user.allowedBranches.split(',').map(s => Number(s.trim()));
    if (list.includes(targetIdNum)) {
      return true;
    }
  }

  return false;
};
