export type Role = 'Super Admin' | 'Management' | 'Branch Manager' | 'Staff' | 'SUPER_ADMIN' | 'MANAGEMENT' | 'BRANCH_MANAGER' | 'STAFF' | string;

export interface User {
  id: number;
  name?: string;
  fullName?: string;
  full_name?: string;
  employeeId?: string;
  employee_id?: string;
  username: string;
  email: string;
  phone?: string;
  role: Role | any;
  roleId?: number | null;
  role_id?: number | null;
  roleName?: string;
  role_name?: string;
  status?: string;
  branch_id?: number | null;
  branchId?: number | null;
  branch_name?: string;
  branchName?: string;
  branch_code?: string;
  branchCode?: string;
  designation_id?: number | null;
  designationId?: number | null;
  designation?: string;
  designationName?: string;
  designation_name?: string;
  department_id?: number | null;
  departmentId?: number | null;
  department?: string;
  departmentName?: string;
  department_name?: string;
  departmentCode?: string;
  department_code?: string;
  profilePhoto?: string;
  profile_photo?: string;
  notes?: string;
  permissions?: Record<string, boolean>;
  allowed_branches?: string | null;
  allowedBranches?: string | null;
  assignedBranchIds?: number[];
  assigned_branch_ids?: number[];
  assignedBranches?: { id: number; name: string; code?: string; city?: string }[];
  assigned_branches?: { id: number; name: string; code?: string; city?: string }[];
  last_login?: string | null;
  lastLogin?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminUser {
  id: number;
  employee_id: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  status: 'Active' | 'Disabled' | 'Inactive';
  role: string;
  role_id: number | null;
  role_name?: string;
  department_id: number | null;
  department_name?: string;
  department_code?: string;
  branch_id: number | null;
  primary_branch_name?: string;
  allowed_branches?: string;
  assigned_branches?: { id: number; name: string; code?: string; city?: string }[];
  last_login?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleItem {
  id: number;
  name: string;
  description?: string;
  department_id?: number | null;
  department_name?: string;
  department_code?: string;
  status: 'Active' | 'Inactive';
  is_system: boolean;
  users_count?: number;
  permissions_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionItem {
  id: number;
  module: string;
  name: string;
  permission_key: string;
  description?: string;
  status?: string;
  created_at?: string;
}

export interface RolePermissionMatrixResponse {
  success: boolean;
  roles: RoleItem[];
  permissions: PermissionItem[];
  matrix: Record<number, number[]>;
}

export interface AdminDetailResponse {
  success: boolean;
  admin: AdminUser;
  rolePermissions: Record<string, boolean>;
  individualOverrides: Record<string, { allowed: boolean; overrideType: string }>;
  effectivePermissions: Record<string, { allowed: boolean; source: 'ROLE' | 'OVERRIDE'; overrideType?: string }>;
  allPermissions: PermissionItem[];
}

export interface DepartmentItem {
  id: number;
  name: string;
  code: 'OPERATION' | 'NOC' | 'BRANCHES' | string;
  description?: string;
  active_users_count?: number;
  roles_count?: number;
}

export interface Branch {
  id: number;
  code: string;
  name: string;
  address: string;
  city: string;
  province: string;
  contact_number: string;
  email: string;
  manager_id?: number | null;
  manager_name?: string;
  opening_date: string;
  status: 'Active' | 'Inactive';
  description?: string;
  active_staff_count?: number;
  open_tasks_count?: number;
}

export interface Designation {
  id: number;
  name: string;
  code: string;
  department_id?: number | null;
  description?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'New' | 'Assigned' | 'Acknowledged' | 'In Progress' | 'Completed' | 'Rejected' | 'Cancelled' | 'Closed' | 'Overdue';

export interface AssignedStaffMember {
  id?: number;
  staff_id?: number;
  full_name: string;
  employee_id?: string | null;
  phone?: string | null;
  role?: string | null;
  designation_name?: string | null;
  is_primary?: boolean;
}

export interface Task {
  id: number;
  task_id: string;
  title: string;
  description?: string;
  category: string;
  branch_id: number;
  branch_name?: string;
  branch_code?: string;
  assigned_to_id?: number | null;
  assigned_to_name?: string;
  assigned_staff?: AssignedStaffMember[];
  created_by_id?: number | null;
  created_by_name?: string;
  priority: TaskPriority;
  start_date: string;
  due_date: string;
  status: TaskStatus;
  completion_date?: string | null;
  completion_remarks?: string | null;
  attachments?: string | null;
  is_overdue?: boolean;
  comments_count?: number;
  created_at?: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  author_name: string;
  author_role: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface TaskHistory {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  from_status?: string | null;
  to_status: string;
  remarks?: string | null;
  created_at: string;
}

export type ConnectionStatus =
  | 'New Request'
  | 'Contacted'
  | 'Site Survey Required'
  | 'Site Survey Completed'
  | 'Documents Pending'
  | 'Installation Pending'
  | 'Installation Scheduled'
  | 'Installed'
  | 'Activated'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export interface Connection {
  id: number;
  connection_id: string;
  customer_name: string;
  customer_id?: string;
  phone: string;
  email?: string;
  address: string;
  branch_id: number;
  branch_name?: string;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string;
  assigned_staff?: AssignedStaffMember[];
  connection_type: string;
  package_plan: string;
  request_date: string;
  site_survey_date?: string | null;
  installation_date?: string | null;
  activation_date?: string | null;
  completion_date?: string | null;
  status: ConnectionStatus;
  remarks?: string;
}

export interface ConnectionMetrics {
  total: number;
  counts: Record<string, number>;
  conversionRate: number;
  completionRate: number;
  avgCompletionDays: string;
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Waiting for Technician'
  | 'Escalated'
  | 'Resolved'
  | 'Closed'
  | 'Cancelled';

export interface SupportTicket {
  id: number;
  ticket_id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  branch_id: number;
  branch_name?: string;
  issue_category: string;
  description: string;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_date: string;
  due_date?: string;
  resolution?: string;
  closing_date?: string;
  resolution_time_minutes?: number;
  is_overdue?: boolean;
  comments_count?: number;
}

export interface FollowUp {
  id: number;
  follow_up_id: string;
  branch_id: number;
  branch_name?: string;
  related_customer_case?: string;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string;
  type: string;
  description: string;
  follow_up_date: string;
  priority: string;
  status: 'Pending' | 'Contacted' | 'Waiting' | 'Completed' | 'Failed' | 'Cancelled';
  result?: string;
  next_follow_up_date?: string;
  notes?: string;
  is_overdue?: boolean;
}

export interface Instruction {
  id: number;
  instruction_id: string;
  title: string;
  description: string;
  sender_id?: number;
  sender_name?: string;
  sender_role?: string;
  recipient_type: 'Branch' | 'Branch Manager' | 'Individual Staff' | 'Multiple Staff';
  branch_id: number;
  branch_name?: string;
  recipient_staff_id?: number;
  recipient_staff_name?: string;
  priority: string;
  due_date?: string;
  status: 'New' | 'Acknowledged' | 'In Progress' | 'Completed';
  remarks?: string;
  attachments?: string;
  created_at: string;
  acknowledged_at?: string;
  completed_at?: string;
}

export interface Target {
  id: number;
  target_id: string;
  target_name: string;
  category: string;
  description?: string;
  branch_id: number;
  branch_name?: string;
  employee_id?: number | null;
  employee_name?: string;
  period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  target_value: number;
  achieved_value: number;
  achievement_percentage: number;
  start_date: string;
  end_date: string;
  status: 'Not Started' | 'In Progress' | 'Achieved' | 'Partially Achieved' | 'Missed';
  remarks?: string;
}

export interface StaffPerformance {
  staffId: number;
  employeeId: string;
  fullName: string;
  username: string;
  designation: string;
  department: string;
  branchId: number | null;
  branchName: string;
  totalAssignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  onTimeCompletedTasks: number;
  lateCompletedTasks: number;
  taskCompletionRate: number;
  onTimeRate: number;
  targetAchievementRate: number;
  supportPerformanceRate: number;
  overallScore: number;
  rank?: number;
}

export interface BranchPerformance {
  branchId: number;
  branchCode: string;
  branchName: string;
  city: string;
  province: string;
  totalStaff: number;
  activeStaff: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  taskCompletionRate: number;
  onTimeRate: number;
  targetAchievementRate: number;
  supportPerformanceRate: number;
  followUpPerformanceRate: number;
  overallScore: number;
  rank?: number;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  username?: string;
  user_role?: string;
  action: string;
  module: string;
  record_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export type NocPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type NocStatus = 'Reported' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Closed';

export interface NocIncidentUpdate {
  id: number;
  incident_id: number;
  user_id?: number | null;
  user_name?: string;
  user_role?: string;
  update_text: string;
  status_change?: string | null;
  created_at: string;
}

export interface NocIncident {
  id: number;
  incident_id: string;
  title: string;
  issue_type: string;
  complain_by_name?: string | null;
  suggestions?: string | null;
  branch_id?: number | null;
  branch_name?: string;
  branch_code?: string;
  pop_location?: string | null;
  affected_services?: string | null;
  affected_customers_count?: number;
  priority: NocPriority;
  status: NocStatus;
  reported_by_id?: number | null;
  reported_by_name?: string;
  reported_by_email?: string;
  reported_by_phone?: string;
  assigned_noc_engineer_id?: number | null;
  assigned_noc_engineer_name?: string;
  assigned_noc_engineer_phone?: string;
  description: string;
  impact_details?: string | null;
  estimated_resolution_time?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  root_cause_analysis?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoodsItem {
  id: number;
  name: string;
  category: string;
  description?: string;
  unit: string;
  quantity_type: 'Integer' | 'Decimal';
  active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export type GoodsRequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'ACCEPTED'
  | 'PARTIALLY ACCEPTED'
  | 'DENIED'
  | 'COMPLETED'
  | 'CANCELLED';

export type GoodsRequestPriority = 'Normal' | 'Urgent' | 'Critical';

export interface GoodsRequestItem {
  id: number;
  request_id: number;
  goods_item_id?: number | null;
  item_name_snapshot: string;
  unit_snapshot: string;
  quantity_type_snapshot: 'Integer' | 'Decimal';
  requested_quantity: number;
  approved_quantity?: number | null;
  delivered_quantity?: number;
  item_description?: string | null;
  item_status: 'PENDING' | 'ACCEPTED' | 'PARTIAL' | 'DENIED';
  operation_remark?: string | null;
  category?: string;
  item_is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface GoodsRequestHistory {
  id: number;
  request_id: number;
  user_id?: number | null;
  user_name?: string;
  username?: string;
  action: string;
  previous_status?: string | null;
  new_status?: string | null;
  remarks?: string | null;
  created_at: string;
}

export interface GoodsRequest {
  id: number;
  request_number: string;
  branch_id: number;
  branch_name?: string;
  branch_code?: string;
  branch_city?: string;
  requested_by?: number | null;
  requested_by_name?: string;
  requested_by_username?: string;
  requested_by_email?: string;
  requested_by_phone?: string;
  priority: GoodsRequestPriority;
  status: GoodsRequestStatus;
  required_by?: string | null;
  remarks?: string | null;
  approved_by?: number | null;
  approved_by_name?: string;
  approved_at?: string | null;
  approval_remarks?: string | null;
  denied_by?: number | null;
  denied_by_name?: string;
  denied_at?: string | null;
  denial_reason?: string | null;
  completed_by?: number | null;
  completed_by_name?: string;
  completed_at?: string | null;
  completion_remarks?: string | null;
  items_count?: number;
  items_preview?: string;
  items?: GoodsRequestItem[];
  history?: GoodsRequestHistory[];
  created_at: string;
  updated_at: string;
}

export interface GoodsRequestStats {
  pendingCount: number;
  urgentCount: number;
  acceptedCount: number;
  partiallyAcceptedCount: number;
  deniedCount: number;
  awaitingFulfillmentCount: number;
  completedCount: number;
  totalCount: number;
}

export type DiscussionStatus = 'OPEN' | 'CLOSED';
export type DiscussionPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface DiscussionMessage {
  id: number;
  topic_id: number;
  sender_id?: number | null;
  sender_name?: string;
  sender_username?: string;
  sender_role?: string;
  sender_phone?: string;
  sender_branch_id?: number | null;
  sender_branch_name?: string;
  sender_department_name?: string;
  sender_department_code?: string;
  message: string;
  image_url?: string | null;
  is_internal?: boolean | number;
  created_at: string;
}

export interface DiscussionTopic {
  id: number;
  topic_number: string;
  title: string;
  category: string;
  priority: DiscussionPriority;
  status: DiscussionStatus;
  branch_id: number;
  branch_name?: string;
  branch_code?: string;
  branch_city?: string;
  created_by_id?: number | null;
  created_by_name?: string;
  created_by_username?: string;
  created_by_role?: string;
  created_by_phone?: string;
  created_by_department?: string;
  initial_message: string;
  image_url?: string | null;
  closed_by_id?: number | null;
  closed_by_name?: string;
  closed_at?: string | null;
  closure_reason?: string | null;
  message_count?: number;
  last_message?: {
    id: number;
    message: string;
    image_url?: string | null;
    created_at: string;
    sender_name?: string;
    sender_role?: string;
  };
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export type PodStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Temporarily Unavailable';
export type PodType = 'Residential' | 'Commercial' | 'Other';
export type PodItemStatus = 'Active' | 'Inactive';

export interface PodItem {
  id: number;
  pod_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  description?: string | null;
  status: PodItemStatus;
  remarks?: string | null;
  created_by_id?: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PodHistory {
  id: number;
  pod_id: number;
  user_id?: number | null;
  user_name?: string;
  user_username?: string;
  user_role?: string;
  action: string;
  details: string;
  created_at: string;
}

export interface Pod {
  id: number;
  name: string;
  status: PodStatus;
  pod_type: PodType;
  latitude?: number | null;
  longitude?: number | null;
  house_owner_name?: string | null;
  house_owner_contact?: string | null;
  house_owner_alt_contact?: string | null;
  address?: string | null;
  property_description?: string | null;
  relative_name?: string | null;
  relative_relationship?: string | null;
  relative_contact?: string | null;
  relative_alt_contact?: string | null;
  installation_date?: string | null;
  access_information?: string | null;
  access_restrictions?: string | null;
  key_holder?: string | null;
  key_holder_contact?: string | null;
  power_available: boolean;
  backup_power_available: boolean;
  backup_power_type?: string | null;
  power_remarks?: string | null;
  equipment_location?: string | null;
  physical_location_description?: string | null;
  description?: string | null;
  remarks?: string | null;
  created_by_id?: number | null;
  created_by_name?: string | null;
  created_by_username?: string | null;
  items_count?: number;
  total_items_count?: number;
  items_preview?: string | null;
  recent_items?: PodItem[];
  created_at: string;
  updated_at: string;
}

export interface PodStats {
  totalPods: number;
  active: number;
  maintenance: number;
  inactive: number;
  unavailable: number;
}


