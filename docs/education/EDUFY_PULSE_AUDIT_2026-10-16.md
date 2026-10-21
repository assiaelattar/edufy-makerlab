# Edufy Pulse — discovery and first milestone

## Baseline and scope

User mission: both supplied Edufy Pulse briefs, 2026-10-16. First milestone is reusable compatible foundations plus Attendance. Classes, Students, Student Profile and the manager dashboard follow after this benchmark. Existing local module work is retained.

Clean starting commit: `1412bb7`. Isolated branch: `agent/edufy-pulse-attendance-20261016`, based on the existing designer checkout. No release authorized by this mission.

## Search–Reuse–Prove

- React 18 / TypeScript / Vite 7. Tailwind utility classes load through the existing CDN; `index.css` supplies Atlas base styling. No new dependency needed.
- `App.tsx` owns module navigation; `EducationAppShellV1` owns the authenticated shell. `AuthContext` owns organization and permission boundaries; `AppContext` owns tenant-scoped Firestore snapshots and initial readiness.
- `components/education-ui/education-ui-v1.css` already owns semantic light/dark tokens; `EducationPrimitives.tsx` owns buttons, surfaces and progress. `AtlasSurface.tsx` owns existing operational header, toolbar, actions, empty states and cards. Pulse extends these owners, not a parallel component library.
- `views/AbsenceView.tsx` owns date/group/search/selection and all current mark, clear, batch and WhatsApp handlers. `utils/membershipLifecycle.ts` owns eligibility and renewal projection. `utils/schoolSchedule.ts` owns English/French weekday matching. These selectors, record IDs, write payloads and API contracts remain authoritative.
- `?ui=atlas-legacy` is the existing presentation rollback. Other module CSS must remain unaffected.

## Findings and decisions

1. Attendance has a large command header, a second priority panel, four tall cards and expanded renewal rows before its toolbar/roster. Prioritize date → compact progress → filters → roster. Keep every count in a compact summary; preserve renewals in an accessible disclosure.
2. Retain the approved blue identity (`#3159D6`) and dark counterpart (`#7293F7`), rather than introduce another blue brand. Neutral surfaces (`#FFFFFF`, `#F4F7FC`), ink (`#172441`), semantic success (`#19725A`) and danger (`#AD3D51`) remain. Add semantic warning and soft status tokens with dark equivalents. Color means status or action.
3. Keep DM Sans for interface headings/body and JetBrains Mono for dates/counts. Compact operational titles, tabular counts, 4px rhythm, 44px touch controls. Signature: a persistent narrow marking-progress strip with the roster directly underneath; no decorative hero.
4. Existing per-row saving state can overlap a batch or another row. Make pending feedback explicit and prevent conflicting submissions in this screen. Firestore snapshots can show local writes before acknowledgement; hold affected displayed statuses while their promise is pending. Success text follows awaited persistence only. The later readiness check found that Attendance is an optional startup subscription: expose loading/error from that existing listener, with metadata events for its first server snapshot. Keep the main startup gate and backend unchanged.
5. Route/role and financial rules are protected. No new batch behavior, optimistic success, invented metrics or new navigation destination.

## Security finding requiring separate work

`views/student-details/AccessAndAccountsTab.tsx` displays `student.loginInfo.initialPassword` when Show is selected (around line 187). This legacy stored-credential reveal was reported to the user immediately. Do not expose any credential value during audit. Recommended follow-up: remove redisplay, provide an authorized server-side reset/invitation, and separately review stored credential retention. Authentication changes are outside this UI milestone.

## Verification plan and limits

Baseline production build passes (26 seconds, existing bundle/import warnings). No configured npm lint or test scripts; existing relevant suite is `node scripts/test-membership-lifecycle.mjs`. Run repository TypeScript before/after and distinguish pre-existing diagnostics. `npm run atlas:next` is a context reader, not a test suite.

Render the actual Attendance component in an isolated localhost harness with synthetic adapters, never production records. Compare desktop ~1440, tablet ~768 and mobile ~390 in both themes, including save pending/success/failure, filters, batch/clear confirmation, future dates, keyboard focus and overflow. This proves frontend behavior, not real backend persistence or signed-in role authorization. Those remain designated-account acceptance gates.
