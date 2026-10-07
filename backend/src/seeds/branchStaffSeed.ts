import bcrypt from 'bcryptjs';
import { db } from '../models/database';

export interface RawStaffEntry {
  employeeId: string;
  branchName: string;
  fullName: string;
  departmentCode: string;
  designationName: string;
  assignedRole: string;
}

export const RAW_STAFF_LIST: RawStaffEntry[] = [
  { employeeId: 'EMP-301', branchName: 'Bulingtar Branch', fullName: 'Kyan Bahadur Disha magar', departmentCode: 'BRANCHES', designationName: 'Senior Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-302', branchName: 'Bulingtar Branch', fullName: 'Durga Bahadur Banshi Thakuri', departmentCode: 'BRANCHES', designationName: 'Senior Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-303', branchName: 'Bulingtar Branch', fullName: 'Prithivi lal rana magar', departmentCode: 'BRANCHES', designationName: 'Customer Support Executive', assignedRole: 'STAFF' },
  { employeeId: 'EMP-304', branchName: 'Bulingtar Branch', fullName: 'jiban susling', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-305', branchName: 'Bulingtar Branch', fullName: 'kesh Bahadur Thapa', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-306', branchName: 'Bulingtar Branch', fullName: 'Dut Bahadur birkatta', departmentCode: 'BRANCHES', designationName: 'Branch Manager', assignedRole: 'BRANCH_MANAGER' },
  { employeeId: 'EMP-307', branchName: 'Bulingtar Branch', fullName: 'aaita bir maskimagar', departmentCode: 'BRANCHES', designationName: 'Senior Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-308', branchName: 'Bulingtar Branch', fullName: 'Debid Jargha Magar', departmentCode: 'BRANCHES', designationName: 'Senior Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-309', branchName: 'Gokarna Branch', fullName: 'Seshehang Limbu', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-310', branchName: 'Gokarna Branch', fullName: 'Ranoj Bhandari', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-311', branchName: 'Gokarna Branch', fullName: 'Raju Bhandari', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-312', branchName: 'Gokarna Branch', fullName: 'kamala mijar', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-313', branchName: 'Gokarna Branch', fullName: 'nabin limbu', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-314', branchName: 'Gokarna Branch', fullName: 'Khil Bahadur basnet', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-315', branchName: 'Gokarna Branch', fullName: 'Bindu tamang', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-316', branchName: 'Machhapokhari Branch', fullName: 'Ambika Nepal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-317', branchName: 'Machhapokhari Branch', fullName: 'Abhisha Kuwar', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-318', branchName: 'Machhapokhari Branch', fullName: 'Tek bahadur thakuri / ramesh thakuri', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-319', branchName: 'Machhapokhari Branch', fullName: 'Kul bahadur Kunwar Chhetri', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-320', branchName: 'Machhapokhari Branch', fullName: 'nabin adhikari / sunita pokhrel', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-321', branchName: 'Machhapokhari Branch', fullName: 'Arjun Aryal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-322', branchName: 'Baluwatar Branch', fullName: 'Jichal Gurung', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-323', branchName: 'Lolang Branch', fullName: 'Aashis khanal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-324', branchName: 'Lolang Branch', fullName: 'Sanubabu Khatiwada', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-325', branchName: 'Lolang Branch', fullName: 'Ragunath Lamichhane', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-326', branchName: 'Dhangadhi Branch', fullName: 'Padam Singh Dhami', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-327', branchName: 'Dhangadhi Branch', fullName: 'Dil Bahadur Chaudhary', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-328', branchName: 'Dhangadhi Branch', fullName: 'Santosh Prasad Bhatta', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-329', branchName: 'Dhangadhi Branch', fullName: 'Chandra Dev Ojha', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-330', branchName: 'Dhangadhi Branch', fullName: 'Tulshi Bohora', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-331', branchName: 'Thankot Branch', fullName: 'lasta maharjan', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-332', branchName: 'Thankot Branch', fullName: 'Suresh Kumar Shrestha', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-333', branchName: 'Thankot Branch', fullName: 'rabindra kami', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-344', branchName: 'malika cable', fullName: 'Chandra Kashi Tamang', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-345', branchName: 'malika cable', fullName: 'Sandip Hamal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-346', branchName: 'malika cable', fullName: 'Bhawana Gurung', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-347', branchName: 'malika cable', fullName: 'prashant tamang', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-348', branchName: 'malika cable', fullName: 'shuk Bahadur kumal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-349', branchName: 'malika cable', fullName: 'Dipesh Kumal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-361', branchName: 'Kerabari Branch', fullName: 'ashok bhandari', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-362', branchName: 'Kerabari Branch', fullName: 'Bir bahadur katwal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-363', branchName: 'Kerabari Branch', fullName: 'govinda moktan', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-364', branchName: 'Pathari Branch (All)', fullName: 'usha khatiwada', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-365', branchName: 'Pathari Branch (All)', fullName: 'umesh khatiwoda', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-366', branchName: 'Pathari Branch (All)', fullName: 'yam basnet', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-367', branchName: 'Pathari Branch (All)', fullName: 'min kumar rai', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-368', branchName: 'Pathari Branch (All)', fullName: 'Kamala Karki', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-369', branchName: 'Pathari Branch (All)', fullName: 'Ratna Tamang', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-370', branchName: 'Pathari Branch (All)', fullName: 'Ashesh Dhimal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-371', branchName: 'Pathari Branch (All)', fullName: 'Shyam kumar Poudel', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-372', branchName: 'Pathari Branch (All)', fullName: 'Abishek poudel', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-382', branchName: 'Sworna Branch', fullName: 'tilak khatri', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-383', branchName: 'Sworna Branch', fullName: 'Nisha Kadel', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-384', branchName: 'Sworna Branch', fullName: 'saugat karki', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-385', branchName: 'Sworna Branch', fullName: 'krishna nepali', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-386', branchName: 'Sworna Branch', fullName: 'bal krishna bhandari', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-387', branchName: 'Damak Branch', fullName: 'Srijana Pathak', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-388', branchName: 'Damak Branch', fullName: 'Dron Dhungel', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-389', branchName: 'Damak Branch', fullName: 'Rabin Pokhrel', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-390', branchName: 'Damak Branch', fullName: 'Buddha Raj Limbu', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-391', branchName: 'Damak Branch', fullName: 'Netra Timilsina', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-392', branchName: 'Damak Branch', fullName: 'Suman limbu/Phiyak', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-393', branchName: 'Arjundhara Branch', fullName: 'Om Prakash Karki', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-394', branchName: 'Arjundhara Branch', fullName: 'Madhav Acharya', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-395', branchName: 'Arjundhara Branch', fullName: 'Narayan Baniya', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-396', branchName: 'Arjundhara Branch', fullName: 'Kamala Puri', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-397', branchName: 'Arjundhara Branch', fullName: 'Ashis Sherpa', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-398', branchName: 'Arjundhara Branch', fullName: 'saroj baral', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-399', branchName: 'Belbari Branch', fullName: 'Dipika Gurung', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-400', branchName: 'Belbari Branch', fullName: 'Rudra Prasad Bajgai', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-401', branchName: 'Belbari Branch', fullName: 'Binam Kumar Chaudhary', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-402', branchName: 'Belbari Branch', fullName: 'bijaya limbu', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-403', branchName: 'Dudhe Branch', fullName: 'Sabina pathak', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-404', branchName: 'Dudhe Branch', fullName: 'Ganesh Lal Shah', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-405', branchName: 'Dudhe Branch', fullName: 'Madan Adhikari', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-406', branchName: 'Dudhe Branch', fullName: 'prakash adhikari', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-407', branchName: 'Bolochowk Branch', fullName: 'Binod tajpuriya', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-408', branchName: 'Bolochowk Branch', fullName: 'Sujan Oli', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-409', branchName: 'Bolochowk Branch', fullName: 'Binita Dulal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-410', branchName: 'Bolochowk Branch', fullName: 'Prabin Baral', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-411', branchName: 'Goldhap Branch', fullName: 'Saroj Regmi', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-412', branchName: 'Goldhap Branch', fullName: 'Sumitra Chauhan', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-413', branchName: 'Goldhap Branch', fullName: 'Rudra Prasad Bhattarai', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-414', branchName: 'Goldhap Branch', fullName: 'Bikash regmi', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-415', branchName: 'Kerkha Branch', fullName: 'Sajana Pathak', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-416', branchName: 'Kerkha Branch', fullName: 'Prabin Pathak', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-417', branchName: 'Kerkha Branch', fullName: 'Hemanta Kumar Tajpuriya', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-418', branchName: 'Budhabare Branch', fullName: 'Pabitra Neupane', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-419', branchName: 'Budhabare Branch', fullName: 'Sabin Khatiwada', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-420', branchName: 'Budhabare Branch', fullName: 'Kesbav Khatiwada', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-421', branchName: 'Budhabare Branch', fullName: 'Anil Rijal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-422', branchName: 'Katari Branch', fullName: 'Binita Dhahal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-423', branchName: 'Katari Branch', fullName: 'biswash bhujel', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-424', branchName: 'Katari Branch', fullName: 'Kiran Rimal', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
  { employeeId: 'EMP-425', branchName: 'Katari Branch', fullName: 'Kishan Sahani', departmentCode: 'BRANCHES', designationName: 'Field Technician', assignedRole: 'STAFF' },
];

/**
 * Generate a clean, lowercase, alphanumeric username
 */
function generateUsername(fullName: string, employeeId: string): string {
  const num = employeeId.replace(/\D/g, '');
  const firstName = fullName
    .trim()
    .split(/[\s/]+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return `${firstName || 'staff'}.${num}`;
}

export const seedBranchStaffData = async (): Promise<void> => {
  try {
    console.log('👥 Checking & seeding branch staff records from uploaded list...');

    // 1. Ensure 'malika cable' branch exists if not present
    const malikaCheck = await db.query(`SELECT id FROM branches WHERE UPPER(name) LIKE '%MALIKA%'`);
    if (malikaCheck.rowCount === 0) {
      await db.query(
        `INSERT INTO branches (code, name, address, city, province, contact_number, email, opening_date, status)
         VALUES ('BR-MALIKA', 'Malika Cable', 'Malika', 'Malika', 'Lumbini Province', '9800000000', 'malika@fiberworld.net.np', CURRENT_DATE, 'Active')
         ON CONFLICT (code) DO NOTHING`
      );
      console.log('  ✔ Created missing branch: Malika Cable');
    }

    // 2. Fetch cache of branches
    const branchesRes = await db.query(`SELECT id, name, code FROM branches`);
    const branchMap = new Map<string, number>();
    for (const b of branchesRes.rows) {
      branchMap.set(b.name.trim().toLowerCase(), b.id);
      branchMap.set(b.code.trim().toLowerCase(), b.id);
    }

    // 3. Fetch or ensure Departments
    const deptRes = await db.query(`SELECT id, code FROM departments`);
    const deptMap = new Map<string, number>();
    for (const d of deptRes.rows) {
      deptMap.set(d.code.toUpperCase(), d.id);
    }
    const branchDeptId = deptMap.get('BRANCHES') || deptMap.get('OPERATION') || null;

    // 4. Fetch or ensure Designations
    const desigRes = await db.query(`SELECT id, name, code FROM designations`);
    const desigMap = new Map<string, number>();
    for (const d of desigRes.rows) {
      desigMap.set(d.name.trim().toLowerCase(), d.id);
    }

    // Ensure our 4 required designations exist
    const requiredDesignations = [
      { name: 'Senior Field Technician', code: 'SR_TECH' },
      { name: 'Field Technician', code: 'TECH' },
      { name: 'Customer Support Executive', code: 'SUPPORT_EXEC' },
      { name: 'Branch Manager', code: 'BM' },
    ];
    for (const rd of requiredDesignations) {
      if (!desigMap.has(rd.name.toLowerCase())) {
        const insD = await db.query(
          `INSERT INTO designations (name, code, department_id, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
           RETURNING id`,
          [rd.name, rd.code, branchDeptId, rd.name]
        );
        desigMap.set(rd.name.toLowerCase(), insD.rows[0].id);
      }
    }

    // 5. Fetch Role IDs
    const rolesRes = await db.query(`SELECT id, name FROM roles`);
    const roleIdMap = new Map<string, number>();
    for (const r of rolesRes.rows) {
      roleIdMap.set(r.name.trim().toLowerCase(), r.id);
    }
    const staffRoleId = roleIdMap.get('staff') || roleIdMap.get('branch staff') || null;
    const bmRoleId = roleIdMap.get('branch manager') || staffRoleId;

    // 6. Precompute password hash for 'Nepal@123'
    const passwordHash = await bcrypt.hash('Nepal@123', 10);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const staff of RAW_STAFF_LIST) {
      // Find branch ID
      const bKey = staff.branchName.trim().toLowerCase();
      let bId = branchMap.get(bKey);
      if (!bId) {
        // Try substring search (e.g. 'malika' or 'pathari')
        for (const [nameKey, id] of branchMap.entries()) {
          if (nameKey.includes('malika') && bKey.includes('malika')) {
            bId = id;
            break;
          }
          if (nameKey.includes('pathari') && bKey.includes('pathari')) {
            bId = id;
            break;
          }
          if (nameKey.startsWith(bKey.replace(' branch', '')) || bKey.startsWith(nameKey.replace(' branch', ''))) {
            bId = id;
            break;
          }
        }
      }

      const desigId = desigMap.get(staff.designationName.trim().toLowerCase()) || null;
      const roleStr = staff.assignedRole === 'BRANCH_MANAGER' ? 'BRANCH_MANAGER' : 'STAFF';
      const roleId = roleStr === 'BRANCH_MANAGER' ? bmRoleId : staffRoleId;
      const username = generateUsername(staff.fullName, staff.employeeId);
      const email = `${username}@fiberworld.net.np`;

      // Check if user already exists by employee_id or username
      const existingUser = await db.query(
        `SELECT id, branch_id FROM users WHERE employee_id = $1 OR username = $2`,
        [staff.employeeId, username]
      );

      if (existingUser.rowCount === 0) {
        const insUser = await db.query(
          `INSERT INTO users (
             employee_id, username, email, password_hash, full_name,
             branch_id, designation_id, department_id, role, role_id, status,
             permissions, allowed_branches, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9, $10, 'Active',
             '{}'::jsonb, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
           ) RETURNING id`,
          [
            staff.employeeId,
            username,
            email,
            passwordHash,
            staff.fullName.trim(),
            bId || null,
            desigId,
            branchDeptId,
            roleStr,
            roleId,
            bId ? String(bId) : null,
          ]
        );

        const newUserId = insUser.rows[0].id;
        if (bId) {
          await db.query(
            `INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newUserId, bId]
          );
          if (roleStr === 'BRANCH_MANAGER') {
            await db.query(`UPDATE branches SET manager_id = $1 WHERE id = $2 AND manager_id IS NULL`, [newUserId, bId]);
          }
        }
        insertedCount++;
      } else {
        const uId = existingUser.rows[0].id;
        await db.query(
          `UPDATE users SET
             full_name = $1,
             branch_id = COALESCE($2, branch_id),
             designation_id = COALESCE($3, designation_id),
             role = $4,
             role_id = COALESCE($5, role_id),
             status = 'Active',
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [staff.fullName.trim(), bId || null, desigId, roleStr, roleId, uId]
        );
        if (bId) {
          await db.query(
            `INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [uId, bId]
          );
          if (roleStr === 'BRANCH_MANAGER') {
            await db.query(`UPDATE branches SET manager_id = $1 WHERE id = $2 AND manager_id IS NULL`, [uId, bId]);
          }
        }
        updatedCount++;
      }
    }

    console.log(`✅ Branch staff upload complete: ${insertedCount} inserted, ${updatedCount} updated.`);
  } catch (err: any) {
    console.error('❌ Error seeding branch staff data:', err.message);
  }
};
