# Pickup lifecycle release — 2026-10-12

## Experience

The pickup flow now connects the existing family, learner and Edufy staff accounts in real time:

1. A verified parent selects an active authorized guardian for one linked learner and announces that person is on the way.
2. The parent or the selected guardian marks arrival.
3. The learner sees the selected pickup person and the live handoff in SparkQuest. After packing the project, personal items and tidying the space, the learner may mark **I’m ready** as an optional signal and remains inside.
4. The learner and initiating parent can exchange short private pickup notes such as reminders about a jacket. Staff and other guardians cannot read this thread.
5. An instructor, front desk operator, admin, owner or super admin opens **Pickup Status**, sees the complete workshop roster and live statuses, checks the selected person after arrival, records the verification method and note, then releases the learner from `arrived` or `ready`.
6. Only the selected guardian can confirm receipt. Every transition writes an immutable companion event in the same Firestore transaction.

No separate pickup account type is required. Staff who already work in Edufy receive the `pickup.view` permission through the instructor role; elevated administrative roles retain access. A future reception-only login can use a restricted custom role if the academy needs a kiosk or least-privilege desk account.

## Canonical contract

- Queue identity: `{organizationId}_{studentId}_{sessionDate}_{source}`.
- States: `on_the_way`, `arrived`, `ready`, `released`, `confirmed`, `cancelled`, `exception`.
- Parent actions require an active guardian link and an active selected picker link for the same learner and organization.
- Only the exact verified learner can move an arrived pickup to `ready`; this signal is optional.
- Staff may release from `arrived` or `ready`, after the same authorized-picker verification.
- Staff release requires tenant membership and an instructor or elevated role.
- Receipt confirmation requires an active pickup guardian whose verified profile name matches the selected picker name.
- Each state transition must atomically create exactly one `pickup_events` document with the same transition and actor.
- Queue records and event records are append-only for audit purposes; deletion is denied.
- Private messages are append-only, limited to 500 characters, and available only to the initiating parent and exact learner. New messages close when the pickup reaches a terminal state; history remains visible.
- Only active `on_the_way`, `arrived` or `ready` records can carry into the next operating day.

## Implementation

- `modules/pickup/domain/pickupLifecycle.ts` — lifecycle and carry-forward policy.
- `modules/pickup/services/pickupCommands.ts` — Edufy staff commands.
- `views/PickupView.tsx` — live staff desk, verification and release.
- `modules/pickup/domain/dailyPickupRoster.ts` — daily workshop enrollment projection for the staff desk and lobby.
- `sparkquest/services/parentPickupCommands.ts` — parent/guardian commands.
- `sparkquest/services/studentPickupCommands.ts` — learner-ready command.
- `sparkquest/components/ParentPickupControl.tsx` — family pickup controls.
- `sparkquest/components/PickupSchedule.tsx` — learner live status and ready action.
- `sparkquest/components/PickupPrivateNotes.tsx` — private parent/learner notes.
- `firestore.rules` — role, guardian, selected-picker and event integrity rules.
- `firestore.indexes.json` — student/date and student/status queue indexes.

## Acceptance evidence

On 2026-10-15 an isolated `demo-pickup-live` Auth/Firestore run completed the corrected actual role flow:

- parent selected an authorized guardian and announced pickup;
- parent marked arrival;
- learner received the arrival and a private parent reminder;
- learner replied privately, packed and tidied, then marked ready;
- Edufy moved the learner live into the **Learner ready** queue; the later daily-roster correction retained this signal while allowing verified staff release directly from `arrived`;
- staff recorded `known_person` verification and released the learner;
- the selected parent saw the release and confirmed receipt;
- learner, parent, guardian and staff views updated live;
- the final queue and its five event records retained the expected actor identities;
- the private note history remained visible and became read-only after completion.

The learner Pickup card was rechecked after the integrated test exposed its older generic pass. The placeholder QR/pass was removed. The live learner dialog now selects only the canonical current-day record or an eligible overnight arrival, shows the authorized pickup person and five-step progress, and displays safe fallback, cancellation and exception guidance. The completed synthetic handoff rendered correctly in the actual learner account.

The lifecycle and daily-roster smoke suites, parent command emulator suite, Firestore rule suites, SparkQuest TypeScript check, SparkQuest production build and integrated Edufy production build passed. The emulator proves both direct `arrived → released` and optional `arrived → ready → released` paths. Existing Firebase import, bundle size and Tailwind CDN build warnings remain unchanged.

Local UI acceptance uses `VITE_LOCAL_FIREBASE_PROJECT_ID=demo-pickup-live` only while Vite is in development mode. Production bundles were scanned after the build: they contain the real `edufy-makerlab` project and no demo project or localhost Firebase endpoint. Both deployment ignore files exclude `.env*`.

## Release boundary

The two web clients and Firestore rules/indexes must be released as one coordinated change. The public SparkQuest client is deployed through its linked Vercel project; Edufy is deployed from GitHub `main` through Hostinger. Production acceptance should use a designated test family and learner before operational use with real departures.
