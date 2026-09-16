import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { sendNocIncidentEmail } from '../services/emailService';

const router = Router();

// Block branch users from NOC access; instruct to use Discussion Box
router.use(authenticate, (req: Request, res: Response, next: any) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const role = (user.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleName = (user.roleName || '').toUpperCase().replace(/\s+/g, '_');
  const isSuperAdmin = role === 'SUPER_ADMIN' || roleName === 'SUPER_ADMIN';
  const isOpsOrExec = user.departmentCode === 'EXEC' || user.departmentCode === 'OPS' || user.departmentCode === 'NOC' || role === 'MANAGEMENT' || roleName === 'MANAGEMENT';

  if (!isSuperAdmin && !isOpsOrExec && user.branchId) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Branch accounts do not have access to NOC Network Incidents. Please use the Discussion Box to communicate with Operations.',
    });
  }
  next();
});

// Helper to ensure NOC tables exist and all columns are present across SQLite and PostgreSQL
let tablesEnsured = false;
async function ensureNocTables() {
  if (tablesEnsured) return;
  try {
    if (db.getIsPostgres()) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS noc_incidents (
            id SERIAL PRIMARY KEY,
            incident_id VARCHAR(50) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            issue_type VARCHAR(100) NOT NULL,
            complain_by_name VARCHAR(150),
            suggestions TEXT,
            branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
            pop_location VARCHAR(255),
            affected_services TEXT,
            affected_customers_count INTEGER DEFAULT 0,
            priority VARCHAR(20) NOT NULL DEFAULT 'P2',
            status VARCHAR(30) NOT NULL DEFAULT 'Reported',
            reported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            assigned_noc_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            description TEXT NOT NULL,
            impact_details TEXT,
            estimated_resolution_time TIMESTAMP,
            resolved_at TIMESTAMP,
            resolution_notes TEXT,
            root_cause_analysis TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS complain_by_name VARCHAR(150);
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS suggestions TEXT;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS pop_location VARCHAR(255);
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS affected_services TEXT;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS affected_customers_count INTEGER DEFAULT 0;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'P2';
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Reported';
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS reported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS assigned_noc_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS impact_details TEXT;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS estimated_resolution_time TIMESTAMP;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS root_cause_analysis TEXT;

        CREATE TABLE IF NOT EXISTS noc_incident_updates (
            id SERIAL PRIMARY KEY,
            incident_id INTEGER REFERENCES noc_incidents(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            update_text TEXT NOT NULL,
            status_change VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE noc_incident_updates ADD COLUMN IF NOT EXISTS status_change VARCHAR(50);

        CREATE INDEX IF NOT EXISTS idx_noc_incidents_branch ON noc_incidents(branch_id);
        CREATE INDEX IF NOT EXISTS idx_noc_incidents_status ON noc_incidents(status);
        CREATE INDEX IF NOT EXISTS idx_noc_incidents_priority ON noc_incidents(priority);
        CREATE INDEX IF NOT EXISTS idx_noc_updates_incident ON noc_incident_updates(incident_id);
      `);
    } else {
      const sqliteDDL = [
        `CREATE TABLE IF NOT EXISTS noc_incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            issue_type TEXT NOT NULL,
            complain_by_name TEXT,
            suggestions TEXT,
            branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
            pop_location TEXT,
            affected_services TEXT,
            affected_customers_count INTEGER DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'P2',
            status TEXT NOT NULL DEFAULT 'Reported',
            reported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            assigned_noc_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            description TEXT NOT NULL,
            impact_details TEXT,
            estimated_resolution_time DATETIME,
            resolved_at DATETIME,
            resolution_notes TEXT,
            root_cause_analysis TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS noc_incident_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id INTEGER REFERENCES noc_incidents(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            update_text TEXT NOT NULL,
            status_change TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `ALTER TABLE noc_incidents ADD COLUMN complain_by_name TEXT;`,
        `ALTER TABLE noc_incidents ADD COLUMN suggestions TEXT;`,
        `ALTER TABLE noc_incidents ADD COLUMN pop_location TEXT;`,
        `ALTER TABLE noc_incidents ADD COLUMN affected_services TEXT;`,
        `ALTER TABLE noc_incidents ADD COLUMN affected_customers_count INTEGER DEFAULT 0;`,
        `ALTER TABLE noc_incidents ADD COLUMN assigned_noc_engineer_id INTEGER;`,
        `ALTER TABLE noc_incidents ADD COLUMN estimated_resolution_time DATETIME;`,
        `ALTER TABLE noc_incidents ADD COLUMN resolved_at DATETIME;`,
        `ALTER TABLE noc_incidents ADD COLUMN resolution_notes TEXT;`,
        `ALTER TABLE noc_incidents ADD COLUMN root_cause_analysis TEXT;`,
        `ALTER TABLE noc_incident_updates ADD COLUMN status_change TEXT;`,
      ];
      for (const sql of sqliteDDL) {
        try {
          await db.query(sql);
        } catch {}
      }
    }
    tablesEnsured = true;
  } catch (err: any) {
    console.error('NOC ensureTables error:', err.message);
  }
}

// GET /api/noc - List incidents with filtering & stats
router.get('/', authenticate, requirePermission('noc.view'), async (req: Request, res: Response) => {
  await ensureNocTables();
  const { branchId, status, priority, issueType, search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (branchId) {
      params.push(branchId);
      whereClauses.push(`ni.branch_id = $${params.length}`);
    }

    if (status) {
      if (status === 'Active') {
        whereClauses.push(`ni.status NOT IN ('Resolved', 'Closed')`);
      } else {
        params.push(status);
        whereClauses.push(`ni.status = $${params.length}`);
      }
    }

    if (priority) {
      params.push(priority);
      whereClauses.push(`ni.priority = $${params.length}`);
    }

    if (issueType) {
      params.push(issueType);
      whereClauses.push(`ni.issue_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(ni.incident_id ILIKE $${params.length} OR ni.title ILIKE $${params.length} OR ni.complain_by_name ILIKE $${params.length} OR ni.description ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Overall stats
    const statsRes = await db.query(`
      SELECT 
        COUNT(CASE WHEN status NOT IN ('Resolved', 'Closed') THEN 1 END) as active_count,
        COUNT(CASE WHEN priority = 'P1' AND status NOT IN ('Resolved', 'Closed') THEN 1 END) as p1_critical_count,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 END) as resolved_count,
        COUNT(CASE WHEN priority = 'P2' AND status NOT IN ('Resolved', 'Closed') THEN 1 END) as p2_high_count
      FROM noc_incidents
    `);

    const countRes = await db.query(`SELECT COUNT(*) as count FROM noc_incidents ni ${whereSql}`, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const query = `
      SELECT ni.*,
             b.name as branch_name, b.code as branch_code,
             u_rep.full_name as reported_by_name, u_rep.email as reported_by_email,
             u_noc.full_name as assigned_noc_engineer_name, u_noc.phone as assigned_noc_engineer_phone,
             (SELECT COUNT(*) FROM noc_incident_updates WHERE incident_id = ni.id) as updates_count
      FROM noc_incidents ni
      LEFT JOIN branches b ON ni.branch_id = b.id
      LEFT JOIN users u_rep ON ni.reported_by_id = u_rep.id
      LEFT JOIN users u_noc ON ni.assigned_noc_engineer_id = u_noc.id
      ${whereSql}
      ORDER BY
        CASE ni.priority
          WHEN 'P1' THEN 1
          WHEN 'P2' THEN 2
          WHEN 'P3' THEN 3
          ELSE 4
        END,
        CASE ni.status
          WHEN 'Reported' THEN 1
          WHEN 'Acknowledged' THEN 2
          WHEN 'In Progress' THEN 3
          WHEN 'Resolved' THEN 4
          ELSE 5
        END,
        ni.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      incidents: result.rows,
      stats: {
        activeCount: parseInt(statsRes.rows[0]?.active_count || '0', 10),
        p1CriticalCount: parseInt(statsRes.rows[0]?.p1_critical_count || '0', 10),
        inProgressCount: parseInt(statsRes.rows[0]?.in_progress_count || '0', 10),
        resolvedCount: parseInt(statsRes.rows[0]?.resolved_count || '0', 10),
        p2HighCount: parseInt(statsRes.rows[0]?.p2_high_count || '0', 10),
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching NOC incidents:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch NOC incidents', error: error.message });
  }
});

// GET /api/noc/:id - Get single incident with updates timeline
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  await ensureNocTables();
  const { id } = req.params;

  try {
    const isNumeric = /^\d+$/.test(id);
    const whereField = isNumeric ? 'ni.id' : 'ni.incident_id';

    const incidentRes = await db.query(`
      SELECT ni.*,
             b.name as branch_name, b.code as branch_code,
             u_rep.full_name as reported_by_name, u_rep.email as reported_by_email, u_rep.phone as reported_by_phone,
             u_noc.full_name as assigned_noc_engineer_name, u_noc.phone as assigned_noc_engineer_phone
      FROM noc_incidents ni
      LEFT JOIN branches b ON ni.branch_id = b.id
      LEFT JOIN users u_rep ON ni.reported_by_id = u_rep.id
      LEFT JOIN users u_noc ON ni.assigned_noc_engineer_id = u_noc.id
      WHERE ${whereField} = $1
    `, [id]);

    if (incidentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NOC incident not found' });
    }

    const incident = incidentRes.rows[0];

    const updatesRes = await db.query(`
      SELECT nu.*,
             u.full_name as user_name, u.role as user_role
      FROM noc_incident_updates nu
      LEFT JOIN users u ON nu.user_id = u.id
      WHERE nu.incident_id = $1
      ORDER BY nu.created_at ASC
    `, [incident.id]);

    return res.json({
      success: true,
      incident,
      updates: updatesRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching NOC incident details:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch NOC incident details', error: error.message });
  }
});

// POST /api/noc - Raise a new NOC incident
router.post('/', authenticate, requirePermission('noc.create'), async (req: Request, res: Response) => {
  await ensureNocTables();

  const {
    title,
    issue_type,
    complain_by_name,
    suggestions,
    branch_id,
    pop_location,
    affected_services,
    affected_customers_count = 0,
    priority = 'P2',
    description,
    impact_details,
    estimated_resolution_time,
  } = req.body;

  if (!title || !issue_type || !description) {
    return res.status(400).json({
      success: false,
      message: 'Title, issue type, and description are required to raise an issue to NOC',
    });
  }

  try {
    // Generate sequential incident ID like NOC-2026-001
    const countRes = await db.query('SELECT COUNT(*) as count FROM noc_incidents');
    const nextSeq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
    const year = new Date().getFullYear();
    const incident_id = `NOC-${year}-${String(nextSeq).padStart(3, '0')}`;

    let cleanBranchId: number | null = null;
    if (branch_id) {
      const parsed = parseInt(String(branch_id), 10);
      if (!isNaN(parsed) && parsed > 0) {
        cleanBranchId = parsed;
      }
    }

    let cleanCustomers = 0;
    if (affected_customers_count) {
      const parsed = parseInt(String(affected_customers_count), 10);
      if (!isNaN(parsed)) cleanCustomers = parsed;
    }

    const cleanEtr = (estimated_resolution_time && typeof estimated_resolution_time === 'string' && estimated_resolution_time.trim() !== '')
      ? estimated_resolution_time.trim()
      : null;

    const callerName = req.user?.fullName || req.user?.username || 'Operations Staff';
    const finalComplainBy = complain_by_name ? String(complain_by_name).trim() : callerName;

    const insertRes = await db.query(`
      INSERT INTO noc_incidents (
        incident_id, title, issue_type, complain_by_name, suggestions,
        branch_id, pop_location, affected_services, affected_customers_count,
        priority, status, reported_by_id, description, impact_details, estimated_resolution_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Reported', $11, $12, $13, $14)
      RETURNING *
    `, [
      incident_id,
      title.trim(),
      issue_type,
      finalComplainBy,
      suggestions ? String(suggestions).trim() : null,
      cleanBranchId,
      pop_location ? String(pop_location).trim() : null,
      affected_services ? String(affected_services).trim() : null,
      cleanCustomers,
      priority || 'P2',
      req.user?.id || null,
      description.trim(),
      impact_details ? String(impact_details).trim() : null,
      cleanEtr,
    ]);

    const createdIncident = insertRes.rows[0];

    // Log initial creation update
    await db.query(`
      INSERT INTO noc_incident_updates (incident_id, user_id, update_text, status_change)
      VALUES ($1, $2, $3, 'Reported')
    `, [
      createdIncident.id,
      req.user?.id || null,
      `Incident escalated to NOC by ${finalComplainBy}. Issue: ${issue_type}. Initial symptom: ${title}`,
    ]);

    // Add activity log
    await logActivity({
      userId: req.user?.id || null,
      action: 'RAISE_NOC_ISSUE',
      module: 'NOC',
      recordId: incident_id,
      details: `Raised network incident "${title}" by ${finalComplainBy} (${issue_type})`,
      req,
    });

    // Notify Super Admin / Management
    const superAdmins = await db.query(`SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'MANAGEMENT')`);
    for (const admin of superAdmins.rows) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, $2, $3, 'WARNING', '/noc')
      `, [
        admin.id,
        `🚨 NOC Issue: ${incident_id} (${issue_type})`,
        `${title} reported by ${finalComplainBy}. Impact: ${affected_services || 'Broadband'}`,
      ]);
    }

    // Notify NOC team via email asynchronously
    (async () => {
      try {
        let branchName: string | null = null;
        if (cleanBranchId) {
          const bRes = await db.query('SELECT name FROM branches WHERE id = $1', [cleanBranchId]);
          branchName = bRes.rows[0]?.name || null;
        }
        await sendNocIncidentEmail({
          incidentId: incident_id,
          title: title.trim(),
          issueType: issue_type,
          priority: priority || 'P2',
          branchName,
          popLocation: pop_location ? String(pop_location).trim() : null,
          affectedServices: affected_services ? String(affected_services).trim() : null,
          affectedCustomersCount: cleanCustomers,
          complainByName: finalComplainBy,
          description: description.trim(),
          estimatedResolutionTime: cleanEtr,
          impactDetails: impact_details ? String(impact_details).trim() : null,
        });
      } catch (emailErr: any) {
        console.error('[NOC] Email notification dispatch error:', emailErr.message);
      }
    })();

    return res.status(201).json({
      success: true,
      message: 'Network issue successfully escalated to NOC',
      incident: createdIncident,
    });
  } catch (error: any) {
    console.error('Error creating NOC incident:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to raise NOC incident', 
      error: error.message 
    });
  }
});

// PUT /api/noc/:id/status - Update incident status & NOC assignments
router.put('/:id/status', authenticate, async (req: Request, res: Response) => {
  await ensureNocTables();
  const { id } = req.params;
  const {
    status,
    assigned_noc_engineer_id,
    estimated_resolution_time,
    resolution_notes,
    root_cause_analysis,
    update_remarks,
  } = req.body;

  try {
    const isNumeric = /^\d+$/.test(id);
    const whereField = isNumeric ? 'id' : 'incident_id';

    const curRes = await db.query(`SELECT * FROM noc_incidents WHERE ${whereField} = $1`, [id]);
    if (curRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NOC incident not found' });
    }

    const currentIncident = curRes.rows[0];
    const newStatus = status || currentIncident.status;
    const isResolving = (newStatus === 'Resolved' || newStatus === 'Closed');

    // Parse clean engineer ID: if provided in payload, update it; otherwise preserve current
    let cleanEngineerId = currentIncident.assigned_noc_engineer_id;
    if (assigned_noc_engineer_id !== undefined) {
      if (assigned_noc_engineer_id === null || assigned_noc_engineer_id === '' || assigned_noc_engineer_id === 0) {
        cleanEngineerId = null;
      } else {
        const parsed = parseInt(String(assigned_noc_engineer_id), 10);
        cleanEngineerId = !isNaN(parsed) && parsed > 0 ? parsed : null;
      }
    }

    // Determine resolved_at cleanly in JS
    let resolvedAt = currentIncident.resolved_at || null;
    if (isResolving) {
      if (!resolvedAt) {
        resolvedAt = new Date().toISOString();
      }
    } else if (newStatus === 'Reported' || newStatus === 'Acknowledged' || newStatus === 'In Progress') {
      // If reopening from resolved/closed, clear resolved timestamp
      resolvedAt = null;
    }

    const cleanResNotes = resolution_notes !== undefined
      ? (resolution_notes ? String(resolution_notes).trim() : null)
      : (currentIncident.resolution_notes || null);

    const cleanRca = root_cause_analysis !== undefined
      ? (root_cause_analysis ? String(root_cause_analysis).trim() : null)
      : (currentIncident.root_cause_analysis || null);

    const cleanEtr = estimated_resolution_time !== undefined
      ? (estimated_resolution_time ? String(estimated_resolution_time).trim() : null)
      : (currentIncident.estimated_resolution_time || null);

    const updateQuery = `
      UPDATE noc_incidents SET
        status = $1,
        assigned_noc_engineer_id = $2,
        estimated_resolution_time = $3,
        resolution_notes = $4,
        root_cause_analysis = $5,
        resolved_at = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const updatedRes = await db.query(updateQuery, [
      newStatus,
      cleanEngineerId,
      cleanEtr,
      cleanResNotes,
      cleanRca,
      resolvedAt,
      currentIncident.id,
    ]);

    let updatedIncident = updatedRes.rows[0];
    if (!updatedIncident) {
      const reload = await db.query(`SELECT * FROM noc_incidents WHERE id = $1`, [currentIncident.id]);
      updatedIncident = reload.rows[0] || currentIncident;
    }

    // Add timeline update entry
    const remarkText = update_remarks || (
      newStatus !== currentIncident.status
        ? `Status transitioned from ${currentIncident.status} to ${newStatus}`
        : `Incident details updated by ${req.user?.fullName || req.user?.username || 'NOC'}`
    );

    try {
      await db.query(`
        INSERT INTO noc_incident_updates (incident_id, user_id, update_text, status_change)
        VALUES ($1, $2, $3, $4)
      `, [
        currentIncident.id,
        req.user?.id || null,
        remarkText,
        newStatus !== currentIncident.status ? newStatus : null,
      ]);
    } catch (updErr: any) {
      console.warn('Failed to insert timeline update:', updErr.message);
    }

    // Log activity
    await logActivity({
      userId: req.user?.id || null,
      action: 'UPDATE_NOC_ISSUE',
      module: 'NOC',
      recordId: currentIncident.incident_id,
      details: `Updated incident ${currentIncident.incident_id} to status: ${newStatus}`,
      req,
    });

    // Notify reporter if status changed by someone else
    try {
      if (currentIncident.reported_by_id && currentIncident.reported_by_id !== req.user?.id) {
        await db.query(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES ($1, $2, $3, 'INFO', '/noc')
        `, [
          currentIncident.reported_by_id,
          `📡 NOC Update: ${currentIncident.incident_id} is now ${newStatus}`,
          remarkText || `Status changed to ${newStatus}`,
        ]);
      }
    } catch (notifErr: any) {
      console.warn('Failed to dispatch notification:', notifErr.message);
    }

    return res.json({
      success: true,
      message: 'Incident status updated successfully',
      incident: updatedIncident,
    });
  } catch (error: any) {
    console.error('Error updating NOC incident status:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update NOC incident', error: error.message });
  }
});

// POST /api/noc/:id/updates - Post a progress remark or field telemetry note
router.post('/:id/updates', authenticate, async (req: Request, res: Response) => {
  await ensureNocTables();
  const { id } = req.params;
  const { update_text } = req.body;

  if (!update_text || !update_text.trim()) {
    return res.status(400).json({ success: false, message: 'Update text is required' });
  }

  try {
    const isNumeric = /^\d+$/.test(id);
    const whereField = isNumeric ? 'id' : 'incident_id';

    const incRes = await db.query(`SELECT id, incident_id FROM noc_incidents WHERE ${whereField} = $1`, [id]);
    if (incRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NOC incident not found' });
    }

    const incident = incRes.rows[0];

    const result = await db.query(`
      INSERT INTO noc_incident_updates (incident_id, user_id, update_text)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [
      incident.id,
      req.user?.id || null,
      update_text.trim(),
    ]);

    // Touch updated_at
    await db.query(`UPDATE noc_incidents SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [incident.id]);

    // Send notification to the other party (reporter or assigned engineer)
    const curInc = await db.query('SELECT reported_by_id, assigned_noc_engineer_id, incident_id FROM noc_incidents WHERE id = $1', [incident.id]);
    if (curInc.rows.length > 0) {
      const incInfo = curInc.rows[0];
      const targetUserId = req.user?.id === incInfo.reported_by_id 
        ? incInfo.assigned_noc_engineer_id 
        : incInfo.reported_by_id;

      if (targetUserId && targetUserId !== req.user?.id) {
        const senderName = req.user?.fullName || req.user?.username || 'NOC';
        await db.query(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES ($1, $2, $3, 'INFO', '/noc')
        `, [
          targetUserId,
          `💬 New Remark on NOC Incident ${incInfo.incident_id}`,
          `${senderName}: ${update_text.trim().substring(0, 100)}`,
        ]);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Update posted to incident timeline',
      update: {
        ...result.rows[0],
        user_name: req.user?.fullName || req.user?.username || 'Staff',
        user_role: req.user?.role || 'STAFF',
      },
    });
  } catch (error: any) {
    console.error('Error posting update to NOC incident:', error);
    return res.status(500).json({ success: false, message: 'Failed to post update', error: error.message });
  }
});

export default router;
