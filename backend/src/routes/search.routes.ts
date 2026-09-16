import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/search?q=query
router.get('/', authenticate, async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.trim().length < 2) {
    return res.json({ success: true, results: [] });
  }

  const term = `%${query.trim()}%`;

  try {
    // 1. Branches
    const branches = await db.query(
      `SELECT id, code, name, city, 'BRANCH' as entity_type FROM branches WHERE name ILIKE $1 OR code ILIKE $1 LIMIT 5`,
      [term]
    );

    // 2. Staff
    const staff = await db.query(
      `SELECT id, employee_id, full_name as title, username as subtitle, 'STAFF' as entity_type FROM users WHERE full_name ILIKE $1 OR username ILIKE $1 OR employee_id ILIKE $1 LIMIT 5`,
      [term]
    );

    // 3. Tasks
    const tasks = await db.query(
      `SELECT id, task_id, title, priority, status, 'TASK' as entity_type FROM tasks WHERE title ILIKE $1 OR task_id ILIKE $1 LIMIT 5`,
      [term]
    );

    // 4. Connections
    const connections = await db.query(
      `SELECT id, connection_id, customer_name as title, phone as subtitle, status, 'CONNECTION' as entity_type FROM connections WHERE customer_name ILIKE $1 OR connection_id ILIKE $1 OR phone ILIKE $1 LIMIT 5`,
      [term]
    );

    // 5. Follow-ups
    const followups = await db.query(
      `SELECT id, follow_up_id, related_customer_case as title, type as subtitle, status, 'FOLLOW_UP' as entity_type FROM follow_ups WHERE related_customer_case ILIKE $1 OR follow_up_id ILIKE $1 LIMIT 5`,
      [term]
    );

    // 6. Instructions
    const instructions = await db.query(
      `SELECT id, instruction_id, title, priority, status, 'INSTRUCTION' as entity_type FROM instructions WHERE title ILIKE $1 OR instruction_id ILIKE $1 LIMIT 5`,
      [term]
    );

    // 7. NOC Incidents
    const noc = await db.query(
      `SELECT id, incident_id, title, issue_type as subtitle, priority, status, 'NOC' as entity_type FROM noc_incidents WHERE title ILIKE $1 OR incident_id ILIKE $1 OR pop_location ILIKE $1 LIMIT 5`,
      [term]
    );

    return res.json({
      success: true,
      results: {
        branches: branches.rows,
        staff: staff.rows,
        tasks: tasks.rows,
        connections: connections.rows,
        followups: followups.rows,
        instructions: instructions.rows,
        noc: noc.rows,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
