import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { sendGoodsRequestEmail } from '../services/emailService';

const router = Router();
router.use(authenticate);

// Helper to generate sequential request number format GR-YYYY-000001
const generateRequestNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `GR-${currentYear}-`;

  const lastRes = await db.query(
    `SELECT request_number FROM goods_requests WHERE request_number LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (lastRes.rowCount > 0) {
    const lastNum = lastRes.rows[0].request_number;
    const parts = lastNum.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
};

// GET /api/goods-requests/stats/summary - Summary metrics for dashboards
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = user.role === 'SUPER_ADMIN' || user.roleName === 'Super Admin';
    const canViewAll = isSuper || Boolean(user.permissions['goods_requests.view_all']) || user.departmentName === 'OPERATION' || user.departmentCode === 'OPERATION';

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (!canViewAll) {
      const branchIds = user.assignedBranchIds && user.assignedBranchIds.length > 0
        ? user.assignedBranchIds
        : (user.branchId ? [user.branchId] : []);

      if (branchIds.length > 0) {
        params.push(branchIds);
        whereClauses.push(`branch_id = ANY($${params.length})`);
      } else {
        whereClauses.push('1 = 0');
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
        COUNT(*) FILTER (WHERE status = 'PENDING' AND priority IN ('Urgent', 'Critical')) as urgent_count,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted_count,
        COUNT(*) FILTER (WHERE status = 'PARTIALLY ACCEPTED') as partially_accepted_count,
        COUNT(*) FILTER (WHERE status = 'DENIED') as denied_count,
        COUNT(*) FILTER (WHERE status IN ('ACCEPTED', 'PARTIALLY ACCEPTED')) as awaiting_fulfillment_count,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
        COUNT(*) as total_count
      FROM goods_requests
      ${whereSql}
    `;

    const result = await db.query(query, params);
    const stats = result.rows[0] || {};

    return res.json({
      success: true,
      stats: {
        pendingCount: parseInt(stats.pending_count || '0', 10),
        urgentCount: parseInt(stats.urgent_count || '0', 10),
        acceptedCount: parseInt(stats.accepted_count || '0', 10),
        partiallyAcceptedCount: parseInt(stats.partially_accepted_count || '0', 10),
        deniedCount: parseInt(stats.denied_count || '0', 10),
        awaitingFulfillmentCount: parseInt(stats.awaiting_fulfillment_count || '0', 10),
        completedCount: parseInt(stats.completed_count || '0', 10),
        totalCount: parseInt(stats.total_count || '0', 10),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/goods-requests - List requisitions with filters
router.get('/', requirePermission('goods_requests.view', 'goods_requests.view_branch', 'goods_requests.view_all'), async (req: Request, res: Response) => {
  const { search, branchId, status, priority, startDate, endDate, item, requestedBy, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  try {
    const user = req.user!;
    const isSuper = user.role === 'SUPER_ADMIN' || user.roleName === 'Super Admin';
    const canViewAll = isSuper || Boolean(user.permissions['goods_requests.view_all']) || user.departmentName === 'OPERATION' || user.departmentCode === 'OPERATION';

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Branch scoping
    if (!canViewAll) {
      const allowedIds = user.assignedBranchIds && user.assignedBranchIds.length > 0
        ? user.assignedBranchIds
        : (user.branchId ? [user.branchId] : []);

      if (allowedIds.length > 0) {
        params.push(allowedIds);
        whereClauses.push(`gr.branch_id = ANY($${params.length})`);
      } else {
        whereClauses.push('1 = 0');
      }
    } else if (branchId) {
      params.push(parseInt(branchId as string, 10));
      whereClauses.push(`gr.branch_id = $${params.length}`);
    }

    if (status) {
      if (status === 'AWAITING_FULFILLMENT') {
        whereClauses.push(`gr.status IN ('ACCEPTED', 'PARTIALLY ACCEPTED')`);
      } else {
        params.push(status);
        whereClauses.push(`gr.status = $${params.length}`);
      }
    }

    if (priority) {
      params.push(priority);
      whereClauses.push(`gr.priority = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(gr.request_number ILIKE $${params.length} OR b.name ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR gr.remarks ILIKE $${params.length})`);
    }

    if (startDate) {
      params.push(startDate);
      whereClauses.push(`gr.created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      whereClauses.push(`gr.created_at <= $${params.length}`);
    }

    if (requestedBy) {
      params.push(requestedBy);
      whereClauses.push(`u.full_name ILIKE $${params.length}`);
    }

    if (item) {
      params.push(`%${item}%`);
      whereClauses.push(`EXISTS (SELECT 1 FROM goods_request_items gri WHERE gri.request_id = gr.id AND gri.item_name_snapshot ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) as count
       FROM goods_requests gr
       LEFT JOIN branches b ON gr.branch_id = b.id
       LEFT JOIN users u ON gr.requested_by = u.id
       ${whereSql}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT gr.*,
             b.name as branch_name, b.code as branch_code,
             u.full_name as requested_by_name, u.username as requested_by_username,
             appr.full_name as approved_by_name,
             comp.full_name as completed_by_name,
             (SELECT COUNT(*) FROM goods_request_items WHERE request_id = gr.id) as items_count,
             (SELECT string_agg(item_name_snapshot || ' (' || requested_quantity || ' ' || unit_snapshot || ')', ', ')
              FROM (SELECT item_name_snapshot, requested_quantity, unit_snapshot FROM goods_request_items WHERE request_id = gr.id LIMIT 3) sub) as items_preview
      FROM goods_requests gr
      LEFT JOIN branches b ON gr.branch_id = b.id
      LEFT JOIN users u ON gr.requested_by = u.id
      LEFT JOIN users appr ON gr.approved_by = appr.id
      LEFT JOIN users comp ON gr.completed_by = comp.id
      ${whereSql}
      ORDER BY 
        CASE gr.status
          WHEN 'PENDING' THEN 1
          WHEN 'PARTIALLY ACCEPTED' THEN 2
          WHEN 'ACCEPTED' THEN 3
          WHEN 'DRAFT' THEN 4
          ELSE 5
        END,
        CASE gr.priority
          WHEN 'Critical' THEN 1
          WHEN 'Urgent' THEN 2
          ELSE 3
        END,
        gr.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      requests: result.rows,
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

// GET /api/goods-requests/:id - Detailed request profile with items and history timeline
router.get('/:id', async (req: Request, res: Response) => {
  const reqId = parseInt(req.params.id, 10);
  if (isNaN(reqId)) return res.status(400).json({ success: false, message: 'Invalid request ID' });

  try {
    const user = req.user!;
    const isSuper = user.role === 'SUPER_ADMIN' || user.roleName === 'Super Admin';
    const canViewAll = isSuper || Boolean(user.permissions['goods_requests.view_all']) || user.departmentName === 'OPERATION' || user.departmentCode === 'OPERATION';

    const reqRes = await db.query(
      `SELECT gr.*,
              b.name as branch_name, b.code as branch_code, b.city as branch_city,
              u.full_name as requested_by_name, u.username as requested_by_username, u.email as requested_by_email, u.phone as requested_by_phone,
              appr.full_name as approved_by_name,
              den.full_name as denied_by_name,
              comp.full_name as completed_by_name
       FROM goods_requests gr
       LEFT JOIN branches b ON gr.branch_id = b.id
       LEFT JOIN users u ON gr.requested_by = u.id
       LEFT JOIN users appr ON gr.approved_by = appr.id
       LEFT JOIN users den ON gr.denied_by = den.id
       LEFT JOIN users comp ON gr.completed_by = comp.id
       WHERE gr.id = $1`,
      [reqId]
    );

    if (reqRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Goods request not found.' });
    }

    const requestData = reqRes.rows[0];

    // Branch scoping verification
    if (!canViewAll) {
      const allowedIds = user.assignedBranchIds && user.assignedBranchIds.length > 0
        ? user.assignedBranchIds
        : (user.branchId ? [user.branchId] : []);
      if (!allowedIds.includes(requestData.branch_id)) {
        return res.status(403).json({ success: false, message: 'Access denied to this branch requisition.' });
      }
    }

    // Fetch items
    const itemsRes = await db.query(
      `SELECT gri.*, gi.category, gi.active as item_is_active
       FROM goods_request_items gri
       LEFT JOIN goods_items gi ON gri.goods_item_id = gi.id
       WHERE gri.request_id = $1
       ORDER BY gri.id ASC`,
      [reqId]
    );

    // Fetch history
    const historyRes = await db.query(
      `SELECT grh.*, u.full_name as user_name, u.username
       FROM goods_request_history grh
       LEFT JOIN users u ON grh.user_id = u.id
       WHERE grh.request_id = $1
       ORDER BY grh.id ASC`,
      [reqId]
    );

    return res.json({
      success: true,
      request: requestData,
      items: itemsRes.rows,
      history: historyRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/goods-requests - Create new goods request
router.post('/', requirePermission('goods_requests.create'), async (req: Request, res: Response) => {
  const user = req.user!;
  const { branchId, priority = 'Normal', status = 'PENDING', requiredBy, remarks, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item is required in the request.' });
  }

  // Branch assignment and verification
  let targetBranchId: number;
  const isSuper = user.role === 'SUPER_ADMIN' || user.roleName === 'Super Admin';
  const isOperation = user.departmentName === 'OPERATION' || user.departmentCode === 'OPERATION';

  if (branchId && (isSuper || isOperation)) {
    targetBranchId = parseInt(String(branchId), 10);
  } else {
    // Normal Branch user: automatically locked to assigned branch
    if (user.branchId) {
      targetBranchId = user.branchId;
    } else if (user.assignedBranchIds && user.assignedBranchIds.length > 0) {
      targetBranchId = user.assignedBranchIds[0];
    } else {
      return res.status(400).json({ success: false, message: 'You have no assigned branch to submit requisitions for.' });
    }

    if (branchId && parseInt(String(branchId), 10) !== targetBranchId) {
      return res.status(403).json({ success: false, message: 'Branch users cannot submit requests on behalf of other branches.' });
    }
  }

  try {
    // Validate quantities according to goods item rules
    for (const item of items) {
      if (!item.goodsItemId) {
        return res.status(400).json({ success: false, message: 'Item ID is required for each line.' });
      }

      const gRes = await db.query(`SELECT * FROM goods_items WHERE id = $1`, [item.goodsItemId]);
      if (gRes.rowCount === 0) {
        return res.status(400).json({ success: false, message: `Goods item #${item.goodsItemId} not found.` });
      }
      const gItem = gRes.rows[0];

      const qty = Number(item.requestedQuantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: `Invalid requested quantity for "${gItem.name}". Must be greater than 0.` });
      }

      if (gItem.quantity_type === 'Integer' && !Number.isInteger(qty)) {
        return res.status(400).json({
          success: false,
          message: `Quantity for "${gItem.name}" must be an integer (${gItem.unit}). Fractional values like ${qty} are not allowed.`,
        });
      }
    }

    const requestNumber = await generateRequestNumber();
    const initialStatus = status === 'DRAFT' ? 'DRAFT' : 'PENDING';

    const insReq = await db.query(
      `INSERT INTO goods_requests (request_number, branch_id, requested_by, priority, status, required_by, remarks, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        requestNumber,
        targetBranchId,
        user.id,
        priority || 'Normal',
        initialStatus,
        requiredBy || null,
        remarks || null,
      ]
    );

    const newRequest = insReq.rows[0];

    // Insert items with snapshot
    for (const item of items) {
      const gRes = await db.query(`SELECT * FROM goods_items WHERE id = $1`, [item.goodsItemId]);
      const gItem = gRes.rows[0];
      const qty = Number(item.requestedQuantity);

      await db.query(
        `INSERT INTO goods_request_items (request_id, goods_item_id, item_name_snapshot, unit_snapshot, quantity_type_snapshot, requested_quantity, item_description, item_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          newRequest.id,
          gItem.id,
          gItem.name,
          gItem.unit,
          gItem.quantity_type,
          qty,
          item.itemDescription || null,
        ]
      );
    }

    // Insert history log
    await db.query(
      `INSERT INTO goods_request_history (request_id, user_id, action, previous_status, new_status, remarks, created_at)
       VALUES ($1, $2, $3, NULL, $4, $5, CURRENT_TIMESTAMP)`,
      [
        newRequest.id,
        user.id,
        initialStatus === 'DRAFT' ? 'CREATED_DRAFT' : 'SUBMITTED',
        initialStatus,
        initialStatus === 'DRAFT' ? 'Draft requisition created' : 'Requisition submitted for Operation review',
      ]
    );

    await logActivity({
      userId: user.id,
      action: 'GOODS_REQUEST_CREATED',
      module: 'GOODS_REQUESTS',
      recordId: newRequest.id,
      details: { requestNumber, branchId: targetBranchId, itemsCount: items.length, status: initialStatus },
      req,
    });

    // Notify Operation via email if requisition is submitted
    if (initialStatus === 'PENDING') {
      (async () => {
        try {
          const brRes = await db.query('SELECT name FROM branches WHERE id = $1', [targetBranchId]);
          const branchName = brRes.rows[0]?.name || 'Branch';
          const itemsRes = await db.query(
            'SELECT item_name_snapshot, requested_quantity, unit_snapshot, item_description FROM goods_request_items WHERE request_id = $1',
            [newRequest.id]
          );
          await sendGoodsRequestEmail({
            requestNumber,
            branchName,
            priority: priority || 'Normal',
            requiredBy: requiredBy || null,
            remarks: remarks || null,
            requestedByName: user.fullName || user.username || 'Branch Staff',
            requestedByPhone: user.phone || null,
            requestedByEmail: user.email || null,
            items: itemsRes.rows,
          });
        } catch (emailErr: any) {
          console.error('[GoodsRequest] Email notification dispatch error:', emailErr.message);
        }
      })();
    }

    return res.status(201).json({
      success: true,
      message: initialStatus === 'DRAFT' ? 'Draft requisition saved.' : 'Goods requisition submitted successfully.',
      request: newRequest,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/goods-requests/:id - Edit draft or eligible pending request
router.put('/:id', requirePermission('goods_requests.edit'), async (req: Request, res: Response) => {
  const reqId = parseInt(req.params.id, 10);
  const user = req.user!;
  const { priority, requiredBy, remarks, status, items } = req.body;

  try {
    const existingRes = await db.query(`SELECT * FROM goods_requests WHERE id = $1`, [reqId]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    const current = existingRes.rows[0];

    // Branch users cannot edit if already accepted, partially accepted, completed, or denied
    if (['ACCEPTED', 'PARTIALLY ACCEPTED', 'COMPLETED', 'DENIED', 'CANCELLED'].includes(current.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit request in '${current.status}' status. Requisition has already been processed.`,
      });
    }

    // If status change from DRAFT to PENDING
    let nextStatus = current.status;
    if (current.status === 'DRAFT' && status === 'PENDING') {
      nextStatus = 'PENDING';
    }

    await db.query(
      `UPDATE goods_requests
       SET priority = COALESCE($1, priority),
           required_by = $2,
           remarks = COALESCE($3, remarks),
           status = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [priority || null, requiredBy || null, remarks || null, nextStatus, reqId]
    );

    // If items provided and currently in DRAFT or PENDING, update items
    if (Array.isArray(items) && items.length > 0) {
      await db.query(`DELETE FROM goods_request_items WHERE request_id = $1`, [reqId]);

      for (const item of items) {
        const gRes = await db.query(`SELECT * FROM goods_items WHERE id = $1`, [item.goodsItemId]);
        const gItem = gRes.rows[0];
        const qty = Number(item.requestedQuantity);

        if (gItem.quantity_type === 'Integer' && !Number.isInteger(qty)) {
          return res.status(400).json({
            success: false,
            message: `Quantity for "${gItem.name}" must be an integer (${gItem.unit}).`,
          });
        }

        await db.query(
          `INSERT INTO goods_request_items (request_id, goods_item_id, item_name_snapshot, unit_snapshot, quantity_type_snapshot, requested_quantity, item_description, item_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            reqId,
            gItem.id,
            gItem.name,
            gItem.unit,
            gItem.quantity_type,
            qty,
            item.itemDescription || null,
          ]
        );
      }
    }

    await db.query(
      `INSERT INTO goods_request_history (request_id, user_id, action, previous_status, new_status, remarks, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        reqId,
        user.id,
        nextStatus === 'PENDING' && current.status === 'DRAFT' ? 'SUBMITTED' : 'UPDATED',
        current.status,
        nextStatus,
        nextStatus === 'PENDING' && current.status === 'DRAFT' ? 'Draft submitted for Operation review' : 'Requisition details amended',
      ]
    );

    await logActivity({
      userId: user.id,
      action: 'GOODS_REQUEST_UPDATED',
      module: 'GOODS_REQUESTS',
      recordId: reqId,
      details: { status: nextStatus },
      req,
    });

    if (nextStatus === 'PENDING' && current.status === 'DRAFT') {
      (async () => {
        try {
          const brRes = await db.query('SELECT name FROM branches WHERE id = $1', [current.branch_id]);
          const branchName = brRes.rows[0]?.name || 'Branch';
          const itemsRes = await db.query(
            'SELECT item_name_snapshot, requested_quantity, unit_snapshot, item_description FROM goods_request_items WHERE request_id = $1',
            [reqId]
          );
          await sendGoodsRequestEmail({
            requestNumber: current.request_number,
            branchName,
            priority: priority || current.priority,
            requiredBy: requiredBy || current.required_by,
            remarks: remarks || current.remarks,
            requestedByName: user.fullName || user.username || 'Branch Staff',
            requestedByPhone: user.phone || null,
            requestedByEmail: user.email || null,
            items: itemsRes.rows,
          });
        } catch (emailErr: any) {
          console.error('[GoodsRequest] Email notification error on draft submit:', emailErr.message);
        }
      })();
    }

    return res.json({ success: true, message: 'Goods request updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/goods-requests/:id/cancel - Cancel pending request
router.put('/:id/cancel', requirePermission('goods_requests.cancel'), async (req: Request, res: Response) => {
  const reqId = parseInt(req.params.id, 10);
  const user = req.user!;
  const { reason } = req.body;

  try {
    const existing = await db.query(`SELECT * FROM goods_requests WHERE id = $1`, [reqId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const current = existing.rows[0];
    if (!['DRAFT', 'PENDING'].includes(current.status)) {
      return res.status(400).json({
        success: false,
        message: `Only DRAFT or PENDING requests can be cancelled. Current status is ${current.status}.`,
      });
    }

    await db.query(`UPDATE goods_requests SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [reqId]);

    await db.query(
      `INSERT INTO goods_request_history (request_id, user_id, action, previous_status, new_status, remarks, created_at)
       VALUES ($1, $2, 'CANCELLED', $3, 'CANCELLED', $4, CURRENT_TIMESTAMP)`,
      [reqId, user.id, current.status, reason || 'Requisition cancelled by requester']
    );

    await logActivity({
      userId: user.id,
      action: 'GOODS_REQUEST_CANCELLED',
      module: 'GOODS_REQUESTS',
      recordId: reqId,
      details: { reason },
      req,
    });

    return res.json({ success: true, message: 'Requisition cancelled successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/goods-requests/:id/review - Operation review: Accept, Partial Accept, Deny
router.put('/:id/review', requirePermission('goods_requests.accept', 'goods_requests.partial_accept', 'goods_requests.deny'), async (req: Request, res: Response) => {
  const reqId = parseInt(req.params.id, 10);
  const user = req.user!;
  const { action, approvalRemarks, denialReason, itemDecisions } = req.body;
  // action can be: 'ACCEPT_ALL', 'PARTIAL_ACCEPT', 'DENY'

  try {
    const existing = await db.query(`SELECT * FROM goods_requests WHERE id = $1`, [reqId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const current = existing.rows[0];
    if (current.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Only PENDING requests can be reviewed. Current status is ${current.status}.`,
      });
    }

    const itemsRes = await db.query(`SELECT * FROM goods_request_items WHERE request_id = $1`, [reqId]);
    const items = itemsRes.rows;

    let finalStatus: 'ACCEPTED' | 'PARTIALLY ACCEPTED' | 'DENIED' = 'ACCEPTED';
    const historyNotes: string[] = [];

    // CASE 1: Complete Denial
    if (action === 'DENY') {
      if (!denialReason || !denialReason.trim()) {
        return res.status(400).json({ success: false, message: 'A denial reason is required when denying a request.' });
      }

      finalStatus = 'DENIED';
      await db.query(
        `UPDATE goods_requests
         SET status = 'DENIED',
             denied_by = $1,
             denied_at = CURRENT_TIMESTAMP,
             denial_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [user.id, denialReason.trim(), reqId]
      );

      // Set all items to 0 approved and DENIED
      for (const it of items) {
        await db.query(
          `UPDATE goods_request_items
           SET approved_quantity = 0,
               item_status = 'DENIED',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [it.id]
        );
      }

      await db.query(
        `INSERT INTO goods_request_history (request_id, user_id, action, previous_status, new_status, remarks, created_at)
         VALUES ($1, $2, 'DENIED', 'PENDING', 'DENIED', $3, CURRENT_TIMESTAMP)`,
        [reqId, user.id, `Requisition denied: ${denialReason.trim()}`]
      );

      return res.json({ success: true, message: 'Requisition denied.', status: 'DENIED' });
    }

    // CASE 2: Accept All
    if (action === 'ACCEPT_ALL') {
      finalStatus = 'ACCEPTED';

      for (const it of items) {
        await db.query(
          `UPDATE goods_request_items
           SET approved_quantity = requested_quantity,
               item_status = 'ACCEPTED',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [it.id]
        );
        historyNotes.push(`${it.item_name_snapshot}: ${it.requested_quantity} ${it.unit_snapshot} approved`);
      }

      await db.query(
        `UPDATE goods_requests
         SET status = 'ACCEPTED',
             approved_by = $1,
             approved_at = CURRENT_TIMESTAMP,
             approval_remarks = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [user.id, approvalRemarks || 'Fully accepted by Operation', reqId]
      );

      await db.query(
        `INSERT INTO goods_request_history (request_id, user_id, action, previous_status, new_status, remarks, created_at)
         VALUES ($1, $2, 'ACCEPTED', 'PENDING', 'ACCEPTED', $3, CURRENT_TIMESTAMP)`,
        [reqId, user.id, `Fully approved by Operation. ${approvalRemarks || ''}`.trim()]
      );

      return res.json({ success: true, message: 'Requisition accepted in full.', status: 'ACCEPTED' });
    }

    // CASE 3: Partial Acceptance / Item-by-item decisions
    if (!Array.isArray(itemDecisions) || itemDecisions.length === 0) {
      return res.status(400).json({ success: false, message: 'Item decisions are required for partial approval.' });
    }

    let allAccepted = true;
    let allDenied = true;

    for (const dec of itemDecisions) {
      const matchItem = items.find(i => i.id === dec.itemId);
      if (!matchItem) continue;

      const requested = Number(matchItem.requested_quantity);
      const approved = Number(dec.approvedQuantity);

      if (isNaN(approved) || approved < 0) {
        return res.status(400).json({
          success: false,
          message: `Approved quantity for "${matchItem.item_name_snapshot}" must be 0 or greater.`,
        });
      }

      if (approved > requested) {
        return res.status(400).json({
          success: false,
          message: `Approved quantity (${approved} ${matchItem.unit_snapshot}) cannot exceed requested quantity (${requested} ${matchItem.unit_snapshot}) for "${matchItem.item_name_snapshot}".`,
        });
      }

      // Quantity type validation on approved quantity
      if (matchItem.quantity_type_snapshot === 'Integer' && !Number.isInteger(approved)) {
        return res.status(400).json({
          success: false,
          message: `Approved quantity for "${matchItem.item_name_snapshot}" must be an integer (${matchItem.unit_snapshot}).`,
        });
      }

      let itemStatus = 'ACCEPTED';
      if (approved === 0) {
        itemStatus = 'DENIED';
        allAccepted = false;
      } else if (approved < requested) {
        itemStatus = 'PARTIAL';
        allAccepted = false;
        allDenied = false;
      } else {
        allDenied = false;
      }

      await db.query(
        `UPDATE goods_request_items
         SET approved_quantity = $1,
             item_status = $2,
             operation_remark = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [approved, itemStatus, dec.operationRemark || null, matchItem.id]
      );

      historyNotes.push(
        `${matchItem.item_name_snapshot}: ${requested} ${matchItem.unit_snapshot} requested, ${approved} approved`
      );
    }

    if (allAccepted) finalStatus = 'ACCEPTED';
    else if (allDenied) finalStatus = 'DENIED';
    else finalStatus = 'PARTIALLY ACCEPTED';

    await db.query(
      `UPDATE goods_requests
       SET status = $1,
           approved_by = $2,
           approved_at = CURRENT_TIMESTAMP,
           approval_remarks = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [finalStatus, user.id, approvalRemarks || null, reqId]
    );

    const historyRemarks = `${finalStatus === 'PARTIALLY ACCEPTED' ? 'Partially approved' : finalStatus}: ${historyNotes.join('; ')}. ${approvalRemarks || ''}`.trim();

    await db.query(
      `INSERT INTO goods_request_history (request_id, user_id, action, previous_status, new_status, remarks, created_at)
       VALUES ($1, $2, $3, 'PENDING', $4, $5, CURRENT_TIMESTAMP)`,
      [reqId, user.id, finalStatus.replace(/\s+/g, '_'), finalStatus, historyRemarks]
    );

    await logActivity({
      userId: user.id,
      action: 'GOODS_REQUEST_REVIEWED',
      module: 'GOODS_REQUESTS',
      recordId: reqId,
      details: { status: finalStatus, decisionsCount: itemDecisions.length },
      req,
    });

    return res.json({
      success: true,
      message: `Requisition set to ${finalStatus}.`,
      status: finalStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/goods-requests/:id/dispatch - Record delivered quantities & mark COMPLETED
router.put('/:id/dispatch', requirePermission('goods_requests.complete'), async (req: Request, res: Response) => {
  const reqId = parseInt(req.params.id, 10);
  const user = req.user!;
  const { deliveredItems, completionRemarks } = req.body;

  try {
    const existing = await db.query(`SELECT * FROM goods_requests WHERE id = $1`, [reqId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const current = existing.rows[0];
    if (!['ACCEPTED', 'PARTIALLY ACCEPTED'].includes(current.status)) {
      return res.status(400).json({
        success: false,
        message: `Only ACCEPTED or PARTIALLY ACCEPTED requests can be fulfilled. Current status is ${current.status}.`,
      });
    }

    const itemsRes = await db.query(`SELECT * FROM goods_request_items WHERE request_id = $1`, [reqId]);
    const items = itemsRes.rows;

    const deliveryNotes: string[] = [];

    if (Array.isArray(deliveredItems)) {
      for (const d of deliveredItems) {
        const matchItem = items.find(i => i.id === d.itemId);
        if (!matchItem) continue;

        const approved = Number(matchItem.approved_quantity ?? matchItem.requested_quantity);
        const delivered = Number(d.deliveredQuantity);

        if (isNaN(delivered) || delivered < 0) {
          return res.status(400).json({
            success: false,
            message: `Delivered quantity for "${matchItem.item_name_snapshot}" must be 0 or greater.`,
          });
        }

        if (delivered > approved) {
          return res.status(400).json({
            success: false,
            message: `Delivered quantity (${delivered} ${matchItem.unit_snapshot}) cannot exceed approved quantity (${approved} ${matchItem.unit_snapshot}) for "${matchItem.item_name_snapshot}".`,
          });
        }

        await db.query(
          `UPDATE goods_request_items
           SET delivered_quantity = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [delivered, matchItem.id]
        );

        deliveryNotes.push(`${matchItem.item_name_snapshot}: ${delivered} ${matchItem.unit_snapshot} delivered`);
      }
    } else {
      // Auto-deliver approved quantity
      for (const it of items) {
        const approved = Number(it.approved_quantity ?? it.requested_quantity);
        await db.query(
          `UPDATE goods_request_items
           SET delivered_quantity = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [approved, it.id]
        );
        deliveryNotes.push(`${it.item_name_snapshot}: ${approved} ${it.unit_snapshot} delivered`);
      }
    }

    await db.query(
      `UPDATE goods_requests
       SET status = 'COMPLETED',
           completed_by = $1,
           completed_at = CURRENT_TIMESTAMP,
           completion_remarks = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [user.id, completionRemarks || 'Goods dispatched and received', reqId]
    );

    const historyRemarks = `Goods fulfilled and completed: ${deliveryNotes.join('; ')}. ${completionRemarks || ''}`.trim();

    await db.query(
      `INSERT INTO goods_request_history (request_id, user_id, action, previous_status, new_status, remarks, created_at)
       VALUES ($1, $2, 'COMPLETED', $3, 'COMPLETED', $4, CURRENT_TIMESTAMP)`,
      [reqId, user.id, current.status, historyRemarks]
    );

    await logActivity({
      userId: user.id,
      action: 'GOODS_REQUEST_COMPLETED',
      module: 'GOODS_REQUESTS',
      recordId: reqId,
      details: { deliveryNotes },
      req,
    });

    return res.json({ success: true, message: 'Requisition fulfilled and completed successfully.', status: 'COMPLETED' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
