-- ============================================================
-- FWCPL Branch & Operations Management System - PostgreSQL DDL Schema
-- ============================================================

-- Extensions (if Postgres)
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS designations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    manager_id INTEGER,
    opening_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    designation_id INTEGER REFERENCES designations(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STAFF', -- 'SUPER_ADMIN', 'MANAGEMENT', 'BRANCH_MANAGER', 'STAFF'
    role_id INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive', 'Disabled', 'On Leave'
    permissions JSONB DEFAULT '{"tasks": true, "connections": true, "tickets": true, "followups": true, "staff": true, "instructions": true, "targets": true, "noc": true, "reports": true}'::jsonb,
    allowed_branches TEXT DEFAULT 'ALL', -- 'ALL' or comma-separated branch ids e.g. '1,2'
    profile_photo VARCHAR(255),
    notes TEXT,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    override_type VARCHAR(20) NOT NULL DEFAULT 'ALLOW', -- 'ALLOW', 'DENY'
    UNIQUE(user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_branches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE(user_id, branch_id)
);

-- Add foreign key constraint for manager_id on branches
-- ALTER TABLE branches ADD CONSTRAINT fk_branch_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'New', -- 'New', 'Assigned', 'Acknowledged', 'In Progress', 'Completed', 'Rejected', 'Cancelled', 'Closed'
    completion_date TIMESTAMP,
    completion_remarks TEXT,
    attachments TEXT, -- JSON array of file objects
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_status_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connections (
    id SERIAL PRIMARY KEY,
    connection_id VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(150) NOT NULL,
    customer_id VARCHAR(50),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    address TEXT NOT NULL,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    assigned_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    connection_type VARCHAR(50) NOT NULL DEFAULT 'Fiber Internet',
    package_plan VARCHAR(100) NOT NULL,
    request_date DATE NOT NULL,
    site_survey_date DATE,
    installation_date DATE,
    activation_date DATE,
    completion_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'New Request',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connection_comments (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES connections(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(50),
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    issue_category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    assigned_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    status VARCHAR(50) NOT NULL DEFAULT 'New', -- 'New', 'Assigned', 'In Progress', 'Waiting for Customer', 'Waiting for Technician', 'Escalated', 'Resolved', 'Closed', 'Cancelled'
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    resolution TEXT,
    closing_date TIMESTAMP,
    resolution_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follow_ups (
    id SERIAL PRIMARY KEY,
    follow_up_id VARCHAR(50) NOT NULL UNIQUE,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    related_customer_case VARCHAR(150),
    assigned_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'New Connection', 'Customer', 'Sales', 'Payment', 'Installation', 'Complaint', 'Support', 'Management Instruction', 'Other'
    description TEXT NOT NULL,
    follow_up_date DATE NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Contacted', 'Waiting', 'Completed', 'Failed', 'Cancelled'
    result TEXT,
    next_follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instructions (
    id SERIAL PRIMARY KEY,
    instruction_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recipient_type VARCHAR(50) NOT NULL DEFAULT 'Branch', -- 'Branch', 'Branch Manager', 'Individual Staff', 'Multiple Staff'
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    recipient_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    due_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'New', -- 'New', 'Acknowledged', 'In Progress', 'Completed'
    remarks TEXT,
    attachments TEXT,
    acknowledged_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instruction_comments (
    id SERIAL PRIMARY KEY,
    instruction_id INTEGER REFERENCES instructions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS targets (
    id SERIAL PRIMARY KEY,
    target_id VARCHAR(50) NOT NULL UNIQUE,
    target_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'New Connections', 'Sales', 'Revenue', 'Collection', 'Customer Support', 'Task Completion', 'Follow-up', 'Customer Retention', 'Other'
    description TEXT,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(30) NOT NULL DEFAULT 'Monthly', -- 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'
    target_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    achieved_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    achievement_percentage NUMERIC(6,2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    assigned_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'In Progress', -- 'Not Started', 'In Progress', 'Achieved', 'Partially Achieved', 'Missed'
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS noc_incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    issue_type VARCHAR(100) NOT NULL, -- 'Net issue in all area', 'Issue in particular area or costumer', 'Latency Issue', 'Video call issue', 'IPTV issue', 'Others'
    complain_by_name VARCHAR(150),
    suggestions TEXT,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    pop_location VARCHAR(255),
    affected_services TEXT,
    affected_customers_count INTEGER DEFAULT 0,
    priority VARCHAR(20) NOT NULL DEFAULT 'P2', -- 'P1', 'P2', 'P3', 'P4'
    status VARCHAR(30) NOT NULL DEFAULT 'Reported', -- 'Reported', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'
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

CREATE TABLE IF NOT EXISTS noc_incident_updates (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES noc_incidents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    update_text TEXT NOT NULL,
    status_change VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

ALTER TABLE noc_incident_updates ADD COLUMN IF NOT EXISTS status_change VARCHAR(50);

-- Indices for rapid searching, filtering and performance
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_tasks_branch ON tasks(branch_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_connections_branch ON connections(branch_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_tickets_branch ON support_tickets(branch_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_followups_branch ON follow_ups(branch_id);
CREATE INDEX IF NOT EXISTS idx_followups_date ON follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_targets_branch ON targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_targets_employee ON targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_noc_incidents_branch ON noc_incidents(branch_id);
CREATE INDEX IF NOT EXISTS idx_noc_incidents_status ON noc_incidents(status);
CREATE INDEX IF NOT EXISTS idx_noc_incidents_priority ON noc_incidents(priority);
CREATE INDEX IF NOT EXISTS idx_noc_updates_incident ON noc_incident_updates(incident_id);

-- ============================================================
-- GOODS ITEMS & REQUISITION MODULE
-- ============================================================

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

-- ============================================================
-- Discussion Box Module (Branch <-> Operations Discussions)
-- ============================================================
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

-- ============================================================
-- PODs Module (POD = DC Locations & Independent Equipment/Items)
-- ============================================================
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

-- ============================================================
-- Electricity Meter Module
-- ============================================================
CREATE TABLE IF NOT EXISTS electricity_meters (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    meter_number VARCHAR(100) NOT NULL,
    meter_type VARCHAR(50) NOT NULL DEFAULT 'Main', -- 'Main', 'Sub-meter', 'Generator', 'POP/DC', 'Other'
    location VARCHAR(255),
    installation_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive'
    description TEXT,
    remarks TEXT,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS electricity_readings (
    id SERIAL PRIMARY KEY,
    meter_id INTEGER NOT NULL REFERENCES electricity_meters(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    previous_reading NUMERIC(14, 2),
    current_reading NUMERIC(14, 2) NOT NULL,
    units_used NUMERIC(14, 2) NOT NULL DEFAULT 0,
    is_reset BOOLEAN DEFAULT FALSE,
    reset_reason TEXT,
    image_url TEXT,
    remarks TEXT,
    recorded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS electricity_payments (
    id SERIAL PRIMARY KEY,
    meter_id INTEGER NOT NULL REFERENCES electricity_meters(id) ON DELETE CASCADE,
    reading_id INTEGER REFERENCES electricity_readings(id) ON DELETE SET NULL,
    bill_number VARCHAR(100),
    bill_date DATE NOT NULL,
    due_date DATE,
    billed_units NUMERIC(14, 2) DEFAULT 0,
    rate_per_unit NUMERIC(10, 2) DEFAULT 0,
    bill_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    paid_units NUMERIC(14, 2) DEFAULT 0,
    due_units NUMERIC(14, 2) DEFAULT 0,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'
    payment_date DATE,
    payment_method VARCHAR(50), -- 'Online', 'Bank Transfer', 'Cash', 'Cheque', 'Other'
    bill_image_url TEXT,
    receipt_image_url TEXT,
    remarks TEXT,
    recorded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_elec_meters_branch ON electricity_meters(branch_id);
CREATE INDEX IF NOT EXISTS idx_elec_meters_status ON electricity_meters(status);
CREATE INDEX IF NOT EXISTS idx_elec_readings_meter ON electricity_readings(meter_id);
CREATE INDEX IF NOT EXISTS idx_elec_readings_date ON electricity_readings(reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_elec_payments_meter ON electricity_payments(meter_id);
CREATE INDEX IF NOT EXISTS idx_elec_payments_status ON electricity_payments(payment_status);

-- ============================================================
-- Share Information Module
-- ============================================================
CREATE TABLE IF NOT EXISTS information (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- 'RULE', 'HOLIDAY', 'PACKAGE', 'PLAN', 'MEETING', 'NOTICE', 'INSTRUCTION', 'MAINTENANCE', 'GENERAL'
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'SCHEDULED', 'EXPIRED'
    target_type VARCHAR(20) NOT NULL DEFAULT 'ALL_BRANCHES', -- 'ALL_BRANCHES', 'SELECTED_BRANCHES'
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    content TEXT NOT NULL,
    image_url TEXT,
    attachment_url TEXT,
    publish_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS information_branches (
    id SERIAL PRIMARY KEY,
    information_id INTEGER NOT NULL REFERENCES information(id) ON DELETE CASCADE,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE(information_id, branch_id)
);

CREATE TABLE IF NOT EXISTS information_reads (
    id SERIAL PRIMARY KEY,
    information_id INTEGER NOT NULL REFERENCES information(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(information_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_information_status ON information(status);
CREATE INDEX IF NOT EXISTS idx_information_type ON information(type);
CREATE INDEX IF NOT EXISTS idx_information_pinned ON information(is_pinned);
CREATE INDEX IF NOT EXISTS idx_information_publish_at ON information(publish_at DESC);
CREATE INDEX IF NOT EXISTS idx_info_branches_info ON information_branches(information_id);
CREATE INDEX IF NOT EXISTS idx_info_branches_branch ON information_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_info_reads_user ON information_reads(user_id, information_id);



