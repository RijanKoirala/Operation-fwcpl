import { db } from '../models/database';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export const inspectUsers = async () => {
  console.log('=== Checking Current Active Database Connection ===');
  await db.init();
  console.log(`Using Postgres: ${db.getIsPostgres()}`);

  try {
    const res = await db.query('SELECT id, username, email, full_name, role, status FROM users LIMIT 15');
    console.log('\n--- Users in Active DB (' + (db.getIsPostgres() ? 'PostgreSQL' : 'SQLite') + ') ---');
    console.table(res.rows);
  } catch (err: any) {
    console.error('Error querying active DB users:', err.message);
  }

  // Also check local SQLite file if exists
  const sqlitePath = path.resolve(__dirname, '../../data/fwcpl.sqlite');
  if (fs.existsSync(sqlitePath)) {
    try {
      console.log('\n--- Users in /app/data/fwcpl.sqlite file ---');
      const sdb = new Database(sqlitePath);
      const sUsers = sdb.prepare('SELECT id, username, email, full_name, role, status FROM users LIMIT 15').all();
      console.table(sUsers);
    } catch (err: any) {
      console.error('Error querying SQLite file:', err.message);
    }
  }
};

if (require.main === module) {
  inspectUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
