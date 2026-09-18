import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

export const setSuperadminPassword = async (targetPassword: string = 'Nepal@123') => {
  console.log('=====================================================');
  console.log('  FWCPL SUPERADMIN PASSWORD RESET & SCHEMA MIGRATION');
  console.log('=====================================================');
  console.log(`Setting superadmin password to: ${targetPassword}`);

  const saltRounds = 10;
  const hash = await bcrypt.hash(targetPassword, saltRounds);

  // 1. Update SQLite file if present
  const sqlitePath = path.resolve(__dirname, '../../data/fwcpl.sqlite');
  if (fs.existsSync(sqlitePath)) {
    try {
      console.log(`\nChecking SQLite database at: ${sqlitePath}`);
      const sdb = new Database(sqlitePath);
      sdb.pragma('journal_mode = WAL');

      // Ensure all columns exist
      try { sdb.exec("ALTER TABLE users ADD COLUMN phone TEXT;"); } catch {}
      try { sdb.exec("ALTER TABLE users ADD COLUMN role_id INTEGER;"); } catch {}
      try { sdb.exec("ALTER TABLE users ADD COLUMN last_login DATETIME;"); } catch {}
      try { sdb.exec("ALTER TABLE users ADD COLUMN allowed_branches TEXT DEFAULT 'ALL';"); } catch {}
      try { sdb.exec("ALTER TABLE users ADD COLUMN permissions TEXT;"); } catch {}

      const stmt = sdb.prepare(`
        UPDATE users 
        SET password_hash = ?, status = 'Active' 
        WHERE username = 'superadmin' OR role = 'SUPER_ADMIN' OR email = 'admin@fiberworld.net.np'
      `);
      const info = stmt.run(hash);
      console.log(`✔ SQLite: Superadmin password updated (${info.changes} row(s) affected).`);
    } catch (err: any) {
      console.error('⚠️ SQLite update error:', err.message);
    }
  }

  // 2. Update PostgreSQL if reachable
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
    // Ensure columns exist
    try { await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);"); } catch {}
    try { await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER;"); } catch {}
    try { await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;"); } catch {}
    try { await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_branches TEXT DEFAULT 'ALL';"); } catch {}

    const res = await client.query(
      `UPDATE users 
       SET password_hash = $1, status = 'Active', role = 'SUPER_ADMIN', allowed_branches = 'ALL' 
       WHERE LOWER(username) = 'superadmin' OR UPPER(role) = 'SUPER_ADMIN' OR LOWER(email) = 'admin@fiberworld.net.np'`,
      [hash]
    );

    if (res.rowCount === 0) {
      // Find Super Admin role and Operation dept
      const rRes = await client.query(`SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1`);
      const dRes = await client.query(`SELECT id FROM departments WHERE code = 'OPERATION' LIMIT 1`);
      const rId = rRes.rows[0]?.id || null;
      const dId = dRes.rows[0]?.id || null;

      await client.query(
        `INSERT INTO users (employee_id, username, email, password_hash, full_name, role, role_id, department_id, status, allowed_branches)
         VALUES ('EMP-1001', 'superadmin', 'admin@fiberworld.net.np', $1, 'Rijan Koirala', 'SUPER_ADMIN', $2, $3, 'Active', 'ALL')`,
        [hash, rId, dId]
      );
      console.log(`✔ PostgreSQL: Super Admin user account created afresh.`);
    } else {
      console.log(`✔ PostgreSQL: Superadmin password updated (${res.rowCount} row(s) affected).`);
    }
    client.release();
    await pool.end();
  } catch (pgErr: any) {
    console.log(`ℹ PostgreSQL not reachable (${pgErr.message}), SQLite is the active persistent DB.`);
  }

  console.log('\n=====================================================');
  console.log('✅ SUPERADMIN CREDENTIALS ARE READY:');
  console.log('   Username: superadmin  (or admin@fiberworld.net.np)');
  console.log(`   Password: ${targetPassword}`);
  console.log('=====================================================');
};

if (require.main === module) {
  const pwd = process.argv[2] || 'Nepal@123';
  setSuperadminPassword(pwd)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
