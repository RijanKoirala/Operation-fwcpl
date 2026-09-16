import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requireRoles } from '../middleware/auth';
import { logActivity } from '../middleware/audit';
import {
  calculateStaffPerformance,
  calculateBranchPerformance,
  getTopTaskCompletersPodium,
  getTopBranchesPodium,
  getScoringWeights,
} from '../services/calculationService';

const router = Router();

// GET /api/performance/podium/task-completers
router.get('/podium/task-completers', authenticate, async (req: Request, res: Response) => {
  const { period = 'month' } = req.query;

  try {
    const podium = await getTopTaskCompletersPodium(period as string);
    return res.json({ success: true, podium });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/performance/podium/branches
router.get('/podium/branches', authenticate, async (req: Request, res: Response) => {
  try {
    const podium = await getTopBranchesPodium();
    return res.json({ success: true, podium });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/performance/leaderboard/staff
router.get('/leaderboard/staff', authenticate, async (req: Request, res: Response) => {
  const { branchId, department, designation, period } = req.query;

  try {
    let staff = await calculateStaffPerformance(
      branchId ? parseInt(branchId as string, 10) : undefined,
      period as string
    );

    if (department) {
      staff = staff.filter(s => s.department === department);
    }
    if (designation) {
      staff = staff.filter(s => s.designation === designation);
    }

    // Attach ranks
    const ranked = staff.map((s, index) => ({
      rank: index + 1,
      ...s,
    }));

    return res.json({ success: true, leaderboard: ranked });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/performance/leaderboard/branches
router.get('/leaderboard/branches', authenticate, async (req: Request, res: Response) => {
  try {
    const branches = await calculateBranchPerformance();
    const ranked = branches.map((b, index) => ({
      rank: index + 1,
      ...b,
    }));
    return res.json({ success: true, leaderboard: ranked });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/performance/weights
router.get('/weights', authenticate, async (req: Request, res: Response) => {
  try {
    const weights = await getScoringWeights();
    return res.json({ success: true, weights });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/performance/weights (SUPER_ADMIN only)
router.put('/weights', authenticate, requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const { targetWeight, taskCompletionWeight, onTimeWeight, supportFollowUpWeight } = req.body;

  const t = Number(targetWeight);
  const tc = Number(taskCompletionWeight);
  const ot = Number(onTimeWeight);
  const sf = Number(supportFollowUpWeight);

  const sum = t + tc + ot + sf;
  if (Math.round(sum) !== 100) {
    return res.status(400).json({
      success: false,
      message: `Performance weights must sum exactly to 100%. Current sum: ${sum}% (${t}% + ${tc}% + ${ot}% + ${sf}%)`,
    });
  }

  try {
    const weightsJson = JSON.stringify({
      targetWeight: t,
      taskCompletionWeight: tc,
      onTimeWeight: ot,
      supportFollowUpWeight: sf,
    });

    await db.query(
      `INSERT INTO settings (key, value, description, updated_at)
       VALUES ('performance_weights', $1, 'Configurable weights for branch and staff scoring', CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [weightsJson]
    );

    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_PERFORMANCE_WEIGHTS',
      module: 'SETTINGS',
      recordId: 'performance_weights',
      details: { targetWeight: t, taskCompletionWeight: tc, onTimeWeight: ot, supportFollowUpWeight: sf },
      req,
    });

    return res.json({ success: true, message: 'Performance scoring weights updated.', weights: { targetWeight: t, taskCompletionWeight: tc, onTimeWeight: ot, supportFollowUpWeight: sf } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
