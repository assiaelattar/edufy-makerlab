# EDUFY-MAKERLAB — Project Wiki & Living PRD

> **Living document.** This is the single source of truth for any developer (or AI assistant)
> working on this codebase. Update it every time a new feature ships, a module is changed,
> or an architectural decision is made.

---

## 1. What Is This Project?

**Edufy-Makerlab** is the digital backbone of **Makerlab Academy** (Casablanca) — a hands-on
educational makerspace for children and adults, focused on engineering, robotics, electronics,
coding, game design, and creative making.

The project is a **multi-tenant SaaS platform** running as a **monorepo**, consisting of:

1. **The ERP/CRM Core** — the operational engine (students, programs, finance, attendance, team).
2. **SparkQuest** — a gamified learning app for kids aged 7–17.
3. **Maker-Pro** — a professional e-learning app for adult learners.
4. **A public-facing website funnel** — lead magnet, booking page, enrollment form.

Everything lives under the `edufy-makerlab/` root. Sub-apps are in `/sparkquest` and `/maker-pro`.

---

## 2. Real Monorepo Structure

```
edufy-makerlab/
│
├── App.tsx                     ← Root app shell (router, enrollment wizard, payment modal)
├── index.tsx                   ← Entry point
├── index.html                  ← HTML shell
├── vite.config.ts              ← Root Vite config (port 5173, sw.js support)
├── tsconfig.json
├── package.json                ← Root dependencies (React 18, Firebase 10, framer-motion, etc.)
├── firestore.rules             ← ALL Firestore security rules (flat, non-tenant-path model)
├── firebase.json
├── vercel.json                 ← Deployment config
│
├── context/
│   ├── AppContext.tsx          ← Global state (all Firestore listeners, navigation)
│   ├── AuthContext.tsx         ← Auth, RBAC, organization resolution
│   ├── ConfirmContext.tsx      ← Confirm dialog context
│   ├── ModuleContext.tsx       ← Module-level context
│   └── NotificationContext.tsx ← Notification system
│
├── views/                      ← All admin/staff view components
│   ├── DashboardView.tsx
│   ├── StudentsView.tsx
│   ├── StudentDetailsView.tsx
│   ├── ProgramsView.tsx
│   ├── ProgramDetailsView.tsx
│   ├── ClassesView.tsx         ← Group/schedule management
│   ├── FinanceView.tsx         ← Payments, balances, transaction history
│   ├── ExpensesView.tsx        ← Expense management + templates
│   ├── AttendanceView (AbsenceView.tsx)
│   ├── StaffAbsenceView.tsx
│   ├── LearningView.tsx        ← Full LMS (project templates, student studio, review panel)
│   ├── CommunicationsView.tsx  ← WhatsApp messaging, templates, announcements
│   ├── MarketingView.tsx       ← CRM pipeline, lead management, campaigns
│   ├── TeamView.tsx            ← Staff tasks, projects, chat
│   ├── WorkshopsView.tsx       ← Workshop templates + mini-camp booking
│   ├── WorkshopQualityView.tsx ← Instructor quality scoring (AI-powered)
│   ├── ToolkitView.tsx         ← Curated tool links library
│   ├── MediaView.tsx           ← Gallery + archive links
│   ├── PickupView.tsx          ← Real-time student pickup queue
│   ├── SettingsView.tsx        ← Academy settings, team, roles, billing
│   ├── SaasAdminView.tsx       ← Super-admin: manage organizations
│   ├── AppStoreView.tsx        ← Module marketplace
│   ├── ParentDashboardView.tsx ← Parent portal (child progress, payments)
│   ├── LoginView.tsx           ← Admin + staff login
│   ├── ParentLoginView.tsx     ← Parent login
│   ├── ReviewView.tsx          ← Instructor project review
│   ├── PortfolioView.tsx       ← Student portfolio
│   ├── CalendarView.tsx
│   ├── ArchiveView.tsx
│   ├── PublicEnrollmentView.tsx← Public enrollment form
│   ├── PublicBookingView.tsx   ← Public workshop booking
│   ├── ActivityDetailsView.tsx ← Payment / enrollment detail
│   ├── EnrollmentFormsView.tsx
│   ├── TestDesignView.tsx      ← Quiz/test builder
│   ├── TestWizardView.tsx      ← Take a quiz/test
│   ├── InstructorDashboardView.tsx
│   └── learning/               ← LearningView sub-components
│       ├── ProjectFactoryModal.tsx
│       ├── StudentProjectWizardView.tsx
│       ├── InstructorStudioDashboard.tsx
│       ├── CommitFeedView.tsx
│       ├── StepReviewModal.tsx
│       └── FactoryDashboard.tsx
│
├── components/                 ← Shared UI components
├── services/
│   └── firebase.ts             ← Firebase SDK init
├── types/
│   └── index.ts                ← All TypeScript types (766 lines, single file)
├── utils/                      ← Helpers: formatDate, formatCurrency, generateReceipt, etc.
│
├── sparkquest/                 ← SparkQuest sub-app (kids gamification)
│   └── [self-contained React app, shares Firebase + types from root]
│
└── maker-pro/                  ← Maker-Pro sub-app (adult e-learning)
    ├── src/
    │   ├── App.tsx
    │   ├── pages/
    │   │   ├── Login.tsx       ← Role-selector login (Parent | Student | Admin)
    │   │   └── Resources.tsx   ← Tool library + program-specific resources
    │   ├── components/
    │   │   └── UniversalEmbed.tsx ← Embed YouTube / PDF / Drive / images / code
    │   └── services/
    │       └── firebase.ts     ← Maker-Pro's own Firebase init
    └── vite.config.ts          ← Maker-Pro Vite config (fs allow '..', path aliases)
```

---

## 3. Tech Stack (Confirmed)

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | **React 18** + **TypeScript** | Single-page app, no Next.js |
| Build tool | **Vite 7** | Both root and maker-pro |
| Styling | **Tailwind CSS 4** | Utility-first, dark theme in ERP, light in Maker-Pro |
| Animation | **Framer Motion 10** | Used in Maker-Pro login transitions |
| Database | **Firebase Firestore** | Real-time listeners via `onSnapshot` |
| Auth | **Firebase Authentication** | Email/password, demo mode, biometric hook |
| Storage | **Firebase Storage** | Used for media/gallery uploads |
| Hosting | **Vercel** | Root app deployed to Vercel (`.vercel/` dir present) |
| Icons | **Lucide React** | Exclusively |
| PDF/Print | **react-to-print** | Receipt printing |
| Excel export | **xlsx** | Data exports |
| QR codes | **qrcode.react** | Pickup module |
| AI | **@google/generative-ai** | Workshop quality scoring |
| i18n | Built-in `translations` util | English + French |

---

## 4. Multi-Tenancy Architecture

> ⚠️ **Critical — read before writing any code**

### How tenancy works (IMPORTANT — NOT a nested path model)

The tenancy model uses **`organizationId` field filtering**, NOT a nested Firestore path.

```
// ❌ WRONG — This is NOT how it works:
tenants/{tenantId}/students/{studentId}

// ✅ CORRECT — All collections are flat:
students/{studentId}   (where students[].organizationId == 'makerlab-academy')
payments/{paymentId}   (where payments[].organizationId == 'makerlab-academy')
programs/{programId}   (where programs[].organizationId == 'makerlab-academy')
```

Every query in `AppContext.tsx` uses:
```typescript
query(collection(db, 'students'), where('organizationId', '==', orgId))
```

The `orgId` comes from `currentOrganization.id` (resolved during login via `AuthContext`).

### Organization Hierarchy

```
organizations/{orgId}                    ← Tenant record (name, slug, modules, subscription)
  └── settings/global                   ← Academy-specific settings (AppSettings)

users/{uid}                             ← Staff/parent profiles (contain organizationId)
students/{studentId}                    ← Student records (contain organizationId)
... (all other collections same pattern)
```

### The "Tenant Zero" (MakerLab Academy itself)

- Org ID: `makerlab-academy`
- First user to sign up automatically becomes admin and creates this org.
- `isSuperAdmin` = `organizationId === 'makerlab-academy' && role === 'admin'`
- `SaasAdminView` is only accessible to super-admins.

### All Firestore Collections (from firestore.rules)

| Collection | Access | Tenant-scoped? |
|---|---|---|
| `students` | Read: public, Write: admin/owner | ✅ via `organizationId` |
| `users` | Read: public, Write: admin/owner | ✅ via `organizationId` |
| `programs` | Read: public, Write: admin | ✅ |
| `enrollments` | Read: public, Write: admin | ✅ |
| `payments` | Read: signed-in, Write: admin | ✅ |
| `expenses` | Read: admin, Write: admin | ✅ |
| `expense_templates` | Read: admin, Write: admin | ✅ |
| `attendance` | Read: signed-in, Write: admin | ✅ |
| `staff_attendance` | Read: admin, Write: admin | ✅ |
| `workshop_templates` | Read: public, Write: admin | ✅ |
| `workshop_slots` | Read: public, Write: admin | ✅ |
| `bookings` | Read: signed-in, Write: public | ✅ |
| `workshop_evaluations` | Read: admin, Write: admin/instructor | ✅ |
| `tasks` | Read/Write: signed-in | ✅ |
| `projects` | Read/Write: signed-in | ✅ (internal projects) |
| `messages` | Read/Write: signed-in | ✅ |
| `marketing_posts` | Read: public, Write: admin | ✅ |
| `campaigns` | Read: admin, Write: admin | ✅ |
| `leads` | Read: admin, Write: public (create) | ✅ |
| `project_templates` | Read: public, Write: admin | ✅ |
| `student_projects` | Read/Write: public (kiosk mode) | ✅ |
| `process_templates` | Read: public, Write: admin | ✅ |
| `stations` | Read: public, Write: admin | ✅ |
| `badges` | Read: public, Write: admin | ✅ |
| `tool_links` | Read: signed-in, Write: admin | ✅ |
| `archive_links` | Read: signed-in, Write: admin | ✅ |
| `gallery_items` | Read/Write: public | ✅ |
| `assets` | Read: public, Write: admin | ✅ |
| `pickup_queue` | Read: signed-in, Write: admin/signed-in | ✅ |
| `notifications` | Read/Write: public | global (userId filter) |
| `announcements` | Read: public, Write: admin | ✅ |
| `organizations` | Read: public, Write: admin | ✅ |
| `subscriptionPlans` | Read: public, Write: admin | global |
| `roles` | Read: signed-in, Write: admin | global |
| `inventory` | Read: public, Write: admin | n/a |
| `gadgets` | Read: public, Write: admin | n/a |
| `contests` | Read: public, Write: admin | n/a |
| `settings` | Read: public, Write: admin | (legacy) |
| `system_logs` | Read: admin, Write: public | logging |

---

## 5. Role-Based Access Control (RBAC)

Roles are stored in Firestore (`/roles/{roleId}`) and auto-seeded/healed from `DEFAULT_ROLES`.

### Roles

| Role | Description |
|---|---|
| `admin` | Full access (`*` wildcard) |
| `admission_officer` | Students, enrollments, attendance, payment recording, workshops |
| `accountant` | Full finance + expenses, cannot manage students |
| `instructor` | Classes, attendance, full learning/curriculum management |
| `content_manager` | Marketing content creation, team tasks |
| `student` | Student portal — own learning, toolkit, media, pickup |
| `parent` | Child progress + payment visibility |
| `guest` | No access (pending org assignment) |

### `can(permission)` function (AuthContext)

```typescript
can('finance.view_totals')  // Exact permission check
can('finance.*')            // Wildcard scope check
// Admin always returns true for any permission
```

Permission strings used in the UI follow `module.action` format.

---

## 6. Core ERP/CRM Modules

### 6.1 Students

**Collection:** `students`
**Key fields:** `name`, `parentPhone`, `parentName`, `email`, `birthDate`, `school`, `address`, `medicalInfo`, `authorizedPickups[]`, `status`, `loginInfo{}`, `parentLoginInfo{}`, `badges[]`, `pinCode`, `avatarUrl`

- Students can have both a **student login** and a **parent login** (separate Firebase Auth users).
- The `StudentDetailsView` is the main hub: shows profile, enrollments, payments, attendance, projects, badges, and a payment schedule.
- Students are enrolled via the **Enrollment Wizard** in `App.tsx`.

### 6.2 Programs

**Collection:** `programs`
**Key fields:** `name`, `type`, `status`, `targetAudience`, `packs[]`, `grades[]`, `paymentTerms[]`, `resources[]`, `themeColor`, `discountAvailable`, `discountPromoPrice`

- Programs have **Packs** (pricing tiers: annual, trimester, etc.) and **Grades** (divisions with sub-groups).
- Each Grade has **Groups** (`id`, `name`, `day`, `time`).
- Program types: `Regular Program` | `Holiday Camp` | `Workshop` | `Internship` | `Camp`.
- `resources[]` on a Program are shown in the Maker-Pro `Resources` page for enrolled students.

### 6.3 Enrollments

**Collection:** `enrollments`
**Key fields:** `studentId`, `studentName`, `programId`, `programName`, `packName`, `gradeId`, `groupId`, `gradeName`, `groupName`, `paymentPlan`, `totalAmount`, `paidAmount`, `balance`, `discountAmount`, `status`, `session`

- Payment plans: `annual` | `semestre` | `trimester` | `monthly` | `full`
- `balance = totalAmount - paidAmount` (calculated and stored)
- `session` = academic year string, e.g. `"2024-2025"`
- Enrollments are created by the **Enrollment Wizard** (multi-step modal in `App.tsx`).
- Supports negotiated pricing (custom `totalAmount` override).

### 6.4 Finance

**Collection:** `payments`
**Key fields:** `enrollmentId`, `studentName`, `amount`, `date`, `method`, `status`, `checkNumber`, `bankName`, `depositDate`, `proofUrl`, `session`

- Payment methods: `cash` | `check` | `virement` (bank transfer)
- Payment statuses: `paid` | `pending_verification` | `verified` | `check_received` | `check_deposited` | `check_bounced`
- **FinanceView** has two modes: **Student Balances** (enrollment-level debt) and **Transaction History** (individual payments).
- Filtering by session, program, audience (kids/adults), date range, status.
- Stats cards: Realized Revenue, Outstanding Debt, Paid Students, Unpaid Students, Collection Rate.
- **Receipt generation** via `generateReceipt()` in `utils/helpers.ts` (uses `react-to-print`).

### 6.5 Expenses

**Collection:** `expenses`
**Categories:** `rent` | `salary` | `utilities` | `material` | `marketing` | `other`
**ExpenseTemplates:** Recurring expense templates (monthly salary, rent, etc.) that generate expense records with one click.

### 6.6 Attendance

**Collections:** `attendance` (students), `staff_attendance` (staff)
- Student record: `studentId`, `enrollmentId`, `date`, `status` (`present`/`absent`/`late`/`excused`)
- Staff record: `staffId`, `staffName`, `date`, `status`, `arrivalTime`, `departureTime`, `totalMinutes`, `overtimeMinutes`

### 6.7 Workshops & Bookings

**Collections:** `workshop_templates`, `workshop_slots`, `bookings`, `workshop_evaluations`
- Workshop templates define recurring or one-time workshop formats.
- Slots are specific instances of a template (date + time + capacity).
- Bookings are public (parents fill out a form) — used as a **lead generation** tool.
- Booking statuses track conversion: `confirmed` → `attended` → `converted`.
- `WorkshopQualityView` uses **Google Gemini AI** to score instructor performance based on qualitative responses.

### 6.8 Pickup Module

**Collection:** `pickup_queue`
- Real-time queue of students waiting to be picked up.
- Status flow: `waiting` → `on_the_way` → `arrived` → `released` → `confirmed`
- Each student has `authorizedPickups[]` (array of authorized person names).
- Uses `qrcode.react` for QR-based check-in/check-out.

### 6.9 Communications

**View:** `CommunicationsView.tsx`
- WhatsApp-first messaging (generates pre-filled `wa.me` links).
- **Template system** with placeholders (`{{student_name}}`, etc.).
- Template categories: `news` | `holiday` | `urgent` | `reminder` | `event`
- Bulk messaging: filter by program/grade/group, then send to all.
- Announcements stored in `/announcements` collection.
- Templates stored in `organizations/{orgId}/settings/global.communicationTemplates` (subcollection of org settings).

### 6.10 Marketing & CRM

**Collections:** `marketing_posts`, `campaigns`, `leads`
- **Lead pipeline** with statuses: `new` → `contacted` → `interested` → `workshop_booked` → `converted` → `closed`
- Leads include a full `timeline[]` (activity log of calls, notes, meetings).
- **Lead magnet funnel**: public `leadmagnet` route → multi-step quiz → captures lead → WhatsApp follow-up.
- Campaign budget tracking + asset management.
- Marketing posts workflow: `planned` → `in_progress` → `review` → `approved` → `published`.

### 6.11 Team Module

**Collections:** `tasks`, `projects`, `messages`
- Internal task management (Kanban-style: `todo` / `in_progress` / `done`).
- Team project tracking (separate from student projects).
- Simple team chat (last 50 messages via real-time listener).

### 6.12 Toolkit & Media

**Collections:** `tool_links`, `archive_links`, `gallery_items`, `assets`
- `tool_links`: Curated external tool links (robotics, coding, design, engineering tools).
- `archive_links`: Internal reference links (Gemini Gems, spreadsheets, docs).
- `gallery_items`: Photo/video gallery of student work.
- `assets`: Hardware asset tracking (Lego sets, computers, tools) with status (`available`/`in_use`/`maintenance`/`lost`).

---

## 7. Learning Module (LMS)

The most complex module. `LearningView.tsx` (~2953 lines) handles both instructor and student interfaces.

### Core Concepts

- **Project Templates** (`project_templates`): Instructor-created assignments with steps, skills, difficulty, resources, targeting (grades/groups), and publishing status.
- **Student Projects** (`student_projects`): Student's instance of a template (or free-form). Contains steps with proof-of-work, commits, badges earned.
- **Process Templates** (`process_templates`): Engineering workflows (Engineering Design Process, Scientific Method, Design Thinking) that define the phases a project goes through.
- **Stations** (`stations`): Learning areas (Robotics, Coding, Game Design, Multimedia, Engineering, Branding, General). Each has a theme color and icon. Grades can be assigned to stations.
- **Badges** (`badges`): Achievement badges auto-awarded when projects are published. Criteria: `project_count` (by station or total) or `skill` mastery.

### Student Project Workflow

```
planning → building → testing → delivered → submitted → [review] → published
                                                      ↓ (if rejected)
                                               changes_requested
```

### Proof of Work & Commits

- Students upload photo evidence (`proofUrl`) per step.
- A "commit" system (like Git) saves snapshots of project state with a message.
- Instructors review submissions in `StepReviewModal` and approve/reject individual steps.

### Badge Award Logic (`handleReviewAction`)

When a project is published, the system:
1. Counts all published projects for that student (by station and total).
2. Checks each badge's criteria against the count/skills.
3. Awards missing badges, updates `students/{id}.badges[]`, and sends notifications.

### Instructor Views

- **Curriculum Tab**: Template management (CRUD).
- **Studio Tab**: Dashboard of all student activity, commit feed, review queue.
- **Review Tab**: Pending submissions awaiting approval.
- **Track Tab**: Student progress overview.
- **Setup Tab**: Workflows, Stations, Badges configuration.
- **Trash**: Archived templates.

### Student Views

- **Explore Tab**: Browse available project templates.
- **My Studio Tab**: Own active and completed projects.
- **Project Wizard**: Step-by-step interface to work through a project (`StudentProjectWizardView`).

---

## 8. Sub-App — SparkQuest

**Location:** `/sparkquest/`
**Audience:** Kids aged 7–17
**Purpose:** Gamified project-quest experience.

- Shares Firebase, types, and auth with the root project.
- Students log in via Kiosk Mode (PIN code or name search — no email required).
- Quests map to the same `student_projects` collection.
- `ProjectSelector` component re-used inside `LearningView` for consistency.

> 📌 SparkQuest has its own `package.json` and dev server. Run: `npm run dev:sparkquest` from root.

---

## 9. Sub-App — Maker-Pro

**Location:** `/maker-pro/`
**Audience:** Adults (makers, professionals, hobbyists)
**Purpose:** Professional e-learning platform.

### Running

```bash
cd maker-pro
npm run dev     # Dev server
npm run build   # tsc && vite build
```

### Architecture notes

- **Separate Vite config** (`maker-pro/vite.config.ts`) with `fs.allow: ['..']` to reach root's shared files.
- Path alias: `'../services/firebase'` → redirected to Maker-Pro's own `src/services/firebase.ts`.
- Uses `framer-motion` for animated page transitions.
- `UniversalEmbed` component handles: YouTube, Google Drive, PDF, code snippets, images, external links.
- `Resources` page pulls from `tool_links` (general) + program-specific `resources[]`.
- Login has 3 modes: `selection` → `parent` or `student` or `admin`.
  - Parent → Firebase Auth login.
  - Student → redirects to `sparkquest-makerlab.vercel.app`.
  - Admin → Firebase Auth login → `/instructor-dashboard`.

### Maker-Pro Known Issues (as of 2026-04-19)

- Build was in progress and had TypeScript errors in previous sessions.
- Context imports from root `../../context/AppContext` require the fs alias to work.
- `enterInstructorDemo` function referenced in Login.tsx comes from Maker-Pro's own `AuthContext`.

---

## 10. Public-Facing Pages

These are accessible without login (embedded in the SPA via specific routes):

| View | URL/Route | Purpose |
|---|---|---|
| `PublicEnrollmentView` | `/enroll` | Parents enroll their child in a program |
| `PublicBookingView` | `/book` | Public booking for trial workshops |
| `LeadMagnetForm` | `/leadmagnet` | 5-question lead qualification funnel |
| `ParentDashboardView` | `/parent` | Parent portal after login |

---

## 11. Navigation System

The ERP uses a **custom single-page navigation** system (no React Router in the root app).

```typescript
// In AppContext:
navigateTo('student-details', { studentId: 'abc123' })

// ViewState = union type of all possible views
type ViewState = 'dashboard' | 'students' | 'finance' | 'learning' | ...
```

`App.tsx` renders the correct view component based on `currentView`.

> Maker-Pro uses **React Router** (react-router-dom v7).

---

## 12. Settings & Configuration

**Stored at:** `organizations/{orgId}/settings/global` (Firestore document)

The `AppSettings` interface includes:

- `academyName`, `academicYear`, `logoUrl`, `language` (en/fr)
- `receiptContact`, `receiptFooter`, `googleReviewUrl`
- `studentFormConfig` — toggles which fields are shown/required on student registration
- `documentConfig` — formal legal info for receipts/documents (ICE, RC, CNSS, etc.)
- `apiConfig` — Google Gemini API key, OpenAI key, ElevenLabs key

---

## 13. Feature Log

> Add an entry here every time a feature ships or a significant decision is made.

| Date | Module | Feature / Decision | Conversation |
|---|---|---|---|
| 2026-04 | ERP Core | Initial ERP/CRM setup: students, programs, subscriptions, attendance | Early |
| 2026-04 | ERP Core | Multi-tenant SaaS conversion: `organizationId` field on all collections | Early |
| 2026-04 | ERP Core | RBAC system with 7 roles + permission healing from defaults | Early |
| 2026-04 | Finance | Payment tracking: cash/check/virement, check lifecycle statuses | Early |
| 2026-04 | Finance | Receipt generation with legal business info (documentConfig) | fb9c6bfb |
| 2026-04 | Finance | Flexible payment plans + negotiated pricing on enrollments | fb9c6bfb |
| 2026-04 | Finance | FinanceView filtering by date range, session, program, audience | cdeb06bf |
| 2026-04 | Finance | **FIXED: Realized Revenue KPI now uses filteredPayments (date-range aware)** | e24dda4c |
| 2026-04 | Finance | **NEW: Month-level filter in Finance header (input type=month)** | e24dda4c |
| 2026-04 | Finance | **NEW: Monthly Activity bar chart (cleared+pending, clickable bars)** | e24dda4c |
| 2026-04 | Finance | **NEW: Monthly Collection Report (payment-first pivot, matches KPI)** | e24dda4c |
| 2026-04 | Finance | **NEW: Print PDF monthly report (browser print dialog, clean layout)** | e24dda4c |
| 2026-04 | Finance | **NEW: Excel export for filtered transaction list (xlsx library)** | e24dda4c |
| 2026-04 | Finance | **NEW: Upcoming Payments tracker (installment due-date logic)** | e24dda4c |
| 2026-04 | Finance | **FIXED: organizationId missing from ExpensesView recurring saves** | e24dda4c |
| 2026-04 | Finance | **FIXED: Dynamic session list in ExpensesView (was hardcoded)** | e24dda4c |
| 2026-04 | Learning | Full LMS: project templates, student studio, commit system | 77b430aa+ |
| 2026-04 | Learning | Badge award system (auto-award on project publish) | — |
| 2026-04 | Learning | Engineering workflow templates (Design Process, Scientific Method) | — |
| 2026-04 | Learning | Station system with per-grade activation | — |
| 2026-04 | Pickup | Real-time pickup queue with QR and status flow | 77b430aa |
| 2026-04 | Attendance | Staff attendance tracking with overtime | 77b430aa |
| 2026-04 | Communications | WhatsApp messaging templates with placeholders | 632589c7 |
| 2026-04 | Communications | Template storage under `organizations/{orgId}/settings/global` | 632589c7 |
| 2026-04 | Marketing | Full CRM pipeline: leads, timeline, conversion tracking | 69e2bf01 |
| 2026-04 | Marketing | Lead magnet funnel (5-question quiz + WhatsApp auto-follow-up) | a509468b / 12b71b0e |
| 2026-04 | Workshops | Workshop templates + slots + public booking + AI quality scoring | — |
| 2026-04 | SparkQuest | Gamified quest app for kids, kiosk login mode | Various |
| 2026-04 | Maker-Pro | Adult e-learning app: login, resources, UniversalEmbed | fb9c6bfb+ |
| 2026-04-09 | Infra | GitHub push + Firebase data loading debug | 175d16f2 |

---

## 14. Known Pain Points & Architectural Debt

### 1. Firestore rules don't use nested paths
All data is flat. The `organizationId` field filter approach means:
- Firestore rules cannot enforce tenancy (they don't check `organizationId`).
- Security relies entirely on client-side query filtering.
- If a bug omits `where('organizationId', '==', orgId)`, data leaks between tenants.
- **The rules file** does NOT currently enforce `organizationId` — this is an accepted trade-off for MVP speed.

### 2. `student_projects` and `project_templates` are fully public
Both collections use `allow read/write: if true` to support Kiosk Mode (anonymous student uploads). This is a deliberate choice logged in the rules file comments. Future hardening should add auth-token-based kiosk sessions.

### 3. Notifications not tenant-scoped
`notifications` collection is queried globally and filtered in memory by `userId`. Should be scoped or moved to `organizations/{orgId}/notifications/`.

### 4. LearningView.tsx is 2953 lines
It handles instructor, student, admin, setup, and review tabs all in one file. Critical to avoid adding more logic into it. Sub-components in `/views/learning/` help.

### 5. Maker-Pro TypeScript errors (April 2026)
The Maker-Pro build had unresolved TS errors. Path aliasing and cross-root imports are fragile. Treat the `vite.config.ts` `fs.allow` and path aliases as critical — do not simplify them without checking imports.

### 6. Legacy admin detection
Users who registered before the multitenancy migration have no `organizationId`. `AuthContext` handles this with a backwards-compat fallback that force-loads `'makerlab-academy'`. Do not remove this fallback.

---

## 15. Rules for Claude When Working on This Code

1. **Read this document first.** Never write a line of code without understanding the architecture.
2. **Multi-tenancy via `organizationId` field**, not path. Every new collection write must include `organizationId: orgId` from `currentOrganization.id`.
3. **When adding a new Firestore collection**, add its rule to `firestore.rules` at the same time and log it in Section 3 of this document.
4. **Never bypass the `can()` permission check** in UI components. If a user shouldn't see something, gate it with `can('module.action')`.
5. **Audience matters:**
   - SparkQuest = children (7–17). Age-appropriate UX. Gamified. Kiosk-friendly.
   - Maker-Pro = adults. Professional tone. No gamification.
   - ERP core = academy staff / admins. Data-dense, efficient.
   - Parent portal = parents. Simple, reassuring. WhatsApp-forward.
6. **When you build a new feature**, return:
   - The implementation.
   - Any new Firestore rules if new collections/paths are touched.
   - A log entry to add to Section 13 of this document.
7. **Do not add new top-level state to `AppContext`** without considering the performance impact (every subscriber re-renders). Use local state or a new context if the data is module-specific.
8. **The enrollment wizard and payment modal** live in `App.tsx`. Navigation is driven by `navigateTo()` from `AppContext`, not React Router.
9. **Receipt printing** uses `generateReceipt()` from `utils/helpers.ts` with `react-to-print`. The legal business info comes from `settings.documentConfig`.
10. **Check conversation history** for unfinished work before starting fresh. The previous session IDs are in the feature log.

---

## 16. Deployment

| App | URL | Platform |
|---|---|---|
| Main ERP | Deployed via Vercel | Vercel (`vercel.json` + `.vercelignore`) |
| SparkQuest | `sparkquest-makerlab.vercel.app` | Vercel (separate deployment) |
| Maker-Pro | Referenced in Login.tsx redirects | Vercel (separate deployment) |

---

*Last updated: 2026-04-19 — Full Finance module enhancement: KPI fix, monthly report, print PDF.*
*Next: Update Section 13 (Feature Log) after every work session.*

---

## 17. Finance Module Architecture (FinanceView.tsx)

> **Read this before touching FinanceView.tsx or ExpensesView.tsx.**

### Data Flow

```
Firestore
  payments[]          ← All payment records (p.date: 'YYYY-MM-DD', p.status, p.enrollmentId)
  enrollments[]       ← Enrollment records (e.session, e.balance, e.paidAmount, e.status)
  programs[]          ← For program name/audience lookup
  settings            ← settings.academicYear = current active session
```

### Key Computed Values (in order of dependency)

1. **`filteredPayments`** — payments matching current `selectedSession` + `selectedMonth` (or date range) + program + audience + status + search. Used by the **Realized Revenue KPI** and the Transactions view. This is the ground truth for revenue.

2. **`filteredEnrollments`** — active enrollments matching session/program/audience/search/balanceFilter. Used only in the **Student Balances** view (no month filter — balances are cumulative).

3. **`stats`** — KPI totals. `realizedRevenue` = sum of cleared `filteredPayments`. `totalOutstanding` = sum of `filteredEnrollments.balance`.

4. **`monthlyChartData`** — Groups ALL non-bounced session payments by month (YYYY-MM key). Each bar has `cleared` (green) + `pending` (amber) layers. Clicking a bar sets `selectedMonth`.

5. **`monthlyReport`** ⚠️ **CRITICAL PATTERN** — When `selectedMonth` is set:
   - **Step 1**: filter `payments` by month date + same session/program/audience as `filteredPayments`
   - **Step 2**: group those payments by `enrollmentId` → **paid rows** (hasPaid = true)
   - **Step 3**: find active enrollments with NO payment → split into **unpaid** (hasBalance > 0) and **fully paid** (balance = 0)
   - ⚠️ **Do not invert this logic** (don't iterate enrollments first). The KPI uses payment-first filtration; the report must too or totals won't match.

6. **`upcomingPayments`** — installment-plan students (monthly/trimester/semestre) with `balance > 0`, compute next due date using `computeNextPaymentDate()`. Used in the **Upcoming** tab.

### Month Filter Behavior

| State | Realized Revenue card | Balances tab | Transactions tab |
|---|---|---|---|
| No month selected | Full session total | All active enrollments | Filtered by dateRange only |
| Month selected | That month only | Monthly Report (3 sections) | That month only |

`selectedMonth` overrides `dateRange` when set (they're not combined; month takes priority).

### Payment Status Values

| Value | Meaning | Counted in Revenue? |
|---|---|---|
| `paid` | Cash payment confirmed | ✅ Yes |
| `verified` | Bank transfer verified | ✅ Yes |
| `check_received` | Cheque received, not yet deposited | ⏳ Pending (shown in chart amber bar) |
| `check_deposited` | Cheque deposited to bank | ⏳ Pending |
| `check_bounced` | Cheque returned unpaid | ❌ Excluded (reversal pattern) |
| `pending_verification` | Transfer pending confirmation | ⏳ Pending |

### ExpensesView.tsx — Mandatory Fields on Every Write

Every `addDoc` to the `expenses` or `expense_templates` collection **must** include:
```typescript
organizationId: orgId,   // from currentOrganization?.id
session: selectedSession, // current academic year
```
Without `organizationId`, the expense will not be queryable by the tenant and will appear as orphaned data.

### computeNextPaymentDate (helper in FinanceView.tsx)

Logic:
- For `monthly` plans: next due = last cleared payment date + 1 month
- For `trimester` plans: + 3 months
- For `semestre` plans: + 6 months
- If no cleared payments exist, base date = enrollment start date
- Returns `urgency`: `overdue` (<0 days), `this_week` (≤7 days), `this_month` (≤30 days), `future`

### Print PDF

`handlePrintMonthlyReport()` — generates a full HTML string with:
- 4 KPI cards (cleared, outstanding, paid count, unpaid count)
- "Haven't paid" table (red header)
- "Paid this month" table (green header, payment method badges)
- Footer with session totals
- `window.onload = () => window.print()` triggers the browser print dialog
- No external PDF lib required (uses browser native print-to-PDF)
