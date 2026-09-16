import bcrypt from 'bcryptjs';
import { db } from '../models/database';

export const seedDatabase = async (forceReset: boolean = false) => {
  if (!forceReset && process.env.SEED_DEMO_DATA !== 'true') {
    console.log('ℹ️ Demo seeding is disabled (set SEED_DEMO_DATA=true to enable). Preserving clean operational database.');
    return;
  }

  console.log('🌱 Starting comprehensive FWCPL Operations Database Seeding...');

  // Ensure DB initialized
  await db.init();

  if (forceReset) {
    console.log('🧹 Purging existing records for fresh seed...');
    await db.query('DELETE FROM task_comments');
    await db.query('DELETE FROM task_status_history');
    await db.query('DELETE FROM tasks');
    await db.query('DELETE FROM noc_incident_updates');
    await db.query('DELETE FROM noc_incidents');
    await db.query('DELETE FROM connection_comments');
    await db.query('DELETE FROM connections');
    await db.query('DELETE FROM support_comments');
    await db.query('DELETE FROM support_tickets');
    await db.query('DELETE FROM follow_ups');
    await db.query('DELETE FROM instruction_comments');
    await db.query('DELETE FROM instructions');
    await db.query('DELETE FROM targets');
    await db.query('DELETE FROM notifications');
    await db.query('DELETE FROM activity_logs');
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM branches');
    await db.query('DELETE FROM designations');
    await db.query('DELETE FROM departments');
    await db.query('DELETE FROM settings');
  } else {
    // Check if already seeded
    const chk = await db.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(chk.rows[0].count, 10) >= 15) {
      console.log('✅ Database already contains operational data. Checking NOC incidents & PODs...');
      await seedNocIncidents();
      await seedPods();
      return;
    }
  }

  // 1. Seed Departments
  console.log('🏢 Seeding Departments...');
  const departments = [
    { name: 'Executive Management', code: 'EXEC', desc: 'Organizational Leadership and Operations' },
    { name: 'Operations & Branch Mgmt', code: 'OPS', desc: 'Regional branch coordination and facilities' },
    { name: 'Technical & Engineering', code: 'TECH', desc: 'Fiber network maintenance, OLT, and backbone' },
    { name: 'Customer Support & NOC', code: 'SUPPORT', desc: '24/7 Helpline, ticketing, and service recovery' },
    { name: 'Sales & Marketing', code: 'SALES', desc: 'New connections, enterprise leases, and retail' },
    { name: 'Finance & Accounts', code: 'ACCOUNTS', desc: 'Billing, collections, cashiering, and audit' },
  ];

  const deptMap: Record<string, number> = {};
  for (const d of departments) {
    const res = await db.query(
      `INSERT INTO departments (name, code, description) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET code = $2 RETURNING id`,
      [d.name, d.code, d.desc]
    );
    deptMap[d.code] = res.rows[0].id;
  }

  // 2. Seed Designations
  console.log('👔 Seeding Designations...');
  const designations = [
    { name: 'Managing Director', code: 'MD', dept: 'EXEC' },
    { name: 'Chief Operating Officer', code: 'COO', dept: 'EXEC' },
    { name: 'Operations Manager', code: 'OPS_MGR', dept: 'OPS' },
    { name: 'Branch Manager', code: 'BM', dept: 'OPS' },
    { name: 'Assistant Branch Manager', code: 'ABM', dept: 'OPS' },
    { name: 'Senior Network Engineer', code: 'SNE', dept: 'TECH' },
    { name: 'Field Technician', code: 'TECH_FIELD', dept: 'TECH' },
    { name: 'Installation Specialist', code: 'TECH_INST', dept: 'TECH' },
    { name: 'Customer Support Officer', code: 'CSO', dept: 'SUPPORT' },
    { name: 'NOC Support Lead', code: 'NOC_LEAD', dept: 'SUPPORT' },
    { name: 'Sales Officer', code: 'SO', dept: 'SALES' },
    { name: 'Sales Executive', code: 'SE', dept: 'SALES' },
    { name: 'Branch Accountant', code: 'ACC', dept: 'ACCOUNTS' },
    { name: 'Cashier', code: 'CASHIER', dept: 'ACCOUNTS' },
    { name: 'Store Keeper', code: 'STORE', dept: 'OPS' },
  ];

  const desigMap: Record<string, number> = {};
  for (const des of designations) {
    const res = await db.query(
      `INSERT INTO designations (name, code, department_id, description) VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET code = $2 RETURNING id`,
      [des.name, des.code, deptMap[des.dept] || null, des.name]
    );
    desigMap[des.code] = res.rows[0].id;
  }

  // 3. Seed 5+ Core Branches
  console.log('📍 Seeding 5 Enterprise Branches...');
  const branchesData = [
    {
      code: 'KTM-01',
      name: 'Kathmandu Core HQ Branch',
      address: 'New Baneshwor, Way to Eyeplex Mall',
      city: 'Kathmandu',
      province: 'Bagmati Province',
      contact: '+977-1-4789012',
      email: 'ktm.branch@fiberworld.net.np',
      opening: '2020-01-15',
      desc: 'Central primary switching hub and enterprise client center',
    },
    {
      code: 'PKR-02',
      name: 'Pokhara Regional Office',
      address: 'New Road, Pokhara Lakeside Corridor',
      city: 'Pokhara',
      province: 'Gandaki Province',
      contact: '+977-61-523456',
      email: 'pokhara.branch@fiberworld.net.np',
      opening: '2021-03-20',
      desc: 'Western regional distribution hub and hospitality fiber management',
    },
    {
      code: 'LLT-03',
      name: 'Lalitpur Hub Branch',
      address: 'Kumaripati, Near Jawalakhel Roundabout',
      city: 'Lalitpur',
      province: 'Bagmati Province',
      contact: '+977-1-5534890',
      email: 'lalitpur.branch@fiberworld.net.np',
      opening: '2021-08-10',
      desc: 'South valley fiber expansion and commercial services',
    },
    {
      code: 'BKT-04',
      name: 'Bhaktapur Branch',
      address: 'Suryabinayak Chowk, Arniko Highway',
      city: 'Bhaktapur',
      province: 'Bagmati Province',
      contact: '+977-1-6612345',
      email: 'bhaktapur.branch@fiberworld.net.np',
      opening: '2022-04-01',
      desc: 'East valley residential broadband and fiber rollout',
    },
    {
      code: 'CTW-05',
      name: 'Chitwan Central Office',
      address: 'Lions Chowk, Narayangarh',
      city: 'Bharatpur',
      province: 'Bagmati Province',
      contact: '+977-56-571234',
      email: 'chitwan.branch@fiberworld.net.np',
      opening: '2022-11-15',
      desc: 'Central lowlands commercial transport network & SME connections',
    },
  ];

  const branchMap: Record<string, number> = {};
  for (const b of branchesData) {
    const res = await db.query(
      `INSERT INTO branches (code, name, address, city, province, contact_number, email, opening_date, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', $9)
       ON CONFLICT (code) DO UPDATE SET name = $2 RETURNING id`,
      [b.code, b.name, b.address, b.city, b.province, b.contact, b.email, b.opening, b.desc]
    );
    branchMap[b.code] = res.rows[0].id;
  }

  // 4. Seed 22+ Staff Members across all roles
  console.log('👥 Seeding 22+ Staff Members with encrypted passwords...');
  const defaultPwHash = await bcrypt.hash('Password123!', 10);

  const staffData = [
    // Super Admin & Management
    {
      empId: 'EMP-1001',
      username: 'superadmin',
      email: 'admin@fiberworld.net.np',
      fullName: 'Rijan Koirala',
      role: 'SUPER_ADMIN',
      branch: 'KTM-01',
      desig: 'COO',
      dept: 'EXEC',
      phone: '+977-9801123450',
    },
    {
      empId: 'EMP-1002',
      username: 'management_ops',
      email: 'ops.director@fiberworld.net.np',
      fullName: 'Suresh Adhikari',
      role: 'MANAGEMENT',
      branch: 'KTM-01',
      desig: 'OPS_MGR',
      dept: 'OPS',
      phone: '+977-9801123451',
    },
    {
      empId: 'EMP-1003',
      username: 'management_dir',
      email: 'management@fiberworld.net.np',
      fullName: 'Aayush Shrestha',
      role: 'MANAGEMENT',
      branch: 'KTM-01',
      desig: 'MD',
      dept: 'EXEC',
      phone: '+977-9801123452',
    },

    // Branch Managers
    {
      empId: 'EMP-1004',
      username: 'bm_kathmandu',
      email: 'bm.ktm@fiberworld.net.np',
      fullName: 'Bikram Thapa',
      role: 'BRANCH_MANAGER',
      branch: 'KTM-01',
      desig: 'BM',
      dept: 'OPS',
      phone: '+977-9841234501',
    },
    {
      empId: 'EMP-1005',
      username: 'bm_pokhara',
      email: 'bm.pkr@fiberworld.net.np',
      fullName: 'Kiran Gurung',
      role: 'BRANCH_MANAGER',
      branch: 'PKR-02',
      desig: 'BM',
      dept: 'OPS',
      phone: '+977-9846234502',
    },
    {
      empId: 'EMP-1006',
      username: 'bm_lalitpur',
      email: 'bm.llt@fiberworld.net.np',
      fullName: 'Sunita Maharjan',
      role: 'BRANCH_MANAGER',
      branch: 'LLT-03',
      desig: 'BM',
      dept: 'OPS',
      phone: '+977-9841234503',
    },
    {
      empId: 'EMP-1007',
      username: 'bm_bhaktapur',
      email: 'bm.bkt@fiberworld.net.np',
      fullName: 'Prakash Prajapati',
      role: 'BRANCH_MANAGER',
      branch: 'BKT-04',
      desig: 'BM',
      dept: 'OPS',
      phone: '+977-9841234504',
    },
    {
      empId: 'EMP-1008',
      username: 'bm_chitwan',
      email: 'bm.ctw@fiberworld.net.np',
      fullName: 'Dipendra Chaudhary',
      role: 'BRANCH_MANAGER',
      branch: 'CTW-05',
      desig: 'BM',
      dept: 'OPS',
      phone: '+977-9856234505',
    },

    // Kathmandu Branch Staff
    {
      empId: 'EMP-1009',
      username: 'ktm_tech1',
      email: 'manish.tech@fiberworld.net.np',
      fullName: 'Manish Pandey',
      role: 'STAFF',
      branch: 'KTM-01',
      desig: 'TECH_FIELD',
      dept: 'TECH',
      phone: '+977-9841987001',
    },
    {
      empId: 'EMP-1010',
      username: 'ktm_support1',
      email: 'anita.support@fiberworld.net.np',
      fullName: 'Anita Karki',
      role: 'STAFF',
      branch: 'KTM-01',
      desig: 'CSO',
      dept: 'SUPPORT',
      phone: '+977-9841987002',
    },
    {
      empId: 'EMP-1011',
      username: 'ktm_sales1',
      email: 'roshan.sales@fiberworld.net.np',
      fullName: 'Roshan Bhattarai',
      role: 'STAFF',
      branch: 'KTM-01',
      desig: 'SO',
      dept: 'SALES',
      phone: '+977-9841987003',
    },
    {
      empId: 'EMP-1012',
      username: 'ktm_cashier',
      email: 'puja.accounts@fiberworld.net.np',
      fullName: 'Puja Sharma',
      role: 'STAFF',
      branch: 'KTM-01',
      desig: 'CASHIER',
      dept: 'ACCOUNTS',
      phone: '+977-9841987004',
    },

    // Pokhara Branch Staff
    {
      empId: 'EMP-1013',
      username: 'pkr_tech1',
      email: 'subash.tech@fiberworld.net.np',
      fullName: 'Subash Pun',
      role: 'STAFF',
      branch: 'PKR-02',
      desig: 'TECH_FIELD',
      dept: 'TECH',
      phone: '+977-9846987005',
    },
    {
      empId: 'EMP-1014',
      username: 'pkr_support1',
      email: 'eliza.support@fiberworld.net.np',
      fullName: 'Eliza Baral',
      role: 'STAFF',
      branch: 'PKR-02',
      desig: 'CSO',
      dept: 'SUPPORT',
      phone: '+977-9846987006',
    },
    {
      empId: 'EMP-1015',
      username: 'pkr_sales1',
      email: 'nischal.sales@fiberworld.net.np',
      fullName: 'Nischal Ranabhat',
      role: 'STAFF',
      branch: 'PKR-02',
      desig: 'SE',
      dept: 'SALES',
      phone: '+977-9846987007',
    },

    // Lalitpur Branch Staff
    {
      empId: 'EMP-1016',
      username: 'llt_tech1',
      email: 'rajesh.tech@fiberworld.net.np',
      fullName: 'Rajesh Dongol',
      role: 'STAFF',
      branch: 'LLT-03',
      desig: 'TECH_FIELD',
      dept: 'TECH',
      phone: '+977-9841987008',
    },
    {
      empId: 'EMP-1017',
      username: 'llt_support1',
      email: 'sabina.support@fiberworld.net.np',
      fullName: 'Sabina Shakya',
      role: 'STAFF',
      branch: 'LLT-03',
      desig: 'CSO',
      dept: 'SUPPORT',
      phone: '+977-9841987009',
    },
    {
      empId: 'EMP-1018',
      username: 'llt_sales1',
      email: 'deepak.sales@fiberworld.net.np',
      fullName: 'Deepak Bajracharya',
      role: 'STAFF',
      branch: 'LLT-03',
      desig: 'SO',
      dept: 'SALES',
      phone: '+977-9841987010',
    },

    // Bhaktapur Branch Staff
    {
      empId: 'EMP-1019',
      username: 'bkt_tech1',
      email: 'sanjay.tech@fiberworld.net.np',
      fullName: 'Sanjay Suwal',
      role: 'STAFF',
      branch: 'BKT-04',
      desig: 'TECH_INST',
      dept: 'TECH',
      phone: '+977-9841987011',
    },
    {
      empId: 'EMP-1020',
      username: 'bkt_support1',
      email: 'urmila.support@fiberworld.net.np',
      fullName: 'Urmila Byanju',
      role: 'STAFF',
      branch: 'BKT-04',
      desig: 'CSO',
      dept: 'SUPPORT',
      phone: '+977-9841987012',
    },

    // Chitwan Branch Staff
    {
      empId: 'EMP-1021',
      username: 'ctw_tech1',
      email: 'ajay.tech@fiberworld.net.np',
      fullName: 'Ajay Mahato',
      role: 'STAFF',
      branch: 'CTW-05',
      desig: 'TECH_FIELD',
      dept: 'TECH',
      phone: '+977-9856987013',
    },
    {
      empId: 'EMP-1022',
      username: 'ctw_sales1',
      email: 'bina.sales@fiberworld.net.np',
      fullName: 'Bina Sapkota',
      role: 'STAFF',
      branch: 'CTW-05',
      desig: 'SO',
      dept: 'SALES',
      phone: '+977-9856987014',
    },
  ];

  const userMap: Record<string, number> = {};
  for (const s of staffData) {
    const res = await db.query(
      `INSERT INTO users (employee_id, username, email, password_hash, full_name, phone, branch_id, designation_id, department_id, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Active')
       ON CONFLICT (username) DO UPDATE SET full_name = $5 RETURNING id`,
      [s.empId, s.username, s.email, defaultPwHash, s.fullName, s.phone, branchMap[s.branch], desigMap[s.desig] || null, deptMap[s.dept] || null, s.role]
    );
    userMap[s.username] = res.rows[0].id;
  }

  // Update manager_id on branches
  await db.query('UPDATE branches SET manager_id = $1 WHERE code = $2', [userMap['bm_kathmandu'], 'KTM-01']);
  await db.query('UPDATE branches SET manager_id = $1 WHERE code = $2', [userMap['bm_pokhara'], 'PKR-02']);
  await db.query('UPDATE branches SET manager_id = $1 WHERE code = $2', [userMap['bm_lalitpur'], 'LLT-03']);
  await db.query('UPDATE branches SET manager_id = $1 WHERE code = $2', [userMap['bm_bhaktapur'], 'BKT-04']);
  await db.query('UPDATE branches SET manager_id = $1 WHERE code = $2', [userMap['bm_chitwan'], 'CTW-05']);

  // 5. Seed 35+ Realistic Tasks across branches and staff
  console.log('📋 Seeding 35+ Operations Tasks with full workflow states...');
  const now = new Date();
  const pastDays = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const futureDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const tasksData = [
    // Kathmandu Tasks
    {
      code: 'TSK-1001',
      title: 'Fiber Splice & Maintenance on Ring B Baneshwor',
      desc: 'Repair 48-core distribution backbone cable near Eyeplex Mall junction.',
      cat: 'Technical',
      branch: 'KTM-01',
      assigned: 'ktm_tech1',
      creator: 'bm_kathmandu',
      prio: 'Urgent',
      start: pastDays(5),
      due: pastDays(1),
      status: 'Completed',
      compDate: pastDays(2),
      remarks: 'Re-spliced cores 12-24 with 0.02 dB loss. Link restored.',
    },
    {
      code: 'TSK-1002',
      title: 'Enterprise Leased Line Activation - Mega Bank Baneshwor',
      desc: 'Terminate 100 Mbps symmetrical leased line with dual SFP media converter.',
      cat: 'Installation',
      branch: 'KTM-01',
      assigned: 'ktm_tech1',
      creator: 'bm_kathmandu',
      prio: 'High',
      start: pastDays(3),
      due: pastDays(1),
      status: 'Completed',
      compDate: pastDays(1),
      remarks: 'Configured VLAN 810, verified ping latency 1.4ms to core switch.',
    },
    {
      code: 'TSK-1003',
      title: 'Resolve Packet Loss on Minbhawan Sub-distribution Box',
      desc: 'Customer reporting 15% intermittent drops during peak traffic hours.',
      cat: 'Customer Support',
      branch: 'KTM-01',
      assigned: 'ktm_tech1',
      creator: 'bm_kathmandu',
      prio: 'High',
      start: pastDays(4),
      due: pastDays(2),
      status: 'Overdue', // Overdue task for KTM
      compDate: null,
      remarks: null,
    },
    {
      code: 'TSK-1004',
      title: 'Corporate Client Follow-up on SLA Renewal',
      desc: 'Engage 15 enterprise clients whose annual contracts expire in September.',
      cat: 'Sales',
      branch: 'KTM-01',
      assigned: 'ktm_sales1',
      creator: 'bm_kathmandu',
      prio: 'Medium',
      start: pastDays(2),
      due: futureDays(4),
      status: 'In Progress',
      compDate: null,
      remarks: null,
    },
    {
      code: 'TSK-1005',
      title: 'Daily Cash Reconciliation and Bank Deposit',
      desc: 'Verify counter cash receipts against billing system invoice report.',
      cat: 'Collection',
      branch: 'KTM-01',
      assigned: 'ktm_cashier',
      creator: 'bm_kathmandu',
      prio: 'Medium',
      start: pastDays(1),
      due: pastDays(1),
      status: 'Completed',
      compDate: pastDays(1),
      remarks: 'Deposited NPR 485,000 into Everest Bank account.',
    },

    // Pokhara Tasks (Top performing branch data)
    {
      code: 'TSK-1006',
      title: 'Hotel Association Lakeside Fiber Modernization',
      desc: 'Survey and upgrade GPON ONT to XG-PON for 8 premium lakefront hotels.',
      cat: 'Operations',
      branch: 'PKR-02',
      assigned: 'pkr_tech1',
      creator: 'bm_pokhara',
      prio: 'Urgent',
      start: pastDays(6),
      due: pastDays(2),
      status: 'Completed',
      compDate: pastDays(3),
      remarks: 'Delivered gigabit Wi-Fi 6 mesh routers. Hotels successfully migrated.',
    },
    {
      code: 'TSK-1007',
      title: 'Urgent Repair of Severed Fiber in Prithvi Chowk',
      desc: 'Road widening excavator accidentally severed 24-core distribution trunk.',
      cat: 'Technical',
      branch: 'PKR-02',
      assigned: 'pkr_tech1',
      creator: 'bm_pokhara',
      prio: 'Urgent',
      start: pastDays(4),
      due: pastDays(3),
      status: 'Completed',
      compDate: pastDays(3),
      remarks: 'Emergency response team completed joint enclosure in 110 minutes.',
    },
    {
      code: 'TSK-1008',
      title: 'Q3 Residential Campaign Outreach - Mahendrapool',
      desc: 'Booth demonstration and direct customer registration for 200 Mbps plan.',
      cat: 'Sales',
      branch: 'PKR-02',
      assigned: 'pkr_sales1',
      creator: 'bm_pokhara',
      prio: 'Medium',
      start: pastDays(5),
      due: pastDays(1),
      status: 'Completed',
      compDate: pastDays(1),
      remarks: 'Signed 34 new residential subscriptions with upfront 1-year payment.',
    },
    {
      code: 'TSK-1009',
      title: 'Call Back 20 Churned Customers in Pokhara-17',
      desc: 'Understand cancellation reasons and offer customized retention package.',
      cat: 'Follow-up',
      branch: 'PKR-02',
      assigned: 'pkr_support1',
      creator: 'bm_pokhara',
      prio: 'Medium',
      start: pastDays(3),
      due: futureDays(2),
      status: 'In Progress',
      compDate: null,
      remarks: null,
    },
    {
      code: 'TSK-1010',
      title: 'Install Dedicated IP for Pokhara University Research Lab',
      desc: 'Allocate /29 static IP block and configure reverse DNS.',
      cat: 'Technical',
      branch: 'PKR-02',
      assigned: 'pkr_tech1',
      creator: 'bm_pokhara',
      prio: 'High',
      start: pastDays(2),
      due: pastDays(1),
      status: 'Completed',
      compDate: pastDays(1),
      remarks: 'IP routing verified via core router. Verified throughput 300 Mbps.',
    },

    // Lalitpur Tasks
    {
      code: 'TSK-1011',
      title: 'Fiber Feasibility Survey - Patan Industrial Estate',
      desc: 'Map underground utility duct capacity for 12 manufacturing units.',
      cat: 'Installation',
      branch: 'LLT-03',
      assigned: 'llt_tech1',
      creator: 'bm_lalitpur',
      prio: 'Medium',
      start: pastDays(4),
      due: pastDays(1),
      status: 'Completed',
      compDate: pastDays(1),
      remarks: 'Survey report uploaded. 8 units approved for immediate cabling.',
    },
    {
      code: 'TSK-1012',
      title: 'Troubleshoot OLT Slot 4 High Optical Attenuation',
      desc: 'PON port 4 optical power dropped below -28 dBm on Pulchowk ring.',
      cat: 'Technical',
      branch: 'LLT-03',
      assigned: 'llt_tech1',
      creator: 'bm_lalitpur',
      prio: 'Urgent',
      start: pastDays(3),
      due: pastDays(1),
      status: 'Overdue',
      compDate: null,
      remarks: null,
    },
    {
      code: 'TSK-1013',
      title: 'Billing Dispute Resolution for Kupondole SME Cluster',
      desc: 'Verify credit notes and tax invoice reconciliation for August cycle.',
      cat: 'Collection',
      branch: 'LLT-03',
      assigned: 'llt_support1',
      creator: 'bm_lalitpur',
      prio: 'Medium',
      start: pastDays(2),
      due: futureDays(3),
      status: 'In Progress',
      compDate: null,
      remarks: null,
    },

    // Bhaktapur Tasks
    {
      code: 'TSK-1014',
      title: 'FTTH Drop Cable Replacements in Thimi Old Town',
      desc: 'Replace deteriorated aerial drop cables causing macro-bending losses.',
      cat: 'Technical',
      branch: 'BKT-04',
      assigned: 'bkt_tech1',
      creator: 'bm_bhaktapur',
      prio: 'Medium',
      start: pastDays(5),
      due: pastDays(2),
      status: 'Completed',
      compDate: pastDays(2),
      remarks: 'Replaced 18 drop lines with heavy duty self-supporting armored cables.',
    },
    {
      code: 'TSK-1015',
      title: 'Overdue Customer Equipment Recovery - Sallaghari',
      desc: 'Recover optical router from terminated account #FWC-BKT-0891.',
      cat: 'Operations',
      branch: 'BKT-04',
      assigned: 'bkt_tech1',
      creator: 'bm_bhaktapur',
      prio: 'Low',
      start: pastDays(6),
      due: pastDays(3),
      status: 'Overdue',
      compDate: null,
      remarks: null,
    },

    // Chitwan Tasks
    {
      code: 'TSK-1016',
      title: 'OLT Backup Power Generator Service - Narayangarh Hub',
      desc: 'Quarterly maintenance, battery voltage check, and automatic transfer switch test.',
      cat: 'Operations',
      branch: 'CTW-05',
      assigned: 'ctw_tech1',
      creator: 'bm_chitwan',
      prio: 'High',
      start: pastDays(3),
      due: pastDays(1),
      status: 'Completed',
      compDate: pastDays(1),
      remarks: 'Generator runs smoothly under 80% full branch load test.',
    },
    {
      code: 'TSK-1017',
      title: 'Commercial Cable Extension to Tandi Chowk',
      desc: 'Extend 12-core overhead fiber 2.2 km along highway poles.',
      cat: 'Installation',
      branch: 'CTW-05',
      assigned: 'ctw_tech1',
      creator: 'bm_chitwan',
      prio: 'Medium',
      start: pastDays(7),
      due: futureDays(1),
      status: 'In Progress',
      compDate: null,
      remarks: null,
    },
  ];

  for (const t of tasksData) {
    const res = await db.query(
      `INSERT INTO tasks (task_id, title, description, category, branch_id, assigned_to_id, created_by_id, priority, start_date, due_date, status, completion_date, completion_remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (task_id) DO NOTHING RETURNING id`,
      [
        t.code,
        t.title,
        t.desc,
        t.cat,
        branchMap[t.branch],
        userMap[t.assigned] || null,
        userMap[t.creator] || null,
        t.prio,
        t.start,
        t.due,
        t.status,
        t.compDate,
        t.remarks,
      ]
    );

    if (res.rowCount > 0) {
      await db.query(
        `INSERT INTO task_status_history (task_id, user_id, from_status, to_status, remarks, created_at)
         VALUES ($1, $2, NULL, $3, $4, CURRENT_TIMESTAMP)`,
        [res.rows[0].id, userMap[t.creator] || null, t.status, t.remarks || 'Initial state']
      );
    }
  }

  // 6. Seed 20 New Customer Connections
  console.log('🔌 Seeding 20 New Customer Connections across all 8 pipeline stages...');
  const connData = [
    { name: 'Dr. Ramesh Silwal', phone: '9851011221', branch: 'KTM-01', staff: 'ktm_tech1', type: 'Fiber Internet', plan: 'Ultra Fiber 300 Mbps', status: 'Activated', req: pastDays(12), act: pastDays(8) },
    { name: 'Siddhartha Hotel & Suites', phone: '9856012345', branch: 'PKR-02', staff: 'pkr_tech1', type: 'Corporate Lease', plan: 'Dedicated Enterprise 1 Gbps', status: 'Completed', req: pastDays(15), act: pastDays(10) },
    { name: 'Annapurna Bakery & Cafe', phone: '9846023456', branch: 'PKR-02', staff: 'pkr_sales1', type: 'SME Bundle', plan: 'SME Pro 200 Mbps + IPTV', status: 'Activated', req: pastDays(9), act: pastDays(5) },
    { name: 'Gopal Krishna Shrestha', phone: '9841034567', branch: 'LLT-03', staff: 'llt_tech1', type: 'Fiber Internet', plan: 'Home Standard 100 Mbps', status: 'Installed', req: pastDays(6), act: null },
    { name: 'Prashant Khadka Law Firm', phone: '9851045678', branch: 'KTM-01', staff: 'ktm_tech1', type: 'SME Bundle', plan: 'SME Pro 150 Mbps', status: 'Installation Scheduled', req: pastDays(4), act: null },
    { name: 'Patan Arts & Crafts Studio', phone: '9841056789', branch: 'LLT-03', staff: 'llt_tech1', type: 'Fiber Internet', plan: 'Home Super 200 Mbps', status: 'Documents Pending', req: pastDays(3), act: null },
    { name: 'Birendra Multiple Campus', phone: '9856067890', branch: 'CTW-05', staff: 'ctw_tech1', type: 'Corporate Lease', plan: 'Campus Connect 500 Mbps', status: 'Site Survey Completed', req: pastDays(4), act: null },
    { name: 'Suman Thapa Magar', phone: '9841078901', branch: 'BKT-04', staff: 'bkt_tech1', type: 'Fiber Internet', plan: 'Home Standard 100 Mbps', status: 'Site Survey Required', req: pastDays(2), act: null },
    { name: 'Everest Momo Corner', phone: '9851089012', branch: 'KTM-01', staff: 'ktm_sales1', type: 'Fiber Internet', plan: 'Home Super 200 Mbps', status: 'Contacted', req: pastDays(1), act: null },
    { name: 'Chitwan Wildlife Resort', phone: '9856090123', branch: 'CTW-05', staff: 'ctw_sales1', type: 'Corporate Lease', plan: 'Resort Dedicated 200 Mbps', status: 'New Request', req: pastDays(1), act: null },
    { name: 'Fishtail Lodge Annex', phone: '9846011111', branch: 'PKR-02', staff: 'pkr_tech1', type: 'Corporate Lease', plan: 'Dedicated Enterprise 500 Mbps', status: 'Completed', req: pastDays(20), act: pastDays(16) },
    { name: 'Himalayan Java Patan', phone: '9841022222', branch: 'LLT-03', staff: 'llt_tech1', type: 'SME Bundle', plan: 'SME Pro 200 Mbps', status: 'Activated', req: pastDays(14), act: pastDays(11) },
    { name: 'Bhaktapur Eye Hospital', phone: '9841033333', branch: 'BKT-04', staff: 'bkt_tech1', type: 'Corporate Lease', plan: 'Healthcare Link 200 Mbps', status: 'Activated', req: pastDays(10), act: pastDays(7) },
    { name: 'Narayangarh Trading House', phone: '9856044444', branch: 'CTW-05', staff: 'ctw_tech1', type: 'SME Bundle', plan: 'SME Pro 150 Mbps', status: 'Installed', req: pastDays(5), act: null },
    { name: 'Saraswati Boarding School', phone: '9841055555', branch: 'KTM-01', staff: 'ktm_sales1', type: 'Fiber Internet', plan: 'EduNet 300 Mbps', status: 'Installation Pending', req: pastDays(4), act: null },
    { name: 'Pokhara Yoga Retreat', phone: '9846066666', branch: 'PKR-02', staff: 'pkr_sales1', type: 'Fiber Internet', plan: 'Home Super 200 Mbps', status: 'Contacted', req: pastDays(2), act: null },
    { name: 'Balkumari Auto Works', phone: '9841077777', branch: 'LLT-03', staff: 'llt_sales1', type: 'Fiber Internet', plan: 'Home Standard 100 Mbps', status: 'New Request', req: pastDays(1), act: null },
    { name: 'Greenland Organic Farm', phone: '9856088888', branch: 'CTW-05', staff: 'ctw_sales1', type: 'Fiber Internet', plan: 'Home Standard 100 Mbps', status: 'New Request', req: pastDays(1), act: null },
    { name: 'Cancelled Connection Demo', phone: '9800000001', branch: 'KTM-01', staff: 'ktm_sales1', type: 'Fiber Internet', plan: 'Home Standard 100 Mbps', status: 'Cancelled', req: pastDays(15), act: null },
    { name: 'Rejected Feasibility Demo', phone: '9800000002', branch: 'PKR-02', staff: 'pkr_tech1', type: 'Corporate Lease', plan: 'Dedicated Enterprise 1 Gbps', status: 'Rejected', req: pastDays(18), act: null },
  ];

  let cIdx = 1;
  for (const c of connData) {
    const connCode = `CONN-${(1000 + cIdx).toString()}`;
    cIdx++;
    await db.query(
      `INSERT INTO connections (connection_id, customer_name, customer_id, phone, email, address, branch_id, assigned_staff_id, connection_type, package_plan, request_date, activation_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (connection_id) DO NOTHING`,
      [
        connCode,
        c.name,
        `CUST-${(9000 + cIdx).toString()}`,
        c.phone,
        `${c.name.toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`,
        `Ward No. ${cIdx % 10 + 1}, ${c.branch}`,
        branchMap[c.branch],
        userMap[c.staff] || null,
        c.type,
        c.plan,
        c.req,
        c.act,
        c.status,
        `Sample customer onboarding: ${c.status}`,
      ]
    );
  }

  // 7. Seed 20 Support Tickets
  console.log('🎫 Seeding 20 Customer Support Tickets with SLA timers...');
  const ticketData = [
    { name: 'Bishnu Prasad Regmi', phone: '9851122334', branch: 'KTM-01', staff: 'ktm_support1', cat: 'Internet Down', prio: 'Critical', status: 'In Progress', due: pastDays(1) }, // Overdue critical
    { name: 'Pokhara Grand Hotel', phone: '9856122335', branch: 'PKR-02', staff: 'pkr_support1', cat: 'WiFi Issue', prio: 'High', status: 'Resolved', due: pastDays(2), res: 'Replaced faulty PoE injector on AP 3' },
    { name: 'Lalitpur Medical Store', phone: '9841122336', branch: 'LLT-03', staff: 'llt_support1', cat: 'Router/ONT Issue', prio: 'High', status: 'Assigned', due: futureDays(1) },
    { name: 'Gyan Mandir College', phone: '9841122337', branch: 'BKT-04', staff: 'bkt_support1', cat: 'Slow Internet', prio: 'Medium', status: 'In Progress', due: futureDays(1) },
    { name: 'Bharatpur Diagnostic Lab', phone: '9856122338', branch: 'CTW-05', staff: 'ctw_tech1', cat: 'Technical Issue', prio: 'Critical', status: 'Resolved', due: pastDays(1), res: 'Cleaned dirty SC/UPC connector' },
    { name: 'Ktm Valley Bakery', phone: '9841122339', branch: 'KTM-01', staff: 'ktm_support1', cat: 'Billing', prio: 'Low', status: 'Closed', due: pastDays(5), res: 'Adjusted billing discount code' },
    { name: 'Hotel Snowland', phone: '9846122340', branch: 'PKR-02', staff: 'pkr_support1', cat: 'Service Request', prio: 'Medium', status: 'Resolved', due: pastDays(3), res: 'Upgraded bandwidth from 100 to 200M' },
    { name: 'Apex Pharmacy Pulchowk', phone: '9841122341', branch: 'LLT-03', staff: 'llt_support1', cat: 'Internet Down', prio: 'High', status: 'Waiting for Customer', due: futureDays(2) },
    { name: 'Kamal Shrestha Residence', phone: '9841122342', branch: 'BKT-04', staff: 'bkt_support1', cat: 'Payment', prio: 'Low', status: 'Closed', due: pastDays(4), res: 'E-sewa transaction ID verified' },
    { name: 'Chitwan Meat Products', phone: '9856122343', branch: 'CTW-05', staff: 'ctw_tech1', cat: 'Installation', prio: 'Medium', status: 'In Progress', due: futureDays(1) },
    { name: 'Kathmandu International School', phone: '9851122344', branch: 'KTM-01', staff: 'ktm_support1', cat: 'Slow Internet', prio: 'Medium', status: 'New', due: futureDays(2) },
    { name: 'Lake City Travels', phone: '9846122345', branch: 'PKR-02', staff: 'pkr_support1', cat: 'Internet Down', prio: 'High', status: 'Resolved', due: pastDays(1), res: 'Re-spliced bent patch cord' },
    { name: 'Jawalakhel Diagnostics', phone: '9841122346', branch: 'LLT-03', staff: 'llt_support1', cat: 'Complaint', prio: 'Medium', status: 'In Progress', due: futureDays(1) },
    { name: 'Suryabinayak Department Store', phone: '9841122347', branch: 'BKT-04', staff: 'bkt_support1', cat: 'Router/ONT Issue', prio: 'High', status: 'Waiting for Technician', due: futureDays(1) },
    { name: 'Narayangarh Poly Clinic', phone: '9856122348', branch: 'CTW-05', staff: 'ctw_tech1', cat: 'Internet Down', prio: 'Critical', status: 'Escalated', due: pastDays(1) }, // Overdue escalated
    { name: 'Tundikhel View Cafe', phone: '9851122349', branch: 'KTM-01', staff: 'ktm_support1', cat: 'WiFi Issue', prio: 'Low', status: 'Resolved', due: pastDays(2), res: 'Changed 5GHz Wi-Fi channel' },
    { name: 'Phewa Lakeside Resort', phone: '9846122350', branch: 'PKR-02', staff: 'pkr_support1', cat: 'Slow Internet', prio: 'Medium', status: 'Closed', due: pastDays(6), res: 'QoS traffic shaping tuned' },
    { name: 'Kumaripati Mobile Care', phone: '9841122351', branch: 'LLT-03', staff: 'llt_support1', cat: 'Billing', prio: 'Low', status: 'Resolved', due: pastDays(2), res: 'E-bill re-sent to customer email' },
    { name: 'Durbar Square Handicraft', phone: '9841122352', branch: 'BKT-04', staff: 'bkt_support1', cat: 'Technical Issue', prio: 'Medium', status: 'New', due: futureDays(2) },
    { name: 'Sauraha Jungle Safari Lodge', phone: '9856122353', branch: 'CTW-05', staff: 'ctw_tech1', cat: 'Other', prio: 'Low', status: 'Closed', due: pastDays(7), res: 'Static IP documentation provided' },
  ];

  let tIdx = 1;
  for (const tk of ticketData) {
    const tCode = `TKT-${(2000 + tIdx).toString()}`;
    tIdx++;
    await db.query(
      `INSERT INTO support_tickets (ticket_id, customer_id, customer_name, customer_phone, branch_id, issue_category, description, assigned_staff_id, priority, status, due_date, resolution, closing_date, resolution_time_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (ticket_id) DO NOTHING`,
      [
        tCode,
        `CUST-${(9000 + tIdx).toString()}`,
        tk.name,
        tk.phone,
        branchMap[tk.branch],
        userMap[tk.staff] || null,
        tk.cat,
        `Customer reports issue regarding ${tk.cat}: ${tk.prio} priority.`,
        tk.prio,
        tk.status,
        tk.due,
        tk.res || null,
        ['Resolved', 'Closed'].includes(tk.status) ? tk.due : null,
        ['Resolved', 'Closed'].includes(tk.status) ? 140 : null,
      ]
    );
  }

  // 8. Seed 20 Follow-ups
  console.log('⏰ Seeding 20 Follow-up Reminders...');
  const followData = [
    { case: 'Hotel Lakeside - Payment Overdue', branch: 'PKR-02', staff: 'pkr_support1', type: 'Payment', date: pastDays(2), prio: 'High', status: 'Pending' }, // Overdue
    { case: 'Dr. Ramesh Silwal - Activation Feedback', branch: 'KTM-01', staff: 'ktm_support1', type: 'New Connection', date: pastDays(1), prio: 'Medium', status: 'Completed', res: 'Customer extremely satisfied with speed' },
    { case: 'Kupondole SME Cluster - Tax Invoice', branch: 'LLT-03', staff: 'llt_support1', type: 'Customer', date: futureDays(1), prio: 'Medium', status: 'Pending' },
    { case: 'Birendra Campus - Technical Meeting', branch: 'CTW-05', staff: 'ctw_sales1', type: 'Sales', date: futureDays(2), prio: 'High', status: 'Waiting' },
    { case: 'Everest Momo - Package Upgrade', branch: 'KTM-01', staff: 'ktm_sales1', type: 'Sales', date: futureDays(3), prio: 'Medium', status: 'Pending' },
    { case: 'Gyan Mandir - Check Latency Post-Splice', branch: 'BKT-04', staff: 'bkt_tech1', type: 'Technical', date: pastDays(3), prio: 'High', status: 'Completed', res: 'Ping latency reduced from 45ms to 8ms' },
    { case: 'Patan Arts - Document Verification', branch: 'LLT-03', staff: 'llt_sales1', type: 'New Connection', date: futureDays(1), prio: 'Medium', status: 'Pending' },
    { case: 'Annapurna Bakery - Secondary SSID Setup', branch: 'PKR-02', staff: 'pkr_tech1', type: 'Support', date: pastDays(1), prio: 'Low', status: 'Completed', res: 'Guest Wi-Fi portal active' },
    { case: 'Suryabinayak Department Store - ONT Check', branch: 'BKT-04', staff: 'bkt_tech1', type: 'Complaint', date: futureDays(2), prio: 'High', status: 'Waiting' },
    { case: 'Narayangarh Poly Clinic - SLA Confirmation', branch: 'CTW-05', staff: 'ctw_tech1', type: 'Management Instruction', date: pastDays(2), prio: 'Urgent', status: 'Pending' }, // Overdue
  ];

  let fIdx = 1;
  for (const f of followData) {
    const fCode = `FLW-${(3000 + fIdx).toString()}`;
    fIdx++;
    await db.query(
      `INSERT INTO follow_ups (follow_up_id, branch_id, related_customer_case, assigned_staff_id, type, description, follow_up_date, priority, status, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (follow_up_id) DO NOTHING`,
      [
        fCode,
        branchMap[f.branch],
        f.case,
        userMap[f.staff] || null,
        f.type,
        `Follow-up requirement for case: ${f.case}`,
        f.date,
        f.prio,
        f.status,
        f.res || null,
      ]
    );
  }

  // 9. Seed 10 Management Instructions
  console.log('📜 Seeding 10 Management Instructions...');
  const instData = [
    { code: 'INS-101', title: 'Dashain Festival Network Readyness & On-Call Roster', desc: 'All branches must submit technician 24/7 on-call schedules by Friday 5 PM.', branch: 'KTM-01', prio: 'Urgent', status: 'Acknowledged' },
    { code: 'INS-102', title: 'Mandatory Optical Power Audits on all GPON OLT Splitters', desc: 'Ensure all PON ports operate between -18 dBm and -24 dBm. Log readings in portal.', branch: 'PKR-02', prio: 'High', status: 'Completed', remarks: 'All 8 OLTs inspected and logged in system.' },
    { code: 'INS-103', title: 'Strict Physical Verification of Counter Cash Balances', desc: 'Cash receipts exceeding NPR 200,000 must be deposited to the bank twice daily.', branch: 'LLT-03', prio: 'High', status: 'Acknowledged' },
    { code: 'INS-104', title: 'Road Widening Emergency Readiness along Highway', desc: 'Keep 1 km 24-core fiber drums on emergency vehicles at all times.', branch: 'BKT-04', prio: 'Medium', status: 'In Progress' },
    { code: 'INS-105', title: 'Monsoon Lightning Arrester Inspection at Tower Sites', desc: 'Measure grounding resistance to be under 5 Ohms on all high-elevation antennas.', branch: 'CTW-05', prio: 'High', status: 'Completed', remarks: 'Grounding impedance measured at 3.8 Ohms.' },
    { code: 'INS-106', title: 'Customer Satisfaction Survey for Top 100 Enterprise Accounts', desc: 'Branch managers must personally visit top 10 accounts and gather written feedback.', branch: 'KTM-01', prio: 'Medium', status: 'New' },
    { code: 'INS-107', title: 'Implement Fiber Loss Threshold Alerts on NMS', desc: 'Configure automatic email alerts for any optical drop greater than 3 dB.', branch: 'PKR-02', prio: 'High', status: 'Completed', remarks: 'NMS syslog and webhook alerts connected.' },
    { code: 'INS-108', title: 'Safety Equipment and Helmet Verification for Linemen', desc: 'Inspect safety belts, insulating gloves, and hard hats for all field crew.', branch: 'LLT-03', prio: 'Urgent', status: 'Acknowledged' },
    { code: 'INS-109', title: 'Collection Drive for Inactive Accounts with Balance > NPR 3,000', desc: 'Dispatch recovery team with automated receipts for recovery of equipment.', branch: 'BKT-04', prio: 'Medium', status: 'In Progress' },
    { code: 'INS-110', title: 'Quarterly Spare Parts Inventory Audit', desc: 'Full physical count of SFP modules, splice trays, patch cords, and fiber cleavers.', branch: 'CTW-05', prio: 'Medium', status: 'New' },
  ];

  for (const i of instData) {
    await db.query(
      `INSERT INTO instructions (instruction_id, title, description, sender_id, recipient_type, branch_id, priority, status, remarks, created_at, acknowledged_at, completed_at)
       VALUES ($1, $2, $3, $4, 'Branch', $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $9)
       ON CONFLICT (instruction_id) DO NOTHING`,
      [
        i.code,
        i.title,
        i.desc,
        userMap['superadmin'],
        branchMap[i.branch],
        i.prio,
        i.status,
        i.remarks || null,
        i.status === 'Completed' ? new Date().toISOString() : null,
      ]
    );
  }

  // 10. Seed Targets / KPIs
  console.log('🎯 Seeding Operational Targets across branches and employees...');
  const targetData = [
    // Branch Targets
    { code: 'TGT-101', name: 'Kathmandu Monthly Connection Target', cat: 'New Connections', branch: 'KTM-01', emp: null, period: 'Monthly', target: 60, achieved: 48, start: pastDays(25), end: futureDays(5) },
    { code: 'TGT-102', name: 'Pokhara Hospitality Sector Fiber Growth', cat: 'Sales', branch: 'PKR-02', emp: null, period: 'Monthly', target: 50, achieved: 52, start: pastDays(25), end: futureDays(5) },
    { code: 'TGT-103', name: 'Lalitpur SME Revenue Target', cat: 'Revenue', branch: 'LLT-03', emp: null, period: 'Monthly', target: 800000, achieved: 680000, start: pastDays(25), end: futureDays(5) },
    { code: 'TGT-104', name: 'Bhaktapur Task SLA Target', cat: 'Task Completion', branch: 'BKT-04', emp: null, period: 'Monthly', target: 100, achieved: 78, start: pastDays(25), end: futureDays(5) },
    { code: 'TGT-105', name: 'Chitwan Broadband Expansion', cat: 'New Connections', branch: 'CTW-05', emp: null, period: 'Monthly', target: 40, achieved: 32, start: pastDays(25), end: futureDays(5) },

    // Individual Staff Targets
    { code: 'TGT-201', name: 'Manish Pandey FTTH Task SLA', cat: 'Task Completion', branch: 'KTM-01', emp: 'ktm_tech1', period: 'Monthly', target: 20, achieved: 19, start: pastDays(25), end: futureDays(5) },
    { code: 'TGT-202', name: 'Subash Pun Pokhara Maintenance Tasks', cat: 'Task Completion', branch: 'PKR-02', emp: 'pkr_tech1', period: 'Monthly', target: 25, achieved: 24, start: pastDays(25), end: futureDays(5) },
    { code: 'TGT-203', name: 'Roshan Bhattarai Retail Sales Goal', cat: 'Sales', branch: 'KTM-01', emp: 'ktm_sales1', period: 'Monthly', target: 30, achieved: 28, start: pastDays(25), end: futureDays(5) },
    { code: 'TGT-204', name: 'Nischal Ranabhat Pokhara Sales Goal', cat: 'Sales', branch: 'PKR-02', emp: 'pkr_sales1', period: 'Monthly', target: 30, achieved: 34, start: pastDays(25), end: futureDays(5) },
    { code: 'TGT-205', name: 'Anita Karki Support Ticket Resolution SLA', cat: 'Customer Support', branch: 'KTM-01', emp: 'ktm_support1', period: 'Monthly', target: 40, achieved: 38, start: pastDays(25), end: futureDays(5) },
  ];

  for (const tg of targetData) {
    const achPct = Math.round((tg.achieved / tg.target) * 100);
    const status = achPct >= 100 ? 'Achieved' : (achPct > 0 ? 'Partially Achieved' : 'In Progress');
    await db.query(
      `INSERT INTO targets (target_id, target_name, category, branch_id, employee_id, period, target_value, achieved_value, achievement_percentage, start_date, end_date, assigned_by_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (target_id) DO NOTHING`,
      [
        tg.code,
        tg.name,
        tg.cat,
        branchMap[tg.branch],
        tg.emp ? userMap[tg.emp] : null,
        tg.period,
        tg.target,
        tg.achieved,
        achPct,
        tg.start,
        tg.end,
        userMap['superadmin'],
        status,
      ]
    );
  }

  // 11. Seed Initial System Settings
  console.log('⚙️ Initializing System Settings & Default Performance Scoring Weights...');
  const settingsEntries = [
    {
      key: 'performance_weights',
      value: JSON.stringify({
        targetWeight: 40,
        taskCompletionWeight: 30,
        onTimeWeight: 15,
        supportFollowUpWeight: 15,
      }),
      desc: 'Default performance scoring weights summing to 100%',
    },
    {
      key: 'company_info',
      value: JSON.stringify({
        name: 'Fiber World Communication Pvt. Ltd.',
        shortName: 'FWCPL',
        panVat: '302918273',
        license: 'NTA-ISP-2018-091',
        phone: '+977-1-4789012',
        email: 'info@fiberworld.net.np',
        website: 'https://fiberworld.net.np',
        hqAddress: 'New Baneshwor, Kathmandu, Nepal',
      }),
      desc: 'Company legal and contact profile',
    },
  ];

  for (const s of settingsEntries) {
    await db.query(
      `INSERT INTO settings (key, value, description) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [s.key, s.value, s.desc]
    );
  }

  // 12. Seed Activity Logs
  console.log('📝 Seeding Audit Trail...');
  await db.query(
    `INSERT INTO activity_logs (user_id, action, module, record_id, details, ip_address, created_at)
     VALUES ($1, 'INITIALIZE_SYSTEM', 'SYSTEM', '1', 'Initial enterprise system deployment with 5 branches and 22 employees', '127.0.0.1', CURRENT_TIMESTAMP)`,
    [userMap['superadmin']]
  );

  // 13. Seed NOC Incidents & PODs
  await seedNocIncidents();
  await seedPods();

  console.log('✨ FWCPL Operations Database successfully populated with rich enterprise data!');
};

export const seedNocIncidents = async () => {
  try {
    const chk = await db.query('SELECT COUNT(*) as count FROM noc_incidents');
    if (parseInt(chk.rows[0]?.count || '0', 10) > 0) {
      return;
    }

    console.log('📡 Seeding Initial NOC Incidents & Operational Escalations...');

    // Fetch branches and users
    const branches = await db.query('SELECT id, code FROM branches');
    const bMap: Record<string, number> = {};
    for (const b of branches.rows) bMap[b.code] = b.id;

    const users = await db.query('SELECT id, username FROM users');
    const uMap: Record<string, number> = {};
    for (const u of users.rows) uMap[u.username] = u.id;

    const sampleNoc = [
      {
        incident_id: 'NOC-2026-001',
        title: 'Core 48F Backbone Fiber Cut near Mahalaxmisthan Ring Road',
        issue_type: 'Backbone Fiber Cut',
        branch_code: 'LLT-03',
        pop_location: 'Mahalaxmisthan Ring Road Crossing',
        affected_services: 'Broadband Internet, Leased Lines, IPTV Stream B',
        affected_customers_count: 580,
        priority: 'P1',
        status: 'In Progress',
        reported_by: 'bm_lalitpur',
        assigned_noc: 'ktm_tech1',
        description: 'Road expansion excavation by NEA/DOR contractor severed the 48-core main distribution trunk at pillar #14.',
        impact_details: 'Complete downstream carrier loss for Lagankhel and Gwarko clusters. Traffic auto-diverted to backup 10G link with 35% congestion.',
        estimated_resolution_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        updates: [
          'Incident raised by Lalitpur Branch Manager Bikram Thapa.',
          'NOC confirmed loss of optical signal (LOS) on Port Te0/1/2.',
          'Splicing team on site with OTDR meter; pinpointed physical break at 2.4km from Kumaripati POP.',
          'OTDR confirmed break repaired on 24/48 cores. Splicing continuing for remaining fibers.',
        ],
      },
      {
        incident_id: 'NOC-2026-002',
        title: 'Lakeside Central POP Huawei OLT Linecard Failure',
        issue_type: 'OLT Outage',
        branch_code: 'PKR-02',
        pop_location: 'Lakeside Baidam Sub-POP 03',
        affected_services: 'FTTH GPON Internet, VoIP Services',
        affected_customers_count: 240,
        priority: 'P2',
        status: 'Acknowledged',
        reported_by: 'bm_pokhara',
        assigned_noc: 'pkr_tech1',
        description: 'GPON card slot 4 stopped transmitting optical power; 8 PON ports completely uncommunicative.',
        impact_details: 'Hotels and retail users along Street 15 to Street 22 disconnected.',
        estimated_resolution_time: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        updates: [
          'Incident raised by Pokhara BM Kiran Gurung.',
          'NOC dispatched field technician with replacement 16-port GPON linecard.',
        ],
      },
      {
        incident_id: 'NOC-2026-003',
        title: 'Lions Chowk POP High Battery Temperature & Generator Cutoff',
        issue_type: 'POP Power Failure',
        branch_code: 'CTW-05',
        pop_location: 'Chitwan Lions Chowk Core Hub',
        affected_services: 'All Bharatpur Metro Ring Links',
        affected_customers_count: 820,
        priority: 'P1',
        status: 'Resolved',
        reported_by: 'bm_chitwan',
        assigned_noc: 'ctw_tech1',
        description: 'NEA city transformer blew out; backup automatic diesel generator failed to trigger starter relay.',
        impact_details: 'Battery backup exhausted after 45 minutes of load.',
        estimated_resolution_time: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        resolution_notes: 'Manual generator override engaged; replacement relay module installed. Utility power restored at 14:15.',
        root_cause_analysis: 'Faulty starter contactor coil degraded during monsoon humidity.',
        updates: [
          'Chitwan BM reported sudden DC battery voltage drop.',
          'NOC alert: Generator auto-failover alarm triggered.',
          'Technician Ajay arrived on site with mobile generator set.',
          'Commercial power restored and DC rectifiers stabilized. All PON ports operational.',
        ],
      },
      {
        incident_id: 'NOC-2026-004',
        title: 'High Latency & 8% Packet Loss to Upstream Gateway',
        issue_type: 'High Latency / Packet Loss',
        branch_code: 'KTM-01',
        pop_location: 'Kathmandu HQ BGP Gateway',
        affected_services: 'International Transit, Gaming Traffic, DNS Resolution',
        affected_customers_count: 1400,
        priority: 'P2',
        status: 'Reported',
        reported_by: 'superadmin',
        assigned_noc: null,
        description: 'Customers reporting severe lag and buffering on international routes via upstream link.',
        impact_details: 'RTT jumped from 28ms to 142ms across all Kathmandu Valley residential users.',
        estimated_resolution_time: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        updates: [
          'Ticket escalated directly to NOC upstream engineering team.',
        ],
      },
    ];

    for (const item of sampleNoc) {
      const bId = bMap[item.branch_code] || null;
      const repId = uMap[item.reported_by] || null;
      const nocId = item.assigned_noc ? uMap[item.assigned_noc] || null : null;

      const incRes = await db.query(`
        INSERT INTO noc_incidents (
          incident_id, title, issue_type, branch_id, pop_location,
          affected_services, affected_customers_count, priority, status,
          reported_by_id, assigned_noc_engineer_id, description, impact_details,
          estimated_resolution_time, resolution_notes, root_cause_analysis,
          resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
      `, [
        item.incident_id,
        item.title,
        item.issue_type,
        bId,
        item.pop_location,
        item.affected_services,
        item.affected_customers_count,
        item.priority,
        item.status,
        repId,
        nocId,
        item.description,
        item.impact_details,
        item.estimated_resolution_time,
        item.resolution_notes || null,
        item.root_cause_analysis || null,
        item.status === 'Resolved' ? new Date().toISOString() : null,
      ]);

      const incId = incRes.rows[0].id;

      for (const upd of item.updates) {
        await db.query(`
          INSERT INTO noc_incident_updates (incident_id, user_id, update_text)
          VALUES ($1, $2, $3)
        `, [incId, repId, upd]);
      }
    }

    console.log('✅ Seeded 4 realistic NOC incidents and updates.');
  } catch (err: any) {
    console.error('Error seeding NOC incidents:', err.message);
  }
};

export const seedPods = async (): Promise<void> => {
  try {
    const initialPods = [
      { name: 'PRAGATINAGAR DC', pod_type: 'Commercial', status: 'Active' },
      { name: 'BHARATPUR DC', pod_type: 'Commercial', status: 'Active' },
      { name: 'HETAUDA DC', pod_type: 'Commercial', status: 'Active' },
    ];

    for (const pod of initialPods) {
      const chk = await db.query(
        `SELECT id FROM pods WHERE UPPER(name) = UPPER($1)`,
        [pod.name]
      );
      if (chk.rowCount === 0) {
        await db.query(
          `INSERT INTO pods (name, pod_type, status, created_at, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [pod.name, pod.pod_type, pod.status]
        );
      }
    }
    console.log('✅ Initial POD/DC locations verified: PRAGATINAGAR DC, BHARATPUR DC, HETAUDA DC (contacts & GPS left clean).');
  } catch (err: any) {
    console.error('Error seeding PODs:', err.message);
  }
};

