import { db } from '../models/database';
import {
  syncNewConnectionTargets,
  getContributingConnectionsForTarget,
  getTargetContributionForConnection,
  isNewConnectionCategory,
} from '../services/targetSync.service';

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

export const runTargetConnectionSyncTests = async () => {
  console.log(bold('\n======================================================================'));
  console.log(bold('  RUNNING TARGET <-> NEW CONNECTION INTEGRATION TEST SUITE (12 SCENARIOS)'));
  console.log(bold('======================================================================\n'));

  await db.init();

  try {
    // 0. Setup: Clean up any prior test fixtures
    console.log(cyan('Setup: Preparing test branches and initial state...'));
    await db.query(`DELETE FROM connections WHERE customer_id LIKE 'TEST-CUST-%'`);
    await db.query(`DELETE FROM targets WHERE target_id LIKE 'TEST-TGT-%'`);
    await db.query(`DELETE FROM branches WHERE code IN ('TEST-KAWASOTI', 'TEST-BHARATPUR')`);

    const brKawaRes = await db.query(
      `INSERT INTO branches (code, name, address, city, province, contact_number, email, opening_date, status)
       VALUES ('TEST-KAWASOTI', 'Kawasoti Test Branch', 'Kawasoti Bazaar', 'Kawasoti', 'Gandaki', '9800000031', 'kawasoti@test.com', '2024-01-01', 'Active')
       RETURNING id, code, name`
    );
    const kawasotiBranchId = brKawaRes.rows[0].id;

    const brBgpRes = await db.query(
      `INSERT INTO branches (code, name, address, city, province, contact_number, email, opening_date, status)
       VALUES ('TEST-BHARATPUR', 'Bharatpur Test Branch', 'Lions Chowk', 'Bharatpur', 'Bagmati', '9800000032', 'bharatpur@test.com', '2024-01-01', 'Active')
       RETURNING id, code, name`
    );
    const bharatpurBranchId = brBgpRes.rows[0].id;

    // SCENARIO 1: Target Creation (Kawasoti 30, Sep 2026 -> 0 completed, 30 remaining)
    console.log(bold('\n1. Scenario 1: Target Creation with 0 completed records'));
    const tSepRes = await db.query(
      `INSERT INTO targets (target_id, target_name, description, category, branch_id, target_value, achieved_value, unit, period, start_date, end_date, status)
       VALUES ('TEST-TGT-KAWA-SEP', 'Sep 2026 Fiber Expansion', 'New fiber connections target', 'New Connection', $1, 30, 0, 'connections', 'Monthly', '2026-09-01', '2026-09-30', 'Active')
       RETURNING id, target_id, target_value, achieved_value`,
      [kawasotiBranchId]
    );
    const targetKawaSep = tSepRes.rows[0];

    // Initial sync
    await syncNewConnectionTargets([kawasotiBranchId]);
    const t1Res = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id]);
    const t1 = t1Res.rows[0];
    const remaining1 = Math.max(0, Number(t1.target_value) - Number(t1.achieved_value));
    assert(Number(t1.achieved_value) === 0, 'Scenario 1: Achieved is exactly 0 initially');
    assert(remaining1 === 30, 'Scenario 1: Remaining is exactly 30');
    assert(Number(t1.achievement_percentage) === 0, 'Scenario 1: Achievement percentage is 0%');

    // SCENARIO 2: 1 Completed Connection -> 1 completed, 29 remaining, 3.33%
    console.log(bold('\n2. Scenario 2: First Completed Connection'));
    const c1Res = await db.query(
      `INSERT INTO connections (connection_id, customer_name, customer_id, phone, address, branch_id, package_plan, request_date, completion_date, status)
       VALUES ('CONN-TEST-001', 'Ram Sharma', 'TEST-CUST-001', '9801111111', 'Kawasoti-1', $1, 'Home Super 200 Mbps', '2026-09-02', '2026-09-05', 'Completed')
       RETURNING id, connection_id, status, completion_date`,
      [kawasotiBranchId]
    );
    const conn1 = c1Res.rows[0];

    await syncNewConnectionTargets([kawasotiBranchId]);
    const t2Res = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id]);
    const t2 = t2Res.rows[0];
    const remaining2 = Math.max(0, Number(t2.target_value) - Number(t2.achieved_value));
    assert(Number(t2.achieved_value) === 1, 'Scenario 2: Achieved incremented to 1');
    assert(remaining2 === 29, 'Scenario 2: Remaining is 29');
    assert(Number(t2.achievement_percentage) === 3.33, `Scenario 2: Achievement is 3.33% (actual: ${t2.achievement_percentage}%)`);

    // SCENARIO 3: 2nd Completed Connection -> 2 completed, 28 remaining, 6.67%
    console.log(bold('\n3. Scenario 3: Second Completed Connection'));
    const c2Res = await db.query(
      `INSERT INTO connections (connection_id, customer_name, customer_id, phone, address, branch_id, package_plan, request_date, completion_date, status)
       VALUES ('CONN-TEST-002', 'Sita KC', 'TEST-CUST-002', '9802222222', 'Kawasoti-2', $1, 'Home Super 200 Mbps', '2026-09-03', '2026-09-10', 'Completed')
       RETURNING id, connection_id, status, completion_date`,
      [kawasotiBranchId]
    );
    const conn2 = c2Res.rows[0];

    await syncNewConnectionTargets([kawasotiBranchId]);
    const t3Res = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id]);
    const t3 = t3Res.rows[0];
    const remaining3 = Math.max(0, Number(t3.target_value) - Number(t3.achieved_value));
    assert(Number(t3.achieved_value) === 2, 'Scenario 3: Achieved incremented to 2');
    assert(remaining3 === 28, 'Scenario 3: Remaining is 28');
    assert(Number(t3.achievement_percentage) === 6.67, `Scenario 3: Achievement is 6.67% (actual: ${t3.achievement_percentage}%)`);

    // SCENARIO 4: Edit 2nd connection leaving COMPLETED -> No double counting (still 2)
    console.log(bold('\n4. Scenario 4: Edit Completed Connection without status change (prevent double counting)'));
    await db.query(
      `UPDATE connections SET remarks = 'Updated ONT serial number and tested optical signal -18dBm' WHERE id = $1`,
      [conn2.id]
    );
    await syncNewConnectionTargets([kawasotiBranchId]);
    const t4Res = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id]);
    const t4 = t4Res.rows[0];
    assert(Number(t4.achieved_value) === 2, 'Scenario 4: Achieved remains strictly 2 (no double counting on edit)');
    assert(Math.max(0, Number(t4.target_value) - Number(t4.achieved_value)) === 28, 'Scenario 4: Remaining remains strictly 28');

    // SCENARIO 5: Edit 2nd connection to CANCELLED -> 1 completed, 29 remaining
    console.log(bold('\n5. Scenario 5: Cancel Completed Connection (decrement count)'));
    await db.query(`UPDATE connections SET status = 'Cancelled' WHERE id = $1`, [conn2.id]);
    await syncNewConnectionTargets([kawasotiBranchId]);
    const t5Res = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id]);
    const t5 = t5Res.rows[0];
    assert(Number(t5.achieved_value) === 1, 'Scenario 5: Achieved decremented back to 1');
    assert(Math.max(0, Number(t5.target_value) - Number(t5.achieved_value)) === 29, 'Scenario 5: Remaining incremented back to 29');
    assert(Number(t5.achievement_percentage) === 3.33, 'Scenario 5: Achievement adjusted to 3.33%');

    // SCENARIO 6: Edit 2nd connection back to COMPLETED -> 2 completed, 28 remaining
    console.log(bold('\n6. Scenario 6: Re-activate connection to Completed (increment count)'));
    await db.query(`UPDATE connections SET status = 'Completed' WHERE id = $1`, [conn2.id]);
    await syncNewConnectionTargets([kawasotiBranchId]);
    const t6Res = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id]);
    const t6 = t6Res.rows[0];
    assert(Number(t6.achieved_value) === 2, 'Scenario 6: Achieved safely returned to 2');
    assert(Math.max(0, Number(t6.target_value) - Number(t6.achieved_value)) === 28, 'Scenario 6: Remaining is 28');

    // SCENARIO 7: Branch change (Kawasoti -> Bharatpur) -> Kawasoti -1, Bharatpur +1
    console.log(bold('\n7. Scenario 7: Branch Transfer of Completed Connection'));
    const tBgpRes = await db.query(
      `INSERT INTO targets (target_id, target_name, description, category, branch_id, target_value, achieved_value, unit, period, start_date, end_date, status)
       VALUES ('TEST-TGT-BGP-SEP', 'Bharatpur Sep Target', 'New fiber connections', 'New Connection', $1, 20, 0, 'connections', 'Monthly', '2026-09-01', '2026-09-30', 'Active')
       RETURNING id, target_id`,
      [bharatpurBranchId]
    );
    const targetBgpSep = tBgpRes.rows[0];

    // Move conn2 to Bharatpur
    await db.query(`UPDATE connections SET branch_id = $1 WHERE id = $2`, [bharatpurBranchId, conn2.id]);
    await syncNewConnectionTargets([kawasotiBranchId, bharatpurBranchId]);

    const t7Kawa = (await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id])).rows[0];
    const t7Bgp = (await db.query(`SELECT * FROM targets WHERE id = $1`, [targetBgpSep.id])).rows[0];

    assert(Number(t7Kawa.achieved_value) === 1, 'Scenario 7: Kawasoti count decremented by 1 (to 1)');
    assert(Number(t7Bgp.achieved_value) === 1, 'Scenario 7: Bharatpur count incremented by 1 (to 1)');
    assert(Math.max(0, Number(t7Bgp.target_value) - Number(t7Bgp.achieved_value)) === 19, 'Scenario 7: Bharatpur remaining is 19');

    // Move conn2 back to Kawasoti for following tests
    await db.query(`UPDATE connections SET branch_id = $1 WHERE id = $2`, [kawasotiBranchId, conn2.id]);
    await syncNewConnectionTargets([kawasotiBranchId, bharatpurBranchId]);

    // SCENARIO 8: Period change across dates (shifts between monthly targets)
    console.log(bold('\n8. Scenario 8: Period Shift via Completion Date Change'));
    const tOctRes = await db.query(
      `INSERT INTO targets (target_id, target_name, description, category, branch_id, target_value, achieved_value, unit, period, start_date, end_date, status)
       VALUES ('TEST-TGT-KAWA-OCT', 'Oct 2026 Fiber Expansion', 'Oct fiber target', 'New Connection', $1, 25, 0, 'connections', 'Monthly', '2026-10-01', '2026-10-31', 'Active')
       RETURNING id, target_id`,
      [kawasotiBranchId]
    );
    const targetKawaOct = tOctRes.rows[0];

    // Shift conn1 completion date to Oct 5
    await db.query(`UPDATE connections SET completion_date = '2026-10-05' WHERE id = $1`, [conn1.id]);
    await syncNewConnectionTargets([kawasotiBranchId]);

    const t8Sep = (await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id])).rows[0];
    const t8Oct = (await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaOct.id])).rows[0];

    assert(Number(t8Sep.achieved_value) === 1, 'Scenario 8: Sep target count decremented to 1');
    assert(Number(t8Oct.achieved_value) === 1, 'Scenario 8: Oct target count incremented to 1');
    assert(Math.max(0, Number(t8Oct.target_value) - Number(t8Oct.achieved_value)) === 24, 'Scenario 8: Oct remaining is 24');

    // Reset conn1 back to Sep 5
    await db.query(`UPDATE connections SET completion_date = '2026-09-05' WHERE id = $1`, [conn1.id]);
    await syncNewConnectionTargets([kawasotiBranchId]);

    // SCENARIO 9: Exceed Target (31 completed vs 30 target -> 31 completed, 0 remaining, 103.33%)
    console.log(bold('\n9. Scenario 9: Exceed Target (Achievement > 100%, Remaining = 0)'));
    // Insert 29 more completed connections in Sep 2026 (for a total of 31 completed: conn1, conn2 + 29)
    for (let i = 3; i <= 31; i++) {
      const padded = String(i).padStart(3, '0');
      await db.query(
        `INSERT INTO connections (connection_id, customer_name, customer_id, phone, address, branch_id, package_plan, request_date, completion_date, status)
         VALUES ($1, $2, $3, '9800000099', 'Kawasoti', $4, 'Home Super 200 Mbps', '2026-09-01', '2026-09-20', 'Completed')`,
        [`CONN-TEST-${padded}`, `Bulk Customer ${i}`, `TEST-CUST-${padded}`, kawasotiBranchId]
      );
    }
    await syncNewConnectionTargets([kawasotiBranchId]);

    const t9Res = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetKawaSep.id]);
    const t9 = t9Res.rows[0];
    const remaining9 = Math.max(0, Number(t9.target_value) - Number(t9.achieved_value));
    assert(Number(t9.achieved_value) === 31, 'Scenario 9: Achieved is 31 (exceeds goal of 30)');
    assert(remaining9 === 0, 'Scenario 9: Remaining is 0 (never negative)');
    assert(Number(t9.achievement_percentage) === 103.33, `Scenario 9: Achievement percentage is 103.33% (actual: ${t9.achievement_percentage}%)`);

    // SCENARIO 10: Verify Target Category & Manual Override Protection
    console.log(bold('\n10. Scenario 10: Target Category Identification and Manual Override Prevention'));
    assert(isNewConnectionCategory('New Connection') === true, 'Scenario 10: Identifies "New Connection"');
    assert(isNewConnectionCategory('NEW_CONNECTION') === true, 'Scenario 10: Identifies "NEW_CONNECTION"');
    assert(isNewConnectionCategory('new connection installations') === true, 'Scenario 10: Case-insensitive match');
    assert(isNewConnectionCategory('Revenue') === false, 'Scenario 10: Distinguishes "Revenue" as non-connection');
    assert(isNewConnectionCategory('Sales Volume') === false, 'Scenario 10: Distinguishes "Sales Volume" as non-connection');

    // SCENARIO 11: Contributing Connections Drill-Down Query
    console.log(bold('\n11. Scenario 11: Drill-down endpoint query returns exact matching completed records'));
    const drillDown = await getContributingConnectionsForTarget(targetKawaSep.id);
    assert(drillDown !== null, 'Scenario 11: Target drill-down found target');
    assert(drillDown?.isAutoCalculated === true, 'Scenario 11: Target flagged as auto-calculated');
    assert(drillDown?.total === 31, `Scenario 11: Exact match count is 31 (actual: ${drillDown?.total})`);
    assert(drillDown?.connections.length === 31, 'Scenario 11: Returned connections list length is 31');
    const allCompleted = drillDown?.connections.every((c: any) => c.status === 'Completed');
    assert(allCompleted === true, 'Scenario 11: Every contributing record is strictly in "Completed" status');

    // Contribution info on individual connection
    const contribInfo = await getTargetContributionForConnection(conn1.id);
    assert(contribInfo !== null, 'Scenario 11: Connection contribution info returned');
    assert(contribInfo?.hasTarget === true, 'Scenario 11: Connection successfully links to active target');
    assert(contribInfo?.targetId === 'TEST-TGT-KAWA-SEP', 'Scenario 11: Linked to target TEST-TGT-KAWA-SEP');
    assert(contribInfo?.achievedValue === 31, 'Scenario 11: Reflected current target achieved value 31');

    // SCENARIO 12: Branch Isolation (Branch A never alters Branch B)
    console.log(bold('\n12. Scenario 12: Strict Branch Isolation'));
    const beforeBgpRes = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetBgpSep.id]);
    const beforeBgpVal = Number(beforeBgpRes.rows[0].achieved_value);

    // Insert connection in Kawasoti
    await db.query(
      `INSERT INTO connections (connection_id, customer_name, customer_id, phone, address, branch_id, package_plan, request_date, completion_date, status)
       VALUES ('CONN-TEST-ISOLATION', 'Isolation Test User', 'TEST-CUST-ISO', '9800000088', 'Kawasoti', $1, 'Home Super 200 Mbps', '2026-09-01', '2026-09-25', 'Completed')`,
      [kawasotiBranchId]
    );
    await syncNewConnectionTargets([kawasotiBranchId]);

    const afterBgpRes = await db.query(`SELECT * FROM targets WHERE id = $1`, [targetBgpSep.id]);
    const afterBgpVal = Number(afterBgpRes.rows[0].achieved_value);
    assert(beforeBgpVal === afterBgpVal, `Scenario 12: Bharatpur target count (${afterBgpVal}) remained completely unchanged after Kawasoti activity`);

    // Clean up
    console.log(cyan('\nCleanup: Removing test fixtures...'));
    await db.query(`DELETE FROM connections WHERE customer_id LIKE 'TEST-CUST-%'`);
    await db.query(`DELETE FROM targets WHERE target_id LIKE 'TEST-TGT-%'`);
    await db.query(`DELETE FROM branches WHERE code IN ('TEST-KAWASOTI', 'TEST-BHARATPUR')`);

    console.log(green('\n✔ ALL 12 ACCEPTANCE SCENARIOS PASSED SUCCESSFULLY!\n'));
    return true;
  } catch (err) {
    console.error(red('\n✖ TEST FAILED WITH ERROR:'), err);
    throw err;
  }
};

// Execute if run directly
if (require.main === module) {
  runTargetConnectionSyncTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
