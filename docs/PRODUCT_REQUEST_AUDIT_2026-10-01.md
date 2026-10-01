# Edufy and SparkQuest request audit — 2026-10-01

This audit reconciles the current conversation, the other Edufy/SparkQuest Codex chats, repository phase reports, the working tree, and `origin/main` (`acb7755`). It distinguishes production work from local-only work and from requests that remain incomplete.

## Status key

- **Production**: present in `origin/main` and included in the current production release line.
- **Local only**: implemented and tested in the shared workspace, but absent from `origin/main` and not released.
- **Partial**: part of the requested experience exists, but the requested end-to-end outcome is not complete.
- **Missing**: no implementation matching the request was found.

## Confirmed production work — remove from the backlog

| Request | Status | Evidence |
|---|---|---|
| Education UI shell, focused Dashboard, Students/Families, Student Profile, Programs and Finance redesigns | Production | Current files match `origin/main`; Education UI is the default with `?ui=atlas-legacy` rollback. |
| Service catalogue and rapid service invoicing | Production | Service catalogue, service invoice modal, document ledger and rules are in `origin/main`. |
| Workshop recurrence days, weekday labels, WhatsApp invitation, OG image, compact mobile booking and MakerLab branding | Production | Released commits `92691d8`, `8f75851`, `f53351a`, and `7c1756e`. |
| STEMQuest public enrollment: Innovator chooses two non-overlapping sessions | Production | `PublicEnrollmentView.tsx` contains the two-session flow and matches `origin/main`. |
| Parent finance documents: catalogue price, discount, negotiated amount, payment and selectable programs | Production | `utils/enrollmentFinancials.ts`, Students statements and Finance statements match `origin/main`. |
| Admissions projection, Family Journey Passport, stable Workshop links, offer/enrollment provenance and assisted WhatsApp history | Production | Admissions Phase 1–6 files match `origin/main`. |
| First Sparkbook learner release: mission brief, Studio/proof states, Exchange, Field Log and learner destinations | Production | SparkQuest release commit `acb7755`; production URLs were previously verified. |

## Local-only work that still needs an explicit release

### 1. SparkQuest review reliability

Implemented locally:

- newest-first inbox for submitted step proofs and final missions;
- proof/media reader, comments, revision request, approval and publication;
- durable proof versions and review history;
- student-visible feedback and resubmission states;
- transaction fingerprints, idempotent decisions and stale-tab protection;
- Showcase and assigned-mission reviews in one pipeline.

Not released. The new domain/service/inbox files do not exist in `origin/main`.

Release gates:

- release the locally completed and emulator-proven top-level review/audit Firestore hardening;
- run designated instructor/learner acceptance with real tenant links and attachments;
- release the client and coordinated rules deliberately.

### 2. Instructor learner-management workspace

Implemented locally:

- learner directory ordered by review need;
- profile projects, progress, previous years and review history;
- direct mission assignment from the learner profile;
- additive audience preservation under concurrent instructor edits;
- loading, error and retry states.

Not released. `instructorLearner.ts`, `profileAssignment.ts`, `InstructorLearnerWorkspace.tsx` and its preview are absent from `origin/main`.

Remaining acceptance: one designated instructor assigns a mission, the learner sees it, starts it, submits proof, receives feedback and completes it.

### 3. Mission Autopilot

Implemented locally:

- CSV parsing and normalization;
- smart completion wizard for missing brief/workflow/audience fields;
- image/PDF upload requests and filename matching;
- learner preview, stable repeat keys, atomic draft creation and separate assignment.

Not released. Real instructor CSV/upload/assignment acceptance is still required. Updating existing missions, ZIP asset bundles, persistent wizard resume and abandoned-upload cleanup remain deferred.

### 4. Later SparkQuest desktop/form polish

The larger navigation, pinned workbench, naming dialog, Showcase form and several popup/session components have local changes beyond the production release. They have not been released as one accepted slice.

## Explicit requests that remain incomplete

### Priority 0 — production correctness and safe release

1. **Review-field Firestore hardening** — Local only, implementation complete for new protocol-v1 projects.
   Top-level and proof-bound per-step review truth are protected; direct SDK and nested-array tampering are emulator-proven, and final publication requires canonical step approvals. The client/rules are not deployed. Existing projects retain explicit legacy compatibility and require representative acceptance rather than silent bulk migration.

2. **Real-account review acceptance** — Missing.
   Synthetic browser and emulator tests pass, but the exact production path has not been proven with a designated instructor, learner, real upload and clearly named test mission/Showcase.

3. **Deploy the local review, learner desk and Mission Autopilot work** — Missing.
   These features are not on the production branch or public SparkQuest bundle.

### Priority 1 — Admissions Control Tower requested experience

The existing Admissions page is still a projection/passport, not the fully operational tower requested in the later conversation.

Missing or partial:

- Public workshop booking does **not** automatically create a CRM/Admissions prospect. Staff still use an explicit “Convert to lead” action after the booking/follow-up. Safe conflict handling exists, but automatic case creation does not.
- The implemented pipeline has seven broad stages. It does not implement the requested operational journey: first contact, trial scheduling, reminder, attendance/no-show, experience feedback, program details, planning, pricing confirmation, payment and conversion as independently actionable phases.
- Owner, due date, completion and lifecycle-transition task commands remain closed; Firestore currently denies `admission_tasks` writes.
- A suggested next action is not yet a durable task that can be assigned, scheduled, completed or moved to the next phase from the passport.
- WhatsApp templates exist, but there is not yet a complete template/document/action package for every requested phase.
- Direct contextual transitions from Admissions into CRM, Workshop, Finance and Enrollment are incomplete; the operator still changes modules for several actions.
- Existing unlinked public/legacy bookings still require reconciliation rather than automatic phone-based merging.

### Priority 1 — SparkQuest student experience still requested

1. **Completion celebration** — Missing.
   No approved/published mission celebration matching the request was found.

2. **Shareable public project link** — Missing.
   There is no opt-in, revocable student-project public sharing contract with minimal child identity and media consent.

3. **Parent/guardian progress workspace** — Missing.
   The requested parent experience—student-like project journey, read-only progress, feedback and milestones without build controls—has not been implemented.

4. **Fully vivid and varied learner visuals** — Partial.
   Solid colors are scoped into some local learner/instructor surfaces, but the requested app-wide stronger palette, unique project cover colors, bounded imagery and consistently “alive” finish are not complete.

5. **All student forms, dialogs and nested tools on the new system** — Partial.
   Remaining legacy examples include native alerts/confirms in `StudentWizard` and `ProjectSelector`, dark `AddPlatformModal`, `ContestModal`, `SubmissionModal`, kiosk/admin arcade surfaces, and older nested game/tool treatments. Pickup, Build Rhythm/productivity and nested arcade experiences still need one coherent acceptance pass even where partial local styling exists.

### Priority 1 — full Edufy design-system rollout

The focused redesign is not the full application redesign originally requested.

Focused redesigns exist for the shell, Dashboard, Students/Families, Student Profile, Programs and Finance. Deep workflow redesign remains for:

- Learning, Portfolio and Review;
- Marketing/CRM, Communications, Enrollment Forms and Pickup;
- Team, Staff Attendance and Media;
- Toolkit and Archive;
- Settings, Admin tools, App Store and SaaS administration;
- instructor, parent and other role-specific surfaces;
- installed mini-apps and remaining module-local forms/modals.

The Student Profile is deployed and structurally redesigned, but the later “larger, more high-end elements” refinement was not separately approved or completed. Several secondary modules still depend on compatibility CSS rather than purpose-built Education UI workflows.

### Priority 2 — hardening and deferred product depth

- Admissions pagination, reconciliation/migration queue, reporting and ambiguous legacy status repair.
- Official WhatsApp provider/webhooks only if separately authorized; current sent state is manual operator confirmation.
- Per-recipient SparkQuest assignment event history and supplemental unassignment.
- Review-history retention/subcollection policy before project documents become large.
- Automatic cleanup/retention for abandoned or deleted Storage objects.
- SparkQuest server-issued Edufy launch bridge deployment and retention policy.
- Remaining bundle splitting and removal of the Tailwind CDN warning.

## Unmapped request found outside the repository chats

A ChatGPT chat titled “Upgrade UI Design” asks for high-end image-based UI refinements, but it contains no linked repository, route or implementation result. It cannot be safely counted as completed Edufy/SparkQuest code without identifying the referenced screens.

## Recommended execution order

1. Harden review fields in Firestore rules and add emulator denial tests.
2. Run designated instructor/learner acceptance for assigned mission and Showcase.
3. Release review reliability + instructor learner desk + Mission Autopilot in one controlled SparkQuest release.
4. Finish the remaining learner dialogs/forms, then add completion celebration.
5. Design and implement guardian progress plus explicit opt-in public sharing.
6. Make Admissions operational: automatic booking case creation, granular stages, durable tasks/actions and contextual module handoffs.
7. Continue Edufy deep redesign module by module, with user approval after each workflow rather than relying on global compatibility CSS.

## Current release truth

- Production branch: `origin/main` at `acb7755`.
- Current working branch: `agent/atlas-saas-platform` at `1d1543c` with extensive preserved local work.
- The local review/learner-desk/Autopilot implementation is intentionally not represented by the production commit.
