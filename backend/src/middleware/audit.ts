import { Request } from 'express';
import { db } from '../models/database';

export interface AuditLogOptions {
  userId?: number | null;
  action: string;
  module: string;
  recordId?: string | number | null;
  details?: any;
  req?: Request;
}

export const logActivity = async ({
  userId,
  action,
  module,
  recordId,
  details,
  req,
}: AuditLogOptions): Promise<void> => {
  try {
    const finalUserId = userId !== undefined ? userId : req?.user?.id || null;
    const ip = req?.ip || req?.headers['x-forwarded-for'] || req?.socket.remoteAddress || '127.0.0.1';
    const detailString = typeof details === 'object' ? JSON.stringify(details) : (details || null);

    await db.query(
      `INSERT INTO activity_logs (user_id, action, module, record_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [finalUserId, action, module, recordId ? String(recordId) : null, detailString, String(ip)]
    );
  } catch (err: any) {
    console.error('Failed to write activity log:', err.message);
  }
};
