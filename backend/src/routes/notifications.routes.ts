import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.id]
    );

    const unreadCountRes = await db.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user!.id]
    );

    return res.json({
      success: true,
      notifications: result.rows,
      unreadCount: parseInt(unreadCountRes.rows[0].count, 10),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req: Request, res: Response) => {
  const notifId = parseInt(req.params.id, 10);

  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [notifId, req.user!.id]
    );
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', authenticate, async (req: Request, res: Response) => {
  try {
    await db.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [req.user!.id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
