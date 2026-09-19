# Latest handoff — Consolidated public release candidate

Prepared on 2026-09-19 from the latest `origin/main` using a three-way merge, preserving the public cache/deployment fixes while adding the complete local Edufy application delta. The release includes the Education UI and compact navigation work, program lifecycle and StemQuest attendance/membership rules, selectable family statements, visible catalogue/discount/negotiated amounts in parent finance documents, editable Finance history, independent formation/service numbering, Admissions stable links and assisted operations, reusable and urgent one-off workshop scheduling, service catalogue invoicing, and the related tenant rules/indexes/API configuration.

Validation: the production build passed with 4,425 transformed modules. Ten Admissions/domain/Firestore/workshop contract suites passed (192 total safeguards/scenarios), plus the membership lifecycle and service catalogue smoke suites. `git diff --check` passed. The release excludes `.env`, QA screenshots/runtime artifacts, marketing deck assets, build output, dependencies, credentials and production data. No enrollment, payment or other production record was mutated while preparing it.

---

# Latest handoff — Discounts in printed parent financial statements

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

# Latest handoff — Education UI coherence and compact navigation

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
