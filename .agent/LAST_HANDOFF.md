# Latest handoff — 2026-10-21 Edufy workspace navigation v2

The user reported that the live application still displayed the older menu. This focused release promotes the completed compact rail, workspace panel, command search, pinned and recent destinations, mobile bottom navigation, and contextual page heading from the local Design System reference. It changes only the school shell presentation and its local preference handling; module logic, authentication, Firebase paths, and school records are unchanged. The remaining module-specific Design System candidates stay local pending their documented acceptance.

---

# Previous handoff — 2026-10-20 reviewed school modules

The user requested publication of the completed, polished Edufy app modules. This clean `origin/main` release cut includes Programs, the Attendance desk, Classes, Calendar, Admissions/Workshops, and the shared confirmation modal. The Programs roster also formats start dates with the existing helper. It carries only their final reviewed files plus the Education tab/register/status primitives required for integration. The production build, Education System check, membership check, roster-print smoke, repository agent check and diff check pass. Repository-wide TypeScript remains red from existing diagnostics; none match the changed release files.

Finance, Expenses, Student Details, Students register, Pickup, Communications, Learning/Portfolio, Team, Marketing, the unreviewed school-operations bridge, SparkQuest, and Edufy MCP remain outside this cut. The module reports retain their real-role, persistence, print, and physical-phone follow-ups; no production records or protected API/Firebase paths are part of this code release.

---

# Previous handoff — 2026-10-20 scoped release review

Current `origin/main` is `c71d873`. A clean main-based candidate formats Programs roster start dates in desktop and mobile display using the existing `formatDate` helper. The production build, Education System check, repository agent check and diff check pass. The full school Design System rollout remains queued: its final physical-phone and designated-role acceptance is open, and the school-operations bridge `d92be59` is unreviewed. No push or deployment occurred in this review.

---

# Previous handoff — Edufy sign-in loading

On 2026-10-16 the school workspace startup gate was reduced from fourteen role-dependent Firestore snapshots to academy settings, students, programs and enrollments. Other module listeners begin after those first records; add-on request status loads separately from required entitlement checks. An eight-second wait no longer offers a reload unless an actual error occurs. The existing role, tenant and required-read failure gates remain. Build and scoped TypeScript validation are recorded in `docs/education/KNOWN_ISSUES.md`; designated signed-in phone/desktop timing and data acceptance remain pending. No production data or rules changed.

---

# Previous handoff — Classes, attendance, schedule focus

On 2026-10-15 the next school-day phase added live priorities ahead of metrics: today's class groups and attendance, remaining attendance marks, and instructor coverage gaps. Class dates use the local day, attendance understands French and English weekday labels, and only attendance managers see assignment/sync controls. Light and dark surfaces stay within the school palette. The build, weekday smoke, scoped TypeScript and diff check pass. A designated staff account must still check real data and actions on desktop and phone. No push, deployment, rule or production data change. See `docs/education/CLASSES_ATTENDANCE_SCHEDULE_FOCUS_2026-10-15.md`.

---

# Previous handoff — Programs, Students, Pickup focus

On 2026-10-15 the school-theme worktree gained a task-level pass across the first three requested modules. Programs presents its next action from real readiness, waiting families and empty groups. Students retains direct profile navigation while making passport preview explicit and consistent with the active worklist; its scoped surfaces now follow both school themes. Pickup moves the live verification queue before the full roster, adds a current handoff focus, and treats older `waiting` records as staff review rather than an invalid arrival action. No lifecycle transition, data selector, permission, API or Firebase rule was changed. Production build, scoped TypeScript, two Pickup domain smokes, Atlas context reader and whitespace check pass. Signed-in phone acceptance is pending; local review is at `http://192.168.11.105:5202/` on the same Wi-Fi (current Wi-Fi IP; it may change). No push or deployment. See `docs/education/PROGRAMS_STUDENTS_PICKUP_FOCUS_2026-10-15.md`.

---

# Previous handoff — Edufy school-day themes

On 2026-10-15, an isolated Edufy worktree at `agent/edufy-school-theme-20261015` gained a light-default, navy/cobalt school workspace and a tenant-persisted dark option. The dashboard leads with the real day schedule and direct actions before metrics. Follow-up `Continue` work now focuses the next scheduled session (or the latest/first when appropriate), keeps the dayline near that session, describes the action queue from its actual entries instead of an unrelated alert count, and uses the device's local calendar day for classes and workshops. Leaving Admin clears its document-level theme. The Education shell and existing module bridges share the two theme token sets; light-only legacy compatibility rules no longer overwrite dark screens. No permissions, API, or Firebase rules changed. The production build passes. A write-free synthetic visual fixture confirmed light/dark rendering, 390px horizontal fit, and scrolling, then was removed. Signed-in real-data review on desktop and phone is still needed before release. Repository-wide TypeScript has existing errors outside the changed TSX files; scoped diagnostics are tracked in this handoff. No Git push or deployment occurred.

The user then reported that a real school-account “Sign in” opens Edufy before its records appear. The startup cause was a 2.5-second fail-open in `AppContext`, plus missing handling when an organization or required Firestore read failed. The local candidate now waits for settings and the first role-relevant data snapshots, displays a retry/sign-out error state instead of an empty workspace, rejects a missing organization, prevents stale tenant data by remounting the app context when user or tenant changes, and clears a previous tenant on sign-out. The dashboard also reads English and French weekday names from existing class records, including both group sessions on the same day. The public virtual demo remains separate. No data, security rules, API, or production environment was changed. Real-account acceptance on the phone remains required because this worktree has no operator credentials. See `docs/education/SCHOOL_SIGN_IN_READINESS_2026-10-15.md` for the decision, changelog and acceptance notes.

---

# Previous handoff — Edufy tenant provisioning repair

On 2026-10-15, tenant creation without a selected subscription plan failed client-side because `subscription: undefined` was sent to Firestore. The focused Edufy repair omits absent plan fields, requires either a plan or a selected module, validates a unique workspace slug, and creates the organization with its real admin UID and user profile in one Firestore batch. If the batch fails after Firebase Auth creates the admin, the fresh account is removed when possible. No production tenant was created as a test. Verify the registered Edufy build, then release and check both public Edufy clients. This fixes provisioning input and partial Firestore writes; the full cross-tenant rollout still depends on ownership, rules/index, public-catalog, and two-tenant acceptance gates. See `docs/releases/TENANT_PROVISION_REPAIR_2026-10-15.md`.

---

# Previous handoff — SparkQuest one-click launch CSP repair

On 2026-10-15, a real Android Chrome parent one-click link reached SparkQuest but showed “Failed to fetch” at account connection. Production SparkQuest HTML omitted `https://edufy-makerlab.vercel.app` from `connect-src` even though the shipped client exchanges `?launch=` there. The isolated fix adds only that API origin to the SparkQuest CSP. The SparkQuest build and scoped TypeScript pass; a synthetic API request returns a structured invalid-code response with the SparkQuest origin allowed. Publish this SparkQuest-only change from current `origin/main`, verify the live HTML and a designated fresh one-use parent/learner link, and keep the original link unused.

---

# Previous handoff — Edufy Students navigation and action UX

On 2026-10-15, the Students smart roster gained direct profile navigation on the learner row and a separate eye control for the operational passport. The passport's action now opens the missing profile field, existing enrollment's class editor, enrollment wizard, or a read-only exact-record comparison. Student view is on the left of the profile hero. Roster and profile colors use scoped blue/green layers, leaving shared tokens and other modules intact. The registered Edufy production build passed. Release to Hostinger through `origin/main`, verify live bundle delivery, and use a designated staff account for desktop/phone data-specific acceptance. See `docs/students/{CHANGELOG,DECISIONS,KNOWN_ISSUES}.md`.

---

# Previous handoff — Edufy student profile quick-access render fix

On 2026-10-15 the live Hostinger bundle gained the quick-access component but opening a student profile crashed with `Cannot read properties of null (reading 'expiresAt')`. The component rendered modal children with `mode=null` and a fallback manual URL, which evaluated the one-click expiry branch even while the modal was closed. The focused fix supplies a link only for an explicitly chosen mode and guards the expiry copy with a real quick-link object. A parent/learner initial-render smoke passes. Publish this client fix separately from API or Firebase changes and verify the Hostinger student page after deployment.

---

# Previous handoff — Learner Pickup truth and phone access

On 2026-10-15 a focused local SparkQuest candidate removed the fixed “3:00 PM” and “Main Entrance” from the learner Pickup dialog. It derives a dated workshop end time from active tenant-scoped enrollments/program schedules, shows missing information honestly, and hides stale facts during cancelled/exception states. Pickup is now a primary mobile destination and a journey-header action; live status alerts open the same detail screen. The optional ready signal and staff physical handoff remain unchanged. At 390px, the cancelled preview shows only the live cancellation and stay-with-team guidance, and navigation shows Pickup. SparkQuest TypeScript, both production builds and scoped smokes pass. This work was published in `710c49a`; a signed-in student on a physical phone remains the acceptance check.

---

# Previous handoff — Parent and learner one-click SparkQuest access

On 2026-10-15 the clean `origin/main` worktree gained staff-issued, five-minute, single-use SparkQuest links and QR codes for exact verified parent or learner accounts. The Edufy student profile also displays printable reusable manual-login QR cards. Issuance checks staff/tenant/module/account identity; parent delivery requires current exact guardian evidence. Exchange rechecks issuer and recipient before atomic consumption; Firebase custom tokens stay in the API response, never the URL. Manual passwords and Showcase password reauthentication remain available. Local policy smoke (17 assertions), existing launch smoke (28 assertions), SparkQuest TypeScript, API imports, and both production builds pass. Root repository-wide TypeScript still reports existing `App.tsx`/`maker-pro` errors, with no new quick-access diagnostics. No production account or data changed; no deployment occurred. See `docs/sparkquest/RECIPIENT_QUICK_ACCESS_2026-10-15.md`.

---

# Previous handoff — Daily Pickup roster and optional learner signal

On 2026-10-15 Edufy Pickup was corrected to display every active learner scheduled for the day from canonical enrollment/group schedules, including before a parent starts pickup. The desk and lobby overlay live queue status on that roster. Firestore and both lifecycle mirrors now permit verified staff release from `arrived` or `ready`; the learner-ready button remains a helpful optional signal. Daily-roster/lifecycle smokes, SparkQuest TypeScript, both builds, and Firebase 10/12 Auth/Firestore suites pass. The focused client/rules release and public verification are the remaining steps.

---

# Previous handoff — Parent Pickup focus pass

On 2026-10-15 the parent Pickup destination was reorganized around the current status and next parent action, followed by a compact next-workshop card. Private notes now have a focused view, while process explanation, cancellation and planning/security details are disclosed on demand. The existing lifecycle, selected-picker check and private-message rules were not changed. Browser checks at 390px/1280px covered announce, cancellation disclosure, notes, arrival and overflow; phone previews covered ready, released, confirmed/read-only and another initiating guardian without note access. SparkQuest TypeScript, standalone/root builds and scoped smokes pass. Focused code commit `76c067d` reached GitHub `main`; Vercel deployment `dpl_8sJ5NhXxFxZJ2UYMMi1ZpFUPTAif` is Ready and aliased to `https://sparkquest-makerlab.vercel.app/`, where the new parent bundle returns JavaScript 200. The signed-in family flow on a physical phone remains the acceptance check. See `docs/sparkquest/PARENT_PICKUP_FOCUS_2026-10-15.md`.

---

# Previous handoff — Corrected pickup lifecycle ready for coordinated release

On 2026-10-15 the missing learner-ready gate and private parent/learner notes were added to the connected pickup lifecycle. The complete isolated UI flow passed using distinct parent, learner and instructor sessions: parent on the way, parent arrived, private reminder, learner reply and ready status, staff identity verification and release, then parent receipt confirmation. Edufy's ready/released counters and all SparkQuest views updated live. Firestore keeps notes private to the initiating parent and exact learner, limits them to 500 characters, denies edits/deletes, and closes new messages after completion. The rules/emulator suites, lifecycle and parent-command smokes, TypeScript and both production builds are the release gates. No production deployment or family record change has occurred yet.

---

# Previous handoff — Edufy one-word legacy parent name follow-up

On 2026-10-15, read-only inspection of the live Edufy learner profile found that a surname-only enrollment value could still be presented as a verified parent name. The focused follow-up treats that value as an unverified family label, requests the real parent's full name before replacement, and updates all siblings linked to the same legacy login. The existing family alias remains a suggestion for the new MakerLab login. The synthetic Auth/Firestore emulator passes the two-sibling correction, the earlier parent-access cases, password invalidation and tenant denials; the Edufy production build passes. No production family password or record was changed during this check. Coordinate this commit as a new Hostinger client plus Vercel API release, then perform authenticated acceptance with a designated parent.

---

# Previous handoff — SparkQuest student maker journey

On 2026-10-12 the learner session gained focused My build, Explore, and Mentor stops over the existing workbench, mission library, project editor, and review actions. The parent portal's existing 011Y component now gives contextual learner guidance, and saved project briefs show one color-coded plan step at a time without jumping away from the clicked area. Narrow-screen ongoing builds and mission cards use snap-aligned rails. No learner records, permissions, rules, identity, or review contracts changed. Local 360px/390px browser checks covered the three stops, project brief, and next-step control. SparkQuest TypeScript, standalone and root production builds, URL/identity/Phase 2 smokes, mirrored-file hashes, and diff checks passed. Focused code commit `6853c5f` reached GitHub `main`; Vercel deployment `dpl_DAQ3mpz2FjXuQ1EJnLU3R6wRha9b` is Ready and aliased to `https://sparkquest-makerlab.vercel.app/` (HTTP 200). A designated student account and physical phone should still confirm exact assignments, evidence, and editor continuation. Details: `docs/sparkquest/STUDENT_JOURNEY_2026-10-12.md`.

Follow-up: the active build and Showcase editors now use the same context-sensitive 011Y guide for progress, mentor review, revision, and completion. The write-free `?designPreview=studio` editor was checked at phone width; TypeScript and both production builds passed again. Code commit `27bc310` reached GitHub `main`; Vercel production deployment `dpl_Am7zphFyoXeUyeWHS1SPsXP51atC` is Ready and aliased to the same public URL (HTTP 200). Existing editor actions and data contracts remain unchanged.

---

# Previous handoff — SparkQuest parent detail color and image delivery

On 2026-10-12 the parent project and upcoming mission detail hero began inheriting the tone of the card opened, while progress steps retain their own status colors. Parent covers, proof, galleries, and moments now request responsive WebP variants for MakerLab raster sources on Vercel, with original-image fallback; SVGs remain unchanged. A protected preview deployment returned a 3,212-byte 320px WebP for a 319,949-byte sample PNG. Local phone-width checks confirmed lilac and apricot detail pages and no horizontal overflow; SparkQuest TypeScript, both builds, and the parent image source smoke passed. Code commit `a84f32a` reached GitHub `main` with the concurrent staff Studio style repair. Vercel production deployment `dpl_BH898MbAo1vyn88wbViEu1FGBSt8` is Ready and aliased to `https://sparkquest-makerlab.vercel.app/`; its public image endpoint returned HTTP 200, `image/webp`, and 3,212 bytes. No family data, storage objects, or access rules changed.

---

# Previous handoff — SparkQuest parent color, sound, and direct sign-in

On 2026-10-12 the parent portal gained varied project and upcoming card colors, an opt-in remembered Web Audio cue system, contextual 011Y guide scenes, and a dedicated French parent login at `/?role=parent#login`. The parent manifest now starts at that route, and the general login links to it. The same Firebase authentication and verified guardian-linked family reader remain in force. SparkQuest TypeScript, both production builds, and phone-width browser checks of the sign-in, project archive, mascot contexts, sound toggle, and zero horizontal overflow passed locally. Focused parent family, workshop, and URL smokes passed. Code commit `0f85e48` reached GitHub `main`; Vercel production deployment `dpl_6moutm6sw7vsjKSocywhSkaPtu1V` is Ready and aliased to `https://sparkquest-makerlab.vercel.app/`. The public parent route, manifest, and parent icon returned HTTP 200; the manifest launches `/?role=parent#login`. No family data or permission rules were changed.

---

# Previous handoff — SparkQuest parent install invitation

On 2026-10-12 a first-visit install invitation was added to the standalone SparkQuest parent portal. It opens after the verified family loads, uses 011Y artwork, offers a native install action when the browser supplies one, and otherwise gives home-screen instructions. Dismissal is remembered per parent UID on the device; installed standalone sessions do not show it. Focused commit `8d5842f` reached GitHub `main`. SparkQuest TypeScript, both local production builds, parent family/workshop smokes, and phone-width invitation/close browser checks passed. Vercel production deployment `dpl_9TWkWQwrfwFUHTSULzCzkBKeQYzA` is READY and aliased to `https://sparkquest-makerlab.vercel.app/`; the page, parent manifest, and both icons returned HTTP 200. The public AAJLANE family acceptance remains pending the user's sign-in; the browser was still on login, and no guardian links or family data were modified.

---

# Latest handoff — Canonical pickup lifecycle release candidate

On 2026-10-12 the pickup experience was connected across the existing family, learner and Edufy staff accounts. A verified parent selects an active guardian and announces/arrives; the learner sees the selected person and four-step status; authorized staff record verification and release; only the selected picker confirms receipt. Queue transitions require matching immutable event records in the same transaction. The actual local UI flow passed with separate parent, guardian, learner and staff identities, including denial of receipt by the wrong guardian and live updates in every role. A final learner check replaced the old generic QR/pass with canonical current-day status and physical-handoff safety guidance.

The focused release includes the Edufy Pickup Status desk, parent controls, canonical domain/command adapters, instructor navigation/permission wiring, Firestore rules and indexes, and supporting tests. SparkQuest TypeScript, both builds, lifecycle smoke, command emulators and Firestore rule suites pass. Production bundles point to `edufy-makerlab` and contain no local demo project or localhost Firebase endpoint; deployment ignore files exclude `.env*`. Release the GitHub/Hostinger client, linked Vercel client and Firestore rules/indexes together; then verify the public bundles before operational use. Details: `docs/sparkquest/PICKUP_LIFECYCLE_RELEASE_2026-10-12.md`.

---

# Previous handoff — SparkQuest parent mobile portal release

On 2026-10-12 the parent portal mobile journey, weekly Pickup/workshop surface, visual project detail and upcoming work, contextual 011Y mascot, smart persistent navigation, parent PWA shell, and unified mascot loading animation were released to the standalone SparkQuest client. The 011Y loader/guide no longer exposes a white square. Focused code commits `6e10cba`, `f044690`, and `09c44c2` reached GitHub `main`; Vercel production is READY and aliased to `https://sparkquest-makerlab.vercel.app/`. TypeScript, both local production builds, parent schedule/assignment/access/visual smokes, Vercel build, public manifest/icon/mascot requests, and an authenticated 390px browser pass. The browser confirmed Pickup, project detail, step focus, contextual mascot, and no horizontal overflow. The release is based on the current parent account code. It does not modify family records, Firestore rules, indexes, or the trusted parent API. See `docs/sparkquest/CHANGELOG.md` and `docs/sparkquest/KNOWN_ISSUES.md` for behavior and remaining device checks.

---

# Previous handoff — Parent account issuance and local SparkQuest sign-in

On 2026-10-12 the operator issued a real designated parent password in local Edufy and confirmed that the parent home opened in local SparkQuest. A read-only Admin check found the exact recorded parent account active with tenant metadata, access version 2, one recorded learner, and both canonical learner/UID guardian links. Edufy still showed the learner's 3 portfolio projects and 32 attendance records. No plaintext password was read or stored by the agent. The operator retains the one-time card for direct sharing.

The API now derives a family display label from the learner name when no parent name is recorded, matching the existing `p.*` login token for surname-first names. The label is not legal identity evidence; staff verification and exact account/tenant/learner checks remain required. Edufy now says “Reissue password to share again” and explains that each reissue displays a fresh card and invalidates the prior password. The full parent Auth/Firestore emulator, both clean/source Vite builds, and Vercel production route checks passed. Focused commits `c2288e8` and `91038cf` are on `origin/main`; Vercel production is aliased to `edufy-makerlab.vercel.app`. Hostinger `edufy.makerlab.academy` still serves an older bundle, and the separate SparkQuest public client was not verified by this acceptance. The clean temporary release worktree was removed; the source worktree's unrelated `.gitignore` edit remains untouched.

---

# Previous handoff — AAJLANE three-child parent acceptance

2026-10-12 focused Edufy parent-access release candidate: one staff-facing password action verifies the relationship and automatically repairs a consistent older `p.*@makerlab.academy` family account before replacing its password. Missing trusted names return `parent_name_required` and a single verified-name field. A staff-only, same-organization directory supplies active parent accounts with their exactly linked learners; the picker no longer depends on the locally loaded student subset. Exact-login lookup remains available. The Auth/Firestore emulator suite passed modern reset, legacy repair, missing-name retry, directory filtering, role/tenant denials, and no plaintext storage. Edufy build passed. No real parent account was changed during validation.

2026-10-11 local follow-up: the user reported KENZA missing and asked the SparkQuest UI/UX Design thread for a mobile-first parent redesign in SparkQuest's Duolingo-style direction. The current signed-in localhost parent portal displays NADA, ALI, and KENZA in the phone selector at 390×844; KENZA's Journey opens with her projects. A separate exact-email legacy account candidate fixes local Edufy's API origin and supports staff-verified lookup/recovery of recorded `p.*@makerlab.academy` logins, missing parent names, exact existing logins absent from the dropdown, and safe transfer from a single-child legacy login without a modern profile. Synthetic Auth/Firestore recovery/transfer/denial/plaintext tests, origin smoke, and root build pass. Full repository TypeScript retains unrelated diagnostics; changed parent files have none. No production recovery, Git push, or deployment occurred. See `docs/releases/PARENT_ACCESS_HOSTING_AUDIT_2026-10-11.md`.

On 2026-10-11 the user confirmed NADA, ALI, and KENZA as the children for the verified AAJLANE parent login. ALI was linked through Edufy's existing verified-parent flow. KENZA's separate older parent login belonged only to her; the user authorized consolidation and disabling that old login. A new trusted `transfer` API action and Edufy UI path passed the Auth/Firestore emulator and root build, then Vercel production API deployment `dpl_GQpaKuQ4AnXAgbLwg3BGE9jP4E3i` became READY. The local SparkQuest account now displays exactly three learners and 16 projects. Admin SDK checks confirmed all three guardian links and the old KENZA login disabled. The inactive duplicate NADA record was not changed. A phone-width test found KENZA clipped by a horizontal selector; a focused CSS grid fix now displays all three choices. The user requested a broader Duolingo-style, mobile-first parent redesign; this was sent to **SparkQuest UI/UX Design**. No Git push or Hostinger release. See `docs/releases/PARENT_ACCESS_HOSTING_AUDIT_2026-10-11.md`.

---

# Previous handoff — AAJLANE parent account issued; SparkQuest sign-in pending

On 2026-10-11 the five family indexes became READY, the compatibility Firestore ruleset `95ef72f6-669f-4eb3-9dda-7c586ccc2e97` was released, and Vercel production API deployment `dpl_CfcMo14BzixYJdgRkm4cKa2kHrzV` became READY. Local GET/OPTIONS/tokenless POST probes returned JSON 405/200/401. The live learner's former parent-login UID resolved to an Edufy admin account; the original replacement was correctly rejected. A separately tested staff-link repair created `p.aajlane@makerlab.academy` as an active version-2 parent with a guardian link to AAJLANE NADA and removed the mistaken old UID only from that learner. Read-only checks confirmed the old admin profile and Auth login remain active. The one-time password is visible only in the open Edufy credentials card. The user must enter it personally at local SparkQuest `http://127.0.0.1:5184/`; inspect the real parent journey and phone layout after sign-in. No Git push or Hostinger deployment. See `docs/releases/PARENT_ACCESS_HOSTING_AUDIT_2026-10-11.md`.

---

# Previous handoff — Parent API preview verified

The user signed into `edufy-makerlab` Firebase as an Owner and confirmed the protected Admin SDK setup. An existing September service-account key was verified and stored as a Vercel Preview and Production Secret; no key entered chat or Git. A new key created in the browser did not download and was deleted after the user authorized cleanup. The first Vercel preview failed during Function startup because `jwks-rsa` required ESM-only `jose@6`; the scoped npm override to `jose@4.15.9` fixes the Node load check. Protected preview `dpl_8imnFsskv7kP3stokcHPJisHcL9d` is READY: JSON GET 405, allowed localhost OPTIONS 200/CORS, tokenless POST 401, forbidden origin 403. Production env has the Admin Secret and exact official/Vercel/localhost origins but the candidate API is not yet deployed to production.

Live Firestore rules were fetched via Firebase Rules API after the Console Rules tab failed to load. The sole live-versus-main difference is an existing `resource_library` rule, preserved in the candidate. Five existing live composite indexes are READY; five new family indexes are absent. The service account lacks index creation permission (403), so the Owner console or Owner-authenticated CLI is required. The attempt to launch a localhost API process with the privileged credential was rejected by automatic approval review; do not work around that rejection. No real parent account, rules, indexes, public client or Hostinger release was changed. Continue with a reviewed coordinated data/API release, then use the signed-in Edufy admin and a designated parent to verify replacement and SparkQuest view. See `docs/releases/PARENT_ACCESS_HOSTING_AUDIT_2026-10-11.md`.

---

# Previous handoff — Deployment access blocker

The user authorized a deployment if it resolves the unavailable secure parent service. Vercel project `edufy-makerlab` has the origin allowlist but no Firebase Admin credential variable. The local release workspace has no Admin credential. The user's exact Firebase Console project URL was opened in Chrome and returned project missing/permission denied; its Google account menu shows `platform.makerlab@gmail.com`, despite the MakerLab browser profile name. Deployment was withheld because the Function cannot issue accounts without its Admin identity. The signed-in localhost Edufy UI showed Ajlane Nada's recorded legacy parent address and replacement dialog, but no mutation was submitted and the old Auth/profile consistency remains unverified. Next: use a Firebase project Owner session to configure the Admin credential securely, then deploy and probe the Function before designated nonproduction acceptance. No secret should enter chat or Git.

---

# Previous handoff — Local real-data parent API blocker

The user tried parent replacement from `http://127.0.0.1:5183` and saw the secure service unavailable error. Live GET of `https://edufy-makerlab.vercel.app/api/parent-access` returns SPA HTML (200); allowlisted local preflight has no CORS header; `/api/agent/health` still executes as a Function. The parent Function is absent from that deployment, and no Firebase Admin credential is available locally. The signed-in local Edufy page was restored after a Vite hot-reload error. No Ajlane account or family data was changed. Next: provision the trusted Admin identity and exact test origin on a preview Function, deploy the reviewed API, verify GET/OPTIONS route behavior, then use a designated test parent before real-family replacement. See `docs/releases/PARENT_ACCESS_HOSTING_AUDIT_2026-10-11.md`.

---

# Previous handoff — Legacy parent login replacement

The local candidate now handles a parent account created by the former email setup-link approach. Staff can replace its recorded email with a fresh SparkQuest login ID/password after explicit relationship verification. The trusted endpoint checks the old account and exact-UID family set, transactionally moves all linked learners, retires old Firestore access and disables old Auth. Inconsistent or cross-tenant links fail closed. The isolated `demo-parent-replace-check` emulator passed a legacy two-child replacement with a missing guardian link, new sign-in, old-account denial and reset; origin smoke and root production build passed. The Edufy data connector was not available in this session, and no real Ajlane data was inspected or changed. The hosted Admin API and coordinated release remain required. See `docs/parent/CREDENTIALS_PHASE_3_2026-10-10.md`.

---

# Previous handoff — Interactive local parent acceptance

Edufy and SparkQuest were run against the same localhost `demo-parent-journey` Firebase emulators. Through the actual Edufy Student Details UI, staff issued the one-time Samira demo parent password for Maya, then linked Adam to the exact same account. The issued credential signed into the actual SparkQuest parent route, which loaded project proof/resources/feedback, gallery, payment history, attendance, and read-only Pickup. Two-child switching and phone layout passed. Noor Explorer is seeded with a separate unissued parent identity and sample journey so the user can personally try Create Parent Account. Local-only Firebase routing, Vite CSP relaxation, API route, and idempotent seed are documented in `docs/sparkquest/PARENT_LOCAL_ACCEPTANCE_2026-10-11.md`. Both builds, SparkQuest TypeScript, origin smoke and combined issuance-to-read emulator assertions pass. No push, deployment or real family write occurred.

---

# Previous handoff — Parent family mobile journey Phase 4

The local clean release worktree now clarifies staff-issued, one-time SparkQuest parent credentials and adds the read-only mobile family journey. A verified parent can switch children and view saved workshop projects/resources/proof/reviews, gallery moments, payment and attendance detail, and Pickup status. Parent Pickup writes are denied by the reviewed Firestore rule; learner Pickup updates still pass the demo emulator. SparkQuest TypeScript, both production builds, family smokes, Auth/Firestore emulator and 375px browser preview pass. No production changes or real-family data writes occurred. The previous Parent Access release gates below still apply. Details: docs/sparkquest/PARENT_FAMILY_MOBILE_PHASE_4_2026-10-11.md.

---

# Previous handoff — Parent Access clean release candidate

Prepared on 2026-10-11 from `origin/main` `f1b5810`. Edufy now has staff-only parent issue/link/reset through a trusted Admin SDK endpoint and one-time SparkQuest credentials. SparkQuest has parent-first routing, exact guardian-linked multi-learner reads, visual project cards, finance, attendance, and read-only Pickup status. Selective guardian permissions and five family query indexes are included; Pickup commands, Pickup write-policy replacement, the Edufy parent dashboard, and real Ajlane records are excluded.

Verification: root production build; SparkQuest TypeScript and production build; endpoint syntax and exact-origin smoke; family link, operations, image, and read-only Pickup lifecycle smokes; isolated `demo-parent-family` and `demo-parent-access` Auth/Firestore suites. The local Vercel build reaches builder installation but Windows blocks its compatibility symlink with `EPERM`; use Vercel's remote builder for release proof.

Release remains blocked at the privileged environment boundary. The correct `platformmakerlab-5357s-projects` Vercel projects are accessible and linked; the exact production origin allowlist is now configured, but `edufy-makerlab` still lacks a Firebase Admin credential. The client uses the existing ERP URL resolver, so Hostinger needs no extra build variable for the reviewed production API origin. Configure one Firebase Admin credential option, deploy and probe `/api/parent-access`, provision the reviewed rules/indexes, then release Edufy Hostinger and the separate SparkQuest Vercel client. Use designated nonproduction accounts for acceptance. Do not create or link the real Ajlane family until exact records and parent identity are verified.

Details: `docs/releases/PARENT_ACCESS_HOSTING_AUDIT_2026-10-11.md`.

---

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
# Current task boundary — parent card visibility and staff Studio launch

SparkQuest follow-up, 2026-10-12: an open student tab requested the previous deployment's `StudentWizard-PojANDB-.js` after the Vercel alias moved, and the missing asset URL returned the new HTML document. Added a guarded one-time document reload for Vite preload and React lazy import failures, plus a manual refresh recovery state. SparkQuest TypeScript, chunk recovery smoke, URL/identity/Phase 2 smokes, standalone and root production builds pass. Vercel deployment `dpl_7r5ufMBX4Lsvv5z4Z9193vBj3UYB` is Ready and aliased; the live entry and `StudentWizard-Btu2uokW.js` both return JavaScript 200. Signed-in learner mission-detail acceptance remains for the designated account. This is limited to SparkQuest client loading and does not modify project or identity data.

The parent card action now remains visible for every recorded parent login. When credentials still exist in the open learner profile it reopens the complete card; after refresh it routes through verified password reissue because plaintext is not stored. The Edufy service worker release marker is bumped so an existing installation activates the new shell after refresh. SparkQuest now treats `super_admin`, `owner`, `admin`, and `instructor` consistently across routing, Factory reads, assignment, review, import, removal, arcade management, and staff session controls. Focused role smoke, SparkQuest TypeScript, SparkQuest build, and Edufy build pass. Next: clean release, Hostinger/Vercel verification, then one affected administrator launch and parent-card browser acceptance. No production parent credential or project mutation is part of verification.

Authenticated browser tracing after that release isolated a second Studio failure: lazy Factory CSS imported Google Fonts after the document CSP was active, so the browser blocked the import and Vite raised `Unable to preload CSS`. The focused follow-up allows the declared Google font origins, moves every Factory font family into the shared document link, and removes the lazy stylesheet imports. Next: SparkQuest build, focused Vercel release, and retest the existing affected admin session; no production record mutation is required.

---
# Latest handoff — Parent access legacy login hotfix (2026-10-15)

The Edufy parent API and Student Details flow now handle a historical contact email or orphan UID by creating a verified `p.*@makerlab.academy` login, moving only consistent same-tenant family links, and preserving learner records. Platform super admins under `atlas-platform` may manage existing target organizations; other staff stay same-tenant. Staff enter the real parent name and verify the relationship. After refresh, displaying a card issues a new password and invalidates the old one; no plaintext parent password is retained. Synthetic Auth/Firestore emulator passes the orphan/external/staff-link/tenant/password cases. The Edufy build passes; repo-wide TypeScript still reports existing unrelated errors. Release status is recorded in `docs/parent/PARENT_ACCESS_LEGACY_LOGIN_HOTFIX_2026-10-15.md`. Multi-tenant ownership remediation follows as a separate phase.

---
## Edufy Design System v1 release candidate — 2026-10-19

The user approved deployment of the completed school workspace UI after aligning the left and top menus. This release carries the Design System v1 module surfaces and shell only. It preserves the current `origin/main` tenant provisioning, authentication, schedule write guards, API, Firestore rules, schemas and financial logic. Build and signed-in read-only checks passed for desktop/mobile and light/dark. See `docs/education/DESIGN_SYSTEM_V1_CONSOLIDATED_HANDOFF_2026-10-19.md` and `docs/education/DESIGN_SYSTEM_NAVIGATION_RELEASE_2026-10-19.md`.

---

## Student Details Design System v1 audit — 2026-10-20

The isolated Student Details candidate now covers its five workspaces, local dialogs, permission-aware controls, 390 px behavior and synthetic failed-save state. Read `docs/education/STUDENT_DETAILS_DESIGN_SYSTEM_V1_2026-10-20.md` for the row-by-row inventory, evidence and exact acceptance boundary. The fixture is `node scripts/preview-student-details.mjs` at `http://127.0.0.1:5271/`. Build, focused Design System checks and whitespace checks pass. This browser session had no signed-in school account; actual records and route restoration remain a read-only acceptance gate. No push, deployment or production write.

Follow-up: `/forms` now mounts the real enrollment wizard and App payment modal JSX with synthetic callbacks. The Student Details fixture now renders synthetic proof and the actual Activity Details audit route. Editor, enrollment edit, both certificate generators, App-owned forms and all 13 Student Details dialog families received desktop/390 px light/dark browser checks. Mobile wizard overflow, payment choice contrast and certificate failure feedback were fixed. Build, 27 Design System checks and diff check pass. Remaining gates: signed-in school record/route/submit review, physical phone, downstream audit proof overlay Close/focus, and the separately documented financial validation/security issues. No push, deployment or production write.

---
