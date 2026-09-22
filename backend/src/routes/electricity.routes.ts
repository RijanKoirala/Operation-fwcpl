import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { logActivity } from '../middleware/audit';

const router = Router();

// Helper: Check if user is restricted to their branch
const getUserBranchScope = (req: Request): number | null => {
  const user = req.user;
  if (!user) return null;
  const role = (user.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'MANAGEMENT' || (user as any).department_code === 'OPERATION') {
    return null; // All branches
  }
  return user.branch_id || null;
};

// ============================================================
// 1. GET /api/electricity/meters - List meters
// ============================================================
router.get('/meters', authenticate, requirePermission('electricity.view'), async (req: Request, res: Response) => {
  try {
    const { branch_id, status, meter_type, search } = req.query;
    const branchScope = getUserBranchScope(req);

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Scope check
    if (branchScope) {
      params.push(branchScope);
      whereClauses.push(`m.branch_id = $${params.length}`);
    } else if (branch_id && branch_id !== 'ALL' && branch_id !== 'All') {
      params.push(parseInt(String(branch_id), 10));
      whereClauses.push(`m.branch_id = $${params.length}`);
    }

    if (status && status !== 'ALL' && status !== 'All') {
      params.push(status);
      whereClauses.push(`m.status = $${params.length}`);
    }

    if (meter_type && meter_type !== 'ALL' && meter_type !== 'All') {
      params.push(meter_type);
      whereClauses.push(`m.meter_type = $${params.length}`);
    }

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      const pIdx = params.length;
      whereClauses.push(`(m.name ILIKE $${pIdx} OR m.meter_number ILIKE $${pIdx} OR m.location ILIKE $${pIdx} OR b.name ILIKE $${pIdx})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        m.*,
        b.name as branch_name,
        b.code as branch_code,
        u.full_name as created_by_name,
        (
          SELECT json_build_object(
            'id', r.id,
            'reading_date', r.reading_date,
            'current_reading', r.current_reading,
            'units_used', r.units_used,
            'image_url', r.image_url,
            'recorded_by_name', ru.full_name,
            'created_at', r.created_at
          )
          FROM electricity_readings r
          LEFT JOIN users ru ON r.recorded_by_id = ru.id
          WHERE r.meter_id = m.id
          ORDER BY r.reading_date DESC, r.id DESC
          LIMIT 1
        ) as latest_reading,
        COALESCE((SELECT SUM(r2.units_used) FROM electricity_readings r2 WHERE r2.meter_id = m.id), 0) as total_units_consumed,
        COALESCE((SELECT COUNT(*) FROM electricity_readings r3 WHERE r3.meter_id = m.id), 0) as total_readings_count,
        COALESCE((
          SELECT COUNT(*) FROM electricity_payments p 
          WHERE p.meter_id = m.id AND p.payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
        ), 0) as pending_bills_count
      FROM electricity_meters m
      JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.created_by_id = u.id
      ${whereSql}
      ORDER BY b.name ASC, m.name ASC
    `;

    const result = await db.query(query, params);
    return res.json({ success: true, meters: result.rows });
  } catch (err: any) {
    console.error('Error fetching electricity meters:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 2. POST /api/electricity/meters - Create new meter
// ============================================================
router.post('/meters', authenticate, requirePermission('electricity.meters.create'), async (req: Request, res: Response) => {
  try {
    const { branch_id, name, meter_number, meter_type, location, installation_date, status, description, remarks, initial_reading } = req.body;

    if (!branch_id || !name || !meter_number) {
      return res.status(400).json({ success: false, message: 'Branch, meter name, and meter number are required.' });
    }

    // Branch scoping
    const branchScope = getUserBranchScope(req);
    const targetBranchId = branchScope ? branchScope : parseInt(branch_id, 10);

    // Check duplicate meter_number for this branch
    const dupCheck = await db.query(
      `SELECT id FROM electricity_meters WHERE branch_id = $1 AND LOWER(meter_number) = LOWER($2)`,
      [targetBranchId, String(meter_number).trim()]
    );
    if (dupCheck.rowCount > 0) {
      return res.status(400).json({ success: false, message: `A meter with number '${meter_number}' already exists in this branch.` });
    }

    const ins = await db.query(
      `INSERT INTO electricity_meters 
        (branch_id, name, meter_number, meter_type, location, installation_date, status, description, remarks, created_by_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        targetBranchId,
        String(name).trim(),
        String(meter_number).trim(),
        meter_type || 'Main',
        location || null,
        installation_date || null,
        status || 'Active',
        description || null,
        remarks || null,
        req.user!.id,
      ]
    );

    const newMeter = ins.rows[0];

    // If initial baseline reading provided, insert it
    if (initial_reading !== undefined && initial_reading !== null && String(initial_reading).trim() !== '') {
      const initVal = parseFloat(String(initial_reading));
      if (!isNaN(initVal) && initVal >= 0) {
        await db.query(
          `INSERT INTO electricity_readings 
            (meter_id, reading_date, previous_reading, current_reading, units_used, is_reset, reset_reason, remarks, recorded_by_id, created_at)
           VALUES ($1, COALESCE($2, CURRENT_DATE), NULL, $3, 0, FALSE, NULL, 'Initial baseline reading', $4, CURRENT_TIMESTAMP)`,
          [newMeter.id, installation_date || null, initVal, req.user!.id]
        );
      }
    }

    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_ELECTRICITY_METER',
      module: 'Electricity Meter',
      recordId: newMeter.id,
      details: { branchId: targetBranchId, name, meter_number, meter_type },
      req,
    });

    return res.status(201).json({ success: true, message: 'Electricity meter created successfully.', meter: newMeter });
  } catch (err: any) {
    console.error('Error creating electricity meter:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 3. PUT /api/electricity/meters/:id - Edit meter
// ============================================================
router.put('/meters/:id', authenticate, requirePermission('electricity.meters.edit'), async (req: Request, res: Response) => {
  try {
    const meterId = parseInt(req.params.id, 10);
    const { name, meter_number, meter_type, location, installation_date, status, description, remarks, branch_id } = req.body;

    const existing = await db.query(`SELECT * FROM electricity_meters WHERE id = $1`, [meterId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Electricity meter not found.' });
    }

    const branchScope = getUserBranchScope(req);
    if (branchScope && existing.rows[0].branch_id !== branchScope) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this branch meter.' });
    }

    const finalBranchId = branchScope ? existing.rows[0].branch_id : (branch_id ? parseInt(branch_id, 10) : existing.rows[0].branch_id);

    const upd = await db.query(
      `UPDATE electricity_meters 
       SET name = COALESCE($1, name),
           meter_number = COALESCE($2, meter_number),
           meter_type = COALESCE($3, meter_type),
           location = COALESCE($4, location),
           installation_date = COALESCE($5, installation_date),
           status = COALESCE($6, status),
           description = COALESCE($7, description),
           remarks = COALESCE($8, remarks),
           branch_id = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        name ? String(name).trim() : null,
        meter_number ? String(meter_number).trim() : null,
        meter_type || null,
        location || null,
        installation_date || null,
        status || null,
        description !== undefined ? description : null,
        remarks !== undefined ? remarks : null,
        finalBranchId,
        meterId,
      ]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_ELECTRICITY_METER',
      module: 'Electricity Meter',
      recordId: meterId,
      details: { name, meter_number, status },
      req,
    });

    return res.json({ success: true, message: 'Electricity meter updated successfully.', meter: upd.rows[0] });
  } catch (err: any) {
    console.error('Error updating electricity meter:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 4. DELETE /api/electricity/meters/:id - Delete meter
// ============================================================
router.delete('/meters/:id', authenticate, requirePermission('electricity.meters.delete'), async (req: Request, res: Response) => {
  try {
    const meterId = parseInt(req.params.id, 10);
    const existing = await db.query(`SELECT * FROM electricity_meters WHERE id = $1`, [meterId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Meter not found.' });
    }

    const branchScope = getUserBranchScope(req);
    if (branchScope && existing.rows[0].branch_id !== branchScope) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await db.query(`DELETE FROM electricity_meters WHERE id = $1`, [meterId]);

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_ELECTRICITY_METER',
      module: 'Electricity Meter',
      recordId: meterId,
      details: { name: existing.rows[0].name, meter_number: existing.rows[0].meter_number },
      req,
    });

    return res.json({ success: true, message: 'Electricity meter removed successfully.' });
  } catch (err: any) {
    console.error('Error deleting electricity meter:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 5. GET /api/electricity/meters/:id/readings - List readings
// ============================================================
router.get('/meters/:id/readings', authenticate, requirePermission('electricity.readings.view'), async (req: Request, res: Response) => {
  try {
    const meterId = parseInt(req.params.id, 10);

    const meterRes = await db.query(
      `SELECT m.*, b.name as branch_name FROM electricity_meters m JOIN branches b ON m.branch_id = b.id WHERE m.id = $1`,
      [meterId]
    );
    if (meterRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Meter not found.' });
    }

    const branchScope = getUserBranchScope(req);
    if (branchScope && meterRes.rows[0].branch_id !== branchScope) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const readingsQuery = `
      SELECT 
        r.*,
        u.full_name as recorded_by_name,
        u.username as recorded_by_username,
        p.id as payment_id,
        p.bill_number,
        p.bill_amount,
        p.paid_amount,
        p.payment_status
      FROM electricity_readings r
      LEFT JOIN users u ON r.recorded_by_id = u.id
      LEFT JOIN electricity_payments p ON p.reading_id = r.id
      WHERE r.meter_id = $1
      ORDER BY r.reading_date DESC, r.id DESC
    `;

    const readings = await db.query(readingsQuery, [meterId]);

    return res.json({
      success: true,
      meter: meterRes.rows[0],
      readings: readings.rows,
    });
  } catch (err: any) {
    console.error('Error fetching meter readings:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 6. POST /api/electricity/readings - Record meter reading
// ============================================================
router.post('/readings', authenticate, requirePermission('electricity.readings.create'), upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { meter_id, reading_date, current_reading, is_reset, reset_reason, remarks } = req.body;

    if (!meter_id || current_reading === undefined || current_reading === null || String(current_reading).trim() === '') {
      return res.status(400).json({ success: false, message: 'Meter ID and current reading are required.' });
    }

    const meterId = parseInt(meter_id, 10);
    const meterRes = await db.query(`SELECT * FROM electricity_meters WHERE id = $1`, [meterId]);
    if (meterRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Meter not found.' });
    }

    const branchScope = getUserBranchScope(req);
    if (branchScope && meterRes.rows[0].branch_id !== branchScope) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this branch.' });
    }

    const currentVal = parseFloat(String(current_reading));
    if (isNaN(currentVal) || currentVal < 0) {
      return res.status(400).json({ success: false, message: 'Invalid current reading value.' });
    }

    const isReset = is_reset === true || is_reset === 'true' || is_reset === '1';

    // Fetch previous latest reading
    const prevRes = await db.query(
      `SELECT * FROM electricity_readings WHERE meter_id = $1 ORDER BY reading_date DESC, id DESC LIMIT 1`,
      [meterId]
    );

    let previousVal: number | null = null;
    let unitsUsed = 0;

    if (prevRes.rowCount === 0) {
      // First baseline reading for this meter
      previousVal = null;
      unitsUsed = 0;
    } else {
      previousVal = parseFloat(prevRes.rows[0].current_reading);

      if (isReset) {
        // Meter replaced or reset: units used is current reading starting from 0, or custom baseline
        unitsUsed = Math.max(0, currentVal);
      } else {
        if (currentVal < previousVal) {
          return res.status(400).json({
            success: false,
            message: `Current reading (${currentVal}) cannot be less than previous reading (${previousVal}). If the meter was replaced or rolled over, please check "Meter Reset / Replaced".`,
          });
        }
        // Automatic consumption calculation
        unitsUsed = parseFloat((currentVal - previousVal).toFixed(2));
      }
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const readingDate = reading_date || new Date().toISOString().split('T')[0];

    const ins = await db.query(
      `INSERT INTO electricity_readings 
        (meter_id, reading_date, previous_reading, current_reading, units_used, is_reset, reset_reason, image_url, remarks, recorded_by_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        meterId,
        readingDate,
        previousVal,
        currentVal,
        unitsUsed,
        isReset,
        isReset ? reset_reason || 'Meter reset/replacement' : null,
        imageUrl,
        remarks || null,
        req.user!.id,
      ]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'RECORD_METER_READING',
      module: 'Electricity Meter',
      recordId: ins.rows[0].id,
      details: { meterId, currentReading: currentVal, previousReading: previousVal, unitsUsed, isReset },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Meter reading recorded successfully.',
      reading: ins.rows[0],
    });
  } catch (err: any) {
    console.error('Error recording meter reading:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 7. DELETE /api/electricity/readings/:id - Delete reading
// ============================================================
router.delete('/readings/:id', authenticate, requirePermission('electricity.readings.delete'), async (req: Request, res: Response) => {
  try {
    const readingId = parseInt(req.params.id, 10);
    const readingRes = await db.query(
      `SELECT r.*, m.branch_id FROM electricity_readings r JOIN electricity_meters m ON r.meter_id = m.id WHERE r.id = $1`,
      [readingId]
    );
    if (readingRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Reading not found.' });
    }

    const branchScope = getUserBranchScope(req);
    if (branchScope && readingRes.rows[0].branch_id !== branchScope) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await db.query(`DELETE FROM electricity_readings WHERE id = $1`, [readingId]);

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_METER_READING',
      module: 'Electricity Meter',
      recordId: readingId,
      details: { meterId: readingRes.rows[0].meter_id, currentReading: readingRes.rows[0].current_reading },
      req,
    });

    return res.json({ success: true, message: 'Reading entry deleted successfully.' });
  } catch (err: any) {
    console.error('Error deleting reading:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 8. GET /api/electricity/payments - List payments
// ============================================================
router.get('/payments', authenticate, requirePermission('electricity.payment.view'), async (req: Request, res: Response) => {
  try {
    const { branch_id, meter_id, payment_status, year, month } = req.query;
    const branchScope = getUserBranchScope(req);

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (branchScope) {
      params.push(branchScope);
      whereClauses.push(`m.branch_id = $${params.length}`);
    } else if (branch_id && branch_id !== 'ALL' && branch_id !== 'All') {
      params.push(parseInt(String(branch_id), 10));
      whereClauses.push(`m.branch_id = $${params.length}`);
    }

    if (meter_id && meter_id !== 'ALL' && meter_id !== 'All') {
      params.push(parseInt(String(meter_id), 10));
      whereClauses.push(`p.meter_id = $${params.length}`);
    }

    if (payment_status && payment_status !== 'ALL' && payment_status !== 'All') {
      params.push(payment_status);
      whereClauses.push(`p.payment_status = $${params.length}`);
    }

    if (year) {
      params.push(parseInt(String(year), 10));
      whereClauses.push(`EXTRACT(YEAR FROM p.bill_date) = $${params.length}`);
    }

    if (month) {
      params.push(parseInt(String(month), 10));
      whereClauses.push(`EXTRACT(MONTH FROM p.bill_date) = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        p.*,
        m.name as meter_name,
        m.meter_number,
        m.meter_type,
        b.id as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        u.full_name as recorded_by_name,
        r.reading_date,
        r.current_reading,
        r.units_used as reading_units
      FROM electricity_payments p
      JOIN electricity_meters m ON p.meter_id = m.id
      JOIN branches b ON m.branch_id = b.id
      LEFT JOIN electricity_readings r ON p.reading_id = r.id
      LEFT JOIN users u ON p.recorded_by_id = u.id
      ${whereSql}
      ORDER BY p.bill_date DESC, p.id DESC
    `;

    const result = await db.query(query, params);
    return res.json({ success: true, payments: result.rows });
  } catch (err: any) {
    console.error('Error fetching payments:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 9. POST /api/electricity/payments - Record bill & payment
// ============================================================
router.post(
  '/payments',
  authenticate,
  requirePermission('electricity.payment.create'),
  upload.fields([
    { name: 'bill_image', maxCount: 1 },
    { name: 'receipt_image', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const {
        meter_id,
        reading_id,
        bill_number,
        bill_date,
        due_date,
        billed_units,
        rate_per_unit,
        bill_amount,
        paid_amount,
        paid_units,
        payment_date,
        payment_method,
        remarks,
      } = req.body;

      if (!meter_id || !bill_date || bill_amount === undefined) {
        return res.status(400).json({ success: false, message: 'Meter, bill date, and bill amount are required.' });
      }

      const meterId = parseInt(meter_id, 10);
      const readingId = reading_id ? parseInt(reading_id, 10) : null;

      const billedUnitsNum = parseFloat(String(billed_units || 0));
      const ratePerUnitNum = parseFloat(String(rate_per_unit || 0));
      const billAmountNum = parseFloat(String(bill_amount || 0));
      const paidAmountNum = parseFloat(String(paid_amount || 0));
      const paidUnitsNum = parseFloat(String(paid_units || 0));
      const dueUnitsNum = Math.max(0, parseFloat((billedUnitsNum - paidUnitsNum).toFixed(2)));

      // Calculate Payment Status
      let status = 'UNPAID';
      if (paidAmountNum >= billAmountNum && billAmountNum > 0) {
        status = 'PAID';
      } else if (paidAmountNum > 0) {
        status = 'PARTIALLY_PAID';
      } else if (due_date && new Date(due_date) < new Date()) {
        status = 'OVERDUE';
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const billImageUrl = files?.['bill_image'] ? `/uploads/${files['bill_image'][0].filename}` : null;
      const receiptImageUrl = files?.['receipt_image'] ? `/uploads/${files['receipt_image'][0].filename}` : null;

      const ins = await db.query(
        `INSERT INTO electricity_payments
          (meter_id, reading_id, bill_number, bill_date, due_date, billed_units, rate_per_unit,
           bill_amount, paid_amount, paid_units, due_units, payment_status, payment_date,
           payment_method, bill_image_url, receipt_image_url, remarks, recorded_by_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          meterId,
          readingId,
          bill_number || null,
          bill_date,
          due_date || null,
          billedUnitsNum,
          ratePerUnitNum,
          billAmountNum,
          paidAmountNum,
          paidUnitsNum,
          dueUnitsNum,
          status,
          payment_date || null,
          payment_method || 'Online',
          billImageUrl,
          receiptImageUrl,
          remarks || null,
          req.user!.id,
        ]
      );

      await logActivity({
        userId: req.user!.id,
        action: 'CREATE_ELECTRICITY_PAYMENT',
        module: 'Electricity Meter',
        recordId: ins.rows[0].id,
        details: { meterId, billAmount: billAmountNum, paidAmount: paidAmountNum, status },
        req,
      });

      return res.status(201).json({
        success: true,
        message: 'Electricity payment/bill recorded successfully.',
        payment: ins.rows[0],
      });
    } catch (err: any) {
      console.error('Error recording payment:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================
// 10. PUT /api/electricity/payments/:id - Update payment record
// ============================================================
router.put(
  '/payments/:id',
  authenticate,
  requirePermission('electricity.payment.edit'),
  upload.fields([
    { name: 'bill_image', maxCount: 1 },
    { name: 'receipt_image', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const paymentId = parseInt(req.params.id, 10);
      const existing = await db.query(`SELECT * FROM electricity_payments WHERE id = $1`, [paymentId]);
      if (existing.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Payment record not found.' });
      }

      const prev = existing.rows[0];
      const {
        bill_number,
        bill_date,
        due_date,
        billed_units,
        rate_per_unit,
        bill_amount,
        paid_amount,
        paid_units,
        payment_date,
        payment_method,
        payment_status,
        remarks,
      } = req.body;

      const billedUnitsNum = billed_units !== undefined ? parseFloat(billed_units) : parseFloat(prev.billed_units);
      const ratePerUnitNum = rate_per_unit !== undefined ? parseFloat(rate_per_unit) : parseFloat(prev.rate_per_unit);
      const billAmountNum = bill_amount !== undefined ? parseFloat(bill_amount) : parseFloat(prev.bill_amount);
      const paidAmountNum = paid_amount !== undefined ? parseFloat(paid_amount) : parseFloat(prev.paid_amount);
      const paidUnitsNum = paid_units !== undefined ? parseFloat(paid_units) : parseFloat(prev.paid_units);
      const dueUnitsNum = Math.max(0, parseFloat((billedUnitsNum - paidUnitsNum).toFixed(2)));

      let status = payment_status || prev.payment_status;
      if (!payment_status) {
        if (paidAmountNum >= billAmountNum && billAmountNum > 0) {
          status = 'PAID';
        } else if (paidAmountNum > 0) {
          status = 'PARTIALLY_PAID';
        } else if (due_date && new Date(due_date) < new Date()) {
          status = 'OVERDUE';
        } else {
          status = 'UNPAID';
        }
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const billImageUrl = files?.['bill_image'] ? `/uploads/${files['bill_image'][0].filename}` : prev.bill_image_url;
      const receiptImageUrl = files?.['receipt_image'] ? `/uploads/${files['receipt_image'][0].filename}` : prev.receipt_image_url;

      const upd = await db.query(
        `UPDATE electricity_payments
         SET bill_number = COALESCE($1, bill_number),
             bill_date = COALESCE($2, bill_date),
             due_date = COALESCE($3, due_date),
             billed_units = $4,
             rate_per_unit = $5,
             bill_amount = $6,
             paid_amount = $7,
             paid_units = $8,
             due_units = $9,
             payment_status = $10,
             payment_date = COALESCE($11, payment_date),
             payment_method = COALESCE($12, payment_method),
             bill_image_url = $13,
             receipt_image_url = $14,
             remarks = COALESCE($15, remarks),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $16
         RETURNING *`,
        [
          bill_number || null,
          bill_date || null,
          due_date || null,
          billedUnitsNum,
          ratePerUnitNum,
          billAmountNum,
          paidAmountNum,
          paidUnitsNum,
          dueUnitsNum,
          status,
          payment_date || null,
          payment_method || null,
          billImageUrl,
          receiptImageUrl,
          remarks !== undefined ? remarks : null,
          paymentId,
        ]
      );

      await logActivity({
        userId: req.user!.id,
        action: 'UPDATE_ELECTRICITY_PAYMENT',
        module: 'Electricity Meter',
        recordId: paymentId,
        details: { status, paidAmount: paidAmountNum },
        req,
      });

      return res.json({
        success: true,
        message: 'Payment record updated successfully.',
        payment: upd.rows[0],
      });
    } catch (err: any) {
      console.error('Error updating payment:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================
// 11. DELETE /api/electricity/payments/:id - Delete payment
// ============================================================
router.delete('/payments/:id', authenticate, requirePermission('electricity.payment.edit'), async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    await db.query(`DELETE FROM electricity_payments WHERE id = $1`, [paymentId]);

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_ELECTRICITY_PAYMENT',
      module: 'Electricity Meter',
      recordId: paymentId,
      req,
    });

    return res.json({ success: true, message: 'Payment record deleted successfully.' });
  } catch (err: any) {
    console.error('Error deleting payment:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 12. GET /api/electricity/stats - Analytics & Comparison
// ============================================================
router.get('/stats', authenticate, requirePermission('electricity.view'), async (req: Request, res: Response) => {
  try {
    const branchScope = getUserBranchScope(req);
    const filterBranchId = req.query.branch_id ? parseInt(String(req.query.branch_id), 10) : null;
    const targetBranchId = branchScope || filterBranchId;

    const branchParam = targetBranchId ? [targetBranchId] : [];
    const branchWhereMeter = targetBranchId ? `WHERE branch_id = $1` : ``;
    const branchWhereJoined = targetBranchId ? `WHERE m.branch_id = $1` : ``;

    // Active meters count
    const metersCountRes = await db.query(`SELECT COUNT(*) as count FROM electricity_meters ${branchWhereMeter}`, branchParam);
    const activeMeters = parseInt(metersCountRes.rows[0].count, 10);

    // Consumption this month & last month
    const consumptionRes = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN r.reading_date >= DATE_TRUNC('month', CURRENT_DATE) THEN r.units_used ELSE 0 END), 0) as current_month_units,
        COALESCE(SUM(CASE WHEN r.reading_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND r.reading_date < DATE_TRUNC('month', CURRENT_DATE) THEN r.units_used ELSE 0 END), 0) as last_month_units,
        COALESCE(SUM(r.units_used), 0) as all_time_units
       FROM electricity_readings r
       JOIN electricity_meters m ON r.meter_id = m.id
       ${branchWhereJoined}`,
      branchParam
    );

    // Payments summary
    const paymentsSummaryRes = await db.query(
      `SELECT 
        COALESCE(SUM(p.bill_amount), 0) as total_billed,
        COALESCE(SUM(p.paid_amount), 0) as total_paid,
        COALESCE(SUM(p.bill_amount - p.paid_amount), 0) as total_due_amount,
        COALESCE(SUM(p.due_units), 0) as total_due_units,
        COUNT(CASE WHEN p.payment_status IN ('UNPAID', 'OVERDUE') THEN 1 END) as pending_bills_count,
        COUNT(CASE WHEN p.payment_status = 'OVERDUE' THEN 1 END) as overdue_bills_count
       FROM electricity_payments p
       JOIN electricity_meters m ON p.meter_id = m.id
       ${branchWhereJoined}`,
      branchParam
    );

    // Monthly consumption history (past 6 months) for chart
    const trendRes = await db.query(
      `SELECT 
        TO_CHAR(DATE_TRUNC('month', r.reading_date), 'Mon YYYY') as month_label,
        DATE_TRUNC('month', r.reading_date) as month_date,
        COALESCE(SUM(r.units_used), 0) as total_units
       FROM electricity_readings r
       JOIN electricity_meters m ON r.meter_id = m.id
       ${branchWhereJoined ? branchWhereJoined + " AND " : "WHERE "} r.reading_date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', r.reading_date), TO_CHAR(DATE_TRUNC('month', r.reading_date), 'Mon YYYY')
       ORDER BY month_date ASC`,
      branchParam
    );

    // Branch-wise comparison list
    const branchComparisonRes = await db.query(`
      SELECT 
        b.id as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        COUNT(DISTINCT m.id) as meters_count,
        COALESCE(SUM(r.units_used), 0) as total_units,
        COALESCE(SUM(p.bill_amount), 0) as total_billed,
        COALESCE(SUM(p.paid_amount), 0) as total_paid,
        COALESCE(SUM(p.due_units), 0) as due_units,
        COUNT(DISTINCT CASE WHEN p.payment_status IN ('UNPAID', 'OVERDUE') THEN p.id END) as unpaid_bills
      FROM branches b
      LEFT JOIN electricity_meters m ON m.branch_id = b.id AND m.status = 'Active'
      LEFT JOIN electricity_readings r ON r.meter_id = m.id AND r.reading_date >= DATE_TRUNC('month', CURRENT_DATE)
      LEFT JOIN electricity_payments p ON p.meter_id = m.id
      GROUP BY b.id, b.name, b.code
      ORDER BY total_units DESC, b.name ASC
    `);

    return res.json({
      success: true,
      stats: {
        activeMeters,
        currentMonthUnits: parseFloat(consumptionRes.rows[0].current_month_units),
        lastMonthUnits: parseFloat(consumptionRes.rows[0].last_month_units),
        allTimeUnits: parseFloat(consumptionRes.rows[0].all_time_units),
        totalBilled: parseFloat(paymentsSummaryRes.rows[0].total_billed),
        totalPaid: parseFloat(paymentsSummaryRes.rows[0].total_paid),
        totalDueAmount: Math.max(0, parseFloat(paymentsSummaryRes.rows[0].total_due_amount)),
        totalDueUnits: parseFloat(paymentsSummaryRes.rows[0].total_due_units),
        pendingBillsCount: parseInt(paymentsSummaryRes.rows[0].pending_bills_count, 10),
        overdueBillsCount: parseInt(paymentsSummaryRes.rows[0].overdue_bills_count, 10),
        trend: trendRes.rows,
        branchComparison: branchComparisonRes.rows,
      },
    });
  } catch (err: any) {
    console.error('Error fetching electricity stats:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
