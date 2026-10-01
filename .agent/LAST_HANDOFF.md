# Latest handoff — SparkQuest review security Phase 2 (local implementation)

Completed 2026-10-01. New learner projects use `reviewProtocolVersion: 1`; instructor step decisions store proof-bound canonical `stepReviews`. Queue visibility, learner feedback/status, instructor status and final publication derive from this protected state. Direct learner writes cannot alter it, changed proof becomes pending again, forged nested notes are ignored, and forged `steps.status = done` cannot unlock final publication. Legacy records stay readable without an automatic migration.

Verification: 59 review assertions; all nine domain suites (169 counted plus import/payload); isolated localhost review, 14-assertion learner-pipeline and profile-assignment emulators; scoped TypeScript; SparkQuest 2,244-module and Edufy 4,445-module builds. Write-free Chrome completes revision/resubmission/step approval/final publication with three decisions and zero desktop overflow; the dialog is visible at 412px with zero phone overflow. Existing bundle/Firebase/CDN warnings remain.

No production data, rules deployment, index/API change, commit, push, Hostinger/Vercel release or Electron packaging occurred. Next: designated instructor/learner acceptance for one mission and one Showcase with real tenant links/attachments, then a clean coordinated client/rules release. Do not deploy the mixed worktree wholesale. Details: docs/sparkquest/REVIEW_SECURITY_PHASE_2.md.

---

# Latest handoff — SparkQuest review security Phase 1 (local implementation)

Completed 2026-10-01. Firestore now routes `student_projects` writes by authenticated role. Learners can still create, edit, submit proof and resubmit, but cannot seed or overwrite top-level review history, reviewer identity, feedback, XP, publication time/status, or forge a changes-requested decision. Published learner projects are rule-level read-only. Instructor/admin tenant writes retain their prior path.

Verification: the isolated localhost review emulator denies direct SDK forgery of every protected field and then completes the valid proof/revision/resubmission/concurrent-decision/publication path. Profile-assignment concurrency/denial regression and the 14-assertion learner pipeline pass. All nine domain suites (155 counted assertions plus import/payload), scoped TypeScript, standalone SparkQuest build (2,244 modules), and integrated Edufy build (4,445 modules) pass. Existing bundle/Firebase/CDN warnings remain.

No production data, rules deployment, index/API change, commit, push, Hostinger/Vercel release or Electron packaging occurred. The mixed worktree must not be deployed wholesale. Next: designated instructor/learner acceptance with real tenant links and attachments, then a clean coordinated client/rules release. Nested `steps` still duplicates review fields and needs a protected map/subcollection schema before the per-step audit can be called tamper-evident. Details: docs/sparkquest/REVIEW_SECURITY_PHASE_1.md.

---

# Latest handoff — Instructor learner workspace Phase 1 (local implementation)

Completed 2026-10-01. Canonical instructor profiles show saved current/previous-year builds, next step/progress, all-year pending work, eligible missions and newest-first decisions with direct history access. The searchable one-learner assignment dialog waits for a real transaction, retains selections on failure and does not create progress. Additive `targetAudience.additionalStudents` shares learner eligibility; class dispatch/editor transactions preserve concurrent profile additions. Loading/error/retry states avoid false empty-record claims; inactive/ambiguous learners cannot be assigned and unlinked projects are flagged.

Verification: scoped TypeScript, all nine domain suites (40 new desk assertions plus existing suites), isolated localhost demo Auth/Firestore concurrent assignment/role/tenant/draft/identity/preservation tests, both production builds, desktop 1,422 CSS px/phone 433 CSS px fixture, failure/retry, direct history, review-to-profile updates and keyboard focus. No dedicated agent-check is configured; existing Atlas context reader ran. Existing build/CDN warnings remain. See docs/sparkquest/INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md.

Synthetic-only localhost DEV preview: `?designPreview=learnerDesk`. Supplemental unassignment/per-recipient assignment history, older-client audience replacement, tenantless template copying and designated-account acceptance remain open. No production data/Storage mutation, rule/index/API edits, commit, push, deploy or Electron package. Stop here; preserve unrelated sharing/parent/visual work and scope the next phase separately.

---

# Previous handoff — Review reliability Phase 1 (local implementation)

Completed 2026-10-01. Review inbox has canonical step/final selectors, newest-first ordering, searchable proof entries and load/error/retry states. The independent live review reader shows saved proof/progress/history, uses fresh-read proof-bound transactions and preserves feedback on failure. Student resubmissions retain URL/note/MIME versions; stale learner tabs and instructor editors cannot replace new decisions. Final submit waits for persistence. Canonical profile/Auth UID aliases group projects without personal-data merging.

Verification: scoped TypeScript; eight domain suites (45 new review + 70 counted regression assertions, plus import/payload suites); real localhost demo Auth/Firestore review/concurrency/stale-save/permission tests; standalone SparkQuest 2,239-module and integrated Edufy 4,442-module builds; desktop 1,422px/phone 433px browser flow, errors, image loading, keyboard trap/restore and whitespace checks. Existing CDN/Firebase/bundle warnings remain. No dedicated agent-check script is configured.

Local demo: `?designPreview=reviewLoop`, outside providers, synthetic-only. No production records/uploads/deletions, rules/indexes/APIs, commits, pushes, deployments or public shares changed. Review-field rules still need coordinated hardening; legacy data/file issues still need designated-account acceptance. Next separate phase: instructor student-profile/assignment workspace, then vivid visuals, celebration, guardian progress and opt-in sharing. Stop here. Details: docs/sparkquest/REVIEW_RELIABILITY_PHASE_1.md.

---

# Previous handoff — Learner workspace Phase 1 (local implementation)

Completed on 2026-10-01. Current work is pinned outside mission filters; previous years moved to Field Log, saved previews retain frozen steps, and verified owned builds no longer disappear when targeting context changes. Navigation now has 264px width, 64px rows, 24px icons and 16px labels. Dashboard/Showcase share calm paper/lime tokens; naming uses a shared focus-stable accessible dialog with inline failure, and Showcase is a keyboard-accessible light editor with a compact toolbar.

Validation: scoped TypeScript, 70 workflow/content/assignment/identity/workbench assertions, standalone SparkQuest build (2,234 modules), integrated Edufy build (4,442), whitespace check and desktop/phone/keyboard fixture QA pass. Existing bundle/Firebase/CDN warnings remain; no dedicated agent-check command is configured. No production writes/uploads/deletions, rules/index/API changes, commit, push, deployment or Electron packaging occurred.

Local previews: `?designPreview=workbench`, `?designPreview=showcase`. Preserve write-free fixtures and all reviewed learner identity/upload/review contracts. Stop here. Designated-account end-to-end acceptance and remaining Pickup/Build Rhythm/nested game polish are separate next steps. Details: docs/sparkquest/LEARNER_WORKSPACE_PHASE_1.md.

---

# Previous handoff — Student project review loop (local implementation)

Completed locally on 2026-09-30. Instructor SparkFactory now has an explicit Review Inbox for every tenant-scoped submitted project, including independent Showcases that are not attached to an assigned mission. Review opens Showcase media and links, supports project comments, changes requested, approval/publish, XP, reviewer attribution, timestamps, and durable review history. Students receive those decisions through the existing real-time project listener in both regular missions and Showcase states; Field Log cards also expose feedback, and Showcase cards no longer disappear from the learner project list.

Validation: SparkQuest TypeScript and the integrated production build pass. Local-only previews at `?designPreview=review`, `?designPreview=showcaseReview&outcome=revision|approved`, and the existing Studio states visually verified instructor evidence/comment controls, learner revision feedback, learner approval, and responsive no-overflow behavior. The repository-wide TypeScript command still fails on unrelated historical Maker Pro/root errors; the scoped SparkQuest project is clean. The Edufy data connector was not callable in this environment, so no production learner records were inspected or changed. Firestore rules, indexes, APIs, production data, commit, push, and deployment were not changed.

Next: run one designated instructor/learner acceptance record through submit → request changes → resubmit → approve, then release the client separately if accepted. Any review-field rule hardening or legacy project backfill remains a separately reviewed Firestore/emulator scope.

---

# Previous handoff — Mission Autopilot (local implementation)

Completed on 2026-09-30. Instructor Mission library → Import CSV now opens the full-content guided completion wizard. It handles partial rows, reference corrections, detailed phases, requested uploads, learner preview, stable repeat keys, atomic workflow/draft creation, results/retries and separate assignment. The development/local-host preview is ?designPreview=import and uses synthetic content only.

Validation: import and existing content/workflow/assignment smokes, SparkQuest TypeScript, real isolated Auth/Firestore transaction/permission tests, standalone SparkQuest and integrated Edufy builds pass. Browser fixtures verified a complete CSV and a partial CSV progressing through brief, workflow, audience, cover attachment and review; local draft/assignment results and desktop/phone overflow/console checks pass. Existing build warnings remain. No dedicated agent-check script is configured.

Next: designated-account acceptance and then a separately requested release. ZIP bundles, existing-record updates, durable wizard resume and abandoned-upload retention are deferred. See docs/sparkquest/MISSION_AUTOPILOT.md. Unrelated dirty work, production data, rules, indexes, APIs and release state are preserved.

---

# Previous handoff — SparkQuest learner design production release

Released on 2026-09-30 as Git commit `acb7755b823cad9a64d4e4715e64c2715d363a3b`. `origin/main` was promoted by fast-forward from a clean worktree; no Firebase rules, indexes, API files, credentials, or unrelated local work were included. Hostinger served the updated Edufy bundle at `https://edufy.makerlab.academy/`, and the standalone student frontend built successfully on Vercel and was aliased to `https://sparkquest-makerlab.vercel.app`.

The production learner scope now includes the Sparkbook mission library/navigation, structured mission brief, Studio workflow and proof/review states, Spark Exchange, Field Log, Play Lab, Evidence Wall, Key Cabinet, and maker profile. The deploy also preserves the reviewed security fixes already on `origin/main` and adds a frozen workflow snapshot for newly started structured missions.

Release validation: SparkQuest TypeScript passed; URL, identity, mission-content, and assignment smokes passed 38 assertions; the clean SparkQuest build passed with 2,223 modules; the clean Edufy build passed with 4,434 modules; Vercel's production build passed with 2,223 modules; both production URLs returned HTTP 200 with updated assets. Existing Firebase mixed-import and large-chunk warnings remain.

Next: run designated-account production acceptance with one learner and one instructor. Prioritize the learner loop first: sign in, open an assigned mission, start/resume, upload proof, request/receive revision, resubmit, approve, and confirm the workflow snapshot stays unchanged. Remaining visual debt is nested arcade players/game dialogs, Pickup, and Build Rhythm.

---

# Previous handoff — SparkQuest learner field-kit destinations

Completed locally on 2026-09-30. The Sparkbook language now covers the Play Lab, Evidence Wall, Key Cabinet, maker-profile card, desktop field-kit rail, and mobile five-destination navigation with its compact secondary kit sheet. The touched learner surfaces use the same paper/lime/orange/ink system as missions, Studio, Exchange, and Field Log while preserving arcade credit, credential, avatar, gallery, session, and routing contracts.

The Evidence Wall now requires the verified learner organization and no longer falls back to `makerlab-academy`. Touched arcade and credential feedback uses inline status and an accessible delete confirmation instead of native alerts/prompts. Development-only previews are available at `?designPreview=arcade`, `gallery`, `inventory`, `profile`, and `navigation`; preview actions remain local.

Validation: SparkQuest TypeScript and production build pass, as does the integrated Edufy production build (4,436 modules). URL, identity, assignment, mission-content, workflow, Firestore-payload, and Phase 2 smokes pass. Desktop and phone browser review passed for all five preview destinations with zero document overflow; navigation kit-sheet, arcade tab/search, key-form, and avatar-family interactions passed. The only console message is the existing Tailwind CDN warning. No production write, rule/index/API change, commit, push, or deployment occurred.

Next: complete designated-account mission QA before release. The remaining learner visual debt is inside nested arcade players/game dialogs plus Pickup and Build Rhythm, not the destination shell itself.

---

# Previous handoff — SparkQuest rewards and portfolio expansion

Completed locally on 2026-09-30. The Sparkbook learner language now extends beyond mission work into two daily destination surfaces. `SparkStore` is now the Spark Exchange: it leads with balance and the next build reward, uses ticket-like maker reward cards, keeps affordability and request state explicit, and organizes themes, avatars, and celebration effects as secondary collections. `StudentPortfolio` is now a field log: project status, completed stages, improvements, proof count, Sparks, and collected skills read as one evidence archive rather than a generic trophy gallery.

Development-only previews are available at `?designPreview=store` and `?designPreview=portfolio`. Preview reward requests, category changes, collectible actions, and export feedback remain local. The authenticated store still uses the existing reward actions. Portfolio reads now require the verified organization attached to the learner profile and no longer fall back to `makerlab-academy`.

Validation: clean-browser desktop and phone review passed without document overflow; reward request state, category navigation, and portfolio export feedback passed; SparkQuest TypeScript, workflow/content/assignment/identity/payload smokes, standalone build, and integrated Edufy build pass. Existing Firebase mixed-import and large-chunk warnings remain. No production write, rule/index/API change, commit, push, or deployment occurred.

Next: complete designated-account end-to-end mission QA before release. Continue the Sparkbook migration through the arcade/gallery, inventory/profile, and learner navigation surfaces without weakening the existing data contracts.

---

# Previous handoff — SparkQuest structured Studio and Sparkbook system

Completed locally on 2026-09-29. The structured mission work from the earlier SparkQuest prototype is now integrated into the active Edufy checkout: mission briefs, versioned workflow snapshots, workflow-derived student steps, checklist/proof requirements, mentor review/revision states, program-aware assignment, and structured instructor editing. Existing student projects keep their stored snapshot instead of changing when an instructor later edits the source workflow.

The Sparkbook learner direction now covers the authenticated mission library, student mission brief, roadmap, active bench rail, task worksheet, evidence/review/revision states, and responsive phone layout. The system uses lime mission surfaces, ink outlines and offset shadows, an orange orbit accent, and quiet paper-grid instruction/proof surfaces. Local development previews are available at `?designPreview=mission` and `?designPreview=studio`; Studio fixtures support `studioState=review|revision|approved|complete|submitted`. The earlier `?preview=student-project` fixture remains available.

Mission template create/update still sanitizes nested `undefined` values immediately before Firestore persistence, preserving timestamp/reference/sentinel values and closing the reported `addDoc()` failure.

Validation: standalone SparkQuest TypeScript passes; workflow, mission content, assignment, identity, and Firestore payload smokes pass (48 assertions plus the payload guard); standalone production build passes (2,223 modules); the integrated Edufy production build passes (4,436 modules). Clean-runtime browser QA covered the mission brief, active task worksheet, mentor revision feedback, and mobile layout without horizontal overflow or new console errors. Existing Firebase mixed-import and large-chunk warnings remain. No production write, rules/API change, commit, push, or deployment occurred.

Next: use designated instructor and learner accounts to create one real structured mission, assign it, submit evidence, request a revision, approve it, and confirm the frozen workflow snapshot end to end before release.

---

# Previous handoff — SparkQuest learner project-details design demo

Completed locally on 2026-09-29. Added a static, local-host-only learner project-details preview at `?preview=student-project`. The demo applies the proposed Sparkbook direction to one complete student page: a lime mission hero, clear quest progress, selectable completed/current steps, visibly locked future steps, a contextual next-action card, learning outcomes, materials, responsive phone layout, keyboard focus, and reduced-motion handling.

The preview is isolated from authentication, Firebase, learner records, mission writes, and the production routing contract. It does not replace `ProjectDetailsEnhanced` or `StudentWizard`; it is an approval surface for the design direction. SparkQuest TypeScript, production build (2,220 modules), desktop browser review, phone browser review, step interaction, and zero document-level horizontal overflow passed. Existing Tailwind CDN, Firebase mixed-import, and large-bundle warnings remain. No production data, rule, API, commit, push, release, or deployment changed.

Next: approve or revise this page before mapping its tokens and components into the authenticated learner workflow. Do not connect the demo CTA to real project state until that implementation scope is explicitly approved.

---

# Previous handoff — SparkQuest instructor deep-workflow polish

Completed locally on 2026-09-24. The remaining instructor workflows now use the shared mission-workshop system: Rewards/Contests/Orders, mission editing and publishing, both CSV importers, student portfolio create/edit, and submission review. The pass adds labeled 44px controls, accessible dialogs, inline async errors, explicit loading/destructive states, production-safe state styling, visible evidence actions, and lazy media. Review evidence no longer creates Blob URLs during render.

The project write path is safer: instructor saves keep the current authenticated Firebase identity, missing tenant context blocks visibly, and neither portfolio editor nor importer can fall back to `makerlab-academy`. Reward and contest writes include organization and timestamps. Validation passed: assignment smoke (7), TypeScript, Auth/Firestore emulator pipeline (13), standalone SparkQuest build (2,217 modules), and Edufy root build (4,430 modules). Existing Firebase import/chunk warnings remain. No production record, rule, app bundle, commit, push, or deployment changed. Authenticated instructor desktop/phone and designated write QA remain the release gate. See `docs/sparkquest/RESCUE_PHASE_6.md`.

---

# Previous handoff — SparkQuest instructor workspace coherence

Completed locally on 2026-09-24. Every instructor route now sits inside one compact mission-workshop system. Navigation follows Operate, Build, Configure, Classroom Access, Preview, and System. Templates reads canonical mission audiences; Class Progress follows program → grade → group → mission → submission without raw cross-tenant reads or debug output; Students is a focused portfolio/review workspace. Workflow, station, badge, Toolbox, gamification, and preview routes now share responsive page structure and accessible controls.

Configuration pipeline hardening accompanies the UI: workflows, stations, badges, tool links, and assets write the active organization, while Toolbox listeners are tenant-scoped. Validation passed: assignment smoke (7), TypeScript, Auth/Firestore emulator pipeline (13), standalone SparkQuest build (2,217 modules), Edufy root build (4,429 modules), and local authenticated learner render. Existing Firebase import/chunk warnings remain. No production record, rule, app bundle, commit, push, or deployment changed. Authenticated instructor desktop/phone and designated write QA remain the next release gate. See `docs/sparkquest/RESCUE_PHASE_5.md`.

---

# Previous handoff — SparkQuest instructor mission dispatch

Completed locally on 2026-09-24. The instructor overview, mission library, and assignment modal now form one coherent dispatch path. Whole-grade, selected-group, and specific-student assignment updates the mission audience and publishes it; the former code that created fake enrollment records was removed. Instructor and learner sides share one tested audience matcher, direct learner IDs remain authoritative, and mission writes include tenant/audit data.

Validation passed: assignment smoke (7), TypeScript, SparkQuest production build (2,216 modules), Auth + Firestore emulator pipeline (7), and SparkQuest diff checks. Existing Firebase import/chunk warnings remain. No production record, rule, app bundle, commit, push, or deployment changed. Authenticated instructor desktop/phone visual QA remains the next release gate. See `docs/sparkquest/RESCUE_PHASE_4.md`.

---

# Previous handoff — SparkQuest production student-project permission hotfix

Deployed on 2026-09-24 to the default Firestore database only. The live `student_projects` rule now permits an authenticated `student` to create and update a project when the project organization matches the user's organization and the `studentId` is either the authenticated UID or a canonical learner record linked to that UID. Staff behavior, reads, and deletes are unchanged.

The release was generated from the exact live ruleset, compiled remotely with zero errors or warnings, and promoted as ruleset `80bea234-b931-4202-8de5-50d7c1c32a25`. A post-release check confirmed that `cloud.firestore` points to that ruleset and that rerunning the guarded patch is a no-op. No student project, application bundle, Storage rule, index, API, Git commit, push, or Hostinger deployment was created by this hotfix.

Next: have the learner retry **New Project** in the already-open local SparkQuest client. Do not deploy the broader Phase 3 Firestore/Storage rules until the Storage authorization suite can run and the matching client release is explicitly approved.

---

# Previous handoff — SparkQuest rescue Phase 3

Completed locally on 2026-09-24. SparkQuest no longer waits on an artificial boot timer or starts learner sessions with admin-only listeners. Large workflow surfaces are lazy-loaded; focus history and pickup state load on demand; independent dashboard reads run concurrently. A direct student mission assignment is authoritative before grade/group targeting, while the latest active enrollment is fallback targeting context only. Verified learners can create personal/showcase projects for the current academic year even without a current-year enrollment.

Evidence and showcase files now upload resumably to tenant/user/project-scoped Firebase Storage paths and only their URLs enter Firestore. Permanent permission/auth failures are not retried. Local Firestore rules accept canonical learner focus sessions, and new Storage rules isolate each learner path.

Validation: SparkQuest production build passes (2,215 modules); initial JavaScript is 1,106.68 kB / 291.84 kB gzip versus approximately 1,416 kB / 365 kB gzip before splitting. Auth + Firestore emulator pipeline passes seven assertions covering instructor mission creation, student visibility, project creation, step/evidence metadata, focus history, and cross-student denial. The signed-in local dashboard became usable in approximately 3.2 seconds after reload with New Project and Showcase Project enabled and no fresh Firestore permission errors. The remaining console warning is the existing Tailwind development CDN.

Storage emulator execution is still pending because its rules-runtime JAR was not cached and could not be downloaded. No live project/upload was created, and no rule, API, client, release, or deployment was published. Next: complete Storage emulator proof, then explicitly approve and ship the client plus Firestore/Storage rules as one coordinated release. See `docs/sparkquest/RESCUE_PHASE_3.md`.

---

# Previous handoff — SparkQuest rescue Phase 2

Completed locally on 2026-09-24. Edufy no longer opens SparkQuest with a naked project link. It requests a server-validated launch tied to the Firebase actor, tenant, app entitlement, role/permission, canonical learner, and optional project. The bridge issues a random 256-bit code, stores only its hash for 90 seconds, revalidates access during exchange, atomically consumes the session, and returns the custom token only in a no-store response. SparkQuest strips the code from history. Legacy URL token links now fail closed. Staff launches keep the staff UID and never impersonate a learner.

Added a learning-manager-only reconciliation endpoint that reads tenant users, students, and projects and returns issue codes/document IDs without names, email, phones, or credentials. It flags missing/duplicate user links, profile-pointer disagreement, and missing/unknown/ambiguous/legacy project owners. The Edufy data connector was unavailable, so no live report was executed.

Validation: 28 Phase 2 assertions pass; HTTP guards cover missing auth, invalid codes, disallowed origins, and the default-off write gate; all endpoints import; SparkQuest TypeScript/build passes (2,216 modules); Edufy build passes (4,428 modules); the signed-in local dashboard survived hot reload; invalid launch QA reached the recovery surface. Real launch-session writes remain disabled unless `EDUFY_ENABLE_APP_BRIDGE_WRITES=true`; no production data, rules, indexes, migration, release, or deployment changed.

Next: isolated Auth/Firestore emulator proof, expired-session retention, and a separately approved release/read-only production audit. See `docs/sparkquest/RESCUE_PHASE_2.md`.

---

# Previous handoff — SparkQuest rescue Phase 1

# Latest handoff — SparkQuest production student-project permission hotfix

Deployed on 2026-09-24 to the default Firestore database only. The live `student_projects` rule now permits an authenticated `student` to create and update a project when the project organization matches the user's organization and the `studentId` is either the authenticated UID or a canonical learner record linked to that UID. Staff behavior, reads, and deletes are unchanged.

The release was generated from the exact live ruleset, compiled remotely with zero errors or warnings, and promoted as ruleset `80bea234-b931-4202-8de5-50d7c1c32a25`. A post-release check confirmed that `cloud.firestore` points to that ruleset and that rerunning the guarded patch is a no-op. No student project, application bundle, Storage rule, index, API, Git commit, push, or Hostinger deployment was created by this hotfix.

Next: have the learner retry **New Project** in the already-open local SparkQuest client. Do not deploy the broader Phase 3 Firestore/Storage rules until the Storage authorization suite can run and the matching client release is explicitly approved.

---

Completed locally on 2026-09-23. SparkQuest keeps its existing product capabilities, but the unstable entry boundary was rebuilt: public hosts no longer inherit localhost return links; authentication requires a real Firebase session and one verified organization-bound learner profile; requested projects must match both verified owner identity and tenant. Anonymous kiosk, demo/base64 bridges, default tenant fallbacks, personal-data profile merging, project-title dedupe, browser-side identity repair, and browser-global Firebase debug handles were removed.

The login/account-recovery experience now uses a responsive MakerLab project-workshop direction. Final QA passed at desktop, 768 px, and 390 px with zero phone overflow. URL and identity smoke checks passed (6 and 11 assertions), SparkQuest TypeScript/build passed (2,215 modules), and the Edufy production build passed (4,427 modules). Existing Firebase mixed-import/large-chunk warnings remain. Authenticated read-only QA exposed existing `focus_sessions` and snapshot permission failures; no rules, indexes, APIs, production records, commit, push, or deployment were changed.

Next: explicitly scope the secure server-issued Edufy launch exchange and a read-only production identity reconciliation report. Do not restore the removed client fallbacks. See `docs/sparkquest/RESCUE_PHASE_1.md`.

---

# Previous handoff — Discounts in printed parent financial statements

Completed locally on 2026-09-19. The official family statement printout now recalculates its own totals from the selected enrollment rows and programs, then displays `Prix catalogue`, `Remise`, `Prix négocié`, `Payé` and `Solde` for every enrollment. Its summary card also shows catalogue total, total discount, negotiated total, total paid and balance due, so the discount is visible both in the table and at document level. Labels and footer are parent-facing French.

The shared financial resolver continues to use explicit stored offer/discount data first. It no longer invents a full discount for a legacy zero-amount enrollment when no offer or discount was recorded. Opening a statement through the Education family workspace now also resets stale program filters.

Validation: authenticated local QA with family AAJLANE shows the requested `MAD 7,500.00` catalogue price, `MAD 500.00` discount and `MAD 7,000.00` negotiated price for both negotiated StemQuest enrollments. `npm.cmd run build` passed (4,425 modules) with the existing Firebase mixed-import and large-chunk warnings; the production bundle contains the new printable labels. `git diff --check` passed. No enrollment, payment or production data was changed, and no commit, push or deployment was performed.

---

# Latest handoff — Family statement program selection in Students

Completed locally on 2026-09-19. The “Parent Financial Statement” opened from the Students/Families workspace now includes a program selector when the parent has multiple enrollments. Selected programs control the visible children/enrollment rows, expected/paid/balance totals, and the data passed to “Print Official Statement”; legacy enrollments without a program id fall back to their program name. Existing records are not changed.

Validation: `npm.cmd run build` passed locally with the existing Firebase mixed-import and large-chunk warnings. No production writes, data migration, commit, push or deployment were performed in this turn.

---

# Latest handoff — Parent receipt discounts and selectable family statements

Completed locally on 2026-09-19. Parent payment receipts now calculate and display the catalogue/listed fees, the granted discount/remise (including a per-enrollment breakdown), agreed fees and the payment total. The calculation reuses stored enrollment discount/offer snapshots and reconstructs legacy records from the program pack without rewriting the ledger.

Family statements now provide a program selector when a parent has multiple programs. The selected programs drive the family totals, children/enrollment rows, payment history and printed statement; “All programs” restores the full account. Existing data was not deleted or mutated.

Validation: `npm.cmd run build` passed locally with the existing Firebase mixed-import and large-chunk warnings. `git diff --check` passed. No production writes, commit, push or deployment were performed in this turn.

---

# Latest handoff — Consolidated operations/UI release

Completed and deployed on 2026-09-18 from a clean `origin/main` worktree as commit `6652af16fd18f285436ece1984594c61d7c73e82`.

Included in the release:

- Programs can be paused/resumed without deleting history. Paused, finished, draft and archived programs are excluded from current classes, attendance rosters, enrollment actions and finance collection queues; historical attendance and accounting transactions remain date-addressable.
- Legacy school StemQuest enrollments without run dates inherit their academic session (`YYYY-09-01` through `YYYY-08-31`), so last-year learners disappear from current attendance while historical dates remain available.
- MakerLab rolling memberships remain evergreen at program level and expire per learner after the membership duration.
- CRM leads can book generated template slots or create a same-day one-off demo with a title, time, duration, location and note. The one-off slot is placed on the operator workshop calendar and is not added to the reusable/public template catalogue.
- Education UI coherence improvements are active across Programs, Finance, Workshops, Students, Student details, SaaS admin, Expenses and the compact desktop/mobile shell.

Validation: `npm.cmd run build` passed (2,313 modules); membership lifecycle and service catalogue smoke tests passed; remote `refs/heads/main` equals the release SHA; live HTML serves `main-NKPBWqe_.js`; deployed bundle markers for custom demos, paused programs and Finance workspace are present. Existing large-chunk/Firebase mixed-import warnings and unrelated repository-wide TypeScript diagnostics remain documented; no new focused diagnostics were introduced.

No data migration, deletion, production record mutation, Firestore rules/index/API change or message send occurred. The Hostinger release ledger write was blocked by environment permissions and needs a manual entry if required. The temporary release worktree is `_release_edufy_20260918` in the parent workspace and should be cleaned up when the environment permits.

---

# Latest handoff — SparkQuest learner account-link repair

Released on 2026-09-25 as `d5f7cfee453c2a36846352e17566a8e30928a6c2`. Student authentication had succeeded, but the client attempted a restricted `students` collection query before its canonical user-profile pointer and surfaced a generic account-repair screen. `sparkquest/services/studentIdentity.ts` now resolves the direct pointer first and retains a constrained legacy lookup. Firestore permits only a signed-in student's own `loginInfo.uid + organizationId` query.

Verification passed: SparkQuest TypeScript and build, integrated Edufy build, identity 11/11, assignment 7/7, Auth/Firestore/Storage 19/19, production rules compilation/deployment, remote main, Hostinger live timestamp, and the existing authenticated local student dashboard. The standalone Vercel SparkQuest frontend remains on its older deployment until an authorized Vercel login/redeploy is available.

---

# Previous handoff — Education UI coherence and compact navigation

Completed locally on 2026-09-17. Desktop now combines page context, the reorderable working set and utility actions into one 64px-class workbar. The sidebar was reduced from 278px to 244px (224px at medium desktop) and its navigation density tightened. Mobile no longer renders the workspace-tab row or density controls, leaving one compact header plus the existing five-item bottom navigation and on-demand drawer.

The product-wide compatibility layer now presents Atlas command headers, KPI cards, toolbars and action buttons with the same restrained Education UI treatment across all authenticated modules. KPI tone is expressed by a narrow status rail and icon/detail color rather than unrelated full-card fills. Expenses recurring-charge actions now use `AtlasActionButton`. Business logic, data, permissions, routes and callbacks were unchanged.

Validation: `npm.cmd run build` passed (4,424 modules) with the existing Firebase mixed-import and large-chunk warnings. Authenticated local browser QA passed at 1440x900 and 390x844; desktop has one navigation workbar, mobile has no workspace-tab list, and Expenses KPI cards compute to white surfaces with consistent borders. No deployment or commit was performed.

---

# Latest handoff — StemQuest membership attendance and school cohorts

Completed locally on 2026-09-17. Current/future Attendance rosters now exclude learners whose rolling membership has ended, while selecting a covered historical date still shows them. The page includes a dedicated amber renewal queue for active students whose individual membership needs renewal, with the program, group, end date, overdue days and a link to the student profile. A newer active membership suppresses the old due item.

School-term programs now enforce `fixed_run`: semester 1/2 cohorts share one start and end date, late record entry does not create a personal membership clock, and completed school cohorts do not appear as individual renewals. New enrollment records persist the resolved shared start and derive the academic session from it. Legacy StemQuest records without a mode are inferred conservatively from school/company metadata.

Fixed programs now derive `finished` after the shared end date. New enrollment links/forms, active class lists, current dashboard schedules and future weekly session generation close automatically. Rolling MakerLab programs derive `evergreen`; a legacy program-level end date remains stored but is ignored for personal coverage. Existing data is never deleted or rewritten, and historical attendance remains date-addressable. Expired rolling enrollments no longer block a renewal as an active duplicate or consume class capacity.

Released from a clean `origin/main` worktree on 2026-09-17 as commit `fe1cd1a44996aa6b91f9b61a3f220d736f31c1dc`. The isolated membership smoke and production build passed; remote `main` matched the release SHA, and Hostinger served `main-CsCv_z-M.js` with the renewal and finished-program markers. No data migration, production record mutation, rule/index/API change, or message send occurred. Read `docs/programs/STEMQUEST_MEMBERSHIP_ATTENDANCE.md` before continuing.

---

# Previous handoff — Education UI production activation and invoice history editing

Completed locally 2026-09-09. The live old/blank UI was traced to `stemflow-erp-v2`, which cached HTML and returned a removed JS asset path. Local `sw.js` deletes legacy caches and no longer intercepts navigation; `index.html` registers it with `updateViaCache: 'none'` and reloads once when control changes. Education UI is now the authenticated default; `?ui=atlas-legacy` is the rollback.

Finance history now exposes **Modifier** for active invoices. The prefilled editor updates customer, dates and lines while keeping the existing ID/number/sequence/currency and linked context. Transactions reject stale revisions, another organization, cross-year issue dates, credit notes and credited invoices. Formation and service invoices now use independent annual sequences (`YYYYFnnn` / `YYYYSnnn`), automatically recover from saved invoice history and can be safely advanced by managers. PDFs no longer display due date or “Document comptable”. Focused strict TypeScript, domain smoke, real Auth/Firestore emulator and isolated desktop/mobile browser workflow pass; rerun the production build in the clean release worktree.

Release only the approved Education UI/cache/Finance delta from current `origin/main` via a clean Hostinger worktree. Preserve the mixed original worktree and do not include `.env` or unrelated local Admissions/provider work.

---

# Previous handoff — Finance Service Catalogue Phase 1

Completed locally 2026-09-09. Source catalogue extraction is complete (eight core services from PDF p4–12, no prices provided). Finance now offers a catalogue and a separate service-invoice form with client selection, editable multi-line snapshots, totals, preview, issuance and existing print/export/credit behavior. No participants or program required for services.

Validation: domain/snapshot/print/export checks, real demo Auth/Firestore transaction and denial suite, focused strict TypeScript, and isolated desktop/mobile light/dark browser workflow pass. Production build passes with existing import/chunk warnings. Repository-wide TypeScript still has unrelated errors; changed Finance/service files have no diagnostics. No repository agent:check script exists. See `docs/finance/SERVICE_CATALOGUE_PHASE_1.md` for commands and evidence.

Permissions: existing nested invoice persistence is organization-manager-only. New service actions match this boundary (active owner/admin/super_admin); granting accountants or admission officers access requires separate role/rules alignment. Catalogue schema/version/archive gates are local rules only. No rules/index/config deployment, production writes, external messages, staging, commits or pushes occurred. The mixed dirty worktree was preserved.

Source of truth: `types/serviceCatalogue.ts`, `utils/serviceCatalogue.ts`, `services/serviceCatalogue.ts`, the two Service components under `components/finance`, and existing `services/financeDocuments.ts`. Stop at this phase boundary. Details, decisions, issues and changelog are in `docs/finance/`.

Browser/source screenshots and TypeScript logs are in the parent workspace `.qa-runtime/`; generated test bundles are under ignored `node_modules/.cache/services`. Browser source: `components/finance/serviceCatalogue.browser.smoke.mjs`. Run domain/rules bundles through `scripts/test-service-catalogue.mjs`.

Previous Admissions handoff and QA runtime instructions retained below:

---

# Last Handoff

## Current phase

Phase 6 completed on 2026-09-09. Phase 7 provider readiness has not started.

## Completed

- Added the Education UI Admissions passport WhatsApp assistant: consent, tenant templates, editable preview, opening WhatsApp, explicit sent/not-sent and parent response.
- Reused tenant Communications templates. Unknown source names/programs remain unresolved variables.
- Extracted normalizePhoneForWhatsApp unchanged into utils/whatsappPhone.ts, with a compatibility re-export from utils/helpers.ts.
- Added recordAdmissionWhatsAppActivity, shared command validation, Firebase/in-memory stores and the admissions.whatsapp permission.
- Stored immutable activities with actor/fingerprint and a versioned durable consent snapshot. Non-consent activities must match persisted consent; opt-out survives the latest-30 history window.
- Hardened Firestore for active approved operators, tenancy, immutable fields, reciprocal transaction state and consent. Simplified Admissions rule expressions after real emulator testing exposed the 1,000-expression limit.
- Corrected browser handoff and blocked-popup handling, added reload/focus/keyboard/mobile behavior and accurate Finance reminder labels.

## Validation

- Ten Admissions smoke/contract suites pass: WhatsApp domain 22, WhatsApp command 28, WhatsApp integration 17, rules 24, notes 16, projection 22, offer/Finance 28, enrollment integration 13, Workshop links 11 and Workshop integration 11.
- Focused Admissions TypeScript passes. Repository-wide legacy errors remain outside this slice.
- Auth + Firestore emulator suite passes: all six WhatsApp states, note/replay, valid direct client batch, actor/delivery/consent forgeries, opt-out bypass, disabled account, unauthorized role, tenant crossing and immutable-record denials; consent still loads after 31 newer activities.
- Browser harness uses the actual UI/domain/command with mocked external boundaries. Preview, launch/result separation, response, popup rejection, concurrent opt-out, focus trap/return, Escape and zero overflow at 1440/390 pass. Screenshots were visually inspected.
- Final production build passes: 4,418 modules. Existing Firebase import overlap and large App chunk warnings remain.
- No repository agent:check command exists; scoped checks were used. Whitespace checks on changed tracked boundaries pass.

## QA runtime

Portable Java 21, checksum-verified Firestore emulator and UI screenshots are in the parent workspace .qa-runtime/, outside the application repository. For the emulator, prepend .qa-runtime/java21/jdk-21.0.12.1+1-jre/bin to PATH and set FIREBASE_EMULATORS_PATH to .qa-runtime, then run the documented demo emulator command. Firebase CLI is cached at C:/Users/user/AppData/Local/npm-cache/_npx/25826ab6861d6032/node_modules/firebase-tools/lib/bin/firebase.js.

Browser harness: modules/admissions/ui/admissionWhatsApp.browser.smoke.mjs. Point ADMISSIONS_PLAYWRIGHT_PATH at an installed Playwright index.mjs; the tested cached module was C:/Users/user/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs.

## Remaining boundaries

The assistant is development-only. Local rules were tested, not deployed. No production records or messages were created. Legacy WhatsApp imports remain notes, full history pagination and structured task scheduling remain future work, and no official provider is connected. The phase does not introduce automatic stage changes or due-date reminders.

## Exact next task

Read ACTIVE_TASK for optional Phase 7 readiness. Inspect existing account/provider context before requesting any missing external authority. If provider integration is deferred, explicitly scope the remaining operational task/lifecycle commands or Phase 8 hardening.
