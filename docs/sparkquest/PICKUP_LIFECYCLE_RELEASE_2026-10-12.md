# Pickup lifecycle release — 2026-10-12

## Experience

The pickup flow now connects the existing family, learner and Edufy staff accounts in real time:

1. A verified parent selects an active authorized guardian for one linked learner and announces that person is on the way.
2. The parent or the selected guardian marks arrival.
3. The learner sees the selected pickup person and the live four-step handoff in SparkQuest, with explicit instructions to remain inside until a team member completes the physical release.
4. An instructor, front desk operator, admin, owner or super admin opens **Pickup Status**, checks the selected person, records the verification method and optional note, then releases the learner.
5. Only the selected guardian can confirm receipt. Every transition writes an immutable companion event in the same Firestore transaction.

No separate pickup account type is required. Staff who already work in Edufy receive the `pickup.view` permission through the instructor role; elevated administrative roles retain access. A future reception-only login can use a restricted custom role if the academy needs a kiosk or least-privilege desk account.

## Canonical contract

- Queue identity: `{organizationId}_{studentId}_{sessionDate}_{source}`.
- States: `on_the_way`, `arrived`, `released`, `confirmed`, `cancelled`, `exception`.
- Parent actions require an active guardian link and an active selected picker link for the same learner and organization.
- Staff release requires tenant membership and an instructor or elevated role.
- Receipt confirmation requires an active pickup guardian whose verified profile name matches the selected picker name.
- Each state transition must atomically create exactly one `pickup_events` document with the same transition and actor.
- Queue records and event records are append-only for audit purposes; deletion is denied.
- Only active `on_the_way` or `arrived` records can carry into the next operating day.

## Implementation

- `modules/pickup/domain/pickupLifecycle.ts` — lifecycle and carry-forward policy.
- `modules/pickup/services/pickupCommands.ts` — Edufy staff commands.
- `views/PickupView.tsx` — live staff desk, verification and release.
- `sparkquest/services/parentPickupCommands.ts` — parent/guardian commands.
- `sparkquest/components/ParentPickupControl.tsx` — family pickup controls.
- `firestore.rules` — role, guardian, selected-picker and event integrity rules.
- `firestore.indexes.json` — student/date and student/status queue indexes.

## Acceptance evidence

An isolated `demo-pickup-live` Auth/Firestore run completed the actual role flow:

- parent selected an authorized guardian and announced pickup;
- parent marked arrival;
- learner received the live notification;
- staff recorded `known_person` verification and released the learner;
- the initiating parent could not confirm receipt because another guardian was selected;
- the selected guardian confirmed receipt;
- learner, parent, guardian and staff views updated live;
- the final queue and its four event records retained the expected actor identities.

The learner Pickup card was rechecked after the integrated test exposed its older generic pass. The placeholder QR/pass was removed. The live learner dialog now selects only the canonical current-day record or an eligible overnight arrival, shows the authorized pickup person and four-step progress, and displays safe fallback, cancellation and exception guidance. The completed synthetic handoff rendered correctly in the actual learner account.

The lifecycle smoke suite, parent command emulator suite, Firestore rule suites, SparkQuest TypeScript check, SparkQuest production build and integrated Edufy production build passed. Existing Firebase import, bundle size and Tailwind CDN build warnings remain unchanged.

Local UI acceptance uses `VITE_LOCAL_FIREBASE_PROJECT_ID=demo-pickup-live` only while Vite is in development mode. Production bundles were scanned after the build: they contain the real `edufy-makerlab` project and no demo project or localhost Firebase endpoint. Both deployment ignore files exclude `.env*`.

## Release boundary

The two web clients and Firestore rules/indexes must be released as one coordinated change. The public SparkQuest client is deployed through its linked Vercel project; Edufy is deployed from GitHub `main` through Hostinger. Production acceptance should use a designated test family and learner before operational use with real departures.
