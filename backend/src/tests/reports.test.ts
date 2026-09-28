import { db } from '../models/database';
import { calculateBranchPerformance, calculateStaffPerformance } from '../services/calculationService';
import { syncNewConnectionTargets } from '../services/targetSync.service';

const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
const red = (t: string) => `\x1b[31m${t}\x1b[0m`;
const bold = (t: string) => `\x1b[1m${t}\x1b[0m`;
const cyan = (t: string) => `\x1b[36m${t}\x1b[0m`;

const assert = (condition: boolean, testName: string, details?: string) => {
  if (condition) {
    console.log(`  ${green('✔')} ${testName}`);
  } else {
    console.error(`  ${red('✖')} ${testName}`);
    if (details) console.error(`    ${red(details)}`);
    throw new Error(`Assertion failed: ${testName} - ${details || ''}`);
  }
};

export const runReportsTests = async () => {
  console.log(bold('\n======================================================================'));
  console.log(bold('  RUNNING OPERATIONAL & EXECUTIVE REPORTS TEST SUITE'));
  console.log(bold('======================================================================\n'));

  await db.init();

  try {
    // 0. Setup test data fixtures
    console.log(cyan('Setup: Preparing test branch, staff, tasks, and connections...'));
    await db.query(`DELETE FROM connection_staff WHERE connection_id IN (SELECT id FROM connections WHERE connection_id LIKE 'TEST-RPT-%')`);
    await db.query(`DELETE FROM connections WHERE connection_id LIKE 'TEST-RPT-%'`);
    await db.query(`DELETE FROM task_staff WHERE task_id IN (SELECT id FROM tasks WHERE task_id LIKE 'TEST-RPT-%')`);
    await db.query(`DELETE FROM tasks WHERE task_id LIKE 'TEST-RPT-%'`);
    await db.query(`DELETE FROM goods_request_items WHERE request_id IN (SELECT id FROM goods_requests WHERE request_number LIKE 'TEST-RPT-%')`);
    await db.query(`DELETE FROM goods_requests WHERE request_number LIKE 'TEST-RPT-%'`);
    await db.query(`DELETE FROM targets WHERE target_id LIKE 'TEST-RPT-%'`);
    await db.query(`DELETE FROM users WHERE username IN ('test_ram_rpt', 'test_shyam_rpt')`);
    await db.query(`DELETE FROM branches WHERE code = 'TEST-RPT-BR'`);

    // Create branch
    const brRes = await db.query(
      `INSERT INTO branches (code, name, address, city, province, contact_number, email, opening_date, status)
       VALUES ('TEST-RPT-BR', 'Report Test Branch', 'Central Plaza', 'Kathmandu', 'Bagmati', '9800000099', 'rpt@test.com', '2024-01-01', 'Active')
       RETURNING id, code, name`
    );
    const branchId = brRes.rows[0].id;

    // Create staff 1 (Ram)
    const ramRes = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, role, branch_id, status)
       VALUES ('EMP-RPT-01', 'test_ram_rpt', 'ram@test.com', 'hash', 'Ram Thapa', 'STAFF', $1, 'Active')
       RETURNING id, full_name`,
      [branchId]
    );
    const ramId = ramRes.rows[0].id;

    // Create staff 2 (Shyam)
    const shyamRes = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, role, branch_id, status)
       VALUES ('EMP-RPT-02', 'test_shyam_rpt', 'shyam@test.com', 'hash', 'Shyam Gurung', 'STAFF', $1, 'Active')
       RETURNING id, full_name`,
      [branchId]
    );
    const shyamId = shyamRes.rows[0].id;

    // Create a multi-staff task assigned to both Ram and Shyam
    const taskRes = await db.query(
      `INSERT INTO tasks (task_id, title, category, branch_id, assigned_to_id, priority, start_date, due_date, status)
       VALUES ('TEST-RPT-TSK-01', 'Multi-staff Fiber Splicing', 'Maintenance', $1, $2, 'High', '2026-09-01', '2026-09-10', 'In Progress')
       RETURNING id, task_id`,
      [branchId, ramId]
    );
    const taskId = taskRes.rows[0].id;

    // Link both to task_staff
    await db.query(`INSERT INTO task_staff (task_id, staff_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [taskId, ramId]);
    await db.query(`INSERT INTO task_staff (task_id, staff_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [taskId, shyamId]);

    // Create a single-staff task assigned only to Shyam
    await db.query(
      `INSERT INTO tasks (task_id, title, category, branch_id, assigned_to_id, priority, start_date, due_date, status)
       VALUES ('TEST-RPT-TSK-02', 'Single-staff Router Setup', 'Installation', $1, $2, 'Medium', '2026-09-05', '2026-09-12', 'Completed')`,
      [branchId, shyamId]
    );

    // Create a multi-staff connection
    const connRes = await db.query(
      `INSERT INTO connections (connection_id, customer_name, phone, address, branch_id, assigned_staff_id, connection_type, package_plan, request_date, status)
       VALUES ('TEST-RPT-CON-01', 'Aarav Sharma', '9841234567', 'Thamel', $1, $2, 'Fiber Internet', '100 Mbps Home', '2026-09-02', 'In Progress')
       RETURNING id, connection_id`,
      [branchId, ramId]
    );
    const connId = connRes.rows[0].id;
    await db.query(`INSERT INTO connection_staff (connection_id, staff_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [connId, ramId]);
    await db.query(`INSERT INTO connection_staff (connection_id, staff_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [connId, shyamId]);

    // Create a goods request with 2 items
    const reqRes = await db.query(
      `INSERT INTO goods_requests (request_number, branch_id, requested_by, priority, status, required_by, remarks)
       VALUES ('TEST-RPT-REQ-01', $1, $2, 'Urgent', 'PENDING', '2026-09-15', 'Urgent cable replenishment')
       RETURNING id, request_number`,
      [branchId, ramId]
    );
    const reqId = reqRes.rows[0].id;
    await db.query(
      `INSERT INTO goods_request_items (request_id, item_name_snapshot, unit_snapshot, requested_quantity, approved_quantity, item_status)
       VALUES ($1, 'Fiber Drop Cable 2-Core', 'meters', 500, 500, 'PENDING'),
              ($1, 'Fast Connectors SC/UPC', 'pcs', 50, 50, 'PENDING')`,
      [reqId]
    );

    // Create a target
    await db.query(
      `INSERT INTO targets (target_id, target_name, category, branch_id, employee_id, period, target_value, achieved_value, achievement_percentage, start_date, end_date, status)
       VALUES ('TEST-RPT-TGT-01', 'September Q3 Target', 'New Connection', $1, $2, 'Monthly', 20, 15, 75.0, '2026-09-01', '2026-09-30', 'In Progress')`,
      [branchId, ramId]
    );

    // -----------------------------------------------------------------
    // TEST 1: Tasks Report - Multi-staff Aggregation & Uniqueness (ONE row)
    // -----------------------------------------------------------------
    console.log(bold('\n1. Test: Multi-Staff Task Aggregation & Single-Row Integrity'));
    const tRes = await db.query(
      `SELECT t.id, t.task_id as "Task ID", t.title as "Task Title",
              b.name as "Branch", u.full_name as "Primary Staff",
              t.priority as "Priority", t.status as "Status"
       FROM tasks t
       LEFT JOIN branches b ON t.branch_id = b.id
       LEFT JOIN users u ON t.assigned_to_id = u.id
       WHERE t.branch_id = $1 AND t.task_id LIKE 'TEST-RPT-%'
       ORDER BY t.created_at DESC`,
      [branchId]
    );

    assert(tRes.rows.length === 2, 'Fetched exactly 2 test tasks without duplicate rows');

    // Aggregate staff for the tasks
    const tIds = tRes.rows.map(r => r.id);
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

    const multiTaskRow = tRes.rows.find(r => r['Task ID'] === 'TEST-RPT-TSK-01');
    const staffList = sMap.get(multiTaskRow.id) || [];
    const assignedStaffStr = staffList.join(', ');

    assert(
      assignedStaffStr.includes('Ram Thapa') && assignedStaffStr.includes('Shyam Gurung'),
      'Multi-staff task contains both Ram Thapa and Shyam Gurung in one cell',
      `Got: ${assignedStaffStr}`
    );

    // -----------------------------------------------------------------
    // TEST 2: Task Filter by Staff
    // -----------------------------------------------------------------
    console.log(bold('\n2. Test: Task Filtering by Staff'));
    // Query filtering by Shyam
    const shyamTasks = await db.query(
      `SELECT t.task_id
       FROM tasks t
       WHERE t.branch_id = $1 AND (t.assigned_to_id = $2 OR EXISTS (SELECT 1 FROM task_staff ts WHERE ts.task_id = t.id AND ts.staff_id = $2))
         AND t.task_id LIKE 'TEST-RPT-%'`,
      [branchId, shyamId]
    );
    assert(
      shyamTasks.rows.length === 2,
      'Filtering by Shyam returns both the single-staff task AND the shared multi-staff task'
    );

    // Query filtering by Ram
    const ramTasks = await db.query(
      `SELECT t.task_id
       FROM tasks t
       WHERE t.branch_id = $1 AND (t.assigned_to_id = $2 OR EXISTS (SELECT 1 FROM task_staff ts WHERE ts.task_id = t.id AND ts.staff_id = $2))
         AND t.task_id LIKE 'TEST-RPT-%'`,
      [branchId, ramId]
    );
    assert(
      ramTasks.rows.length === 1 && ramTasks.rows[0].task_id === 'TEST-RPT-TSK-01',
      'Filtering by Ram returns only the shared task and NOT the task assigned solely to Shyam'
    );

    // -----------------------------------------------------------------
    // TEST 3: Connections Report - Multi-staff Aggregation
    // -----------------------------------------------------------------
    console.log(bold('\n3. Test: New Connections Multi-Staff Aggregation & Single-Row Integrity'));
    const cRes = await db.query(
      `SELECT c.id, c.connection_id as "Connection ID", c.customer_name as "Customer Name",
              b.name as "Branch"
       FROM connections c
       LEFT JOIN branches b ON c.branch_id = b.id
       WHERE c.branch_id = $1 AND c.connection_id LIKE 'TEST-RPT-%'`,
      [branchId]
    );
    assert(cRes.rows.length === 1, 'Exactly 1 row returned for test connection');

    const cIds = cRes.rows.map(r => r.id);
    const csRes = await db.query(
      `SELECT cs.connection_id, u.full_name FROM connection_staff cs JOIN users u ON cs.staff_id = u.id WHERE cs.connection_id IN (${cIds.map((_, i) => `$${i + 1}`).join(',')})`,
      cIds
    );
    const cStaffList = csRes.rows.map(r => r.full_name).join(', ');
    assert(
      cStaffList.includes('Ram Thapa') && cStaffList.includes('Shyam Gurung'),
      'Connection multi-staff contains both Ram and Shyam in single row'
    );

    // -----------------------------------------------------------------
    // TEST 4: Goods / Requisitions Report - Item-level Detail
    // -----------------------------------------------------------------
    console.log(bold('\n4. Test: Goods / Requisitions Report Item Details'));
    const gRes = await db.query(
      `SELECT gr.request_number as "Request #",
              b.name as "Branch",
              u.full_name as "Requested By",
              gri.item_name_snapshot as "Item Name",
              gri.requested_quantity as "Quantity",
              gri.unit_snapshot as "Unit",
              gr.priority as "Priority",
              gr.status as "Request Status"
       FROM goods_requests gr
       LEFT JOIN goods_request_items gri ON gri.request_id = gr.id
       LEFT JOIN branches b ON gr.branch_id = b.id
       LEFT JOIN users u ON gr.requested_by = u.id
       WHERE gr.branch_id = $1 AND gr.request_number = 'TEST-RPT-REQ-01'
       ORDER BY gri.id ASC`,
      [branchId]
    );

    assert(gRes.rows.length === 2, 'Goods request with 2 items yields 2 item rows for material analysis');
    assert(gRes.rows[0]['Item Name'] === 'Fiber Drop Cable 2-Core', 'First item name matches');
    assert(Number(gRes.rows[0]['Quantity']) === 500, 'First item quantity matches (500)');
    assert(gRes.rows[1]['Item Name'] === 'Fast Connectors SC/UPC', 'Second item name matches');
    assert(Number(gRes.rows[1]['Quantity']) === 50, 'Second item quantity matches (50)');

    // -----------------------------------------------------------------
    // TEST 5: Targets Report
    // -----------------------------------------------------------------
    console.log(bold('\n5. Test: Targets Report Goal & Achievement Values'));
    const tgtRes = await db.query(
      `SELECT t.target_id as "Target ID",
              t.target_name as "Target Name",
              b.name as "Branch",
              u.full_name as "Employee",
              t.target_value as "Target Value",
              t.achieved_value as "Completed Value",
              GREATEST(0, t.target_value - t.achieved_value) as "Remaining",
              t.achievement_percentage as "Achievement %"
       FROM targets t
       LEFT JOIN branches b ON t.branch_id = b.id
       LEFT JOIN users u ON t.employee_id = u.id
       WHERE t.branch_id = $1 AND t.target_id = 'TEST-RPT-TGT-01'`,
      [branchId]
    );

    assert(tgtRes.rows.length === 1, 'Target row found');
    assert(Number(tgtRes.rows[0]['Target Value']) === 20, 'Target Value is 20');
    assert(Number(tgtRes.rows[0]['Completed Value']) === 15, 'Completed Value is 15');
    assert(Number(tgtRes.rows[0]['Remaining']) === 5, 'Remaining value is 5 (20 - 15)');
    assert(Number(tgtRes.rows[0]['Achievement %']) === 75, 'Achievement % is 75%');

    // -----------------------------------------------------------------
    // TEST 6: Branch Performance & Staff Productivity Calculations
    // -----------------------------------------------------------------
    console.log(bold('\n6. Test: Executive Calculations (Branch Performance & Staff Productivity)'));
    const branchPerf = await calculateBranchPerformance();
    assert(Array.isArray(branchPerf) && branchPerf.length > 0, 'calculateBranchPerformance returns valid array of branch scores');

    const staffPerf = await calculateStaffPerformance(branchId);
    assert(Array.isArray(staffPerf), 'calculateStaffPerformance returns valid array for test branch');

    // Cleanup
    console.log(cyan('\nCleanup: Removing test fixtures...'));
    await db.query(`DELETE FROM connection_staff WHERE connection_id IN (SELECT id FROM connections WHERE connection_id LIKE 'TEST-RPT-%')`);
    await db.query(`DELETE FROM connections WHERE connection_id LIKE 'TEST-RPT-%'`);
    await db.query(`DELETE FROM task_staff WHERE task_id IN (SELECT id FROM tasks WHERE task_id LIKE 'TEST-RPT-%')`);
    await db.query(`DELETE FROM tasks WHERE task_id LIKE 'TEST-RPT-%'`);
    await db.query(`DELETE FROM goods_request_items WHERE request_id IN (SELECT id FROM goods_requests WHERE request_number LIKE 'TEST-RPT-%')`);
    await db.query(`DELETE FROM goods_requests WHERE request_number LIKE 'TEST-RPT-%'`);
    await db.query(`DELETE FROM targets WHERE target_id LIKE 'TEST-RPT-%'`);
    await db.query(`DELETE FROM users WHERE username IN ('test_ram_rpt', 'test_shyam_rpt')`);
    await db.query(`DELETE FROM branches WHERE code = 'TEST-RPT-BR'`);

    console.log(green('\n✔ ALL REPORTS TEST SCENARIOS PASSED WITH ZERO ERRORS!\n'));
    return true;
  } catch (err) {
    console.error(red('\n✖ REPORT TEST FAILED:'), err);
    throw err;
  }
};

// Execute if run directly
if (require.main === module) {
  runReportsTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
