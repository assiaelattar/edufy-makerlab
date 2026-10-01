# SparkQuest Known Issues

## Review security Phase 2 release gate

- Protected proof-bound per-step review state is implemented and emulator/browser-proven locally, not deployed. Client creation and Firestore rules must be promoted as one coordinated release because new learner creates require protocol v1.
- Existing production projects are not bulk-migrated. They retain legacy fallback until a real instructor step decision adopts protocol v1; after adoption, required steps need canonical approvals. Test representative legacy records during designated-account acceptance.
- Canonical `stepReviews` and history remain on the project document. Monitor document size and define retention/subcollection migration before histories become large.
- Real tenant-linked mission and Showcase attachments still require designated instructor/learner acceptance; no production test data was created or repaired.

## Review security Phase 1 release gate

- Top-level review/audit hardening is implemented and emulator-proven locally, not deployed. Production still runs the previously released rules until a clean coordinated release is approved.
- The original mixed-array gap is superseded locally by Phase 2's protected proof-bound `stepReviews` map for protocol-v1 projects. It remains a production risk until the coordinated client/rules release is deployed.
- Designated instructor/learner acceptance with real tenant links and attachments remains required. No production test records were created or repaired.

## Instructor learner workspace Phase 1 release gate

- Local fixtures/emulators prove ownership projections, additive assignment, concurrent preservation and guarded decisions. Designated-account acceptance against existing learner links, production audiences and attachments remains required. No production repair or assignment was performed as QA.
- Supplemental recipients are additive and survive class/editor updates. There is no supplemental-unassignment UI or per-recipient event history in this phase; latest assignment actor/time is recorded. Older clients that replace the entire audience must be retired or coordinated before releasing this contract.
- Tenantless/shared templates are not assignable from a profile and fail the tenant-checked editor writer; copy them into the organization first. Ambiguous/inactive records need resolution in Edufy. Legacy projects without a canonical studentId remain accessible in Projects/Inbox but cannot be attached to a profile by name.
- Phone fixture measured 433 CSS px due to browser scaling; exact 390 CSS-px and real-device checks remain open. Existing bundle/CDN warnings and prior review-field rule-hardening/history-size risks remain.

## Review reliability Phase 1 release gate

- Inbox/proof/history and stale-save reliability are implemented locally and proven against synthetic browser fixtures and localhost demo Auth/Firestore services. The exact missing production student/project and real file access still require designated-account acceptance; no production data was inspected or repaired.
- Client transactions alone do not harden direct SDK writes. Top-level and protocol-v1 per-step review rules are now implemented and emulator-proven locally, but remain undeployed.
- History is appended to the project document; large histories need a size/retention or subcollection plan. URL/note versions are preserved, but legacy base64 bodies are not duplicated into review history and uploaded objects are not cleaned up automatically.
- PDFs/unknown links open their original attachment; they are not embedded as arbitrary HTML. Revoked/missing files require access repair, not broader public Storage permissions.
- Full instructor student management/assignment, the brighter palette/hero sizing, celebration, parents and opt-in public links remain later phases. This phase does not publish children’s work to anonymous viewers.

## Learner workspace acceptance

- Workbench, larger desktop navigation, naming and Showcase polish are implemented locally with keyboard/desktop/phone fixture proof. Real designated-account creation, upload, revision and approval still require acceptance before release.
- This phase is not an application-wide palette migration or an Electron installer release. Pickup, Build Rhythm and nested game surfaces remain follow-ups.
- Personal-project deletion preserves uploaded Storage objects. Automatic asset cleanup/retention requires a separately approved policy.
- Development Showcase fixtures suppress writes and focus-session lifecycle; unlike the pure workbench fixture, they retain the existing authenticated provider shell.

## Review-loop acceptance

- The unified Showcase/mission review loop is implemented and visually proven with local fixtures. A designated instructor and learner must still prove one real tenant-scoped submit → revision → resubmit → approve cycle before release.
- Review-field rule hardening and any legacy project repair/backfill are not part of this client slice. They require explicit Firestore/emulator review; no production records were inspected or changed here.

## Mission Autopilot acceptance

- Full CSV completion is implemented locally and proven through domain/browser fixtures and Auth/Firestore transactions. Real designated instructor uploads/assignment and learner start/review remain release acceptance work.
- Import completion state lasts for the open wizard. Same-key existing records are preserved; updates and ZIP asset bundles are deferred. Uploaded files may remain unattached after leaving/removing a request; automatic deletion/retention is outside this slice.

## Production integration

- The server-side exchange is implemented locally but not deployed or enabled. Direct Firebase email/password sign-in remains the production entry until a separately approved release.
- Existing learner/profile/project records have not been reconciled against the new canonical identity contract. Ambiguous or stale links now fail closed and need an audited report before any migration.
- The instructor kiosk entry is intentionally unavailable until a secure token service exists.
- Expired/consumed `app_launch_sessions` need an approved retention or Firestore TTL policy before production enablement.
- Production Firestore and Storage rules include the reviewed learner project, focus-session, media-upload, and self-linked learner-profile policies. The standalone SparkQuest frontend was manually redeployed to Vercel on 2026-09-30; GitHub integration is still not active, so future releases must keep an explicit Vercel deployment step.

## Permissions and data access

- Local authenticated QA no longer reports the former account-link, `focus_sessions`, or hidden pickup-listener permission failures. Auth + Firestore + Storage emulator coverage passes nineteen assertions, including the constrained learner-profile lookup and both student/instructor media paths.
- The Edufy MakerLab data connector was unavailable in this environment, so the production reconciliation endpoint was not executed and production records were not inspected or changed.

## Maintainability

- SparkQuest still contains broad direct Firestore access across UI components and contexts. Move data access behind tenant-aware services incrementally.
- Native browser dialogs remain in older learner workflows outside the migrated destination shells and should move to app feedback incrementally.
- The initial production JavaScript is approximately 1.1 MB before gzip after Phase 3 splitting and remains above the 500 kB target.
- Firebase modules are both statically and dynamically imported, limiting chunk separation.
- `index.html` still loads Tailwind through the development CDN, which adds a console warning and should be replaced by a compiled production stylesheet.

## Visual/product scope

- Sparkbook now covers the learner mission library, structured mission brief, active `StudentWizard`, roadmap, proof flow, mentor feedback, Spark Exchange, Field Log, Play Lab, Evidence Wall, Key Cabinet, maker profile, and surrounding navigation. The remaining older treatments are nested arcade players/game dialogs, Pickup, and Build Rhythm; migrate them incrementally without changing session, pickup, or focus-history contracts.
- The local `?preview=student-project` route remains as the original authentication-free design fixture. Integrated development fixtures are `?designPreview=mission|studio|store|portfolio|arcade|gallery|inventory|profile|navigation`; they are local-only and do not write application data.
- The structured workflow pipeline still needs authenticated end-to-end QA with designated instructor and learner accounts, including real mission creation, assignment, evidence submission, revision, approval, and snapshot immutability.
- Phase 6 aligns the remaining instructor reward, import, editor, and review workflows. Less-frequent fields inside the large mission editor retain some legacy density and can migrate incrementally without changing the workflow contract.
- Authenticated instructor visual QA still needs a designated instructor session at desktop and phone widths. The available local browser sessions were authenticated as a learner, and this phase did not use production writes or credentials to manufacture an instructor session.
