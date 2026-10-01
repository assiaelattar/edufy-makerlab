# SparkQuest Decisions

## 2026-10-01 — Per-step approval is proof-bound canonical state

New learner projects declare review protocol v1. Store instructor outcome, feedback, actor, time and the reviewed proof fingerprint in a protected top-level `stepReviews` map. Treat nested step review fields as presentation compatibility only. Any changed proof loses its canonical approval and re-enters the queue; protocol-v1 final publication requires a matching canonical approval for every required step. Keep legacy fallback without silently asserting that old `done` states were reviewed.

## 2026-10-01 — Review truth is staff-controlled at the Firestore boundary

Route `student_projects` writes by authenticated role. Learners keep the minimum lifecycle they need—create, edit, submit proof and resubmit—but must preserve top-level review history, reviewer identity, feedback, XP and publication fields exactly, cannot self-publish, and cannot forge a changes-requested decision. Reserve review decisions for instructor/administrator roles; other elevated tenant roles retain ordinary non-review access only. Phase 2 subsequently made duplicated per-step fields non-canonical through the protected proof-bound map.

## 2026-10-01 — Profile assignment adds a learner, never replaces a class

Store supplemental canonical recipients in `targetAudience.additionalStudents` and evaluate them through the existing shared learner mission selector. Profile assignment transacts against current mission and learner records; class dispatch and mission-editor writes preserve supplemental additions from the latest snapshot. An audience-free, complete draft may activate for one learner. A planned-audience draft must be dispatched in Missions first. No enrollment, build or review data changes and no unassignment control is introduced in this phase.

## 2026-10-01 — Student profiles become an instructor working desk

Separate saved projects/progress, eligible missions and review decisions; preserve previous-year work and include all-year pending reviews. Unknown directory/catalog/enrollment/project reads get explicit loading/error/retry, not zero-count claims. Reuse the instructor layout and focus-managed dialogs with scoped solid semantic colors; identity repair and account/enrollment administration remain in Edufy.

## 2026-10-01 — Review decisions bind to the submitted proof

Use one canonical step/final review selector across inbox, overview and learner profiles. Load the project independently when opening a review; a read failure is not an empty queue. Decisions transact against the fresh document, verify the proof version inspected, append actor/feedback/proof history atomically, and treat a repeated command ID as a no-op. Student and instructor-editor saves compare the open snapshot and preserve stored review truth. This is client reliability, not a replacement for review-field security rules.

## 2026-10-01 — Proof-first review, separate from the visual roadmap

Reuse the existing focus-managed dialog and instructor workspace, with a saved-roadmap rail and dominant readable evidence panel. Avoid animated distraction in the decision surface. Step approval and final publication remain distinct, with required-step gates. Vivid learner colors, full student management/assignment, celebration, guardian tracking and public sharing remain subsequent phases rather than being bundled into the reliability fix.

## 2026-10-01 — Working surfaces are a desktop maker workspace

Keep Sparkbook's expressive mission identity, but make navigation and forms calmer: larger labeled destinations, paper backgrounds, white inputs, restrained shadows, and semantic accents. The workbench and Showcase pilot this scoped palette; instructor/shared theme layers are not migrated wholesale. Browser UI does not imitate operating-system controls.

## 2026-10-01 — Ownership keeps builds visible; enrollment targets new missions

An already-owned tenant-verified build must not disappear when enrollment or a template's audience changes. The current-year workbench pins one active build outside discovery filters, instructor decisions have a dedicated lane, and past years live in Field Log. Historical previews read saved steps and frozen workflow snapshots and remain read-only.

## 2026-09-30 — One review inbox for assigned and independent work

Reviewability follows the student project status, not whether a project came from an assigned mission. Every tenant-scoped submitted project enters the same instructor queue. A Showcase remains identifiable as independent work, but uses the same comment, revision, approval, history, and learner-feedback contract as a mission.

## 2026-09-30 — CSV prepares content; completion precedes assignment

Mission Autopilot accepts partial CSV rows and derives only the unresolved sections. Friendly phase columns support ordinary spreadsheet authors; JSON preserves repeated resources, deliverables, outcomes and full workflows. Invalid/ambiguous references require explicit selection. Actual file bodies stay in Storage, and the importer always creates drafts before a separate assignment action.

## 2026-09-30 — Repeat keys preserve existing missions

Active organization plus permanent import key determines a mission ID. Mission/custom-workflow writes are atomic and snapshot the workflow. Concurrent retries return the existing mission rather than duplicating or overwriting it. Changed content with the same key is reported; creating a copy requires a new key. Existing-record updates are deferred.

## 2026-09-30 — Learner navigation is a field kit, not a shrinking app menu

Desktop destinations use a persistent labeled workshop index; phone keeps five primary destinations and groups Evidence Wall and Key Cabinet inside one compact kit sheet. Labels remain visible, touch targets remain explicit, and every destination uses the learner's language rather than internal module names.

## 2026-09-30 — Destination shells share Sparkbook; nested tools keep their contracts

Arcade, gallery, credential, profile, and navigation shells use the same paper/lime/orange/ink visual language as missions, Studio, Exchange, and Field Log. This pass changes hierarchy, responsive behavior, feedback, and presentation only. Arcade credits, external-tool sessions, stored credentials, gallery ownership, and avatar persistence remain unchanged. Local preview fixtures never write application data.

## 2026-09-30 — Rewards are earned choices, not a shop-first experience

The learner store leads with current Spark balance, the next meaningful goal, and the connection between approved work and unlocked choices. Physical tools and studio services use claim tickets with transparent affordability and request status; cosmetic collectibles remain secondary. Preview interactions are local, while authenticated purchases keep the existing reward contract.

## 2026-09-30 — The portfolio is a field log, not a trophy grid

The learner portfolio presents projects as an evidence trail: what was built, which stages were completed, what improved, and which skills the work proves. Playful Sparkbook texture supports the archive without hiding review state or project progress. Portfolio reads fail visibly when verified tenant context is missing and never invent a default organization.

## 2026-09-29 — Freeze the workflow when a learner starts

Student projects store a versioned workflow snapshot and derive their actionable steps from that snapshot. Instructor edits affect future starts, not work already in progress. Mission briefs, evidence requirements, mentor review, and progress UI all read the same frozen contract so content and learner state cannot drift apart.

## 2026-09-29 — Sparkbook texture follows task intensity

Mission identity and progress surfaces carry the strongest lime, orange, ink-outline, and offset-shadow treatment. Reading, checklist, proof, and mentor-feedback surfaces use quieter paper backgrounds and tighter hierarchy. The visual system may be expressive without reducing legibility or turning every operational surface into a reward card.

## 2026-09-29 — Sanitize optional mission data at the persistence boundary

Mission editors may keep `undefined` for optional UI fields, but Firestore must never receive it. Create and update clean plain domain objects recursively immediately before persistence, then add Firestore sentinels. This protects every nested optional mission field without enabling global `ignoreUndefinedProperties` or changing form semantics.

## 2026-09-29 — Sparkbook is the learner-facing visual language

Learner mission discovery and project details use paper, lime, orange and ink with chunky type, outlined primary objects, selective offset shadows and ticket-like reward treatment. Instruction, evidence and form surfaces remain quieter. Instructor and parent operations do not inherit the playful texture automatically.

## 2026-09-29 — Learner redesigns begin as local-only complete-page demos

The Sparkbook direction is evaluated on a complete learner workflow page before any shared-token migration or authenticated integration. The first demo is project details: mission purpose, progress, step sequence, next action, learning outcomes, and materials. It is reachable only on a local hostname and does not read or write application data. Approval of the visual demo is not approval to replace the canonical learner workflow.

## 2026-09-24 — Instructor writes never repair authentication or tenancy

Instructor project tools use the existing authenticated Firebase actor and the organization attached to that actor. Missing authentication or tenant context is a visible blocking error; the client must not sign in anonymously or invent a default organization to make a write appear successful.

## 2026-09-24 — Operational configuration is calm, not arcade-themed

Student-facing rewards may feel playful, but instructor reward, contest, and order management follows the same restrained white/slate operating system as missions and class progress. Color communicates status and priority; it does not create a separate embedded application.

## 2026-09-24 — One shared instructor workspace language

Instructor pages use shared headers, toolbars, actions, statistics, and empty states. Color indicates state or action priority rather than giving every module an unrelated theme. Navigation is grouped by the instructor's workflow: operate classes, build learning content, configure the studio, and preview the learner experience.

## 2026-09-24 — Audience UI reads canonical mission targets

Assignment status and class-progress filtering read `project_templates.targetAudience`. Legacy enrollment records describe class membership only; they are not evidence that a mission was assigned.

## 2026-09-24 — Instructor configuration is tenant data

Workflows, stations, badges, tool links, and assets must carry the active organization on writes. Operational list views show shared legacy content only where already supported, otherwise the active tenant's records.

## 2026-09-24 — Assignment changes missions, never enrollments

Instructor assignment updates `project_templates.targetAudience` and sets the mission to `assigned`. It never creates or edits an Edufy enrollment. Grade and group audiences follow active enrollment metadata; direct learner audiences use canonical learner IDs and remain authoritative.

## 2026-09-24 — Mission dispatch is the instructor information architecture

The instructor home is organized around the real lifecycle: draft, assigned, student work, and review. Creation and assignment are one primary path; stations, workflows, badges, and utilities remain supporting tools rather than competing dashboard calls to action.

## 2026-09-24 — Patch the live permission boundary narrowly

The urgent production fix changes only learner-owned `student_projects` creation and updates in the exact live ruleset. It does not deploy the broader local Firestore or Storage rules, because those include additional Phase 3 policy changes that require their own release gate.

## 2026-09-24 — Current year for new work, enrollment only for targeting

A verified learner may create personal work without a current-year enrollment. The latest active enrollment may supply grade/group targeting context, but new projects are always labeled with the current academic year.

## 2026-09-24 — Direct learner assignment is authoritative

A mission explicitly assigned to a learner is visible even when legacy enrollment grade/group metadata is stale. Tenant and canonical learner identity checks still apply.

## 2026-09-24 — Files belong in Storage

Evidence and showcase files upload resumably to a tenant/user/project-scoped Storage path. Firestore stores URLs and project metadata, never base64 file bodies.

## 2026-09-24 — Student startup is demand-driven

Learner login subscribes only to required catalogues. Admin collections, focus history, pickup state, and heavy workflow surfaces load only when their feature is opened.

## 2026-09-24 — One-time opaque launch codes

Edufy never places a Firebase custom token in a URL. It requests a 256-bit opaque code whose hash is stored server-side for 90 seconds; SparkQuest exchanges and atomically consumes it from its exact allowed origin.

## 2026-09-24 — Revalidate at issue and exchange

User, tenant, entitlement, permission, learner, and project access are verified when a launch is issued and again immediately before exchange. A changed or revoked relationship invalidates the launch.

## 2026-09-24 — Staff are never learner impersonators

An instructor or administrator keeps their own Firebase UID and role. Only a verified student account receives a canonical `sparkquestStudentId` claim.

## 2026-09-24 — Reconciliation before migration

The first identity report is read-only, tenant-scoped, and excludes personal data from its response. No automatic repair is allowed; errors block migration and warnings require operator review.

## 2026-09-24 — Server writes default off

Launch-session writes require an explicit server-only feature flag. Local development remains disabled unless an isolated emulator environment is deliberately configured.

## 2026-09-23 — Rescue instead of full rewrite

Keep the existing application and replace unstable boundaries in controlled phases. A full rewrite would reproduce complex mission, review, portfolio, and instructor behavior while delaying the urgent identity and URL fixes.

## 2026-09-23 — Edufy owns learner identity

Authorization requires a Firebase user, an organization ID, and a student record whose linked auth UID and tenant match. Email, phone, display name, and project title remain search/display data only.

## 2026-09-23 — Fail closed

Missing, ambiguous, duplicated, or cross-tenant learner/profile/project records produce a recovery state. SparkQuest must not choose the first match, invent a tenant, or repair identity links from the browser.

## 2026-09-23 — Public hosts never return to localhost

Configured application URLs are normalized centrally. Localhost values are valid only while the current browser host is local; public hosts fall back to the production application URLs.

## 2026-09-23 — Kiosk requires a server-issued session

Anonymous kiosk access is disabled. A future kiosk flow must use a short-lived, tenant-scoped, purpose-limited server token and an auditable exchange; it cannot impersonate a learner in client state.

## 2026-09-23 — UI direction

The entry experience uses a project-workshop metaphor: clear progress, sturdy typography, grid paper, restrained MakerLab orange, and visible trust language. The design avoids a generic dashboard/login template while remaining responsive and accessible.
