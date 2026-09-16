import { Pool } from 'pg';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

interface QueryResult {
  rows: any[];
  rowCount: number;
}

class DatabaseManager {
  private pgPool: Pool | null = null;
  private sqliteDb: any = null;
  private usePostgres = false;

  async init(): Promise<void> {
    // Attempt connecting to PostgreSQL first
    try {
      const pool = new Pool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.name,
        connectionTimeoutMillis: 5000,
      });

      // Quick probe
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.pgPool = pool;
      this.usePostgres = true;
      console.log('✅ Connected to PostgreSQL database successfully.');
      await this.runSchemaPostgres();
      try {
        const { seedRbacData } = await import('../seeds/rbacSeed');
        await seedRbacData();
      } catch (rErr: any) {
        console.error('⚠️ RBAC auto-seed warning:', rErr.message);
      }
      try {
        const { seedGoodsData } = await import('../seeds/goodsSeed');
        await seedGoodsData();
      } catch (gErr: any) {
        console.error('⚠️ Goods auto-seed warning:', gErr.message);
      }
    } catch (pgErr: any) {
      console.warn('⚠️ PostgreSQL unavailable (' + (pgErr.message || 'connection failed') + '). Falling back to local embedded SQLite database for zero-downtime execution.');
      this.initSqlite();
    }
  }

  private initSqlite(): void {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'fwcpl.sqlite');
    this.sqliteDb = new Database(dbPath);
    this.sqliteDb.pragma('journal_mode = WAL');
    this.sqliteDb.pragma('foreign_keys = ON');
    this.usePostgres = false;
    this.runSchemaSqlite();
    try {
      const { seedRbacData } = require('../seeds/rbacSeed');
      Promise.resolve(seedRbacData()).catch((rErr: any) => {
        console.error('⚠️ RBAC auto-seed warning (SQLite):', rErr.message);
      });
    } catch (rErr: any) {
      console.error('⚠️ RBAC auto-seed warning (SQLite):', rErr.message);
    }
    try {
      const { seedGoodsData } = require('../seeds/goodsSeed');
      seedGoodsData();
    } catch (gErr: any) {
      console.error('⚠️ Goods auto-seed warning (SQLite):', gErr.message);
    }
    console.log(`✅ SQLite initialized at ${dbPath}`);
  }

  private async runSchemaPostgres(): Promise<void> {
    if (!this.pgPool) return;

    // Check multiple candidate locations for schema.sql
    const candidatePaths = [
      path.resolve(__dirname, 'schema.sql'),
      path.resolve(__dirname, '../src/models/schema.sql'),
      path.resolve(process.cwd(), 'src/models/schema.sql'),
      path.resolve(process.cwd(), 'dist/models/schema.sql'),
      path.resolve(__dirname, '../../src/models/schema.sql'),
      '/app/src/models/schema.sql',
      '/app/dist/models/schema.sql',
    ];

    let applied = false;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const schemaSql = fs.readFileSync(p, 'utf-8');
          await this.pgPool.query(schemaSql);
          console.log(`✅ PostgreSQL schema verified/applied from ${p}`);
          applied = true;
          break;
        } catch (err: any) {
          console.error(`⚠️ Error applying schema from ${p}:`, err.message);
        }
      }
    }

    if (!applied) {
      console.warn('⚠️ schema.sql file not located in candidate paths. Applying NOC DDL directly...');
    }

    // Unconditionally ensure noc_incidents and noc_incident_updates exist in PostgreSQL
    try {
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS noc_incidents (
            id SERIAL PRIMARY KEY,
            incident_id VARCHAR(50) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            issue_type VARCHAR(100) NOT NULL,
            complain_by_name VARCHAR(150),
            suggestions TEXT,
            branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
            pop_location VARCHAR(255),
            affected_services TEXT,
            affected_customers_count INTEGER DEFAULT 0,
            priority VARCHAR(20) NOT NULL DEFAULT 'P2',
            status VARCHAR(30) NOT NULL DEFAULT 'Reported',
            reported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            assigned_noc_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            description TEXT NOT NULL,
            impact_details TEXT,
            estimated_resolution_time TIMESTAMP,
            resolved_at TIMESTAMP,
            resolution_notes TEXT,
            root_cause_analysis TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS complain_by_name VARCHAR(150);
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS suggestions TEXT;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS pop_location VARCHAR(255);
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS affected_services TEXT;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS affected_customers_count INTEGER DEFAULT 0;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'P2';
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Reported';
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS reported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS assigned_noc_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS impact_details TEXT;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS estimated_resolution_time TIMESTAMP;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
        ALTER TABLE noc_incidents ADD COLUMN IF NOT EXISTS root_cause_analysis TEXT;

        ALTER TABLE connections ADD COLUMN IF NOT EXISTS completion_date DATE;

        ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"tasks": true, "connections": true, "request_goods": true, "followups": true, "staff": true, "instructions": true, "targets": true, "noc": true, "reports": true}'::jsonb;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_branches TEXT DEFAULT 'ALL';

        ALTER TABLE noc_incident_updates ADD COLUMN IF NOT EXISTS status_change VARCHAR(50);

        CREATE TABLE IF NOT EXISTS noc_incident_updates (
            id SERIAL PRIMARY KEY,
            incident_id INTEGER REFERENCES noc_incidents(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            update_text TEXT NOT NULL,
            status_change VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_noc_incidents_branch ON noc_incidents(branch_id);
        CREATE INDEX IF NOT EXISTS idx_noc_incidents_status ON noc_incidents(status);
        CREATE INDEX IF NOT EXISTS idx_noc_incidents_priority ON noc_incidents(priority);
        CREATE INDEX IF NOT EXISTS idx_noc_updates_incident ON noc_incident_updates(incident_id);

        CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            is_system BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS permissions (
            id SERIAL PRIMARY KEY,
            module VARCHAR(100) NOT NULL,
            name VARCHAR(150) NOT NULL,
            permission_key VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS role_permissions (
            id SERIAL PRIMARY KEY,
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
            allowed BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE(role_id, permission_id)
        );

        CREATE TABLE IF NOT EXISTS user_permissions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
            allowed BOOLEAN NOT NULL DEFAULT TRUE,
            override_type VARCHAR(20) NOT NULL DEFAULT 'ALLOW',
            UNIQUE(user_id, permission_id)
        );

        CREATE TABLE IF NOT EXISTS user_branches (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
            UNIQUE(user_id, branch_id)
        );

        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_branches TEXT DEFAULT 'ALL';

        CREATE TABLE IF NOT EXISTS goods_items (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL UNIQUE,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            unit VARCHAR(50) NOT NULL,
            quantity_type VARCHAR(20) NOT NULL DEFAULT 'Integer',
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS goods_requests (
            id SERIAL PRIMARY KEY,
            request_number VARCHAR(50) NOT NULL UNIQUE,
            branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
            requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            priority VARCHAR(20) NOT NULL DEFAULT 'Normal',
            status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            required_by DATE,
            remarks TEXT,
            approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            approved_at TIMESTAMP,
            approval_remarks TEXT,
            denied_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            denied_at TIMESTAMP,
            denial_reason TEXT,
            completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            completed_at TIMESTAMP,
            completion_remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS goods_request_items (
            id SERIAL PRIMARY KEY,
            request_id INTEGER NOT NULL REFERENCES goods_requests(id) ON DELETE CASCADE,
            goods_item_id INTEGER REFERENCES goods_items(id) ON DELETE SET NULL,
            item_name_snapshot VARCHAR(150) NOT NULL,
            unit_snapshot VARCHAR(50) NOT NULL,
            quantity_type_snapshot VARCHAR(20) NOT NULL DEFAULT 'Integer',
            requested_quantity NUMERIC(12, 2) NOT NULL,
            approved_quantity NUMERIC(12, 2),
            delivered_quantity NUMERIC(12, 2) DEFAULT 0,
            item_description TEXT,
            item_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            operation_remark TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS goods_request_history (
            id SERIAL PRIMARY KEY,
            request_id INTEGER NOT NULL REFERENCES goods_requests(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(100) NOT NULL,
            previous_status VARCHAR(30),
            new_status VARCHAR(30),
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_goods_items_category ON goods_items(category);
        CREATE INDEX IF NOT EXISTS idx_goods_items_active ON goods_items(active);
        CREATE INDEX IF NOT EXISTS idx_goods_requests_branch ON goods_requests(branch_id);
        CREATE INDEX IF NOT EXISTS idx_goods_requests_status ON goods_requests(status);
        CREATE INDEX IF NOT EXISTS idx_goods_requests_priority ON goods_requests(priority);
        CREATE INDEX IF NOT EXISTS idx_goods_requests_req_by ON goods_requests(requested_by);
        CREATE INDEX IF NOT EXISTS idx_goods_req_items_req ON goods_request_items(request_id);
        CREATE INDEX IF NOT EXISTS idx_goods_req_hist_req ON goods_request_history(request_id);

        CREATE TABLE IF NOT EXISTS discussion_topics (
            id SERIAL PRIMARY KEY,
            topic_number VARCHAR(50) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL DEFAULT 'General',
            priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
            status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
            branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
            created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            initial_message TEXT NOT NULL,
            image_url TEXT,
            closed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            closed_at TIMESTAMP,
            closure_reason TEXT,
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS discussion_messages (
            id SERIAL PRIMARY KEY,
            topic_id INTEGER NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
            sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            message TEXT NOT NULL,
            image_url TEXT,
            is_internal BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_discussion_topics_branch ON discussion_topics(branch_id);
        CREATE INDEX IF NOT EXISTS idx_discussion_topics_status ON discussion_topics(status);
        CREATE INDEX IF NOT EXISTS idx_discussion_topics_last_msg ON discussion_topics(last_message_at DESC);
        CREATE INDEX IF NOT EXISTS idx_discussion_messages_topic ON discussion_messages(topic_id);

        CREATE TABLE IF NOT EXISTS pods (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL UNIQUE,
            status VARCHAR(30) NOT NULL DEFAULT 'Active',
            pod_type VARCHAR(50) NOT NULL DEFAULT 'Commercial',
            latitude NUMERIC(10, 7),
            longitude NUMERIC(10, 7),
            house_owner_name VARCHAR(150),
            house_owner_contact VARCHAR(50),
            house_owner_alt_contact VARCHAR(50),
            address TEXT,
            property_description TEXT,
            relative_name VARCHAR(150),
            relative_relationship VARCHAR(100),
            relative_contact VARCHAR(50),
            relative_alt_contact VARCHAR(50),
            installation_date DATE,
            access_information TEXT,
            access_restrictions TEXT,
            key_holder VARCHAR(150),
            key_holder_contact VARCHAR(50),
            power_available BOOLEAN DEFAULT TRUE,
            backup_power_available BOOLEAN DEFAULT FALSE,
            backup_power_type VARCHAR(100),
            power_remarks TEXT,
            equipment_location VARCHAR(255),
            physical_location_description TEXT,
            description TEXT,
            remarks TEXT,
            created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pod_items (
            id SERIAL PRIMARY KEY,
            pod_id INTEGER NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
            item_name VARCHAR(150) NOT NULL,
            quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
            unit VARCHAR(50) NOT NULL DEFAULT 'PCS',
            description TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'Active',
            remarks TEXT,
            created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pod_history (
            id SERIAL PRIMARY KEY,
            pod_id INTEGER NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(100) NOT NULL,
            details TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_pods_status ON pods(status);
        CREATE INDEX IF NOT EXISTS idx_pods_name ON pods(name);
        CREATE INDEX IF NOT EXISTS idx_pod_items_pod ON pod_items(pod_id);
        CREATE INDEX IF NOT EXISTS idx_pod_items_status ON pod_items(status);
        CREATE INDEX IF NOT EXISTS idx_pod_history_pod ON pod_history(pod_id);
      `);
      console.log('✅ PostgreSQL NOC, RBAC, Goods, Discussions & POD tables verified & ready.');
    } catch (nocErr: any) {
      console.error('❌ Failed to ensure NOC/RBAC tables in PostgreSQL:', nocErr.message);
    }
  }

  private runSchemaSqlite(): void {
    if (!this.sqliteDb) return;

    // Convert schema to SQLite compatible DDL
    const ddl = `
      CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          code TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS designations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          code TEXT NOT NULL UNIQUE,
          department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS branches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          city TEXT NOT NULL,
          province TEXT NOT NULL,
          contact_number TEXT NOT NULL,
          email TEXT NOT NULL,
          manager_id INTEGER,
          opening_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          phone TEXT,
          branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
          designation_id INTEGER REFERENCES designations(id) ON DELETE SET NULL,
          department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
          supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          role TEXT NOT NULL DEFAULT 'STAFF',
          status TEXT NOT NULL DEFAULT 'Active',
          permissions TEXT,
          allowed_branches TEXT DEFAULT 'ALL',
          profile_photo TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL DEFAULT 'General',
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          priority TEXT NOT NULL DEFAULT 'Medium',
          start_date TEXT NOT NULL,
          due_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'New',
          completion_date DATETIME,
          completion_remarks TEXT,
          attachments TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          comment TEXT NOT NULL,
          is_internal INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_status_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          from_status TEXT,
          to_status TEXT NOT NULL,
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          connection_id TEXT NOT NULL UNIQUE,
          customer_name TEXT NOT NULL,
          customer_id TEXT,
          phone TEXT NOT NULL,
          email TEXT,
          address TEXT NOT NULL,
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          assigned_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          connection_type TEXT NOT NULL DEFAULT 'Fiber Internet',
          package_plan TEXT NOT NULL,
          request_date TEXT NOT NULL,
          site_survey_date TEXT,
          installation_date TEXT,
          activation_date TEXT,
          completion_date TEXT,
          status TEXT NOT NULL DEFAULT 'New Request',
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS connection_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          connection_id INTEGER REFERENCES connections(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          comment TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_id TEXT NOT NULL UNIQUE,
          customer_id TEXT,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          issue_category TEXT NOT NULL,
          description TEXT NOT NULL,
          assigned_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          priority TEXT NOT NULL DEFAULT 'Medium',
          status TEXT NOT NULL DEFAULT 'New',
          created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          due_date DATETIME,
          resolution TEXT,
          closing_date DATETIME,
          resolution_time_minutes INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          comment TEXT NOT NULL,
          is_internal INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS follow_ups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          follow_up_id TEXT NOT NULL UNIQUE,
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          related_customer_case TEXT,
          assigned_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          follow_up_date TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'Medium',
          status TEXT NOT NULL DEFAULT 'Pending',
          result TEXT,
          next_follow_up_date TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS instructions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instruction_id TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          recipient_type TEXT NOT NULL DEFAULT 'Branch',
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          recipient_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          priority TEXT NOT NULL DEFAULT 'Medium',
          due_date TEXT,
          status TEXT NOT NULL DEFAULT 'New',
          remarks TEXT,
          attachments TEXT,
          acknowledged_at DATETIME,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS instruction_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instruction_id INTEGER REFERENCES instructions(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          comment TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS targets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          target_id TEXT NOT NULL UNIQUE,
          target_name TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          period TEXT NOT NULL DEFAULT 'Monthly',
          target_value NUMERIC DEFAULT 0,
          achieved_value NUMERIC DEFAULT 0,
          achievement_percentage NUMERIC DEFAULT 0,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          assigned_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          status TEXT NOT NULL DEFAULT 'In Progress',
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'INFO',
          link TEXT,
          is_read INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action TEXT NOT NULL,
          module TEXT NOT NULL,
          record_id TEXT,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS noc_incidents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          incident_id TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          issue_type TEXT NOT NULL,
          complain_by_name TEXT,
          suggestions TEXT,
          branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
          pop_location TEXT,
          affected_services TEXT,
          affected_customers_count INTEGER DEFAULT 0,
          priority TEXT NOT NULL DEFAULT 'P2',
          status TEXT NOT NULL DEFAULT 'Reported',
          reported_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          assigned_noc_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          description TEXT NOT NULL,
          impact_details TEXT,
          estimated_resolution_time DATETIME,
          resolved_at DATETIME,
          resolution_notes TEXT,
          root_cause_analysis TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS noc_incident_updates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          incident_id INTEGER REFERENCES noc_incidents(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          update_text TEXT NOT NULL,
          status_change TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          is_system INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          module TEXT NOT NULL,
          name TEXT NOT NULL,
          permission_key TEXT NOT NULL UNIQUE,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'Active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
          permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
          allowed INTEGER NOT NULL DEFAULT 1,
          UNIQUE(role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS user_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
          allowed INTEGER NOT NULL DEFAULT 1,
          override_type TEXT NOT NULL DEFAULT 'ALLOW',
          UNIQUE(user_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS user_branches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          UNIQUE(user_id, branch_id)
      );

      CREATE TABLE IF NOT EXISTS goods_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL,
          description TEXT,
          unit TEXT NOT NULL,
          quantity_type TEXT NOT NULL DEFAULT 'Integer',
          active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goods_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_number TEXT NOT NULL UNIQUE,
          branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
          requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          priority TEXT NOT NULL DEFAULT 'Normal',
          status TEXT NOT NULL DEFAULT 'PENDING',
          required_by TEXT,
          remarks TEXT,
          approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          approved_at DATETIME,
          approval_remarks TEXT,
          denied_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          denied_at DATETIME,
          denial_reason TEXT,
          completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          completed_at DATETIME,
          completion_remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goods_request_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL REFERENCES goods_requests(id) ON DELETE CASCADE,
          goods_item_id INTEGER REFERENCES goods_items(id) ON DELETE SET NULL,
          item_name_snapshot TEXT NOT NULL,
          unit_snapshot TEXT NOT NULL,
          quantity_type_snapshot TEXT NOT NULL DEFAULT 'Integer',
          requested_quantity NUMERIC NOT NULL,
          approved_quantity NUMERIC,
          delivered_quantity NUMERIC DEFAULT 0,
          item_description TEXT,
          item_status TEXT NOT NULL DEFAULT 'PENDING',
          operation_remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goods_request_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL REFERENCES goods_requests(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action TEXT NOT NULL,
          previous_status TEXT,
          new_status TEXT,
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS discussion_topics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic_number TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'General',
          priority TEXT NOT NULL DEFAULT 'Medium',
          status TEXT NOT NULL DEFAULT 'OPEN',
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          initial_message TEXT NOT NULL,
          image_url TEXT,
          closed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          closed_at DATETIME,
          closure_reason TEXT,
          last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS discussion_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic_id INTEGER NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
          sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          message TEXT NOT NULL,
          image_url TEXT,
          is_internal INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'Active',
          pod_type TEXT NOT NULL DEFAULT 'Commercial',
          latitude NUMERIC,
          longitude NUMERIC,
          house_owner_name TEXT,
          house_owner_contact TEXT,
          house_owner_alt_contact TEXT,
          address TEXT,
          property_description TEXT,
          relative_name TEXT,
          relative_relationship TEXT,
          relative_contact TEXT,
          relative_alt_contact TEXT,
          installation_date TEXT,
          access_information TEXT,
          access_restrictions TEXT,
          key_holder TEXT,
          key_holder_contact TEXT,
          power_available INTEGER DEFAULT 1,
          backup_power_available INTEGER DEFAULT 0,
          backup_power_type TEXT,
          power_remarks TEXT,
          equipment_location TEXT,
          physical_location_description TEXT,
          description TEXT,
          remarks TEXT,
          created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pod_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pod_id INTEGER NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
          item_name TEXT NOT NULL,
          quantity NUMERIC NOT NULL DEFAULT 1,
          unit TEXT NOT NULL DEFAULT 'PCS',
          description TEXT,
          status TEXT NOT NULL DEFAULT 'Active',
          remarks TEXT,
          created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pod_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pod_id INTEGER NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action TEXT NOT NULL,
          details TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    this.sqliteDb.exec(ddl);

    try { this.sqliteDb.exec("ALTER TABLE users ADD COLUMN phone TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE users ADD COLUMN role_id INTEGER;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE users ADD COLUMN last_login DATETIME;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE users ADD COLUMN allowed_branches TEXT DEFAULT 'ALL';"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE users ADD COLUMN permissions TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE connections ADD COLUMN completion_date TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN complain_by_name TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN suggestions TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN pop_location TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN affected_services TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN affected_customers_count INTEGER DEFAULT 0;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN priority TEXT DEFAULT 'P2';"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN status TEXT DEFAULT 'Reported';"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN reported_by_id INTEGER;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN assigned_noc_engineer_id INTEGER;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN impact_details TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN estimated_resolution_time DATETIME;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN resolved_at DATETIME;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN resolution_notes TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incidents ADD COLUMN root_cause_analysis TEXT;"); } catch {}
    try { this.sqliteDb.exec("ALTER TABLE noc_incident_updates ADD COLUMN status_change TEXT;"); } catch {}

    console.log('✅ SQLite schema applied.');
  }

  async query(text: string, params: any[] = []): Promise<QueryResult> {
    if (this.usePostgres && this.pgPool) {
      const res = await this.pgPool.query(text, params);
      return {
        rows: res.rows,
        rowCount: res.rowCount || 0,
      };
    }

    if (this.sqliteDb) {
      // In SQLite, map numbered parameters ($1, $2, etc.) to ? and align parameter values
      const paramIndices: number[] = [];
      let sqliteText = text.replace(/\$(\d+)/g, (_, num) => {
        paramIndices.push(parseInt(num, 10) - 1);
        return '?';
      });
      const mappedParams = paramIndices.length > 0 ? paramIndices.map(idx => params[idx]) : params;

      // Replace ILIKE with LIKE (SQLite LIKE is case-insensitive by default for ASCII)
      sqliteText = sqliteText.replace(/\bILIKE\b/gi, 'LIKE');
      // Replace NOW() or CURRENT_TIMESTAMP
      sqliteText = sqliteText.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
      // Replace boolean literals TRUE and FALSE with 1 and 0 for SQLite
      sqliteText = sqliteText.replace(/\b=\s*TRUE\b/gi, '= 1');
      sqliteText = sqliteText.replace(/\b=\s*FALSE\b/gi, '= 0');
      sqliteText = sqliteText.replace(/\bIS\s+TRUE\b/gi, '= 1');
      sqliteText = sqliteText.replace(/\bIS\s+FALSE\b/gi, '= 0');
      sqliteText = sqliteText.replace(/\bTRUE\b/gi, '1');
      sqliteText = sqliteText.replace(/\bFALSE\b/gi, '0');

      // Convert boolean parameter values to 1 / 0 for SQLite
      const cleanParams = mappedParams.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sqliteText);

      try {
        if (isSelect) {
          const stmt = this.sqliteDb.prepare(sqliteText);
          const rows = stmt.all(...cleanParams);
          return { rows, rowCount: rows.length };
        } else {
          // If query has RETURNING * or RETURNING id, in SQLite 3.35+ it is supported!
          if (/RETURNING/i.test(sqliteText)) {
            const stmt = this.sqliteDb.prepare(sqliteText);
            const rows = stmt.all(...cleanParams);
            return { rows, rowCount: rows.length };
          } else {
            const stmt = this.sqliteDb.prepare(sqliteText);
            const info = stmt.run(...cleanParams);
            return {
              rows: [{ id: info.lastInsertRowid }],
              rowCount: info.changes,
            };
          }
        }
      } catch (err: any) {
        console.error('SQLite query error:', err.message, '\nSQL:', sqliteText, '\nParams:', mappedParams);
        throw err;
      }
    }

    throw new Error('No database connection available.');
  }

  getIsPostgres(): boolean {
    return this.usePostgres;
  }
}

export const db = new DatabaseManager();
