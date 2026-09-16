import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to current dir

const dbUser = process.env.DB_USER || 'fwcpl_admin';
const dbPassword = process.env.DB_PASSWORD || 'SecureP@ssw0rd2026!';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbName = process.env.DB_NAME || 'fwcpl_operations';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fwcpl_super_secret_jwt_key_98374982734_operation_mgmt',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  db: {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    name: dbName,
    url: process.env.DATABASE_URL || `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
  },
  upload: {
    dir: path.resolve(__dirname, '../../uploads'),
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },
  org: {
    name: process.env.ORG_NAME || 'Fiber World Communication Pvt. Ltd.',
    code: process.env.ORG_CODE || 'FWCPL',
    tagline: process.env.ORG_TAGLINE || 'Connecting You Everywhere',
    email: process.env.ORG_SUPPORT_EMAIL || 'support@fiberworld.net.np',
  }
};
