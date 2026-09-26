# SparkQuest Mission Experience — Phase 7

## Objective

Make one coherent mission travel from instructor authoring to assignment, learner briefing, project creation, evidence work and instructor review without changing tenant identity, enrollment truth or Firebase security rules.

## Canonical contract

`ProjectTemplate.missionBrief` contains the learner-facing goal, why the mission matters, final outcome, materials, prerequisites, safety notes and deliverables. `sparkquest/domain/missionContent.ts` normalizes legacy missions, resolves the visible build map, calculates publish readiness and projects template/project data into the student `Assignment` context.

Legacy missions remain readable: description, hook, technologies and workflow/default steps provide safe presentation fallbacks. New learner projects snapshot the mission brief, global resources and step resources while retaining `templateId` for template resource updates.

## Flow

1. Instructor authors the brief, resources, workflow, hierarchical program → grade → group/student audience and publication state.
2. Preflight exposes missing title, goal, outcome/deliverable, workflow or audience before a non-draft save.
3. Instructor preview renders the same mission dossier used by learners.
4. An assigned learner opens the dossier before project creation.
5. “Start mission” creates one verified tenant-owned learner project with the mission snapshot, then opens the workspace.
6. The workspace keeps the mission goal, outcome and deliverables one click away beside global resources; existing resource and evidence upload paths remain unchanged.

## UI direction

The instructor keeps a calm workshop dossier for planning and readiness. Students receive a dedicated STEM engineering journey: the project thumbnail and problem lead the page, followed by Ask → Imagine → Build → Test → Share, tools and materials, mission helpers, the guided project plan and the evidence finish line. Supporting text is deliberately short and card-based so younger learners can answer what they are solving, why it matters, what they will make, what they need, how they will build it and what they must deliver. The learner action is always visible on mobile and changes to “Continue my build” after project creation.

The student page intentionally uses restrained blue, mint, amber, coral and violet accents to encode the engineering cycle, with one amber action color. The real instructor-authored thumbnail is the visual build target; a local STEM illustration is used only when a mission has no image. Motion is limited to transform/opacity reveals and hover lift, uses the existing Framer Motion dependency, and respects reduced-motion preferences. The details view owns its `h-screen` vertical scroll container because the application shell intentionally locks body scrolling. Decorative role switching, hard-coded ages, unavailable teaching-guide controls, random external imagery and dynamic Tailwind color strings were removed. A development-only `?designPreview=mission` route provides a representative mission for responsive visual QA without touching Firebase or production data.

## Validation

- `cd sparkquest && npm.cmd exec tsc -- --noEmit` — passed
- `node --experimental-strip-types domain/missionContent.smoke.ts` — 8 assertions
- `node --experimental-strip-types domain/missionAssignment.smoke.ts` — 10 assertions
- `cd sparkquest && npm.cmd run build` — passed; existing Firebase mixed-import and large main-chunk warnings remain
- Firebase Auth/Firestore/Storage emulators — 22 assertions, including exact showcase screenshot + link + submitted-review transaction
- Development preview inspected at desktop and mobile widths — vertical scrolling works, with no horizontal overflow or console errors
- `git diff --check` — passed

## Remaining gate

Authenticated end-to-end QA is still required with designated instructor and learner accounts. No production data write or migration is part of the release. The existing tested Firestore and Storage rules must be deployed with the client so production permissions match the verified learner pipeline; this release does not broaden those rules.
