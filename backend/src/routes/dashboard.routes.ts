import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate } from '../middleware/auth';
import {
  calculateStaffPerformance,
  calculateBranchPerformance,
  getTopTaskCompletersPodium,
  getTopBranchesPodium,
  getConnectionMetrics,
} from '../services/calculationService';

const router = Router();

// GET /api/dashboard/main - Executive Management Dashboard
router.get('/main', authenticate, async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // 1. Core Summary Cards
    const branchesCountRes = await db.query("SELECT COUNT(*) as count FROM branches WHERE status = 'Active'");
    const totalBranches = parseInt(branchesCountRes.rows[0].count, 10);

    const staffCountRes = await db.query("SELECT COUNT(*) as count FROM users WHERE status = 'Active'");
    const totalStaff = parseInt(staffCountRes.rows[0].count, 10);

    const tasksRes = await db.query("SELECT status, due_date FROM tasks");
    let activeTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;

    for (const t of tasksRes.rows) {
      if (t.status === 'Completed' || t.status === 'Closed') {
        completedTasks++;
      } else if (t.status !== 'Cancelled') {
        activeTasks++;
        if (t.due_date && new Date(t.due_date) < now) {
          overdueTasks++;
        }
      }
    }

    const connMetrics = await getConnectionMetrics();
    const activeConnections = connMetrics.total - (connMetrics.counts.completed + connMetrics.counts.cancelled);

    const todayStr = now.toISOString().split('T')[0];

    // Total New Connections Today across all branches
    const todayConnRes = await db.query(
      `SELECT COUNT(*) as count 
       FROM connections 
       WHERE DATE(created_at) = CURRENT_DATE 
          OR request_date = CURRENT_DATE 
          OR DATE(created_at) = $1 
          OR request_date = $1`,
      [todayStr]
    );
    const totalNewConnectionsToday = parseInt(todayConnRes.rows[0]?.count || '0', 10);

    // Branch breakdown for today's new connections
    const branchTodayConnRes = await db.query(
      `SELECT b.name as branch_name, b.code as branch_code, COUNT(c.id) as count
       FROM connections c
       JOIN branches b ON c.branch_id = b.id
       WHERE DATE(c.created_at) = CURRENT_DATE 
          OR c.request_date = CURRENT_DATE 
          OR DATE(c.created_at) = $1 
          OR c.request_date = $1
       GROUP BY b.id, b.name, b.code`,
      [todayStr]
    );

    const followupsRes = await db.query(`SELECT COUNT(*) as count FROM follow_ups WHERE status IN ('Pending', 'Waiting')`);
    const pendingFollowUps = parseInt(followupsRes.rows[0].count, 10);

    const targetsRes = await db.query("SELECT achievement_percentage FROM targets");
    let overallTargetAchievement = 0;
    if (targetsRes.rowCount > 0) {
      const sum = targetsRes.rows.reduce((acc, row) => acc + Number(row.achievement_percentage || 0), 0);
      overallTargetAchievement = Math.round(sum / targetsRes.rowCount);
    }

    // 2. Podiums
    const branchPodium = await getTopBranchesPodium();
    const taskPodium = await getTopTaskCompletersPodium('month');

    // 3. Leaderboards (top 10)
    const branchLeaderboard = branchPodium.all.map((b, i) => ({ rank: i + 1, ...b }));
    const staffLeaderboard = taskPodium.all.map((s, i) => ({ rank: i + 1, ...s })).slice(0, 10);

    // 4. Recent Instructions
    const instructionsRes = await db.query(
      `SELECT i.*, b.name as branch_name, s.full_name as sender_name
       FROM instructions i
       LEFT JOIN branches b ON i.branch_id = b.id
       LEFT JOIN users s ON i.sender_id = s.id
       ORDER BY i.created_at DESC LIMIT 5`
    );

    // 5. Recent Activity Logs
    const activityRes = await db.query(
      `SELECT al.*, u.full_name as user_name, u.username
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 10`
    );

    // 6. Category breakdown for tasks
    const taskCatRes = await db.query(`SELECT category, COUNT(*) as count FROM tasks GROUP BY category`);

    // 7. Breakdown of connections by pipeline status
    const connStatusRes = await db.query(
      `SELECT status, COUNT(*) as count FROM connections GROUP BY status ORDER BY count DESC`
    );

    // 8. Goods Requisitions Metrics
    let goodsRequestsMetrics = {
      pending: 0,
      urgent: 0,
      accepted: 0,
      partiallyAccepted: 0,
      denied: 0,
      awaitingFulfillment: 0,
      completed: 0,
    };
    try {
      const goodsRes = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
          COUNT(*) FILTER (WHERE status = 'PENDING' AND priority IN ('Urgent', 'Critical')) as urgent,
          COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted,
          COUNT(*) FILTER (WHERE status = 'PARTIALLY ACCEPTED') as partially_accepted,
          COUNT(*) FILTER (WHERE status = 'DENIED') as denied,
          COUNT(*) FILTER (WHERE status IN ('ACCEPTED', 'PARTIALLY ACCEPTED')) as awaiting_fulfillment,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed
        FROM goods_requests
      `);
      const goodsRow = goodsRes.rows[0] || {};
      goodsRequestsMetrics = {
        pending: parseInt(goodsRow.pending || '0', 10),
        urgent: parseInt(goodsRow.urgent || '0', 10),
        accepted: parseInt(goodsRow.accepted || '0', 10),
        partiallyAccepted: parseInt(goodsRow.partially_accepted || '0', 10),
        denied: parseInt(goodsRow.denied || '0', 10),
        awaitingFulfillment: parseInt(goodsRow.awaiting_fulfillment || '0', 10),
        completed: parseInt(goodsRow.completed || '0', 10),
      };
    } catch {}

    return res.json({
      success: true,
      summary: {
        totalBranches,
        totalStaff,
        activeTasks,
        completedTasks,
        overdueTasks,
        totalNewConnectionsToday,
        activeConnections,
        pendingFollowUps,
        overallTargetAchievement,
      },
      goodsRequests: goodsRequestsMetrics,
      podiums: {
        branches: branchPodium,
        taskCompleters: taskPodium,
      },
      leaderboards: {
        branches: branchLeaderboard,
        staff: staffLeaderboard,
      },
      connectionMetrics: connMetrics,
      todayConnectionsByBranch: branchTodayConnRes.rows,
      recentInstructions: instructionsRes.rows,
      recentActivity: activityRes.rows,
      taskCategories: taskCatRes.rows,
      connectionStatusCategories: connStatusRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/staff - Dedicated Staff Dashboard
router.get('/staff', authenticate, async (req: Request, res: Response) => {
  const staffId = req.user!.id;
  const now = new Date();

  try {
    // 1. My Tasks counts
    const tasksRes = await db.query(
      `SELECT status, due_date FROM tasks WHERE assigned_to_id = $1`,
      [staffId]
    );

    let newCount = 0;
    let pendingCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    for (const t of tasksRes.rows) {
      if (t.status === 'New' || t.status === 'Assigned') newCount++;
      if (t.status === 'Acknowledged') pendingCount++;
      if (t.status === 'In Progress') inProgressCount++;
      if (t.status === 'Completed' || t.status === 'Closed') completedCount++;
      if (!['Completed', 'Closed', 'Cancelled'].includes(t.status) && t.due_date && new Date(t.due_date) < now) {
        overdueCount++;
      }
    }

    // 2. My Targets
    const targetsRes = await db.query(
      `SELECT * FROM targets WHERE employee_id = $1 ORDER BY end_date ASC`,
      [staffId]
    );

    // 3. My Performance & Ranking
    const allStaffPerf = await calculateStaffPerformance();
    const myRankIdx = allStaffPerf.findIndex(s => s.staffId === staffId);
    const companyRank = myRankIdx !== -1 ? myRankIdx + 1 : 1;

    let branchRank = 1;
    if (req.user?.branchId) {
      const branchStaffPerf = await calculateStaffPerformance(req.user.branchId);
      const bIdx = branchStaffPerf.findIndex(s => s.staffId === staffId);
      branchRank = bIdx !== -1 ? bIdx + 1 : 1;
    }

    const myPerformance = allStaffPerf.find(s => s.staffId === staffId) || null;

    // 4. My Recent Assigned Tasks
    const recentTasks = await db.query(
      `SELECT t.*, b.name as branch_name
       FROM tasks t
       LEFT JOIN branches b ON t.branch_id = b.id
       WHERE t.assigned_to_id = $1
       ORDER BY t.due_date ASC LIMIT 5`,
      [staffId]
    );

    // 5. My Instructions
    const instructionsRes = await db.query(
      `SELECT i.*, s.full_name as sender_name
       FROM instructions i
       LEFT JOIN users s ON i.sender_id = s.id
       WHERE i.recipient_staff_id = $1 OR (i.recipient_type = 'Branch' AND i.branch_id = $2)
       ORDER BY i.created_at DESC LIMIT 5`,
      [staffId, req.user?.branchId || -1]
    );

    return res.json({
      success: true,
      tasksOverview: {
        new: newCount,
        pending: pendingCount,
        inProgress: inProgressCount,
        completed: completedCount,
        overdue: overdueCount,
        total: tasksRes.rowCount,
      },
      targets: targetsRes.rows,
      performance: myPerformance,
      ranking: {
        companyRank,
        totalCompanyStaff: allStaffPerf.length,
        branchRank,
      },
      recentTasks: recentTasks.rows,
      instructions: instructionsRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
