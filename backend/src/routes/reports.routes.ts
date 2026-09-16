import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { calculateBranchPerformance, calculateStaffPerformance } from '../services/calculationService';

const router = Router();

// Helper to convert array of objects to CSV
const jsonToCsv = (items: any[]): string => {
  if (items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const rows = items.map(item =>
    headers
      .map(header => {
        let val = item[header];
        if (val === null || val === undefined) val = '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

// GET /api/reports/:type (type: branch-performance, staff-performance, tasks, connections, tickets, follow-ups, targets, instructions, activity)
router.get('/:type', authenticate, requirePermission('reports.view'), async (req: Request, res: Response) => {
  const { type } = req.params;
  const { branchId, staffId, status, category, startDate, endDate, exportFormat } = req.query;

  try {
    let data: any[] = [];

    switch (type) {
      case 'branch-performance': {
        const perf = await calculateBranchPerformance();
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

      case 'staff-performance': {
        const perf = await calculateStaffPerformance(branchId ? parseInt(branchId as string, 10) : undefined);
        data = perf.map((s, idx) => ({
          'Rank': idx + 1,
          'Employee ID': s.employeeId,
          'Name': s.fullName,
          'Branch': s.branchName,
          'Designation': s.designation,
          'Department': s.department,
          'Assigned Tasks': s.totalAssignedTasks,
          'Completed Tasks': s.completedTasks,
          'Overdue Tasks': s.overdueTasks,
          'On-Time %': `${s.onTimeRate}%`,
          'Target Achievement %': `${s.targetAchievementRate}%`,
          'Support Score %': `${s.supportPerformanceRate}%`,
          'Overall Score': s.overallScore,
        }));
        break;
      }

      case 'tasks': {
        let whereClauses: string[] = [];
        let params: any[] = [];
        if (branchId) {
          params.push(branchId);
          whereClauses.push(`t.branch_id = $${params.length}`);
        }
        if (staffId) {
          params.push(staffId);
          whereClauses.push(`t.assigned_to_id = $${params.length}`);
        }
        if (status) {
          params.push(status);
          whereClauses.push(`t.status = $${params.length}`);
        }
        if (category) {
          params.push(category);
          whereClauses.push(`t.category = $${params.length}`);
        }
        if (startDate) {
          params.push(startDate);
          whereClauses.push(`t.start_date >= $${params.length}`);
        }
        if (endDate) {
          params.push(endDate);
          whereClauses.push(`t.due_date <= $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resTasks = await db.query(
          `SELECT t.task_id as "Task ID", t.title as "Title", t.category as "Category",
                  b.name as "Branch", u.full_name as "Assigned To", t.priority as "Priority",
                  t.status as "Status", t.start_date as "Start Date", t.due_date as "Due Date",
                  t.completion_date as "Completion Date", t.completion_remarks as "Remarks"
           FROM tasks t
           LEFT JOIN branches b ON t.branch_id = b.id
           LEFT JOIN users u ON t.assigned_to_id = u.id
           ${whereSql}
           ORDER BY t.created_at DESC`,
          params
        );
        data = resTasks.rows;
        break;
      }

      case 'connections': {
        let whereClauses: string[] = [];
        let params: any[] = [];
        if (branchId) {
          params.push(branchId);
          whereClauses.push(`c.branch_id = $${params.length}`);
        }
        if (status) {
          params.push(status);
          whereClauses.push(`c.status = $${params.length}`);
        }
        if (startDate) {
          params.push(startDate);
          whereClauses.push(`c.request_date >= $${params.length}`);
        }
        if (endDate) {
          params.push(endDate);
          whereClauses.push(`c.request_date <= $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resConn = await db.query(
          `SELECT c.connection_id as "Connection ID", c.customer_name as "Customer", c.phone as "Phone",
                  b.name as "Branch", u.full_name as "Assigned Staff", c.connection_type as "Type",
                  c.package_plan as "Plan", c.status as "Status", c.request_date as "Request Date",
                  c.activation_date as "Activation Date"
           FROM connections c
           LEFT JOIN branches b ON c.branch_id = b.id
           LEFT JOIN users u ON c.assigned_staff_id = u.id
           ${whereSql}
           ORDER BY c.request_date DESC`,
          params
        );
        data = resConn.rows;
        break;
      }

      case 'goods-requisitions': {
        let whereClauses: string[] = [];
        let params: any[] = [];
        if (branchId) {
          params.push(branchId);
          whereClauses.push(`gr.branch_id = $${params.length}`);
        }
        if (status) {
          params.push(status);
          whereClauses.push(`gr.status = $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resGoods = await db.query(
          `SELECT gr.request_number as "Request #", b.name as "Branch",
                  u.full_name as "Requested By", gr.priority as "Priority",
                  gr.status as "Status", gr.total_items as "Total Items",
                  gr.created_at as "Request Date", gr.required_by as "Required By Date"
           FROM goods_requests gr
           LEFT JOIN branches b ON gr.branch_id = b.id
           LEFT JOIN users u ON gr.requested_by = u.id
           ${whereSql}
           ORDER BY gr.created_at DESC`,
          params
        );
        data = resGoods.rows;
        break;
      }

      case 'follow-ups': {
        let whereClauses: string[] = [];
        let params: any[] = [];
        if (branchId) {
          params.push(branchId);
          whereClauses.push(`f.branch_id = $${params.length}`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resFollow = await db.query(
          `SELECT f.follow_up_id as "ID", b.name as "Branch", f.related_customer_case as "Case",
                  u.full_name as "Assigned Staff", f.type as "Type", f.follow_up_date as "Date",
                  f.priority as "Priority", f.status as "Status", f.result as "Result",
                  f.next_follow_up_date as "Next Date"
           FROM follow_ups f
           LEFT JOIN branches b ON f.branch_id = b.id
           LEFT JOIN users u ON f.assigned_staff_id = u.id
           ${whereSql}
           ORDER BY f.follow_up_date DESC`,
          params
        );
        data = resFollow.rows;
        break;
      }

      case 'targets':
      case 'targets-kpis': {
        let whereClauses: string[] = [];
        let params: any[] = [];
        if (branchId) {
          params.push(branchId);
          whereClauses.push(`t.branch_id = $${params.length}`);
        }
        if (category) {
          params.push(category);
          whereClauses.push(`t.category = $${params.length}`);
        }
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const resTargets = await db.query(
          `SELECT t.target_id as "Target ID", t.target_name as "Name", t.category as "Category",
                  b.name as "Branch", u.full_name as "Employee", t.period as "Period",
                  t.target_value as "Target", t.achieved_value as "Completed",
                  GREATEST(0, t.target_value - t.achieved_value) as "Remaining",
                  t.achievement_percentage as "Achievement %", t.status as "Status",
                  t.start_date as "Start Date", t.end_date as "End Date"
           FROM targets t
           LEFT JOIN branches b ON t.branch_id = b.id
           LEFT JOIN users u ON t.employee_id = u.id
           ${whereSql}
           ORDER BY t.end_date DESC`,
          params
        );
        data = resTargets.rows;
        break;
      }

      case 'instructions': {
        const resInst = await db.query(
          `SELECT i.instruction_id as "ID", i.title as "Title", s.full_name as "Sender",
                  b.name as "Branch", i.recipient_type as "Recipient Type",
                  i.priority as "Priority", i.status as "Status", i.created_at as "Sent At",
                  i.completed_at as "Completed At"
           FROM instructions i
           LEFT JOIN branches b ON i.branch_id = b.id
           LEFT JOIN users s ON i.sender_id = s.id
           ORDER BY i.created_at DESC`
        );
        data = resInst.rows;
        break;
      }

      case 'activity': {
        const resAct = await db.query(
          `SELECT al.id as "Log ID", u.full_name as "User", u.role as "Role",
                  al.action as "Action", al.module as "Module", al.record_id as "Record ID",
                  al.details as "Details", al.ip_address as "IP", al.created_at as "Timestamp"
           FROM activity_logs al
           LEFT JOIN users u ON al.user_id = u.id
           ORDER BY al.created_at DESC LIMIT 500`
        );
        data = resAct.rows;
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type.' });
    }

    if (exportFormat === 'csv') {
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.roleName === 'Super Admin';
      if (!isSuperAdmin && req.user?.permissions && req.user.permissions['reports.export'] !== true) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to export reports.' });
      }
      const csv = jsonToCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report_${type}_${Date.now()}.csv"`);
      return res.send(csv);
    }

    return res.json({ success: true, count: data.length, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
