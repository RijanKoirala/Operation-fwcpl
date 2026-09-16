import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// ============================================================
// 1. GET /api/pods - List all PODs with stats & items preview
// ============================================================
router.get('/', authenticate, requirePermission('pods.view'), async (req: Request, res: Response) => {
  try {
    const { search, status, podType } = req.query;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Filter by Status
    if (status && status !== 'All' && status !== 'ALL' && status !== 'undefined' && status !== 'null') {
      params.push(status);
      whereClauses.push(`p.status = $${params.length}`);
    }

    // Filter by POD Type
    if (podType && podType !== 'All' && podType !== 'ALL' && podType !== 'undefined' && podType !== 'null') {
      params.push(podType);
      whereClauses.push(`p.pod_type = $${params.length}`);
    }

    // Search query: POD name, house owner, contact number, address
    const trimmedSearch = search ? String(search).trim() : '';
    if (trimmedSearch && trimmedSearch !== 'undefined' && trimmedSearch !== 'null') {
      params.push(`%${trimmedSearch}%`);
      const pIdx = params.length;
      whereClauses.push(
        `(p.name ILIKE $${pIdx} OR p.house_owner_name ILIKE $${pIdx} OR p.house_owner_contact ILIKE $${pIdx} OR p.house_owner_alt_contact ILIKE $${pIdx} OR p.address ILIKE $${pIdx})`
      );
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        p.*,
        u.full_name as created_by_name,
        u.username as created_by_username,
        (SELECT COUNT(*) FROM pod_items pi WHERE pi.pod_id = p.id AND pi.status = 'Active') as items_count,
        (SELECT COUNT(*) FROM pod_items pi WHERE pi.pod_id = p.id) as total_items_count
      FROM pods p
      LEFT JOIN users u ON p.created_by_id = u.id
      ${whereSql}
      ORDER BY p.name ASC
    `;

    const result = await db.query(query, params);
    const pods = result.rows;

    // Fetch quick items preview for each POD
    const podIds = pods.map((p: any) => p.id);
    const itemsPreviewMap: Record<number, string> = {};

    if (podIds.length > 0) {
      try {
        const itemsRes = await db.query(
          `SELECT pod_id, item_name, quantity, unit 
           FROM pod_items 
           WHERE status = 'Active'
           ORDER BY id ASC`
        );
        for (const item of itemsRes.rows) {
          if (!itemsPreviewMap[item.pod_id]) {
            itemsPreviewMap[item.pod_id] = `${item.item_name} (${item.quantity} ${item.unit})`;
          } else {
            const current = itemsPreviewMap[item.pod_id].split(', ');
            if (current.length < 3) {
              itemsPreviewMap[item.pod_id] += `, ${item.item_name} (${item.quantity} ${item.unit})`;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching items preview:', err);
      }
    }

    // Attach items preview to pods
    const enrichedPods = pods.map((p: any) => ({
      ...p,
      items_preview: itemsPreviewMap[p.id] || null,
      items_count: parseInt(p.items_count || '0', 10),
      total_items_count: parseInt(p.total_items_count || '0', 10),
    }));

    // Overall stats for summary cards
    const allPodsRes = await db.query(`SELECT status, COUNT(*) as count FROM pods GROUP BY status`);
    const stats = {
      totalPods: 0,
      active: 0,
      maintenance: 0,
      inactive: 0,
      unavailable: 0,
    };

    for (const row of allPodsRes.rows) {
      const c = parseInt(row.count, 10);
      stats.totalPods += c;
      const st = String(row.status).toLowerCase();
      if (st === 'active') stats.active += c;
      else if (st === 'maintenance') stats.maintenance += c;
      else if (st === 'inactive') stats.inactive += c;
      else if (st === 'temporarily unavailable') stats.unavailable += c;
    }

    return res.json({
      success: true,
      pods: enrichedPods,
      stats,
    });
  } catch (err: any) {
    console.error('Error in GET /api/pods:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 2. GET /api/pods/:id - Single POD Detail
// ============================================================
router.get('/:id', authenticate, requirePermission('pods.view'), async (req: Request, res: Response) => {
  try {
    const podId = parseInt(req.params.id, 10);
    if (isNaN(podId)) return res.status(400).json({ success: false, message: 'Invalid POD ID.' });

    const podRes = await db.query(
      `SELECT 
        p.*,
        u.full_name as created_by_name,
        u.username as created_by_username,
        (SELECT COUNT(*) FROM pod_items pi WHERE pi.pod_id = p.id AND pi.status = 'Active') as items_count,
        (SELECT COUNT(*) FROM pod_items pi WHERE pi.pod_id = p.id) as total_items_count
       FROM pods p
       LEFT JOIN users u ON p.created_by_id = u.id
       WHERE p.id = $1`,
      [podId]
    );

    if (podRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'POD / DC not found.' });
    }

    const pod = podRes.rows[0];

    // Fetch top items for summary on Overview tab
    const topItemsRes = await db.query(
      `SELECT id, item_name, quantity, unit, description, status 
       FROM pod_items 
       WHERE pod_id = $1 
       ORDER BY status ASC, id ASC 
       LIMIT 6`,
      [podId]
    );

    return res.json({
      success: true,
      pod: {
        ...pod,
        items_count: parseInt(pod.items_count || '0', 10),
        total_items_count: parseInt(pod.total_items_count || '0', 10),
        recent_items: topItemsRes.rows,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/pods/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 3. POST /api/pods - Create a new POD / DC
// ============================================================
router.post('/', authenticate, requirePermission('pods.create'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      status = 'Active',
      pod_type = 'Commercial',
      latitude,
      longitude,
      house_owner_name,
      house_owner_contact,
      house_owner_alt_contact,
      address,
      property_description,
      relative_name,
      relative_relationship,
      relative_contact,
      relative_alt_contact,
      installation_date,
      access_information,
      access_restrictions,
      key_holder,
      key_holder_contact,
      power_available = true,
      backup_power_available = false,
      backup_power_type,
      power_remarks,
      equipment_location,
      physical_location_description,
      description,
      remarks,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'POD / DC Name is required.' });
    }

    // Check unique name
    const chk = await db.query('SELECT id FROM pods WHERE UPPER(name) = UPPER($1)', [name.trim()]);
    if (chk.rowCount > 0) {
      return res.status(400).json({ success: false, message: `A POD/DC with name "${name.trim()}" already exists.` });
    }

    const insertRes = await db.query(
      `INSERT INTO pods (
        name, status, pod_type, latitude, longitude,
        house_owner_name, house_owner_contact, house_owner_alt_contact,
        address, property_description,
        relative_name, relative_relationship, relative_contact, relative_alt_contact,
        installation_date, access_information, access_restrictions,
        key_holder, key_holder_contact,
        power_available, backup_power_available, backup_power_type, power_remarks,
        equipment_location, physical_location_description,
        description, remarks, created_by_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19,
        $20, $21, $22, $23,
        $24, $25,
        $26, $27, $28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [
        name.trim(),
        status,
        pod_type,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        house_owner_name ? house_owner_name.trim() : null,
        house_owner_contact ? house_owner_contact.trim() : null,
        house_owner_alt_contact ? house_owner_alt_contact.trim() : null,
        address ? address.trim() : null,
        property_description ? property_description.trim() : null,
        relative_name ? relative_name.trim() : null,
        relative_relationship ? relative_relationship.trim() : null,
        relative_contact ? relative_contact.trim() : null,
        relative_alt_contact ? relative_alt_contact.trim() : null,
        installation_date || null,
        access_information ? access_information.trim() : null,
        access_restrictions ? access_restrictions.trim() : null,
        key_holder ? key_holder.trim() : null,
        key_holder_contact ? key_holder_contact.trim() : null,
        Boolean(power_available),
        Boolean(backup_power_available),
        backup_power_type ? backup_power_type.trim() : null,
        power_remarks ? power_remarks.trim() : null,
        equipment_location ? equipment_location.trim() : null,
        physical_location_description ? physical_location_description.trim() : null,
        description ? description.trim() : null,
        remarks ? remarks.trim() : null,
        req.user!.id,
      ]
    );

    const newPod = insertRes.rows[0];

    // Log in pod_history
    await db.query(
      `INSERT INTO pod_history (pod_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [newPod.id, req.user!.id, 'CREATED_POD', `POD/DC created by ${req.user!.fullName || req.user!.username}`]
    );

    // Audit log
    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_POD',
      module: 'PODs',
      recordId: String(newPod.id),
      details: `Created new POD/DC "${newPod.name}"`,
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'POD / DC created successfully.',
      pod: newPod,
    });
  } catch (err: any) {
    console.error('Error in POST /api/pods:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 4. PUT /api/pods/:id - Edit POD / DC
// ============================================================
router.put('/:id', authenticate, requirePermission('pods.edit'), async (req: Request, res: Response) => {
  try {
    const podId = parseInt(req.params.id, 10);
    if (isNaN(podId)) return res.status(400).json({ success: false, message: 'Invalid POD ID.' });

    const existingRes = await db.query('SELECT * FROM pods WHERE id = $1', [podId]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'POD / DC not found.' });
    }
    const current = existingRes.rows[0];

    const {
      name,
      status,
      pod_type,
      latitude,
      longitude,
      house_owner_name,
      house_owner_contact,
      house_owner_alt_contact,
      address,
      property_description,
      relative_name,
      relative_relationship,
      relative_contact,
      relative_alt_contact,
      installation_date,
      access_information,
      access_restrictions,
      key_holder,
      key_holder_contact,
      power_available,
      backup_power_available,
      backup_power_type,
      power_remarks,
      equipment_location,
      physical_location_description,
      description,
      remarks,
    } = req.body;

    const targetName = name !== undefined ? name.trim() : current.name;
    if (!targetName) {
      return res.status(400).json({ success: false, message: 'POD / DC Name cannot be empty.' });
    }

    // Check unique name if changed
    if (targetName.toUpperCase() !== current.name.toUpperCase()) {
      const chk = await db.query('SELECT id FROM pods WHERE UPPER(name) = UPPER($1) AND id != $2', [targetName, podId]);
      if (chk.rowCount > 0) {
        return res.status(400).json({ success: false, message: `Another POD/DC with name "${targetName}" already exists.` });
      }
    }

    const updateRes = await db.query(
      `UPDATE pods SET
        name = $1,
        status = $2,
        pod_type = $3,
        latitude = $4,
        longitude = $5,
        house_owner_name = $6,
        house_owner_contact = $7,
        house_owner_alt_contact = $8,
        address = $9,
        property_description = $10,
        relative_name = $11,
        relative_relationship = $12,
        relative_contact = $13,
        relative_alt_contact = $14,
        installation_date = $15,
        access_information = $16,
        access_restrictions = $17,
        key_holder = $18,
        key_holder_contact = $19,
        power_available = $20,
        backup_power_available = $21,
        backup_power_type = $22,
        power_remarks = $23,
        equipment_location = $24,
        physical_location_description = $25,
        description = $26,
        remarks = $27,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $28
       RETURNING *`,
      [
        targetName,
        status !== undefined ? status : current.status,
        pod_type !== undefined ? pod_type : current.pod_type,
        latitude !== undefined && latitude !== '' ? parseFloat(latitude) : null,
        longitude !== undefined && longitude !== '' ? parseFloat(longitude) : null,
        house_owner_name !== undefined ? (house_owner_name ? house_owner_name.trim() : null) : current.house_owner_name,
        house_owner_contact !== undefined ? (house_owner_contact ? house_owner_contact.trim() : null) : current.house_owner_contact,
        house_owner_alt_contact !== undefined ? (house_owner_alt_contact ? house_owner_alt_contact.trim() : null) : current.house_owner_alt_contact,
        address !== undefined ? (address ? address.trim() : null) : current.address,
        property_description !== undefined ? (property_description ? property_description.trim() : null) : current.property_description,
        relative_name !== undefined ? (relative_name ? relative_name.trim() : null) : current.relative_name,
        relative_relationship !== undefined ? (relative_relationship ? relative_relationship.trim() : null) : current.relative_relationship,
        relative_contact !== undefined ? (relative_contact ? relative_contact.trim() : null) : current.relative_contact,
        relative_alt_contact !== undefined ? (relative_alt_contact ? relative_alt_contact.trim() : null) : current.relative_alt_contact,
        installation_date !== undefined ? (installation_date || null) : current.installation_date,
        access_information !== undefined ? (access_information ? access_information.trim() : null) : current.access_information,
        access_restrictions !== undefined ? (access_restrictions ? access_restrictions.trim() : null) : current.access_restrictions,
        key_holder !== undefined ? (key_holder ? key_holder.trim() : null) : current.key_holder,
        key_holder_contact !== undefined ? (key_holder_contact ? key_holder_contact.trim() : null) : current.key_holder_contact,
        power_available !== undefined ? Boolean(power_available) : current.power_available,
        backup_power_available !== undefined ? Boolean(backup_power_available) : current.backup_power_available,
        backup_power_type !== undefined ? (backup_power_type ? backup_power_type.trim() : null) : current.backup_power_type,
        power_remarks !== undefined ? (power_remarks ? power_remarks.trim() : null) : current.power_remarks,
        equipment_location !== undefined ? (equipment_location ? equipment_location.trim() : null) : current.equipment_location,
        physical_location_description !== undefined ? (physical_location_description ? physical_location_description.trim() : null) : current.physical_location_description,
        description !== undefined ? (description ? description.trim() : null) : current.description,
        remarks !== undefined ? (remarks ? remarks.trim() : null) : current.remarks,
        podId,
      ]
    );

    const updatedPod = updateRes.rows[0];

    // Determine what changed for history log
    const changes: string[] = [];
    if (current.status !== updatedPod.status) changes.push(`Status changed to "${updatedPod.status}"`);
    if (current.house_owner_name !== updatedPod.house_owner_name) changes.push(`House owner updated to "${updatedPod.house_owner_name || 'None'}"`);
    if (current.house_owner_contact !== updatedPod.house_owner_contact) changes.push(`House owner contact updated`);
    if (current.relative_name !== updatedPod.relative_name || current.relative_contact !== updatedPod.relative_contact) changes.push(`Relative/alternate contact updated`);
    if (current.latitude !== updatedPod.latitude || current.longitude !== updatedPod.longitude) changes.push(`GPS location coordinates updated`);
    if (current.key_holder !== updatedPod.key_holder) changes.push(`Key holder updated`);

    const changeDetails = changes.length > 0 ? changes.join('; ') : 'POD / DC details updated';

    await db.query(
      `INSERT INTO pod_history (pod_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [podId, req.user!.id, 'UPDATED_POD', changeDetails]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_POD',
      module: 'PODs',
      recordId: String(podId),
      details: `Updated POD/DC "${updatedPod.name}": ${changeDetails}`,
      req,
    });

    return res.json({
      success: true,
      message: 'POD / DC updated successfully.',
      pod: updatedPod,
    });
  } catch (err: any) {
    console.error('Error in PUT /api/pods/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 5. DELETE /api/pods/:id - Delete POD / DC
// ============================================================
router.delete('/:id', authenticate, requirePermission('pods.delete'), async (req: Request, res: Response) => {
  try {
    const podId = parseInt(req.params.id, 10);
    if (isNaN(podId)) return res.status(400).json({ success: false, message: 'Invalid POD ID.' });

    const existingRes = await db.query('SELECT * FROM pods WHERE id = $1', [podId]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'POD / DC not found.' });
    }
    const pod = existingRes.rows[0];

    await db.query('DELETE FROM pods WHERE id = $1', [podId]);

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_POD',
      module: 'PODs',
      recordId: String(podId),
      details: `Deleted POD/DC "${pod.name}"`,
      req,
    });

    return res.json({
      success: true,
      message: `POD/DC "${pod.name}" deleted successfully.`,
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/pods/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 6. GET /api/pods/:id/items - List all items for this POD
// ============================================================
router.get('/:id/items', authenticate, requirePermission('pods.items.view'), async (req: Request, res: Response) => {
  try {
    const podId = parseInt(req.params.id, 10);
    if (isNaN(podId)) return res.status(400).json({ success: false, message: 'Invalid POD ID.' });

    const itemsRes = await db.query(
      `SELECT 
        pi.*,
        u.full_name as created_by_name
       FROM pod_items pi
       LEFT JOIN users u ON pi.created_by_id = u.id
       WHERE pi.pod_id = $1
       ORDER BY pi.status ASC, pi.item_name ASC`,
      [podId]
    );

    return res.json({
      success: true,
      items: itemsRes.rows,
    });
  } catch (err: any) {
    console.error('Error in GET /api/pods/:id/items:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 7. POST /api/pods/:id/items - Add Item to this POD
// ============================================================
router.post('/:id/items', authenticate, requirePermission('pods.items.create'), async (req: Request, res: Response) => {
  try {
    const podId = parseInt(req.params.id, 10);
    if (isNaN(podId)) return res.status(400).json({ success: false, message: 'Invalid POD ID.' });

    const podRes = await db.query('SELECT name FROM pods WHERE id = $1', [podId]);
    if (podRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'POD / DC not found.' });
    }
    const pod = podRes.rows[0];

    const { item_name, quantity = 1, unit = 'PCS', description, status = 'Active', remarks } = req.body;

    if (!item_name || !item_name.trim()) {
      return res.status(400).json({ success: false, message: 'Item Name is required.' });
    }

    const qtyNum = parseFloat(String(quantity));
    if (isNaN(qtyNum) || qtyNum < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a valid non-negative number.' });
    }

    const unitStr = unit && unit.trim() ? unit.trim() : 'PCS';

    const insertRes = await db.query(
      `INSERT INTO pod_items (
        pod_id, item_name, quantity, unit, description, status, remarks, created_by_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        podId,
        item_name.trim(),
        qtyNum,
        unitStr,
        description ? description.trim() : null,
        status,
        remarks ? remarks.trim() : null,
        req.user!.id,
      ]
    );

    const newItem = insertRes.rows[0];

    // Record in pod_history
    const historyDetail = `${newItem.item_name} added — ${newItem.quantity} ${newItem.unit}`;
    await db.query(
      `INSERT INTO pod_history (pod_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [podId, req.user!.id, 'ITEM_ADDED', historyDetail]
    );

    // Audit log
    await logActivity({
      userId: req.user!.id,
      action: 'ADD_POD_ITEM',
      module: 'PODs',
      recordId: String(newItem.id),
      details: `Added item "${newItem.item_name}" (${newItem.quantity} ${newItem.unit}) to POD "${pod.name}"`,
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Item added successfully.',
      item: newItem,
    });
  } catch (err: any) {
    console.error('Error in POST /api/pods/:id/items:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 8. PUT /api/pods/:id/items/:itemId - Edit Item in this POD
// ============================================================
router.put('/:id/items/:itemId', authenticate, requirePermission('pods.items.edit'), async (req: Request, res: Response) => {
  try {
    const podId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(podId) || isNaN(itemId)) return res.status(400).json({ success: false, message: 'Invalid ID.' });

    const itemRes = await db.query('SELECT * FROM pod_items WHERE id = $1 AND pod_id = $2', [itemId, podId]);
    if (itemRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Item not found in this POD.' });
    }
    const current = itemRes.rows[0];

    const { item_name, quantity, unit, description, status, remarks } = req.body;

    const targetName = item_name !== undefined ? item_name.trim() : current.item_name;
    if (!targetName) return res.status(400).json({ success: false, message: 'Item name cannot be empty.' });

    let targetQty = current.quantity;
    if (quantity !== undefined) {
      const q = parseFloat(String(quantity));
      if (isNaN(q) || q < 0) return res.status(400).json({ success: false, message: 'Invalid quantity.' });
      targetQty = q;
    }

    const targetUnit = unit !== undefined ? (unit ? unit.trim() : 'PCS') : current.unit;
    const targetStatus = status !== undefined ? status : current.status;
    const targetDesc = description !== undefined ? (description ? description.trim() : null) : current.description;
    const targetRemarks = remarks !== undefined ? (remarks ? remarks.trim() : null) : current.remarks;

    const updateRes = await db.query(
      `UPDATE pod_items SET
        item_name = $1,
        quantity = $2,
        unit = $3,
        description = $4,
        status = $5,
        remarks = $6,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND pod_id = $8
       RETURNING *`,
      [targetName, targetQty, targetUnit, targetDesc, targetStatus, targetRemarks, itemId, podId]
    );

    const updatedItem = updateRes.rows[0];

    // Determine change description for history
    let changeDetail = '';
    if (current.quantity !== updatedItem.quantity || current.unit !== updatedItem.unit) {
      changeDetail = `${updatedItem.item_name} quantity changed from ${current.quantity} ${current.unit} to ${updatedItem.quantity} ${updatedItem.unit}`;
    } else if (current.status !== updatedItem.status) {
      changeDetail = `${updatedItem.item_name} status changed to ${updatedItem.status}`;
    } else {
      changeDetail = `${updatedItem.item_name} details updated`;
    }

    await db.query(
      `INSERT INTO pod_history (pod_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [podId, req.user!.id, 'ITEM_UPDATED', changeDetail]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_POD_ITEM',
      module: 'PODs',
      recordId: String(itemId),
      details: changeDetail,
      req,
    });

    return res.json({
      success: true,
      message: 'Item updated successfully.',
      item: updatedItem,
    });
  } catch (err: any) {
    console.error('Error in PUT /api/pods/:id/items/:itemId:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 9. DELETE /api/pods/:id/items/:itemId - Delete Item from this POD
// ============================================================
router.delete('/:id/items/:itemId', authenticate, requirePermission('pods.items.delete'), async (req: Request, res: Response) => {
  try {
    const podId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(podId) || isNaN(itemId)) return res.status(400).json({ success: false, message: 'Invalid ID.' });

    const itemRes = await db.query('SELECT * FROM pod_items WHERE id = $1 AND pod_id = $2', [itemId, podId]);
    if (itemRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Item not found in this POD.' });
    }
    const current = itemRes.rows[0];

    await db.query('DELETE FROM pod_items WHERE id = $1 AND pod_id = $2', [itemId, podId]);

    const historyDetail = `${current.item_name} (${current.quantity} ${current.unit}) removed from POD`;
    await db.query(
      `INSERT INTO pod_history (pod_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [podId, req.user!.id, 'ITEM_DELETED', historyDetail]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_POD_ITEM',
      module: 'PODs',
      recordId: String(itemId),
      details: historyDetail,
      req,
    });

    return res.json({
      success: true,
      message: `Item "${current.item_name}" removed successfully.`,
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/pods/:id/items/:itemId:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 10. GET /api/pods/:id/history - Audit trail for this POD
// ============================================================
router.get('/:id/history', authenticate, requirePermission('pods.history.view'), async (req: Request, res: Response) => {
  try {
    const podId = parseInt(req.params.id, 10);
    if (isNaN(podId)) return res.status(400).json({ success: false, message: 'Invalid POD ID.' });

    const historyRes = await db.query(
      `SELECT 
        ph.*,
        u.full_name as user_name,
        u.username as user_username,
        u.role as user_role
       FROM pod_history ph
       LEFT JOIN users u ON ph.user_id = u.id
       WHERE ph.pod_id = $1
       ORDER BY ph.created_at DESC, ph.id DESC`,
      [podId]
    );

    return res.json({
      success: true,
      history: historyRes.rows,
    });
  } catch (err: any) {
    console.error('Error in GET /api/pods/:id/history:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
