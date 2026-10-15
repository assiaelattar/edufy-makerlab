# SparkQuest Decisions

## 2026-10-15 — Render recipient links only after selection

The Edufy learner profile keeps the recipient quick-link state empty until staff selects manual sign-in or issues a one-click link. Link URL, QR and expiry details render only for that selected mode and available link, so opening a learner record never reads an absent one-click session.

## 2026-10-15 — Separate reusable login QR from one-click session QR

A reusable card opens the role-specific login page and shows the recorded ID but contains no password. One-click access uses a staff-issued five-minute opaque code, stored only as a hash, bound to the exact parent or learner UID and tenant, and consumed once by SparkQuest. Parent issuance requires current exact guardian evidence. Staff issuance is audited by UID and does not mutate the recipient password. The existing password flow remains available; one-click student access cannot authorize Showcase deletion without fresh password reauthentication.

## 2026-10-15 — Learner Pickup shows only sourced handoff facts

The learner's workshop end time is a dated timetable projection from active tenant-scoped Edufy enrollment and program records. It is not a confirmed departure time. No pickup meeting point is stored in the current lifecycle record, so the learner sees “Confirm with the team”; a program venue, if available, is labelled only as the workshop venue. Cancelled and exception states suppress schedule and location cards to keep the safety action unambiguous. The live queue remains the authority for status and selected picker.

## 2026-10-15 — Workshop schedule drives the daily Pickup roster

The staff desk and lobby derive the day’s learner list from active, attendance-eligible enrollments whose group schedule matches the current weekday. A scheduled row is a read-only projection until a parent or staff member starts the audited pickup record; no synthetic `scheduled` queue document is created. Parent and staff transitions then overlay the row through the existing live Pickup subscription.

Learner readiness is an optional operational signal. After the selected pickup person is marked `arrived`, authorized staff may verify that person and record `released` directly. The learner may still move `arrived` to `ready` after packing and tidying. Staff identity verification, authorized-picker checks, selected-picker receipt, tenant boundaries and atomic audit events remain required.

## 2026-10-15 — One immediate parent Pickup action

The Pickup screen leads with the live record and the only parent action appropriate to its state. The workshop calendar is secondary; the full lifecycle and cancellation stay behind disclosures. A separate notes view keeps a private reminder from competing with the handoff decision. The view change does not authorize a new actor or transition: Firestore and command contracts remain the authority.

## 2026-10-15 — Learner readiness signal and physical release

Arrival means the selected picker is at MakerLab; it does not mean the learner may leave. The exact linked learner can signal `ready` after packing and tidying, but this signal does not gate the operation. Staff release is valid from `arrived` or `ready` after verifying the authorized picker. The learner remains inside until the staff handoff is recorded.

Pickup notes use an append-only subcollection on the queue entry. Only the initiating parent and exact learner can read or add messages, each message is limited to 500 characters, and the thread becomes read-only after a terminal state. This keeps everyday reminders private without turning the staff pickup desk into a family chat reader.

## 2026-10-15 — Showcase deletion requires a recent password session

Only a verified learner may delete their own `showcase-template` project. The client reauthenticates with the account password immediately before deletion; Firestore requires the password sign-in provider and an authentication age of at most five minutes. Learner updates preserve `templateId` so an assigned project cannot be relabeled for deletion. Kiosk and PIN sessions cannot perform this action. Keybank identity is its generated operation ID, not its label or username.

## 2026-10-15 — Parent contact email is not login authority

The parent login is the exact Firebase Auth UID plus academy-issued login ID. An enrollment contact email is not proof of a working SparkQuest account. Staff must verify the real parent and the family links before issuing a replacement. A password card is recreated by rotating the password; plaintext is not stored for later display.

A one-word legacy parent field is treated as a family label during replacement. Staff must enter a verified full name; the previous family alias may still suggest the new login ID. A complete recorded parent name remains a conflict check.

## 2026-10-12 — Recover replaced lazy assets through the current document

Vercel replaces hashed assets on each standalone SparkQuest deployment. An already-open tab can request an old `StudentWizard` chunk that the current deployment no longer contains. On a Vite preload or React lazy import failure, refresh the document once per two-minute window to load the current asset map. Preserve the signed-in session and route. A repeated failure stays on a recovery screen with a manual refresh action; it must not clear local authentication state automatically.

## 2026-10-12 — Reuse the learner pipeline for the student journey

The student visual pass composes `LearnerWorkbench`, `LearnerInstructorUpdates`, `LearnerMissionBoard`, `StudentMissionDetails`, and the parent's 011Y component. View switching is local UI state; canonical project, mission, review and identity selectors still drive content and actions. No new student data model or parallel submission path was introduced.

## 2026-10-12 — Project color follows the opened card

Carry the clicked card tone into its dedicated detail page, including the hero and the introduction accent; keep step status colors independent so progress still has one meaning. The parent viewer requests resized WebP for only our public raster assets and MakerLab Firebase Storage image URLs on Vercel. Use a small set of widths and quality 65, leave vector artwork alone, and fall back to the original URL if optimization fails. Keep original proof links available at full resolution.

## 2026-10-12 — Parent delight stays optional and truthful

Use blue for the current project's primary card and rotate other cards through the established lime, lavender, mint, and warm orange family. Color is visual rhythm; project status remains written on every card. Parent sound is opt-in, generated locally in short quiet cues, and remembered on that device; no page-load audio. The supplied O11Y asset exposes a verified `Hit` trigger but no confirmed emotion enum, so vary its surrounding guide colors and reaction accents by page context without claiming separate Rive states. A dedicated `role=parent` entry changes presentation and PWA metadata only; the existing Firebase session, parent role, tenant, and guardian links still govern access.

## 2026-10-12 — Invite each parent once after family access loads

Show the install invitation only in a verified parent session with a loaded family, so the parent first sees the value and the sheet never interrupts sign-in. Persist dismissal per parent UID on that device. Use the native browser prompt only when offered; otherwise show browser-specific home-screen steps. Do not imply that family records are available offline.

# 2026-10-12 — Pickup uses existing accounts and an audited handoff

Use the existing academy-issued family accounts for pickup actions and the existing Edufy staff identity for verification and release. A separate pickup account type would duplicate identity and guardian authorization. Bind every request to one learner, tenant, day and active selected picker. Require a same-transaction event for each transition, preserve the initiating parent, and allow receipt only from the selected picker. Give instructors the Pickup Status workspace; a future reception-only user should be expressed as a restricted staff role rather than a new product identity.

---

## 2026-10-12 — Parent journey and installable shell

Give a parent one main decision at a time: choose a learner, see this week's work, open a dedicated project page, or check the next workshop and Pickup. Keep upcoming projects visual. Project steps use distinct progress colors and reveal their detail in place without resetting scroll. Keep the child-specific mobile navigation available throughout the journey while allowing it to recede during downward reading. Use the same contextual 011Y mascot for guidance and loading. The installable parent shell does not cache authenticated family data or add a new Pickup command.

## 2026-10-12 — Family label and repeat sharing

When a parent legal name is unavailable, use a learner-derived family **display label** for account issuance. Prefer an exact match with the recorded `p.*` login token before defaulting to the learner's final name token. Never treat that label or shared surname as guardian proof: staff relationship verification, exact UID, tenant and saved family links remain the access gate. Do not persist a recoverable parent password. To share access later, issue a fresh one-time password, display its card to authorized staff, and invalidate the prior credential.

## 2026-10-11 — Replace legacy parent invitations by exact UID

An old email invitation is a recorded account, not proof of a usable SparkQuest credential. Replacement requires staff verification, an active same-tenant parent Auth/profile, and a consistent exact-UID family set. Issue a fresh login and password, move all learners tied to that UID together, retire the old Firestore access, then disable its Auth user. Keep password reset for retaining a verified login ID. Never merge by surname, contact email or phone.

## 2026-10-11 — Use a shared isolated demo for two-app acceptance

Run Edufy, the trusted parent API and SparkQuest against one explicit `demo-parent-journey` localhost Firebase emulator project. Seed learner and operational records, then issue the parent password through Edufy itself. Keep the local connection switch and CSP exception in development only; a synthetic family preview alone is not acceptance of the issue-to-sign-in flow.

## 2026-10-11 — Family credentials and journey live in SparkQuest

Treat a parent login as an academy-issued Firebase ID plus a one-time password, even when the ID is email-shaped and has no inbox. Edufy staff issue/reset and directly share the card; the parent's destination is SparkQuest. Present child-specific project, media and Edufy operational facts in a mobile-first read-only workspace. Keep gallery permission distinct from portfolio permission and narrow Pickup writes to learner role until a separately approved parent command flow exists.

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
