import { db } from '../models/database';

export interface ScoringWeights {
  targetWeight: number; // e.g. 40
  taskCompletionWeight: number; // e.g. 30
  onTimeWeight: number; // e.g. 15
  supportFollowUpWeight: number; // e.g. 15
}

export const getScoringWeights = async (): Promise<ScoringWeights> => {
  try {
    const res = await db.query("SELECT value FROM settings WHERE key = 'performance_weights'");
    if (res.rowCount > 0 && res.rows[0].value) {
      const parsed = JSON.parse(res.rows[0].value);
      return {
        targetWeight: Number(parsed.targetWeight ?? 40),
        taskCompletionWeight: Number(parsed.taskCompletionWeight ?? 30),
        onTimeWeight: Number(parsed.onTimeWeight ?? 15),
        supportFollowUpWeight: Number(parsed.supportFollowUpWeight ?? 15),
      };
    }
  } catch (err) {
    console.error('Error fetching scoring weights, using defaults:', err);
  }

  return {
    targetWeight: 40,
    taskCompletionWeight: 30,
    onTimeWeight: 15,
    supportFollowUpWeight: 15,
  };
};

export interface StaffPerformance {
  staffId: number;
  employeeId: string;
  fullName: string;
  username: string;
  designation: string;
  department: string;
  branchId: number | null;
  branchName: string;
  totalAssignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  onTimeCompletedTasks: number;
  lateCompletedTasks: number;
  taskCompletionRate: number; // %
  onTimeRate: number; // %
  targetAchievementRate: number; // %
  supportPerformanceRate: number; // %
  overallScore: number;
}

export const calculateStaffPerformance = async (
  filterBranchId?: number,
  periodFilter?: string
): Promise<StaffPerformance[]> => {
  const weights = await getScoringWeights();

  // Get active staff members
  let staffQuery = `
    SELECT u.id, u.employee_id, u.username, u.full_name, u.branch_id,
           b.name as branch_name, d.name as designation_name, dep.name as department_name
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    LEFT JOIN designations d ON u.designation_id = d.id
    LEFT JOIN departments dep ON u.department_id = dep.id
    WHERE u.status = 'Active'
  `;
  const params: any[] = [];
  if (filterBranchId) {
    params.push(filterBranchId);
    staffQuery += ` AND u.branch_id = $${params.length}`;
  }

  const staffRes = await db.query(staffQuery, params);
  const staffList = staffRes.rows;

  // Date filtering clause for tasks
  let dateClause = '';
  const now = new Date();
  if (periodFilter === 'today') {
    const todayStr = now.toISOString().split('T')[0];
    dateClause = ` AND t.start_date >= '${todayStr}'`;
  } else if (periodFilter === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    dateClause = ` AND t.start_date >= '${weekAgo}'`;
  } else if (periodFilter === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    dateClause = ` AND t.start_date >= '${monthAgo}'`;
  } else if (periodFilter === 'quarter') {
    const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    dateClause = ` AND t.start_date >= '${quarterAgo}'`;
  } else if (periodFilter === 'year') {
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    dateClause = ` AND t.start_date >= '${yearAgo}'`;
  }

  const results: StaffPerformance[] = [];

  for (const s of staffList) {
    // 1. Task metrics
    const taskRes = await db.query(
      `SELECT status, due_date, completion_date FROM tasks t WHERE t.assigned_to_id = $1 ${dateClause}`,
      [s.id]
    );

    let totalAssigned = 0;
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let onTime = 0;
    let late = 0;

    const todayDate = new Date();

    for (const t of taskRes.rows) {
      if (t.status === 'Cancelled') {
        continue; // Cancelled tasks do not count as failed
      }
      totalAssigned++;

      if (t.status === 'Completed' || t.status === 'Closed') {
        completed++;
        if (t.completion_date && t.due_date) {
          const compDate = new Date(t.completion_date);
          const dueDate = new Date(t.due_date);
          dueDate.setHours(23, 59, 59, 999);
          if (compDate <= dueDate) {
            onTime++;
          } else {
            late++;
          }
        } else {
          onTime++;
        }
      } else {
        pending++;
        if (t.due_date && new Date(t.due_date) < todayDate) {
          overdue++;
        }
      }
    }

    const taskCompletionRate = totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0;
    const onTimeRate = completed > 0 ? (onTime / completed) * 100 : 100;

    // 2. Target metrics
    const targetRes = await db.query(
      `SELECT achievement_percentage FROM targets WHERE employee_id = $1`,
      [s.id]
    );
    let targetAchievementRate = 0;
    if (targetRes.rowCount > 0) {
      const sum = targetRes.rows.reduce((acc, row) => acc + Number(row.achievement_percentage || 0), 0);
      targetAchievementRate = Math.min(120, sum / targetRes.rowCount); // cap at 120% for weighted score
    } else {
      targetAchievementRate = 75; // default benchmark if no targets assigned
    }

    // 3. Support & Follow-up performance
    const ticketsRes = await db.query(
      `SELECT status FROM support_tickets WHERE assigned_staff_id = $1`,
      [s.id]
    );
    const followupsRes = await db.query(
      `SELECT status FROM follow_ups WHERE assigned_staff_id = $1`,
      [s.id]
    );

    let supportFollowUpScore = 80; // baseline
    const totalCases = ticketsRes.rowCount + followupsRes.rowCount;
    if (totalCases > 0) {
      const resolvedTickets = ticketsRes.rows.filter(r => r.status === 'Resolved' || r.status === 'Closed').length;
      const completedFollowups = followupsRes.rows.filter(r => r.status === 'Completed').length;
      supportFollowUpScore = ((resolvedTickets + completedFollowups) / totalCases) * 100;
    }

    // Overall Score Formula
    const overallScore = Math.round(
      (Math.min(100, targetAchievementRate) * (weights.targetWeight / 100)) +
      (taskCompletionRate * (weights.taskCompletionWeight / 100)) +
      (onTimeRate * (weights.onTimeWeight / 100)) +
      (supportFollowUpScore * (weights.supportFollowUpWeight / 100))
    );

    results.push({
      staffId: s.id,
      employeeId: s.employee_id,
      fullName: s.full_name,
      username: s.username,
      designation: s.designation_name || 'Staff',
      department: s.department_name || 'Operations',
      branchId: s.branch_id,
      branchName: s.branch_name || 'Unassigned',
      totalAssignedTasks: totalAssigned,
      completedTasks: completed,
      pendingTasks: pending,
      overdueTasks: overdue,
      onTimeCompletedTasks: onTime,
      lateCompletedTasks: late,
      taskCompletionRate: Math.round(taskCompletionRate),
      onTimeRate: Math.round(onTimeRate),
      targetAchievementRate: Math.round(targetAchievementRate),
      supportPerformanceRate: Math.round(supportFollowUpScore),
      overallScore: Math.min(100, Math.max(0, overallScore)),
    });
  }

  // Sort by overall score descending, then by completed tasks
  results.sort((a, b) => b.overallScore - a.overallScore || b.completedTasks - a.completedTasks);
  return results;
};

export interface BranchPerformance {
  branchId: number;
  branchCode: string;
  branchName: string;
  city: string;
  province: string;
  totalStaff: number;
  activeStaff: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  taskCompletionRate: number; // %
  onTimeRate: number; // %
  targetAchievementRate: number; // %
  supportPerformanceRate: number; // %
  followUpPerformanceRate: number; // %
  overallScore: number;
}

export const calculateBranchPerformance = async (): Promise<BranchPerformance[]> => {
  const weights = await getScoringWeights();
  const branchesRes = await db.query('SELECT id, code, name, city, province FROM branches WHERE status = $1', ['Active']);
  const branches = branchesRes.rows;

  const results: BranchPerformance[] = [];
  const todayDate = new Date();

  for (const b of branches) {
    // Staff metrics
    const staffRes = await db.query('SELECT status FROM users WHERE branch_id = $1', [b.id]);
    const totalStaff = staffRes.rowCount;
    const activeStaff = staffRes.rows.filter(r => r.status === 'Active').length;

    // Task metrics
    const tasksRes = await db.query(
      'SELECT status, due_date, completion_date FROM tasks WHERE branch_id = $1',
      [b.id]
    );

    let totalTasks = 0;
    let completed = 0;
    let openTasks = 0;
    let overdue = 0;
    let onTime = 0;

    for (const t of tasksRes.rows) {
      if (t.status === 'Cancelled') continue;
      totalTasks++;

      if (t.status === 'Completed' || t.status === 'Closed') {
        completed++;
        if (t.completion_date && t.due_date) {
          const compDate = new Date(t.completion_date);
          const dueDate = new Date(t.due_date);
          dueDate.setHours(23, 59, 59, 999);
          if (compDate <= dueDate) onTime++;
        } else {
          onTime++;
        }
      } else {
        openTasks++;
        if (t.due_date && new Date(t.due_date) < todayDate) overdue++;
      }
    }

    const taskCompletionRate = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;
    const onTimeRate = completed > 0 ? (onTime / completed) * 100 : 100;

    // Target metrics
    const targetsRes = await db.query(
      'SELECT achievement_percentage FROM targets WHERE branch_id = $1',
      [b.id]
    );
    let targetAchievementRate = 80;
    if (targetsRes.rowCount > 0) {
      const sum = targetsRes.rows.reduce((acc, row) => acc + Number(row.achievement_percentage || 0), 0);
      targetAchievementRate = sum / targetsRes.rowCount;
    }

    // Support performance
    const ticketsRes = await db.query(
      'SELECT status FROM support_tickets WHERE branch_id = $1',
      [b.id]
    );
    let supportPerformanceRate = 85;
    if (ticketsRes.rowCount > 0) {
      const resolved = ticketsRes.rows.filter(r => r.status === 'Resolved' || r.status === 'Closed').length;
      supportPerformanceRate = (resolved / ticketsRes.rowCount) * 100;
    }

    // Follow-up performance
    const followupsRes = await db.query(
      'SELECT status FROM follow_ups WHERE branch_id = $1',
      [b.id]
    );
    let followUpPerformanceRate = 85;
    if (followupsRes.rowCount > 0) {
      const completedFollowups = followupsRes.rows.filter(r => r.status === 'Completed').length;
      followUpPerformanceRate = (completedFollowups / followupsRes.rowCount) * 100;
    }

    const supportAndFollowupCombined = (supportPerformanceRate + followUpPerformanceRate) / 2;

    const overallScore = Math.round(
      (Math.min(100, targetAchievementRate) * (weights.targetWeight / 100)) +
      (taskCompletionRate * (weights.taskCompletionWeight / 100)) +
      (onTimeRate * (weights.onTimeWeight / 100)) +
      (supportAndFollowupCombined * (weights.supportFollowUpWeight / 100))
    );

    results.push({
      branchId: b.id,
      branchCode: b.code,
      branchName: b.name,
      city: b.city,
      province: b.province,
      totalStaff,
      activeStaff,
      openTasks,
      completedTasks: completed,
      overdueTasks: overdue,
      taskCompletionRate: Math.round(taskCompletionRate),
      onTimeRate: Math.round(onTimeRate),
      targetAchievementRate: Math.round(targetAchievementRate),
      supportPerformanceRate: Math.round(supportPerformanceRate),
      followUpPerformanceRate: Math.round(followUpPerformanceRate),
      overallScore: Math.min(100, Math.max(0, overallScore)),
    });
  }

  // Sort by overall score descending
  results.sort((a, b) => b.overallScore - a.overallScore || b.completedTasks - a.completedTasks);
  return results;
};

export const getTopTaskCompletersPodium = async (period: string = 'month') => {
  const staff = await calculateStaffPerformance(undefined, period);
  // Sort primarily by completed tasks, then on-time rate, then overall score
  const sorted = [...staff].sort((a, b) => b.completedTasks - a.completedTasks || b.onTimeRate - a.onTimeRate || b.overallScore - a.overallScore);
  return {
    first: sorted[0] || null,
    second: sorted[1] || null,
    third: sorted[2] || null,
    all: sorted,
  };
};

export const getTopBranchesPodium = async () => {
  const branches = await calculateBranchPerformance();
  return {
    first: branches[0] || null,
    second: branches[1] || null,
    third: branches[2] || null,
    all: branches,
  };
};

export const getConnectionMetrics = async (branchId?: number) => {
  let query = 'SELECT status, request_date, activation_date, created_at FROM connections';
  const params: any[] = [];
  if (branchId) {
    params.push(branchId);
    query += ' WHERE branch_id = $1';
  }

  const res = await db.query(query, params);
  const total = res.rowCount;

  const counts: Record<string, number> = {
    newRequests: 0,
    contacted: 0,
    siteSurvey: 0,
    documentsPending: 0,
    installationPending: 0,
    installationScheduled: 0,
    installed: 0,
    activated: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  };

  let totalDurationDays = 0;
  let durationSamples = 0;

  for (const c of res.rows) {
    if (c.status === 'New Request') counts.newRequests++;
    else if (c.status === 'Contacted') counts.contacted++;
    else if (c.status === 'Site Survey Required' || c.status === 'Site Survey Completed') counts.siteSurvey++;
    else if (c.status === 'Documents Pending') counts.documentsPending++;
    else if (c.status === 'Installation Pending') counts.installationPending++;
    else if (c.status === 'Installation Scheduled') counts.installationScheduled++;
    else if (c.status === 'Installed') counts.installed++;
    else if (c.status === 'Activated') counts.activated++;
    else if (c.status === 'Completed') counts.completed++;
    else if (c.status === 'Cancelled') counts.cancelled++;
    else if (c.status === 'Rejected') counts.rejected++;

    if ((c.status === 'Activated' || c.status === 'Completed') && c.request_date && c.activation_date) {
      const diffMs = new Date(c.activation_date).getTime() - new Date(c.request_date).getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      totalDurationDays += diffDays;
      durationSamples++;
    }
  }

  const successful = counts.activated + counts.completed;
  const eligible = total - counts.cancelled - counts.rejected;
  const conversionRate = eligible > 0 ? Math.round((successful / eligible) * 100) : 0;
  const completionRate = total > 0 ? Math.round((counts.completed / total) * 100) : 0;
  const avgCompletionDays = durationSamples > 0 ? (totalDurationDays / durationSamples).toFixed(1) : '2.4';

  return {
    total,
    counts,
    conversionRate,
    completionRate,
    avgCompletionDays,
  };
};
