import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { logActivity } from '../middleware/audit';

const router = Router();

const isBranchUser = (user: any) => {
  if (!user) return false;
  const role = (user.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleName = (user.roleName || '').toUpperCase().replace(/\s+/g, '_');
  if (role === 'SUPER_ADMIN' || roleName === 'SUPER_ADMIN') return false;
  if (user.departmentCode === 'EXEC' || user.departmentCode === 'OPS' || user.departmentCode === 'NOC') return false;
  if (role === 'MANAGEMENT' || roleName === 'MANAGEMENT') return false;
  return Boolean(user.branchId);
};

// GET /api/discussions - List discussion topics
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, branchId, category, priority, search, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Branch scoping
    if (isBranchUser(req.user)) {
      params.push(req.user!.branchId);
      whereClauses.push(`dt.branch_id = $${params.length}`);
    } else if (branchId && branchId !== 'ALL') {
      params.push(parseInt(branchId as string, 10));
      whereClauses.push(`dt.branch_id = $${params.length}`);
    }

    // Status filter
    if (status && status !== 'ALL') {
      params.push(status);
      whereClauses.push(`dt.status = $${params.length}`);
    }

    // Category filter
    if (category && category !== 'ALL') {
      params.push(category);
      whereClauses.push(`dt.category = $${params.length}`);
    }

    // Priority filter
    if (priority && priority !== 'ALL') {
      params.push(priority);
      whereClauses.push(`dt.priority = $${params.length}`);
    }

    // Search query
    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(dt.title ILIKE $${params.length} OR dt.topic_number ILIKE $${params.length} OR dt.initial_message ILIKE $${params.length})`
      );
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) as count FROM discussion_topics dt ${whereSql}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    params.push(limitNum);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const query = `
      SELECT 
        dt.*,
        b.name as branch_name,
        b.code as branch_code,
        b.city as branch_city,
        u.full_name as created_by_name,
        u.username as created_by_username,
        u.role as created_by_role,
        (SELECT COUNT(*) FROM discussion_messages dm WHERE dm.topic_id = dt.id) as message_count,
        (
          SELECT json_build_object(
            'id', dm_last.id,
            'message', dm_last.message,
            'image_url', dm_last.image_url,
            'created_at', dm_last.created_at,
            'sender_name', u_last.full_name,
            'sender_role', u_last.role
          )
          FROM discussion_messages dm_last
          LEFT JOIN users u_last ON dm_last.sender_id = u_last.id
          WHERE dm_last.topic_id = dt.id
          ORDER BY dm_last.created_at DESC
          LIMIT 1
        ) as last_message
      FROM discussion_topics dt
      LEFT JOIN branches b ON dt.branch_id = b.id
      LEFT JOIN users u ON dt.created_by_id = u.id
      ${whereSql}
      ORDER BY dt.last_message_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    // Fallback for sqlite if json_build_object is not supported
    let topics = [];
    try {
      const result = await db.query(query, params);
      topics = result.rows;
    } catch {
      // Basic query for SQLite or simpler PG
      const simpleQuery = `
        SELECT 
          dt.*,
          b.name as branch_name,
          b.code as branch_code,
          b.city as branch_city,
          u.full_name as created_by_name,
          u.username as created_by_username,
          u.role as created_by_role,
          (SELECT COUNT(*) FROM discussion_messages dm WHERE dm.topic_id = dt.id) as message_count
        FROM discussion_topics dt
        LEFT JOIN branches b ON dt.branch_id = b.id
        LEFT JOIN users u ON dt.created_by_id = u.id
        ${whereSql}
        ORDER BY dt.last_message_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;
      const simpleRes = await db.query(simpleQuery, params);
      topics = simpleRes.rows;
    }

    // Quick stats summary
    let statsParams: any[] = [];
    let statsWhere = '';
    if (isBranchUser(req.user)) {
      statsParams.push(req.user!.branchId);
      statsWhere = 'WHERE branch_id = $1';
    }
    const statsRes = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'OPEN') as open_count,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_count
       FROM discussion_topics ${statsWhere}`,
      statsParams
    );
    const statsRow = statsRes.rows[0] || {};

    return res.json({
      success: true,
      topics,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      stats: {
        total: parseInt(statsRow.total || '0', 10),
        openCount: parseInt(statsRow.open_count || '0', 10),
        closedCount: parseInt(statsRow.closed_count || '0', 10),
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/discussions:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/discussions/:id - Topic details with message history
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    if (isNaN(topicId)) {
      return res.status(400).json({ success: false, message: 'Invalid discussion ID.' });
    }

    const topicRes = await db.query(
      `SELECT 
        dt.*,
        b.name as branch_name,
        b.code as branch_code,
        b.city as branch_city,
        u.full_name as created_by_name,
        u.username as created_by_username,
        u.role as created_by_role,
        u.phone as created_by_phone,
        dep.name as created_by_department,
        cb.full_name as closed_by_name
       FROM discussion_topics dt
       LEFT JOIN branches b ON dt.branch_id = b.id
       LEFT JOIN users u ON dt.created_by_id = u.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       LEFT JOIN users cb ON dt.closed_by_id = cb.id
       WHERE dt.id = $1`,
      [topicId]
    );

    if (topicRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Discussion topic not found.' });
    }

    const topic = topicRes.rows[0];

    // Branch authorization check
    if (isBranchUser(req.user) && topic.branch_id !== req.user!.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You only have access to your assigned branch discussions.',
      });
    }

    // Fetch messages
    const messagesRes = await db.query(
      `SELECT 
        dm.*,
        u.full_name as sender_name,
        u.username as sender_username,
        u.role as sender_role,
        u.phone as sender_phone,
        u.branch_id as sender_branch_id,
        dep.name as sender_department_name,
        dep.code as sender_department_code,
        b.name as sender_branch_name
       FROM discussion_messages dm
       LEFT JOIN users u ON dm.sender_id = u.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE dm.topic_id = $1
       ORDER BY dm.created_at ASC`,
      [topicId]
    );

    return res.json({
      success: true,
      topic,
      messages: messagesRes.rows,
    });
  } catch (err: any) {
    console.error('Error in GET /api/discussions/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/discussions - Create a new discussion topic
router.post('/', authenticate, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { title, category = 'General', priority = 'Medium', message, branchId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Discussion topic title is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Initial message description is required.' });
    }

    // Determine target branch
    let targetBranchId: number | null = null;
    if (isBranchUser(req.user)) {
      targetBranchId = req.user!.branchId;
    } else if (branchId) {
      targetBranchId = parseInt(branchId, 10);
    } else if (req.user?.branchId) {
      targetBranchId = req.user.branchId;
    }

    if (!targetBranchId) {
      // Default to branch 1 if completely unassigned
      targetBranchId = 1;
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Generate topic sequence: DISC-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const countRes = await db.query(`SELECT COUNT(*) as count FROM discussion_topics`);
    const nextSeq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
    const topicNumber = `DISC-${year}-${String(nextSeq).padStart(5, '0')}`;

    const topicRes = await db.query(
      `INSERT INTO discussion_topics 
        (topic_number, title, category, priority, status, branch_id, created_by_id, initial_message, image_url, last_message_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [topicNumber, title.trim(), category, priority, targetBranchId, req.user!.id, message.trim(), imageUrl]
    );

    const newTopic = topicRes.rows[0];

    // Also insert first message in discussion_messages
    await db.query(
      `INSERT INTO discussion_messages (topic_id, sender_id, message, image_url, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [newTopic.id, req.user!.id, message.trim(), imageUrl]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_DISCUSSION_TOPIC',
      module: 'Discussions',
      recordId: String(newTopic.id),
      details: `Started discussion topic "${title.trim()}" (${topicNumber})`,
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Discussion topic created successfully.',
      topic: newTopic,
    });
  } catch (err: any) {
    console.error('Error in POST /api/discussions:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/discussions/:id/messages - Reply in topic
router.post('/:id/messages', authenticate, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const { message } = req.body;

    if (!message || !message.trim()) {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Message content or image attachment is required.' });
      }
    }

    const topicRes = await db.query('SELECT * FROM discussion_topics WHERE id = $1', [topicId]);
    if (topicRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Discussion topic not found.' });
    }

    const topic = topicRes.rows[0];
    if (isBranchUser(req.user) && topic.branch_id !== req.user!.branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const msgText = (message || '').trim() || (imageUrl ? 'Attached photo' : '');

    const msgRes = await db.query(
      `INSERT INTO discussion_messages (topic_id, sender_id, message, image_url, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [topicId, req.user!.id, msgText, imageUrl]
    );

    // Update topic last_message_at and auto re-open if closed and someone replies
    await db.query(
      `UPDATE discussion_topics 
       SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [topicId]
    );

    const insertedMsg = msgRes.rows[0];

    // Enrich with sender details
    const enrichedRes = await db.query(
      `SELECT 
        dm.*,
        u.full_name as sender_name,
        u.username as sender_username,
        u.role as sender_role,
        u.branch_id as sender_branch_id,
        dep.name as sender_department_name,
        dep.code as sender_department_code,
        b.name as sender_branch_name
       FROM discussion_messages dm
       LEFT JOIN users u ON dm.sender_id = u.id
       LEFT JOIN departments dep ON u.department_id = dep.id
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE dm.id = $1`,
      [insertedMsg.id]
    );

    return res.status(201).json({
      success: true,
      message: enrichedRes.rows[0] || insertedMsg,
    });
  } catch (err: any) {
    console.error('Error in POST /api/discussions/:id/messages:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/discussions/:id/status - Close or Re-open discussion topic
router.put('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const { status, closure_reason } = req.body;

    if (!['OPEN', 'CLOSED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be OPEN or CLOSED.' });
    }

    const topicRes = await db.query('SELECT * FROM discussion_topics WHERE id = $1', [topicId]);
    if (topicRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Discussion topic not found.' });
    }

    const topic = topicRes.rows[0];
    if (isBranchUser(req.user) && topic.branch_id !== req.user!.branchId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let updateQuery = '';
    let updateParams: any[] = [];

    if (status === 'CLOSED') {
      updateQuery = `
        UPDATE discussion_topics 
        SET status = 'CLOSED',
            closed_by_id = $1,
            closed_at = CURRENT_TIMESTAMP,
            closure_reason = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      updateParams = [req.user!.id, closure_reason || 'Resolved', topicId];
    } else {
      updateQuery = `
        UPDATE discussion_topics 
        SET status = 'OPEN',
            closed_by_id = NULL,
            closed_at = NULL,
            closure_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      updateParams = [topicId];
    }

    const updatedRes = await db.query(updateQuery, updateParams);

    // Insert a system message recording the status change
    const actionText =
      status === 'CLOSED'
        ? `🔒 Topic was closed by ${req.user!.fullName || req.user!.username}${
            closure_reason ? ` (Reason: ${closure_reason})` : ''
          }`
        : `🔓 Topic was re-opened by ${req.user!.fullName || req.user!.username}`;

    await db.query(
      `INSERT INTO discussion_messages (topic_id, sender_id, message, is_internal, created_at)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)`,
      [topicId, req.user!.id, actionText]
    );

    await logActivity({
      userId: req.user!.id,
      action: status === 'CLOSED' ? 'CLOSE_DISCUSSION_TOPIC' : 'REOPEN_DISCUSSION_TOPIC',
      module: 'Discussions',
      recordId: String(topicId),
      details: actionText,
      req,
    });

    return res.json({
      success: true,
      message: `Topic ${status === 'CLOSED' ? 'closed' : 're-opened'} successfully.`,
      topic: updatedRes.rows[0],
    });
  } catch (err: any) {
    console.error('Error in PUT /api/discussions/:id/status:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
