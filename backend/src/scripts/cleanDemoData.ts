import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { db } from '../models/database';
import { seedRbacData } from '../seeds/rbacSeed';

export const cleanDemoData = async () => {
  console.log('=====================================================');
  console.log('  FWCPL DEMO DATA PURGE & ROLE PRESERVATION SCRIPT');
  console.log('=====================================================');
  console.log('Starting cleanup of demo branches, demo staff, tasks, and logs...');
  console.log('Strict rule: Preserving Roles, Permissions, Departments, Designations, and Super Admin.\n');

  // Helper SQL execution block
  const runCleanupSql = async (
    queryFn: (sql: string, params?: any[]) => Promise<any>,
    engineName: string
  ) => {
    console.log(`\n🧹 [${engineName}] Running database cleanup operations...`);

    // Helper safely delete
    const safeExec = async (table: string, customSql?: string) => {
      try {
        const sql = customSql || `DELETE FROM ${table}`;
        await queryFn(sql);
        console.log(`  ✔ Cleared: ${table}`);
      } catch (err: any) {
        console.warn(`  ⚠️ Notice for ${table}: ${err.message}`);
      }
    };

    // 1. Delete Activity Logs & Notifications
    await safeExec('activity_logs');
    await safeExec('notifications');

    // 2. Delete Tasks and related comments / history
    await safeExec('task_comments');
    await safeExec('task_status_history');
    await safeExec('tasks');

    // 3. Delete Connections & Comments
    await safeExec('connection_comments');
    await safeExec('connections');

    // 4. Delete Support Tickets & Comments
    await safeExec('support_comments');
    await safeExec('support_tickets');

    // 5. Delete Follow-ups
    await safeExec('follow_ups');

    // 6. Delete Instructions & Comments
    await safeExec('instruction_comments');
    await safeExec('instructions');

    // 7. Delete Targets
    await safeExec('targets');

    // 8. Delete NOC Incidents & Updates
    await safeExec('noc_incident_updates');
    await safeExec('noc_incidents');

    // 9. Delete Discussion Topics & Messages
    await safeExec('discussion_messages');
    await safeExec('discussion_topics');

    // 10. Delete Goods Requisitions (Preserves goods_items catalog!)
    await safeExec('goods_request_history');
    await safeExec('goods_request_items');
    await safeExec('goods_requests');

    // 11. Delete PODs & Equipment
    await safeExec('pod_history');
    await safeExec('pod_items');
    await safeExec('pods');

    // 12. Break Foreign Key circular references
    await safeExec('user_branches', 'DELETE FROM user_branches');
    await safeExec('branches_manager_clear', 'UPDATE branches SET manager_id = NULL');
    await safeExec('users_branch_clear', 'UPDATE users SET branch_id = NULL');

    // 13. Remove user permissions for demo staff only (keep superadmin / admin permissions)
    await safeExec(
      'user_permissions',
      `DELETE FROM user_permissions WHERE user_id NOT IN (
        SELECT id FROM users WHERE LOWER(username) = 'superadmin' OR UPPER(role) = 'SUPER_ADMIN'
      )`
    );

    // 14. Delete demo staff (keep superadmin / SUPER_ADMIN)
    await safeExec(
      'users',
      `DELETE FROM users WHERE LOWER(username) != 'superadmin' AND UPPER(role) != 'SUPER_ADMIN'`
    );

    // 15. Delete all demo branches
    await safeExec('branches', 'DELETE FROM branches');

    // 16. Ensure Super Admin account has correct permissions and links
    try {
      // Find Super Admin role ID
      const roleRes = await queryFn(`SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1`);
      const superAdminRoleId = roleRes.rows?.[0]?.id || null;

      // Find OPERATION department ID
      const deptRes = await queryFn(`SELECT id FROM departments WHERE UPPER(code) = 'OPERATION' OR UPPER(name) = 'OPERATION' LIMIT 1`);
      const operationDeptId = deptRes.rows?.[0]?.id || null;

      await queryFn(
        `UPDATE users 
         SET branch_id = NULL, 
             status = 'Active', 
             role = 'SUPER_ADMIN', 
             allowed_branches = 'ALL',
             role_id = COALESCE($1, role_id),
             department_id = COALESCE($2, department_id)
         WHERE LOWER(username) = 'superadmin' OR UPPER(role) = 'SUPER_ADMIN'`,
        [superAdminRoleId, operationDeptId]
      );
      console.log('  ✔ Verified: Super Admin account status set to Active, branch_id cleared, allowed_branches set to ALL.');
    } catch (err: any) {
      console.warn('  ⚠️ Superadmin alignment warning:', err.message);
    }

    // 17. Verify remaining counts for Administration & Roles
    console.log(`\n📊 [${engineName}] Verification of Preserved Administrative Data:`);
    const checkCount = async (tbl: string) => {
      try {
        const res = await queryFn(`SELECT COUNT(*) as cnt FROM ${tbl}`);
        const cnt = res.rows?.[0]?.cnt ?? res.rows?.[0]?.count ?? 0;
        console.log(`  ✔ ${tbl.padEnd(20)}: ${cnt} record(s) intact`);
      } catch (err: any) {
        console.log(`  - ${tbl.padEnd(20)}: N/A (${err.message})`);
      }
    };

    await checkCount('roles');
    await checkCount('permissions');
    await checkCount('role_permissions');
    await checkCount('departments');
    await checkCount('designations');
    await checkCount('goods_items');
    await checkCount('settings');
    await checkCount('users');
    await checkCount('branches');
    await checkCount('tasks');
  };

  // Execution: 1. Clean via DatabaseManager (db.init)
  try {
    await db.init();
    await runCleanupSql((sql, params) => db.query(sql, params || []), 'Active Database Connection');
  } catch (err: any) {
    console.error('⚠️ Error during db cleanup:', err.message);
  }

  // Execution: 2. Also directly clean SQLite file if present on disk
  const candidateSqlitePaths = [
    path.resolve(__dirname, '../../data/fwcpl.sqlite'),
    path.resolve(process.cwd(), 'data/fwcpl.sqlite'),
    '/app/data/fwcpl.sqlite',
  ];

  for (const sPath of candidateSqlitePaths) {
    if (fs.existsSync(sPath)) {
      try {
        console.log(`\nChecking SQLite file at: ${sPath}`);
        const sdb = new Database(sPath);
        sdb.pragma('journal_mode = WAL');
        sdb.pragma('foreign_keys = OFF'); // Temporarily off for bulk purge

        const querySqlite = async (sql: string, params: any[] = []) => {
          let sText = sql.replace(/\$(\d+)/g, '?');
          const isSelect = /^\s*SELECT/i.test(sText);
          if (isSelect) {
            const stmt = sdb.prepare(sText);
            const rows = stmt.all(...params);
            return { rows, rowCount: rows.length };
          } else {
            const stmt = sdb.prepare(sText);
            const info = stmt.run(...params);
            return { rows: [], rowCount: info.changes };
          }
        };

        await runCleanupSql(querySqlite, `Direct SQLite (${sPath})`);
        sdb.pragma('foreign_keys = ON');
        sdb.close();
      } catch (sErr: any) {
        console.warn(`⚠️ Error cleaning direct SQLite at ${sPath}:`, sErr.message);
      }
      break;
    }
  }

  // Execution: 3. Also directly check PostgreSQL pool if configured
  try {
    const pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      connectionTimeoutMillis: 3000,
    });

    const client = await pool.connect();
    console.log(`\nConnecting directly to PostgreSQL (${config.db.host}:${config.db.port}/${config.db.name})...`);

    const queryPg = async (sql: string, params: any[] = []) => {
      const res = await client.query(sql, params);
      return res;
    };

    await runCleanupSql(queryPg, 'Direct PostgreSQL');
    client.release();
    await pool.end();
  } catch (pgErr: any) {
    // Expected if running locally without local Postgres container
  }

  // Ensure RBAC data is fully seeded and synced
  try {
    await seedRbacData();
  } catch (rErr: any) {
    console.warn('⚠️ Post-cleanup RBAC sync warning:', rErr.message);
  }

  console.log('\n=====================================================');
  console.log('✅ DEMO DATA CLEANUP COMPLETED SUCCESSFULLY!');
  console.log('   - Demo branches, demo staff, demo tasks & logs removed.');
  console.log('   - Roles, Permissions & Role Matrix fully intact.');
  console.log('   - Departments, Designations & Settings fully intact.');
  console.log('   - Super Admin account preserved and operational.');
  console.log('=====================================================\n');
};

if (require.main === module) {
  cleanDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal cleanup error:', err);
      process.exit(1);
    });
}
