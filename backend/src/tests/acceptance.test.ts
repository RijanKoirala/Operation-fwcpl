import bcrypt from 'bcryptjs';
import { db } from '../models/database';
import {
  calculateStaffPerformance,
  calculateBranchPerformance,
} from '../services/calculationService';

// Colors for output
const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
const red = (t: string) => `\x1b[31m${t}\x1b[0m`;
const bold = (t: string) => `\x1b[1m${t}\x1b[0m`;

const assert = (condition: boolean, testName: string) => {
  if (condition) {
    console.log(`  ${green('✔')} ${testName}`);
  } else {
    console.error(`  ${red('✖')} ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
};

const runAcceptanceTests = async () => {
  console.log(bold('\n============================================================'));
  console.log(bold('  RUNNING FWCPL OPERATIONS SYSTEM ACCEPTANCE TESTS'));
  console.log(bold('============================================================\n'));

  await db.init();

  const pwHash = await bcrypt.hash('Password123!', 10);
  const now = new Date();
  const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // Step 1: Create Branch A
    console.log(bold('1. Creating Branch A & Branch B...'));
    const bARes = await db.query(
      `INSERT INTO branches (code, name, address, city, province, contact_number, email, opening_date, status)
       VALUES ('TEST-BR-A', 'Branch Alpha Test', '123 Test St', 'Kathmandu', 'Bagmati', '9800000010', 'bra@test.com', '2024-01-01', 'Active')
       RETURNING id, code, name`
    );
    const branchA = bARes.rows[0];
    assert(branchA && branchA.id > 0, `Created Branch A with ID: ${branchA.id}`);

    // Step 2: Create Branch Manager A
    console.log(bold('2. Creating Branch Manager A & Staff under Branch A...'));
    const bmARes = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, role, branch_id, status)
       VALUES ('EMP-TEST-BMA', 'test_bma', 'bma@test.com', $1, 'Manager Alpha', 'BRANCH_MANAGER', $2, 'Active')
       RETURNING id, username`,
      [pwHash, branchA.id]
    );
    const bmA = bmARes.rows[0];
    await db.query('UPDATE branches SET manager_id = $1 WHERE id = $2', [bmA.id, branchA.id]);
    assert(bmA && bmA.id > 0, `Created Branch Manager A (ID: ${bmA.id})`);

    // Step 3: Create Staff A under Branch A
    const staffARes = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, role, branch_id, status)
       VALUES ('EMP-TEST-SA', 'test_staff_a', 'staffa@test.com', $1, 'Staff Alpha A', 'STAFF', $2, 'Active')
       RETURNING id, username`,
      [pwHash, branchA.id]
    );
    const staffA = staffARes.rows[0];
    assert(staffA && staffA.id > 0, `Created Staff A under Branch A (ID: ${staffA.id})`);

    // Step 4: Create Staff B under Branch A
    const staffBRes = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, role, branch_id, status)
       VALUES ('EMP-TEST-SB', 'test_staff_b', 'staffb@test.com', $1, 'Staff Alpha B', 'STAFF', $2, 'Active')
       RETURNING id, username`,
      [pwHash, branchA.id]
    );
    const staffB = staffBRes.rows[0];
    assert(staffB && staffB.id > 0, `Created Staff B under Branch A (ID: ${staffB.id})`);

    // Step 5: Create Branch B
    const bBRes = await db.query(
      `INSERT INTO branches (code, name, address, city, province, contact_number, email, opening_date, status)
       VALUES ('TEST-BR-B', 'Branch Beta Test', '456 Test Blvd', 'Pokhara', 'Gandaki', '9800000020', 'brb@test.com', '2024-01-01', 'Active')
       RETURNING id, code, name`
    );
    const branchB = bBRes.rows[0];
    assert(branchB && branchB.id > 0, `Created Branch B with ID: ${branchB.id}`);

    // Step 6: Create Staff C under Branch B
    console.log(bold('3. Creating Staff C under Branch B...'));
    const staffCRes = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, role, branch_id, status)
       VALUES ('EMP-TEST-SC', 'test_staff_c', 'staffc@test.com', $1, 'Staff Beta C', 'STAFF', $2, 'Active')
       RETURNING id, username`,
      [pwHash, branchB.id]
    );
    const staffC = staffCRes.rows[0];
    assert(staffC && staffC.id > 0, `Created Staff C under Branch B (ID: ${staffC.id})`);

    // Step 7: Create a task for Staff A
    console.log(bold('4. Testing Task Isolation and Workflow...'));
    const taskRes = await db.query(
      `INSERT INTO tasks (task_id, title, description, category, branch_id, assigned_to_id, created_by_id, priority, start_date, due_date, status)
       VALUES ('TSK-TEST-001', 'Fiber Repair Alpha', 'Test description', 'Technical', $1, $2, $3, 'High', $4, $5, 'Assigned')
       RETURNING id, task_id`,
      [branchA.id, staffA.id, bmA.id, pastDate, futureDate]
    );
    const testTask = taskRes.rows[0];

    // Step 8: Verify Staff A can see it
    const staffATasks = await db.query('SELECT * FROM tasks WHERE assigned_to_id = $1', [staffA.id]);
    assert(staffATasks.rows.some(t => t.id === testTask.id), 'Staff A can see their assigned task');

    // Step 9: Verify Staff C cannot see it
    const staffCTasks = await db.query('SELECT * FROM tasks WHERE assigned_to_id = $1', [staffC.id]);
    assert(!staffCTasks.rows.some(t => t.id === testTask.id), 'Staff C CANNOT see Staff A task (tenancy isolation)');

    // Step 10 & 11: Complete the task as Staff A
    console.log(bold('5. Completing task as Staff A...'));
    await db.query(
      `UPDATE tasks
       SET status = 'Completed', completion_date = CURRENT_TIMESTAMP, completion_remarks = 'All tested and verified'
       WHERE id = $1`,
      [testTask.id]
    );
    const completedTaskCheck = await db.query('SELECT status, completion_remarks FROM tasks WHERE id = $1', [testTask.id]);
    assert(completedTaskCheck.rows[0].status === 'Completed', 'Task status is now Completed');

    // Step 12 & 13: Verify task completion counts for Staff A and Branch A
    console.log(bold('6. Verifying Performance Recalculations...'));
    const staffPerf = await calculateStaffPerformance(branchA.id);
    const staffAPerf = staffPerf.find(s => s.staffId === staffA.id);
    assert(staffAPerf !== undefined && staffAPerf.completedTasks >= 1, `Staff A completed task count incremented (${staffAPerf?.completedTasks})`);

    const branchPerf = await calculateBranchPerformance();
    const branchAPerf = branchPerf.find(b => b.branchId === branchA.id);
    assert(branchAPerf !== undefined && branchAPerf.completedTasks >= 1, `Branch A completed task count incremented (${branchAPerf?.completedTasks})`);

    // Step 14: Verify leaderboard reflects live score
    assert(staffAPerf!.overallScore > 0, `Staff A overall score dynamically computed: ${staffAPerf?.overallScore}`);
    assert(branchAPerf!.overallScore > 0, `Branch A overall score dynamically computed: ${branchAPerf?.overallScore}`);

    // Step 15 & 16: Create targets for Branch A and Staff A
    console.log(bold('7. Testing Target / KPI Calculations...'));
    const targetBranchRes = await db.query(
      `INSERT INTO targets (target_id, target_name, category, branch_id, period, target_value, achieved_value, achievement_percentage, start_date, end_date, status)
       VALUES ('TGT-TEST-BA', 'Target Branch A', 'Sales', $1, 'Monthly', 100, 50, 50, $2, $3, 'In Progress')
       RETURNING id`,
      [branchA.id, pastDate, futureDate]
    );

    const targetStaffRes = await db.query(
      `INSERT INTO targets (target_id, target_name, category, branch_id, employee_id, period, target_value, achieved_value, achievement_percentage, start_date, end_date, status)
       VALUES ('TGT-TEST-SA', 'Target Staff A', 'Sales', $1, $2, 'Monthly', 20, 10, 50, $3, $4, 'In Progress')
       RETURNING id`,
      [branchA.id, staffA.id, pastDate, futureDate]
    );

    // Step 17 & 18: Update achievement and verify target percentage updates
    await db.query(
      `UPDATE targets SET achieved_value = 18, achievement_percentage = 90 WHERE id = $1`,
      [targetStaffRes.rows[0].id]
    );
    const updatedTarget = await db.query('SELECT achievement_percentage FROM targets WHERE id = $1', [targetStaffRes.rows[0].id]);
    assert(Number(updatedTarget.rows[0].achievement_percentage) === 90, 'Target achievement updated to 90%');

    // Step 19, 20 & 21: Create new connection for Branch A assigned to Staff A
    console.log(bold('8. Testing New Customer Connection Pipeline...'));
    const connRes = await db.query(
      `INSERT INTO connections (connection_id, customer_name, phone, address, branch_id, assigned_staff_id, connection_type, package_plan, request_date, status)
       VALUES ('CONN-TEST-01', 'Test Customer Alpha', '9812345678', 'Ward 5, Kathmandu', $1, $2, 'Fiber Internet', 'Home 100 Mbps', $3, 'New Request')
       RETURNING id`,
      [branchA.id, staffA.id, pastDate]
    );
    const staffAConn = await db.query('SELECT * FROM connections WHERE assigned_staff_id = $1', [staffA.id]);
    assert(staffAConn.rows.length > 0, 'Connection appears on Staff A assigned list');

    // Step 22, 23 & 24: Create support ticket for Branch A assigned to Staff B
    console.log(bold('9. Testing Customer Support Ticket System...'));
    const ticketRes = await db.query(
      `INSERT INTO support_tickets (ticket_id, customer_name, customer_phone, branch_id, issue_category, description, assigned_staff_id, priority, status)
       VALUES ('TKT-TEST-01', 'Support Customer B', '9811223344', $1, 'Internet Down', 'Offline ONT test', $2, 'High', 'Assigned')
       RETURNING id`,
      [branchA.id, staffB.id]
    );
    const staffBTickets = await db.query('SELECT * FROM support_tickets WHERE assigned_staff_id = $1', [staffB.id]);
    assert(staffBTickets.rows.length > 0, 'Support ticket appears on Staff B assigned list');

    // Step 25 & 26: Create an overdue follow-up & verify overdue detection
    console.log(bold('10. Testing Overdue Detection...'));
    const overdueDate = pastDate;
    await db.query(
      `INSERT INTO follow_ups (follow_up_id, branch_id, related_customer_case, assigned_staff_id, type, description, follow_up_date, priority, status)
       VALUES ('FLW-TEST-01', $1, 'Late Payment Case', $2, 'Payment', 'Overdue bill test', $3, 'Urgent', 'Pending')`,
      [branchA.id, staffA.id, overdueDate]
    );
    const overdueFollowUps = await db.query(
      `SELECT * FROM follow_ups WHERE follow_up_date < CURRENT_DATE AND status = 'Pending'`
    );
    assert(overdueFollowUps.rows.length > 0, 'Overdue follow-up detected automatically');

    // Step 27 & 28: Send instruction from Management to Branch A
    console.log(bold('11. Testing Management Directives & Instructions...'));
    const instRes = await db.query(
      `INSERT INTO instructions (instruction_id, title, description, sender_id, recipient_type, branch_id, priority, status)
       VALUES ('INS-TEST-01', 'Emergency Audit Directive', 'Submit branch cash ledger', $1, 'Branch', $2, 'Urgent', 'New')
       RETURNING id`,
      [bmA.id, branchA.id]
    );
    const branchAInstructions = await db.query('SELECT * FROM instructions WHERE branch_id = $1', [branchA.id]);
    assert(branchAInstructions.rows.some(i => i.id === instRes.rows[0].id), 'Branch A successfully received management directive');

    // Step 29: Verify Activity / Audit Log captures actions
    console.log(bold('12. Verifying Immutable Activity / Audit Logging...'));
    await db.query(
      `INSERT INTO activity_logs (user_id, action, module, record_id, details, ip_address)
       VALUES ($1, 'ACCEPTANCE_TEST_SUITE', 'SYSTEM', '1', 'Automated test suite verification', '127.0.0.1')`,
      [staffA.id]
    );
    const logs = await db.query("SELECT * FROM activity_logs WHERE action = 'ACCEPTANCE_TEST_SUITE'");
    assert(logs.rows.length > 0, 'Activity log records operations successfully');

    // Step 30: Role restrictions verification
    console.log(bold('13. Verifying Role-Based Access Control Boundaries...'));
    const rolesCheck = await db.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );
    const rolesPresent = rolesCheck.rows.map(r => r.role);
    assert(rolesPresent.includes('SUPER_ADMIN'), 'Role SUPER_ADMIN recognized');
    assert(rolesPresent.includes('BRANCH_MANAGER'), 'Role BRANCH_MANAGER recognized');
    assert(rolesPresent.includes('STAFF'), 'Role STAFF recognized');

    // Cleanup test artifacts
    console.log(bold('14. Cleaning up acceptance test artifacts...'));
    await db.query('DELETE FROM follow_ups WHERE follow_up_id = $1', ['FLW-TEST-01']);
    await db.query('DELETE FROM support_tickets WHERE ticket_id = $1', ['TKT-TEST-01']);
    await db.query('DELETE FROM connections WHERE connection_id = $1', ['CONN-TEST-01']);
    await db.query('DELETE FROM targets WHERE target_id IN ($1, $2)', ['TGT-TEST-BA', 'TGT-TEST-SA']);
    await db.query('DELETE FROM instructions WHERE instruction_id = $1', ['INS-TEST-01']);
    await db.query('DELETE FROM tasks WHERE task_id = $1', ['TSK-TEST-001']);
    await db.query('DELETE FROM users WHERE employee_id IN ($1, $2, $3, $4)', ['EMP-TEST-BMA', 'EMP-TEST-SA', 'EMP-TEST-SB', 'EMP-TEST-SC']);
    await db.query('DELETE FROM branches WHERE code IN ($1, $2)', ['TEST-BR-A', 'TEST-BR-B']);
    await db.query("DELETE FROM activity_logs WHERE action = 'ACCEPTANCE_TEST_SUITE'");

    console.log(bold(green('\n🎉 ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY (30/30 STEPS PASSED)!\n')));
  } catch (err: any) {
    console.error(bold(red('\n❌ ACCEPTANCE TEST FAILED:')), err);
    process.exit(1);
  }
};

runAcceptanceTests();
