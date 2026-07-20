# Atlas SaaS Architecture Plan

For day-to-day implementation loops, use `ATLAS_BUILD_CONTEXT.md` as the living source of truth. Read it before each module pass and update it after each build/test cycle.

## Product Model

Atlas is the SaaS evolution of Edufy. It is a suite for education organizations, not a single isolated app.

Edufy Core is the source of truth. It manages operations, administration, finance, students, participants, programs, enrollments, attendance, CRM, workshops, staff, and tenant settings.

SparkQuest and Maker Pro are learning apps connected to Edufy Core through a shared app bridge. Future apps should follow the same pattern.

```txt
Atlas SaaS Platform
  Edufy Core
    ERP / ORT / SAR operations
    Marketplace
    App Bridge
    Agent / MCP Gateway

  SparkQuest
    Kids LMS, ages 6-17

  Maker Pro
    Adult LMS, bootcamps and professional workshops

  Future Apps
    Education-specific tools installed from the marketplace
```

## Core Principles

1. Edufy Core is the operational source of truth.
2. Learning apps do not replace Edufy Core; they communicate with it.
3. Every tenant has isolated data and configurable app access.
4. Every app must support tenant identity, user identity, roles, permissions, and subscription limits.
5. Every app should be agent-ready through a controlled MCP-compatible interface.
6. The marketplace is a first-class product surface for installing education-focused apps and modules.

## Tenant Model

The current app already uses a flat multi-tenant model with `organizationId` on business records. The first SaaS version can keep this model while hardening it.

```txt
organizations/{orgId}
  name
  slug
  logoUrl
  status
  ownerUid
  modules
  installedApps
  subscription
  limits
  createdAt

users/{uid}
  organizationId
  email
  name
  role
  status
  createdAt
  lastLogin

students/{studentId}
  organizationId
  ...

enrollments/{enrollmentId}
  organizationId
  ...
```

Long term, Atlas may move to nested tenant paths, but only after the product is stable:

```txt
organizations/{orgId}/students/{studentId}
organizations/{orgId}/payments/{paymentId}
organizations/{orgId}/learningProjects/{projectId}
```

## App Bridge

The Edufy App Bridge is the communication layer between Edufy Core and installed apps.

```txt
SparkQuest  ┐
Maker Pro   ├── Edufy App Bridge ── Edufy Core
Future Apps ┘
```

The bridge is responsible for:

- resolving `organizationId`
- resolving user identity
- checking installed app access
- checking role permissions
- loading allowed students or participants
- loading allowed programs and enrollments
- syncing learning progress
- syncing attendance
- syncing project submissions
- syncing certificates and portfolio artifacts
- sending notifications back to Edufy Core

Each connected app should call the bridge rather than directly inventing its own tenant logic.

## Agent / MCP Gateway

Atlas should be built as an agent-ready SaaS platform. ChatGPT, Codex, Claude, Azure-hosted agents, and future assistants should interact with Atlas through a controlled gateway.

This gateway should be MCP-compatible by default.

```txt
ChatGPT / Codex / Claude / Azure Agent
  └── Atlas Agent Gateway
        ├── Edufy Core tools
        ├── SparkQuest tools
        ├── Maker Pro tools
        └── Marketplace app tools
```

The agent gateway must never bypass tenant isolation or role permissions.

Every tool call must resolve:

- tenant / organization
- authenticated user
- role
- permission
- installed app access
- write safety
- audit log

Example tool groups:

```txt
atlas.health
atlas.tenant.get
atlas.tenant.moduleStatus

edufy.students.search
edufy.students.profile
edufy.enrollments.list
edufy.finance.summary
edufy.attendance.report
edufy.crm.createLead
edufy.workshops.listBookings

sparkquest.student.progress
sparkquest.project.reviewQueue
sparkquest.badges.award

makerpro.participant.progress
makerpro.bootcamp.cohorts
makerpro.certificates.issue

marketplace.apps.list
marketplace.apps.install
marketplace.apps.uninstall
```

Writes should be disabled by default in hosted agent contexts unless the tenant explicitly enables them and the user confirms sensitive actions.

## Marketplace

Edufy Core includes a marketplace where education organizations can install apps, modules, and solutions for their journey.

Marketplace apps can be:

- built-in modules
- connected learning apps
- AI tools
- reporting tools
- operations tools
- communication tools
- third-party integrations

Each marketplace app should declare:

```ts
{
  id: string;
  name: string;
  category: string;
  audience: "admin" | "staff" | "student" | "parent" | "adultLearner";
  requiredPlan?: string;
  requiredPermissions: string[];
  dependencies?: string[];
  agentTools?: string[];
}
```

Installation state lives on the organization:

```txt
organizations/{orgId}
  installedApps: string[]
  modules: Record<string, boolean>
```

## Product Areas

### Edufy Core

Edufy Core manages:

- tenants and organizations
- staff and roles
- students and parents
- adult participants
- programs
- classes and groups
- enrollments
- finance and expenses
- attendance
- CRM and leads
- workshops and bookings
- communications
- pickup
- internal team operations
- marketplace
- settings

### SparkQuest

SparkQuest is the kids LMS for ages 6-17.

It should consume from Edufy Core:

- student profile
- active enrollments
- allowed programs
- assigned projects
- badges and learning paths

It should write back:

- progress
- project submissions
- proof of work
- badges earned
- portfolio artifacts
- learning attendance where applicable

### Maker Pro

Maker Pro is the adult LMS for participants over 18.

It should consume from Edufy Core:

- participant profile
- bootcamp enrollment
- cohort/program data
- resources and curriculum
- instructor assignments

It should write back:

- progress
- assignments
- certificates
- attendance
- project outcomes
- instructor feedback

## Module-By-Module Roadmap

### 1. Platform Foundation

- formalize organization model
- formalize user model
- create explicit `super_admin`, `owner`, and tenant roles
- harden `organizationId` handling
- create shared tenant helpers
- create shared permission helpers
- move Firebase config to environment variables

### 2. Security Rules

- enforce tenant-safe reads and writes
- reduce public reads on students, users, and enrollments
- restrict public writes to safe lead/booking creation only
- add audit logging for sensitive writes

### 3. Marketplace

- formalize app registry
- separate modules from marketplace apps
- add install/uninstall state
- check subscription and permissions before rendering app surfaces
- expose installed app state to the app bridge and agent gateway

### 4. App Bridge

- create shared Edufy data access layer
- add tenant-aware APIs for SparkQuest and Maker Pro
- define sync contracts for progress, projects, attendance, and certificates
- remove duplicate tenant logic from connected apps over time

### 5. Agent / MCP Gateway

- rename current Edufy MCP into Atlas/Edufy agent gateway
- add tenant-aware tool context
- expand tools beyond students and finance
- add CRM, workshops, attendance, learning, and marketplace tools
- keep writes disabled by default
- log every tool call

### 6. Edufy Core Stabilization

- fix production-facing TypeScript errors
- clean enrollment wizard
- stabilize finance calculations
- stabilize parent dashboard
- stabilize settings and tenant admin

### 7. SparkQuest Integration

- make SparkQuest access Edufy through the app bridge
- replace unsafe public writes with controlled kiosk/session logic
- sync projects and badges back to Edufy Core

### 8. Maker Pro Integration

- fix Maker Pro build/type issues
- define adult participant model
- connect cohorts and bootcamps to Edufy programs/enrollments
- sync progress, assignments, and certificates

### 9. Future App Framework

- create a repeatable app manifest pattern
- define app permissions
- define app bridge access
- define optional MCP tools per app
- make new education solutions easy to add

## First Implementation Sprint

1. Create shared Atlas types for organization, user, module, app, and subscription.
2. Refactor the module registry into a SaaS-ready registry.
3. Add an app registry for marketplace apps.
4. Add tenant helper utilities.
5. Start hardening Firestore rules for the core collections.
6. Expand the MCP server into an Atlas agent gateway plan without changing production behavior yet.
