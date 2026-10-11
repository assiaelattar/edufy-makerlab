# Parent access — interactive local acceptance

The user requested a real two-app walkthrough before any push. On 2026-10-11, Edufy and SparkQuest ran locally against the same isolated `demo-parent-journey` Firebase Auth, Firestore, and Storage emulators. No production account or family record was used.

## Local walkthrough result

1. Seeded a demo owner, Maya Maker, Adam Maker, and Noor Explorer with sample project and operational records. The seed creates no parent account. Noor remains unissued so another person can perform the Create Parent Account flow themselves.
2. Signed into local Edufy as the owner and opened Maya's Student Details > Access and accounts. The staff flow verified the demo relationship and issued `p.samira.maker@makerlab.academy` with a one-time generated password. Edufy showed the credentials card; no email setup link was sent.
3. Signed into local SparkQuest through `?role=parent` with that exact issued password. The authenticated parent view loaded Maya's saved project brief, steps, proof, resources and feedback, gallery moments, payment history, attendance and read-only Pickup.
4. In Edufy, opened Adam's Student Details and linked the exact existing Samira account. SparkQuest Refresh showed two linked learners. Switching to Adam showed his empty journey; switching back showed Maya's project.
5. At the phone-sized browser viewport, the family page had no horizontal overflow. Journey, Moments, Records and Pickup were reachable by the bottom navigation.
6. Re-ran the demo seed after issuance and linking. SparkQuest still showed both linked learners, proving the seed's merge behavior preserves guardian access.

The first browser attempt failed because SparkQuest's CSP blocked localhost emulator requests. Vite now adds the local emulator origins to the CSP only for the `demo-parent-journey` development server. Production HTML retains the original CSP. Both production builds omit the demo project and emulator endpoint strings.

## Running it again

Run from this release worktree. The local runtime paths below are available in this workspace; do not use a live Firebase project ID.

1. Start the Firebase emulators with project `demo-parent-journey` and Auth, Firestore and Storage enabled. This repository's `firebase.json` uses ports 9099, 8080 and 9199.
2. Set `FIREBASE_PROJECT_ID=demo-parent-journey`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, then run `node scripts/seed-parent-local-demo.mjs`. Re-running the seed merges the sample records and preserves issued guardian links.
3. Start `node scripts/agent-dev-server.js` with those same variables, `EDUFY_LOCAL_DEMO=1`, `PORT=3001`, and `EDUFY_PARENT_ACCESS_ALLOWED_ORIGINS=http://127.0.0.1:5173`. Demo mode skips `.env.local`, asserts localhost emulators and binds the API to loopback.
4. Start Edufy Vite on `127.0.0.1:5173` with `VITE_LOCAL_FIREBASE_PROJECT_ID=demo-parent-journey`, `VITE_PARENT_ACCESS_API_ORIGIN=http://127.0.0.1:5173`, and `VITE_SPARKQUEST_URL=http://127.0.0.1:5174`.
5. Start SparkQuest Vite on `127.0.0.1:5174` with `VITE_LOCAL_FIREBASE_PROJECT_ID=demo-parent-journey` and `VITE_ERP_URL=http://127.0.0.1:5173`.
6. Open `http://127.0.0.1:5173/#login` and select Admin & Staff Access. Seeded staff login: `staff.parent-demo@example.test` / `LocalDemoStaff!2026`. Open Noor Explorer's profile to issue a fresh Layla Explorer parent account. The parent password appears once; use it at `http://127.0.0.1:5174/?role=parent`. For a lost local password, use Edufy's Issue new password action. The previously issued Samira account can be used to inspect Maya and Adam without creating another account.

These emulator records disappear when the emulators stop unless explicitly exported. The email-shaped parent login is an Auth identifier, not an inbox.

## Verification and limits

- Interactive Edufy issue and sibling link, SparkQuest issued-password sign-in and family reads passed.
- Combined `demo-parent-access` Auth/Firestore test passed issue, issued-password sign-in, authorized records, parent write denials, tenant isolation, collision, sibling link and reset. The separate family rules emulator had already passed canonical/alias/permission/revocation checks.
- SparkQuest TypeScript, both production builds, parent origin smoke, and `git diff --check` passed. Existing mixed Firebase imports and bundle-size warnings remain.
- This proves the flow against sample emulator records. The deployed API, rules/indexes, Hostinger Edufy and Vercel SparkQuest remain separate release gates. Actual family media URLs and designated nonproduction acceptance still need verification before any production release.
