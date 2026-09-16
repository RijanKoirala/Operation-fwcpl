import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, requirePermission } from '../middleware/auth';

const router = Router();

// GET /api/audit - List activity & audit logs
router.get('/', authenticate, requirePermission('audit.view'), async (req: Request, res: Response) => {
  const { module, action, userId, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (module) {
      params.push(module);
      whereClauses.push(`al.module = $${params.length}`);
    }

    if (action) {
      params.push(action);
      whereClauses.push(`al.action = $${params.length}`);
    }

    if (userId) {
      params.push(userId);
      whereClauses.push(`al.user_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(al.action ILIKE $${params.length} OR al.module ILIKE $${params.length} OR al.record_id ILIKE $${params.length} OR al.details ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM activity_logs al ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT al.*, u.full_name as user_name, u.username, u.role as user_role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereSql}
      ORDER BY al.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      logs: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
