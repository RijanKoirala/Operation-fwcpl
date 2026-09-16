import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles, requirePermission } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import { seedDatabase } from '../seeds/demoData';

const router = Router();

// GET /api/settings
router.get('/', authenticate, requirePermission('settings.view'), async (req: Request, res: Response) => {
  try {
    const rows = await db.query('SELECT key, value, description FROM settings');
    const settingsMap: Record<string, any> = {};
    for (const r of rows.rows) {
      try {
        settingsMap[r.key] = JSON.parse(r.value);
      } catch {
        settingsMap[r.key] = r.value;
      }
    }

    return res.json({
      success: true,
      settings: settingsMap,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings
router.put('/', authenticate, requirePermission('settings.edit'), async (req: Request, res: Response) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Settings object required.' });
  }

  try {
    for (const [key, val] of Object.entries(settings)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      await db.query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, valStr]
      );
    }

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_SYSTEM_SETTINGS',
      module: 'SETTINGS',
      details: settings,
      req,
    });

    return res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/categories
router.get('/categories', authenticate, async (req: Request, res: Response) => {
  const defaultCategories = {
    tasks: [
      'General',
      'Operations',
      'Sales',
      'Customer Support',
      'Technical',
      'Installation',
      'Follow-up',
      'Collection',
      'Management',
      'Other',
    ],
    targets: [
      'New Connections',
      'Sales',
      'Revenue',
      'Collection',
      'Customer Support',
      'Task Completion',
      'Follow-up',
      'Customer Retention',
      'Other',
    ],
    tickets: [
      'Internet Down',
      'Slow Internet',
      'WiFi Issue',
      'Router/ONT Issue',
      'Billing',
      'Payment',
      'Installation',
      'Technical Issue',
      'Service Request',
      'Complaint',
      'Other',
    ],
    followUps: [
      'New Connection',
      'Customer',
      'Sales',
      'Payment',
      'Installation',
      'Complaint',
      'Support',
      'Management Instruction',
      'Other',
    ],
  };

  try {
    const customRes = await db.query("SELECT value FROM settings WHERE key = 'custom_categories'");
    let merged = defaultCategories;
    if (customRes.rowCount > 0 && customRes.rows[0].value) {
      const parsed = JSON.parse(customRes.rows[0].value);
      merged = { ...defaultCategories, ...parsed };
    }

    return res.json({ success: true, categories: merged });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings/reset-demo-data (SUPER_ADMIN only)
router.post('/reset-demo-data', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    await seedDatabase(true); // reset and re-seed
    await logActivity({
      userId: req.user!.id,
      action: 'RESET_DEMO_DATA',
      module: 'SETTINGS',
      req,
    });
    return res.json({ success: true, message: 'Demo data successfully reset.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings/clear-demo-data (SUPER_ADMIN only - prepares clean production state)
router.post('/clear-demo-data', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    // Retain the superadmin user and system settings, clear operational test records
    await db.query('DELETE FROM task_comments');
    await db.query('DELETE FROM task_status_history');
    await db.query('DELETE FROM tasks');
    await db.query('DELETE FROM connection_comments');
    await db.query('DELETE FROM connections');
    await db.query('DELETE FROM support_comments');
    await db.query('DELETE FROM support_tickets');
    await db.query('DELETE FROM follow_ups');
    await db.query('DELETE FROM instruction_comments');
    await db.query('DELETE FROM instructions');
    await db.query('DELETE FROM targets');
    await db.query('DELETE FROM notifications');

    await logActivity({
      userId: req.user!.id,
      action: 'CLEAR_DEMO_OPERATIONAL_DATA',
      module: 'SETTINGS',
      req,
    });

    return res.json({ success: true, message: 'Demo operational data cleared for production readiness.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
