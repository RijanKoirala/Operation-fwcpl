import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate } from '../middleware/auth';
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
    user.permissions?.['accounts.view'] === true ||
    user.permissions?.['accounts.banks.view'] === true
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

// Helper: Get or ensure CASH account ID
async function getOrCreateCashAccountId(): Promise<number> {
  const res = await db.query(
    `SELECT id FROM accounts WHERE account_type = 'CASH' OR account_name = 'CASH' LIMIT 1`
  );
  if (res.rowCount && res.rowCount > 0) {
    return res.rows[0].id;
  }
  const ins = await db.query(
    `INSERT INTO accounts (account_name, account_type, opening_balance) VALUES ('CASH', 'CASH', 0.00) RETURNING id`
  );
  return ins.rows[0].id;
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
    const todayCond = `revenue_date = '${nepalToday}'::date`;
    const yesterdayCond = `revenue_date = ('${nepalToday}'::date - INTERVAL '1 day')::date`;
    const weekCond = `revenue_date >= date_trunc('week', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('week', '${nepalToday}'::date) + INTERVAL '6 days')::date`;
    const monthCond = `revenue_date >= date_trunc('month', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('month', '${nepalToday}'::date) + INTERVAL '1 month - 1 day')::date`;
    const yearCond = `revenue_date >= date_trunc('year', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('year', '${nepalToday}'::date) + INTERVAL '1 year - 1 day')::date`;

    let selectedCond = monthCond;
    let periodLabel = 'This Month';
    if (period === 'today') {
      selectedCond = todayCond;
      periodLabel = 'Today';
    } else if (period === 'yesterday') {
      selectedCond = yesterdayCond;
      periodLabel = 'Yesterday';
    } else if (period === 'week') {
      selectedCond = weekCond;
      periodLabel = 'This Week';
    } else if (period === 'month') {
      selectedCond = monthCond;
      periodLabel = 'This Month';
    } else if (period === 'year') {
      selectedCond = yearCond;
      periodLabel = 'This Year';
    } else if (period === 'custom' && startDate && endDate) {
      selectedCond = `revenue_date >= '${String(startDate).substring(0, 10)}'::date AND revenue_date <= '${String(endDate).substring(0, 10)}'::date`;
      periodLabel = `${startDate} to ${endDate}`;
    }

    let branchClause = '';
    const branchParams: any[] = [];
    if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      branchParams.push(parseInt(String(branchId), 10));
      branchClause = `AND branch_id = $1`;
    }

    // 1. Overall Metrics Cards
    const metricsSql = `
      SELECT
        COALESCE(SUM(CASE WHEN ${todayCond} THEN amount ELSE 0 END), 0) as today_revenue,
        COALESCE(SUM(CASE WHEN ${yesterdayCond} THEN amount ELSE 0 END), 0) as yesterday_revenue,
        COALESCE(SUM(CASE WHEN ${weekCond} THEN amount ELSE 0 END), 0) as week_revenue,
        COALESCE(SUM(CASE WHEN ${monthCond} THEN amount ELSE 0 END), 0) as month_revenue,
        COALESCE(SUM(CASE WHEN ${yearCond} THEN amount ELSE 0 END), 0) as year_revenue,
        COALESCE(SUM(CASE WHEN ${selectedCond} THEN amount ELSE 0 END), 0) as selected_period_revenue,
        COUNT(CASE WHEN ${selectedCond} THEN 1 END) as selected_period_entries,
        COALESCE(SUM(CASE WHEN ${todayCond} AND (collection_type = 'CASH' OR collection_type IS NULL) THEN amount ELSE 0 END), 0) as today_cash,
        COALESCE(SUM(CASE WHEN ${todayCond} AND collection_type = 'ONLINE' THEN amount ELSE 0 END), 0) as today_online
      FROM branch_revenues
      WHERE status = 'Active' ${branchClause}
    `;

    const metricsRes = await db.query(metricsSql, branchParams);
    const mRow = metricsRes.rows[0] || {};

    // 2. Financial Ledger & Balances summary
    // Total cash collected vs deposited (for active records)
    const cashStatsRes = await db.query(`
      SELECT
        COALESCE(SUM(amount), 0) as total_cash_collected
      FROM branch_revenues
      WHERE status = 'Active' AND collection_type = 'CASH'
    `);
    const totalCashCollected = parseFloat(cashStatsRes.rows[0]?.total_cash_collected || '0');

    const depositStatsRes = await db.query(`
      SELECT
        COALESCE(SUM(total_deposit_amount), 0) as total_deposited,
        COALESCE(SUM(CASE WHEN deposit_date = '${nepalToday}'::date THEN total_deposit_amount ELSE 0 END), 0) as today_deposits
      FROM cash_deposits
    `);
    const totalCashDeposited = parseFloat(depositStatsRes.rows[0]?.total_deposited || '0');
    const todayDeposits = parseFloat(depositStatsRes.rows[0]?.today_deposits || '0');
    const cashUndeposited = Math.max(0, totalCashCollected - totalCashDeposited);

    // Today's expenses
    const todayExpRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as today_expenses
      FROM account_expenses
      WHERE expense_date = '${nepalToday}'::date
    `);
    const todayExpenses = parseFloat(todayExpRes.rows[0]?.today_expenses || '0');

    // Current Balances per Account calculated from ledger transactions
    const accountsBalanceRes = await db.query(`
      SELECT
        a.id,
        a.account_name,
        a.account_type,
        a.is_active,
        a.opening_balance,
        COALESCE(SUM(t.credit_amount), 0) as total_credits,
        COALESCE(SUM(t.debit_amount), 0) as total_debits,
        (COALESCE(SUM(t.credit_amount), 0) - COALESCE(SUM(t.debit_amount), 0)) as current_balance
      FROM accounts a
      LEFT JOIN account_transactions t ON a.id = t.account_id AND t.status = 'Active'
      GROUP BY a.id, a.account_name, a.account_type, a.is_active, a.opening_balance
      ORDER BY a.account_type, a.account_name
    `);

    let totalBankBalance = 0;
    let totalCashBalance = 0;
    let totalWalletBalance = 0;

    const accountsSummaryList = accountsBalanceRes.rows.map(r => {
      const curBal = parseFloat(r.current_balance || '0');
      if (r.account_type === 'BANK') {
        totalBankBalance += curBal;
      } else if (r.account_type === 'CASH') {
        totalCashBalance += curBal;
      } else if (r.account_type === 'DIGITAL_WALLET') {
        totalWalletBalance += curBal;
      }
      return {
        id: r.id,
        accountName: r.account_name,
        accountType: r.account_type,
        isActive: r.is_active,
        openingBalance: parseFloat(r.opening_balance || '0'),
        totalCredits: parseFloat(r.total_credits || '0'),
        totalDebits: parseFloat(r.total_debits || '0'),
        currentBalance: curBal,
      };
    });

    const totalAvailableFunds = totalBankBalance + totalCashBalance + totalWalletBalance;

    const summaryCards = {
      today: parseFloat(mRow.today_revenue || '0'),
      yesterday: parseFloat(mRow.yesterday_revenue || '0'),
      thisWeek: parseFloat(mRow.week_revenue || '0'),
      thisMonth: parseFloat(mRow.month_revenue || '0'),
      thisYear: parseFloat(mRow.year_revenue || '0'),
      selectedPeriod: parseFloat(mRow.selected_period_revenue || '0'),
      selectedEntries: parseInt(mRow.selected_period_entries || '0', 10),
      periodLabel,
      todayCash: parseFloat(mRow.today_cash || '0'),
      todayOnline: parseFloat(mRow.today_online || '0'),
      cashUndeposited,
      todayDeposits,
      todayExpenses,
      totalBankBalance,
      totalCashBalance,
      totalAvailableFunds,
    };

    // 3. Branch-Wise Summary Table
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
        COUNT(CASE WHEN br.status = 'Active' AND ${selectedCond.replace(/revenue_date/g, 'br.revenue_date')} THEN 1 END) as entries_count,
        COALESCE(SUM(CASE WHEN br.status = 'Active' AND ${selectedCond.replace(/revenue_date/g, 'br.revenue_date')} AND (br.collection_type = 'CASH' OR br.collection_type IS NULL) THEN br.amount ELSE 0 END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN br.status = 'Active' AND ${selectedCond.replace(/revenue_date/g, 'br.revenue_date')} AND br.collection_type = 'ONLINE' THEN br.amount ELSE 0 END), 0) as online_revenue
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
      cashRevenue: parseFloat(r.cash_revenue || '0'),
      onlineRevenue: parseFloat(r.online_revenue || '0'),
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
      return isAsc ? a.selectedRevenue - b.selectedRevenue : b.selectedRevenue - a.selectedRevenue;
    });

    return res.json({
      success: true,
      summaryCards,
      branchesSummary: branchRows,
      accountsSummary: accountsSummaryList,
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

    const { period = 'month', startDate, endDate, branchId, collectionType } = req.query;

    const nepalToday = getNepalTodayStr();

    let dateCond = `revenue_date >= date_trunc('month', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('month', '${nepalToday}'::date) + INTERVAL '1 month - 1 day')::date`;
    let groupFormat = 'YYYY-MM-DD';

    if (period === 'today') {
      dateCond = `revenue_date = '${nepalToday}'::date`;
      groupFormat = 'YYYY-MM-DD';
    } else if (period === 'yesterday') {
      dateCond = `revenue_date = ('${nepalToday}'::date - INTERVAL '1 day')::date`;
      groupFormat = 'YYYY-MM-DD';
    } else if (period === 'week') {
      dateCond = `revenue_date >= date_trunc('week', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('week', '${nepalToday}'::date) + INTERVAL '6 days')::date`;
      groupFormat = 'YYYY-MM-DD';
    } else if (period === 'month') {
      dateCond = `revenue_date >= date_trunc('month', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('month', '${nepalToday}'::date) + INTERVAL '1 month - 1 day')::date`;
      groupFormat = 'YYYY-MM-DD';
    } else if (period === 'year') {
      dateCond = `revenue_date >= date_trunc('year', '${nepalToday}'::date)::date AND revenue_date <= (date_trunc('year', '${nepalToday}'::date) + INTERVAL '1 year - 1 day')::date`;
      groupFormat = 'YYYY-MM';
    } else if (period === 'custom' && startDate && endDate) {
      dateCond = `revenue_date >= '${String(startDate).substring(0, 10)}'::date AND revenue_date <= '${String(endDate).substring(0, 10)}'::date`;
      groupFormat = 'YYYY-MM-DD';
    }

    let filterClauses = `WHERE status = 'Active' AND ${dateCond}`;
    if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      filterClauses += ` AND branch_id = ${parseInt(String(branchId), 10)}`;
    }
    if (collectionType && collectionType !== 'ALL' && collectionType !== 'all') {
      filterClauses += ` AND collection_type = '${String(collectionType)}'`;
    }

    // 1. Trend series
    const trendSql = `
      SELECT
        to_char(revenue_date, '${groupFormat}') as bucket,
        revenue_date as date,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(id) as entries,
        COALESCE(SUM(CASE WHEN collection_type = 'CASH' OR collection_type IS NULL THEN amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN collection_type = 'ONLINE' THEN amount ELSE 0 END), 0) as online_amount
      FROM branch_revenues
      ${filterClauses}
      GROUP BY bucket, revenue_date
      ORDER BY bucket ASC, revenue_date ASC
    `;
    const trendRes = await db.query(trendSql);
    const trendData = trendRes.rows.map(r => ({
      bucket: r.bucket,
      date: formatDateClean(r.date),
      amount: parseFloat(r.amount),
      entries: parseInt(r.entries, 10),
      cashAmount: parseFloat(r.cash_amount),
      onlineAmount: parseFloat(r.online_amount),
    }));

    // 2. Branch comparison
    const branchComparisonSql = `
      SELECT
        b.id as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        COALESCE(SUM(br.amount), 0) as total_amount,
        COUNT(br.id) as entries_count,
        COUNT(DISTINCT br.revenue_date) as active_days,
        COALESCE(AVG(br.amount), 0) as avg_daily,
        COALESCE(MAX(br.amount), 0) as max_daily,
        COALESCE(MIN(br.amount), 0) as min_daily
      FROM branches b
      LEFT JOIN branch_revenues br ON b.id = br.branch_id AND br.status = 'Active' AND ${dateCond.replace(/revenue_date/g, 'br.revenue_date')}
      ${branchId && branchId !== 'ALL' && branchId !== 'all' ? `WHERE b.id = ${parseInt(String(branchId), 10)}` : ''}
      GROUP BY b.id, b.name, b.code
      ORDER BY total_amount DESC
    `;
    const branchCompRes = await db.query(branchComparisonSql);

    const totalReportRevenue = branchCompRes.rows.reduce((acc, cur) => acc + parseFloat(cur.total_amount || '0'), 0);

    const branchComparison = branchCompRes.rows.map(r => {
      const amt = parseFloat(r.total_amount || '0');
      return {
        branchId: r.branch_id,
        branchName: r.branch_name,
        branchCode: r.branch_code,
        totalAmount: amt,
        percentage: totalReportRevenue > 0 ? parseFloat(((amt / totalReportRevenue) * 100).toFixed(1)) : 0,
        entriesCount: parseInt(r.entries_count || '0', 10),
        activeDays: parseInt(r.active_days || '0', 10),
        avgDaily: parseFloat(r.avg_daily || '0'),
        maxDaily: parseFloat(r.max_daily || '0'),
        minDaily: amt > 0 ? parseFloat(r.min_daily || '0') : 0,
      };
    });

    // 3. Cash vs Online breakdown
    const cashVsOnlineRes = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN collection_type = 'CASH' OR collection_type IS NULL THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN collection_type = 'ONLINE' THEN amount ELSE 0 END), 0) as online_total,
        COALESCE(SUM(CASE WHEN collection_type = 'LEGACY' THEN amount ELSE 0 END), 0) as legacy_total
      FROM branch_revenues
      ${filterClauses}
    `);
    const cvoRow = cashVsOnlineRes.rows[0] || {};
    const cashTotal = parseFloat(cvoRow.cash_total || '0');
    const onlineTotal = parseFloat(cvoRow.online_total || '0');
    const legacyTotal = parseFloat(cvoRow.legacy_total || '0');

    // 4. Expense category breakdown in period
    const expDateCond = dateCond.replace(/revenue_date/g, 'expense_date');
    const expRes = await db.query(`
      SELECT
        category,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(id) as count
      FROM account_expenses
      WHERE ${expDateCond}
      GROUP BY category
      ORDER BY amount DESC
    `);
    const expensesByCategory = expRes.rows.map(r => ({
      category: r.category,
      amount: parseFloat(r.amount),
      count: parseInt(r.count, 10),
    }));

    // 5. Bank distribution (current balances across all accounts)
    const bankDistRes = await db.query(`
      SELECT
        a.account_name,
        a.account_type,
        (COALESCE(SUM(t.credit_amount), 0) - COALESCE(SUM(t.debit_amount), 0)) as balance
      FROM accounts a
      LEFT JOIN account_transactions t ON a.id = t.account_id AND t.status = 'Active'
      GROUP BY a.id, a.account_name, a.account_type
      HAVING (COALESCE(SUM(t.credit_amount), 0) - COALESCE(SUM(t.debit_amount), 0)) > 0
      ORDER BY balance DESC
    `);
    const accountDistribution = bankDistRes.rows.map(r => ({
      name: r.account_name,
      type: r.account_type,
      balance: parseFloat(r.balance || '0'),
    }));

    // Summary metrics
    const nonZeroBranches = branchComparison.filter(b => b.totalAmount > 0);
    const highestBranch = nonZeroBranches.length > 0 ? { name: nonZeroBranches[0].branchName, amount: nonZeroBranches[0].totalAmount } : null;
    const lowestBranch = nonZeroBranches.length > 0 ? { name: nonZeroBranches[nonZeroBranches.length - 1].branchName, amount: nonZeroBranches[nonZeroBranches.length - 1].totalAmount } : null;

    const totalEntries = branchComparison.reduce((acc, cur) => acc + cur.entriesCount, 0);

    return res.json({
      success: true,
      metrics: {
        totalRevenue: totalReportRevenue,
        totalEntries,
        averageDaily: trendData.length > 0 ? totalReportRevenue / trendData.length : 0,
        activeDays: trendData.length,
        highestBranch,
        lowestBranch,
        totalCashCollection: cashTotal,
        totalOnlineCollection: onlineTotal,
        totalLegacyCollection: legacyTotal,
      },
      trend: trendData,
      branchComparison,
      cashVsOnline: [
        { name: 'Cash Collection', amount: cashTotal },
        { name: 'Online Collection', amount: onlineTotal },
        ...(legacyTotal > 0 ? [{ name: 'Legacy Collection', amount: legacyTotal }] : []),
      ],
      expensesByCategory,
      accountDistribution,
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
      collectionType,
      status = 'Active',
      sortBy = 'revenue_date',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses: string[] = [];
    const params: any[] = [];

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

    if (status && status !== 'all' && status !== 'ALL') {
      params.push(String(status));
      whereClauses.push(`br.status = $${params.length}`);
    }

    if (collectionType && collectionType !== 'all' && collectionType !== 'ALL') {
      params.push(String(collectionType));
      whereClauses.push(`br.collection_type = $${params.length}`);
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
        COALESCE(br.revenue_code, '') ILIKE $${params.length} OR
        u.full_name ILIKE $${params.length}
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const allowedSortCols: Record<string, string> = {
      revenue_date: 'br.revenue_date',
      amount: 'br.amount',
      created_at: 'br.created_at',
      branch: 'b.name',
      collection_type: 'br.collection_type',
    };
    const sortCol = allowedSortCols[String(sortBy)] || 'br.revenue_date';
    const sortDir = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

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

    const recordsSql = `
      SELECT
        br.id,
        br.branch_id,
        b.name as branch_name,
        b.code as branch_code,
        br.revenue_date,
        br.amount,
        COALESCE(br.collection_type, 'CASH') as collection_type,
        br.received_account_id,
        a.account_name as received_account_name,
        COALESCE(br.revenue_code, 'REV-' || LPAD(br.id::text, 5, '0')) as revenue_code,
        COALESCE((SELECT SUM(cd.total_deposit_amount) FROM cash_deposits cd WHERE cd.revenue_id = br.id), 0) as deposited_amount,
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
      LEFT JOIN accounts a ON br.received_account_id = a.id
      LEFT JOIN users u ON br.created_by = u.id
      LEFT JOIN users uu ON br.updated_by = uu.id
      ${whereSql}
      ORDER BY ${sortCol} ${sortDir}, br.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const recordsRes = await db.query(recordsSql, params);
    const revenues = recordsRes.rows.map(r => {
      const amt = parseFloat(r.amount);
      const depAmt = parseFloat(r.deposited_amount || '0');
      const remAmt = Math.max(0, amt - depAmt);
      let depStatus: 'Undeposited' | 'Partially Deposited' | 'Fully Deposited' = 'Undeposited';
      if (r.collection_type === 'CASH') {
        if (depAmt <= 0) depStatus = 'Undeposited';
        else if (remAmt <= 0) depStatus = 'Fully Deposited';
        else depStatus = 'Partially Deposited';
      }

      return {
        id: r.id,
        revenueCode: r.revenue_code,
        branchId: r.branch_id,
        branchName: r.branch_name,
        branchCode: r.branch_code,
        revenueDate: formatDateClean(r.revenue_date),
        amount: amt,
        collectionType: r.collection_type,
        receivedAccountId: r.received_account_id,
        receivedAccountName: r.received_account_name,
        depositedAmount: depAmt,
        remainingAmount: remAmt,
        depositStatus: depStatus,
        remarks: r.remarks || '',
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        createdBy: r.created_by,
        createdByName: r.created_by_name || r.created_by_username || 'Staff',
        updatedBy: r.updated_by,
        updatedByName: r.updated_by_name || null,
      };
    });

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
// 4. GET /api/accounts/revenue/:id — Revenue Detail & Audit History
// ============================================================
router.get('/revenue/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);
    const revId = parseInt(req.params.id, 10);
    if (isNaN(revId)) {
      return res.status(400).json({ success: false, message: 'Invalid revenue ID.' });
    }

    const recRes = await db.query(
      `SELECT
        br.*,
        b.name as branch_name,
        b.code as branch_code,
        a.account_name as received_account_name,
        COALESCE(br.revenue_code, 'REV-' || LPAD(br.id::text, 5, '0')) as revenue_code,
        COALESCE((SELECT SUM(cd.total_deposit_amount) FROM cash_deposits cd WHERE cd.revenue_id = br.id), 0) as deposited_amount,
        u.full_name as created_by_name,
        uu.full_name as updated_by_name
       FROM branch_revenues br
       JOIN branches b ON br.branch_id = b.id
       LEFT JOIN accounts a ON br.received_account_id = a.id
       LEFT JOIN users u ON br.created_by = u.id
       LEFT JOIN users uu ON br.updated_by = uu.id
       WHERE br.id = $1`,
      [revId]
    );

    if (recRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Revenue entry not found.' });
    }

    const r = recRes.rows[0];

    // Branch tenancy check
    if (!isSuper && Number(r.branch_id) !== Number(user.branchId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access revenue records for other branches.',
      });
    }

    // Associated deposits history if cash
    const depositsRes = await db.query(
      `SELECT cd.*, u.full_name as created_by_name
       FROM cash_deposits cd
       LEFT JOIN users u ON cd.created_by = u.id
       WHERE cd.revenue_id = $1
       ORDER BY cd.deposit_date DESC, cd.id DESC`,
      [revId]
    );

    const deposits = [];
    for (const dep of depositsRes.rows) {
      const allocRes = await db.query(
        `SELECT cda.*, a.account_name, a.account_type
         FROM cash_deposit_allocations cda
         JOIN accounts a ON cda.account_id = a.id
         WHERE cda.deposit_id = $1`,
        [dep.id]
      );
      deposits.push({
        id: dep.id,
        depositCode: dep.deposit_code,
        depositDate: formatDateClean(dep.deposit_date),
        totalDepositAmount: parseFloat(dep.total_deposit_amount),
        remarks: dep.remarks,
        createdByName: dep.created_by_name,
        createdAt: dep.created_at,
        allocations: allocRes.rows.map(al => ({
          id: al.id,
          accountId: al.account_id,
          accountName: al.account_name,
          accountType: al.account_type,
          amount: parseFloat(al.amount),
        })),
      });
    }

    // Audit logs for this record
    const auditRes = await db.query(
      `SELECT al.*, u.full_name as user_name
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.module = 'Accounts' AND al.record_id = $1
       ORDER BY al.created_at DESC LIMIT 50`,
      [String(revId)]
    );

    return res.json({
      success: true,
      revenue: {
        id: r.id,
        revenueCode: r.revenue_code,
        branchId: r.branch_id,
        branchName: r.branch_name,
        branchCode: r.branch_code,
        revenueDate: formatDateClean(r.revenue_date),
        amount: parseFloat(r.amount),
        collectionType: r.collection_type,
        receivedAccountId: r.received_account_id,
        receivedAccountName: r.received_account_name,
        depositedAmount: parseFloat(r.deposited_amount || '0'),
        remainingAmount: Math.max(0, parseFloat(r.amount) - parseFloat(r.deposited_amount || '0')),
        remarks: r.remarks || '',
        status: r.status,
        createdAt: r.created_at,
        createdByName: r.created_by_name || 'Staff',
        updatedAt: r.updated_at,
        updatedByName: r.updated_by_name || null,
      },
      deposits,
      auditHistory: auditRes.rows,
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

    const hasCreatePerm = isSuper || user.permissions?.['accounts.revenue.create'] === true || user.permissions?.['accounts'] === true;
    if (!hasCreatePerm) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to create revenue entries.',
      });
    }

    let {
      branchId,
      branch_id,
      revenueDate,
      revenue_date,
      amount,
      remarks,
      collectionType,
      collection_type,
      receivedAccountId,
      received_account_id,
      accountId,
    } = req.body;

    // 1. Resolve & Enforce Branch ID
    let finalBranchId: number;
    if (isSuper) {
      const bTarget = branchId || branch_id;
      if (!bTarget) {
        return res.status(400).json({ success: false, message: 'Branch selection is required.' });
      }
      finalBranchId = parseInt(String(bTarget), 10);
    } else {
      if (!user.branchId) {
        return res.status(403).json({ success: false, message: 'Your account is not assigned to any branch.' });
      }
      finalBranchId = Number(user.branchId);
    }

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

    // 3. Validate Date
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

    // 4. Validate Collection Type
    const rawType = String(collectionType || collection_type || 'CASH').toUpperCase();
    const finalCollectionType = rawType === 'ONLINE' ? 'ONLINE' : 'CASH';

    let finalReceivedAccountId: number | null = null;
    let receivedAccountName: string | null = null;

    if (finalCollectionType === 'ONLINE') {
      const targetAccId = receivedAccountId || received_account_id || accountId;
      if (!targetAccId) {
        return res.status(400).json({
          success: false,
          message: 'Destination Account/Bank is required for Online collection entries.',
        });
      }
      finalReceivedAccountId = parseInt(String(targetAccId), 10);
      const accChk = await db.query(
        `SELECT id, account_name, is_active FROM accounts WHERE id = $1`,
        [finalReceivedAccountId]
      );
      if (accChk.rowCount === 0) {
        return res.status(400).json({ success: false, message: 'Selected bank/account does not exist.' });
      }
      if (!accChk.rows[0].is_active) {
        return res.status(400).json({ success: false, message: 'Selected bank/account is inactive.' });
      }
      receivedAccountName = accChk.rows[0].account_name;
    }

    const cleanRemarks = remarks ? String(remarks).trim() : null;

    // 5. Insert Record
    const insSql = `
      INSERT INTO branch_revenues (
        branch_id, revenue_date, amount, remarks, collection_type, received_account_id, created_by, updated_by, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const insRes = await db.query(insSql, [
      finalBranchId,
      targetDateStr,
      parsedAmount,
      cleanRemarks,
      finalCollectionType,
      finalReceivedAccountId,
      user.id,
    ]);
    const createdRecord = insRes.rows[0];

    // Set readable revenue_code
    const revenueCode = `REV-${String(createdRecord.id).padStart(5, '0')}`;
    await db.query(`UPDATE branch_revenues SET revenue_code = $1 WHERE id = $2`, [revenueCode, createdRecord.id]);
    createdRecord.revenue_code = revenueCode;

    // 6. Automatically Record in Financial Ledger
    if (finalCollectionType === 'ONLINE' && finalReceivedAccountId) {
      // Direct credit to selected bank/wallet
      const txIns = await db.query(
        `INSERT INTO account_transactions (
          transaction_code, account_id, transaction_type, transaction_date,
          branch_id, revenue_id, description, reference_number,
          credit_amount, debit_amount, created_by, created_at, status
        ) VALUES (
          'TX-TEMP', $1, 'ONLINE_COLLECTION', $2::date,
          $3, $4, $5, $6,
          $7, 0.00, $8, CURRENT_TIMESTAMP, 'Active'
        ) RETURNING id`,
        [
          finalReceivedAccountId,
          targetDateStr,
          finalBranchId,
          createdRecord.id,
          `Online collection received for ${branchName} (${receivedAccountName})`,
          revenueCode,
          parsedAmount,
          user.id,
        ]
      );

      if (txIns.rowCount && txIns.rowCount > 0) {
        const txId = txIns.rows[0].id;
        await db.query(
          `UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`,
          [`TX-${String(txId).padStart(5, '0')}`, txId]
        );
      }
    } else {
      // CASH Collection -> automatically credited to CASH account
      const cashAccountId = await getOrCreateCashAccountId();
      const txIns = await db.query(
        `INSERT INTO account_transactions (
          transaction_code, account_id, transaction_type, transaction_date,
          branch_id, revenue_id, description, reference_number,
          credit_amount, debit_amount, created_by, created_at, status
        ) VALUES (
          'TX-TEMP', $1, 'CASH_COLLECTION', $2::date,
          $3, $4, $5, $6,
          $7, 0.00, $8, CURRENT_TIMESTAMP, 'Active'
        ) RETURNING id`,
        [
          cashAccountId,
          targetDateStr,
          finalBranchId,
          createdRecord.id,
          `Cash collection at ${branchName}`,
          revenueCode,
          parsedAmount,
          user.id,
        ]
      );
      if (txIns.rowCount && txIns.rowCount > 0) {
        const txId = txIns.rows[0].id;
        await db.query(
          `UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`,
          [`TX-${String(txId).padStart(5, '0')}`, txId]
        );
      }
    }

    // 7. Write Activity / Audit Log
    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Revenue Created',
      recordId: createdRecord.id,
      details: {
        revenueCode,
        branchId: finalBranchId,
        branchName,
        revenueDate: targetDateStr,
        amount: parsedAmount,
        collectionType: finalCollectionType,
        receivedAccountId: finalReceivedAccountId,
        receivedAccountName,
        remarks: cleanRemarks,
        enteredBy: user.fullName || user.username,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Revenue entry of Rs. ${parsedAmount.toLocaleString()} saved successfully for ${branchName}.`,
      revenue: {
        id: createdRecord.id,
        revenueCode,
        branchId: createdRecord.branch_id,
        branchName,
        revenueDate: targetDateStr,
        amount: parsedAmount,
        collectionType: finalCollectionType,
        receivedAccountId: finalReceivedAccountId,
        receivedAccountName,
        depositedAmount: 0,
        remainingAmount: finalCollectionType === 'CASH' ? parsedAmount : 0,
        depositStatus: finalCollectionType === 'CASH' ? 'Undeposited' : 'N/A',
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
// 6. PUT /api/accounts/revenue/:id — Edit Revenue Entry
// ============================================================
router.put('/revenue/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);
    const revId = parseInt(req.params.id, 10);
    if (isNaN(revId)) {
      return res.status(400).json({ success: false, message: 'Invalid revenue ID.' });
    }

    const curRes = await db.query(`SELECT * FROM branch_revenues WHERE id = $1`, [revId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Revenue entry not found.' });
    }
    const current = curRes.rows[0];

    // Branch tenancy check
    if (!isSuper && Number(current.branch_id) !== Number(user.branchId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit revenue entries belonging to your branch.',
      });
    }

    const { amount, revenueDate, revenue_date, remarks, collectionType, receivedAccountId } = req.body;

    const parsedAmount = amount !== undefined ? parseFloat(String(amount)) : parseFloat(current.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Revenue amount must be greater than zero.' });
    }

    const targetDateStr = String(revenueDate || revenue_date || current.revenue_date).substring(0, 10);
    const nepalToday = getNepalTodayStr();
    if (targetDateStr > nepalToday) {
      return res.status(400).json({ success: false, message: 'Future dates are not permitted.' });
    }

    const cleanRemarks = remarks !== undefined ? String(remarks).trim() : current.remarks;
    const finalType = collectionType ? String(collectionType).toUpperCase() : (current.collection_type || 'CASH');
    const finalAccount = finalType === 'ONLINE' ? (receivedAccountId || current.received_account_id) : null;

    await db.query(
      `UPDATE branch_revenues
       SET amount = $1, revenue_date = $2, remarks = $3, collection_type = $4, received_account_id = $5, updated_by = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [parsedAmount, targetDateStr, cleanRemarks, finalType, finalAccount, user.id, revId]
    );

    // Synchronize ledger transaction
    if (finalType === 'ONLINE' && finalAccount) {
      await db.query(
        `UPDATE account_transactions
         SET account_id = $1, credit_amount = $2, transaction_date = $3::date, transaction_type = 'ONLINE_COLLECTION'
         WHERE revenue_id = $4`,
        [finalAccount, parsedAmount, targetDateStr, revId]
      );
    } else {
      const cashAccountId = await getOrCreateCashAccountId();
      await db.query(
        `UPDATE account_transactions
         SET account_id = $1, credit_amount = $2, transaction_date = $3::date, transaction_type = 'CASH_COLLECTION'
         WHERE revenue_id = $4 AND transaction_type IN ('CASH_COLLECTION', 'ONLINE_COLLECTION')`,
        [cashAccountId, parsedAmount, targetDateStr, revId]
      );
    }

    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Revenue Edited',
      recordId: revId,
      details: {
        previousAmount: current.amount,
        updatedAmount: parsedAmount,
        previousDate: current.revenue_date,
        updatedDate: targetDateStr,
        previousType: current.collection_type,
        updatedType: finalType,
      },
    });

    return res.json({ success: true, message: 'Revenue entry updated successfully.' });
  } catch (err: any) {
    console.error('Error in PUT /api/accounts/revenue/:id:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 7. PATCH /api/accounts/revenue/:id/void — Void Revenue
// ============================================================
router.patch('/revenue/:id/void', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Only Super Admin can void revenue entries.' });
    }

    const revId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    const curRes = await db.query(`SELECT * FROM branch_revenues WHERE id = $1`, [revId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Revenue entry not found.' });
    }

    await db.query(
      `UPDATE branch_revenues SET status = 'Voided', updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [user.id, revId]
    );

    // Deactivate linked transactions
    await db.query(
      `UPDATE account_transactions SET status = 'Voided' WHERE revenue_id = $1`,
      [revId]
    );

    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Revenue Voided',
      recordId: revId,
      details: { reason: reason || 'Voided by Super Admin' },
    });

    return res.json({ success: true, message: 'Revenue entry voided successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 8. GET /api/accounts/export — Export CSV
// ============================================================
router.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);

    let whereClause = `WHERE br.status = 'Active'`;
    if (!isSuper) {
      if (!user.branchId) {
        return res.status(403).json({ success: false, message: 'No branch access.' });
      }
      whereClause += ` AND br.branch_id = ${Number(user.branchId)}`;
    }

    const recordsSql = `
      SELECT
        COALESCE(br.revenue_code, 'REV-' || LPAD(br.id::text, 5, '0')) as code,
        br.revenue_date,
        b.name as branch_name,
        br.amount,
        COALESCE(br.collection_type, 'CASH') as collection_type,
        a.account_name as received_account_name,
        br.remarks,
        u.full_name as entered_by,
        br.created_at
      FROM branch_revenues br
      JOIN branches b ON br.branch_id = b.id
      LEFT JOIN accounts a ON br.received_account_id = a.id
      LEFT JOIN users u ON br.created_by = u.id
      ${whereClause}
      ORDER BY br.revenue_date DESC, br.id DESC
    `;
    const recRes = await db.query(recordsSql);

    const headers = ['Revenue Code', 'Date', 'Branch', 'Amount (NPR)', 'Collection Type', 'Received Account', 'Remarks', 'Entered By', 'Created At'];
    const rows = recRes.rows.map(r => [
      r.code,
      formatDateClean(r.revenue_date),
      r.branch_name,
      r.amount,
      r.collection_type,
      r.received_account_name || 'N/A',
      r.remarks || '',
      r.entered_by || '',
      r.created_at,
    ]);

    const csvLines = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))];
    const csvContent = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue_export_${getNepalTodayStr()}.csv"`);
    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 9. DEPOSITS API — Summary, Collections Queue, History & Deposit
// ============================================================

// GET /api/accounts/deposits/summary
router.get('/deposits/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);

    const nepalToday = getNepalTodayStr();
    const branchFilter = req.query.branchId;

    let branchWhere = '';
    let depBranchWhere = '';

    if (!isSuper) {
      if (!user.branchId) {
        const emptyCards = {
          totalCashCollected: 0,
          undepositedCash: 0,
          totalUndepositedCash: 0,
          depositedCash: 0,
          totalDepositedCash: 0,
          todayDeposits: 0,
          undepositedCollectionsCount: 0,
        };
        return res.json({ success: true, summary: emptyCards, summaryCards: emptyCards });
      }
      branchWhere = ` AND branch_id = ${Number(user.branchId)}`;
      depBranchWhere = ` WHERE branch_id = ${Number(user.branchId)}`;
    } else if (branchFilter && branchFilter !== 'ALL' && branchFilter !== 'all') {
      const bId = parseInt(String(branchFilter), 10);
      branchWhere = ` AND branch_id = ${bId}`;
      depBranchWhere = ` WHERE branch_id = ${bId}`;
    }

    const cashRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total_cash_collected
      FROM branch_revenues
      WHERE status = 'Active' AND collection_type = 'CASH' ${branchWhere}
    `);
    const totalCashCollected = parseFloat(cashRes.rows[0]?.total_cash_collected || '0');

    const depRes = await db.query(`
      SELECT
        COALESCE(SUM(total_deposit_amount), 0) as deposited_cash,
        COALESCE(SUM(CASE WHEN deposit_date = '${nepalToday}'::date THEN total_deposit_amount ELSE 0 END), 0) as today_deposits
      FROM cash_deposits
      ${depBranchWhere}
    `);
    const depositedCash = parseFloat(depRes.rows[0]?.deposited_cash || '0');
    const todayDeposits = parseFloat(depRes.rows[0]?.today_deposits || '0');
    const undepositedCash = Math.max(0, totalCashCollected - depositedCash);

    const countRes = await db.query(`
      SELECT COUNT(br.id) as pending_count
      FROM branch_revenues br
      WHERE br.status = 'Active' AND br.collection_type = 'CASH' ${branchWhere}
        AND br.amount > COALESCE((SELECT SUM(cd.total_deposit_amount) FROM cash_deposits cd WHERE cd.revenue_id = br.id), 0)
    `);
    const undepositedCollectionsCount = parseInt(countRes.rows[0]?.pending_count || '0', 10);

    const cards = {
      totalCashCollected,
      undepositedCash,
      totalUndepositedCash: undepositedCash,
      depositedCash,
      totalDepositedCash: depositedCash,
      todayDeposits,
      undepositedCollectionsCount,
    };

    return res.json({
      success: true,
      summary: cards,
      summaryCards: cards,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/accounts/deposits/collections — Cash Collections Queue with Remaining Balances
router.get('/deposits/collections', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);

    const { status = 'all', branchId, startDate, endDate, search, page = '1', limit = '50' } = req.query;

    const whereClauses = [`br.status = 'Active'`, `br.collection_type = 'CASH'`];
    const params: any[] = [];

    if (!isSuper) {
      if (!user.branchId) {
        return res.json({ success: true, collections: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } });
      }
      params.push(user.branchId);
      whereClauses.push(`br.branch_id = $${params.length}`);
    } else if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      params.push(parseInt(String(branchId), 10));
      whereClauses.push(`br.branch_id = $${params.length}`);
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
        COALESCE(br.revenue_code, '') ILIKE $${params.length}
      )`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const sql = `
      SELECT
        br.id,
        COALESCE(br.revenue_code, 'REV-' || LPAD(br.id::text, 5, '0')) as revenue_code,
        br.revenue_date,
        br.branch_id,
        b.name as branch_name,
        br.amount,
        COALESCE((SELECT SUM(cd.total_deposit_amount) FROM cash_deposits cd WHERE cd.revenue_id = br.id), 0) as deposited_amount,
        br.remarks,
        u.full_name as created_by_name
      FROM branch_revenues br
      JOIN branches b ON br.branch_id = b.id
      LEFT JOIN users u ON br.created_by = u.id
      ${whereSql}
      ORDER BY br.revenue_date DESC, br.id DESC
    `;

    const result = await db.query(sql, params);

    const items = result.rows.map(r => {
      const amt = parseFloat(r.amount);
      const depAmt = parseFloat(r.deposited_amount || '0');
      const remAmt = Math.max(0, amt - depAmt);
      let depStatus: 'Undeposited' | 'Partially Deposited' | 'Fully Deposited' = 'Undeposited';
      if (depAmt <= 0) {
        depStatus = 'Undeposited';
      } else if (remAmt <= 0) {
        depStatus = 'Fully Deposited';
      } else {
        depStatus = 'Partially Deposited';
      }

      return {
        id: r.id,
        revenueCode: r.revenue_code,
        revenueDate: formatDateClean(r.revenue_date),
        branchId: r.branch_id,
        branchName: r.branch_name,
        amount: amt,
        depositedAmount: depAmt,
        remainingAmount: remAmt,
        depositStatus: depStatus,
        remarks: r.remarks || '',
        createdByName: r.created_by_name || 'Staff',
      };
    });

    // Filter by status if specified
    const filtered = items.filter(it => {
      if (status === 'UNDEPOSITED_OR_PARTIAL') return it.depositStatus !== 'Fully Deposited';
      if (status === 'Undeposited') return it.depositStatus === 'Undeposited';
      if (status === 'Partially Deposited') return it.depositStatus === 'Partially Deposited';
      if (status === 'Fully Deposited') return it.depositStatus === 'Fully Deposited';
      return true;
    });

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 50);

    return res.json({
      success: true,
      collections: filtered,
      pagination: {
        total: filtered.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filtered.length / limitNum) || 1,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/accounts/deposits/history — Executed Cash Deposits
router.get('/deposits/history', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);

    const { branchId, startDate, endDate, limit = '50' } = req.query;

    const whereClauses = [];
    const params: any[] = [];

    if (!isSuper) {
      if (!user.branchId) {
        return res.json({ success: true, deposits: [] });
      }
      params.push(user.branchId);
      whereClauses.push(`cd.branch_id = $${params.length}`);
    } else if (branchId && branchId !== 'ALL' && branchId !== 'all') {
      params.push(parseInt(String(branchId), 10));
      whereClauses.push(`cd.branch_id = $${params.length}`);
    }
    if (startDate) {
      params.push(String(startDate).substring(0, 10));
      whereClauses.push(`cd.deposit_date >= $${params.length}::date`);
    }
    if (endDate) {
      params.push(String(endDate).substring(0, 10));
      whereClauses.push(`cd.deposit_date <= $${params.length}::date`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT
        cd.*,
        COALESCE(br.revenue_code, 'REV-' || LPAD(br.id::text, 5, '0')) as revenue_code,
        b.name as branch_name,
        u.full_name as created_by_name
      FROM cash_deposits cd
      JOIN branch_revenues br ON cd.revenue_id = br.id
      JOIN branches b ON cd.branch_id = b.id
      LEFT JOIN users u ON cd.created_by = u.id
      ${whereSql}
      ORDER BY cd.deposit_date DESC, cd.id DESC
      LIMIT ${parseInt(String(limit), 10) || 50}
    `;

    const depRes = await db.query(sql, params);
    const deposits = [];

    for (const dep of depRes.rows) {
      const allocRes = await db.query(
        `SELECT cda.*, a.account_name, a.account_type
         FROM cash_deposit_allocations cda
         JOIN accounts a ON cda.account_id = a.id
         WHERE cda.deposit_id = $1`,
        [dep.id]
      );
      deposits.push({
        id: dep.id,
        depositCode: dep.deposit_code,
        revenueId: dep.revenue_id,
        revenueCode: dep.revenue_code,
        branchId: dep.branch_id,
        branchName: dep.branch_name,
        depositDate: formatDateClean(dep.deposit_date),
        totalDepositAmount: parseFloat(dep.total_deposit_amount),
        remarks: dep.remarks,
        createdByName: dep.created_by_name,
        createdAt: dep.created_at,
        allocations: allocRes.rows.map(al => ({
          id: al.id,
          accountId: al.account_id,
          accountName: al.account_name,
          accountType: al.account_type,
          amount: parseFloat(al.amount),
        })),
      });
    }

    return res.json({ success: true, deposits });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/accounts/deposits — Execute Cash Deposit (Split or Full)
router.post('/deposits', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuper = isSuperAdminUser(user);

    const { revenueId, depositDate, remarks, allocations } = req.body;

    if (!revenueId) {
      return res.status(400).json({ success: false, message: 'Collection / Revenue ID is required.' });
    }

    const revRes = await db.query(`SELECT * FROM branch_revenues WHERE id = $1`, [revenueId]);
    if (revRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Collection record not found.' });
    }
    const rev = revRes.rows[0];

    // RBAC: Super Admin OR user assigned to the branch of this collection
    if (!isSuper) {
      if (!user.branchId || Number(user.branchId) !== Number(rev.branch_id)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only deposit cash for your assigned branch.',
        });
      }
    }

    if (rev.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Cannot deposit on a voided revenue record.' });
    }
    if (rev.collection_type !== 'CASH') {
      return res.status(400).json({ success: false, message: 'Deposits can only be performed on Cash collections.' });
    }

    // Check allocations array
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one bank allocation is required.' });
    }

    let totalDepositAmount = 0;
    for (const alloc of allocations) {
      const amt = parseFloat(String(alloc.amount));
      if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ success: false, message: 'Each allocation amount must be greater than zero.' });
      }
      if (!alloc.accountId) {
        return res.status(400).json({ success: false, message: 'Destination bank/account must be selected for all allocations.' });
      }
      totalDepositAmount += amt;
    }

    // Check remaining cash for this revenue record
    const depCheck = await db.query(
      `SELECT COALESCE(SUM(total_deposit_amount), 0) as already_deposited FROM cash_deposits WHERE revenue_id = $1`,
      [revenueId]
    );
    const alreadyDeposited = parseFloat(depCheck.rows[0]?.already_deposited || '0');
    const remainingCash = Math.max(0, parseFloat(rev.amount) - alreadyDeposited);

    if (totalDepositAmount > remainingCash + 0.001) {
      return res.status(400).json({
        success: false,
        message: `Deposit amount (Rs. ${totalDepositAmount.toLocaleString()}) exceeds available remaining cash (Rs. ${remainingCash.toLocaleString()}).`,
      });
    }

    const targetDateStr = String(depositDate || getNepalTodayStr()).substring(0, 10);
    const nepalToday = getNepalTodayStr();
    if (targetDateStr > nepalToday) {
      return res.status(400).json({ success: false, message: 'Deposit date cannot exceed today.' });
    }

    // Insert cash deposit record
    const depIns = await db.query(
      `INSERT INTO cash_deposits (
        deposit_code, revenue_id, branch_id, deposit_date, total_deposit_amount, remarks, created_by, created_at
      ) VALUES (
        'DEP-TEMP', $1, $2, $3::date, $4, $5, $6, CURRENT_TIMESTAMP
      ) RETURNING id`,
      [revenueId, rev.branch_id, targetDateStr, totalDepositAmount, remarks ? String(remarks).trim() : null, user.id]
    );
    const depositId = depIns.rows[0].id;
    const depositCode = `DEP-${String(depositId).padStart(5, '0')}`;
    await db.query(`UPDATE cash_deposits SET deposit_code = $1 WHERE id = $2`, [depositCode, depositId]);

    const cashAccountId = await getOrCreateCashAccountId();

    // 1. Debit Cash Account in Ledger
    const cashTx = await db.query(
      `INSERT INTO account_transactions (
        transaction_code, account_id, transaction_type, transaction_date,
        branch_id, revenue_id, deposit_id, description, reference_number,
        credit_amount, debit_amount, created_by, created_at, status
      ) VALUES (
        'TX-TEMP', $1, 'CASH_DEPOSIT', $2::date,
        $3, $4, $5, $6, $7,
        0.00, $8, $9, CURRENT_TIMESTAMP, 'Active'
      ) RETURNING id`,
      [
        cashAccountId,
        targetDateStr,
        rev.branch_id,
        revenueId,
        depositId,
        `Cash deposit to bank(s) for collection ${rev.revenue_code || ('REV-' + revenueId)}`,
        depositCode,
        totalDepositAmount,
        user.id,
      ]
    );
    if (cashTx.rowCount && cashTx.rowCount > 0) {
      const txId = cashTx.rows[0].id;
      await db.query(`UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`, [`TX-${String(txId).padStart(5, '0')}`, txId]);
    }

    // 2. Insert Allocations & Credit Destination Banks in Ledger
    for (const alloc of allocations) {
      const allocAmt = parseFloat(String(alloc.amount));
      const allocIns = await db.query(
        `INSERT INTO cash_deposit_allocations (deposit_id, account_id, amount, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING id`,
        [depositId, alloc.accountId, allocAmt]
      );
      const allocId = allocIns.rows[0].id;

      // Credit destination bank
      const bankTx = await db.query(
        `INSERT INTO account_transactions (
          transaction_code, account_id, transaction_type, transaction_date,
          branch_id, revenue_id, deposit_id, allocation_id, description, reference_number,
          credit_amount, debit_amount, created_by, created_at, status
        ) VALUES (
          'TX-TEMP', $1, 'CASH_DEPOSIT', $2::date,
          $3, $4, $5, $6, $7, $8,
          $9, 0.00, $10, CURRENT_TIMESTAMP, 'Active'
        ) RETURNING id`,
        [
          alloc.accountId,
          targetDateStr,
          rev.branch_id,
          revenueId,
          depositId,
          allocId,
          `Cash deposit allocation from branch collection`,
          depositCode,
          allocAmt,
          user.id,
        ]
      );
      if (bankTx.rowCount && bankTx.rowCount > 0) {
        const txId = bankTx.rows[0].id;
        await db.query(`UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`, [`TX-${String(txId).padStart(5, '0')}`, txId]);
      }
    }

    // Log Activity
    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Cash Deposited',
      recordId: depositId,
      details: {
        depositCode,
        revenueId,
        totalDepositAmount,
        allocationsCount: allocations.length,
        depositDate: targetDateStr,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Deposit of Rs. ${totalDepositAmount.toLocaleString()} recorded successfully.`,
      depositCode,
    });
  } catch (err: any) {
    console.error('Error in POST /api/accounts/deposits:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 10. BANKS & ACCOUNTS API — List, Detail, Create & Balance Ledger
// ============================================================

// GET /api/accounts/banks/active — For dropdown selectors
router.get('/banks/active', authenticate, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, account_name, account_name as "accountName", account_type, account_type as "accountType" FROM accounts WHERE is_active = TRUE ORDER BY account_type, account_name`
    );
    return res.json({ success: true, accounts: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/accounts/banks — Main Banks & Cash management list
router.get('/banks', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required.' });
    }

    const nepalToday = getNepalTodayStr();

    // Accounts with calculated ledger balances
    const accSql = `
      SELECT
        a.id,
        a.account_number,
        a.account_name,
        a.account_type,
        a.opening_balance,
        a.is_active,
        a.created_at,
        a.updated_at,
        COALESCE(SUM(t.credit_amount), 0) as total_credits,
        COALESCE(SUM(t.debit_amount), 0) as total_debits,
        (COALESCE(SUM(t.credit_amount), 0) - COALESCE(SUM(t.debit_amount), 0)) as current_balance
      FROM accounts a
      LEFT JOIN account_transactions t ON a.id = t.account_id AND t.status = 'Active'
      GROUP BY a.id, a.account_number, a.account_name, a.account_type, a.opening_balance, a.is_active, a.created_at, a.updated_at
      ORDER BY
        CASE WHEN a.account_type = 'BANK' THEN 1 WHEN a.account_type = 'DIGITAL_WALLET' THEN 2 ELSE 3 END,
        a.account_name ASC
    `;
    const accRes = await db.query(accSql);

    let totalBankBalance = 0;
    let totalCashBalance = 0;
    let totalWalletBalance = 0;

    const accounts = accRes.rows.map(r => {
      const curBal = parseFloat(r.current_balance || '0');
      if (r.account_type === 'BANK') totalBankBalance += curBal;
      else if (r.account_type === 'CASH') totalCashBalance += curBal;
      else if (r.account_type === 'DIGITAL_WALLET') totalWalletBalance += curBal;

      return {
        id: r.id,
        accountNumber: r.account_number || '',
        accountName: r.account_name,
        accountType: r.account_type,
        openingBalance: parseFloat(r.opening_balance || '0'),
        totalCredits: parseFloat(r.total_credits || '0'),
        totalDebits: parseFloat(r.total_debits || '0'),
        currentBalance: curBal,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    const totalAvailableFunds = totalBankBalance + totalCashBalance + totalWalletBalance;

    // Financial KPIs
    const onlineTxRes = await db.query(`
      SELECT COALESCE(SUM(credit_amount), 0) as total_online
      FROM account_transactions
      WHERE transaction_type = 'ONLINE_COLLECTION' AND status = 'Active'
    `);
    const totalOnlineCollection = parseFloat(onlineTxRes.rows[0]?.total_online || '0');

    const cashDepTxRes = await db.query(`
      SELECT COALESCE(SUM(total_deposit_amount), 0) as total_cash_deposited
      FROM cash_deposits
    `);
    const totalCashDeposited = parseFloat(cashDepTxRes.rows[0]?.total_cash_deposited || '0');

    const expRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM account_expenses
    `);
    const totalExpenses = parseFloat(expRes.rows[0]?.total_expenses || '0');

    const summaryCards = {
      totalBankBalance,
      totalCashBalance,
      totalOnlineCollection,
      totalCashDeposited,
      totalExpenses,
      totalAvailableFunds,
    };

    return res.json({ success: true, summaryCards, accounts, nepalToday });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/accounts/banks/:id — Detail of single bank/account with transaction ledger
router.get('/banks/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required.' });
    }

    const accId = parseInt(req.params.id, 10);
    const { startDate, endDate, type, page = '1', limit = '50' } = req.query;

    const accChk = await db.query(`SELECT * FROM accounts WHERE id = $1`, [accId]);
    if (accChk.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const acc = accChk.rows[0];

    // Calculated balance
    const balRes = await db.query(`
      SELECT
        COALESCE(SUM(credit_amount), 0) as total_credits,
        COALESCE(SUM(debit_amount), 0) as total_debits,
        (COALESCE(SUM(credit_amount), 0) - COALESCE(SUM(debit_amount), 0)) as current_balance
      FROM account_transactions
      WHERE account_id = $1 AND status = 'Active'
    `, [accId]);
    const totalCredits = parseFloat(balRes.rows[0]?.total_credits || '0');
    const totalDebits = parseFloat(balRes.rows[0]?.total_debits || '0');
    const currentBalance = parseFloat(balRes.rows[0]?.current_balance || '0');

    // Transactions list
    const whereClauses = [`t.account_id = $1`, `t.status = 'Active'`];
    const params: any[] = [accId];

    if (startDate) {
      params.push(String(startDate).substring(0, 10));
      whereClauses.push(`t.transaction_date >= $${params.length}::date`);
    }
    if (endDate) {
      params.push(String(endDate).substring(0, 10));
      whereClauses.push(`t.transaction_date <= $${params.length}::date`);
    }
    if (type && type !== 'all') {
      params.push(String(type));
      whereClauses.push(`t.transaction_type = $${params.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await db.query(`SELECT COUNT(t.id) as total_count FROM account_transactions t ${whereSql}`, params);
    const totalTransactions = parseInt(countRes.rows[0]?.total_count || '0', 10);

    const txSql = `
      SELECT
        t.*,
        b.name as branch_name,
        br.revenue_code,
        cd.deposit_code,
        ae.expense_code,
        tr.transfer_code,
        u.full_name as created_by_name
      FROM account_transactions t
      LEFT JOIN branches b ON t.branch_id = b.id
      LEFT JOIN branch_revenues br ON t.revenue_id = br.id
      LEFT JOIN cash_deposits cd ON t.deposit_id = cd.id
      LEFT JOIN account_expenses ae ON t.expense_id = ae.id
      LEFT JOIN account_transfers tr ON t.transfer_id = tr.id
      LEFT JOIN users u ON t.created_by = u.id
      ${whereSql}
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    const txRes = await db.query(txSql, params);

    const transactions = txRes.rows.map(r => ({
      id: r.id,
      transactionCode: r.transaction_code,
      accountId: r.account_id,
      transactionType: r.transaction_type,
      transactionDate: formatDateClean(r.transaction_date),
      branchId: r.branch_id,
      branchName: r.branch_name,
      revenueId: r.revenue_id,
      revenueCode: r.revenue_code,
      depositId: r.deposit_id,
      depositCode: r.deposit_code,
      expenseId: r.expense_id,
      expenseCode: r.expense_code,
      transferId: r.transfer_id,
      transferCode: r.transfer_code,
      description: r.description,
      referenceNumber: r.reference_number,
      creditAmount: parseFloat(r.credit_amount),
      debitAmount: parseFloat(r.debit_amount),
      createdByName: r.created_by_name || 'System',
      createdAt: r.created_at,
    }));

    return res.json({
      success: true,
      account: {
        id: acc.id,
        accountNumber: acc.account_number,
        accountName: acc.account_name,
        accountType: acc.account_type,
        openingBalance: parseFloat(acc.opening_balance || '0'),
        totalCredits,
        totalDebits,
        currentBalance,
        isActive: acc.is_active,
        createdAt: acc.created_at,
        updatedAt: acc.updated_at,
      },
      transactions,
      pagination: {
        total: totalTransactions,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalTransactions / limitNum) || 1,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/accounts/banks — Create Bank / Account
router.post('/banks', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required.' });
    }

    const { accountName, accountType, openingBalance = 0, accountNumber } = req.body;

    if (!accountName || !String(accountName).trim()) {
      return res.status(400).json({ success: false, message: 'Account name is required.' });
    }

    const cleanName = String(accountName).trim();
    const cleanType = ['BANK', 'DIGITAL_WALLET', 'CASH'].includes(String(accountType)) ? accountType : 'BANK';
    const parsedOpening = Math.max(0, parseFloat(String(openingBalance)) || 0);

    const dupCheck = await db.query(`SELECT id FROM accounts WHERE UPPER(account_name) = UPPER($1)`, [cleanName]);
    if (dupCheck.rowCount && dupCheck.rowCount > 0) {
      return res.status(400).json({ success: false, message: `An account named "${cleanName}" already exists.` });
    }

    const insRes = await db.query(
      `INSERT INTO accounts (account_name, account_type, opening_balance, account_number, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [cleanName, cleanType, parsedOpening, accountNumber ? String(accountNumber).trim() : null, user.id]
    );
    const newAcc = insRes.rows[0];

    // If opening balance > 0, record in ledger
    if (parsedOpening > 0) {
      const txIns = await db.query(
        `INSERT INTO account_transactions (
          transaction_code, account_id, transaction_type, transaction_date,
          description, credit_amount, debit_amount, created_by, created_at, status
        ) VALUES (
          'TX-TEMP', $1, 'OPENING_BALANCE', CURRENT_DATE,
          $2, $3, 0.00, $4, CURRENT_TIMESTAMP, 'Active'
        ) RETURNING id`,
        [newAcc.id, `Opening balance for ${cleanName}`, parsedOpening, user.id]
      );
      if (txIns.rowCount && txIns.rowCount > 0) {
        const txId = txIns.rows[0].id;
        await db.query(`UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`, [`TX-${String(txId).padStart(5, '0')}`, txId]);
      }
    }

    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Account Created',
      recordId: newAcc.id,
      details: { accountName: cleanName, accountType: cleanType, openingBalance: parsedOpening },
    });

    return res.status(201).json({ success: true, message: `Account "${cleanName}" created successfully.`, account: newAcc });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/accounts/banks/:id — Edit Account
router.put('/banks/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required.' });
    }

    const accId = parseInt(req.params.id, 10);
    const { accountName, accountNumber, isActive } = req.body;

    const curRes = await db.query(`SELECT * FROM accounts WHERE id = $1`, [accId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const current = curRes.rows[0];

    const cleanName = accountName ? String(accountName).trim() : current.account_name;
    const cleanNumber = accountNumber !== undefined ? (accountNumber ? String(accountNumber).trim() : null) : current.account_number;
    const finalActive = isActive !== undefined ? Boolean(isActive) : current.is_active;

    await db.query(
      `UPDATE accounts SET account_name = $1, account_number = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [cleanName, cleanNumber, finalActive, accId]
    );

    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Account Updated',
      recordId: accId,
      details: { accountName: cleanName, isActive: finalActive },
    });

    return res.json({ success: true, message: 'Account updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/accounts/banks/:id/opening-balance — Adjust Opening Balance
router.patch('/banks/:id/opening-balance', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required.' });
    }

    const accId = parseInt(req.params.id, 10);
    const { openingBalance } = req.body;

    const parsedOpening = parseFloat(String(openingBalance));
    if (isNaN(parsedOpening) || parsedOpening < 0) {
      return res.status(400).json({ success: false, message: 'Opening balance must be zero or a positive amount.' });
    }

    const curRes = await db.query(`SELECT * FROM accounts WHERE id = $1`, [accId]);
    if (curRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const current = curRes.rows[0];

    await db.query(`UPDATE accounts SET opening_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [parsedOpening, accId]);

    // Check if an existing OPENING_BALANCE transaction exists
    const txChk = await db.query(
      `SELECT id FROM account_transactions WHERE account_id = $1 AND transaction_type = 'OPENING_BALANCE' LIMIT 1`,
      [accId]
    );

    if (txChk.rowCount && txChk.rowCount > 0) {
      await db.query(
        `UPDATE account_transactions SET credit_amount = $1 WHERE id = $2`,
        [parsedOpening, txChk.rows[0].id]
      );
    } else if (parsedOpening > 0) {
      const txIns = await db.query(
        `INSERT INTO account_transactions (
          transaction_code, account_id, transaction_type, transaction_date,
          description, credit_amount, debit_amount, created_by, created_at, status
        ) VALUES (
          'TX-TEMP', $1, 'OPENING_BALANCE', CURRENT_DATE,
          $2, $3, 0.00, $4, CURRENT_TIMESTAMP, 'Active'
        ) RETURNING id`,
        [accId, `Opening balance for ${current.account_name}`, parsedOpening, user.id]
      );
      if (txIns.rowCount && txIns.rowCount > 0) {
        const txId = txIns.rows[0].id;
        await db.query(`UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`, [`TX-${String(txId).padStart(5, '0')}`, txId]);
      }
    }

    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Opening Balance Adjusted',
      recordId: accId,
      details: {
        accountName: current.account_name,
        previousOpening: current.opening_balance,
        newOpening: parsedOpening,
      },
    });

    return res.json({ success: true, message: 'Opening balance adjusted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 11. EXPENSES & PAYMENTS API
// ============================================================

// GET /api/accounts/expenses — List Expenses
router.get('/expenses', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required for expenses.' });
    }

    const { accountId, category, startDate, endDate, limit = '50' } = req.query;

    const whereClauses = [];
    const params: any[] = [];

    if (accountId && accountId !== 'ALL' && accountId !== 'all') {
      params.push(parseInt(String(accountId), 10));
      whereClauses.push(`ae.account_id = $${params.length}`);
    }
    if (category && category !== 'ALL' && category !== 'all') {
      params.push(String(category));
      whereClauses.push(`ae.category = $${params.length}`);
    }
    if (startDate) {
      params.push(String(startDate).substring(0, 10));
      whereClauses.push(`ae.expense_date >= $${params.length}::date`);
    }
    if (endDate) {
      params.push(String(endDate).substring(0, 10));
      whereClauses.push(`ae.expense_date <= $${params.length}::date`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT
        ae.*,
        a.account_name,
        a.account_type,
        u.full_name as created_by_name
      FROM account_expenses ae
      JOIN accounts a ON ae.account_id = a.id
      LEFT JOIN users u ON ae.created_by = u.id
      ${whereSql}
      ORDER BY ae.expense_date DESC, ae.id DESC
      LIMIT ${parseInt(String(limit), 10) || 50}
    `;

    const result = await db.query(sql, params);
    const expenses = result.rows.map(r => ({
      id: r.id,
      expenseCode: r.expense_code,
      accountId: r.account_id,
      accountName: r.account_name,
      accountType: r.account_type,
      expenseDate: formatDateClean(r.expense_date),
      amount: parseFloat(r.amount),
      category: r.category,
      paidTo: r.paid_to,
      description: r.description || '',
      referenceNumber: r.reference_number || '',
      attachmentUrl: r.attachment_url,
      createdByName: r.created_by_name || 'Staff',
      createdAt: r.created_at,
    }));

    return res.json({ success: true, expenses });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/accounts/expenses — Record Expense / Payment
router.post('/expenses', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required to record expenses.' });
    }

    const { accountId, expenseDate, amount, category, paidTo, description, referenceNumber, attachmentUrl } = req.body;

    if (!accountId) {
      return res.status(400).json({ success: false, message: 'Payment source account is required.' });
    }
    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero.' });
    }
    if (!category || !String(category).trim()) {
      return res.status(400).json({ success: false, message: 'Expense category is required.' });
    }
    if (!paidTo || !String(paidTo).trim()) {
      return res.status(400).json({ success: false, message: 'Paid To / Recipient is required.' });
    }

    const accChk = await db.query(`SELECT id, account_name, is_active FROM accounts WHERE id = $1`, [accountId]);
    if (accChk.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Selected source account not found.' });
    }
    if (!accChk.rows[0].is_active) {
      return res.status(400).json({ success: false, message: 'Selected account is disabled.' });
    }
    const accName = accChk.rows[0].account_name;

    const targetDateStr = String(expenseDate || getNepalTodayStr()).substring(0, 10);
    const cleanCategory = String(category).trim();
    const cleanPaidTo = String(paidTo).trim();
    const cleanDesc = description ? String(description).trim() : null;
    const cleanRef = referenceNumber ? String(referenceNumber).trim() : null;

    // Insert expense
    const expIns = await db.query(
      `INSERT INTO account_expenses (
        expense_code, account_id, expense_date, amount, category, paid_to, description, reference_number, attachment_url, created_by, created_at
      ) VALUES (
        'EXP-TEMP', $1, $2::date, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP
      ) RETURNING id`,
      [accountId, targetDateStr, parsedAmount, cleanCategory, cleanPaidTo, cleanDesc, cleanRef, attachmentUrl || null, user.id]
    );
    const expId = expIns.rows[0].id;
    const expCode = `EXP-${String(expId).padStart(5, '0')}`;
    await db.query(`UPDATE account_expenses SET expense_code = $1 WHERE id = $2`, [expCode, expId]);

    // Record Debit transaction in Ledger
    const txIns = await db.query(
      `INSERT INTO account_transactions (
        transaction_code, account_id, transaction_type, transaction_date,
        expense_id, description, reference_number, credit_amount, debit_amount, created_by, created_at, status
      ) VALUES (
        'TX-TEMP', $1, 'EXPENSE', $2::date,
        $3, $4, $5, 0.00, $6, $7, CURRENT_TIMESTAMP, 'Active'
      ) RETURNING id`,
      [
        accountId,
        targetDateStr,
        expId,
        `Expense: ${cleanCategory} - ${cleanPaidTo}${cleanDesc ? ' (' + cleanDesc + ')' : ''}`,
        cleanRef || expCode,
        parsedAmount,
        user.id,
      ]
    );
    if (txIns.rowCount && txIns.rowCount > 0) {
      const txId = txIns.rows[0].id;
      await db.query(`UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`, [`TX-${String(txId).padStart(5, '0')}`, txId]);
    }

    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Expense Created',
      recordId: expId,
      details: {
        expenseCode: expCode,
        accountName: accName,
        amount: parsedAmount,
        category: cleanCategory,
        paidTo: cleanPaidTo,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Expense of Rs. ${parsedAmount.toLocaleString()} recorded successfully from ${accName}.`,
      expenseCode: expCode,
    });
  } catch (err: any) {
    console.error('Error in POST /api/accounts/expenses:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 12. INTERNAL TRANSFERS API
// ============================================================
router.post('/transfers', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required for transfers.' });
    }

    const { fromAccountId, toAccountId, amount, transferDate, remarks, referenceNumber } = req.body;

    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({ success: false, message: 'Source and destination accounts are required.' });
    }
    if (Number(fromAccountId) === Number(toAccountId)) {
      return res.status(400).json({ success: false, message: 'Source and destination accounts must be different.' });
    }
    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Transfer amount must be greater than zero.' });
    }

    const [fromRes, toRes] = await Promise.all([
      db.query(`SELECT id, account_name, is_active FROM accounts WHERE id = $1`, [fromAccountId]),
      db.query(`SELECT id, account_name, is_active FROM accounts WHERE id = $1`, [toAccountId]),
    ]);

    if (fromRes.rowCount === 0 || toRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'One or both accounts were not found.' });
    }
    if (!fromRes.rows[0].is_active || !toRes.rows[0].is_active) {
      return res.status(400).json({ success: false, message: 'Cannot transfer between inactive accounts.' });
    }

    const fromName = fromRes.rows[0].account_name;
    const toName = toRes.rows[0].account_name;
    const targetDateStr = String(transferDate || getNepalTodayStr()).substring(0, 10);
    const cleanRemarks = remarks ? String(remarks).trim() : null;
    const cleanRef = referenceNumber ? String(referenceNumber).trim() : null;

    // Insert transfer record
    const trfIns = await db.query(
      `INSERT INTO account_transfers (
        transfer_code, from_account_id, to_account_id, transfer_date, amount, reference_number, remarks, created_by, created_at
      ) VALUES (
        'TRF-TEMP', $1, $2, $3::date, $4, $5, $6, $7, CURRENT_TIMESTAMP
      ) RETURNING id`,
      [fromAccountId, toAccountId, targetDateStr, parsedAmount, cleanRef, cleanRemarks, user.id]
    );
    const trfId = trfIns.rows[0].id;
    const trfCode = `TRF-${String(trfId).padStart(5, '0')}`;
    await db.query(`UPDATE account_transfers SET transfer_code = $1 WHERE id = $2`, [trfCode, trfId]);

    // 1. Debit Source Account (TRANSFER_OUT)
    const outTx = await db.query(
      `INSERT INTO account_transactions (
        transaction_code, account_id, transaction_type, transaction_date,
        transfer_id, description, reference_number, credit_amount, debit_amount, created_by, created_at, status
      ) VALUES (
        'TX-TEMP', $1, 'TRANSFER_OUT', $2::date,
        $3, $4, $5, 0.00, $6, $7, CURRENT_TIMESTAMP, 'Active'
      ) RETURNING id`,
      [
        fromAccountId,
        targetDateStr,
        trfId,
        `Internal transfer to ${toName}${cleanRemarks ? ' - ' + cleanRemarks : ''}`,
        trfCode,
        parsedAmount,
        user.id,
      ]
    );
    if (outTx.rowCount && outTx.rowCount > 0) {
      const txId = outTx.rows[0].id;
      await db.query(`UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`, [`TX-${String(txId).padStart(5, '0')}`, txId]);
    }

    // 2. Credit Destination Account (TRANSFER_IN)
    const inTx = await db.query(
      `INSERT INTO account_transactions (
        transaction_code, account_id, transaction_type, transaction_date,
        transfer_id, description, reference_number, credit_amount, debit_amount, created_by, created_at, status
      ) VALUES (
        'TX-TEMP', $1, 'TRANSFER_IN', $2::date,
        $3, $4, $5, $6, 0.00, $7, CURRENT_TIMESTAMP, 'Active'
      ) RETURNING id`,
      [
        toAccountId,
        targetDateStr,
        trfId,
        `Internal transfer from ${fromName}${cleanRemarks ? ' - ' + cleanRemarks : ''}`,
        trfCode,
        parsedAmount,
        user.id,
      ]
    );
    if (inTx.rowCount && inTx.rowCount > 0) {
      const txId = inTx.rows[0].id;
      await db.query(`UPDATE account_transactions SET transaction_code = $1 WHERE id = $2`, [`TX-${String(txId).padStart(5, '0')}`, txId]);
    }

    await logActivity({
      req,
      userId: user.id,
      module: 'Accounts',
      action: 'Transfer Completed',
      recordId: trfId,
      details: {
        transferCode: trfCode,
        fromAccount: fromName,
        toAccount: toName,
        amount: parsedAmount,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Transferred Rs. ${parsedAmount.toLocaleString()} from ${fromName} to ${toName} successfully.`,
      transferCode: trfCode,
    });
  } catch (err: any) {
    console.error('Error in POST /api/accounts/transfers:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 13. BALANCE RECONCILIATION INTEGRITY CHECK
// ============================================================
router.get('/reconciliation', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ success: false, message: 'Super Admin access required.' });
    }

    // Account ledger checks
    const accBalances = await db.query(`
      SELECT
        a.id,
        a.account_name,
        a.account_type,
        a.opening_balance,
        COALESCE(SUM(t.credit_amount), 0) as total_credits,
        COALESCE(SUM(t.debit_amount), 0) as total_debits,
        (COALESCE(SUM(t.credit_amount), 0) - COALESCE(SUM(t.debit_amount), 0)) as calculated_balance
      FROM accounts a
      LEFT JOIN account_transactions t ON a.id = t.account_id AND t.status = 'Active'
      GROUP BY a.id, a.account_name, a.account_type, a.opening_balance
    `);

    // Cash collections vs deposits reconciliation
    const cashCollectionsRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as cash_collected FROM branch_revenues WHERE status = 'Active' AND collection_type = 'CASH'
    `);
    const cashDepositsRes = await db.query(`
      SELECT COALESCE(SUM(total_deposit_amount), 0) as cash_deposited FROM cash_deposits
    `);

    const cashCollected = parseFloat(cashCollectionsRes.rows[0]?.cash_collected || '0');
    const cashDeposited = parseFloat(cashDepositsRes.rows[0]?.cash_deposited || '0');
    const cashDifference = cashCollected - cashDeposited;

    const accountsReport = accBalances.rows.map(r => ({
      accountId: r.id,
      accountName: r.account_name,
      accountType: r.account_type,
      totalCredits: parseFloat(r.total_credits),
      totalDebits: parseFloat(r.total_debits),
      currentBalance: parseFloat(r.calculated_balance),
    }));

    return res.json({
      success: true,
      reconciled: true,
      cashReconciliation: {
        totalCashCollected: cashCollected,
        totalCashDeposited: cashDeposited,
        undepositedCashBalance: cashDifference,
      },
      accounts: accountsReport,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
