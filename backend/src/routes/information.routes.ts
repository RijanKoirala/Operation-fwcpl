import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { logActivity } from '../middleware/audit';

const router = Router();

// Helper: Check if user is central/ops (can manage announcements)
const isCentralUser = (user: any): boolean => {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return (
    role === 'SUPER_ADMIN' ||
    role === 'MANAGEMENT' ||
    user.department_code === 'OPERATION' ||
    user.department_code === 'OPS'
  );
};

// ============================================================
// 1. GET /api/information - List announcements
// ============================================================
router.get('/', authenticate, requirePermission('information.view'), async (req: Request, res: Response) => {
  try {
    const { type, priority, status, search, pinned_only } = req.query;
    const user = req.user!;
    const isOps = isCentralUser(user);
    const branchId = user.branch_id;

    const whereClauses: string[] = [];
    const params: any[] = [user.id]; // $1 = user.id

    // Audience filtering for branch users
    if (!isOps) {
      // Non-ops users only see PUBLISHED items that have arrived at or past publish_at and not expired
      whereClauses.push(`i.status = 'PUBLISHED'`);
      whereClauses.push(`i.publish_at <= CURRENT_TIMESTAMP`);
      whereClauses.push(`(i.expires_at IS NULL OR i.expires_at >= CURRENT_TIMESTAMP)`);

      if (branchId) {
        params.push(branchId);
        const bIdx = params.length;
        whereClauses.push(`(
          i.target_type = 'ALL_BRANCHES' OR 
          EXISTS (SELECT 1 FROM information_branches ib WHERE ib.information_id = i.id AND ib.branch_id = $${bIdx})
        )`);
      } else {
        whereClauses.push(`i.target_type = 'ALL_BRANCHES'`);
      }
    } else {
      // Ops user can filter by status
      if (status && status !== 'ALL' && status !== 'All') {
        params.push(status);
        whereClauses.push(`i.status = $${params.length}`);
      }
    }

    if (type && type !== 'ALL' && type !== 'All') {
      params.push(type);
      whereClauses.push(`i.type = $${params.length}`);
    }

    if (priority && priority !== 'ALL' && priority !== 'All') {
      params.push(priority);
      whereClauses.push(`i.priority = $${params.length}`);
    }

    if (pinned_only === 'true' || pinned_only === '1') {
      whereClauses.push(`i.is_pinned = TRUE`);
    }

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      const pIdx = params.length;
      whereClauses.push(`(i.title ILIKE $${pIdx} OR i.content ILIKE $${pIdx})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        i.*,
        u.full_name as created_by_name,
        u.username as created_by_username,
        EXISTS (
          SELECT 1 FROM information_reads ir 
          WHERE ir.information_id = i.id AND ir.user_id = $1
        ) as is_read,
        (
          SELECT COUNT(*) FROM information_reads ir2 
          WHERE ir2.information_id = i.id
        ) as read_count,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', b.id, 'name', b.name, 'code', b.code))
            FROM information_branches ib
            JOIN branches b ON ib.branch_id = b.id
            WHERE ib.information_id = i.id
          ),
          '[]'::json
        ) as target_branches
      FROM information i
      LEFT JOIN users u ON i.created_by_id = u.id
      ${whereSql}
      ORDER BY i.is_pinned DESC, i.publish_at DESC, i.created_at DESC
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      information: result.rows,
    });
  } catch (err: any) {
    console.error('Error fetching information:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 2. GET /api/information/unread-count - Count of unread notices
// ============================================================
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isOps = isCentralUser(user);
    const branchId = user.branch_id;

    const whereClauses: string[] = [
      `i.status = 'PUBLISHED'`,
      `i.publish_at <= CURRENT_TIMESTAMP`,
      `(i.expires_at IS NULL OR i.expires_at >= CURRENT_TIMESTAMP)`,
      `NOT EXISTS (SELECT 1 FROM information_reads ir WHERE ir.information_id = i.id AND ir.user_id = $1)`,
    ];
    const params: any[] = [user.id];

    if (!isOps && branchId) {
      params.push(branchId);
      whereClauses.push(`(
        i.target_type = 'ALL_BRANCHES' OR 
        EXISTS (SELECT 1 FROM information_branches ib WHERE ib.information_id = i.id AND ib.branch_id = $2)
      )`);
    }

    const query = `
      SELECT COUNT(*) as unread_count 
      FROM information i 
      WHERE ${whereClauses.join(' AND ')}
    `;

    const result = await db.query(query, params);
    return res.json({
      success: true,
      unreadCount: parseInt(result.rows[0].unread_count, 10),
    });
  } catch (err: any) {
    console.error('Error getting unread count:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 3. GET /api/information/:id - Detail & Auto Mark Read
// ============================================================
router.get('/:id', authenticate, requirePermission('information.view'), async (req: Request, res: Response) => {
  try {
    const infoId = parseInt(req.params.id, 10);
    const user = req.user!;

    const query = `
      SELECT 
        i.*,
        u.full_name as created_by_name,
        u.username as created_by_username,
        EXISTS (
          SELECT 1 FROM information_reads ir 
          WHERE ir.information_id = i.id AND ir.user_id = $1
        ) as is_read,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', b.id, 'name', b.name, 'code', b.code))
            FROM information_branches ib
            JOIN branches b ON ib.branch_id = b.id
            WHERE ib.information_id = i.id
          ),
          '[]'::json
        ) as target_branches
      FROM information i
      LEFT JOIN users u ON i.created_by_id = u.id
      WHERE i.id = $2
    `;

    const result = await db.query(query, [user.id, infoId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Information item not found.' });
    }

    // Auto mark as read in information_reads
    await db.query(
      `INSERT INTO information_reads (information_id, user_id, read_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (information_id, user_id) DO NOTHING`,
      [infoId, user.id]
    );

    // Auto mark user's notifications for share-information as read
    await db.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = $1 AND (link = '/share-information' OR link LIKE '/share-information%')`,
      [user.id]
    );

    return res.json({
      success: true,
      information: {
        ...result.rows[0],
        is_read: true,
      },
    });
  } catch (err: any) {
    console.error('Error fetching information detail:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 4. POST /api/information - Create Announcement
// ============================================================
router.post(
  '/',
  authenticate,
  requirePermission('information.create'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'attachment', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        type,
        priority,
        status,
        target_type,
        is_pinned,
        content,
        publish_at,
        expires_at,
        branch_ids,
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Title and content are required.' });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageUrl = files?.['image'] ? `/uploads/${files['image'][0].filename}` : null;
      const attachmentUrl = files?.['attachment'] ? `/uploads/${files['attachment'][0].filename}` : null;

      const isPinnedBool = is_pinned === true || is_pinned === 'true' || is_pinned === '1';
      const finalStatus = status || 'PUBLISHED';
      const targetType = target_type || 'ALL_BRANCHES';
      const publishAt = publish_at || new Date().toISOString();

      const ins = await db.query(
        `INSERT INTO information
          (title, type, priority, status, target_type, is_pinned, content, image_url, attachment_url, publish_at, expires_at, created_by_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          String(title).trim(),
          type || 'GENERAL',
          priority || 'Medium',
          finalStatus,
          targetType,
          isPinnedBool,
          content,
          imageUrl,
          attachmentUrl,
          publishAt,
          expires_at || null,
          req.user!.id,
        ]
      );

      const newInfo = ins.rows[0];

      // Parse branch_ids if target_type is SELECTED_BRANCHES
      let selectedBranches: number[] = [];
      if (targetType === 'SELECTED_BRANCHES' && branch_ids) {
        try {
          selectedBranches = Array.isArray(branch_ids) ? branch_ids : JSON.parse(branch_ids);
        } catch {
          if (typeof branch_ids === 'string') {
            selectedBranches = branch_ids.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));
          }
        }

        for (const bId of selectedBranches) {
          await db.query(
            `INSERT INTO information_branches (information_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newInfo.id, bId]
          );
        }
      }

      // If status is PUBLISHED, dispatch notifications to relevant users
      if (finalStatus === 'PUBLISHED') {
        let recipientUsersQuery = '';
        const notifParams: any[] = [];

        if (targetType === 'ALL_BRANCHES') {
          recipientUsersQuery = `SELECT id FROM users WHERE status = 'Active' AND id != $1`;
          notifParams.push(req.user!.id);
        } else if (selectedBranches.length > 0) {
          recipientUsersQuery = `SELECT id FROM users WHERE status = 'Active' AND id != $1 AND branch_id = ANY($2::int[])`;
          notifParams.push(req.user!.id, selectedBranches);
        }

        if (recipientUsersQuery) {
          const recipients = await db.query(recipientUsersQuery, notifParams);
          const snippet = content.length > 120 ? content.substring(0, 117) + '...' : content;

          for (const u of recipients.rows) {
            await db.query(
              `INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at)
               VALUES ($1, $2, $3, 'INFORMATION', '/share-information', FALSE, CURRENT_TIMESTAMP)`,
              [u.id, `📢 ${type || 'Notice'}: ${title}`, snippet]
            );
          }
        }
      }

      await logActivity({
        userId: req.user!.id,
        action: 'CREATE_INFORMATION',
        module: 'Share Information',
        recordId: newInfo.id,
        details: { title, type, priority, status: finalStatus, targetType },
        req,
      });

      return res.status(201).json({
        success: true,
        message: 'Information created and broadcast successfully.',
        information: newInfo,
      });
    } catch (err: any) {
      console.error('Error creating information:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================
// 5. PUT /api/information/:id - Update Announcement
// ============================================================
router.put(
  '/:id',
  authenticate,
  requirePermission('information.edit'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'attachment', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const infoId = parseInt(req.params.id, 10);
      const existing = await db.query(`SELECT * FROM information WHERE id = $1`, [infoId]);
      if (existing.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Information not found.' });
      }

      const prev = existing.rows[0];
      const {
        title,
        type,
        priority,
        status,
        target_type,
        is_pinned,
        content,
        publish_at,
        expires_at,
        branch_ids,
      } = req.body;

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageUrl = files?.['image'] ? `/uploads/${files['image'][0].filename}` : prev.image_url;
      const attachmentUrl = files?.['attachment'] ? `/uploads/${files['attachment'][0].filename}` : prev.attachment_url;

      const isPinnedBool = is_pinned !== undefined ? (is_pinned === true || is_pinned === 'true' || is_pinned === '1') : prev.is_pinned;

      const upd = await db.query(
        `UPDATE information
         SET title = COALESCE($1, title),
             type = COALESCE($2, type),
             priority = COALESCE($3, priority),
             status = COALESCE($4, status),
             target_type = COALESCE($5, target_type),
             is_pinned = $6,
             content = COALESCE($7, content),
             image_url = $8,
             attachment_url = $9,
             publish_at = COALESCE($10, publish_at),
             expires_at = $11,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $12
         RETURNING *`,
        [
          title ? String(title).trim() : null,
          type || null,
          priority || null,
          status || null,
          target_type || null,
          isPinnedBool,
          content || null,
          imageUrl,
          attachmentUrl,
          publish_at || null,
          expires_at !== undefined ? expires_at : prev.expires_at,
          infoId,
        ]
      );

      // If branch_ids updated
      if (branch_ids !== undefined) {
        await db.query(`DELETE FROM information_branches WHERE information_id = $1`, [infoId]);
        if (target_type === 'SELECTED_BRANCHES' || (!target_type && prev.target_type === 'SELECTED_BRANCHES')) {
          let branchesArr: number[] = [];
          try {
            branchesArr = Array.isArray(branch_ids) ? branch_ids : JSON.parse(branch_ids);
          } catch {
            if (typeof branch_ids === 'string') {
              branchesArr = branch_ids.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));
            }
          }
          for (const bId of branchesArr) {
            await db.query(
              `INSERT INTO information_branches (information_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [infoId, bId]
            );
          }
        }
      }

      await logActivity({
        userId: req.user!.id,
        action: 'UPDATE_INFORMATION',
        module: 'Share Information',
        recordId: infoId,
        details: { title, status },
        req,
      });

      return res.json({
        success: true,
        message: 'Information updated successfully.',
        information: upd.rows[0],
      });
    } catch (err: any) {
      console.error('Error updating information:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================
// 6. PUT /api/information/:id/pin - Toggle Pinned Status
// ============================================================
router.put('/:id/pin', authenticate, requirePermission('information.pin'), async (req: Request, res: Response) => {
  try {
    const infoId = parseInt(req.params.id, 10);
    const existing = await db.query(`SELECT id, is_pinned, title FROM information WHERE id = $1`, [infoId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Information not found.' });
    }

    const nextPinState = !existing.rows[0].is_pinned;
    await db.query(`UPDATE information SET is_pinned = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
      nextPinState,
      infoId,
    ]);

    await logActivity({
      userId: req.user!.id,
      action: nextPinState ? 'PIN_INFORMATION' : 'UNPIN_INFORMATION',
      module: 'Share Information',
      recordId: infoId,
      details: { is_pinned: nextPinState },
      req,
    });

    return res.json({
      success: true,
      message: nextPinState ? 'Information pinned to top highlights.' : 'Information unpinned.',
      is_pinned: nextPinState,
    });
  } catch (err: any) {
    console.error('Error toggling pin state:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 7. DELETE /api/information/:id - Delete Announcement
// ============================================================
router.delete('/:id', authenticate, requirePermission('information.delete'), async (req: Request, res: Response) => {
  try {
    const infoId = parseInt(req.params.id, 10);
    const existing = await db.query(`SELECT id, title FROM information WHERE id = $1`, [infoId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Information not found.' });
    }

    await db.query(`DELETE FROM information WHERE id = $1`, [infoId]);

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_INFORMATION',
      module: 'Share Information',
      recordId: infoId,
      details: { title: existing.rows[0].title },
      req,
    });

    return res.json({ success: true, message: 'Information item removed successfully.' });
  } catch (err: any) {
    console.error('Error deleting information:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
