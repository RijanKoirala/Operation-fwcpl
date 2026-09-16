import Database from 'better-sqlite3';
import { db } from '../models/database';
import path from 'path';
import fs from 'fs';

export const restorePreviousPasswords = async () => {
  await db.init();
  const sqlitePath = path.resolve(__dirname, '../../data/fwcpl.sqlite');
  if (!fs.existsSync(sqlitePath)) {
    console.warn('SQLite file not found at:', sqlitePath);
    return;
  }

  const sdb = new Database(sqlitePath);
  const sqliteUsers = sdb.prepare('SELECT username, email, password_hash, role FROM users').all() as any[];
  console.log(`Found ${sqliteUsers.length} users in previous SQLite database.`);

  for (const u of sqliteUsers) {
    if (u.password_hash) {
      const res = await db.query(
        `UPDATE users SET password_hash = $1 WHERE username = $2 OR email = $3`,
        [u.password_hash, u.username, u.email]
      );
      if (res.rowCount > 0) {
        console.log(`✔ Restored password for: ${u.username} (${u.role})`);
      }
    }
  }

  console.log('\n✅ All previous passwords restored from SQLite to PostgreSQL successfully!');
};

if (require.main === module) {
  restorePreviousPasswords()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error restoring passwords:', err);
      process.exit(1);
    });
}
