# SparkQuest Mission Operations — Phase 8

## Objective

Restore reliable instructor/admin mission CRUD and assignment without weakening tenant isolation or deleting learner work.

## Production audit

The live `project_templates` collection contains 20 missions. Four legacy missions have neither `organizationId` nor `createdBy`; the other 16 belong to `makerlab-academy`. Current tenant rules correctly reject updates to the four unscoped records. All 20 predate the structured `MissionBrief`, so requiring current publish readiness on every small edit also blocks cover and content maintenance. Ten missions still carry inline base64 thumbnails, which is a separate documented load-time cost.

## Repair contract

- New missions are created with the authenticated organization and creator UID.
- Tenant-owned missions remain governed by the standard same-organization write rule.
- Only trusted `makerlab-academy` mission operators may perform the audited one-time claim of an unscoped legacy template. The claim writes the organization, authenticated actor and server request time; normal tenant rules govern every later write.
- Existing assigned/featured missions can be improved incrementally even when old content does not yet satisfy the new authoring checklist. A first publication, or removal of an existing audience, remains blocked until its required structure is valid.
- Grade, group and direct-student assignment updates the mission audience only; Edufy enrollment records are never changed.
- Deleting a mission template never deletes `student_projects`. Learner work keeps its mission snapshot and review history.
- Instructor media stays under `instructor-projects/{organizationId}/{authUid}/{missionId}` and is covered by the previously repaired Storage/Firestore IAM bridge.

## Validation

- SparkQuest TypeScript passes.
- Mission content smoke: 11 assertions.
- Mission assignment smoke: 10 assertions.
- Auth/Firestore/Storage emulator: 31 assertions, including create, edit, assignment, audited legacy claim, cross-tenant claim denial, student project creation, showcase upload/submission, instructor media upload and learner-project preservation after mission deletion.
- SparkQuest production build passes.
- Root Edufy production build passes with 4,433 modules.
- Existing Firebase mixed-import and large-chunk warnings remain.

## Release result

Released on 2026-09-29 as `22af1e4`. Firestore rules compiled and were published to `edufy-makerlab`; the matching Vercel production build is live at `https://sparkquest-makerlab.vercel.app/`. Authenticated read-only QA confirmed the new bundle, 20-mission library, legacy editor and grade/group/student assignment wizard. No bulk migration or production record mutation was performed. One controlled write-path smoke still needs a designated mission/audience and learner account: edit a harmless field, assign by grade, confirm learner visibility, reassign by group/direct student, upload a cover/resource, and confirm existing student work remains present.
