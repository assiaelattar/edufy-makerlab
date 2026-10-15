# SparkQuest changelog

## 2026-10-15 — Edufy parent account repair

- Edufy now creates a new SparkQuest family login when a recorded enrollment contact email or orphan account cannot be used as a login.
- Verified staff can reissue and display a new password; the prior password stops working. Existing linked learner work remains connected to the family account.
- This change is in the Edufy account-management API and interface; the SparkQuest parent portal remains on its existing reader.

## 2026-10-12 — Recover stale mission chunks after a release

- When an open tab requests a lazy module from an earlier Vercel deployment, reload the document once to pick up the current asset names.
- If loading still fails, show a refresh action instead of presenting the raw module error or suggesting a session reset.
- Cover repeated-failure loop prevention with a focused smoke check.

## 2026-10-12 — Student maker journey

- Reorganized the existing learner workbench into focused My build, Explore, and Mentor views, preserving project continuation, mission discovery, personal/Showcase creation, and Field log actions.
- Reused the parent's 011Y mascot as a contextual learner guide and in saved mission steps; brought parent paper, blue, lime, and pastel patterns into the student route.
- Added mobile project rails and a one-step-at-a-time saved mission plan with progress markers and previous/next controls.
- Carried the contextual 011Y guide into the active build and Showcase editors, using progress and mentor-review state to shape the message while leaving editor actions unchanged.

## 2026-10-12 — Staff Studio stylesheet recovery

- Allowed the declared Google font stylesheet and font file origins in SparkQuest's Content Security Policy.
- Removed Google Fonts imports from lazy-loaded Factory stylesheets and expanded the shared document font declaration into the single source.
- This prevents Vite from rejecting the staff Studio chunk with `Unable to preload CSS` after a secure Edufy admin launch.

## 2026-10-12 — Parent detail palettes and lighter images

- Matched each project or upcoming mission detail hero to the color of the card that opened it, with readable status and intro accents. Progress steps keep their own semantic colors.
- Serve responsive 320/640/960px WebP variants for MakerLab raster project covers, proof, galleries, and moments on Vercel. Keep original images as a fallback and leave SVGs untouched.

## 2026-10-12 — Parent project color, sound, and direct entry

- Gave project and upcoming mission cards a rotating set of readable lilac, apricot, mint, lime, and blue treatments while preserving the current project's blue focus and full cover art.
- Added optional, remembered sound effects for navigation, discovery, step changes, and opening a completed project. Sound starts off until a parent turns it on.
- Made 011Y's surrounding guide scene react to discovery, completion, revision, and calm family contexts using the verified Rive trigger and short visual accents.
- Added a French parent sign-in screen at `/?role=parent#login`, linked it from the general sign-in, and made the parent PWA launch there.

## 2026-10-12 — Edufy staff Studio launch repair

- Unified SparkQuest staff authority across `super_admin`, `owner`, `admin`, and `instructor`, matching the secure Edufy launch policy and Firestore rules.
- Higher admin roles now route directly to Factory and retain mission assignment, review, import, removal, arcade management, and staff session behavior.
- Added focused role assertions; SparkQuest TypeScript, SparkQuest production build, and the Edufy production build pass.

## 2026-10-12 — Parent first-visit install invitation

- Added a one-time, account-scoped invitation after the signed-in parent family loads. The 011Y sheet offers the browser install action when available, or clear home-screen instructions, and can be dismissed.
- The sheet stays hidden in installed standalone mode. A development-only preview exercises the invitation without changing live family data.

## 2026-10-12 — Parent mobile portal and PWA

- Rebuilt the parent journey around child selection, a visual weekly project path, standalone project detail, Moments, Records, and a weekly Pickup destination near the top of the experience.
- Added color-coded project steps, visual upcoming project cards, a contextual 011Y mascot, and a persistent mobile navigation that yields while reading and returns on upward scroll or keyboard focus.
- Added a parent install manifest and icons, and unified the boot and family loading scenes around the 011Y mascot. Its white backing now blends into the surrounding design.
- The PWA requires a connection; authenticated family records are not cached for offline reading. No parent permissions or data contracts changed in this release.

## 2026-10-12 — Real parent issuance and family label fallback

- Repaired an invitation-era parent profile through the exact recorded login, tenant and learner links; the designated operator issued a password in local Edufy and confirmed local SparkQuest parent sign-in.
- Missing legal parent names no longer block issuance: the API proposes a family display label from the learner name, using the recorded login alias when it identifies the family token. The label is not identity proof.
- Edufy explains repeat sharing through password reissue. Every reissue shows a fresh one-time card and invalidates the old password; plaintext is not stored.
- Parent Auth/Firestore emulator and clean Edufy build pass. Focused code reached GitHub main and Vercel production; Hostinger client update remains pending.

## 2026-10-11 — Local legacy parent login replacement

- Added a staff-verified replacement action for previously invited parents; it issues a new SparkQuest ID/password and retires the old email-based account across exact-UID linked learners.
- Student Details exposes the replacement beside same-ID password reset and gives an actionable error if the secure API is unavailable.
- Isolated Auth/Firestore legacy-family emulator, origin smoke and Edufy production build pass. No real family write or release.

## 2026-10-11 — Interactive local parent acceptance

- Connected local Edufy, its trusted parent API, and local SparkQuest to one isolated Firebase demo project. Seeded Noor as an unissued learner for the user's own account creation test.
- Issued and used a one-time parent password through the real two-app UI, then linked a sibling through Edufy and checked child-specific SparkQuest views.
- Added a guarded local seed and development-only CSP allowance for emulator requests. Both production builds omit the demo endpoint strings.
- See PARENT_LOCAL_ACCEPTANCE_2026-10-11.md. Nothing was pushed or deployed.

## 2026-10-11 — Parent family mobile journey Phase 4

- Clarified that staff issue a one-time password and email-shaped SparkQuest login ID; no parent email inbox or setup link is required.
- Added child switching and mobile Journey, Moments, Records, and view-only Pickup destinations, with saved project briefs, resources, proof/reviews, gallery, payment and attendance detail.
- Restricted parent Pickup writes in Firestore while preserving authorized reads and learner updates.
- TypeScript, both production builds, family smokes, isolated Auth/Firestore permissions and 375px browser preview pass. Local candidate only; see PARENT_FAMILY_MOBILE_PHASE_4_2026-10-11.md.

## 2026-10-01 — Review security Phase 2

- New learner projects require protocol v1 and instructor step decisions write a protected proof-bound `stepReviews` map.
- Queue, learner feedback/status, instructor status and final publication use canonical state rather than learner-writable nested review fields.
- Changed proof re-enters review; nested status/note tampering cannot forge approval or unlock publication.
- Legacy records retain explicit compatibility without bulk migration.
- 59 review assertions, all nine domain suites, three emulator pipelines, scoped TypeScript, both builds and desktop/412px browser QA pass. Local only; real-account acceptance and clean coordinated release remain open.

## 2026-10-01 — Review security Phase 1

- Firestore learner creates cannot seed review history, reviewer identity, feedback, XP, publication time, `published`, or `changes_requested`.
- Learner updates preserve top-level instructor truth, cannot self-publish, and cannot reopen published projects; legitimate edit/proof/resubmission remains allowed.
- Student-project writes route by role, preserving the existing instructor/admin tenant path.
- Non-review staff roles retain ordinary tenant access but cannot seed or change review truth/status.
- Direct SDK attack coverage added to the full review emulator; review, profile-assignment and learner-pipeline emulators pass.
- Nine domain suites, scoped TypeScript and both production builds pass. Local only; designated-account acceptance and clean coordinated client/rules release remain open. Details: REVIEW_SECURITY_PHASE_1.md.

## 2026-10-01 — Instructor learner workspace Phase 1

- Canonical learner directory, saved current/previous-year project progress, all-year pending reviews and direct newest-first history access.
- Searchable, confirmed profile assignment with awaited save/retry, additive audiences and transactional preservation during subsequent class dispatch/editor saves.
- Explicit directory/catalog/enrollment read failures, inactive/ambiguous identity gates, unlinked-project warning and scoped vivid desktop/phone surfaces.
- 40 new domain assertions, all nine domain suites, isolated Auth/Firestore persistence/concurrency/denial checks, scoped TypeScript, both builds and desktop/phone/keyboard fixture QA pass.
- Local only; no production mutation or release. Limits and acceptance: INSTRUCTOR_LEARNER_WORKSPACE_PHASE_1.md.

## 2026-10-01 — Review reliability Phase 1

- Dedicated newest-first review inbox and independent scoped project reader, with load/error/retry states and consistent pending-proof counters.
- Proof-first saved roadmap, media, explanation and review/version history with separate step and final decisions.
- Proof-bound transactional reviews, idempotency, stale learner/editor guards and preservation of stored instructor/snapshot truth.
- Confirmed learner final submission; canonical profile/Auth UID grouping and explicit accessible progress/review buttons.
- 45 domain assertions, all prior domain suites, localhost demo Auth/Firestore service/concurrency tests, TypeScript, both builds and desktop/phone/keyboard browser QA pass.
- Local only. Real acceptance, review-field rule hardening and subsequent product phases remain open. Details: REVIEW_RELIABILITY_PHASE_1.md.
