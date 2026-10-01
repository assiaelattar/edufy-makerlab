# SparkQuest Rescue Phase 6 — Instructor deep-workflow polish

Completed locally on 2026-09-24.

## Outcome

The remaining instructor workflow surfaces now use the shared mission-workshop language instead of an embedded dark admin application. Rewards, contests, orders, mission editing, CSV imports, student portfolio editing, and submission review use consistent hierarchy, visible labels, 44px controls, accessible dialogs, inline errors, loading states, empty states, and explicit destructive confirmations.

The pass also removed two authorization hazards from the instructor project tools:

- Student portfolio creation/import no longer invents a `makerlab-academy` organization when tenant context is missing. The action stops with a recovery message.
- Student project editing no longer replaces the instructor Firebase identity with an anonymous session before save or delete.

Gamification writes now include the active organization plus creation/update timestamps, and the instructor catalogue filters organization-owned records while retaining already-supported legacy global records. Mission publishing uses explicit Tailwind state classes so selected Draft, Featured, and Assigned states remain present in production builds. Review evidence renders directly and lazily instead of generating Blob URLs during render.

## Main files

- `sparkquest/components/admin/GamificationManager.tsx`
- `sparkquest/components/factory/ProjectEditor.tsx`
- `sparkquest/components/factory/ProjectImporter.tsx`
- `sparkquest/components/factory/StudentProjectImporter.tsx`
- `sparkquest/components/factory/StudentProjectModal.tsx`
- `sparkquest/components/factory/ReviewModal.tsx`
- `sparkquest/context/FactoryContext.tsx`

## Verification

- SparkQuest TypeScript: pass.
- Mission assignment smoke: 7 assertions pass.
- Auth + Firestore emulator pipeline: 13 assertions pass.
- Standalone SparkQuest production build: pass, 2,217 modules.
- Integrated Edufy production build: pass, 4,430 modules.
- Focused and repository whitespace checks: pass; only existing CRLF notices were reported.

Existing Firebase mixed static/dynamic import and large initial bundle warnings remain. Authenticated instructor visual QA still requires a designated instructor session; available local browser sessions were learner sessions, so no instructor credential or production record was manufactured for this phase.

## Release boundary

No production data, Firebase rules, app bundle, commit, push, or deployment changed. A release still requires designated instructor/learner desktop and phone QA and coordination with the pending Phase 3 Firestore/Storage release gate.
