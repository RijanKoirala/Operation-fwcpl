import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, requirePermission, checkBranchAccess } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// GET /api/instructions
router.get('/', authenticate, requirePermission('commands.view'), async (req: Request, res: Response) => {
  const { branchId, status, priority, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    // Recipient scoping
    if (req.user?.role === 'STAFF') {
      params.push(req.user.id);
      const staffP = params.length;
      params.push(req.user.branchId || -1);
      const branchP = params.length;
      whereClauses.push(`(i.recipient_staff_id = $${staffP} OR (i.recipient_type = 'Branch' AND i.branch_id = $${branchP}))`);
    } else if (req.user?.role === 'BRANCH_MANAGER') {
      if (req.user.branchId) {
        params.push(req.user.branchId);
        whereClauses.push(`i.branch_id = $${params.length}`);
      }
    } else if (branchId) {
      params.push(branchId);
      whereClauses.push(`i.branch_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`i.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      whereClauses.push(`i.priority = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(i.title ILIKE $${params.length} OR i.description ILIKE $${params.length} OR i.instruction_id ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM instructions i ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT i.*,
             b.name as branch_name, b.code as branch_code,
             s.full_name as sender_name, s.role as sender_role,
             r.full_name as recipient_staff_name
      FROM instructions i
      LEFT JOIN branches b ON i.branch_id = b.id
      LEFT JOIN users s ON i.sender_id = s.id
      LEFT JOIN users r ON i.recipient_staff_id = r.id
      ${whereSql}
      ORDER BY i.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      instructions: result.rows,
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

// GET /api/instructions/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const instructionId = parseInt(req.params.id, 10);

  try {
    const resInst = await db.query(
      `SELECT i.*,
              b.name as branch_name, b.code as branch_code,
              s.full_name as sender_name, s.role as sender_role,
              r.full_name as recipient_staff_name
       FROM instructions i
       LEFT JOIN branches b ON i.branch_id = b.id
       LEFT JOIN users s ON i.sender_id = s.id
       LEFT JOIN users r ON i.recipient_staff_id = r.id
       WHERE i.id = $1`,
      [instructionId]
    );

    if (resInst.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Instruction not found.' });
    }

    const commentsRes = await db.query(
      `SELECT ic.*, u.full_name as author_name, u.role as author_role
       FROM instruction_comments ic
       LEFT JOIN users u ON ic.user_id = u.id
       WHERE ic.instruction_id = $1
       ORDER BY ic.created_at ASC`,
      [instructionId]
    );

    return res.json({
      success: true,
      instruction: resInst.rows[0],
      comments: commentsRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/instructions
router.post('/', authenticate, requirePermission('commands.create'), async (req: Request, res: Response) => {
  const {
    title,
    description,
    recipientType = 'Branch',
    branchId,
    recipientStaffId,
    priority = 'Medium',
    dueDate,
  } = req.body;

  if (!title || !description || !branchId) {
    return res.status(400).json({ success: false, message: 'Title, description, and branch are required.' });
  }

  let finalBranchId = branchId;
  if (req.user?.role === 'BRANCH_MANAGER') {
    finalBranchId = req.user.branchId;
  }

  try {
    const code = `INS-${Date.now().toString().slice(-6)}`;

    const result = await db.query(
      `INSERT INTO instructions (instruction_id, title, description, sender_id, recipient_type, branch_id, recipient_staff_id, priority, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'New', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [code, title.trim(), description.trim(), req.user!.id, recipientType, finalBranchId, recipientStaffId || null, priority, dueDate || null]
    );

    const newInstruction = result.rows[0];

    // Create notifications for branch staff or specific recipient
    if (recipientStaffId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES ($1, $2, $3, 'INSTRUCTION', $4, CURRENT_TIMESTAMP)`,
        [recipientStaffId, 'New Directive from Management', `Instruction: "${title}"`, `/instructions`]
      );
    } else {
      // Notify branch manager
      const mgrRes = await db.query('SELECT manager_id FROM branches WHERE id = $1', [finalBranchId]);
      if (mgrRes.rowCount > 0 && mgrRes.rows[0].manager_id) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, link, created_at)
           VALUES ($1, $2, $3, 'INSTRUCTION', $4, CURRENT_TIMESTAMP)`,
          [mgrRes.rows[0].manager_id, 'Management Directive for Your Branch', `Instruction: "${title}"`, `/instructions`]
        );
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'SEND_INSTRUCTION',
      module: 'INSTRUCTIONS',
      recordId: newInstruction.id,
      details: { instructionId: code, title, branchId: finalBranchId },
      req,
    });

    return res.status(201).json({ success: true, instruction: newInstruction });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/instructions/:id/acknowledge
router.put('/:id/acknowledge', authenticate, async (req: Request, res: Response) => {
  const instructionId = parseInt(req.params.id, 10);

  try {
    const result = await db.query(
      `UPDATE instructions
       SET status = 'Acknowledged',
           acknowledged_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [instructionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Instruction not found.' });
    }

    await logActivity({
      userId: req.user!.id,
      action: 'ACKNOWLEDGE_INSTRUCTION',
      module: 'INSTRUCTIONS',
      recordId: instructionId,
      req,
    });

    return res.json({ success: true, instruction: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/instructions/:id/complete
router.put('/:id/complete', authenticate, async (req: Request, res: Response) => {
  const instructionId = parseInt(req.params.id, 10);
  const { remarks, attachments } = req.body;

  try {
    const result = await db.query(
      `UPDATE instructions
       SET status = 'Completed',
           completed_at = CURRENT_TIMESTAMP,
           remarks = COALESCE($1, remarks),
           attachments = COALESCE($2, attachments),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [remarks || null, attachments ? JSON.stringify(attachments) : null, instructionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Instruction not found.' });
    }

    await logActivity({
      userId: req.user!.id,
      action: 'COMPLETE_INSTRUCTION',
      module: 'INSTRUCTIONS',
      recordId: instructionId,
      details: { remarks },
      req,
    });

    return res.json({ success: true, instruction: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/instructions/:id/comments
router.post('/:id/comments', authenticate, async (req: Request, res: Response) => {
  const instructionId = parseInt(req.params.id, 10);
  const { comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content is required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO instruction_comments (instruction_id, user_id, comment, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [instructionId, req.user!.id, comment.trim()]
    );

    return res.status(201).json({ success: true, comment: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
