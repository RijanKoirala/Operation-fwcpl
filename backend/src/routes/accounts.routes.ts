import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { logActivity } from '../middleware/audit';

const router = Router();

// Helper: Determine if user has Super Admin or central executive accounts access
function isSuperAdminUser(user: any): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase().replace(/\s+/g, '_');
  const roleName = (user.roleName || user.role_name || '').toUpperCase().replace(/\s+/g, '_');
  const username = (user.username || '').toLowerCase();
  return (
    role === 'SUPER_ADMIN' ||
    roleName === 'SUPER_ADMIN' ||
    username === 'superadmin' ||
    user.permissions?.['accounts.dashboard'] === true ||
    user.permissions?.['accounts.view'] === true
  );
}

// Helper: Get Nepal today date in YYYY-MM-DD
function getNepalTodayStr(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === 'year')?.value || '1970';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const d = parts.find(p => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

// Helper: Format date cleanly for CSV or display
function formatDateClean(dateVal: any): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().substring(0, 10);
  }
  const str = String(dateVal);
  return str.length >= 10 ? str.substring(0, 10) : str;
}

// ============================================================
// 1. GET /api/accounts/dashboard — Company-Wide Accounts Dashboard
// ============================================================
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({
        success: false,
        message: 'Access Restricted: You do not have permission to view the company Accounts Dashboard.',
      });
    }

    const { period = 'month', startDate, endDate, branchId, sortBy = 'revenue', sortOrder = 'desc' } = req.query;

    const nepalToday = getNepalTodayStr();

    // Base conditions for date ranges
    // Today
    const todayCond = `revenue_date = '${nepalToday}'::date`;
    // Yesterday
    const yesterdayCond = `revenue_date = ('${nepalToday}'::date - INTERVAL '1 day')::date`;
    // This Week (ISO Monday to Sunday in Nepal)
    const weekCond = `revenue_date >= date_trunc('week', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('week', '${nepalToday}'::date) + INTERVAL '6 days')::date`;
    // This Month
    const monthCond = `revenue_date >= date_trunc('month', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('month', '${nepalToday}'::date) + INTERVAL '1 month - 1 day')::date`;
    // This Year
    const yearCond = `revenue_date >= date_trunc('year', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('year', '${nepalToday}'::date) + INTERVAL '1 year - 1 day')::date`;

    // Determine selected period condition
    let selectedCond = monthCond;
    let periodLabel = 'This Month';
    if (period === 'today') {
      selectedCond = todayCond;
      periodLabel = "Today";
    } else if (period === 'yesterday') {
      selectedCond = yesterdayCond;
      periodLabel = "Yesterday";
    } else if (period === 'week') {
      selectedCond = weekCond;
      periodLabel = "This Week";
    } else if (period === 'month') {
      selectedCond = monthCond;
      periodLabel = "This Month";
    } else if (period === 'year') {
      selectedCond = yearCond;
      periodLabel = "This Year";
    } else if (period === 'custom' && startDate && endDate) {
      selectedCond = `revenue_date >= '${String(startDate).substring(0, 10)}'::date AND revenue_date <= '${String(endDate).substring(0, 10)}'::date`;
      periodLabel = `${startDate} to ${endDate}`;
    }

    // Branch filter if specific branch is chosen in dashboard
    let branchClause = '';
    const branchParams: any[] = [];
    if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      branchParams.push(parseInt(String(branchId), 10));
      branchClause = `AND branch_id = $1`;
    }

    // 1. Overall Metrics Cards (computed from active branch_revenues)
    const metricsSql = `
      SELECT
        COALESCE(SUM(CASE WHEN ${todayCond} THEN amount ELSE 0 END), 0) as today_revenue,
        COALESCE(SUM(CASE WHEN ${yesterdayCond} THEN amount ELSE 0 END), 0) as yesterday_revenue,
        COALESCE(SUM(CASE WHEN ${weekCond} THEN amount ELSE 0 END), 0) as week_revenue,
        COALESCE(SUM(CASE WHEN ${monthCond} THEN amount ELSE 0 END), 0) as month_revenue,
        COALESCE(SUM(CASE WHEN ${yearCond} THEN amount ELSE 0 END), 0) as year_revenue,
        COALESCE(SUM(CASE WHEN ${selectedCond} THEN amount ELSE 0 END), 0) as selected_period_revenue,
        COUNT(CASE WHEN ${selectedCond} THEN 1 END) as selected_period_entries
      FROM branch_revenues
      WHERE status = 'Active' ${branchClause}
    `;

    const metricsRes = await db.query(metricsSql, branchParams);
    const mRow = metricsRes.rows[0] || {};

    const summaryCards = {
      today: parseFloat(mRow.today_revenue || '0'),
      yesterday: parseFloat(mRow.yesterday_revenue || '0'),
      thisWeek: parseFloat(mRow.week_revenue || '0'),
      thisMonth: parseFloat(mRow.month_revenue || '0'),
      thisYear: parseFloat(mRow.year_revenue || '0'),
      selectedPeriod: parseFloat(mRow.selected_period_revenue || '0'),
      selectedEntries: parseInt(mRow.selected_period_entries || '0', 10),
      periodLabel,
    };

    // 2. Branch-Wise Summary Table
    let branchFilterJoin = '';
    if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      branchFilterJoin = `WHERE b.id = ${parseInt(String(branchId), 10)}`;
    }

    const branchSummarySql = `
      SELECT
        b.id as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        b.city as city,
        COALESCE(SUM(CASE WHEN br.status = 'Active' AND ${todayCond.replace(/revenue_date/g, 'br.revenue_date')} THEN br.amount ELSE 0 END), 0) as today_revenue,
        COALESCE(SUM(CASE WHEN br.status = 'Active' AND ${yesterdayCond.replace(/revenue_date/g, 'br.revenue_date')} THEN br.amount ELSE 0 END), 0) as yesterday_revenue,
        COALESCE(SUM(CASE WHEN br.status = 'Active' AND ${monthCond.replace(/revenue_date/g, 'br.revenue_date')} THEN br.amount ELSE 0 END), 0) as month_revenue,
        COALESCE(SUM(CASE WHEN br.status = 'Active' AND ${yearCond.replace(/revenue_date/g, 'br.revenue_date')} THEN br.amount ELSE 0 END), 0) as year_revenue,
        COALESCE(SUM(CASE WHEN br.status = 'Active' AND ${selectedCond.replace(/revenue_date/g, 'br.revenue_date')} THEN br.amount ELSE 0 END), 0) as selected_revenue,
        COUNT(CASE WHEN br.status = 'Active' AND ${selectedCond.replace(/revenue_date/g, 'br.revenue_date')} THEN 1 END) as entries_count
      FROM branches b
      LEFT JOIN branch_revenues br ON b.id = br.branch_id
      ${branchFilterJoin}
      GROUP BY b.id, b.name, b.code, b.city
    `;

    const branchSummaryRes = await db.query(branchSummarySql);
    const branchRows = branchSummaryRes.rows.map(r => ({
      branchId: r.branch_id,
      branchName: r.branch_name,
      branchCode: r.branch_code,
      city: r.city,
      todayRevenue: parseFloat(r.today_revenue || '0'),
      yesterdayRevenue: parseFloat(r.yesterday_revenue || '0'),
      monthRevenue: parseFloat(r.month_revenue || '0'),
      yearRevenue: parseFloat(r.year_revenue || '0'),
      selectedRevenue: parseFloat(r.selected_revenue || '0'),
      entriesCount: parseInt(r.entries_count || '0', 10),
    }));

    // Sorting
    const isAsc = String(sortOrder).toLowerCase() === 'asc';
    branchRows.sort((a, b) => {
      if (sortBy === 'name') {
        return isAsc ? a.branchName.localeCompare(b.branchName) : b.branchName.localeCompare(a.branchName);
      }
      if (sortBy === 'today') {
        return isAsc ? a.todayRevenue - b.todayRevenue : b.todayRevenue - a.todayRevenue;
      }
      if (sortBy === 'month') {
        return isAsc ? a.monthRevenue - b.monthRevenue : b.monthRevenue - a.monthRevenue;
      }
      if (sortBy === 'year') {
        return isAsc ? a.yearRevenue - b.yearRevenue : b.yearRevenue - a.yearRevenue;
      }
      // default: selectedRevenue
      return isAsc ? a.selectedRevenue - b.selectedRevenue : b.selectedRevenue - a.selectedRevenue;
    });

    return res.json({
      success: true,
      summaryCards,
      branchesSummary: branchRows,
      nepalToday,
    });
  } catch (err: any) {
    console.error('Error in GET /api/accounts/dashboard:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 2. GET /api/accounts/reports — Graphical Analytics & Reporting
// ============================================================
router.get('/reports', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({
        success: false,
        message: 'Access Restricted: You do not have permission to view company-wide revenue reports.',
      });
    }

    const { period = 'month', startDate, endDate, branchId } = req.query;
    const nepalToday = getNepalTodayStr();

    // Date range determination
    let dateFilterSql = '';
    let groupingFormat = 'YYYY-MM-DD';
    let periodName = 'This Month';

    if (period === 'today') {
      dateFilterSql = `revenue_date = '${nepalToday}'::date`;
      periodName = "Today";
    } else if (period === 'yesterday') {
      dateFilterSql = `revenue_date = ('${nepalToday}'::date - INTERVAL '1 day')::date`;
      periodName = "Yesterday";
    } else if (period === 'week') {
      dateFilterSql = `revenue_date >= date_trunc('week', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('week', '${nepalToday}'::date) + INTERVAL '6 days')::date`;
      periodName = "This Week";
    } else if (period === 'month') {
      dateFilterSql = `revenue_date >= date_trunc('month', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('month', '${nepalToday}'::date) + INTERVAL '1 month - 1 day')::date`;
      periodName = "This Month";
    } else if (period === 'year') {
      dateFilterSql = `revenue_date >= date_trunc('year', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('year', '${nepalToday}'::date) + INTERVAL '1 year - 1 day')::date`;
      groupingFormat = 'YYYY-MM';
      periodName = "This Year";
    } else if (period === 'custom' && startDate && endDate) {
      dateFilterSql = `revenue_date >= '${String(startDate).substring(0, 10)}'::date AND revenue_date <= '${String(endDate).substring(0, 10)}'::date`;
      periodName = `${startDate} to ${endDate}`;
    } else {
      dateFilterSql = `revenue_date >= date_trunc('month', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('month', '${nepalToday}'::date) + INTERVAL '1 month - 1 day')::date`;
    }

    let branchClause = '';
    const queryParams: any[] = [];
    if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      queryParams.push(parseInt(String(branchId), 10));
      branchClause = `AND br.branch_id = $${queryParams.length}`;
    }

    // 1. Overall Metrics in Period
    const kpiSql = `
      SELECT
        COALESCE(SUM(br.amount), 0) as total_revenue,
        COUNT(br.id) as total_entries,
        COUNT(DISTINCT br.revenue_date) as active_days,
        COALESCE(MAX(br.amount), 0) as max_single_entry,
        COALESCE(MIN(br.amount), 0) as min_single_entry
      FROM branch_revenues br
      WHERE br.status = 'Active' AND ${dateFilterSql} ${branchClause}
    `;

    const kpiRes = await db.query(kpiSql, queryParams);
    const kpiRow = kpiRes.rows[0] || {};
    const totalRevenue = parseFloat(kpiRow.total_revenue || '0');
    const totalEntries = parseInt(kpiRow.total_entries || '0', 10);
    const activeDays = parseInt(kpiRow.active_days || '0', 10);
    const averageDaily = activeDays > 0 ? Math.round(totalRevenue / activeDays) : 0;

    // 2. Trend Timeline Data (grouped by day or month)
    const trendSql = `
      SELECT
        TO_CHAR(br.revenue_date, '${groupingFormat}') as period_bucket,
        MIN(br.revenue_date) as bucket_date,
        SUM(br.amount) as amount,
        COUNT(br.id) as entries
      FROM branch_revenues br
      WHERE br.status = 'Active' AND ${dateFilterSql} ${branchClause}
      GROUP BY period_bucket
      ORDER BY bucket_date ASC
    `;

    const trendRes = await db.query(trendSql, queryParams);
    const trendData = trendRes.rows.map(r => ({
      bucket: r.period_bucket,
      date: formatDateClean(r.bucket_date),
      amount: parseFloat(r.amount || '0'),
      entries: parseInt(r.entries || '0', 10),
    }));

    // 3. Branch Contribution & Comparison Table
    const branchCompSql = `
      SELECT
        b.id as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        COALESCE(SUM(br.amount), 0) as total_amount,
        COUNT(br.id) as entries_count,
        COUNT(DISTINCT br.revenue_date) as active_days,
        COALESCE(MAX(br.amount), 0) as max_daily,
        COALESCE(MIN(br.amount), 0) as min_daily
      FROM branches b
      LEFT JOIN branch_revenues br ON b.id = br.branch_id AND br.status = 'Active' AND ${dateFilterSql}
      GROUP BY b.id, b.name, b.code
      ORDER BY total_amount DESC
    `;

    const branchCompRes = await db.query(branchCompSql);
    const branchComparison = branchCompRes.rows.map(r => {
      const amt = parseFloat(r.total_amount || '0');
      const bDays = parseInt(r.active_days || '0', 10);
      const entries = parseInt(r.entries_count || '0', 10);
      const percentage = totalRevenue > 0 ? parseFloat(((amt / totalRevenue) * 100).toFixed(1)) : 0;
      return {
        branchId: r.branch_id,
        branchName: r.branch_name,
        branchCode: r.branch_code,
        totalAmount: amt,
        percentage,
        entriesCount: entries,
        activeDays: bDays,
        avgDaily: bDays > 0 ? Math.round(amt / bDays) : 0,
        maxDaily: parseFloat(r.max_daily || '0'),
        minDaily: entries > 0 ? parseFloat(r.min_daily || '0') : 0,
      };
    });

    // Highest and Lowest branches with non-zero collections (or top from array)
    const branchesWithRevenue = branchComparison.filter(b => b.totalAmount > 0);
    const highestBranch = branchesWithRevenue.length > 0 ? branchesWithRevenue[0] : null;
    const lowestBranch = branchesWithRevenue.length > 0 ? branchesWithRevenue[branchesWithRevenue.length - 1] : null;

    return res.json({
      success: true,
      periodName,
      metrics: {
        totalRevenue,
        totalEntries,
        averageDaily,
        activeDays,
        highestBranch: highestBranch ? { name: highestBranch.branchName, amount: highestBranch.totalAmount } : null,
        lowestBranch: lowestBranch ? { name: lowestBranch.branchName, amount: lowestBranch.totalAmount } : null,
      },
      trend: trendData,
      branchComparison,
    });
  } catch (err: any) {
    console.error('Error in GET /api/accounts/reports:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 3. GET /api/accounts/revenue — List Revenue Entries
// ============================================================
router.get('/revenue', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);

    // Permission check
    const hasViewPerm = isSuper || user.permissions?.['accounts.revenue.view'] === true || user.permissions?.['accounts'] === true;
    if (!hasViewPerm) {
      return res.status(403).json({
        success: false,
        message: 'Access Restricted: You do not have permission to view revenue records.',
      });
    }

    const {
      page = '1',
      limit = '20',
      search = '',
      branchId,
      startDate,
      endDate,
      status = 'Active',
      sortBy = 'revenue_date',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // SECURITY ENFORCEMENT:
    // If not superadmin, strictly force branch_id to user's assigned branch
    if (!isSuper) {
      if (!user.branchId) {
        return res.json({
          success: true,
          revenues: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
          totalAmount: 0,
        });
      }
      params.push(user.branchId);
      whereClauses.push(`br.branch_id = $${params.length}`);
    } else if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      params.push(parseInt(String(branchId), 10));
      whereClauses.push(`br.branch_id = $${params.length}`);
    }

    // Status filter
    if (status && status !== 'all' && status !== 'ALL') {
      params.push(String(status));
      whereClauses.push(`br.status = $${params.length}`);
    }

    // Date range filter
    if (startDate) {
      params.push(String(startDate).substring(0, 10));
      whereClauses.push(`br.revenue_date >= $${params.length}::date`);
    }
    if (endDate) {
      params.push(String(endDate).substring(0, 10));
      whereClauses.push(`br.revenue_date <= $${params.length}::date`);
    }

    // Search filter
    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      whereClauses.push(`(
        br.remarks ILIKE $${params.length} OR
        b.name ILIKE $${params.length} OR
        u.full_name ILIKE $${params.length}
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortCols: Record<string, string> = {
      revenue_date: 'br.revenue_date',
      amount: 'br.amount',
      created_at: 'br.created_at',
      branch: 'b.name',
    };
    const sortCol = allowedSortCols[String(sortBy)] || 'br.revenue_date';
    const sortDir = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Total count & total sum query
    const countSql = `
      SELECT COUNT(br.id) as total_count, COALESCE(SUM(br.amount), 0) as total_amount
      FROM branch_revenues br
      JOIN branches b ON br.branch_id = b.id
      LEFT JOIN users u ON br.created_by = u.id
      ${whereSql}
    `;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total_count || '0', 10);
    const totalAmount = parseFloat(countRes.rows[0]?.total_amount || '0');

    // Records query
    const recordsSql = `
      SELECT
        br.id,
        br.branch_id,
        b.name as branch_name,
        b.code as branch_code,
        br.revenue_date,
        br.amount,
        br.remarks,
        br.status,
        br.created_at,
        br.updated_at,
        br.created_by,
        u.full_name as created_by_name,
        u.username as created_by_username,
        br.updated_by,
        uu.full_name as updated_by_name
      FROM branch_revenues br
      JOIN branches b ON br.branch_id = b.id
      LEFT JOIN users u ON br.created_by = u.id
      LEFT JOIN users uu ON br.updated_by = uu.id
      ${whereSql}
      ORDER BY ${sortCol} ${sortDir}, br.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const recordsRes = await db.query(recordsSql, params);
    const revenues = recordsRes.rows.map(r => ({
      id: r.id,
      branchId: r.branch_id,
      branchName: r.branch_name,
      branchCode: r.branch_code,
      revenueDate: formatDateClean(r.revenue_date),
      amount: parseFloat(r.amount),
      remarks: r.remarks || '',
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by,
      createdByName: r.created_by_name || r.created_by_username || 'Staff',
      updatedBy: r.updated_by,
      updatedByName: r.updated_by_name || null,
    }));

    return res.json({
      success: true,
      revenues,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      totalAmount,
    });
  } catch (err: any) {
    console.error('Error in GET /api/accounts/revenue:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 4. GET /api/accounts/revenue/:id — Single Revenue Entry & Audit History
// ============================================================
router.get('/revenue/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);
    const { id } = req.params;

    const resEntry = await db.query(
      `SELECT
         br.*,
         b.name as branch_name,
         b.code as branch_code,
         u.full_name as created_by_name,
         uu.full_name as updated_by_name
       FROM branch_revenues br
       JOIN branches b ON br.branch_id = b.id
       LEFT JOIN users u ON br.created_by = u.id
       LEFT JOIN users uu ON br.updated_by = uu.id
       WHERE br.id = $1`,
      [id]
    );

    if (resEntry.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Revenue record not found.' });
    }

    const row = resEntry.rows[0];

    // Branch authorization check
    if (!isSuper && row.branch_id !== user.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access Restricted: You cannot view revenue entries of other branches.',
      });
    }

    // Fetch audit history for this record from activity_logs
    const histRes = await db.query(
      `SELECT al.*, u.full_name as actor_name, u.username as actor_username
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.module = 'Accounts' AND al.record_id = $1
       ORDER BY al.created_at DESC`,
      [String(id)]
    );

    const history = histRes.rows.map(h => ({
      id: h.id,
      action: h.action,
      details: (() => {
        try {
          return JSON.parse(h.details);
        } catch {
          return h.details;
        }
      })(),
      createdAt: h.created_at,
      actorName: h.actor_name || h.actor_username || 'System',
    }));

    return res.json({
      success: true,
      revenue: {
        id: row.id,
        branchId: row.branch_id,
        branchName: row.branch_name,
        branchCode: row.branch_code,
        revenueDate: formatDateClean(row.revenue_date),
        amount: parseFloat(row.amount),
        remarks: row.remarks || '',
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdByName: row.created_by_name || 'Staff',
        updatedByName: row.updated_by_name || null,
      },
      history,
    });
  } catch (err: any) {
    console.error('Error in GET /api/accounts/revenue/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 5. POST /api/accounts/revenue — Add New Revenue Entry
// ============================================================
router.post('/revenue', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);

    // Permission check
    const hasCreatePerm = isSuper || user.permissions?.['accounts.revenue.create'] === true || user.permissions?.['accounts'] === true;
    if (!hasCreatePerm) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to create revenue entries.',
      });
    }

    let { branchId, branch_id, revenueDate, revenue_date, amount, remarks } = req.body;

    // 1. Resolve & Enforce Branch ID
    let finalBranchId: number;
    if (isSuper) {
      const bTarget = branchId || branch_id;
      if (!bTarget) {
        return res.status(400).json({ success: false, message: 'Branch selection is required.' });
      }
      finalBranchId = parseInt(String(bTarget), 10);
    } else {
      // Backend STRICTLY enforces user's branch
      if (!user.branchId) {
        return res.status(403).json({ success: false, message: 'Your account is not assigned to any branch.' });
      }
      finalBranchId = Number(user.branchId);
    }

    // Verify branch exists in DB
    const branchCheck = await db.query(`SELECT id, name FROM branches WHERE id = $1`, [finalBranchId]);
    if (branchCheck.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID specified.' });
    }
    const branchName = branchCheck.rows[0].name;

    // 2. Validate Amount
    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Revenue amount must be a valid number greater than zero.' });
    }

    // 3. Validate Date (Reject future dates in Nepal Time)
    const targetDateStr = String(revenueDate || revenue_date || getNepalTodayStr()).substring(0, 10);
    const nepalToday = getNepalTodayStr();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Expected YYYY-MM-DD.' });
    }
    if (targetDateStr > nepalToday) {
      return res.status(400).json({
        success: false,
        message: `Future dates are not permitted. Revenue date cannot exceed today (${nepalToday}).`,
      });
    }

    const cleanRemarks = remarks ? String(remarks).trim() : null;

    // 4. Insert Record (Multiple entries per branch per day are supported)
    const insSql = `
      INSERT INTO branch_revenues (
        branch_id, revenue_date, amount, remarks, created_by, updated_by, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $5, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const insRes = await db.query(insSql, [finalBranchId, targetDateStr, parsedAmount, cleanRemarks, user.id]);
    const createdRecord = insRes.rows[0];

    // 5. Write to Activity / Audit Log
    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Revenue Created',
      recordId: createdRecord.id,
      details: {
        branchId: finalBranchId,
        branchName,
        revenueDate: targetDateStr,
        amount: parsedAmount,
        remarks: cleanRemarks,
        enteredBy: user.fullName || user.username,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Revenue entry of Rs. ${parsedAmount.toLocaleString()} saved successfully for ${branchName}.`,
      revenue: {
        id: createdRecord.id,
        branchId: createdRecord.branch_id,
        branchName,
        revenueDate: targetDateStr,
        amount: parsedAmount,
        remarks: createdRecord.remarks || '',
        status: createdRecord.status,
        createdAt: createdRecord.created_at,
        createdByName: user.fullName || user.username,
      },
    });
  } catch (err: any) {
    console.error('Error in POST /api/accounts/revenue:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 6. PUT /api/accounts/revenue/:id — Update Revenue Entry
// ============================================================
router.put('/revenue/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);
    const { id } = req.params;

    // Permission check
    const hasEditPerm = isSuper || user.permissions?.['accounts.revenue.edit'] === true || user.permissions?.['accounts'] === true;
    if (!hasEditPerm) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to edit revenue records.',
      });
    }

    const existRes = await db.query(
      `SELECT br.*, b.name as branch_name FROM branch_revenues br JOIN branches b ON br.branch_id = b.id WHERE br.id = $1`,
      [id]
    );

    if (existRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Revenue entry not found.' });
    }

    const existing = existRes.rows[0];

    // Branch authorization check
    if (!isSuper && existing.branch_id !== user.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access Restricted: You can only edit revenue entries of your own branch.',
      });
    }

    if (existing.status === 'Voided') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a voided revenue record.',
      });
    }

    let { amount, revenueDate, revenue_date, remarks } = req.body;

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Revenue amount must be greater than zero.' });
    }

    const targetDateStr = String(revenueDate || revenue_date || existing.revenue_date).substring(0, 10);
    const nepalToday = getNepalTodayStr();

    if (targetDateStr > nepalToday) {
      return res.status(400).json({
        success: false,
        message: `Future dates are not permitted. Revenue date cannot exceed today (${nepalToday}).`,
      });
    }

    const cleanRemarks = remarks !== undefined ? String(remarks).trim() : existing.remarks;

    const oldAmount = parseFloat(existing.amount);
    const oldRemarks = existing.remarks || '';
    const oldDate = formatDateClean(existing.revenue_date);

    // Update query
    const updateSql = `
      UPDATE branch_revenues
      SET amount = $1, revenue_date = $2, remarks = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const upRes = await db.query(updateSql, [parsedAmount, targetDateStr, cleanRemarks, user.id, id]);
    const updated = upRes.rows[0];

    // Log modification in activity_logs
    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Revenue Updated',
      recordId: id,
      details: {
        branchId: existing.branch_id,
        branchName: existing.branch_name,
        oldAmount,
        newAmount: parsedAmount,
        oldRemarks,
        newRemarks: cleanRemarks,
        oldDate,
        newDate: targetDateStr,
        updatedBy: user.fullName || user.username,
      },
    });

    return res.json({
      success: true,
      message: 'Revenue entry updated successfully.',
      revenue: {
        id: updated.id,
        branchId: updated.branch_id,
        branchName: existing.branch_name,
        revenueDate: targetDateStr,
        amount: parsedAmount,
        remarks: updated.remarks || '',
        status: updated.status,
        updatedAt: updated.updated_at,
        updatedByName: user.fullName || user.username,
      },
    });
  } catch (err: any) {
    console.error('Error in PUT /api/accounts/revenue/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 7. PATCH /api/accounts/revenue/:id/void — Void / Cancel Entry
// ============================================================
router.patch('/revenue/:id/void', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({
        success: false,
        message: 'Access Restricted: Only Super Admin can void revenue entries.',
      });
    }

    const { id } = req.params;
    const { reason = 'Voided by Super Admin' } = req.body;

    const existRes = await db.query(
      `SELECT br.*, b.name as branch_name FROM branch_revenues br JOIN branches b ON br.branch_id = b.id WHERE br.id = $1`,
      [id]
    );

    if (existRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Revenue entry not found.' });
    }

    const existing = existRes.rows[0];
    if (existing.status === 'Voided') {
      return res.status(400).json({ success: false, message: 'This entry is already voided.' });
    }

    await db.query(
      `UPDATE branch_revenues SET status = 'Voided', updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [user.id, id]
    );

    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Revenue Voided',
      recordId: id,
      details: {
        branchId: existing.branch_id,
        branchName: existing.branch_name,
        amount: parseFloat(existing.amount),
        revenueDate: formatDateClean(existing.revenue_date),
        reason: String(reason).trim(),
        voidedBy: user.fullName || user.username,
      },
    });

    return res.json({
      success: true,
      message: `Revenue entry #${id} has been voided.`,
    });
  } catch (err: any) {
    console.error('Error in PATCH /api/accounts/revenue/:id/void:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 8. GET /api/accounts/export — Export Revenue Records to CSV
// ============================================================
router.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to export revenue data.',
      });
    }

    const { branchId, startDate, endDate, status = 'Active', search = '' } = req.query;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      params.push(parseInt(String(branchId), 10));
      whereClauses.push(`br.branch_id = $${params.length}`);
    }

    if (status && status !== 'all' && status !== 'ALL') {
      params.push(String(status));
      whereClauses.push(`br.status = $${params.length}`);
    }

    if (startDate) {
      params.push(String(startDate).substring(0, 10));
      whereClauses.push(`br.revenue_date >= $${params.length}::date`);
    }

    if (endDate) {
      params.push(String(endDate).substring(0, 10));
      whereClauses.push(`br.revenue_date <= $${params.length}::date`);
    }

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      whereClauses.push(`(
        br.remarks ILIKE $${params.length} OR
        b.name ILIKE $${params.length} OR
        u.full_name ILIKE $${params.length}
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const recordsSql = `
      SELECT
        br.id,
        b.name as branch_name,
        b.code as branch_code,
        br.revenue_date,
        br.amount,
        br.remarks,
        br.status,
        u.full_name as entered_by,
        br.created_at,
        br.updated_at
      FROM branch_revenues br
      JOIN branches b ON br.branch_id = b.id
      LEFT JOIN users u ON br.created_by = u.id
      ${whereSql}
      ORDER BY br.revenue_date DESC, br.id DESC
    `;

    const recordsRes = await db.query(recordsSql, params);

    // Build CSV
    const headers = ['ID', 'Date', 'Branch Code', 'Branch Name', 'Amount (Rs.)', 'Remarks', 'Status', 'Entered By', 'Created At'];
    const rows = recordsRes.rows.map(r => [
      r.id,
      formatDateClean(r.revenue_date),
      r.branch_code || '',
      `"${String(r.branch_name || '').replace(/"/g, '""')}"`,
      parseFloat(r.amount || 0).toFixed(2),
      `"${String(r.remarks || '').replace(/"/g, '""')}"`,
      r.status,
      `"${String(r.entered_by || '').replace(/"/g, '""')}"`,
      r.created_at ? new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 19) : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

    const nepalToday = getNepalTodayStr();
    const filename = `FWCPL_Revenue_Report_${nepalToday}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Error in GET /api/accounts/export:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
