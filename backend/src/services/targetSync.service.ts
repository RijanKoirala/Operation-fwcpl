import { db } from '../models/database';
import { logActivity } from '../middleware/audit';

export interface SyncTargetOptions {
  branchIds: (number | string)[];
  actorUserId?: number;
  req?: any;
}

/**
 * Checks if a category string corresponds to New Connection targets.
 */
export const isNewConnectionCategory = (category?: string | null): boolean => {
  if (!category) return false;
  const cat = category.trim().toLowerCase();
  return (
    cat === 'new connection' ||
    cat === 'new connections' ||
    cat === 'new_connection' ||
    cat === 'new_connections' ||
    cat.startsWith('new connection')
  );
};

/**
 * Counts completed connections strictly within a branch and date range.
 * This is the SINGLE SOURCE OF TRUTH for New Connection target achievements.
 */
export const countCompletedConnections = async (
  branchId: number,
  startDate: string,
  endDate: string,
  employeeId?: number | null
): Promise<number> => {
  const params: any[] = [branchId, startDate, endDate];
  let empClause = '';
  if (employeeId) {
    params.push(employeeId);
    empClause = `AND assigned_staff_id = $${params.length}`;
  }

  const query = `
    SELECT COUNT(*) as count
    FROM connections
    WHERE branch_id = $1
      AND status = 'Completed'
      AND COALESCE(completion_date, activation_date, installation_date, request_date) >= $2
      AND COALESCE(completion_date, activation_date, installation_date, request_date) <= $3
      ${empClause}
  `;

  const res = await db.query(query, params);
  return parseInt(res.rows[0]?.count || '0', 10);
};

/**
 * Automatically recalculates New Connection targets for specified branch(es).
 * Idempotent, safe against double counting, and logs audit records when counts update.
 */
export const syncNewConnectionTargets = async (
  optionsOrBranchIds: SyncTargetOptions | (number | string)[]
): Promise<void> => {
  const options: SyncTargetOptions = Array.isArray(optionsOrBranchIds)
    ? { branchIds: optionsOrBranchIds }
    : optionsOrBranchIds;
  const { branchIds, actorUserId, req } = options;
  if (!branchIds || branchIds.length === 0) return;

  const uniqueBranchIds = Array.from(
    new Set(
      branchIds
        .map(id => (typeof id === 'string' ? parseInt(id, 10) : id))
        .filter(id => !isNaN(id) && id > 0)
    )
  );

  for (const branchId of uniqueBranchIds) {
    try {
      // Find all New Connection targets for this branch
      const targetsRes = await db.query(
        `SELECT * FROM targets 
         WHERE branch_id = $1 
           AND (category ILIKE 'New Connection%' OR category = 'NEW_CONNECTION')`,
        [branchId]
      );

      for (const target of targetsRes.rows) {
        const trueCompletedCount = await countCompletedConnections(
          branchId,
          target.start_date,
          target.end_date,
          target.employee_id
        );

        const targetVal = Number(target.target_value) || 0;
        const prevAchieved = Number(target.achieved_value) || 0;
        const prevStatus = target.status;
        const prevPct = Number(target.achievement_percentage) || 0;

        const achievementPct = targetVal > 0 ? Math.round((trueCompletedCount / targetVal) * 100 * 100) / 100 : 0;

        let status = 'In Progress';
        if (achievementPct >= 100) {
          status = 'Achieved';
        } else if (achievementPct > 0) {
          status = 'Partially Achieved';
        } else if (new Date(target.end_date) < new Date()) {
          status = 'Missed';
        }

        // Only update if there is a change
        if (trueCompletedCount !== prevAchieved || status !== prevStatus || achievementPct !== prevPct) {
          await db.query(
            `UPDATE targets
             SET achieved_value = $1,
                 achievement_percentage = $2,
                 status = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [trueCompletedCount, achievementPct, status, target.id]
          );

          if (actorUserId) {
            await logActivity({
              userId: actorUserId,
              action: 'AUTO_RECALCULATE_TARGET',
              module: 'TARGETS',
              recordId: target.id,
              details: {
                targetId: target.target_id,
                targetName: target.target_name,
                branchId,
                previousAchieved: prevAchieved,
                newAchieved: trueCompletedCount,
                targetValue: targetVal,
                achievementPercentage: achievementPct,
                message: `Target ${target.target_id} (${target.target_name}) auto-recalculated: ${trueCompletedCount}/${targetVal} completed (${achievementPct}%).`,
              },
              req,
            });
          }
        }
      }
    } catch (err: any) {
      console.error(`⚠️ Error syncing targets for branch ID ${branchId}:`, err.message);
    }
  }
};

/**
 * Returns the contributing New Connection records that satisfy the target criteria.
 * Used for drill-down / auditability in the Target UI.
 */
export const getContributingConnectionsForTarget = async (targetId: number) => {
  const targetRes = await db.query(
    `SELECT t.*,
            b.name as branch_name, b.code as branch_code,
            u.full_name as employee_name, u.employee_id as employee_code
     FROM targets t
     LEFT JOIN branches b ON t.branch_id = b.id
     LEFT JOIN users u ON t.employee_id = u.id
     WHERE t.id = $1`,
    [targetId]
  );

  if (targetRes.rowCount === 0) {
    return null;
  }

  const target = targetRes.rows[0];
  const isNC = isNewConnectionCategory(target.category);

  if (!isNC) {
    return {
      target,
      connections: [],
      total: 0,
      isAutoCalculated: false,
    };
  }

  const params: any[] = [target.branch_id, target.start_date, target.end_date];
  let empClause = '';
  if (target.employee_id) {
    params.push(target.employee_id);
    empClause = `AND c.assigned_staff_id = $${params.length}`;
  }

  const query = `
    SELECT c.id, c.connection_id, c.customer_name, c.customer_id, c.phone, c.email, c.address,
           c.connection_type, c.package_plan, c.status,
           COALESCE(c.completion_date, c.activation_date, c.installation_date, c.request_date) as completion_date,
           c.request_date, c.remarks, c.created_at,
           b.name as branch_name, b.code as branch_code,
           u.full_name as assigned_staff_name, u.phone as assigned_staff_phone
    FROM connections c
    LEFT JOIN branches b ON c.branch_id = b.id
    LEFT JOIN users u ON c.assigned_staff_id = u.id
    WHERE c.branch_id = $1
      AND c.status = 'Completed'
      AND COALESCE(c.completion_date, c.activation_date, c.installation_date, c.request_date) >= $2
      AND COALESCE(c.completion_date, c.activation_date, c.installation_date, c.request_date) <= $3
      ${empClause}
    ORDER BY COALESCE(c.completion_date, c.activation_date, c.installation_date, c.request_date) DESC, c.id DESC
  `;

  const connRes = await db.query(query, params);

  return {
    target,
    connections: connRes.rows,
    total: connRes.rowCount,
    isAutoCalculated: true,
  };
};

/**
 * Returns active target contribution info for a completed connection.
 * Shows which branch target this connection is contributing to.
 */
export const getTargetContributionForConnection = async (connectionId: number) => {
  const connRes = await db.query(
    `SELECT c.*, b.name as branch_name
     FROM connections c
     LEFT JOIN branches b ON c.branch_id = b.id
     WHERE c.id = $1`,
    [connectionId]
  );

  if (connRes.rowCount === 0) {
    return null;
  }

  const conn = connRes.rows[0];
  if (conn.status !== 'Completed') {
    return {
      hasTarget: false,
      isCompleted: false,
      reason: 'Connection is not marked as Completed.',
    };
  }

  const effectiveDate = conn.completion_date || conn.activation_date || conn.installation_date || conn.request_date;

  const targetRes = await db.query(
    `SELECT t.*, b.name as branch_name
     FROM targets t
     LEFT JOIN branches b ON t.branch_id = b.id
     WHERE t.branch_id = $1
       AND (t.category ILIKE 'New Connection%' OR t.category = 'NEW_CONNECTION')
       AND t.start_date <= $2
       AND t.end_date >= $2
     ORDER BY t.created_at DESC
     LIMIT 1`,
    [conn.branch_id, effectiveDate]
  );

  if (targetRes.rowCount === 0) {
    return {
      hasTarget: false,
      isCompleted: true,
      branchName: conn.branch_name,
      reason: 'No active New Connection target configured for this branch and date period.',
    };
  }

  const target = targetRes.rows[0];
  const targetVal = Number(target.target_value) || 0;
  const achievedVal = Number(target.achieved_value) || 0;
  const remainingVal = Math.max(0, targetVal - achievedVal);
  const achievementPct = Number(target.achievement_percentage) || 0;

  return {
    hasTarget: true,
    isCompleted: true,
    targetId: target.target_id,
    targetName: target.target_name,
    branchName: target.branch_name,
    targetValue: targetVal,
    achievedValue: achievedVal,
    remainingValue: remainingVal,
    achievementPercentage: achievementPct,
    period: target.period,
    startDate: target.start_date,
    endDate: target.end_date,
  };
};
