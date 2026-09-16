# Fiber World Operations Platform (FWCPL)
### Production-Ready Branch & Operations Management System for 20+ Branches

[![Node.js Version](https://img.shields.io/badge/node.js-v20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2016-blue.svg)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/typescript-v5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/styling-Tailwind%20v3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()

A comprehensive, internal operations platform engineered for **Fiber World Communication Pvt. Ltd. (FWCPL)** to run multi-branch internet service provider operations across Nepal. Built for executive management, branch managers, technicians, support staff, and field sales teams.

---

## Table of Contents
1. [Project Overview & Architectural Design](#1-project-overview--architectural-design)
2. [Complete Project Structure](#2-complete-project-structure)
3. [Technology Stack & Rationale](#3-technology-stack--rationale)
4. [Database Schema & Entity Relationship](#4-database-schema--entity-relationship)
5. [Complete API Endpoints Reference](#5-complete-api-endpoints-reference)
6. [Authentication & Multi-Tenant Authorization](#6-authentication--multi-tenant-authorization)
7. [Role & Permission Matrix](#7-role--permission-matrix)
8. [Module Walkthrough & Workflows](#8-module-walkthrough--workflows)
9. [Mathematical Scoring & Podium Engine](#9-mathematical-scoring--podium-engine)
10. [Customer Connection 8-Stage Pipeline](#10-customer-connection-8-stage-pipeline)
11. [Task Lifecycle & Review Gates](#11-task-lifecycle--review-gates)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Local Development Instructions](#13-local-development-instructions)
14. [Docker Compose Self-Hosting](#14-docker-compose-self-hosting)
15. [Ubuntu Production Server Deployment](#15-ubuntu-production-server-deployment)
16. [Database Backup & Disaster Recovery](#16-database-backup--disaster-recovery)
17. [Creating the First Super Admin](#17-creating-the-first-super-admin)
18. [Adding Branches & Staff](#18-adding-branches--staff)
19. [Transitioning from Demo Data to Production](#19-transitioning-from-demo-data-to-production)
20. [Limitations & Future Roadmap](#20-limitations--future-roadmap)

---

## 1. Project Overview & Architectural Design

The platform delivers real-time operational control across 20+ branches with strict branch data isolation, role-based access control (RBAC), multi-stage pipeline management, automated overdue SLA alerts, and a dynamic weighted performance calculation engine.

### Key Highlights:
- **Zero-Mockup Guarantee**: 100% of tables, forms, filters, podiums, and actions connect directly to database models.
- **Dual-Engine Persistence**: Connects to PostgreSQL 16 in staging/production, with automatic embedded SQLite fallback (`better-sqlite3`) for instant zero-dependency local development.
- **Role-Tailored Dashboards**: Distinct executive, branch-manager, and technician workflows.
- **3D Interactive Podiums**: Top Task Completers & Top Performing Branches with dynamic gold (🥇), silver (🥈), and bronze (🥉) pedestals.

---

## 2. Complete Project Structure

```
Operation-fwcpl/
├── .env.example                     # Root environment template
├── .env                             # Active environment configuration
├── docker-compose.yml               # Multi-container orchestration (DB, API, Web)
├── package.json                     # Monorepo runner scripts
├── DEPLOYMENT.md                    # Ubuntu Linux 22.04/24.04 deployment manual
├── README.md                        # Complete master documentation
├── scripts/
│   ├── backup-db.sh                 # Database backup script (PostgreSQL & SQLite)
│   ├── restore-db.sh                # Database restore utility
│   └── run-acceptance-tests.sh      # 30-step end-to-end acceptance test runner
├── backend/
│   ├── Dockerfile                   # Node.js production image
│   ├── package.json                 # Backend dependencies (Express, pg, sqlite3, JWT)
│   ├── tsconfig.json                # TypeScript compiler configuration
│   ├── data/                        # Persistent local SQLite storage
│   ├── uploads/                     # Uploaded documents and attachments
│   └── src/
│       ├── index.ts                 # Express HTTP server bootstrap
│       ├── config/index.ts          # Centralized configuration & environment loader
│       ├── models/
│       │   ├── schema.sql           # PostgreSQL DDL with 15 tables, indexes & constraints
│       │   └── database.ts          # Dual-engine database adapter (pg / better-sqlite3)
│       ├── middleware/
│       │   ├── auth.ts              # JWT verification & branch tenancy RBAC checks
│       │   ├── audit.ts             # Activity logging interceptor
│       │   └── upload.ts            # Multer file attachment handler
│       ├── services/
│       │   └── calculationService.ts # Performance scoring, podiums, SLA & pipeline metrics
│       ├── seeds/
│       │   ├── demoData.ts          # Seed dataset: 5 branches, 22 employees, 120+ entities
│       │   └── runSeed.ts           # Seeder execution script
│       ├── tests/
│       │   └── acceptance.test.ts   # 30-step automated validation test suite
│       └── routes/
│           ├── auth.routes.ts       # Authentication, login, me, logout
│           ├── branches.routes.ts   # Branch management & dedicated dashboard stats
│           ├── staff.routes.ts      # Staff directory, designations, departments
│           ├── tasks.routes.ts      # Task lifecycle, assignment, review approve/reject
│           ├── connections.routes.ts# 8-stage connection pipeline & conversions
│           ├── tickets.routes.ts    # Support tickets, SLA trackers, resolutions
│           ├── followups.routes.ts  # Follow-ups, outcome tracking, reminders
│           ├── instructions.routes.ts# Management directives & acknowledgements
│           ├── targets.routes.ts    # Targets/KPIs & achievement progress
│           ├── performance.routes.ts# Dynamic scoring weights & podium endpoints
│           ├── dashboard.routes.ts  # Executive, branch manager, and staff dashboard APIs
│           ├── reports.routes.ts    # 9 enterprise reports with CSV export
│           ├── notifications.routes.ts# In-app notifications & mark-read
│           ├── audit.routes.ts      # Security audit log reader
│           ├── search.routes.ts     # Global omni-search across all entities
│           └── settings.routes.ts   # Company metadata, weights, demo reset
└── frontend/
    ├── Dockerfile                   # Multi-stage Vite + Nginx image
    ├── nginx.conf                   # Production Nginx reverse proxy configuration
    ├── package.json                 # React 18, Tailwind, Lucide Icons, Vite
    ├── tsconfig.json                # Frontend TypeScript configuration
    ├── vite.config.ts               # Vite bundler & API dev proxy configuration
    ├── tailwind.config.js           # Responsive brand theme and custom colors
    ├── postcss.config.js
    ├── index.html                   # HTML entry
    └── src/
        ├── main.tsx                 # React DOM root render
        ├── App.tsx                  # Master application router & responsive layout
        ├── index.css                # Global stylesheet & Tailwind directives
        ├── types/index.ts           # Complete TypeScript interfaces
        ├── api/client.ts            # Typed Axios/Fetch API client with JWT interception
        ├── context/
        │   ├── AuthContext.tsx      # Auth state provider with 1-click demo switcher
        │   └── NotificationContext.tsx # Polling notification state & unread badge
        ├── components/
        │   ├── common/
        │   │   ├── Badge.tsx        # StatusBadge & PriorityBadge components
        │   │   ├── Modal.tsx        # Accessible backdrop modal dialog
        │   │   ├── StatCard.tsx     # Reusable KPI card with trend indicator
        │   │   └── ProgressBar.tsx  # Dynamic progress bar with color thresholds
        │   ├── podium/
        │   │   ├── TaskPodium.tsx   # Top Task Completers 3D Podium (🥇, 🥈, 🥉)
        │   │   └── BranchPodium.tsx # Top Performing Branch 3D Podium (🥇, 🥈, 🥉)
        │   ├── leaderboard/
        │   │   ├── StaffLeaderboard.tsx  # Staff leaderboard table
        │   │   └── BranchLeaderboard.tsx # Branch leaderboard table
        │   └── layout/
        │       ├── Navbar.tsx       # Top navbar with global search trigger & notifications
        │       ├── Sidebar.tsx      # Role-filtered navigation sidebar (14 modules)
        │       └── GlobalSearchModal.tsx # Global omni-search dialog
        └── pages/
            ├── Login.tsx            # Login portal with 1-click role chips
            ├── Dashboard.tsx        # Executive Master Dashboard
            ├── BranchDashboard.tsx  # Dedicated Branch Manager Command Center
            ├── StaffDashboard.tsx   # Dedicated Staff Task & Target Workspace
            ├── Branches.tsx         # Branch directory & creation modal
            ├── Staff.tsx            # Staff directory, designations, and departments
            ├── Tasks.tsx            # Task management & review workflow
            ├── Connections.tsx      # 8-stage customer connection pipeline
            ├── Tickets.tsx          # Support ticket desk with SLA timers
            ├── FollowUps.tsx        # Follow-up tracker & outcome logger
            ├── Instructions.tsx     # Management directives & acknowledgments
            ├── Targets.tsx          # Target & KPI progress tracker
            ├── Reports.tsx          # 9 enterprise reports with real CSV export
            ├── Notifications.tsx    # Notification center
            ├── AuditLogs.tsx        # Security audit trail viewer
            ├── Settings.tsx         # Scoring weights & company configurations
            └── Profile.tsx          # User profile & password reset
```

---

## 3. Technology Stack & Rationale

| Layer | Technology | Rationale |
|---|---|---|
| **Backend API** | Node.js 20 LTS + Express | High I/O concurrency, non-blocking asynchronous event loop, fast throughput for multi-branch operations. |
| **Language** | TypeScript 5.3 | Static type safety, shared domain interfaces between client and server, eliminates runtime type errors. |
| **Database** | PostgreSQL 16 (Primary) + SQLite (Fallback) | Enterprise-grade ACID compliance, jsonb indexing, relational integrity; zero-setup fallback for development. |
| **Authentication** | JWT (JSON Web Tokens) + Bcrypt | Stateless authentication, horizontal scalability across distributed nodes, salted cryptographic hashing. |
| **Frontend Framework** | React 18 + Vite | Fast HMR, reactive state management, modular component architecture. |
| **Styling** | Tailwind CSS v3.4 | Utility-first CSS, clean responsive design across desktop, tablet, and mobile displays. |
| **Icons** | Lucide React | Consistent, lightweight SVG iconography across all 14 modules. |
| **File Storage** | Local Disk / Docker Volume (Multer) | Zero external cloud dependency for self-hosted intranet ISP installations. |

---

## 4. Database Schema & Entity Relationship

The database schema contains 15 relational tables with foreign keys, cascading rules, and performance indexes.

```
       ┌──────────────────┐
       │     branches     │
       └────────┬─────────┘
                │ 1:N
    ┌───────────┼────────────────────────────────────┐
    ▼           ▼                                    ▼
┌────────┐ ┌─────────────┐                      ┌─────────┐
│ users  │ │ connections │                      │ targets │
└───┬────┘ └─────────────┘                      └─────────┘
    │ 1:N
    ├──────────────────────┬─────────────────────┐
    ▼                      ▼                     ▼
┌────────┐           ┌───────────┐         ┌───────────┐
│ tasks  │           │  tickets  │         │ followups │
└───┬────┘           └─────┬─────┘         └───────────┘
    │ 1:N                  │ 1:N
    ▼                      ▼
┌──────────────┐     ┌──────────────┐
│task_comments │     │ticket_comments│
└──────────────┘     └──────────────┘
```

### Table Definitions:

1. **`branches`**: Stores branch code, name, district, address, phone, email, is_active, created_at.
2. **`departments`**: Organizational departments (Operations, Technical, Customer Support, Sales, Accounts).
3. **`designations`**: Staff job titles (Branch Manager, Senior Fiber Technician, Support Officer, Sales Exec).
4. **`users`**: User credentials, password_hash, role (`Super Admin`, `Management`, `Branch Manager`, `Staff`), branch_id, designation_id, department_id, email, phone, is_active.
5. **`tasks`**: Title, description, branch_id, assigned_to, created_by, priority (`Urgent`, `High`, `Normal`, `Low`), status (`New`, `Assigned`, `Acknowledged`, `In Progress`, `Completed`, `Closed`, `Rejected`), due_date, completed_at, review_remarks.
6. **`task_comments`**: Internal remarks, thread comments, user_id, task_id.
7. **`connections`**: Customer connection pipeline (customer_name, phone, address, branch_id, package_name, stage: `Lead`, `Survey Pending`, `Survey Completed`, `Feasibility Approved`, `Installation Scheduled`, `Installation in Progress`, `Connected / Activated`, `Cancelled`), assigned_technician_id, remarks.
8. **`tickets`**: Customer support issues (ticket_no, customer_name, customer_id, branch_id, assigned_to, category, priority, status: `Open`, `In Progress`, `Resolved`, `Closed`), sla_hours, resolved_at.
9. **`ticket_comments`**: Technician work notes, resolution remarks, attachments.
10. **`followups`**: Scheduled customer touchpoints (entity_type, entity_id, customer_name, phone, branch_id, assigned_to, scheduled_date, status: `Pending`, `Completed`, `Cancelled`), outcome.
11. **`management_instructions`**: Directives issued by executive management (title, description, target_branch_id, issued_by, priority, status: `Issued`, `Acknowledged`, `Completed`), deadline, completion_remarks.
12. **`instruction_comments`**: Communication thread regarding executive instructions.
13. **`targets`**: KPIs for branch or individual staff (title, target_type: `Branch` / `Individual`, branch_id, user_id, metric_name, target_value, achieved_value, unit, period: `Monthly`, `Quarterly`, `Yearly`), start_date, end_date.
14. **`notifications`**: In-app notifications (user_id, title, message, link, is_read, created_at).
15. **`audit_logs`**: Chronological trail of actions (user_id, action, entity_type, entity_id, description, details, ip_address, created_at).

---

## 5. Complete API Endpoints Reference

All endpoints (except `/api/auth/login`) require the `Authorization: Bearer <JWT>` header.

### Authentication & Profiles
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates user; returns JWT token & profile |
| `GET` | `/api/auth/me` | All Authenticated | Returns current authenticated user profile |
| `POST` | `/api/auth/password` | All Authenticated | Updates current user password |
| `GET` | `/api/auth/demo-users` | Public | Returns pre-seeded demo user accounts |

### Branches & Tenancy
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/branches` | All Authenticated | Lists all branches with counts |
| `GET` | `/api/branches/:id` | All Authenticated | Returns branch details & manager info |
| `POST` | `/api/branches` | Super Admin, Management | Creates a new branch |
| `PUT` | `/api/branches/:id` | Super Admin, Management | Updates branch info |
| `GET` | `/api/branches/:id/dashboard` | All Authenticated | Returns dedicated branch dashboard metrics |

### Staff Management
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/staff` | All Authenticated | Lists staff members (filtered by branch for BMs) |
| `GET` | `/api/staff/:id` | All Authenticated | Returns staff details, active tasks, targets |
| `POST` | `/api/staff` | Super Admin, Management, BM | Creates a new staff member |
| `PUT` | `/api/staff/:id` | Super Admin, Management, BM | Updates staff profile |
| `GET` | `/api/staff/meta/designations`| All Authenticated | Returns designations list |
| `GET` | `/api/staff/meta/departments` | All Authenticated | Returns departments list |

### Tasks & Workflows
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | All Authenticated | Lists tasks with filters (branch, status, priority) |
| `GET` | `/api/tasks/:id` | All Authenticated | Returns task detail, comments, history |
| `POST` | `/api/tasks` | Super Admin, Management, BM | Creates and assigns a new task |
| `PUT` | `/api/tasks/:id/status` | All Authenticated | Transitions task status (with remarks) |
| `PUT` | `/api/tasks/:id/reassign` | Super Admin, Management, BM | Reassigns task to another staff member |
| `POST` | `/api/tasks/:id/comments` | All Authenticated | Adds a comment or work remark |

### Customer Connections Pipeline
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/connections` | All Authenticated | Lists connections with stage filters |
| `GET` | `/api/connections/metrics` | All Authenticated | Returns funnel conversion metrics |
| `POST` | `/api/connections` | All Authenticated | Registers a new connection lead |
| `PUT` | `/api/connections/:id/stage`| All Authenticated | Advances pipeline stage with remarks |

### Customer Support Tickets
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/tickets` | All Authenticated | Lists tickets with SLA status |
| `POST` | `/api/tickets` | All Authenticated | Opens a new support ticket |
| `PUT` | `/api/tickets/:id/resolve` | All Authenticated | Resolves ticket with resolution remarks |
| `POST` | `/api/tickets/:id/comments`| All Authenticated | Adds comment to ticket thread |

### Follow-ups & Reminders
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/followups` | All Authenticated | Lists scheduled follow-ups |
| `POST` | `/api/followups` | All Authenticated | Schedules a new follow-up |
| `PUT` | `/api/followups/:id/complete`| All Authenticated | Logs outcome (Won, Lost, Rescheduled) |

### Management Directives
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/instructions` | All Authenticated | Lists directives (global or branch-specific) |
| `POST` | `/api/instructions` | Super Admin, Management | Issues a new directive |
| `PUT` | `/api/instructions/:id/ack` | BM, Staff | Acknowledges receipt of directive |
| `PUT` | `/api/instructions/:id/complete`| BM, Staff | Marks directive done with completion remarks |
| `POST` | `/api/instructions/:id/comments`| All Authenticated | Adds communication comment to directive |

### Targets & KPIs
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/targets` | All Authenticated | Lists targets with achievement % |
| `POST` | `/api/targets` | Super Admin, Management, BM | Sets a new target for branch or staff |
| `PUT` | `/api/targets/:id/progress` | Super Admin, Management, BM | Updates achieved value |

### Performance & Podiums
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/performance/podium/tasks` | All Authenticated | Returns Top 3 Task Completers (🥇, 🥈, 🥉) |
| `GET` | `/api/performance/podium/branches`| All Authenticated | Returns Top 3 Performing Branches (🥇, 🥈, 🥉) |
| `GET` | `/api/performance/leaderboard/staff`| All Authenticated | Full staff ranked leaderboard |
| `GET` | `/api/performance/leaderboard/branches`| All Authenticated | Full branch ranked leaderboard |

### Reports & CSV Export
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/reports/:type` | Super Admin, Management, BM | Returns structured report JSON data |
| `GET` | `/api/reports/:type/csv` | Super Admin, Management, BM | Generates and downloads real CSV file |

### Global Omni-Search
| Method | URL | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/search?q=query` | All Authenticated | Cross-searches tasks, tickets, connections, branches, staff |

---

## 6. Authentication & Multi-Tenant Authorization

1. **Authentication Token**: Users log in with username and password. The server issues a signed JWT containing `id`, `username`, `role`, and `branch_id`.
2. **Branch Tenancy Enforcement**:
   - **Super Admin & Management**: Global view. They can inspect, filter, and modify entities across all 20+ branches.
   - **Branch Manager**: Scoped view. Can view, assign, and manage data **only for their assigned branch**. Attempts to query or mutate another branch's tasks or staff are rejected with HTTP 403 Forbidden.
   - **Staff**: Scoped view. Can see branch tasks and tickets, but their primary workspace isolates **tasks assigned directly to them**.

---

## 7. Role & Permission Matrix

| Module / Action | Super Admin | Management | Branch Manager | Staff / Technician |
|---|:---:|:---:|:---:|:---:|
| **Executive Dashboard & Global Stats** | Full | Full | Read (Branch Only) | My Stats Only |
| **Branch Directory** | Full CRUD | Full CRUD | Read-Only | Read-Only |
| **Staff Directory** | Full CRUD | Full CRUD | CRUD (Branch Staff) | Read Directory |
| **Task Creation & Assignment** | Create/Assign Any | Create/Assign Any | Create/Assign Branch | Read Assigned |
| **Task Review (Approve / Reject)** | Approve Any | Approve Any | Approve Branch Tasks| No |
| **Connections Pipeline Advance** | All Stages | All Stages | Branch Connections | Assigned Leads |
| **Support Tickets Resolution** | Resolve Any | Resolve Any | Branch Tickets | Assigned Tickets |
| **Issue Management Directives** | Yes | Yes | No | No |
| **Acknowledge Directives** | N/A | N/A | Yes | Yes |
| **Set Targets & KPIs** | Yes | Yes | Yes (Branch & Staff)| No |
| **Update Target Progress** | Yes | Yes | Yes | No |
| **Export Reports to CSV** | All 9 Reports | All 9 Reports | Branch Scoped | No |
| **Audit Logs Viewer** | Full Access | Full Access | No | No |
| **Configure Scoring Weights** | Yes | Yes | No | No |
| **Reset Demo Data** | Yes | No | No | No |

---

## 8. Module Walkthrough & Workflows

### 1. Master Executive Dashboard
- 4 High-level Stat Cards (Active Branches, Total Personnel, Month Connections, Open Tickets)
- Top Task Completers 3D Podium (with Today / This Week / This Month / All Time filters)
- Top Performing Branch 3D Podium
- Live Staff and Branch Leaderboards
- Quick Actions: Issue Directive, Set KPI, Create Task, New Connection

### 2. Branch Manager Command Center (`/branch-dashboard`)
- Real-time branch team status (technicians available vs dispatched)
- Today's pending connections and scheduled survey visits
- Overdue tasks and high-priority customer tickets
- Branch KPI monthly achievement gauge

### 3. Staff Workspace (`/staff-dashboard`)
- Focus view: "Assigned to Me"
- Quick status updater: Accept Task -> Start Work -> Submit for Review with evidence
- Daily scheduled customer follow-up calls

### 4. 8-Stage Customer Connection Pipeline (`/connections`)
- Visual stage badges from initial Lead generation to live Fiber Activation
- Advance stage modal with technician reassignment and notes

---

## 9. Mathematical Scoring & Podium Engine

Rankings are calculated dynamically via a weighted composite model:

$$\text{Composite Score} = (T_{\text{achieve}} \times W_T) + (T_{\text{vol}} \times W_V) + (O_{\text{rate}} \times W_O) + (S_{\text{rate}} \times W_S)$$

### Default Weight Allocation (Configurable via Settings):
- **Target Achievement Rate ($W_T$)**: **40%**
  $$\text{Target Rate} = \min\left(100, \frac{\text{Achieved Value}}{\text{Target Value}} \times 100\right)$$
- **Task Volume Completion Rate ($W_V$)**: **30%**
  $$\text{Task Rate} = \frac{\text{Completed Tasks}}{\text{Total Assigned Tasks}} \times 100$$
- **On-Time Delivery Rate ($W_O$)**: **15%**
  $$\text{On-Time Rate} = \frac{\text{Tasks Completed Before Due Date}}{\text{Total Completed Tasks}} \times 100$$
- **Support SLA Resolution Rate ($W_S$)**: **15%**
  $$\text{SLA Rate} = \frac{\text{Tickets Resolved Within SLA Hours}}{\text{Total Resolved Tickets}} \times 100$$

> Sum of weights is strictly validated: $40\% + 30\% + 15\% + 15\% = 100\%$.

---

## 10. Customer Connection 8-Stage Pipeline

```
[1. Lead Captured]
       │
       ▼
[2. Survey Pending] ──► Technician visits customer premise & measures fiber distance
       │
       ▼
[3. Survey Completed] ──► Feasibility report submitted
       │
       ▼
[4. Feasibility Approved] ──► Distribution Point (DP) port reserved
       │
       ▼
[5. Installation Scheduled] ──► Appointment confirmed with customer
       │
       ▼
[6. Installation in Progress] ──► Fiber drop cable strung, ONU / Router powered
       │
       ▼
[7. Connected / Activated] ──► PPPoE credentials tested & live optical power verified
       │
      (OR)
[8. Cancelled] ──► Reason documented (Customer declined, No optical line coverage)
```

---

## 11. Task Lifecycle & Review Gates

```
[New] ──► [Assigned] ──► [Acknowledged] ──► [In Progress]
                                                   │
                                                   ▼
                                         [Submitted for Review]
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         ▼                                                   ▼
                 [Review Approved]                                   [Review Rejected]
               (Status: "Completed")                               (Status: "In Progress")
                         │                                           (With feedback notes)
                         ▼
                  [Status: "Closed"]
```

Technicians cannot mark tasks "Completed" directly. They submit work with completion notes, requiring the Branch Manager or Management to review and approve.

---

## 12. Environment Variables Reference

| Variable | Default Value | Required | Description |
|---|---|:---:|---|
| `NODE_ENV` | `development` | Yes | Environment mode (`development` or `production`) |
| `PORT` | `5000` | Yes | Port for Express API server |
| `DB_HOST` | `localhost` (or `db`) | Yes | PostgreSQL hostname |
| `DB_PORT` | `5432` | Yes | PostgreSQL port |
| `DB_NAME` | `fwcpl_operations` | Yes | PostgreSQL database name |
| `DB_USER` | `fwcpl_admin` | Yes | PostgreSQL username |
| `DB_PASSWORD` | `SecureP@ssw0rd2026!` | Yes | PostgreSQL password |
| `JWT_SECRET` | `fiber-world-secret-key-2026` | Yes | Cryptographic secret for signing JWTs |
| `JWT_EXPIRES_IN` | `7d` | Yes | Token validity duration |
| `VITE_API_URL` | `/api` | Yes | API base URL for frontend client |

---

## 13. Local Development Instructions

You can run the entire platform locally with zero pre-existing database setup (it falls back to SQLite automatically):

```bash
# 1. Clone repository
cd /Users/rijankoirala/Operation-fwcpl

# 2. Install backend & frontend dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. Seed demo dataset (creates 5 branches, 22 employees, 120+ entities)
cd backend && npm run seed && cd ..

# 4. Start both servers concurrently
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`
- **Default Super Admin**: `superadmin` / `Password123!`

---

## 14. Docker Compose Self-Hosting

To launch the complete production stack (PostgreSQL 16 + Express API + Nginx Web App) in Docker:

```bash
# Build and run containers
docker compose up -d --build

# Verify container health
docker compose ps

# (Optional) Seed demo data inside the container
docker compose exec backend npm run seed
```

Access the application at `http://localhost` or `http://localhost:3000`.

---

## 15. Ubuntu Production Server Deployment

Follow the dedicated guide in [DEPLOYMENT.md](file:///Users/rijankoirala/Operation-fwcpl/DEPLOYMENT.md) for full instructions covering:
- Ubuntu Server 22.04 / 24.04 LTS installation
- Systemd service units
- Nginx reverse proxy configuration
- Automated Let's Encrypt SSL via Certbot
- UFW firewall hardening

---

## 16. Database Backup & Disaster Recovery

The platform includes automated backup and restore scripts in the `scripts/` directory:

### Create an Immediate Backup:
```bash
bash scripts/backup-db.sh
```
*Backups are saved to `./backups/postgres_backup_YYYYMMDD_HHMMSS.sql.gz` with a 30-day retention policy.*

### Restore from Backup:
```bash
bash scripts/restore-db.sh ./backups/postgres_backup_20260909_120000.sql.gz
```

---

## 17. Creating the First Super Admin

When deploying a fresh instance without seed data:

```bash
cd backend
npx ts-node -e "
import { db } from './src/models/database';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  const hash = await bcrypt.hash('YourSecurePasswordHere!', 10);
  await db.query(
    'INSERT INTO users (name, username, password_hash, role, is_active) VALUES (\$1, \$2, \$3, \$4, \$5)',
    ['System Administrator', 'admin', hash, 'Super Admin', true]
  );
  console.log('Super Admin successfully created!');
}
createAdmin();
"
```

---

## 18. Adding Branches & Staff

1. Log in as **Super Admin** or **Management**.
2. Navigate to **Branches (`/branches`)** -> Click **Add New Branch**. Enter Branch Name (e.g. `Biratnagar Branch`), Code (`BRT-01`), District, and Address.
3. Navigate to **Staff Directory (`/staff`)** -> Click **Add Staff Member**.
4. Select the assigned branch, role (`Branch Manager` or `Staff`), designation (`Fiber Technician`), and initial password.

---

## 19. Transitioning from Demo Data to Production

When ready to switch from trial/demo to real operations:
1. Log in as **Super Admin**.
2. Navigate to **Settings (`/settings`)** -> **System Maintenance**.
3. Clear transactional records or run database migrations:
   ```bash
   # Re-initialize clean schema
   docker compose exec -T db psql -U fwcpl_admin -d fwcpl_operations < backend/src/models/schema.sql
   ```
4. Create real branches, employee accounts, and company settings.

---

## 20. Limitations & Future Roadmap

### Current Design Scope:
- **File Storage**: Attachments are stored locally on server disk volumes.
- **Messaging**: In-app polling notifications (no third-party external dependency).

### Recommended Future Roadmap:
1. **Native Mobile App (React Native / Flutter)**: Offline caching and barcode scanning for fiber drop cables.
2. **SMS & WhatsApp Gateway Integration**: Automated SMS notifications to customers during connection progress.
3. **GPS Field Tracking**: Live map view of technicians in transit between fiber survey sites.
4. **S3-Compatible Cloud Storage**: AWS S3 / MinIO driver for multi-terabyte attachment archiving.

---

&copy; 2026 Fiber World Communication Pvt. Ltd. (FWCPL). All rights reserved.
# Operation-fwcpl
