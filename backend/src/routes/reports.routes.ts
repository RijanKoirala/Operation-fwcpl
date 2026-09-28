import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission, checkBranchAccess } from '../middleware/auth';
import { calculateBranchPerformance, calculateStaffPerformance } from '../services/calculationService';
import { syncNewConnectionTargets } from '../services/targetSync.service';

const router = Router();

// Helper to format date strings cleanly
const formatDateStr = (dateVal: any, includeTime = false): string => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const iso = d.toISOString();
  if (includeTime) {
    return iso.replace('T', ' ').substring(0, 16);
  }
  return iso.substring(0, 10);
};

// Helper to convert array of objects to CSV
const jsonToCsv = (items: any[]): string => {
  if (items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const rows = items.map(item =>
    headers
      .map(header => {
        let val = item[header];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') {
          if (val instanceof Date) {
            val = val.toISOString().substring(0, 10);
          } else {
            val = JSON.stringify(val);
          }
        }
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
};

// Helper to generate meaningful CSV filename
const generateCsvFilename = (type: string, branchName?: string, startDate?: string, endDate?: string): string => {
  const cleanType = type.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const cleanBranch = branchName
    ? branchName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')
    : 'all_branches';
  const today = new Date().toISOString().split('T')[0];
  const start = startDate ? String(startDate).split('T')[0] : '';
  const end = endDate ? String(endDate).split('T')[0] : '';

  let datePart = today;
  if (start && end) {
    datePart = `${start}_${end}`;
  } else if (start) {
    datePart = `from_${start}`;
  } else if (end) {
    datePart = `to_${end}`;
  }

  return `${cleanType}_${cleanBranch}_${datePart}.csv`;
};

// Main handler for reports data & CSV export
const handleReport = async (req: Request, res: Response, forceCsv = false) => {
  const { type } = req.params;
  const rawBranchId = req.query.branchId || req.query.branch_id;
  const rawStaffId = req.query.staffId || req.query.staff_id;
  const rawStatus = req.query.status as string;
  const rawCategory = req.query.category as string;
  const rawStartDate = req.query.startDate || req.query.start_date;
  const rawEndDate = req.query.endDate || req.query.end_date;
  const exportFormat = req.query.exportFormat || req.query.format;
  const isCsv = forceCsv || exportFormat === 'csv';

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;

  try {
    const isSuperAdmin =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.roleName === 'Super Admin' ||
      req.user?.username === 'superadmin';

    const roleUpper = (req.user?.role || '').toUpperCase().replace(/\s+/g, '_');
    const roleNameUpper = (req.user?.roleName || '').toUpperCase().replace(/\s+/g, '_');
    const deptUpper = (req.user?.departmentCode || req.user?.department_code || req.user?.departmentName || '').toUpperCase();

    const isCentralLeadership =
      isSuperAdmin ||
      roleUpper === 'MANAGEMENT' ||
      roleNameUpper === 'MANAGEMENT' ||
      deptUpper.includes('EXEC') ||
      deptUpper.includes('OPERATION') ||
      deptUpper.includes('OPS');

    // 1. Strict Server-Side Branch Scoping
    let effectiveBranchId: number | null = null;
    let branchNameForFile = 'all_branches';

    if (!isCentralLeadership) {
      // Branch users are strictly locked to their assigned branch
      if (req.user?.branchId) {
        effectiveBranchId = Number(req.user.branchId);
      } else if (req.user?.assignedBranchIds && req.user.assignedBranchIds.length > 0) {
        const requested = rawBranchId ? Number(rawBranchId) : null;
        if (requested && req.user.assignedBranchIds.includes(requested)) {
          effectiveBranchId = requested;
        } else {
          effectiveBranchId = req.user.assignedBranchIds[0];
        }
      } else {
        return res.status(403).json({ success: false, message: 'Forbidden: No branch assigned.' });
      }
    } else {
      // Central management can choose a branch or query all
      if (rawBranchId && rawBranchId !== 'all' && rawBranchId !== 'ALL' && rawBranchId !== '') {
        effectiveBranchId = Number(rawBranchId);
      }
    }

    if (effectiveBranchId) {
      const bRes = await db.query('SELECT name FROM branches WHERE id = $1', [effectiveBranchId]);
      if (bRes.rows.length > 0) {
        branchNameForFile = bRes.rows[0].name;
      }
    }

    // 2. Permission Check for Audit Log
    const isAuditReport = type === 'audit' || type === 'audit-trail' || type === 'activity';
    if (isAuditReport) {
      const canViewAudit =
        isSuperAdmin ||
        req.user?.permissions?.['audit.view'] === true ||
        (isCentralLeadership && req.user?.permissions?.['reports.view'] === true);
      if (!canViewAudit) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to access the audit log report.' });
      }
    }

    // 3. Permission Check for CSV Export
    if (isCsv) {
      const canExport =
        isSuperAdmin ||
        req.user?.permissions?.['reports.export'] === true ||
        (req.user?.permissions?.['reports.export'] === undefined &&
          (req.user?.permissions?.['reports.view'] === true || req.user?.permissions?.['reports'] === true));
      if (!canExport) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to export reports.' });
      }
    }

    let data: any[] = [];

    // 4. Report Type Query Routing
    switch (type) {
      // ----------------------------------------------------
      // TASKS REPORT
      // ----------------------------------------------------
      case 'tasks': {
        const whereClauses: string[] = [];
        const params: any[] = [];

        if (effectiveBranchId) {
          params.push(effectiveBranchId);
          whereClauses.push(`t.branch_id = $${params.length}`);
        }
        if (rawStaffId) {
          params.push(rawStaffId);
          whereClauses.push(
            `(t.assigned_to_id = $${params.length} OR EXISTS (SELECT 1 FROM task_staff ts WHERE ts.task_id = t.id AND ts.staff_id = $${params.length}))`
          );
        }
        if (rawStatus) {
          if (rawStatus === 'Overdue') {
            whereClauses.push(`t.status NOT IN ('Completed', 'Closed', 'Cancelled', 'Rejected') AND t.due_date < CURRENT_DATE`);
          } else {
            params.push(rawStatus);
            whereClauses.push(`t.status = $${params.length}`);
          }
        }
        if (rawCategory) {
          params.push(rawCategory);
          whereClauses.push(`t.category = $${params.length}`);
        }
        if (rawStartDate) {
          params.push(rawStartDate);
          whereClauses.push(`(t.start_date >= $${params.length} OR t.created_at::date >= $${params.length})`);
        }
        if (rawEndDate) {
          params.push(rawEndDate);
          whereClauses.push(`(t.due_date <= $${params.length} OR t.start_date <= $${params.length})`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resTasks = await db.query(
          `SELECT t.id,
                  t.task_id as "Task ID",
                  t.title as "Task Title",
                  t.category as "Category",
                  b.name as "Branch",
                  u.full_name as "Primary Staff",
                  t.priority as "Priority",
                  t.status as "Status",
                  t.start_date as "Start Date",
                  t.due_date as "Due Date",
                  t.completion_date as "Completion Date",
                  t.completion_remarks as "Remarks"
           FROM tasks t
           LEFT JOIN branches b ON t.branch_id = b.id
           LEFT JOIN users u ON t.assigned_to_id = u.id
           ${whereSql}
           ORDER BY t.created_at DESC`,
          params
        );

        if (resTasks.rows.length > 0) {
          const tIds = resTasks.rows.map(r => r.id);
          const phs = tIds.map((_, i) => `$${i + 1}`).join(',');
          const sRes = await db.query(
            `SELECT ts.task_id, u.full_name FROM task_staff ts JOIN users u ON ts.staff_id = u.id WHERE ts.task_id IN (${phs}) ORDER BY ts.id ASC`,
            tIds
          );
          const sMap = new Map<number, string[]>();
          for (const s of sRes.rows) {
            const list = sMap.get(s.task_id) || [];
            list.push(s.full_name);
            sMap.set(s.task_id, list);
          }

          data = resTasks.rows.map(r => {
            const staffList = sMap.get(r.id) || [];
            const allStaff = Array.from(new Set([...(r['Primary Staff'] ? [r['Primary Staff']] : []), ...staffList]));
            const copy = { ...r };
            delete copy.id;
            delete copy['Primary Staff'];
            copy['Assigned Staff'] = allStaff.length > 0 ? allStaff.join(', ') : 'Unassigned';
            copy['Start Date'] = formatDateStr(copy['Start Date']);
            copy['Due Date'] = formatDateStr(copy['Due Date']);
            copy['Completion Date'] = formatDateStr(copy['Completion Date'], true);
            return copy;
          });
        }
        break;
      }

      // ----------------------------------------------------
      // CONNECTIONS REPORT
      // ----------------------------------------------------
      case 'connections':
      case 'connections-pipeline':
      case 'new-connections': {
        const whereClauses: string[] = [];
        const params: any[] = [];

        if (effectiveBranchId) {
          params.push(effectiveBranchId);
          whereClauses.push(`c.branch_id = $${params.length}`);
        }
        if (rawStaffId) {
          params.push(rawStaffId);
          whereClauses.push(
            `(c.assigned_staff_id = $${params.length} OR EXISTS (SELECT 1 FROM connection_staff cs WHERE cs.connection_id = c.id AND cs.staff_id = $${params.length}))`
          );
        }
        if (rawStatus) {
          params.push(rawStatus);
          whereClauses.push(`c.status = $${params.length}`);
        }
        if (rawStartDate) {
          params.push(rawStartDate);
          whereClauses.push(`COALESCE(c.request_date, c.created_at::date) >= $${params.length}`);
        }
        if (rawEndDate) {
          params.push(rawEndDate);
          whereClauses.push(`COALESCE(c.request_date, c.created_at::date) <= $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resConn = await db.query(
          `SELECT c.id,
                  c.connection_id as "Connection ID",
                  c.customer_name as "Customer Name",
                  c.phone as "Contact Phone",
                  c.address as "Customer Address",
                  b.name as "Branch",
                  u.full_name as "Primary Staff",
                  c.connection_type as "Connection Type",
                  c.package_plan as "Package Plan",
                  c.status as "Status",
                  c.request_date as "Request Date",
                  c.site_survey_date as "Survey Date",
                  c.installation_date as "Installation Date",
                  c.activation_date as "Activation Date",
                  c.completion_date as "Completion Date",
                  c.remarks as "Remarks"
           FROM connections c
           LEFT JOIN branches b ON c.branch_id = b.id
           LEFT JOIN users u ON c.assigned_staff_id = u.id
           ${whereSql}
           ORDER BY c.request_date DESC, c.id DESC`,
          params
        );

        if (resConn.rows.length > 0) {
          const cIds = resConn.rows.map(r => r.id);
          const phs = cIds.map((_, i) => `$${i + 1}`).join(',');
          const sRes = await db.query(
            `SELECT cs.connection_id, u.full_name FROM connection_staff cs JOIN users u ON cs.staff_id = u.id WHERE cs.connection_id IN (${phs}) ORDER BY cs.id ASC`,
            cIds
          );
          const sMap = new Map<number, string[]>();
          for (const s of sRes.rows) {
            const list = sMap.get(s.connection_id) || [];
            list.push(s.full_name);
            sMap.set(s.connection_id, list);
          }

          data = resConn.rows.map(r => {
            const staffList = sMap.get(r.id) || [];
            const allStaff = Array.from(new Set([...(r['Primary Staff'] ? [r['Primary Staff']] : []), ...staffList]));
            const copy = { ...r };
            delete copy.id;
            delete copy['Primary Staff'];
            copy['Assigned Staff'] = allStaff.length > 0 ? allStaff.join(', ') : 'Unassigned';
            copy['Request Date'] = formatDateStr(copy['Request Date']);
            copy['Survey Date'] = formatDateStr(copy['Survey Date']);
            copy['Installation Date'] = formatDateStr(copy['Installation Date']);
            copy['Activation Date'] = formatDateStr(copy['Activation Date']);
            copy['Completion Date'] = formatDateStr(copy['Completion Date']);
            return copy;
          });
        }
        break;
      }

      // ----------------------------------------------------
      // FOLLOW-UPS REPORT
      // ----------------------------------------------------
      case 'follow-ups':
      case 'followups':
      case 'followups-conversion': {
        const whereClauses: string[] = [];
        const params: any[] = [];

        if (effectiveBranchId) {
          params.push(effectiveBranchId);
          whereClauses.push(`f.branch_id = $${params.length}`);
        }
        if (rawStaffId) {
          params.push(rawStaffId);
          whereClauses.push(`f.assigned_staff_id = $${params.length}`);
        }
        if (rawStatus) {
          if (rawStatus === 'Overdue') {
            whereClauses.push(`f.status NOT IN ('Completed', 'Cancelled', 'Failed') AND f.follow_up_date < CURRENT_DATE`);
          } else {
            params.push(rawStatus);
            whereClauses.push(`f.status = $${params.length}`);
          }
        }
        if (rawStartDate) {
          params.push(rawStartDate);
          whereClauses.push(`f.follow_up_date >= $${params.length}`);
        }
        if (rawEndDate) {
          params.push(rawEndDate);
          whereClauses.push(`f.follow_up_date <= $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resFollow = await db.query(
          `SELECT f.follow_up_id as "Follow-up ID",
                  b.name as "Branch",
                  f.related_customer_case as "Customer / Case",
                  COALESCE(u.full_name, 'Unassigned') as "Assigned Staff",
                  f.type as "Type",
                  f.follow_up_date as "Follow-up Date",
                  f.priority as "Priority",
                  f.status as "Status",
                  f.result as "Result",
                  f.next_follow_up_date as "Next Date",
                  f.notes as "Notes"
           FROM follow_ups f
           LEFT JOIN branches b ON f.branch_id = b.id
           LEFT JOIN users u ON f.assigned_staff_id = u.id
           ${whereSql}
           ORDER BY f.follow_up_date DESC`,
          params
        );

        data = resFollow.rows.map(r => ({
          ...r,
          'Follow-up Date': formatDateStr(r['Follow-up Date']),
          'Next Date': formatDateStr(r['Next Date']),
        }));
        break;
      }

      // ----------------------------------------------------
      // GOODS / REQUISITIONS REPORT
      // ----------------------------------------------------
      case 'goods':
      case 'goods-requisitions':
      case 'requisitions': {
        const whereClauses: string[] = [];
        const params: any[] = [];

        if (effectiveBranchId) {
          params.push(effectiveBranchId);
          whereClauses.push(`gr.branch_id = $${params.length}`);
        }
        if (rawStaffId) {
          params.push(rawStaffId);
          whereClauses.push(`gr.requested_by = $${params.length}`);
        }
        if (rawStatus) {
          params.push(rawStatus);
          whereClauses.push(`(gr.status = $${params.length} OR gri.item_status = $${params.length})`);
        }
        if (rawStartDate) {
          params.push(rawStartDate);
          whereClauses.push(`gr.created_at::date >= $${params.length}`);
        }
        if (rawEndDate) {
          params.push(rawEndDate);
          whereClauses.push(`gr.created_at::date <= $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resGoods = await db.query(
          `SELECT gr.request_number as "Request #",
                  b.name as "Branch",
                  u.full_name as "Requested By",
                  COALESCE(gri.item_name_snapshot, gi.name, 'General Item') as "Item Name",
                  COALESCE(gri.requested_quantity, 0) as "Quantity",
                  COALESCE(gri.unit_snapshot, gi.unit, 'Unit') as "Unit",
                  COALESCE(gri.approved_quantity, 0) as "Approved Qty",
                  COALESCE(gri.delivered_quantity, 0) as "Delivered Qty",
                  gr.priority as "Priority",
                  gr.status as "Request Status",
                  COALESCE(gri.item_status, gr.status) as "Item Status",
                  gr.created_at as "Date",
                  gr.required_by as "Required By",
                  gr.remarks as "Remarks"
           FROM goods_requests gr
           LEFT JOIN goods_request_items gri ON gri.request_id = gr.id
           LEFT JOIN goods_items gi ON gri.goods_item_id = gi.id
           LEFT JOIN branches b ON gr.branch_id = b.id
           LEFT JOIN users u ON gr.requested_by = u.id
           ${whereSql}
           ORDER BY gr.created_at DESC, gri.id ASC`,
          params
        );

        data = resGoods.rows.map(r => ({
          ...r,
          'Date': formatDateStr(r['Date']),
          'Required By': formatDateStr(r['Required By']),
        }));
        break;
      }

      // ----------------------------------------------------
      // TARGETS & KPIS REPORT
      // ----------------------------------------------------
      case 'targets':
      case 'targets-kpis': {
        // Sync New Connection target achievements before generating report
        if (effectiveBranchId) {
          await syncNewConnectionTargets({ branchIds: [effectiveBranchId] }).catch(() => {});
        } else {
          const allB = await db.query('SELECT id FROM branches');
          await syncNewConnectionTargets({ branchIds: allB.rows.map(r => r.id) }).catch(() => {});
        }

        const whereClauses: string[] = [];
        const params: any[] = [];

        if (effectiveBranchId) {
          params.push(effectiveBranchId);
          whereClauses.push(`t.branch_id = $${params.length}`);
        }
        if (rawStaffId) {
          params.push(rawStaffId);
          whereClauses.push(`t.employee_id = $${params.length}`);
        }
        if (rawStatus) {
          params.push(rawStatus);
          whereClauses.push(`t.status = $${params.length}`);
        }
        if (rawCategory) {
          params.push(rawCategory);
          whereClauses.push(`t.category = $${params.length}`);
        }
        if (rawStartDate) {
          params.push(rawStartDate);
          whereClauses.push(`t.start_date >= $${params.length}`);
        }
        if (rawEndDate) {
          params.push(rawEndDate);
          whereClauses.push(`t.end_date <= $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resTargets = await db.query(
          `SELECT t.target_id as "Target ID",
                  t.target_name as "Target Name",
                  b.name as "Branch",
                  COALESCE(u.full_name, 'All Branch Staff') as "Employee / Assignee",
                  t.category as "Category",
                  t.target_value as "Target Value",
                  t.achieved_value as "Completed Value",
                  GREATEST(0, t.target_value - t.achieved_value) as "Remaining",
                  t.achievement_percentage as "Achievement %",
                  t.period as "Period",
                  t.start_date as "Start Date",
                  t.end_date as "End Date",
                  t.status as "Status",
                  t.remarks as "Remarks"
           FROM targets t
           LEFT JOIN branches b ON t.branch_id = b.id
           LEFT JOIN users u ON t.employee_id = u.id
           ${whereSql}
           ORDER BY t.end_date DESC`,
          params
        );

        data = resTargets.rows.map(r => ({
          ...r,
          'Start Date': formatDateStr(r['Start Date']),
          'End Date': formatDateStr(r['End Date']),
          'Achievement %': `${r['Achievement %']}%`,
        }));
        break;
      }

      // ----------------------------------------------------
      // STAFF PRODUCTIVITY & LEADERBOARD
      // ----------------------------------------------------
      case 'staff':
      case 'staff-productivity':
      case 'staff-performance': {
        let perf = await calculateStaffPerformance(effectiveBranchId || undefined);
        if (rawStaffId) {
          perf = perf.filter(p => p.staffId === Number(rawStaffId));
        }

        data = perf.map((s, idx) => ({
          'Rank': idx + 1,
          'Employee ID': s.employeeId,
          'Name': s.fullName,
          'Branch': s.branchName,
          'Designation': s.designation || 'Staff',
          'Department': s.department || 'Operations',
          'Assigned Tasks': s.totalAssignedTasks,
          'Completed Tasks': s.completedTasks,
          'Overdue Tasks': s.overdueTasks,
          'Completion Rate %': `${s.taskCompletionRate}%`,
          'On-Time %': `${s.onTimeRate}%`,
          'Target Achievement %': `${s.targetAchievementRate}%`,
          'Support Score %': `${s.supportPerformanceRate}%`,
          'Overall Score': s.overallScore,
        }));
        break;
      }

      // ----------------------------------------------------
      // AUDIT LOG REPORT
      // ----------------------------------------------------
      case 'audit':
      case 'audit-trail':
      case 'activity': {
        const whereClauses: string[] = [];
        const params: any[] = [];

        if (rawStaffId) {
          params.push(rawStaffId);
          whereClauses.push(`al.user_id = $${params.length}`);
        }
        if (rawCategory) {
          params.push(rawCategory);
          whereClauses.push(`al.module = $${params.length}`);
        }
        if (rawStartDate) {
          params.push(rawStartDate);
          whereClauses.push(`al.created_at::date >= $${params.length}`);
        }
        if (rawEndDate) {
          params.push(rawEndDate);
          whereClauses.push(`al.created_at::date <= $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resAct = await db.query(
          `SELECT al.id as "Log ID",
                  COALESCE(u.full_name, 'System') as "User",
                  COALESCE(u.role, 'N/A') as "Role",
                  al.action as "Action",
                  al.module as "Module",
                  al.record_id as "Record ID",
                  al.details as "Details",
                  al.ip_address as "IP Address",
                  al.created_at as "Timestamp"
           FROM activity_logs al
           LEFT JOIN users u ON al.user_id = u.id
           ${whereSql}
           ORDER BY al.created_at DESC
           LIMIT 1000`,
          params
        );

        data = resAct.rows.map(r => ({
          ...r,
          'Timestamp': formatDateStr(r['Timestamp'], true),
        }));
        break;
      }

      // ----------------------------------------------------
      // BRANCH PERFORMANCE (EXECUTIVE)
      // ----------------------------------------------------
      case 'branch-performance': {
        let perf = await calculateBranchPerformance();
        if (effectiveBranchId) {
          perf = perf.filter(p => p.branchId === effectiveBranchId);
        }

        data = perf.map(p => ({
          'Branch Code': p.branchCode,
          'Branch Name': p.branchName,
          'City': p.city,
          'Total Staff': p.totalStaff,
          'Active Staff': p.activeStaff,
          'Open Tasks': p.openTasks,
          'Completed Tasks': p.completedTasks,
          'Overdue Tasks': p.overdueTasks,
          'Task Completion %': `${p.taskCompletionRate}%`,
          'On-Time %': `${p.onTimeRate}%`,
          'Target Achievement %': `${p.targetAchievementRate}%`,
          'Support Score %': `${p.supportPerformanceRate}%`,
          'Follow-up Score %': `${p.followUpPerformanceRate}%`,
          'Overall Performance Score': p.overallScore,
        }));
        break;
      }

      // ----------------------------------------------------
      // DIRECTIVES & INSTRUCTIONS COMPLIANCE
      // ----------------------------------------------------
      case 'instructions':
      case 'directives-compliance': {
        const whereClauses: string[] = [];
        const params: any[] = [];

        if (effectiveBranchId) {
          params.push(effectiveBranchId);
          whereClauses.push(`i.branch_id = $${params.length}`);
        }
        if (rawStaffId) {
          params.push(rawStaffId);
          whereClauses.push(`(i.sender_id = $${params.length} OR i.recipient_staff_id = $${params.length})`);
        }
        if (rawStatus) {
          params.push(rawStatus);
          whereClauses.push(`i.status = $${params.length}`);
        }
        if (rawStartDate) {
          params.push(rawStartDate);
          whereClauses.push(`i.created_at::date >= $${params.length}`);
        }
        if (rawEndDate) {
          params.push(rawEndDate);
          whereClauses.push(`i.created_at::date <= $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resInst = await db.query(
          `SELECT i.instruction_id as "Instruction ID",
                  i.title as "Title",
                  COALESCE(s.full_name, 'Management') as "Sender",
                  b.name as "Branch",
                  i.recipient_type as "Recipient Type",
                  COALESCE(u.full_name, 'All Branch Staff') as "Recipient Staff",
                  i.priority as "Priority",
                  i.status as "Status",
                  i.created_at as "Sent At",
                  i.acknowledged_at as "Acknowledged At",
                  i.completed_at as "Completed At",
                  i.remarks as "Remarks"
           FROM instructions i
           LEFT JOIN branches b ON i.branch_id = b.id
           LEFT JOIN users s ON i.sender_id = s.id
           LEFT JOIN users u ON i.recipient_staff_id = u.id
           ${whereSql}
           ORDER BY i.created_at DESC`,
          params
        );

        data = resInst.rows.map(r => ({
          ...r,
          'Sent At': formatDateStr(r['Sent At'], true),
          'Acknowledged At': formatDateStr(r['Acknowledged At'], true),
          'Completed At': formatDateStr(r['Completed At'], true),
        }));
        break;
      }

      // ----------------------------------------------------
      // OVERDUE AUDIT
      // ----------------------------------------------------
      case 'overdue-audit': {
        const taskWhere: string[] = [
          `t.status NOT IN ('Completed', 'Closed', 'Cancelled', 'Rejected')`,
          `t.due_date < CURRENT_DATE`,
        ];
        const followWhere: string[] = [
          `f.status NOT IN ('Completed', 'Cancelled', 'Failed')`,
          `f.follow_up_date < CURRENT_DATE`,
        ];
        const params: any[] = [];

        if (effectiveBranchId) {
          params.push(effectiveBranchId);
          taskWhere.push(`t.branch_id = $${params.length}`);
          followWhere.push(`f.branch_id = $${params.length}`);
        }

        const resOverdue = await db.query(
          `SELECT 'Task' as "Item Type",
                  t.task_id as "Reference ID",
                  t.title as "Title / Customer",
                  b.name as "Branch",
                  COALESCE(u.full_name, 'Unassigned') as "Assigned Staff",
                  t.priority as "Priority",
                  t.status as "Status",
                  t.due_date as "Due Date",
                  (CURRENT_DATE - t.due_date)::integer as "Days Overdue",
                  t.completion_remarks as "Remarks"
           FROM tasks t
           LEFT JOIN branches b ON t.branch_id = b.id
           LEFT JOIN users u ON t.assigned_to_id = u.id
           WHERE ${taskWhere.join(' AND ')}
           UNION ALL
           SELECT 'Follow-up' as "Item Type",
                  f.follow_up_id as "Reference ID",
                  f.related_customer_case as "Title / Customer",
                  b.name as "Branch",
                  COALESCE(u.full_name, 'Unassigned') as "Assigned Staff",
                  f.priority as "Priority",
                  f.status as "Status",
                  f.follow_up_date as "Due Date",
                  (CURRENT_DATE - f.follow_up_date)::integer as "Days Overdue",
                  f.notes as "Remarks"
           FROM follow_ups f
           LEFT JOIN branches b ON f.branch_id = b.id
           LEFT JOIN users u ON f.assigned_staff_id = u.id
           WHERE ${followWhere.join(' AND ')}
           ORDER BY "Days Overdue" DESC`,
          params
        );

        data = resOverdue.rows.map(r => ({
          ...r,
          'Due Date': formatDateStr(r['Due Date']),
        }));
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Invalid report type: '${type}'.` });
    }

    // 5. Handle CSV Export Response
    if (isCsv) {
      const csvData = jsonToCsv(data);
      const filename = generateCsvFilename(
        type,
        branchNameForFile,
        rawStartDate as string | undefined,
        rawEndDate as string | undefined
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      return res.status(200).send(csvData);
    }

    // 6. Handle JSON Preview Response with Pagination
    const totalCount = data.length;
    const startIndex = (page - 1) * limit;
    const pagedRecords = data.slice(startIndex, startIndex + limit);

    return res.json({
      success: true,
      count: totalCount,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      data: pagedRecords,
      records: pagedRecords,
      allCount: totalCount,
    });
  } catch (err: any) {
    console.error('Error generating report:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error compiling report data' });
  }
};

// Route definitions for both preview and CSV download
router.get('/:type', authenticate, requirePermission('reports.view'), (req, res) => handleReport(req, res, false));
router.get('/:type/csv', authenticate, requirePermission('reports.view'), (req, res) => handleReport(req, res, true));
router.get('/:type/export', authenticate, requirePermission('reports.view'), (req, res) => handleReport(req, res, true));

export default router;
