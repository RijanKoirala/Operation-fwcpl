import bcrypt from 'bcryptjs';
import { db } from '../models/database';

export interface PermissionDefinition {
  module: string;
  name: string;
  key: string;
  description: string;
}

export const INITIAL_PERMISSIONS: PermissionDefinition[] = [
  // 1. Dashboard
  { module: 'Dashboard', name: 'View Dashboard', key: 'dashboard.view', description: 'Access operational overview, metrics, and KPI summaries' },

  // 2. Admins & Users
  { module: 'Admins', name: 'View Admins', key: 'admins.view', description: 'View administrator and user account listings' },
  { module: 'Admins', name: 'Create Admins', key: 'admins.create', description: 'Create new administrator and manager accounts' },
  { module: 'Admins', name: 'Edit Admins', key: 'admins.edit', description: 'Modify admin profile, department, role, and branch assignments' },
  { module: 'Admins', name: 'Disable Admins', key: 'admins.disable', description: 'Enable, suspend, or disable administrator accounts' },
  { module: 'Admins', name: 'Delete Admins', key: 'admins.delete', description: 'Permanently remove administrator accounts' },

  // 3. Roles
  { module: 'Roles', name: 'View Roles', key: 'roles.view', description: 'View existing role definitions and assigned users' },
  { module: 'Roles', name: 'Create Roles', key: 'roles.create', description: 'Create new custom roles' },
  { module: 'Roles', name: 'Edit Roles', key: 'roles.edit', description: 'Modify role definitions and assigned permissions' },
  { module: 'Roles', name: 'Delete Roles', key: 'roles.delete', description: 'Delete custom roles' },

  // 4. Permissions
  { module: 'Permissions', name: 'View Permissions', key: 'permissions.view', description: 'View permissions catalog and the Role-Permission Matrix' },
  { module: 'Permissions', name: 'Create Permissions', key: 'permissions.create', description: 'Register new permission keys in the system' },
  { module: 'Permissions', name: 'Edit Permissions', key: 'permissions.edit', description: 'Modify permission names and descriptions' },
  { module: 'Permissions', name: 'Assign Permissions', key: 'permissions.assign', description: 'Configure role permissions and individual user overrides' },

  // 5. Departments
  { module: 'Departments', name: 'View Departments', key: 'departments.view', description: 'View core departments and operational scope' },
  { module: 'Departments', name: 'Edit Departments', key: 'departments.edit', description: 'Manage department settings and descriptions' },

  // 6. Branches
  { module: 'Branches', name: 'View Branches', key: 'branches.view', description: 'View branches list and operational branch dashboards' },
  { module: 'Branches', name: 'Create Branches', key: 'branches.create', description: 'Register new physical branches' },
  { module: 'Branches', name: 'Edit Branches', key: 'branches.edit', description: 'Update branch information and branch manager assignments' },
  { module: 'Branches', name: 'Delete Branches', key: 'branches.delete', description: 'Decommission or delete branches' },

  // 7. Targets
  { module: 'Targets', name: 'View Targets', key: 'targets.view', description: 'View branch and individual performance targets' },
  { module: 'Targets', name: 'Create Targets', key: 'targets.create', description: 'Create new KPI targets' },
  { module: 'Targets', name: 'Edit Targets', key: 'targets.edit', description: 'Update target metrics, deadlines, and remarks' },
  { module: 'Targets', name: 'Delete Targets', key: 'targets.delete', description: 'Delete performance targets' },
  { module: 'Targets', name: 'Assign Targets', key: 'targets.assign', description: 'Assign targets to specific employees' },

  // 8. Tasks
  { module: 'Tasks', name: 'View Tasks', key: 'tasks.view', description: 'Access tasks list, calendar, and kanban boards' },
  { module: 'Tasks', name: 'Create Tasks', key: 'tasks.create', description: 'Create and dispatch new operational tasks' },
  { module: 'Tasks', name: 'Edit Tasks', key: 'tasks.edit', description: 'Update task details, due dates, and priority' },
  { module: 'Tasks', name: 'Delete Tasks', key: 'tasks.delete', description: 'Cancel or delete tasks' },
  { module: 'Tasks', name: 'Assign Tasks', key: 'tasks.assign', description: 'Assign or reassign tasks to personnel' },
  { module: 'Tasks', name: 'Complete Tasks', key: 'tasks.complete', description: 'Mark tasks as completed, verified, or closed' },

  // 9. Reports
  { module: 'Reports', name: 'View Reports', key: 'reports.view', description: 'View analytics, ranking charts, and performance summaries' },
  { module: 'Reports', name: 'Export Reports', key: 'reports.export', description: 'Export operational data to CSV or external files' },

  // 10. Commands / Instructions
  { module: 'Commands', name: 'View Commands', key: 'commands.view', description: 'View operational instructions and executive directives' },
  { module: 'Commands', name: 'Create Commands', key: 'commands.create', description: 'Issue new instructions to branches or staff' },
  { module: 'Commands', name: 'Edit Commands', key: 'commands.edit', description: 'Update or amend active instructions' },
  { module: 'Commands', name: 'Delete Commands', key: 'commands.delete', description: 'Revoke or delete instructions' },

  // 11. NOC Issues
  { module: 'NOC', name: 'View NOC', key: 'noc.view', description: 'View NOC incidents board, alerts, and telemetry' },
  { module: 'NOC', name: 'Create NOC Incidents', key: 'noc.create', description: 'Report and raise network issues to the NOC team' },
  { module: 'NOC', name: 'Edit NOC Incidents', key: 'noc.edit', description: 'Post updates, changes, and notes to NOC incidents' },
  { module: 'NOC', name: 'Delete NOC Incidents', key: 'noc.delete', description: 'Delete duplicate or invalid incident reports' },
  { module: 'NOC', name: 'Resolve NOC Incidents', key: 'noc.resolve', description: 'Mark NOC incidents as resolved with root cause analysis' },

  // 12. Connections
  { module: 'Connections', name: 'View Connections', key: 'connections.view', description: 'View new customer connection pipeline' },
  { module: 'Connections', name: 'Create Connections', key: 'connections.create', description: 'Log new customer connection requests' },
  { module: 'Connections', name: 'Edit Connections', key: 'connections.edit', description: 'Update feasibility, installation status, and completion' },

  // 13. Follow-ups
  { module: 'Follow-ups', name: 'View Follow-ups', key: 'followups.view', description: 'View customer follow-up schedule and pending cases' },
  { module: 'Follow-ups', name: 'Create Follow-ups', key: 'followups.create', description: 'Schedule new follow-ups for expired or support cases' },
  { module: 'Follow-ups', name: 'Edit Follow-ups', key: 'followups.edit', description: 'Log follow-up results and outcomes' },

  // 15. Settings
  { module: 'Settings', name: 'View Settings', key: 'settings.view', description: 'View platform configuration and scoring weights' },
  { module: 'Settings', name: 'Edit Settings', key: 'settings.edit', description: 'Modify scoring algorithms, weights, and company profile' },

  // 16. Audit Logs
  { module: 'Audit', name: 'View Audit Logs', key: 'audit.view', description: 'View security audit trail, login records, and activity logs' },

  // 17. Request Goods
  { module: 'Request Goods', name: 'View Goods Requests', key: 'goods_requests.view', description: 'Access goods requisition module' },
  { module: 'Request Goods', name: 'Create Goods Request', key: 'goods_requests.create', description: 'Create and submit new goods requisition' },
  { module: 'Request Goods', name: 'Edit Goods Request', key: 'goods_requests.edit', description: 'Modify draft or eligible pending requisition' },
  { module: 'Request Goods', name: 'Cancel Goods Request', key: 'goods_requests.cancel', description: 'Cancel pending goods request' },
  { module: 'Request Goods', name: 'View All Goods Requests', key: 'goods_requests.view_all', description: 'View goods requisitions from all branches' },
  { module: 'Request Goods', name: 'View Branch Goods Requests', key: 'goods_requests.view_branch', description: 'View goods requisitions for assigned branch' },
  { module: 'Request Goods', name: 'Accept Goods Request', key: 'goods_requests.accept', description: 'Approve full requested quantity' },
  { module: 'Request Goods', name: 'Partial Accept Goods Request', key: 'goods_requests.partial_accept', description: 'Approve partial quantities per item' },
  { module: 'Request Goods', name: 'Deny Goods Request', key: 'goods_requests.deny', description: 'Reject goods requisition with reason' },
  { module: 'Request Goods', name: 'Process Goods Request', key: 'goods_requests.process', description: 'Review and transition goods requests' },
  { module: 'Request Goods', name: 'Complete Goods Request', key: 'goods_requests.complete', description: 'Record delivered quantities and complete request' },

  // 18. Goods Items
  { module: 'Goods Items', name: 'View Goods Items', key: 'goods_items.view', description: 'View catalog of goods items and units' },
  { module: 'Goods Items', name: 'Create Goods Item', key: 'goods_items.create', description: 'Add new goods item to inventory catalog' },
  { module: 'Goods Items', name: 'Edit Goods Item', key: 'goods_items.edit', description: 'Modify goods item name, category, or unit' },
  { module: 'Goods Items', name: 'Disable Goods Item', key: 'goods_items.disable', description: 'Toggle goods item active/inactive status' },

  // 19. Discussions
  { module: 'Discussions', name: 'View Discussions', key: 'discussions.view', description: 'Access discussion box topics and messages' },
  { module: 'Discussions', name: 'Create Discussions', key: 'discussions.create', description: 'Start new discussion topic with Operations' },
  { module: 'Discussions', name: 'Reply Discussions', key: 'discussions.reply', description: 'Post replies and images in discussion threads' },
  { module: 'Discussions', name: 'Close Discussions', key: 'discussions.close', description: 'Close or resolve completed discussion topics' },

  // 20. PODs (POD = DC Locations & Independent Equipment/Items)
  { module: 'PODs', name: 'View PODs', key: 'pods.view', description: 'Access PODs / DC locations list and details' },
  { module: 'PODs', name: 'View All PODs', key: 'pods.view_all', description: 'View all POD / DC locations across network' },
  { module: 'PODs', name: 'Create POD', key: 'pods.create', description: 'Create new POD / DC record' },
  { module: 'PODs', name: 'Edit POD', key: 'pods.edit', description: 'Modify POD / DC information, GPS, owner, access, and power' },
  { module: 'PODs', name: 'Delete POD', key: 'pods.delete', description: 'Remove or archive POD / DC record' },
  { module: 'PODs', name: 'View POD Items', key: 'pods.items.view', description: 'View items and equipment installed in POD' },
  { module: 'PODs', name: 'Create POD Item', key: 'pods.items.create', description: 'Add new item/equipment to POD' },
  { module: 'PODs', name: 'Edit POD Item', key: 'pods.items.edit', description: 'Modify item quantity, unit, description, or status in POD' },
  { module: 'PODs', name: 'Delete POD Item', key: 'pods.items.delete', description: 'Remove item/equipment from POD' },
  { module: 'PODs', name: 'View POD History', key: 'pods.history.view', description: 'View change audit history for PODs and items' },

  // 21. Electricity Meter
  { module: 'Electricity Meter', name: 'View Electricity Meter', key: 'electricity.view', description: 'Access electricity meter module and readings' },
  { module: 'Electricity Meter', name: 'View All Branches Meters', key: 'electricity.all_branches.view', description: 'View electricity meters across all branches' },
  { module: 'Electricity Meter', name: 'Create Meter', key: 'electricity.meters.create', description: 'Register new electricity meter for branch' },
  { module: 'Electricity Meter', name: 'Edit Meter', key: 'electricity.meters.edit', description: 'Modify electricity meter details, type, or status' },
  { module: 'Electricity Meter', name: 'Delete Meter', key: 'electricity.meters.delete', description: 'Remove electricity meter' },
  { module: 'Electricity Meter', name: 'View Readings', key: 'electricity.readings.view', description: 'View meter reading logs and counter photos' },
  { module: 'Electricity Meter', name: 'Create Reading', key: 'electricity.readings.create', description: 'Record new meter reading with counter photo' },
  { module: 'Electricity Meter', name: 'Edit Reading', key: 'electricity.readings.edit', description: 'Modify recorded reading or reset baseline' },
  { module: 'Electricity Meter', name: 'Delete Reading', key: 'electricity.readings.delete', description: 'Delete erroneous reading' },
  { module: 'Electricity Meter', name: 'View Payments', key: 'electricity.payment.view', description: 'View electricity bills, payments, and due units' },
  { module: 'Electricity Meter', name: 'Create Payment', key: 'electricity.payment.create', description: 'Record bill amount, paid units, and payment slip' },
  { module: 'Electricity Meter', name: 'Edit Payment', key: 'electricity.payment.edit', description: 'Update electricity bill status and payment details' },
  { module: 'Electricity Meter', name: 'View Electricity History', key: 'electricity.history.view', description: 'View electricity change logs and audit trail' },

  // 22. Share Information
  { module: 'Share Information', name: 'View Information', key: 'information.view', description: 'Access company notices, circulars, rules, and announcements' },
  { module: 'Share Information', name: 'Create Information', key: 'information.create', description: 'Compose new announcement, notice, or circular' },
  { module: 'Share Information', name: 'Edit Information', key: 'information.edit', description: 'Update announcement details, audience, or media' },
  { module: 'Share Information', name: 'Publish Information', key: 'information.publish', description: 'Publish or schedule announcement to branches' },
  { module: 'Share Information', name: 'Delete Information', key: 'information.delete', description: 'Archive or remove announcement' },
  { module: 'Share Information', name: 'Pin Information', key: 'information.pin', description: 'Pin announcement to top featured carousel' },
  { module: 'Share Information', name: 'View Information History', key: 'information.view_history', description: 'View audience delivery and read receipts' },
];

export const seedRbacData = async (): Promise<void> => {
  try {
    console.log('🔒 Ensuring RBAC Schema & Seed Data (Departments, Roles, Permissions)...');

    // 1. Seed Core Departments (Exact 3 required options: OPERATION, NOC, BRANCHES)
    const departments = [
      { name: 'OPERATION', code: 'OPERATION', description: 'Central Operations, Monitoring, Planning & Strategy' },
      { name: 'NOC', code: 'NOC', description: 'Network Operations Center, Infrastructure, Core Routing & Incident Recovery' },
      { name: 'BRANCHES', code: 'BRANCHES', description: 'Regional Branches, Field Technicians, Customer Onboarding & Local Care' },
    ];

    const deptIdMap: Record<string, number> = {};

    for (const d of departments) {
      const res = await db.query(
        `SELECT id FROM departments WHERE UPPER(name) = $1 OR UPPER(code) = $1`,
        [d.code]
      );
      if (res.rowCount > 0) {
        deptIdMap[d.code] = res.rows[0].id;
      } else {
        const ins = await db.query(
          `INSERT INTO departments (name, code, description, created_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           RETURNING id`,
          [d.name, d.code, d.description]
        );
        deptIdMap[d.code] = ins.rows[0].id;
      }
    }

    // 2. Seed Permissions Catalog
    const permIdMap: Record<string, number> = {};

    for (const p of INITIAL_PERMISSIONS) {
      const chk = await db.query(`SELECT id FROM permissions WHERE permission_key = $1`, [p.key]);
      if (chk.rowCount > 0) {
        permIdMap[p.key] = chk.rows[0].id;
      } else {
        const ins = await db.query(
          `INSERT INTO permissions (module, name, permission_key, description, status, created_at)
           VALUES ($1, $2, $3, $4, 'Active', CURRENT_TIMESTAMP)
           RETURNING id`,
          [p.module, p.name, p.key, p.description]
        );
        permIdMap[p.key] = ins.rows[0].id;
      }
    }

    // 3. Seed Default Roles
    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'Complete unrestricted administrative control over all modules, security, and branches',
        deptCode: 'OPERATION',
        isSystem: true,
        permissions: Object.keys(permIdMap), // ALL permissions
      },
      {
        name: 'Operation Manager',
        description: 'Central operations oversight, branch management, targets, tasks, commands, and reports',
        deptCode: 'OPERATION',
        isSystem: true,
        permissions: [
          'dashboard.view',
          'branches.view', 'branches.create', 'branches.edit',
          'targets.view', 'targets.create', 'targets.edit', 'targets.assign',
          'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.complete',
          'reports.view', 'reports.export',
          'commands.view', 'commands.create', 'commands.edit',
          'noc.view', 'noc.create', 'noc.edit',
          'connections.view', 'connections.create', 'connections.edit',
          'followups.view', 'followups.create', 'followups.edit',
          'admins.view',
          'audit.view',
          'goods_requests.view', 'goods_requests.view_all', 'goods_requests.accept', 'goods_requests.partial_accept',
          'goods_requests.deny', 'goods_requests.process', 'goods_requests.complete',
          'goods_items.view', 'goods_items.create', 'goods_items.edit', 'goods_items.disable',
          'discussions.view', 'discussions.create', 'discussions.reply', 'discussions.close',
          'pods.view', 'pods.view_all', 'pods.create', 'pods.edit', 'pods.delete',
          'pods.items.view', 'pods.items.create', 'pods.items.edit', 'pods.items.delete',
          'pods.history.view',
          'electricity.view', 'electricity.all_branches.view', 'electricity.meters.create', 'electricity.meters.edit', 'electricity.meters.delete',
          'electricity.readings.view', 'electricity.readings.create', 'electricity.readings.edit', 'electricity.readings.delete',
          'electricity.payment.view', 'electricity.payment.create', 'electricity.payment.edit', 'electricity.history.view',
          'information.view', 'information.create', 'information.edit', 'information.publish', 'information.delete', 'information.pin', 'information.view_history',
        ],
      },
      {
        name: 'NOC Manager',
        description: 'Network Operations Center lead, incident management, telemetry, and service recovery',
        deptCode: 'NOC',
        isSystem: true,
        permissions: [
          'dashboard.view',
          'noc.view', 'noc.create', 'noc.edit', 'noc.delete', 'noc.resolve',
          'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.complete',
          'reports.view', 'reports.export',
          'commands.view',
          'branches.view',
          'pods.view', 'pods.view_all', 'pods.create', 'pods.edit',
          'pods.items.view', 'pods.items.create', 'pods.items.edit',
          'pods.history.view',
          'information.view',
        ],
      },
      {
        name: 'Branch Manager',
        description: 'Local branch administration, field staff, task assignment, and local connections',
        deptCode: 'BRANCHES',
        isSystem: true,
        permissions: [
          'dashboard.view',
          'branches.view',
          'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.complete',
          'targets.view',
          'connections.view', 'connections.create', 'connections.edit',
          'followups.view', 'followups.create', 'followups.edit',
          'commands.view',
          'discussions.view', 'discussions.create', 'discussions.reply', 'discussions.close',
          'reports.view',
          'goods_requests.view', 'goods_requests.view_branch', 'goods_requests.create',
          'goods_requests.edit', 'goods_requests.cancel', 'goods_items.view',
          'pods.view', 'pods.items.view', 'pods.history.view',
          'electricity.view', 'electricity.readings.view', 'electricity.readings.create', 'electricity.payment.view', 'electricity.history.view',
          'information.view',
        ],
      },
    ];

    const roleIdMap: Record<string, number> = {};

    for (const r of defaultRoles) {
      let roleId: number;
      const res = await db.query(`SELECT id FROM roles WHERE name = $1`, [r.name]);
      if (res.rowCount > 0) {
        roleId = res.rows[0].id;
      } else {
        const ins = await db.query(
          `INSERT INTO roles (name, description, department_id, status, is_system, created_at, updated_at)
           VALUES ($1, $2, $3, 'Active', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [r.name, r.description, deptIdMap[r.deptCode] || null, r.isSystem]
        );
        roleId = ins.rows[0].id;
      }
      roleIdMap[r.name] = roleId;

      // Ensure default role permissions are linked
      for (const pKey of r.permissions) {
        const pId = permIdMap[pKey];
        if (!pId) continue;
        const exists = await db.query(
          `SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
          [roleId, pId]
        );
        if (exists.rowCount === 0) {
          await db.query(
            `INSERT INTO role_permissions (role_id, permission_id, allowed) VALUES ($1, $2, $3)`,
            [roleId, pId, true]
          );
        }
      }
    }

    // 4. Backfill existing users with role_id and department_id
    console.log('🔄 Backfilling existing users to RBAC roles and departments...');
    const usersRes = await db.query(`SELECT id, username, role, department_id, role_id, branch_id FROM users`);

    for (const u of usersRes.rows) {
      let targetRoleId = u.role_id;
      let targetDeptId = u.department_id;

      const upperRole = (u.role || '').toUpperCase().replace(/\s+/g, '_');
      const lowerUsername = (u.username || '').toLowerCase();

      if (!targetRoleId) {
        if (upperRole.includes('SUPER') || lowerUsername === 'superadmin') {
          targetRoleId = roleIdMap['Super Admin'];
          targetDeptId = targetDeptId || deptIdMap['OPERATION'];
        } else if (upperRole.includes('OPERATION') || upperRole === 'MANAGEMENT') {
          targetRoleId = roleIdMap['Operation Manager'];
          targetDeptId = targetDeptId || deptIdMap['OPERATION'];
        } else if (upperRole.includes('NOC')) {
          targetRoleId = roleIdMap['NOC Manager'];
          targetDeptId = targetDeptId || deptIdMap['NOC'];
        } else if (upperRole.includes('BRANCH')) {
          targetRoleId = roleIdMap['Branch Manager'];
          targetDeptId = targetDeptId || deptIdMap['BRANCHES'];
        } else {
          targetRoleId = u.branch_id ? roleIdMap['Branch Manager'] : roleIdMap['Operation Manager'];
          targetDeptId = targetDeptId || (u.branch_id ? deptIdMap['BRANCHES'] : deptIdMap['OPERATION']);
        }

        if (targetRoleId) {
          await db.query(
            `UPDATE users SET role_id = $1, department_id = COALESCE(department_id, $2) WHERE id = $3`,
            [targetRoleId, targetDeptId, u.id]
          );
        }
      }

      // Ensure branch assignment exists in user_branches if user has branch_id
      if (u.branch_id) {
        const ub = await db.query(
          `SELECT id FROM user_branches WHERE user_id = $1 AND branch_id = $2`,
          [u.id, u.branch_id]
        );
        if (ub.rowCount === 0) {
          await db.query(
            `INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)`,
            [u.id, u.branch_id]
          );
        }
      }
    }

    // 5. Ensure Super Admin user exists for clean/fresh deployment
    console.log('👤 Ensuring Super Admin account in PostgreSQL...');
    const superAdminRole = roleIdMap['Super Admin'];
    const opDept = deptIdMap['OPERATION'];
    const superAdminCheck = await db.query(
      `SELECT id FROM users WHERE LOWER(username) = 'superadmin' OR UPPER(role) = 'SUPER_ADMIN'`
    );

    const defaultPermissions = {
      dashboard: true,
      admins: true,
      roles: true,
      permissions: true,
      departments: true,
      branches: true,
      targets: true,
      tasks: true,
      reports: true,
      commands: true,
      noc: true,
      connections: true,
      followups: true,
      settings: true,
      audit: true,
      goods_requests: true,
      goods_items: true,
      discussions: true,
      pods: true,
    };

    if (superAdminCheck.rowCount === 0) {
      const passwordHash = await bcrypt.hash('Nepal@123', 10);
      await db.query(
        `INSERT INTO users (
           employee_id, username, email, password_hash, full_name, phone,
           role, role_id, department_id, status, permissions, allowed_branches
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          'EMP-1001',
          'superadmin',
          'admin@fiberworld.net.np',
          passwordHash,
          'Rijan Koirala',
          '+977-9801123450',
          'SUPER_ADMIN',
          superAdminRole || null,
          opDept || null,
          'Active',
          JSON.stringify(defaultPermissions),
          'ALL',
        ]
      );
      console.log('  ✔ Fresh Super Admin account created (username: superadmin, password: Nepal@123).');
    } else {
      await db.query(
        `UPDATE users 
         SET role = 'SUPER_ADMIN',
             role_id = COALESCE($1, role_id),
             department_id = COALESCE($2, department_id),
             status = 'Active',
             allowed_branches = 'ALL'
         WHERE LOWER(username) = 'superadmin' OR UPPER(role) = 'SUPER_ADMIN'`,
        [superAdminRole, opDept]
      );
      console.log('  ✔ Super Admin account status verified as Active with SUPER_ADMIN role.');
    }

    // 6. Ensure Standard Designations
    const designations = [
      { name: 'Operations Manager', code: 'OPS_MGR', deptCode: 'OPERATION', desc: 'Directs branch networks and infrastructure delivery' },
      { name: 'NOC Lead Engineer', code: 'NOC_LEAD', deptCode: 'NOC', desc: 'Core routing and transmission management' },
      { name: 'NOC Engineer', code: 'NOC_ENG', deptCode: 'NOC', desc: '24/7 network monitoring and incident escalation' },
      { name: 'Branch Manager', code: 'BM', deptCode: 'BRANCHES', desc: 'Branch operational leadership and team management' },
      { name: 'Senior Field Technician', code: 'SR_TECH', deptCode: 'BRANCHES', desc: 'Fiber splicing, OTDR testing, and route restoration' },
      { name: 'Field Technician', code: 'TECH', deptCode: 'BRANCHES', desc: 'Customer premises installation and maintenance' },
      { name: 'Customer Support Executive', code: 'SUPPORT_EXEC', deptCode: 'OPERATION', desc: 'Helpdesk phone response and complaint resolution' },
      { name: 'Branch Accountant', code: 'ACCT', deptCode: 'BRANCHES', desc: 'Daily collections, invoicing, and petty cash' },
    ];

    for (const d of designations) {
      const res = await db.query(`SELECT id FROM designations WHERE UPPER(name) = $1 OR UPPER(code) = $2`, [d.name.toUpperCase(), d.code.toUpperCase()]);
      if (res.rowCount === 0) {
        await db.query(
          `INSERT INTO designations (name, code, department_id, description, created_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [d.name, d.code, deptIdMap[d.deptCode] || null, d.desc]
        );
      }
    }

    // 7. Ensure Default System Settings
    const defaultSettings = [
      {
        key: 'performance_weights',
        value: JSON.stringify({
          targetWeight: 40,
          taskCompletionWeight: 30,
          onTimeWeight: 15,
          supportFollowUpWeight: 15,
        }),
        desc: 'Default performance scoring weights summing to 100%',
      },
      {
        key: 'company_info',
        value: JSON.stringify({
          name: 'Fiber World Communication Pvt. Ltd.',
          shortName: 'FWCPL',
          panVat: '302918273',
          license: 'NTA-ISP-2018-091',
          phone: '+977-1-4789012',
          email: 'info@fiberworld.net.np',
          website: 'https://fiberworld.net.np',
          hqAddress: 'New Baneshwor, Kathmandu, Nepal',
        }),
        desc: 'Company legal and contact profile',
      },
    ];

    for (const s of defaultSettings) {
      const sChk = await db.query(`SELECT key FROM settings WHERE key = $1`, [s.key]);
      if (sChk.rowCount === 0) {
        await db.query(
          `INSERT INTO settings (key, value, description, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [s.key, s.value, s.desc]
        );
      }
    }

    console.log('✅ RBAC Schema & Seed initialization completed successfully.');
  } catch (err: any) {
    console.error('❌ Failed to seed RBAC data:', err.message);
  }
};
